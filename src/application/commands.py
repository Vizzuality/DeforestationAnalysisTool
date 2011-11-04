# encoding: utf-8

import logging
import random
import simplejson as json
import time
from datetime import datetime, date
from app import app
from flask import render_template, flash, url_for, redirect, abort, request, make_response
from application.time_utils import timestamp
from google.appengine.ext import deferred
from google.appengine.ext.db import Key
from google.appengine.api import memcache

from application import settings
from ft import FT

from time_utils import month_range
from application.models import Report, Cell, StatsStore, FustionTablesNames
from application.constants import amazon_bounds
from ee import NDFI


@app.route('/_ah/cmd/create_table')
def create_table():
    cl = FT(settings.FT_CONSUMER_KEY,
            settings.FT_CONSUMER_SECRET,
            settings.FT_TOKEN,
            settings.FT_SECRET)
    table_desc = {settings.FT_TABLE: {
       'added_on': 'DATETIME',
       'type': 'NUMBER',
       'geo': 'LOCATION',
       'rowid_copy': 'NUMBER',
       'asset_id': 'NUMBER',
       'report_id': 'NUMBER',
    }}

    return str(cl.create_table(table_desc))

@app.route('/_ah/cmd/show_tables')
def show_tables():
    cl = FT(settings.FT_CONSUMER_KEY,
            settings.FT_CONSUMER_SECRET,
            settings.FT_TOKEN,
            settings.FT_SECRET)
    return '\n'.join(map(str, cl.get_tables()))

@app.route('/_ah/cmd/fix_report')
def fix_report():
    for x in Report.all():
        x.finished = True;
        x.put()
    return "thank you, john"

@app.route('/_ah/cmd/create_report', methods=('POST',))
def show_tables():
    """ creates a report for specified month """

    month = request.args.get('month','')
    year = request.args.get('year','')
    day= request.args.get('day','')

    if not month or not year:
        abort(400)
    start = date(year=int(year), month=int(month), day=int(day))
    r = Report(start=start, finished=False)
    r.put()

    assetid = request.args.get('assetid', '')
    month = request.args.get('fmonth','')
    year = request.args.get('fyear','')
    day= request.args.get('fday','')
    if assetid and month and year and day:
        r.end = date(year=int(year), month=int(month), day=int(day))
        r.assetid = assetid
        r.finished = True
        r.put()
        deferred.defer(update_report_stats, str(r.key()))

    return r.as_json()



@app.route('/_ah/cmd/cron/update_cells_ndfi', methods=('GET',))
def update_cells_ndfi():
    r = Report.current()
    cell = Cell.get_or_default(r, 0, 0, 0)
    for c in iter(cell.children()):
        c.put()
        deferred.defer(ndfi_value_for_cells, str(c.key()), _queue="ndfichangevalue")
    return 'working'



@app.route('/_ah/cmd/cron/update_cell/<int:z>/<int:x>/<int:y>', methods=('GET',))
def update_main_cell_ndfi(z, x, y):
    r = Report.current()
    cell = Cell.get_or_create(r, x, y, z)
    deferred.defer(ndfi_value_for_cells, str(cell.key()), _queue="ndfichangevalue")
    return 'working'

def ndfi_value_for_cells(cell_key):

    cell = Cell.get(Key(cell_key))

    ndfi = NDFI('MOD09GA',
            cell.report.comparation_range(),
            cell.report.range())

    bounds = cell.bounds(amazon_bounds)
    logging.info(bounds)
    ne = bounds[0]
    sw = bounds[1]
    polygons = [[ (sw[1], sw[0]), (sw[1], ne[0]), (ne[1], ne[0]), (ne[1], sw[0]) ]]
    data = ndfi.ndfi_change_value(cell.report.base_map(), [polygons])
    logging.info(data)
    if 'data' not in data:
        logging.error("can't get ndfi change value")
        return
    ndfi = data['data']['properties']['ndfiSum']['values']
    for row in xrange(10):
        for col in xrange(10):
            idx = row*10 + col
            count = float(ndfi['count'][idx])
            s = float(ndfi['sum'][idx])
            if count > 0.0:
                ratio = s/count
            else:
                ratio = 0.0
            ratio = ratio/10.0 #10 value is experimental
            # asign to cell
            logging.info('cell ndfi (%d, %d): %f' % (row, col, ratio))
            c = cell.child(row, col)
            c.ndfi_change_value = ratio
            c.put()

    #cell.calculate_ndfi_change_from_childs()


# only for development
@app.route('/_ah/cmd/update_cells_dummy', methods=('GET',))
def update_cells_ndfi_dummy():
    r = Report.current()
    if not r:
        return 'create a report first'
    cell = Cell.get_or_default(r, 0, 0, 0)
    for c in iter(cell.children()):
        c.put()
        deferred.defer(ndfi_value_for_cells_dummy, str(c.key()), _queue="ndfichangevalue")
    return 'working DUMMY'

def ndfi_value_for_cells_dummy(cell_key):

    cell = Cell.get(Key(cell_key))
    bounds = cell.bounds(amazon_bounds)
    logging.info(bounds)
    ne = bounds[0]
    sw = bounds[1]
    polygons = [[ sw, (sw[0], ne[1]), ne, (ne[0], sw[1]) ]]
    for row in xrange(10):
        for col in xrange(10):
            c = cell.child(row, col)
            c.ndfi_change_value = random.random()
            c.put()

    cell.calculate_ndfi_change_from_childs()


tables = [
    ('Municipalities', 1560866, 'name'),
    ('States', 1560836, 'name'),
    ('Federal Conservation', 1568452, 'ex_area'),
    ('State Conservation', 2042133, 'name'),
    ('Ingienous Land',1630610, 'name'),
    ('Legal Amazon', 1205151, 'name')
]

tables_map = dict(x[:2] for x in tables)

#
# ==================================================
#

from application.ee import Stats
@app.route('/_ah/cmd/update_report_stats/<report_id>', methods=('GET',))
def update_report_stats_view(report_id):
    deferred.defer(update_report_stats, report_id)
    return 'updating'

@app.route('/_ah/cmd/update_report_global_stats/<report_id>', methods=('GET',))
def update_report_global_stats(report_id):
    deferred.defer(update_total_stats_for_report, report_id)
    return 'updating'

def stats_for(report_id, assetid, table):
    ee = Stats()
    return ee.get_stats(report_id, assetid,  table)

def update_report_stats(report_id):
    r = Report.get(Key(report_id))
    stats = {
        'id': report_id,
        'stats': {}
    }
    for desc, table, name in tables:
        stats['stats'].update(stats_for(str(r.key().id()), r.assetid, table))
        # sleep for some time to avoid problems with FT 
        time.sleep(2)
        

    data = json.dumps(stats)
    s = StatsStore.get_for_report(report_id)
    if s:
        s.json = data
        s.put()
    else:
        StatsStore(report_id=report_id, json=data).put()
    update_total_stats_for_report(report_id)

def update_total_stats_for_report(report_id):
    r = Report.get(Key(report_id))
    stats = StatsStore.get_for_report(report_id)
    if stats:
        s = stats.table_accum(tables_map['Legal Amazon'])
        logging.info("stats for %s" % s)
        if s:
            r.degradation = s['deg']
            r.deforestation = s['def']
            r.put()
    else:
        logging.error("can't find stats for %s" % report_id)


@app.route('/_ah/cmd/flush_all')
def flush_all():
    memcache.flush_all()
    if request.args.get('stats',''):
        for x in StatsStore.all():
            x.delete()
    return "all killed, colonel Trautman"

    



@app.route('/_ah/cmd/fusion_tables_names')
def fusion_tables_names():
    """ precache de fusion tables names """
    for x in FustionTablesNames.all():
        x.delete()

    cl = FT(settings.FT_CONSUMER_KEY,
            settings.FT_CONSUMER_SECRET,
            settings.FT_TOKEN,
            settings.FT_SECRET)

    for desc, table, name in tables:
        info = cl.sql("select %s, description from %s" % (name, table))
        data = []
        # sorry
        for line in info.split('\n')[1:]: 
            if line:
                tk = line.split(',')
                #TODO: fix html decoding
                data.append((tk[0], tk[1]))

        FustionTablesNames(table_id=str(table), json=json.dumps(dict(data))).put()

    return "working"
