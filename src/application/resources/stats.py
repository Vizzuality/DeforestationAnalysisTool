# encoding: utf-8


import simplejson as json
from resource import Resource
from flask import Response, request, jsonify, abort
from google.appengine.ext.db import Key

from application.models import Report
from application.ee import Stats

from google.appengine.api import memcache

tables = [
    ('Municipalities', 1560866, 'name'),
    ('States', 1560836, 'name'),
    ('Federal Conservation', 1568452, 'name'),
    ('State Conservation', 1568376, 'name')
]

class RegionStatsAPI(Resource):
    """ serves stats for regions

        basically is a proxy for google earth engine
    """

    def stats_for(self, r, table):
        st = Stats()
        r = st.get_stats_for_table(r.base_map(),  table)
        stats_region = r["data"]["properties"]["classHistogram"]["values"]
        stats = {}
        for k,v in stats_region.iteritems():
            stats[str(table) + '_' + k] = {
                "id": k,
                "table": table,
                "def": int(v[0])/10000,
                "deg": int(v[1])/10000
            }
        return stats

    # TODO: change for get
    def list(self, report_id):
        cache_key = 'stats_' + report_id
        data = memcache.get(cache_key)
        if not data:
            r = Report.get(Key(report_id))
            if not r:
                abort(404)
            stats = {
                'id': report_id,
                'stats': {}
            }
            for desc, table, name in tables:
                stats['stats'].update(self.stats_for(r, table))
            # cache it
            data = json.dumps(stats)
            memcache.set(cache_key, data)
        return Response(data, mimetype='application/json')

