# encoding: utf-8


import simplejson as json
import random
from resource import Resource
from flask import Response, request, jsonify, abort
from google.appengine.ext.db import Key

from application.models import Report, StatsStore
from application.ee import Stats

from google.appengine.api import memcache

tables = [
    ('Municipalities', 1560866, 'name'),
    ('States', 1560836, 'name'),
    ('Federal Conservation', 1568452, 'name'),
    ('State Conservation', 1568376, 'name'),
    ('Ingienous Land',1630610, 'name'),
    ('Legal Amazon', 1205151, 'name')
]


class RegionStatsAPI(Resource):
    """ serves stats for regions

        basically is a proxy for google earth engine
    """

    def __init__(self):
        super(RegionStatsAPI, self).__init__()
        self.ee = Stats()

    def stats_for(self, assetid, table):
        return self.ee.get_stats(assetid,  table)

    # TODO: change for get
    def list(self, report_id):
        cache_key = 'stats_' + report_id
        data = memcache.get(cache_key)
        if not data:
            try:
                data = StatsStore.all().filter('report_id =', report_id).fetch(1)[0].json
            except IndexError:
                abort(404)
            memcache.set(cache_key, data)
        return Response(data, mimetype='application/json')

    def get(self, report_id, id):
        r = Report.get(Key(report_id))
        s = self.stats_for(r, int(id))
        if request.args.get('_debug', False):
            s['debug'] = {
                'request': self.ee.ee.last_request,
                'response': self.ee.ee.last_response
            }
        data = json.dumps(s)
        return Response(data, mimetype='application/json')

