#encoding: utf-8

import time
import logging
import simplejson as json

from flask import jsonify, request
from application import app

from models import Area

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


