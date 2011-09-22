#!/usr/bin/env python
# encoding: utf-8

import unittest
from datetime import date
import simplejson as json
from application.models import StatsStore, Report
from application.app import app
from base import GoogleAuthMixin


class StatsTest(unittest.TestCase, GoogleAuthMixin):
    """ test for reporting api """

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        self.login('test@gmail.com', 'testuser')
        # generate data for reports
        self.r = Report(start=date(year=2011, month=2, day=1), finished=True)
        self.r.put();
        stats = {
            'id': str(self.r.key()),
            'stats': {
                '0000_01': {
                    'id': '01',
                    'table': '0000',
                    'def': 1,
                    'deg': 2
                },
                '0000_02': {
                    'id': '02',
                    'table': '0000',
                    'def': 1,
                    'deg': 2
                },
                '0001_02': {
                    'id': '02',
                    'table': '0001',
                    'def': 1,
                    'deg': 2
                }
            }
        }

        StatsStore(report=self.r, json=json.dumps(stats)).put();
        

    def test_table(self):
        """ get reports for all regions  """
        rv = self.app.get('/api/v0/stats/0000?reports=' + str(self.r.key().id()))
        self.assertEquals(200, rv.status_code)
        self.assertEquals('text/csv; charset=utf-8', rv.content_type)
        rows = rv.data.split('\n')
        header = rows[0].split(',')
        row1= rows[1].split(',')
        self.assertEquals('report', header[0])
        self.assertEquals('deforestated', header[1])
        self.assertEquals('degradated\r', header[2])

        self.assertEquals(str(self.r.key().id()), row1[0])
        self.assertEquals(2, int(row1[1]))
        self.assertEquals(4, int(row1[2]))

    def test_table_zone(self):
        """ get reports for all regions  """
        rv = self.app.get('/api/v0/stats/0000/02?reports=' + str(self.r.key().id()))
        self.assertEquals(200, rv.status_code)
        self.assertEquals('text/csv; charset=utf-8', rv.content_type)
        rows = rv.data.split('\n')
        header = rows[0].split(',')
        row1= rows[1].split(',')
        self.assertEquals('report', header[0])
        self.assertEquals('deforestated', header[1])
        self.assertEquals('degradated\r', header[2])

        self.assertEquals(str(self.r.key().id()), row1[0])
        self.assertEquals(1, int(row1[1]))
        self.assertEquals(2, int(row1[2]))

    def test_non_existing(self):
        rv = self.app.get('/api/v0/stats/0002?reports=' + str(self.r.key().id()))
        self.assertEquals(404, rv.status_code)
    def test_non_existing_report(self):
        rv = self.app.get('/api/v0/stats/0000?reports=123123,' + str(self.r.key().id()))
        self.assertEquals(404, rv.status_code)

if __name__ == '__main__':
    unittest.main()
