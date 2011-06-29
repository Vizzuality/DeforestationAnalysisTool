#encoding: utf-8

import time
import logging
import simplejson as json

from flask import jsonify, request
from application import app

from models import Area

@app.route('/api/v0/poly/new', methods=('POST',))
def poly_new():
    time.sleep(1);
    polys = json.loads(request.form['polys'])
    for kml in polys:
        Area(geo=kml, type=Area.DEFORESTATION).save()
    return jsonify(ok=True, msg="%d polygons saved" % len(polys));
    


