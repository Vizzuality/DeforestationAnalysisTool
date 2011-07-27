"""
Initialize Flask app

"""

import sys

package_dir = "packages"
sys.path.insert(0, package_dir)

import views
import api
import commands

