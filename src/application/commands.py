# encoding: utf-8

import logging
from application import app
from flask import render_template, flash, url_for, redirect, abort, request, make_response
from application.time_utils import timestamp, past_month_range
from google.appengine.ext import deferred

from application import settings
from ft import FT

from time_utils import month_range
from application.models import Report, Cell
from google.appengine.ext.db import Key
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
       'geo': 'LOCATION'
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

    if not month or not year:
        abort(400)
    start, end = month_range(int(month), int(year))
    r = Report(start=start, end=end, finished=False)
    r.put()
    update_ndfi(r)
    return 'created'

amazon_bounds = (
            (-18.47960905583197, -74.0478515625),
            (5.462895560209557, -43.43994140625)
)
#def ndfi_value_for_cells(cell_polygons):
def ndfi_value_for_cells(cell_key):

    cell = Cell.get(Key(cell_key))

    ndfi = NDFI('MOD09GA',
            past_month_range(cell.report.start),
            cell.report.range())

    bounds = cell.bounds(amazon_bounds)
    logging.info(bounds)

    ne = bounds[0]
    sw = bounds[1]
    polygons = [[ sw, (sw[0], ne[1]), ne, (ne[0], sw[1]) ]]
    data = ndfi.ndfi_change_value(polygons)

    try:
        cell.ndfi_change_value = float(data['data']['properties']['ndfiSum0'])
        logging.info(cell.ndfi_change_value)
        cell.put()
    except ValueError, KeyError:
        logging.error("can't get ndfi change value, bad response", e)
        #TODO retry

    """
    for c in iter(cell.children()):
        c.put();
        if cell.z < 2:
            deferred.defer(ndfi_value_for_cells, str(c.key()), _queue="ndfi_change_value")
    """

def update_ndfi(r):
    """ update ndfi with values that come from earth engine
        run once per day
    """
    # get polygons for cell

    cell = Cell.get_or_default(r, 0, 0, 0)

    for c in iter(cell.children()[:25]):
        c.put();
        deferred.defer(ndfi_value_for_cells, str(c.key()), _queue="ndfichangevalue")

















