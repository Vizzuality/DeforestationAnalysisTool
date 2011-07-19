

from application import app
from flask import render_template, flash, url_for, redirect, abort, request, make_response 

from application import settings
from ft import FT

from time_utils import month_range
from application.models import Report

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
    Report(start=start, end=end, finished=False).put()
    return 'created'

    
