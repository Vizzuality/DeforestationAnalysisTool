# encoding: utf-8

import logging
from application.models import Report, Cell, Area
from application.ee import NDFI
from resource import Resource
from flask import Response, request, jsonify, abort

import simplejson as json
from application.time_utils import timestamp, past_month_range

from google.appengine.ext.db import Key
from google.appengine.api import users


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
    """ api to access cell info """

    def list(self, report_id):
        r = Report.get(Key(report_id))
        cell = Cell.get_or_default(r, 0, 0, 0)
        return self._as_json([x.as_dict() for x in iter(cell.children())])

    def get(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(id)
        cell = Cell.get_or_default(r, x, y, z)
        cells = cell.children()
        return self._as_json([x.as_dict() for x in cells])

    def update(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(id)
        cell = Cell.get_or_default(r, x, y, z)
        cell.report = r

        data = json.loads(request.data)
        for prop in ('ndfi_high', 'ndfi_low'):
            setattr(cell, prop, data[prop])
        cell.put()

        return Response(cell.as_json(), mimetype='application/json')


class PolygonAPI(Resource):

    def list(self, report_id, cell_pos):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(cell_pos)
        cell = Cell.get_cell(r, x, y, z)
        if not cell:
            return self._as_json([])
        else:
            return self._as_json([x.as_dict() for x in cell.area_set])

    def get(self, report_id, cell_pos, id):
        a = Area.get(Key(id))
        if not a:
            abort(404)
        return Response(a.as_json(), mimetype='application/json')
        

    def create(self, report_id, cell_pos):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(cell_pos)
        cell = Cell.get_or_create(r, x, y, z)
        data = json.loads(request.data)
        a = Area(geo=json.dumps(data['paths']),
            type=data['type'],
            added_by = users.get_current_user(),
            cell=cell)
        a.save();
        return Response(a.as_json(), mimetype='application/json')

    def update(self, report_id, cell_pos, id):
        data = json.loads(request.data)
        a = Area.get(Key(id))

        for prop in ('paths', 'type'):
            setattr(a, prop, data[prop])

        a.added_by = users.get_current_user()
        a.save();
        return Response(a.as_json(), mimetype='application/json')

    def delete(self, report_id, cell_pos, id):
        a = Area.get(Key(id))
        if a:
            a.delete();
            a = Response("deleted", mimetype='text/plain')
            a.status_code = 204;
            return a
        abort(404)

