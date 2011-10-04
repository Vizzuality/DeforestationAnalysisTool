# encoding: utf-8


import simplejson as json
import random
from resource import Resource
from flask import Response, request, jsonify, abort
from google.appengine.ext.db import Key
from google.appengine.ext import deferred

from application.models import Report, StatsStore
from application.ee import Stats
from application.commands import update_report_stats

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
                # launch caching!
                logging.info("launching stats calc")
                deferred.defer(update_report_stats, report_id)
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

    def polygon(self, report_id):
        """ return stats for given polygon """
        r = Report.get(Key(report_id))
        data = json.loads(request.data)
        polygon = data['polygon']
        #TODO: test if polygon is ccw
        # exchange lat, lon -> lon, lat
        normalized_poly = [(coord[1], coord[0]) for coord in polygon]
        stats = self.ee.get_stats_for_polygon(r.assetid, [normalized_poly])
        try:
            s = stats['data']['properties']['classHistogram']['values']['null']['values']
            stats = {
                'def': float(s[u'2'])/10000,
                'deg': float(s[u'3'])/10000,
                'id': report_id
            }
            # update with request data
            stats.update(data)
            return Response(json.dumps(stats), mimetype='application/json')
        except KeyError, ValueError:
            abort(404)


