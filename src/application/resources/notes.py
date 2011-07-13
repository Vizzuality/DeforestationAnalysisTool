
import logging
from application.models import Note
from resource import Resource
from flask import Response, request

import simplejson as json

from google.appengine.ext.db import Key

class NoteAPI(Resource):

    def _as_json(self, o):
        return Response(json.dumps(o), mimetype='application/json')
        
    def list(self):
        return self._as_json([x.as_dict() for x in Note.all()])

    def create(self):
        o = json.loads(request.data)
        n = Note(cell_z=0, cell_y=0, cell_x=0, msg=o['msg'])
        n.put()
        return self._as_json(str(n.key()))

    def get(self, id):
        obj = Note.get(Key(id))
        return Response(obj.as_json(), mimetype='application/json')

    """



    def delete(self, id):
        del res[int(id)]
        return 'ok'

    def update(self, id):
        res[int(id)].update(dict(request.form.iteritems()))
        return self._as_json(res[id])
    """
