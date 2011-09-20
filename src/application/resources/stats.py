

from resource import Resource
from flask import Response, request, jsonify, abort
from google.appengine.ext.db import Key

from application.models import Report
from application.ee import Stats

tables = [
    ('Municipalities', 1560866, 'name'),
    ('States', 1560836, 'name'),
    ('States2',1505198, 'name'),
    ('Federal Conservation', 322554, 'name'),
    ('State Conservation', 322660, 'name')
]

class RegionStatsAPI(Resource):
    """ serves stats for regions

        basically is a proxy for google earth engine
    """

    def list(self, report_id):
        r = Report.get(Key(report_id))
        st = Stats()
        r = st.get_stats_for_table(r.base_map(),  tables[0][1])
        stats_region = r["data"]["properties"]["classHistogram"]["values"]
        stats = []
        for k,v in stats_region.iteritems():
            stats.append({
                "id": k,
                "def": int(v[0])/10000,
                "deg": int(v[1])/10000
            })

        return self._as_json(stats)

