"""
Initialize Flask app

"""

import os
from flask import Flask, render_template

template_folder = os.path.join(os.path.dirname(__file__), '..', 'content', 'templates') 
app = Flask('application', template_folder=template_folder)
app.config.from_object('application.settings')

## Error handlers
# Handle 404 errors
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# Handle 500 errors
@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

import views
import api

import commands

