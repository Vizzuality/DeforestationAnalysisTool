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
from application.models import Area, Note, Cell, Report, User
from application import models
from application.resources.report import CellAPI
from application.time_utils import timestamp

from base import GoogleAuthMixin

class ReportTest(unittest.TestCase):

    def setUp(self):
        self.r = Report(start=date(year=2011, month=2, day=1), finished=False)
        self.r.put()

    def test_range(self):
        r1 = self.r.comparation_range()
        self.assertEquals(1, datetime.fromtimestamp(r1[0]/1000).month)
        self.assertEquals(1, datetime.fromtimestamp(r1[0]/1000).day)

class CellTest(unittest.TestCase):

    def setUp(self):
        r = Report(start=date.today(), finished=False)
        r.put()
        self.r = r
        self.cell = Cell(x=11, y=11, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0)
        self.cell.put()

    def test_parent_id(self):
        self.assertEquals('1_1_1', self.cell.parent_id)

class NotesApiTest(unittest.TestCase, GoogleAuthMixin):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        self.login('test@gmail.com', 'testuser')
        r = Report(start=date.today(), finished=False)
        r.put()
        self.r = r
        self.cell = Cell(x=0, y=0, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0)
        self.cell.put()
        for x in Note.all():
            x.delete()
        self.when = datetime.now()
        self.note = Note(msg='test msg', added_by=users.get_current_user(), cell=self.cell, added_on=self.when)
        self.note.put()

    def test_note_list(self):
        rv = self.app.get('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/note')
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(1, len(js))
        n = js[0]
        self.assertEquals('test msg', n['msg'])
        self.assertEquals('test', n['author'])
        self.assertEquals(timestamp(self.when), n['date'])
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
        self.login('test@gmail.com', 'testuser')
        for x in Area.all():
            x.delete()
        for x in Cell.all():
            x.delete()
        r = Report(start=date.today(), finished=False)
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
        self.assertEquals(4, Cell.all().count())
        # check parents exists
        cell = Cell.all().filter('report =', self.r).filter('x =', 1).filter('y =', 0).filter('z =', 2).fetch(1)[0]
        self.assertEquals('test', cell.get_parent().last_change_by.nickname())
        self.assertEquals('test', cell.get_parent().get_parent().last_change_by.nickname())
        self.assertNotEquals(0, cell.get_parent().last_change_on)
        

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
            data='{"paths": "[[1, 2, 3]]", "type": 100}'
        )
        self.assertEquals(1, Area.all().count())
        a = Area.get(self.area.key())
        self.assertEquals(100, a.type)
        self.assertEquals("\"[[1, 2, 3]]\"", a.geo)
        js = json.loads(rv.data)
        self.assertEquals(100, js['type'])
        self.assertEquals("[[1, 2, 3]]", js['paths'])

    def test_delete(self):
        rv = self.app.delete('/api/v0/report/' + str(self.r.key()) + '/cell/2_0_0/polygon/' + str(self.area.key()))

        self.assertEquals(0, Area.all().count())


class UserApiTest(unittest.TestCase, GoogleAuthMixin):

    def setUp(self):
        for x in models.CELL_BLACK_LIST[:]:
            models.CELL_BLACK_LIST.pop()
        app.config['TESTING'] = True
        self.login('test@gmail.com', 'testuser')
        self.app = app.test_client()
        self.user = User(user=users.get_current_user())
        self.user.put()

    def test_update(self):
        rv = self.app.put('/api/v0/user/' + str(self.user.key()),
            data=json.dumps({'current_cells': 2}))
        self.assertEquals(200, rv.status_code)
        js = json.loads(rv.data)
        self.assertEquals(2, js['current_cells'])

class CellApi(unittest.TestCase, GoogleAuthMixin):
    def setUp(self):
        for x in models.CELL_BLACK_LIST[:]:
            models.CELL_BLACK_LIST.pop()
        app.config['TESTING'] = True
        self.login('test@gmail.com', 'testuser')
        self.app = app.test_client()
        for x in Cell.all():
            x.delete()
        r = Report(start=date.today(), finished=False)
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
        self.assertEquals('test', cell.get_parent().last_change_by.nickname())
        self.assertEquals('test', cell.get_parent().get_parent().last_change_by.nickname())
        self.assertNotEquals(0, cell.get_parent().last_change_on)


"""
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
        r = Report(start=date.today(), finished=False)
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



class CommandTest(unittest.TestCase, GoogleAuthMixin):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        for x in Report.all():
            x.delete()

    def test_create_report(self):
        rv = self.app.post('/_ah/cmd/create_report?month=11&year=2010&day=2')
        self.assertEquals(200, rv.status_code)
        self.assertEquals(1, Report.all().count())
        r = Report.all().fetch(1)[0]
        self.assertEquals(2, r.start.day)
        self.assertEquals(11, r.start.month)
        self.assertEquals(2010, r.start.year)

if __name__ == '__main__':
    unittest.main()

