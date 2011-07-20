
$(function() {

    var Loading = Backbone.View.extend({
        el: $("#loading"),

        refcount: 0,
        
        initialize: function() {
        },

        loading: function() {
            this.refcount++;
            this.el.fadeIn();
        },
        finished: function() {
            --this.refcount;
            if(this.refcount === 0) {
                this.el.hide();
            }
        }
        
    });
    var Rutes = Backbone.Router.extend({
      routes: {
        "cell/:z/:x/:y":   "cell"
      },
      cell: function(z, x, y) {
        //console.log(z, x, y);
      }
    });

    var router = new Rutes();

    // application
    var IMazon = Backbone.View.extend({

        amazon_bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(-18.47960905583197, -74.0478515625),
            new google.maps.LatLng(5.462895560209557, -43.43994140625)
        ),

        initialize:function() {
            _.bindAll(this, 'to_cell', 'start', 'select_mode', 'work_mode', 'change_report');

            window.loading.loading();
            this.reports = new ReportCollection();
            this.reports.bind('reset', this.change_report);

            this.map = new MapView();
            this.map.bind('ready', this.start);
        },

        init_ui: function() {
            this.selection_toolbar = new ReportToolbar();
            this.polygon_tools = new PolygonToolbar();

            this.ndfi_layer = new NDFILayer({mapview: this.map, report: this.active_report});

            this.polygon_tools.ndfi_range.bind('change', this.ndfi_layer.apply_filter);
        },

        change_report: function() {
            //TODO: use comboxbox to select the active report
            this.active_report = this.reports.models[0];
        },

        // entering on work mode
        work_mode: function() {
            this.selection_toolbar.hide();
            this.polygon_tools.show();
            this.ndfi_layer.show();
        },

        // entering on select_mode
        select_mode: function() {
            this.selection_toolbar.show();
            this.polygon_tools.hide();
            this.ndfi_layer.hide();
        },

        // this function is called when map is loaded
        // and all stuff can start to work.
        // do *NOT* perform any operation over map before this function
        // is called
        start: function() {

            // grid manager
            this.gridstack = new GridStack({
                mapview: this.map,
                el: $("#grid"),
                initial_bounds: this.amazon_bounds,
                report: this.active_report
            });
    

            // bindings
            this.gridstack.grid.bind('enter_cell', function(cell) {
                router.navigate('cell/' +  cell.get('z') + "/" + cell.get('x') + "/" + cell.get('y'));
            });
            router.bind('route:cell', this.to_cell);
            this.gridstack.bind('select_mode', this.select_mode);
            this.gridstack.bind('work_mode', this.work_mode);

            // init interface elements
            this.init_ui();

            this.map.map.setCenter(this.amazon_bounds.getCenter());
            if(location.hash === '') {
                router.navigate('cell/0/0/0');
            }
            Backbone.history.start();
            window.loading.finished();
            console.log(" === App started === ");
        },

        to_cell:function (z, x, y) {
            console.log("t", z, x, y);
            this.gridstack.enter_cell(parseInt(x, 10), parseInt(y, 10), parseInt(z, 10));
        }

    });


    //setup global object to centralize all projection operations
    window.mapper = new Mapper();
    window.loading = new Loading();
    window.app = new IMazon();


});
