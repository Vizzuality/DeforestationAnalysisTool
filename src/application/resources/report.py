
import logging
from application.models import Report, Cell
from resource import Resource
from flask import Response, request

import simplejson as json

from google.appengine.ext.db import Key

SPLITS = 10

class ReportAPI(Resource):

    def list(self):
        return self._as_json([x.as_dict() for x in Report.all()])


class CellAPI(Resource):

    def get_cell(self, x, y, z):
        q = Cell.all()
        q.filter("z =", z)
        q.filter("x =", x)
        q.filter("y =", y)
        cell = q.fetch(1)
        if cell:
            return cell[0]
        return None

    def cell_id(self, id):
        return tuple(map(int, id.split('_')))

    def default_cell(self, x, y, z):
        return Cell(z=z, x=x, y=y, ndfi_low=0.6, ndfi_high=0.8)

    def cells_for(self, x, y, z):
        cells = []
        for i in xrange(SPLITS):
            for j in xrange(SPLITS):
                zz = z+1
                xx = (SPLITS**z)*x + i
                yy = (SPLITS**z)*y + j

                cell = self.get_cell(xx, yy, zz)
                if not cell:
                    cell = self.default_cell(xx, yy, zz)
                cells.append(cell)
        return cells

    def list(self, report_id):
        cells = self.cells_for(0, 0, 0)
        """
        for x in cells:
            x.report = Key(report_id)
        """
        return self._as_json([x.as_dict() for x in cells])

    def get(self, report_id, id):
        z, x, y = self.cell_id(id)
        cells = self.cells_for(x, y, z)
        return self._as_json([x.as_dict() for x in cells])

    def update(self, report_id, id):
        z, x, y = self.cell_id(id)
        cell = self.get_cell(x, y, z)
        if not cell:
            cell = self.default_cell(x, y, z)

        data = json.loads(request.data)
        for prop in ('ndfi_high', 'ndfi_low'):
            setattr(cell, prop, data[prop])
        cell.put()

        return Response(cell.as_json(), mimetype='application/json')

