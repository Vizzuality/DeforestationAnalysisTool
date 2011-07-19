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

from application import app
from application.models import Area, Note, Cell, Report

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
        for x in Note.all():
            x.delete()

    def test_note_new(self):
        rv = self.app.post('/api/v0/notes/new', data=dict(
            note='{"msg": "test message", "cell": [1, 2, 3]}'
        ))
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertTrue(js['ok'])
        self.assertEquals(1, Note.all().count())

    def test_notes_for_cell(self):
        Note(msg="test", cell_z=1, cell_x=2, cell_y=3).put()
        rv = self.app.get('/api/v0/notes/1/2/3')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)['notes']
        self.assertEquals(1, len(js))
        self.assertEquals('test', js[0]['msg'])

    def test_notes_for_non_existing_cell(self):
        rv = self.app.get('/api/v0/notes/1/2/3')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)['notes']
        self.assertEquals(0, len(js))

class CellApi(unittest.TestCase, GoogleAuthMixin):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        for x in Cell.all():
            x.delete()
        r = Report(start=date.today(), end=date.today()+timedelta(days=1), finished=False)
        r.put()
        self.r = r

    def test_cell_list(self):
        rv = self.app.get('/api/v0/report/1/cell')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(100, len(js))

    def test_cell_0_0_0(self):
        rv = self.app.get('/api/v0/report/1/cell/0_0_0')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(100, len(js))

    def test_cell_1_0_0(self):
        Cell(x=0, y=0, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0).put()
        rv = self.app.get('/api/v0/report/' + str(self.r.key())+'/cell/1_0_0')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(100, len(js))
        self.assertEquals(2, js[0]['z'])
        cell = [x for x in js if x['z'] == 2 and x['x'] == 0 and x['y'] == 0][0]
        self.assertAlmostEquals(0, cell['ndfi_low'])
        self.assertAlmostEquals(1.0, cell['ndfi_high'])
    
    def test_update_cell_2_0_1(self):
        rv = self.app.put('/api/v0/report/' + str(self.r.key())+'/cell/2_1_3',
            data='{"ndfi_low": 0.0, "ndfi_high": 1.0}'
        )
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        q = Cell.all()
        q.filter("z =", 2)
        q.filter("x =", 1)
        q.filter("y =", 3)
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

