
var loader = new Loading();
var loading_small = new LoadingSmall();


/*
  =================================
  app router
  =================================
*/
var Router = Backbone.Router.extend({

  routes: {
    "/:zoom/:lat/:lon":        "goto"
  },
  //fake function, not used
  goto: function() {}
});

/*
  =================================
  =================================
*/
var FusionTablesLayer = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'click_on_polygon');
        var self = this;
        this.mapview = this.options.mapview;
        this.google_maps_layer = this.options.layer;
        this.google_maps_layer.setOptions({suppressInfoWindows: true});
        this.table = this.options.table;

        google.maps.event.addListener(this.google_maps_layer, "click", function(event) {
            self.click_on_polygon(event);
        });

    },

    click_on_polygon: function(poly) {
        poly.table = this.table;
        this.trigger('polygon_click', poly);
    }


});

/*
  ===============================
  controls the box on top right
  ===============================
*/

var StatiticsInfo = Backbone.View.extend({
    el: $('#overview'),

    events: {
       'click #report_done': 'show_report'
    },

    initialize: function() {
        _.bindAll(this, 'set_info', 'set_location', 'show_report', 'range_change');
        this.area_info = this.$(".stats");
        this.location = this.$("#current_cell");
    },

    set_info: function(deforested_area, degradated_area) {
        this.area_info.html(deforested_area + " " + degradated_area);
    },

    set_location: function(loc) {
        this.location.html(loc);
     },

    show_report: function(e) {
        if(e) e.preventDefault();
        this.trigger('show_report');
    },

    range_change: function(reports) {
        this.location.html("All areas " + _(reports).reduce(function(total, r) {
            return total + r.get('deforestation') + r.get('degradation');
        }, 0).toFixed(2) + "km2");
    }
});

var Toolbar = Backbone.View.extend({

    el: $('#tools'),

    initialize: function() {
        _.bindAll(this, 'change_state');
        this.el.show();
        this.$('#work_toolbar').show();
        this.buttons = new ButtonGroup({el: $('#selection')});
        this.buttons.select('edit');

        this.draw_tool = this.options.draw_tool;
        this.buttons.bind('state', this.change_state);

    },

    set_cursor: function(st) {
            var cursors_pos = {
                'edit': '4 4',
                'auto': '7 7',
                'remove': '6 6',
                'draw': '4 16'
            };
            this.draw_tool.mapview.map.setOptions({
                    draggableCursor: 'url(/static/img/cursor_' + st +'.png) ' + cursors_pos[st] + ', default'});
    },

    change_state: function(state) {
        this.set_cursor(state);
        switch(state) {
            case 'draw':
                this.draw_tool.editing_state(true);
                break;
            case 'edit':
                this.draw_tool.editing_state(false);
                break;
        }
    }


});


/*
 =======================
 main app
 =======================
*/

var Vizzualization = Backbone.View.extend({
    REPORT_LAYERS: [
      'Legal Amazon',
      'Municipalities',
      'States',
      'Federal Conservation',
      'State Conservation'
    ],

    INTERACTION_LAYERS: [
      'Municipalities',
      'States',
      'Federal Conservation',
      'State Conservation',
      'Indigenous Land'
    ],

    el: $('body'),

    initialize: function() {
        _.bindAll(this, 'start', 'load_map','polygon_click','custom_polygon_click', 'show_report', 'update_dates');
        loader.loading('Vizzualization::initialize', 'loading data');
        // initial data
        this.available_layers = new LayerCollection();
        this.reports = new ReportCollection();
        this.load_map();
    },

    load_map: function() {
        var self = this;
        // create map
        this.map = new MapView({el: this.$("#main_map")});
        this.map.map.setCenter(new google.maps.LatLng(-6.348056476859352, -57.88696289062));
        this.map.map.setOptions({disableDoubleClickZoom: false});


        this.map.bind('ready', this.start);

        // widgets
        this.stats = new StatiticsInfo();
        this.popup = new MapPopup({map: this.map});
        this.searchbox = new Searchbox();
        this.report_dialog = new ReportDialog({ reports: this.reports });
        this.time_range = new TimeRange({reports: this.reports});
        this.report_stats = new ReportStatCollection();
        this.create_polygon_tool = new  PolygonDrawEditTool({mapview: this.map});
        this.tools = new Toolbar({draw_tool: this.create_polygon_tool});

        //router
        this.router = new Router();
        this.router.bind('route:goto', function(zoom, lat, lon) {
            self.map.set_center(
                    new google.maps.LatLng(
                        parseFloat(lat),
                        parseFloat(lon))
            );
            self.map.set_zoom(parseInt(zoom, 10));
        });

        this.create_polygon_tool.bind('polygon_click', function(path) {
            console.log(path);
        });

        this.create_polygon_tool.bind('polygon', function(path) {
            var p = path.path[0];
            console.log(path.path);
            self.custom_polygon_click(new google.maps.LatLng(p[0], p[1]), path.path);
        });

        // binding
        this.stats.bind('show_report', this.show_report);
        this.popup.bind('show_report', this.show_report);
        this.map.bind('click', function() { self.popup.close(); });
        this.map.bind('click', function() { self.searchbox.close(); });
        this.tools.bind('show_report', this.show_report);
        this.tools.buttons.bind('state:edit', function() {
            self.layers_clickable(true);
        });
        this.tools.buttons.bind('state:draw', function() {
            self.layers_clickable(false);
        });

        Backbone.history.start();
        loader.finished('Vizzualization::initialize');
    },

    start: function() {
        var self = this;

        if(this.reports.length === 0) {
            show_error("No reports finished");
            return;
        }

        // load layers in map
        this.map.layers.reset(this.available_layers.models.reverse());

        this.report_dialog.regions = _(self.REPORT_LAYERS).map(function(a) {
                return self.available_layers.get_by_name(a).toJSON();
         });

        this.time_range.bind('range_change', this.report_dialog.set_reports);
        this.time_range.bind('range_change', this.update_dates);
        this.time_range.bind('range_change', this.stats.range_change);
        this.time_range.trigger('range_change', this.time_range.get_report_range());
        // show default layers
        this.map.layers.get_by_name('Legal Amazon').set_enabled(true);
        this.map.layers.get_by_name('deforestation').set_enabled(true);

        this.prepare_ft_layers();
        this.searchbox.bind('goto', function(center, zoom) {
            self.map.set_center(center);
            self.map.set_zoom(zoom);
            self.router.navigate('/' + zoom + "/" + center.lat() + "/" + center.lng());
        });
        var update_router = function() {
            var center = self.map.map.getCenter();
            var zoom = self.map.map.getZoom();
            self.router.navigate('/' + zoom + "/" + center.lat() + "/" + center.lng());
        };
        this.map.bind('center_changed', update_router);
        this.map.bind('zoom_changed', update_router);

        if(location.hash === '') {
            var ll = this.map.map.getCenter();
            var z = this.map.map.getZoom();
            self.router.navigate('/'+ z + '/' + ll.lat() + '/' + ll.lng());
        }
    },

    // update timerange dates
    update_dates: function(reports) {
        $('#report_from').val(format_date(reports[0].get('start')));
        $('#report_to').val(format_date(_(reports).last().get('end')));
    },

    // add click listener to fusion tables layers
    prepare_ft_layers: function() {
        var self = this;
        // areas layers
        _(this.INTERACTION_LAYERS).each(function(layer_name) {
            var state = self.map.layers.get_by_name(layer_name);
            self.state_conservation_layer = new FusionTablesLayer({
                mapview: self.map,
                layer: state.map_layer,
                table: state.get('table')
            });
            self.state_conservation_layer.bind('polygon_click', self.polygon_click);
        });
        // polygon layer
        var pl = self.map.layers.get_by_name('deforestation');
        self.polygons_layer = new PolygonsLayer({
            map: self.map,
            layer: pl,
            initial_range: self.time_range.get_report_range()
        });
            
        // set amazonas not clicable
        pl = self.map.layers.get_by_name('Legal Amazon');
        pl.map_layer.setOptions({clickable: false});
        this.time_range.bind('range_change', self.polygons_layer.range_changed);
    },

    layers_clickable: function(clickable) {
        var self = this;
        _(this.INTERACTION_LAYERS).each(function(layer) {
            var l = self.map.layers.get_by_name(layer);
            l.map_layer.setOptions({clickable: clickable});
        });
    },

    polygon_click: function(data) {
        var self = this;
        var reports = this.time_range.get_report_range();
        loading_small.loading('fetching stats');
        self.report_stats.stats_for_periods(reports, data.table + '_' + data.row.name.value, function(stats) {
            if(stats === undefined) {
                show_error('There was a problem getting stats for this area');
            } else {
                //hack to avoid fails on tables without description
                var desc = data.row.description || {'value': 'desc'};
                self.popup.showAt(data.latLng, data.table, data.row.name.value, desc.value, stats.total_area, stats.def,  stats.deg);
            }
            loading_small.finished('fething stats');
        });
    },

    custom_polygon_click: function(latLng, polygon_path) {
        var self = this;
        var reports = this.time_range.get_report_range();
        var polygon_stats = new PolygonStatCollection(null, {
            reports: reports,
            polygon_path: polygon_path
        });
        loading_small.loading('fetching stats');
        // TODO: get stats
        polygon_stats.stats(function(st) {
            var stats = {
                table: 'table',
                zone: 'zone',
                title: 'custom polygon',
                total_area: st.total_area,
                area_deg: st.deg,
                area_def: st.def
            };
            if(stats === undefined) {
                show_error('There was a problem getting stats for this area');
            } else {
                self.popup.showAt(latLng, stats.table, stats.zone, stats.title, stats.total_area, stats.area_def, stats.area_deg, polygon_path);
            }
            loading_small.finished('fething stats');
         });
    },

    show_report: function(report_info) {
        this.report_dialog.show(report_info);
    }


});
