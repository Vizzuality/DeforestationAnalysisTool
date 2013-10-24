

var Polygon = Backbone.Model.extend({
    // this two values must match with declared in models.py
    DEGRADATION: 0,
    DEFORESTATION: 1,

    editing: false, 

    initialize: function() {
        _.bindAll(this, "update_pos");
    },

    paths: function() {
        return _.map(this.get('paths'), function(p) {
            return _.map(p, function(ll) {
                return new google.maps.LatLng(ll[0], ll[1]);
            });
        });
    },
    
    update_pos: function(path_index, vertex_index, latlng) {
        var p = this.get('paths');
        p[path_index][vertex_index] = latlng;
        this.set({'paths': p});
        // we're changing the internal reference so
        // change signal will not be called. Call it manually
        this.trigger('change');
    },

    // duplicate last vertex for each polygon before sending to
    // the server as GeoJSON/kml requires
    toJSON: function() {
        var paths = this.get('paths');
        var geojsonPath = _.map(paths, function (path) {
          var p = _.clone(path);
          p.push(p[0]);
          return p;
        });
        return {
          type: this.attributes.type,
          paths: geojsonPath
        };
    },

    parse: function(resp) {
      // remove duplicated points from paths
      // if the first and the last one are equal to maintain compatibility
      // modify resp in place
      _.each(resp.paths, function(path) {
        if(_.isEqual(path[0], path[path.length - 1])) {
          path.splice(path.length - 1, 1);
        }
      });

      return resp;

    }



});

// polygons inside a cell
var PolygonCollection = Backbone.Collection.extend({
    model: Polygon,

    initialize: function(options) {
        this.x = options.x;
        this.y = options.y;
        this.z = options.z;
        this.report = options.report;
    },

    url: function() {
        return "/api/v0/report/" + this.report.id + "/cell/" + this.z + "_" + this.x + "_" + this.y + "/polygon";
    }
});
