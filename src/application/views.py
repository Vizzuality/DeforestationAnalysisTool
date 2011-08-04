# encoding: utf-8

import logging
import os
import simplejson as json
from shutil import copyfile

from google.appengine.api import urlfetch
from google.appengine.api import users

from flask import render_template, flash, url_for, redirect, abort, request, make_response 
from application.time_utils import timestamp, past_month_range

from decorators import login_required, admin_required
from forms import ExampleForm
from application.ee import NDFI

from app import app

from models import Report, User, Error
from google.appengine.api import memcache
from google.appengine.ext.db import Key

def default_maps():
    maps = []
    r = Report.current()
    logging.info("report " + unicode(r))
    ee_resource = 'MOD09GA'
    ndfi = NDFI(ee_resource,
        past_month_range(r.start),
        r.range())

    d = ndfi.mapid()
    if 'data' in d:
        maps.append({'data' :d['data'], 'info': 'ndfi difference'})
    d = ndfi.smaid()
    if 'data' in d:
        maps.append({'data': d['data'], 'info': 'sma'})
    d = ndfi.rgbid()
    if 'data' in d:
        maps.append({'data': d['data'], 'info': 'rgb'})
    d = ndfi.ndfi0id()
    if 'data' in d:
        maps.append({'data': d['data'], 'info': 'NDFI t0'})
    d = ndfi.ndfi1id()
    if 'data' in d:
        maps.append({'data' :d['data'], 'info': 'NDFI t1'})
    return maps


@app.route('/')
@login_required
def home(cell_path=None):
    maps = memcache.get('default_maps')
    if maps:
        maps = json.loads(maps)
    else:
        maps = default_maps()
        memcache.add(key='default_maps', value=json.dumps(maps), time=3600*24)

    # send only the active report
    reports = json.dumps([Report.current().as_dict()])
    #user = users.get_current_user()
    user = User.get_user(users.get_current_user())
    if not user:
        abort(403)

    if not user.is_admin() and users.is_current_user_admin():
        user.role = "admin"
        user.put()

    return render_template('home.html', reports_json=reports, user=user, maps=maps)

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/error_track',  methods=['GET', 'POST'])
def error_track():
    d = request.form
    logging.info(request.form)
    Error(msg=d['msg'], url=d['url'], line=d['line'], user=users.get_current_user()).put()
    return 'thanks'

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
    result = urlfetch.fetch(EARTH_ENGINE_TILE_SERVER + tile_path + '?token='+ token, deadline=10)

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

