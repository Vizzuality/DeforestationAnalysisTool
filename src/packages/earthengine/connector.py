# -*- coding: utf-8 -*-
"""
    Earth Engine interface
    ~~~~~~~~~~~~~~~~~~~~
    :By Michael Geary - http://mg.to/
    :See UNLICENSE or http://unlicense.org/ for public domain notice.
"""

import logging

import cgi, sys

from google.appengine.api import urlfetch
import simplejson as json

DEFAULT_API = "http://earthengine.googleapis.com/api"

class EarthEngine( object ):
    """ google earth engine conector for app engine 
        usage:
            ee = EarthEngine(auth_token)
            json = ee.get("/list?id=SOMETHIND&starttime=1234")
    """

    def __init__( self, token, api_url=DEFAULT_API):
        self.url = api_url
        self.auth = token
        self.last_request = {}
        self.last_response = {}

    def _http( self, method, url, params=None ):
        logging.info("ee -> %s" % url)
        logging.info(params)
        try:
            response = urlfetch.fetch(
                method = method,
                url = self.url + url,
                headers = { 'Authorization': 'GoogleLogin auth=' + self.auth },
                payload = params,
                deadline=600
            )
            self.last_request = dict(
                method = method,
                url = self.url + url,
                headers = { 'Authorization': 'GoogleLogin auth=' + self.auth },
                payload = params,
                deadline=600)
            self.last_response = dict(code=response.status_code, content=response.content)
            if response.status_code == 200:
                data = json.loads( response.content )
            else:
                data = { 'error': { 'type':'http', 'code': response.status_code } }
        except urlfetch.DownloadError:
            data = { 'error': { 'type':'DownloadError', 'info':sys.exc_info() } }
        except urlfetch.ResponseTooLargeError:
            data = { 'error': { 'type':'ResponseTooLargeError', 'info':sys.exc_info() } }
        except:
            data = { 'error': { 'type':'Other', 'info':sys.exc_info() } }
        finally:
            logging.info("ee <- %s" % data)
            return data

    def get(self, api, params=None):
        if params:
            url = api + '?' + params
        else:
            url = api
        return self._http( 'GET', url )

    def post(self, api, params=None ):
        return self._http( 'POST', api, params )


class EarthImage( object ):

    def __init__( self ):
        pass

    def obj( self, type, id ):
        return {
            'type': type,
            'id': id,
        }

    def step( self, creator, *args ):
        return {
            'type': 'Image',
            'creator': creator,
            'args': args,
        }
