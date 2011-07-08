#!/usr/bin/env python
# encoding: utf-8

import os
import simplejson as json
import flask
import unittest
import tempfile

from google.appengine.ext import testbed
from google.appengine.ext import db

from application import app
from application.models import Area, Note


class ApiTestCase(unittest.TestCase):

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

class NotesApiTest(unittest.TestCase):
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

class HomeTestCase(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()

    def test_home(self):
        rv = self.app.get('/')
        assert 'imazon' in rv.data

if __name__ == '__main__':
    unittest.main()

