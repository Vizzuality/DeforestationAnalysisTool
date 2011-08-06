Imazon-Sad application
================

This is a highly specific application to track deforestation on the amazonas. More specifically is a tool to do validation of deforestation detected by algorithms using satellite imagery. The algorithm and the metodology has been developed by Imazon (links to scientific papers) and is been implemented in Google Earth Engine by David Thau. The frontend development and the application architecture has been developed by Vizzuality.

The tool works on Appengine together with Google Earth Engine (GEE) and Fusion Tables (FT). There is a lot of dependencies on those so you are probably gonna need to contact us if you want to run the application (contact@vizzuality.com or thau@google.com).

How to run the application
---------------------

The tool is intended to be use directly online (still pending the final URL) so the following instructions only apply for developers on the project. The instructions are specific for development under Mac OS X Lion and Snow Leopard, but shouldnt be complicate to make it run in other unix systems.


1. Install [Appengine](http://code.google.com/intl/en/appengine/)
   * Specifically use the [Python SDK](http://code.google.com/intl/en/appengine/downloads.html#Google_App_Engine_SDK_for_Python)
   * Run it and let it make symbolic links (you will be asked to enter your root password)
2. Modify appengine to use python 2.5
   * Go to terminal and write: `mate /Applications/GoogleAppEngineLauncher.app/Contents/Resources/GoogleAppEngine-default.bundle/Contents/Resources/google_appengine/dev_appserver.py`
   * Modify the first line to say: `#!/usr/bin/python2.5`
3. Checkout the project from GitHub
   * In the terminal go to the folder where you want to install the code: `cd /Users/ruth/workspace/`
   * Run  `git clone git://github.com/Vizzuality/DeforestationAnalysisTool.git`
4. Copy and modify secret_keys.py.example
   * run `cp src/application/secret_keys.py.example src/application/secret_keys.py`
   * Edit it accordingly (ask thau@google.com for credentials)
5. Run the application
   * Go to the src folder cd `src`
   * Run it using the following script: `tools/start`. Leave the window open, the application should be running.
6. Create an initial report
   * Open a new Terminal window, leaving the other open, and run `curl -d '' "http://localhost:8080/_ah/cmd/create_report?year=2011&month=7&day=15"`
7. Start using the app.
   * You should now be able to go to http://localhost:8080 and start using the application locally.
   * When loggin in dont forget to set yourself as admin.

Tips for development
---------------------
We will be adding here some tips when developing the application. The development can be very slow if using AppEngine as default so some tricks might be neccesary. To be done by Santana.
