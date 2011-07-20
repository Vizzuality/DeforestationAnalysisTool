
import logging
from application.models import Report, Cell, Area
from application.ee import NDFI
from resource import Resource
from flask import Response, request, jsonify

import simplejson as json
from application.time_utils import timestamp, past_month_range

from google.appengine.ext.db import Key
from google.appengine.api import users

SPLITS = 10

class NDFIMapApi(Resource):
    """ resource to get ndfi map access data """
    def list(self, report_id):
        r = Report.get(Key(report_id))
        ee_resource = 'MOD09GA'
        ndfi = NDFI(ee_resource,
            past_month_range(r.start),
            r.range())
        return jsonify(ndfi.mapid()['data'])


class ReportAPI(Resource):

    def list(self):
        return self._as_json([x.as_dict() for x in Report.all()])



class CellAPI(Resource):

    @staticmethod
    def get_cell(report, x, y, z):
        q = Cell.all()
        q.filter("z =", z)
        q.filter("x =", x)
        q.filter("y =", y)
        q.filter("report =", report)
        cell = q.fetch(1)
        if cell:
            return cell[0]
        return None

    @staticmethod
    def cell_id(id):
        return tuple(map(int, id.split('_')))

    def default_cell(self, x, y, z):
        return Cell(z=z, x=x, y=y, ndfi_low=0.6, ndfi_high=0.8)

    def cells_for(self, report, x, y, z):
        cells = []
        for i in xrange(SPLITS):
            for j in xrange(SPLITS):
                zz = z+1
                xx = (SPLITS**z)*x + i
                yy = (SPLITS**z)*y + j

                cell = CellAPI.get_cell(report, xx, yy, zz)
                if not cell:
                    cell = self.default_cell(xx, yy, zz)
                cells.append(cell)
        return cells

    def list(self, report_id):
        cells = self.cells_for(report_id, 0, 0, 0)
        return self._as_json([x.as_dict() for x in cells])

    def get(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = CellAPI.cell_id(id)
        cells = self.cells_for(r, x, y, z)
        return self._as_json([x.as_dict() for x in cells])

    def update(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = CellAPI.cell_id(id)
        cell = CellAPI.get_cell(r, x, y, z)
        if not cell:
            cell = self.default_cell(x, y, z)
        cell.report = r

        data = json.loads(request.data)
        for prop in ('ndfi_high', 'ndfi_low'):
            setattr(cell, prop, data[prop])
        cell.put()

        return Response(cell.as_json(), mimetype='application/json')


class PolygonAPI(Resource):

    def list(self, report_id, cell_pos):
        r = Report.get(Key(report_id))
        z, x, y = CellAPI.cell_id(cell_pos)
        cell = CellAPI.get_cell(r, x, y, z)
        return self._as_json([x.as_dict() for x in cell.area_set])

    def create(self, report_id, cell_pos):
        r = Report.get(Key(report_id))
        z, x, y = CellAPI.cell_id(cell_pos)
        cell = CellAPI.get_cell(r, x, y, z)
        data = json.loads(request.data)
        a = Area(geo=data['geo'],
            type=data['type'],
            added_by = users.get_current_user(),
            cell = cell)
        a.put();
        return Response(a.as_json(), mimetype='application/json')

    def update(self, report_id, cell_pos, id):
        """
        r = Report.get(Key(report_id))
        z, x, y = CellAPI.cell_id(cell_pos)
        cell = CellAPI.get_cell(r, x, y, z)
        """
        data = json.loads(request.data)
        a = Area.get(Key(id))

        for prop in ('geo', 'type'):
            setattr(a, prop, data[prop])
        a.added_by = users.get_current_user()
        a.put();
        return Response(a.as_json(), mimetype='application/json')

    def delete(self, report_id, cell_pos, id):
        a = Area.get(Key(id))
        a.delete();
        return 'deleted'

