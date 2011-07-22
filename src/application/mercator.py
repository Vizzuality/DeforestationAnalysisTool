
import math

class Mercator(object):
    """
    quick'n'dirty mercator projection implementation
    no scaling
    """

    @staticmethod
    def project(lat, lon):
        """ return (x, y) tuple """
        return lon, Mercator.lat2y(lat)

    @staticmethod
    def unproject(x, y):
        """ return (lat, lon) """
        return Mercator.y2lat(y), x

    @staticmethod
    def y2lat(a):
     return 180.0/math.pi * (2.0 * math.atan(math.exp(a*math.pi/180.0)) - math.pi/2.0)

    @staticmethod
    def lat2y(a):
        return 180.0/math.pi * math.log(math.tan(math.pi/4.0+a*(math.pi/180.0)/2.0))

