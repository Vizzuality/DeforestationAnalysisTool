#encoding: utf-8

import logging
import settings
import simplejson as json

from earthengine.connector import EarthEngine


class NDFI(object):
    """ ndfi info for a period of time
    """

    # hardcoded data for request

    PRODES_IMAGE = {
        "creator": 'SAD/com.google.earthengine.examples.sad.ProdesImage',
        "args": ["PRODES_2009"]
    };

    MODIS_BANDS = [
          'sur_refl_b01_250m', 'sur_refl_b02_250m', 'sur_refl_b03_500m',
          'sur_refl_b04_500m', 'sur_refl_b06_500m', 'sur_refl_b07_500m'];

    THIS_POLY = None

    def __init__(self, ee_res, last_perdiod, work_period):
        self.last_perdiod = dict(start=last_perdiod[0],
                                 end=last_perdiod[1])
        self.work_period = dict(start=work_period[0],
                               end=work_period[1])
        self.earth_engine_resource = ee_res
        self.ee = EarthEngine(settings.EE_TOKEN)
        self._image_cache = {}

    def mapid(self):
        """ return a dict with mapid and token to use in google maps tiles url

            returned dict is like this:
            {
              "data": {
                "token": "a77a0345fce41da72334b29e61c9b8d5",
                "mapid": "62dc6e8f906a187d323fea768aab6504"
              }
            }

            it can be used in google maps

            {{mapid}}/zoom/x/y/?token={{token}}
        """

        # get image list from those days
        reference_images = self._images_for_period(self.last_perdiod)
        work_images = self._images_for_period(self.work_period)

        logging.debug("reference images " + str(reference_images))
        logging.debug("work images " + str(work_images))

        # get map id from EE
        cmd = self._NDFI_map_command(
            reference_images,
            work_images
        )
        return self._execute_cmd('/mapid', cmd)

    def rgbid(self):
        """ return params to access NDFI rgb image """
        work_images = self._images_for_period(self.work_period)
        # get map id from EE
        params = self._RGB_image_command(work_images)
        return self._execute_cmd('/mapid', params)

    def smaid(self):
        """ return params to access NDFI rgb image """
        work_images = self._images_for_period(self.work_period)
        # get map id from EE
        params = self._SMA_image_command(work_images)
        return self._execute_cmd('/mapid', params)

    def ndfi0id(self):
        reference_images = self._images_for_period(self.last_perdiod)
        # get map id from EE
        params = self._NDFI_period_image_command(reference_images)
        return self._execute_cmd('/mapid', params)

    def ndfi1id(self):
        work_images = self._images_for_period(self.work_period)
        # get map id from EE
        params = self._NDFI_period_image_command(work_images)
        return self._execute_cmd('/mapid', params)

    def _get_polygon_bbox(self, polygon):
        lats = [x[0] for x in polygon]
        lngs = [x[1] for x in polygon]
        max_lat = max(lats)
        min_lat = min(lats)
        max_lng = max(lngs)
        min_lng = min(lngs)
        return ((min_lat, max_lat), (min_lng, max_lng))

    def _execute_cmd(self, url, cmd):
        params = "&".join(("%s=%s"% v for v in cmd.iteritems()))
        return self.ee.post(url, params)

    def ndfi_change_value(self, polygons, rows=10, cols=10):
        """ return how much NDFI has changed in the time period
            ``polygons`` are a list of closed polygons defined by lat, lon::

            [
                [ [lat, lon], [lat, lon]...],
                [ [lat, lon], [lat, lon]...]
            ]

            for performance reassons bbox greater than 3 degrees are now allowed
        """
        # some assertions
        for p in polygons:
            bbox = self._get_polygon_bbox(p)
            if bbox[0][1] - bbox[0][0] > 3.5 or bbox[1][1] - bbox[1][0] > 3.5:
                #raise Exception("polygon bbox size must be less than 3 degrees")
                pass

        # get image list from those days
        reference_images = self._images_for_period(self.last_perdiod)
        work_images = self._images_for_period(self.work_period)

        logging.debug("reference images " + str(reference_images))
        logging.debug("work images " + str(work_images))

        cmd = self._NDFI_change_value(
            reference_images,
            work_images,
            polygons,
            rows,
            cols
        )
        return self._execute_cmd('/value', cmd)


    def _images_for_period(self, period):
        if period in self._image_cache:
            img = self._image_cache[period]
        else:
            reference_images = self.ee.get("/list?id=%s&starttime=%s&endtime=%s" % (
                self.earth_engine_resource,
                int(period['start']),
                int(period['end'])
            ))
            logging.info(reference_images)
            img = [x['id'] for x in reference_images['data']]
            self._image_cache[period] = img
        return img

    def _image_composition(self, image_list):
        """ create commands to compose images in google earth engine

            ok, i really have NO idea what's going on :)
        """
        specs = []
        for image in image_list:
            name = image.split("_", 2)[-1]
            specs.append({
              "creator": 'SAD/com.google.earthengine.examples.sad.ModisCombiner',
              "args": ['MOD09GA_005_' + name, 'MOD09GQ_005_' + name]
            });
        return specs;


    def _NDFI_image(self, image_list):
        """ given image list from EE, returns the operator chain to return NDFI image """
        return {
            "creator": 'SAD/com.google.earthengine.examples.sad.NDFIImage',
            "args": [{
              "creator": 'SAD/com.google.earthengine.examples.sad.UnmixModis',
              "args": [{
                "creator": 'SAD/com.google.earthengine.examples.sad.KrigingStub',
                "args": [{
                  "creator": 'SAD/com.google.earthengine.examples.sad.MakeMosaic',
                  "args": [self._image_composition(image_list), self.MODIS_BANDS]
                }]
              }]
            }]
         }

    def _NDFI_change_value(self, reference_images, work_images, polygons, cols=10, rows=10):
        """ calc the ndfi change value between two periods inside specified polys

            ``polygons`` are a list of closed polygons defined by lat, lon::

            [
                [ [lat, lon], [lat, lon]...],
                [ [lat, lon], [lat, lon]...]
            ]

        """
        ndfi_image_1 = self._NDFI_image(reference_images)
        ndfi_image_2 = self._NDFI_image(work_images)
        POLY = []
        fields = []

        return {
            "image": json.dumps({
               "creator": 'sad_test/com.google.earthengine.examples.sad.ChangeDetectionData',

               "args": [ndfi_image_1,
                        ndfi_image_2,
                        self.PRODES_IMAGE,
                        [polygons],
                        rows,
                        cols]

            }),

            "fields": 'ndfiSum'#','.join(fields)
        }

    def _NDFI_map_command(self, reference_images, work_images):
        """ returns command to send to EE to get map token """
        ndfi_image_1 = self._NDFI_image(reference_images)
        ndfi_image_2 = self._NDFI_image(work_images)
        dummy = 0
        return {
            "image": json.dumps({
               "creator": 'sad_test/com.google.earthengine.examples.sad.ChangeDetectionData',

               "args": [ndfi_image_1,
                        ndfi_image_2,
                        self.PRODES_IMAGE,
                        self.THIS_POLY,
                        10, #rows
                        10  #columns
                ]

            }),

            "bands": 'ndfi_delta',
            "format": 'png',
            "gain": 1,
            "bias": 0.0,
            "gamma": 1.6
        }

    def _NDFI_period_image_command(self, reference_images):
        """ get NDFI command to get map of NDFI for a period of time """
        ndfi_image = self._NDFI_image(reference_images)
        return {
            "image": json.dumps(ndfi_image),
            "bands": 'vis-red,vis-green,vis-blue',
            "gain": 1,
            "bias": 0.0,
            "gamma": 1.6
        }

    def _RGB_image_command(self, image_list):
        """ commands for RGB image """
        return {
            "image": json.dumps({
               "creator": 'SAD/com.google.earthengine.examples.sad.KrigingStub',
               "args": [{
                "creator": 'SAD/com.google.earthengine.examples.sad.MakeMosaic',
                "args": [self._image_composition(image_list), self.MODIS_BANDS]
              }]
            }),
            "bands": 'sur_refl_b01,sur_refl_b04,sur_refl_b03',
            "gain": 0.1,
            "bias": 0.0,
            "gamma": 1.6
          };

    def _SMA_image_command(self, image_list):
        return {
            "image": json.dumps({
              "creator": 'SAD/com.google.earthengine.examples.sad.UnmixModis',
              "args": [{
                "creator": 'SAD/com.google.earthengine.examples.sad.KrigingStub',
                "args": [{
                  "creator": 'SAD/com.google.earthengine.examples.sad.MakeMosaic',
                  "args": [self._image_composition(image_list), self.MODIS_BANDS]
                }]
              }]
            }),
            "bands": 'gv,soil,npv',
            "gain": 256,
            "bias": 0.0,
            "gamma": 1.6
        };



