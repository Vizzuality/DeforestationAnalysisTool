
var loader = new Loading();
/*
  =================================
*/
var FusionTablesLayer = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'click_on_polygon');
        var self = this;
        this.mapview = this.options.mapview;
        this.google_maps_layer = this.options.layer;
        this.google_maps_layer.setOptions({suppressInfoWindows: true});

        google.maps.event.addListener(this.google_maps_layer, "click", function(event) {
            self.click_on_polygon(event);
        });

    },

    click_on_polygon: function(poly) {
        this.trigger('polygon_click', poly);
    }


});

var StatiticsInfo = Backbone.View.extend({
    el: $('#overview'),

    initialize: function() {
        _.bindAll(this, 'set_info', 'set_location');
        this.area_info = this.$(".stats");
        this.location = this.$("#current_cell");
    },

    set_info: function(deforested_area, degradated_area) {
        this.area_info.html(deforested_area + " " + degradated_area);
    },

    set_location: function(loc) {
        this.location.html(loc);
    }
});

var Toolbar = Backbone.View.extend({

    el: $('#tools'),

    initialize: function() {
        this.el.show();
        this.$('#work_toolbar').show();
    }

});


/*
 =======================
 main app
 =======================
*/

var Vizzualization = Backbone.View.extend({

    el: $('body'),

    initialize: function() {
        _.bindAll(this, 'start', 'load_map','polygon_click');
        loader.loading('Vizzualization::initialize', 'loading data');
        this.available_layers = new LayerCollection();
        this.load_map();
    },

    load_map: function() {
        var self = this;
        this.map = new MapView({el: this.$("#main_map")});
        this.map.map.setCenter(new google.maps.LatLng(-10.131116841540678,  -51.954345703125));
        this.map.bind('ready', this.start);

        this.stats = new StatiticsInfo();

        this.tools = new Toolbar();
        this.popup = new MapPopup();

        this.map.bind('click', function() { self.popup.close(); });
        loader.finished('Vizzualization::initialize');
    },

    start: function() {
        // load layers in map
        this.map.layers.reset(this.available_layers.models);

        // show default layers
        this.map.layers.get_by_name('Legal Amazon').set_enabled(true);
        this.map.layers.get_by_name('polygons').set_enabled(true);

        //TODO: debug, remove
        this.map.layers.get_by_name('State Conservation').set_enabled(true);
        this.prepare_ft_layers();
    },

    // add click listener to fusion tables layers
    prepare_ft_layers: function() {
        this.state_conservation_layer = new FusionTablesLayer({
            mapview: this.map,
            layer: this.map.layers.get_by_name('State Conservation').map_layer
        });
        this.state_conservation_layer.bind('polygon_click', this.polygon_click);
    },

    polygon_click: function(row) {
        var pos = this.map.projector.transformCoordinates(row.latLng);
        this.popup.showAt(pos, "goiania", '23.291', '1.291', '293');
        //this.stats.set_info(10, 20);
        //this.stats.set_location('polygon (' + row.latLng.lat().toFixed(3) + "," + row.latLng.lng().toFixed(3) + ")");
    }

});
