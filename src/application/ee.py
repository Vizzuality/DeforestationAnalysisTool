

def image_composition(image_list):
    """ create commands to compose images in google earth engine 
        
        ok, i really have NO idea what's going on :)
    """
    specs = []
    for image in image_list:
        name = image.split("_", 1)[1]
        specs.append({
          "creator": 'SAD/com.google.earthengine.examples.sad.ModisCombiner',
          "args": ['MOD09GA_005_' + name, 'MOD09GQ_005_' + name]
        });
    return specs;

MODIS_BANDS = [
      'sur_refl_b01_250m', 'sur_refl_b02_250m', 'sur_refl_b03_500m',
      'sur_refl_b04_500m', 'sur_refl_b06_500m', 'sur_refl_b07_500m'];


def NDFI_image(image_list):
    return {
        "creator": 'SAD/com.google.earthengine.examples.sad.NDFIImage',
        "args": [{
          "creator": 'SAD/com.google.earthengine.examples.sad.UnmixModis',
          "args": [{
            "creator": 'SAD/com.google.earthengine.examples.sad.KrigingStub',
            "args": [{
              "creator": 'SAD/com.google.earthengine.examples.sad.MakeMosaic',
              "args": [image_composition(image_list), MODIS_BANDS]
            }]
          }]
        }]
     }

var PRODES_IMAGE = {
    "creator": 'SAD/com.google.earthengine.examples.sad.ProdesImage',
    "args": [referenceMap]
};

"""
def NDFI_cmd(image_list):
    ndfi_image_2 = NDFI_image(image_list)
    ndfi_image_1 = NDFI_image(image_list)
 return {
        "image": json.dumps({
           "creator": 'sad_test/com.google.earthengine.examples.sad.ChangeDetectionData',

           "args": [NDFI_IMAGE_2, NDFI_IMAGE_1, PRODES_IMAGE, deforestThresh, degradeThresh, THIS_POLY]

        }),

        bands: 'ndfi_delta',

        gain: 1,

        bias: 0.0,

        gamma: 1.6

      };


        "image": $.toJSON({
           creator: 'SAD/com.google.earthengine.examples.sad.NDFIDeltaImage',
           args: [NDFI_IMAGE_1, NDFI_IMAGE_2, THIS_POLY]
        }),
        "bands": 'ndfi_delta',
        "gain": 1,
        "bias": 0.0,
        "gamma": 1.6
      };
"""
