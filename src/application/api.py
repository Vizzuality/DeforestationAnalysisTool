#encoding: utf-8

import time
from datetime import datetime
import logging
import simplejson as json
from time_utils import timestamp, first_of_current_month, past_month_range
from dateutil.parser import parse

from flask import jsonify, request
from application import app
import settings

from models import Area, Note
from ee import NDFI

from resources.notes import NoteAPI
from resources.report import ReportAPI, CellAPI, NDFIMapApi, PolygonAPI

NoteAPI.add_urls(app, '/api/test/note')
ReportAPI.add_urls(app, '/api/v0/report')
CellAPI.add_urls(app, '/api/v0/report/<report_id>/cell')
NDFIMapApi.add_urls(app, '/api/v0/report/<report_id>/map')
PolygonAPI.add_urls(app, '/api/v0/report/<report_id>/cell/<cell_pos>/polygon')

#TODO: add auth
@app.route('/api/v0/poly/new', methods=('POST',))
def poly_new():
    polys = json.loads(request.form['polys'])
    logging.info(polys)
    for p in polys:
        kml = p['geom']
        type = int(p['type'])
        type = type if type in (Area.DEGRADATION, Area.DEFORESTATION) else Area.DEFORESTATION
        Area(geo=kml, type=type).save()
    return jsonify(ok=True, msg="%d polygons saved" % len(polys));

#TODO: add auth
@app.route('/api/v0/notes/new', methods=('POST',))
def note_new():
    note = json.loads(request.form['note'])
    msg = note['msg']
    cell_z, cell_x, cell_y = note['cell']
    Note(msg=msg, cell_z=cell_z, cell_x=cell_x, cell_y=cell_y).put()
    return jsonify(ok=True)

#TODO: add auth
@app.route('/api/v0/notes/<int:cell_z>/<int:cell_x>/<int:cell_y>')
def note_for_cell(cell_z, cell_x, cell_y):
    query = Note.gql("WHERE cell_x = :cell_x "
                      "AND cell_y = :cell_y "
                      "AND cell_z = :cell_z "
                      "ORDER BY added_on DESC",
                      cell_x=cell_x,
                      cell_y=cell_y,
                      cell_z=cell_z)
    res = query.fetch(100)
    return jsonify(notes=[{'msg': x.msg} for x in res])

#TODO: add auth
@app.route('/api/v0/ndfi')
def ndfi_map():
    """ return map_id for specified ndfi range date
        if date range is not specified only ndfi from 1st of the month
        are computed

        returns a json with mapid and token

        an example request look like this
        /api/v0/ndfi&starttime=1254305000000&endtime=1256900200000

        starttime and endtime are timestamp in milliseconds
    """
    # parse params
    now = datetime.now()
    starttime = request.args.get('starttime', first_of_current_month())
    endtime = request.args.get('endtime', timestamp(now))
    try:
        starttime = float(starttime)
        endtime = float(endtime)
    except ValueError:
        # try to parse as normal format (not timestamp)
        starttime = timestamp(parse(request.args.get('starttime')))
        endtime = timestamp(parse(request.args.get('endtime')))

    ee_resource = 'MOD09GA'
    ndfi = NDFI(ee_resource,
        past_month_range(datetime.fromtimestamp(starttime/1000)), (starttime, endtime))

    amazon_bounds = (
            (-18.47960905583197, -74.0478515625),
            (5.462895560209557, -43.43994140625)
    )
    ne = amazon_bounds[0]
    sw = amazon_bounds[1]
    #polygons = [[ sw, (sw[0], ne[1]), ne, (ne[0], sw[1]) ]]
    return jsonify(ndfi.mapid())
    #return jsonify(ndfi.ndfi_change_value(polygons))
    #return jsonify(ndfi.rgbid())
    #return jsonify(ndfi.smaid())
    #return jsonify(ndfi.ndfi0id())
