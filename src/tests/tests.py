#!/usr/bin/env python
# encoding: utf-8

import os
import simplejson as json
import flask
import unittest
import tempfile

from google.appengine.ext import testbed

from application import app
from application.models import Area


class ApiTestCase(unittest.TestCase):

    def setUp(self):
        #self.testbed = testbed.Testbed()
        #self.testbed.activate()
        #self.testbed.init_datastore_v3_stub()
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

class HomeTestCase(unittest.TestCase):

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()

    def test_home(self):
        rv = self.app.get('/')
        assert 'imazon' in rv.data
if __name__ == '__main__':
    unittest.main()

