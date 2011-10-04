#encoding: utf-8

import time
import csv
from datetime import datetime, timedelta, date
import random
import logging
import simplejson as json
from StringIO import StringIO
from time_utils import timestamp, first_of_current_month, past_month_range
from dateutil.parser import parse
from google.appengine.ext.db import Key

from flask import jsonify, request, abort, Response
from app import app
import settings

from models import Area, Note, Report, StatsStore
from ee import NDFI, EELandsat

from resources.report import ReportAPI, CellAPI, NDFIMapApi, PolygonAPI, NoteAPI, UserAPI

from resources.stats import RegionStatsAPI

from application.constants import amazon_bounds

ReportAPI.add_urls(app, '/api/v0/report')
ReportAPI.add_custom_url(app, '/api/v0/report/<report_id>/close', 'close', ("POST",))

CellAPI.add_urls(app,       '/api/v0/report/<report_id>/cell')
CellAPI.add_custom_url(app, '/api/v0/report/<report_id>/cell/<id>/children', 'children')
CellAPI.add_custom_url(app, '/api/v0/report/<report_id>/cell/<id>/ndfi_change', 'ndfi_change')
CellAPI.add_custom_url(app, '/api/v0/report/<report_id>/cell/<id>/bounds', 'bounds')
CellAPI.add_custom_url(app, '/api/v0/report/<report_id>/cell/<id>/landsat', 'landsat')
CellAPI.add_custom_url(app, '/api/v0/report/<report_id>/cell/<id>/rgb/<r>/<g>/<b>', 'rgb_mapid')

NDFIMapApi.add_urls(app, '/api/v0/report/<report_id>/map')
PolygonAPI.add_urls(app, '/api/v0/report/<report_id>/cell/<cell_pos>/polygon')
NoteAPI.add_urls(app, '/api/v0/report/<report_id>/cell/<cell_pos>/note')
UserAPI.add_urls(app, '/api/v0/user')

RegionStatsAPI.add_urls(app, '/api/v0/report/<report_id>/stats')


@app.route('/api/v0/stats/<table>/<zone>')
@app.route('/api/v0/stats/<table>')
def stats(table, zone=None):

    reports = request.args.get('reports', None)
    if not reports:
        abort(400)
    try:
        reports = map(int, reports.split(','))
    except ValueError:
        logging.error("bad format for report id")
        abort(400)

    f = StringIO()
    csv_file = csv.writer(f)
    csv_file.writerow(('report_id', 'start_date', 'end_date', 'deforestated', 'degradated'))
    reports = [Report.get_by_id(x) for x in reports]
    for r in reports:
        if not r:
            abort(404)
        report_id = str(r.key())
        st = StatsStore.get_for_report(report_id)

        if not st:
            logging.error("no cached stats for %s" % report_id)
            abort(404)

        stats = st.table_accum(table, zone)
        if not stats:
            logging.error("no stats for %s" % report_id)
            abort(404)

        csv_file.writerow((str(r.key().id()),
                r.start.isoformat(),
                r.end.isoformat(),
                stats['def'],
                stats['deg']))

    return Response(f.getvalue(), mimetype='text/csv')


def landstat():
    e = EELandsat('LANDSAT/L7_L1T')
    #return jsonify(images=e.list())
    return jsonify(map=e.mapid())

@app.route('/api/v0/test')
def testing():
    r = Report.current()
    #r = Report.get(Key('ahBpbWF6b24tcHJvdG90eXBlcg4LEgZSZXBvcnQYiaECDA'))
    logging.info("report " + unicode(r))
    ee_resource = 'MOD09GA'
    ndfi = NDFI(ee_resource,
            r.comparation_range(),
            r.range())
    return jsonify(ndfi._execute_cmd("/value", {
        "image": json.dumps({"creator":"SAD/com.google.earthengine.examples.sad.GetStats","args":[{"creator":"SAD/com.google.earthengine.examples.sad.ProdesImage","args":["PRODES_IMAZON_2011a"]},{"type":"FeatureCollection","table_id":1505198},"name"]}),
        "fields": "classHistogram"
    }))
    #return str(ndfi.mapid2())
    #return str(ndfi.freeze_map(1089491, r.key().id()))
