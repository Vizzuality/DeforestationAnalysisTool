

var Polygon = Backbone.Model.extend({
    // this two values must match with declared in models.py
    DEGRADATION: 0,
    DEFORESTATION: 1,

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
