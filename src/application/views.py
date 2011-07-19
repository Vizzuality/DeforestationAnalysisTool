# encoding: utf-8

import os
import simplejson as json
from shutil import copyfile

from google.appengine.api import urlfetch

from flask import render_template, flash, url_for, redirect, abort, request, make_response 

from decorators import login_required, admin_required
from forms import ExampleForm

from application import app

from models import Report

@app.route('/')
@app.route('/cell/<path:cell_path>')
@login_required
def home(cell_path=None):
    reports = json.dumps([x.as_dict() for x in Report.all()])
    return render_template('home.html', reports_json=reports)

@app.route('/tiles/<path:tile_path>')
def tiles(tile_path):
    """ serve static tiles """
    # save needed tiles
    if False:
        base = os.path.dirname(tile_path)
        try:
            os.makedirs("static/tiles/" + base)
        except OSError:
            pass #java rocks
        copyfile("static/maps/%s" % tile_path, "static/tiles/%s" % tile_path)
    return redirect('/static/tiles/%s' % tile_path)
    #return redirect('/static/maps/%s' % tile_path)


EARTH_ENGINE_TILE_SERVER = 'http://earthengine.googleapis.com/map/'
@app.route('/ee/tiles/<path:tile_path>')
def earth_engine_tile_proyx(tile_path):
    token = request.args.get('token', '')
    if not token:
        abort(401)
    result = urlfetch.fetch(EARTH_ENGINE_TILE_SERVER + tile_path + '?token='+ token)

    response = make_response(result.content)
    response.headers['Content-Type'] = result.headers['Content-Type']
    return response


@app.route('/admin_only')
@admin_required
def admin_only():
    """This view requires an admin account"""
    return 'Super-seekrit admin page.'


@app.route('/_ah/warmup')
def warmup():
    """App Engine warmup handler
    See http://code.google.com/appengine/docs/python/config/appconfig.html#Warming_Requests

    """
    return ''

