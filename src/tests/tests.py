#!/usr/bin/env python
# encoding: utf-8

import os
from datetime import datetime, timedelta, date
import simplejson as json
import flask
import unittest
import tempfile

from google.appengine.ext import testbed
from google.appengine.ext import db
from google.appengine.api import users

from application.app import app
from application.models import Area, Note, Cell, Report
from application.resources.report import CellAPI

from base import GoogleAuthMixin

class ApiTestCase(unittest.TestCase, GoogleAuthMixin):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()

    def test_poly_new(self):
        rv = self.app.post('/api/v0/poly/new', data=dict(
            polys="""[
                      {"type":1, "geom":"testkml"},
                      {"type":0, "geom":"testkml2"}
                  ]
                  """
        ))
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertTrue(js['ok'])
        self.assertEquals(2, Area.all().count())

    def tearDown(self):
        pass

class NotesApiTest(unittest.TestCase, GoogleAuthMixin):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        r = Report(start=date.today(), end=date.today()+timedelta(days=1), finished=False)
        r.put()
        self.r = r
        self.cell = Cell(x=0, y=0, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0)
        self.cell.put()
        for x in Note.all():
            x.delete()
        self.note = Note(msg='test', added_by=users.get_current_user(), cell=self.cell)
        self.note.put()

    def test_note_list(self):
        rv = self.app.get('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/note')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(1, len(js))
        self.assertEquals('test', js[0]['msg'])
        self.assertEquals(1, Note.all().count())

    def test_notes_create(self):
        rv = self.app.post('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/note', data='{"msg": "test"}')
        self.assertEquals(200, rv.status_code)
        self.assertEquals(2, Note.all().count())
        self.assertEquals(2, self.cell.note_set.count())

class PolygonApi(unittest.TestCase, GoogleAuthMixin):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        for x in Area.all():
            x.delete()
        for x in Cell.all():
            x.delete()
        r = Report(start=date.today(), end=date.today()+timedelta(days=1), finished=False)
        r.put()
        self.r = r
        self.cell = Cell(x=0, y=0, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0)
        self.cell.put()
        self.area = Area(geo='[]', added_by=users.get_current_user(), type=1, cell=self.cell)
        self.area.put()

    def test_list(self):
        rv = self.app.get('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/polygon')
        js = json.loads(rv.data)
        self.assertEquals(1, len(js))

    def test_create_non_existing_cell(self):
        rv = self.app.post('/api/v0/report/' + str(self.r.key()) + '/cell/2_1_0/polygon',
            data='{"paths": "test", "type": 1}'
        )
        self.assertEquals(2, Area.all().count())
        self.assertEquals(2, Cell.all().count())

    def test_create(self):
        rv = self.app.post('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/polygon',
            data='{"paths": "[]", "type": 1}'
        )
        self.assertEquals(2, Area.all().count())
        rv = self.app.get('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/polygon')
        js = json.loads(rv.data)
        self.assertEquals(2, len(js))

    def test_update(self):
        rv = self.app.put('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/polygon/' + str(self.area.key()),
            data='{"paths": "[]", "type": 100}'
        )
        self.assertEquals(1, Area.all().count())
        a = Area.get(self.area.key())
        self.assertEquals(100, a.type)
        self.assertEquals("[]", a.geo)

    def test_delete(self):
        rv = self.app.delete('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/polygon/' + str(self.area.key()))

        self.assertEquals(0, Area.all().count())


class CellApi(unittest.TestCase, GoogleAuthMixin):
    def setUp(self):
        CellAPI.BLACK_LIST = []
        app.config['TESTING'] = True
        self.app = app.test_client()
        for x in Cell.all():
            x.delete()
        r = Report(start=date.today(), end=date.today()+timedelta(days=1), finished=False)
        r.put()
        self.r = r

    def test_cell_list(self):
        rv = self.app.get('/api/v0/report/' + str(self.r.key()) + '/cell')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(100, len(js))

    def test_cell_0_0_0(self):
        rv = self.app.get('/api/v0/report/' + str(self.r.key()) + '/cell/0_0_0/children')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(100, len(js))

    def test_cell_1_0_0(self):
        Cell(x=0, y=0, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0).put()
        rv = self.app.get('/api/v0/report/' + str(self.r.key())+'/cell/1_0_0/children')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(100, len(js))
        self.assertEquals(2, js[0]['z'])
        cell = [x for x in js if x['z'] == 2 and x['x'] == 0 and x['y'] == 0][0]
        self.assertAlmostEquals(0, cell['ndfi_low'])
        self.assertAlmostEquals(1.0, cell['ndfi_high'])

    def test_update_cell_2_0_1(self):
        rv = self.app.put('/api/v0/report/' + str(self.r.key())+'/cell/2_1_3',
            data='{"ndfi_low": 0.0, "ndfi_high": 1.0, "done": false}'
        )
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        q = Cell.all()
        q.filter("z =", 2)
        q.filter("x =", 1)
        q.filter("y =", 3)
        q.filter("report =", self.r)
        cell = q.fetch(1)[0]
        self.assertAlmostEquals(0, cell.ndfi_low)
        self.assertAlmostEquals(1.0, cell.ndfi_high)


class HomeTestCase(unittest.TestCase, GoogleAuthMixin):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        self.login('test@gmail.com', 'testuser')

    def test_home(self):
        rv = self.app.get('/')
        assert 'imazon' in rv.data

"""
class FTTest(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        r = Report(start=date.today(), end=date.today()+timedelta(days=1), finished=False)
        r.put()
        self.r = r
        self.cell = Cell(x=0, y=0, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0)
        self.cell.put()
        self.area = Area(geo='[[[-61.5,-12],[-61.5,-11],[-60.5,-11],[-60.5,-12]]]', added_by=users.get_current_user(), type=1, cell=self.cell)
        #self.area.put()

    def test_save_on_ft(self):
        self.area.put()
        self.area.create_fusion_tables()
        self.assertNotEquals(None, self.area.fusion_tables_id)
        self.area.type = 2
        self.area.save()
        self.area.update_fusion_tables()
        self.area.delete()
        self.area.delete_fusion_tables()
"""



class CommandTest(unittest.TestCase, GoogleAuthMixin):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        for x in Report.all():
            x.delete()

    def test_create_report(self):
        rv = self.app.post('/_ah/cmd/create_report?month=11&year=2010')
        self.assertEquals(200, rv.status_code)
        self.assertEquals(1, Report.all().count())
        r = Report.all().fetch(1)[0]
        self.assertEquals(1, r.start.day)
        self.assertEquals(11, r.start.month)
        self.assertEquals(2010, r.start.year)
        self.assertEquals(30, r.end.day)
        self.assertEquals(11, r.end.month)
        self.assertEquals(2010, r.end.year)

if __name__ == '__main__':
    unittest.main()

