#encoding: utf-8

import time
import logging
import simplejson as json

from flask import jsonify, request
from application import app

from models import Area, Note

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


@app.route('/api/v0/notes/new', methods=('POST',))
def note_new():
    note = json.loads(request.form['note'])
    msg = note['msg']
    cell_z, cell_x, cell_y = note['cell']
    Note(msg=msg, cell_z=cell_z, cell_x=cell_x, cell_y=cell_y).put()
    return jsonify(ok=True)

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

