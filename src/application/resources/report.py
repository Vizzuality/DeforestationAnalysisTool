# encoding: utf-8

import logging
from application.models import Report, Cell, Area, Note, CELL_BLACK_LIST, User
from application.ee import NDFI
from resource import Resource
from flask import Response, request, jsonify, abort
from datetime import date

import simplejson as json
from application.time_utils import timestamp

from application.constants import amazon_bounds

from google.appengine.ext.db import Key
from google.appengine.api import users

from google.appengine.api import memcache

class NDFIMapApi(Resource):
    """ resource to get ndfi map access data """

    @staticmethod
    def _cache_key(report_id):
        return report_id + "_ndfi"

    def list(self, report_id):
        cache_key = self._cache_key(report_id)
        data = memcache.get(cache_key)
        if not data:
            r = Report.get(Key(report_id))
            ee_resource = 'MOD09GA'
            ndfi = NDFI(ee_resource,
                r.comparation_range(),
                r.range())
            data = ndfi.mapid()['data']
            memcache.add(key=cache_key, value=data, time=3600)
        return jsonify(data)


class UserAPI(Resource):

    def list(self):
        return self._as_json([x.as_dict() for x in User.all()])

    def get(self, id):
        u = User.get(Key(id))
        return Response(u.as_json(), mimetype='application/json')

    def update(self, id):
        data = json.loads(request.data)
        u = User.get(Key(id))
        if 'current_cells' in data:
            u.current_cells = data['current_cells']
            u.put()
        return Response(u.as_json(), mimetype='application/json')

class ReportAPI(Resource):

    def list(self):
        return self._as_json([x.as_dict() for x in Report.all()])

    def close(self, report_id):
        """ close current and create new one """
        r = Report.get(Key(report_id))
        if not r.finished:
            """
            ee_resource = 'MOD09GA'
            ndfi = NDFI(ee_resource,
                    r.comparation_range(),
                    r.range())
            data = ndfi.tag()['data']['mapid']
            """
            data = "707e1890793104ed59956972c90e0fed"
            r.close(data)
            cache_key = NDFIMapApi._cache_key(report_id)
            memcache.delete(cache_key)
            new_report = Report(start=date.today())
            new_report.put()
            return str(new_report.key())
        return "already finished"



class CellAPI(Resource):
    """ api to access cell info """

    def is_in_backlist(self, cell):
        return cell.external_id() in CELL_BLACK_LIST


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
            r.comparation_range(),
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

        a.geo = json.dumps(data['paths'])
        a.type = data['type']

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

class NoteAPI(Resource):

    def list(self, report_id, cell_pos):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(cell_pos)
        cell = Cell.get_cell(r, x, y, z)
        notes = []
        if cell:
            return self._as_json([x.as_dict() for x in cell.note_set])
        return self._as_json([])
        

    def create(self, report_id, cell_pos):
        r = Report.get(Key(report_id))
        z, x, y = Cell.cell_id(cell_pos)
        cell = Cell.get_or_create(r, x, y, z)
        data = json.loads(request.data)
        if 'msg' not in data:
            abort(400)
        a = Note(msg=data['msg'],
                 added_by = users.get_current_user(),
                 cell=cell)
        a.save();
        return Response(a.as_json(), mimetype='application/json')

