
/*
  =================================
  Polygons layer control

  the polygons shown depends on what time range user choose.
  this class controls visibility
  =================================
*/

var PolygonsLayer = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'click_on_polygon', 'range_changed');
        var self = this;
        this.mapview = this.options.mapview;
        this.layer = this.options.layer;
        this.google_maps_layer = this.layer.map_layer;
        this.google_maps_layer.setOptions({suppressInfoWindows: true});
        this.table = this.layer.get('table');
        this.range_changed(this.options.initial_range);

        google.maps.event.addListener(this.google_maps_layer, "click", function(event) {
            self.click_on_polygon(event);
        });

    },

    click_on_polygon: function(poly) {
        poly.table = this.table;
        this.trigger('polygon_click', poly);
    },

    range_changed: function(reports) {
        var r = _(reports).map(function(rep) { 
            return "'" + rep.get('fusion_tables_id') + "'"; 
        });
        var sql_where = 'report_id IN (' + r.join(',') + ')';
        this.google_maps_layer.setOptions({
            query: {
                select: 'geo',
                from: this.table,
                where: sql_where
            }
        });
    }


});
