
$(function() {

    var EditingToolsRuoter = Backbone.View.extend({

        initialize: function() {
            _.bindAll(this, 'change_state', 'new_polygon', 'reset');
            this.state = 'move';
            this.app = this.options.app;
            this.app.polygon_tools.bind('state', this.change_state);
        },

        new_polygon: function(data) {
            this.app.cell_polygons.polygons.create(data);
            //this.app.cell_polygons.polygons.add(data);
        },

        //reset to initial state
        reset: function() {
            this.app.ndfi_layer.unbind('polygon', this.new_polygon);
            this.app.ndfi_layer.editing_state = false;
            this.app.cell_polygons.editing_state = false;
            this.app.create_polygon_tool.editing_state(false);
            this.app.polygon_tools.polytype.hide();
        },

        change_state: function(st) {
            if(st == this.state) {
                return;
            }
            this.state = st;
            this.reset();
            switch(st) {
                case 'edit':
                    break;
                case 'remove':
                    this.app.cell_polygons.editing_state = true;
                    break;
                case 'draw':
                    this.app.create_polygon_tool.editing_state(true);
                    this.app.polygon_tools.polytype.bind('state', this.app.create_polygon_tool.poly_type);
                    this.app.create_polygon_tool.bind('polygon', this.new_polygon);
                    this.app.polygon_tools.polytype.show();
                    this.app.polygon_tools.polytype.select('def');
                    break;
                case 'auto':
                    this.app.ndfi_layer.bind('polygon', this.new_polygon);
                    this.app.ndfi_layer.editing_state = true;
                    break;
            }
            console.log(st);
        }

    });

    var Loading = Backbone.View.extend({
        el: $("#loading"),

        refcount: 0,

        initialize: function() {
        },

        loading: function(where) {
            this.refcount++;
            this.el.fadeIn();
            //console.log(where);
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

        el: $('body'),


        amazon_bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(-18.47960905583197, -74.0478515625),
            new google.maps.LatLng(5.462895560209557, -43.43994140625)
        ),

        initialize:function() {
            _.bindAll(this, 'to_cell', 'start', 'select_mode', 'work_mode', 'change_report', 'compare_view', 'update_map_layers', 'cell_done', 'go_back', 'open_notes');

            window.loading.loading("Imazon:initialize");
            this.reports = new ReportCollection();
            this.compare_layout = null;

            this.map = new MapView({el: this.$("#main_map")});
            this.map.hide_controls();
            this.cell_polygons = new CellPolygons({mapview: this.map});

            this.reports.bind('reset', this.change_report);
            this.map.bind('ready', this.start);
            this.available_layers = new LayerCollection();
            this.available_layers.bind('reset', this.update_map_layers);
        },

        init_ui: function() {
            this.selection_toolbar = new ReportToolbar();
            this.polygon_tools = new PolygonToolbar();
            this.overview = new Overview();


            this.ndfi_layer = new NDFILayer({mapview: this.map, report: this.active_report});

            this.polygon_tools.ndfi_range.bind('change', this.ndfi_layer.apply_filter);
            this.polygon_tools.compare.bind('state', this.compare_view);
            this.overview.bind('go_back', this.go_back);
            this.overview.bind('open_notes', this.open_notes);

        },
        update_map_layers: function() {
            //update here other maps
        },

        compare_four: function() {
              this.map.el.css({width: '66.66%'});
              this.map.adjustSize();
              this.compare_layout = this.$("#compare_layout_1").show();
              this.compare_maps = [];
              this.compare_maps.push(new MapView({el: this.$("#map1")}));
              this.compare_maps.push(new MapView({el: this.$("#map2")}));
              this.compare_maps.push(new MapView({el: this.$("#map3")}));
        },

        compare_two: function() {
              this.map.el.css({width: '50%'});
              this.map.adjustSize();
              this.compare_layout = this.$("#compare_layout_2").show();
              this.compare_maps = [];
              this.compare_maps.push(new MapView({el: this.$("#map_half")}));
        },


        compare_view: function(compare_type) {
            var self = this;
            if(compare_type !== 'one') {
                if(this.compare_layout !== null) {
                    this.compare_view('one');
                }
                // el gran putiferio
                if(compare_type === 'two') {
                    this.compare_two();
                } else {
                    this.compare_four();
                }
                _.each(this.compare_maps, function(m) {
                    m.map.setZoom(self.map.map.getZoom());
                    m.map.setCenter(self.map.map.getCenter());
                    self.map.bind('center_changed', m.set_center_silence);
                    m.bind('center_changed', self.map.set_center_silence);
                    m.layers.reset(self.available_layers.toJSON());
                    _.each(self.compare_maps, function(other) {
                        if(other !== m) {
                            m.bind('center_changed', other.set_center_silence);
                        }
                    });
                });
            } else {
                this.map.el.css({width: '100%'});
                this.map.adjustSize();
                if(this.compare_layout !== null) {
                    this.compare_layout.hide();
                    this.compare_layout = null;
                }
                _.each(this.compare_maps, function(m) {
                    // unbind!
                    self.map.unbind('center_changed', m.set_center_silence);
                    m.unbind('center_changed', self.map.set_center_silence);
                    _.each(self.compare_maps, function(other) {
                        if(other !== m) {
                            m.unbind('center_changed', other.set_center_silence);
                        }
                    });
                    // flybye!
                    delete m.map;
                    delete m;
                });
                this.compare_maps = [];
            }
        },

        change_report: function() {
            //TODO: use comboxbox to select the active report
            this.active_report = this.reports.models[0];
            this.cell_polygons.polygons.report = this.active_report;
            this.cell_polygons.polygons.fetch();
        },


        // entering on work mode
        work_mode: function(x, y, z) {
            this.selection_toolbar.hide();
            this.polygon_tools.show();
            this.ndfi_layer.show();

            //cell done!
            this.overview.bind('done', this.cell_done);
            this.overview.set_note_count(this.gridstack.current_cell.get('note_count'));
            this.cell_polygons.polygons.x = x;
            this.cell_polygons.polygons.y = y;
            this.cell_polygons.polygons.z = z;
            this.cell_polygons.polygons.fetch();

            this.editing_router = new EditingToolsRuoter({
                app: this
            });
        },

        cell_done: function() {
            this.gridstack.current_cell.set({'done': true});
            this.gridstack.current_cell.save();
            // got to parent cell
            this.go_back();
        },
        
        go_back: function() {
            var p = this.gridstack.current_cell.parent_cell();
            this.to_cell(p.get('z'), p.get('x'), p.get('y'));
            router.navigate('cell/' +  p.get('z') + "/" + p.get('x') + "/" + p.get('y'));
        },

        // entering on select_mode
        select_mode: function() {
            this.compare_view('one');
            this.selection_toolbar.show();
            this.polygon_tools.hide();
            this.ndfi_layer.hide();
            this.overview.select_mode();
            this.cell_polygons.polygons.reset();
            if(this.editing_router) {
                //unbind all
                this.editing_router.reset();
                delete this.editing_router;
            }
        },

        // this function is called when map is loaded
        // and all stuff can start to work.
        // do *NOT* perform any operation over map before this function
        // is called
        start: function() {
            var self = this;

            this.create_polygon_tool = new  PolygonDrawTool({mapview: this.map});

            // grid manager
            this.gridstack = new GridStack({
                mapview: this.map,
                el: $("#grid"),
                initial_bounds: this.amazon_bounds,
                report: this.active_report
            });

            // bindings
            this.gridstack.grid.bind('enter_cell', function(cell) {
                self.overview.on_cell(cell.get('x'), cell.get('y'), cell.get('z'));
                router.navigate('cell/' +  cell.get('z') + "/" + cell.get('x') + "/" + cell.get('y'));
            });
            router.bind('route:cell', this.to_cell);
            this.gridstack.bind('select_mode', this.select_mode);
            this.gridstack.bind('work_mode', this.work_mode);

            // init interface elements
            this.init_ui();

            // init the map
            this.map.map.setCenter(this.amazon_bounds.getCenter());
            this.map.layers.reset(this.available_layers.models);
            // enable layer, amazonas bounds
            this.map.layers.models[0].enabled = true;
            this.map.change_layer(this.map.layers.models[0]);

            if(location.hash === '') {
                router.navigate('cell/0/0/0');
            }
            Backbone.history.start();
            window.loading.finished("Imazon: start");
            console.log(" === App started === ");
        },

        to_cell:function (z, x, y) {
            this.overview.on_cell(x, y, z);
            this.gridstack.enter_cell(parseInt(x, 10), parseInt(y, 10), parseInt(z, 10));
        },
        
        open_notes: function() {
            var notes_dialog = new NotesDialog({
                el: this.$(".mamufas"),
                cell: this.gridstack.current_cell
            });
            notes_dialog.open();
        }


    });

    // avoid cached GET
    $.ajaxSetup({ cache: false });
    //setup global object to centralize all projection operations
    window.mapper = new Mapper();
    window.loading = new Loading();
    window.app = new IMazon();


});
