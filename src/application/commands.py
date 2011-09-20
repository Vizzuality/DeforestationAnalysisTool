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
