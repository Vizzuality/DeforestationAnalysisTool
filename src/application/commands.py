# encoding: utf-8

import logging
import random
from datetime import datetime, date
from app import app
from flask import render_template, flash, url_for, redirect, abort, request, make_response
from application.time_utils import timestamp
from google.appengine.ext import deferred
from google.appengine.ext.db import Key

from application import settings
from ft import FT

from time_utils import month_range
from application.models import Report, Cell
from application.constants import amazon_bounds
from ee import NDFI

@app.route('/_ah/cmd/create_table')
def create_table():
    cl = FT(settings.FT_CONSUMER_KEY,
            settings.FT_CONSUMER_SECRET,
            settings.FT_TOKEN,
            settings.FT_SECRET)
    table_desc = {'areas': {
       'added_on': 'DATETIME',
       'type': 'NUMBER',
       'geo': 'LOCATION',
       'rowid_copy': 'NUMBER',
       'asset_id': 'NUMBER',
    }}

    return str(cl.create_table(table_desc))

@app.route('/_ah/cmd/show_tables')
def show_tables():
    cl = FT(settings.FT_CONSUMER_KEY,
            settings.FT_CONSUMER_SECRET,
            settings.FT_TOKEN,
            settings.FT_SECRET)
    return '\n'.join(map(str, cl.get_tables()))

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
    return 'created'


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

@app.route('/_ah/cmd/cron/update_cells_ndfi', methods=('GET',))
def update_cells_ndfi():
    r = Report.current()
    cell = Cell.get_or_default(r, 0, 0, 0)
    for c in iter(cell.children()):
        c.put()
        deferred.defer(ndfi_value_for_cells, str(c.key()), _queue="ndfichangevalue")
    return 'working'


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
    data = ndfi.ndfi_change_value(polygons)
    ndfi = data['data']['properties']['ndfiSum']['values']
    logging.info(ndfi)
    for row in xrange(10):
        for col in xrange(10):
            idx = row*10 + col
            count = float(ndfi['count'][idx])
            s = float(ndfi['sum'][idx])
            if s > 0.0:
                ratio = count/s
            else:
                ratio = 0.0
            # normalize to 4 (this value is experimental)
            ratio = min(ratio, 4.0)/4.0
            ratio = ratio**0.6 # give more importance to smaller values 
            # asign to cell
            c = cell.child(row, col)
            c.ndfi_change_value = ratio
            c.put()

    cell.calculate_ndfi_change_from_childs()













