

var Polygon = Backbone.Model.extend({
    // this two values must match with declared in models.py
    DEGRADATION: 0,
    DEFORESTATION: 1,
    initialize: function() {
    }
});

// polygons inside a cell
var PolygonCollection = Backbone.Collection.extend({
    model: Polygon,

    initialize: function(models, options) {
        this.x = options.x;
        this.y = options.y;
        this.z = options.z;
        this.report = options.report;
    },

    url: function() {
        return "/api/v0/report/" + this.report.id + "/cell/" + this.z + "_" + this.x + "_" + this.y + "/polygon";
    }
});
