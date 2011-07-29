# encoding: utf-8

import logging
from application.models import Report, Cell, Area
from application.ee import NDFI
from resource import Resource
from flask import Response, request, jsonify, abort

import simplejson as json
from application.time_utils import timestamp, past_month_range

from application.constants import amazon_bounds

from google.appengine.ext.db import Key
from google.appengine.api import users

from google.appengine.api import memcache

class NDFIMapApi(Resource):
    """ resource to get ndfi map access data """

    def list(self, report_id):
        cache_key = report_id + "_ndfi"
        data = memcache.get(cache_key)
        if not data:
            r = Report.get(Key(report_id))
            ee_resource = 'MOD09GA'
            ndfi = NDFI(ee_resource,
                past_month_range(r.start),
                r.range())
            data = ndfi.mapid()['data']
            memcache.add(key=cache_key, value=data, time=3600)
        return jsonify(data)


class ReportAPI(Resource):

    def list(self):
        return self._as_json([x.as_dict() for x in Report.all()])


class CellAPI(Resource):
    """ api to access cell info """

    BLACK_LIST = ['1_0_0', '1_1_0', '1_0_1', '1_0_2', '1_0_3', '1_0_7', '1_0_8', '1_0_9',
             '1_1_7', '1_1_8', '1_1_9', '1_2_8', '1_2_9', '1_3_8', '1_3_9',
             '1_2_0', '1_5_0', '1_6_0', '1_8_0', '1_9_0','1_8_1', '1_9_1',
             '1_8_8', '1_8_9', '1_9_8', '1_9_9']
    def is_in_backlist(self, cell):
        return cell.external_id() in CellAPI.BLACK_LIST


    def list(self, report_id):
        r = Report.get(Key(report_id))
        cell = Cell.get_or_default(r, 0, 0, 0)
        return self._as_json([x.as_dict() for x in iter(cell.children()) if not self.is_in_backlist(x)])

    def children(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(id)
        cell = Cell.get_or_default(r, x, y, z)
        cells = cell.children()
        return self._as_json([x.as_dict() for x in cells if not self.is_in_backlist(x)])

    def get(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(id)
        cell = Cell.get_or_default(r, x, y, z)
        return Response(cell.as_json(), mimetype='application/json')

    def update(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(id)
        cell = Cell.get_or_default(r, x, y, z)
        cell.report = r

        data = json.loads(request.data)
        for prop in ('ndfi_high', 'ndfi_low', 'done'):
            setattr(cell, prop, data[prop])
        cell.put()

        return Response(cell.as_json(), mimetype='application/json')

    def ndfi_change(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(id)
        cell = Cell.get_or_default(r, x, y, z)
        ndfi = NDFI('MOD09GA',
            past_month_range(r.start),
            r.range())

        bounds = cell.bounds(amazon_bounds)
        ne = bounds[0]
        sw = bounds[1]
        # spcify lon, lat FUCK, MONKEY BALLS
        polygons = [[ (sw[1], sw[0]), (sw[1], ne[0]), (ne[1], ne[0]), (ne[1], sw[0]) ]]
        data = ndfi.ndfi_change_value(polygons, 1, 1)
        ndfi = data['data'] #data['data']['properties']['ndfiSum']['values']
        return Response(json.dumps(ndfi), mimetype='application/json')

    def bounds(self, report_id, id):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(id)
        cell = Cell.get_or_default(r, x, y, z)
        return Response(json.dumps(cell.bounds(amazon_bounds)), mimetype='application/json')





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

