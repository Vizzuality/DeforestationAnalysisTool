
var loader = new Loading();

var FusionTablesLayer = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'click_on_polygon');
        var self = this;
        this.mapview = this.options.mapview;
        this.google_maps_layer = this.options.layer;
        /*= new google.maps.FusionTablesLayer({
              query: {
                select: 'geometry',
                from:  '1089491'
              }
        });
        */
        this.google_maps_layer.setOptions({suppressInfoWindows: true});
        //this.google_maps_layer.setMap(this.mapview.map);


        google.maps.event.addListener(this.google_maps_layer, "click", function(event) {
            self.click_on_polygon(event);
        });

        //this.google_maps_layer.setMap(this.mapview.map);
        //this.mapview.layers.add(this.layer);
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

var Vizzualization = Backbone.View.extend({

    el: $('body'),

    initialize: function() {
        _.bindAll(this, 'start', 'load_map','polygon_click');
        loader.loading('Vizzualization::initialize', 'loading data');
        this.available_layers = new LayerCollection();
        this.load_map();
    },

    load_map: function() {
        this.map = new MapView({el: this.$("#main_map")});
        this.map.map.setCenter(new google.maps.LatLng(-10.131116841540678,  -51.954345703125));
        this.stats = new StatiticsInfo();
        this.map.bind('ready', this.start);
        loader.finished('Vizzualization::initialize');
    },

    start: function() {
        // load layers in map
        this.map.layers.reset(this.available_layers.models);
        this.map.layers.get_by_name('Brazil Legal Amazon').set_enabled(true);
        var polygon_layer = this.map.layers.get_by_name('polygons');
        this.polygons_layer = new FusionTablesLayer({
            mapview: this.map,
            layer: polygon_layer.map_layer
        });
        polygon_layer.set_enabled(true);
        this.polygons_layer.bind('polygon_click', this.polygon_click);
    },

    polygon_click: function(row) {
        this.stats.set_info(10, 20);
        this.stats.set_location('polygon (' + row.latLng.lat().toFixed(3) + "," + row.latLng.lng().toFixed(3) + ")");
    }




});
