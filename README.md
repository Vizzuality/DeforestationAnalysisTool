Imazon-Sad application
================

This is a highly specific application to track deforestation on the amazonas. More specifically is a tool to do validation of deforestation detected by algorithms using satellite imagery. The algorithm and the metodology has been developed by Imazon (links to scientific papers) and is been implemented in Google Earth Engine by David Thau. The frontend development and the application architecture has been developed by Vizzuality.

The tool works on Appengine together with Google Earth Engine (GEE) and Fusion Tables (FT). There is a lot of dependencies on those so you are probably gonna need to contact us if you want to run the application (contact@vizzuality.com or thau@google.com).

How to run the application
---------------------

The tool is intended to be use directly online (still pending the final URL) so the following instructions only apply for developers on the project. The instructions are specific for development under Mac OS X Lion, but shouldnt be complicate to make it run in other unix systems.


1. Install [Appengine](http://code.google.com/intl/en/appengine/)
2. Modify appengine to use python 2.5
3. Copy and modify secret_keys.py.example
4. Run the application
5. Create an initial report
6. Start using the app.

Tips for development
---------------------
We will be adding here some tips when developing the application. The development can be very slow if using AppEngine as default so some tricks might be neccesary. To be done by Santana.

