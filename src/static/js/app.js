
$(function() {

    var EditingToolsRuoter = Backbone.View.extend({

        initialize: function() {
            _.bindAll(this, 'change_state', 'new_polygon', 'reset', 'polygon_mouseout', 'polygon_mouseover');
            this.state = 'move';
            this.app = this.options.app;
            this.app.polygon_tools.bind('state', this.change_state);
        },

        new_polygon: function(data) {
            //this.app.cell_polygons.polygons.create(data);
            var p = new Polygon(data);
            this.app.cell_polygons.polygons.add(p);
            window.loading_small.loading('saving poly');
            p.save(null, {
                success: function() {
                    window.loading_small.finished('saving poly');
                }
            });
        },

        //reset to initial state
        reset: function() {
            this.app.ndfi_layer.unbind('polygon', this.new_polygon);
            this.app.create_polygon_tool.unbind('polygon', this.new_polygon);
            this.app.ndfi_layer.editing_state = false;
            this.app.cell_polygons.editing_state = false;
            this.app.create_polygon_tool.editing_state(false);
            this.app.polygon_tools.polytype.hide();
            //this.app.map.$("canvas").css('cursor','auto');
            this.app.cell_polygons.unbind('click_on_polygon', this.app.create_polygon_tool.edit_polygon);
            this.app.cell_polygons.unbind('mouseover', this.polygon_mouseover);
            this.app.cell_polygons.unbind('mouseout', this.polygon_mouseout);
            this.app.map.map.setOptions({draggableCursor: 'default'});
        },

        editing_mode: function() {
            this.app.cell_polygons.bind('click_on_polygon', this.app.create_polygon_tool.edit_polygon);
        },

        polygon_mouseout: function() {
            var st = this.state;
            var cursors_pos = {
                'edit': '4 4',
                'auto': '7 7',
                'remove': '6 6',
                'draw': '4 16'
            };
            this.app.map.map.setOptions({draggableCursor: 'url(/static/img/cursor_' + st +'.png) ' + cursors_pos[st] + ', default'});
        },

        polygon_mouseover: function() {
            var st = this.state;
            var cursors_pos = {
                'edit': '4 4',
                'auto': '7 7',
                'remove': '6 6',
                'draw': '4 16'
            };
            $('path').css({cursor: 'url("http://maps.gstatic.com/intl/en_us/mapfiles/openhand_8_8.cur"), default !important'});
        },

        change_state: function(st) {
            if(st == this.state) {
                return;
            }
            this.state = st;
            this.reset();
            this.polygon_mouseout();
            switch(st) {
                case 'edit':
                    this.editing_mode();
                    this.app.cell_polygons.bind('mouseover', this.polygon_mouseover);
                    this.app.cell_polygons.bind('mouseout', this.polygon_mouseout);
                    break;
                case 'remove':
                    this.app.cell_polygons.editing_state = true;
                    this.app.cell_polygons.bind('mouseover', this.polygon_mouseover);
                    this.app.cell_polygons.bind('mouseout', this.polygon_mouseout);
                    break;
                case 'draw':
                    this.app.create_polygon_tool.editing_state(true);
                    this.app.polygon_tools.polytype.bind('state', this.app.create_polygon_tool.poly_type);
                    this.app.create_polygon_tool.bind('polygon', this.new_polygon);
                    this.app.polygon_tools.polytype.show();
                    this.app.polygon_tools.polytype.select('def');
                    break;
                case 'auto':
                    this.app.ndfi_layer.unbind('polygon', this.new_polygon);
                    this.app.ndfi_layer.bind('polygon', this.new_polygon);
                    this.app.ndfi_layer.editing_state = true;
                    //this.app.map.$("canvas").css('cursor','crosshair');
                    break;
            }
            console.log(st);
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
            _.bindAll(this, 'to_cell', 'start', 'select_mode', 'work_mode', 'change_report', 'compare_view', 'update_map_layers', 'cell_done', 'go_back', 'open_notes', 'change_cell', 'close_report', 'open_settings');

            window.loading.loading("Imazon:initialize");
            this.reports = new ReportCollection();
            this.compare_layout = null;

            this.map = new MapView({el: this.$("#main_map")});
            this.cell_polygons = new CellPolygons({mapview: this.map});

            this.reports.bind('reset', this.change_report);
            this.map.bind('ready', this.start);
            this.available_layers = new LayerCollection();
            this.available_layers.bind('reset', this.update_map_layers);
            this.compare_maps_cache = {};
        },

        init_ui: function() {
            this.selection_toolbar = new ReportToolbar({report:this.active_report});
            this.polygon_tools = new PolygonToolbar();
            this.overview = new Overview({report: this.active_report});


            this.ndfi_layer = new NDFILayer({mapview: this.map, report: this.active_report});
    

            this.polygon_tools.ndfi_range.bind('change', this.ndfi_layer.apply_filter);
            // don't change cell model every slider movement, only when the it stops
            this.polygon_tools.ndfi_range.bind('stop', this.change_cell);
            this.polygon_tools.compare.bind('state', this.compare_view);
            this.overview.bind('go_back', this.go_back);
            this.overview.bind('open_notes', this.open_notes);
            this.overview.bind('open_settings', this.open_settings);
            this.overview.bind('done', this.cell_done);
            this.overview.bind('close_report', this.close_report);
            this.user.bind('change:current_cells', this.overview.change_user_cells);
            this.overview.change_user_cells(this.user, this.user.get('current_cells'));
            this.polygon_tools.bind('visibility_change', this.ndfi_layer.class_visibility);

            this.ndfi_layer.bind('map_error', function() {
                show_error("Not enough data available to generate map for this report. After the latest report is generated, map images can take some time to appear.");
            });

        },

        change_cell: function(low, high) {
            var cell = this.gridstack.current_cell;
            cell.set({
                'ndfi_low': low/200.0,
                'ndfi_high': high/200.0
            });
            cell.save();
        },

        update_map_layers: function() {
            //update here other maps
        },

        get_map: function(id, opts) {
            if(this.compare_maps_cache[id] === undefined) {
              this.compare_maps_cache[id] = new MapView({el: this.$(id)});
            }
            return this.compare_maps_cache[id];
        },

        compare_four: function() {
              this.map.el.css({width: '66.66%'});
              this.map.adjustSize();
              this.compare_layout = this.$("#compare_layout_1").show();
              this.compare_maps = [];
              this.compare_maps.push(this.get_map("#map1"));
              this.compare_maps.push(this.get_map("#map2"));
              this.compare_maps.push(this.get_map("#map3"));
        },

        compare_two: function() {
              this.map.el.css({width: '50%'});
              this.map.adjustSize();
              this.compare_layout = this.$("#compare_layout_2").show();
              this.compare_maps = [];
              this.compare_maps.push(this.get_map("#map_half"));              
        },
        
        status_layer_map_save: function(number){
        	var cell = this.gridstack.current_cell;
        	if(number === 'one') {
        		cell.set({'map_one_layer_status':this.status_layer_map(this.map)});
            	cell.save();
            }else  if(number === 'two') {
            	cell.set({'map_one_layer_status':this.status_layer_map(this.map)});
            	var map2 = this.compare_maps[0];
            	cell.set({'map_two_layer_status':this.status_layer_map(map2)});
            	cell.save();
            } else if(number === 'four'){
            	cell.set({'map_one_layer_status':this.status_layer_map(this.map)}); 
            	var map2 = this.compare_maps[0];
            	cell.set({'map_two_layer_status':this.status_layer_map(map2)});
            	map2 = this.compare_maps[1];
            	cell.set({'map_three_layer_status':this.status_layer_map(map2)});
            	map2 = this.compare_maps[2];
            	cell.set({'map_four_layer_status':this.status_layer_map(map2)});
            	cell.save();
            }
        },
        
        get_status_layer_map: function(number){        	       	
        	if(number === 'one') {
        		var cell = this.gridstack.current_cell; 
        		var layers = cell.get('map_one_layer_status');        		
        		while(layers!='*'){
    				var layer = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var flag = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var lay = this.map.layers.get_by_name(layer);
    				if(lay) {
				    	if(flag==='true'){
				    		lay.set_enabled(true);
				    	}else{
				    		lay.set_enabled(false);
				    	}	
				    }
        		}        		
        	}else  if(number === 'two') {   
        		var cell = this.gridstack.current_cell; 
        		var layers = cell.get('map_one_layer_status');        		
        		while(layers!='*'){
    				var layer = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var flag = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var lay = this.map.layers.get_by_name(layer);
				    if(lay) {
				    	if(flag==='true'){
				    		lay.set_enabled(true);
				    	}else{
				    		lay.set_enabled(false);
				    	}	
				    }
        		}        		
        		layers = "";
        		layers = cell.get('map_two_layer_status');
        		var map2 = this.compare_maps[0];
        		while(layers!='*'){
    				var layer = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var flag = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var lay = map2.layers.get_by_name(layer);
    				if(lay) {
				    	if(flag==='true'){
				    		lay.set_enabled(true);
				    	}else{
				    		lay.set_enabled(false);
				    	}	
				    }
        		}            	
        	} else if(number === 'four'){
        		var cell = this.gridstack.current_cell; 
        		var layers = cell.get('map_one_layer_status');
        		while(layers!='*'){
    				var layer = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var flag = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var lay = this.map.layers.get_by_name(layer);
    				if(lay) {
				    	if(flag==='true'){
				    		lay.set_enabled(true);
				    	}else{
				    		lay.set_enabled(false);
				    	}	
				    }
        		}
        		layers = "";
        		layers = cell.get('map_two_layer_status');
        		var map2 = this.compare_maps[0];
        		while(layers!='*'){
    				var layer = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var flag = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var lay = map2.layers.get_by_name(layer);
    				if(lay) {
				    	if(flag==='true'){
				    		lay.set_enabled(true);
				    	}else{
				    		lay.set_enabled(false);
				    	}	
				    }
        		}
        		layers = "";
        		layers = cell.get('map_three_layer_status');
        		var map2 = this.compare_maps[1];
        		while(layers!='*'){
    				var layer = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var flag = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var lay = map2.layers.get_by_name(layer);
    				if(lay) {
				    	if(flag==='true'){
				    		lay.set_enabled(true);
				    	}else{
				    		lay.set_enabled(false);
				    	}	
				    }
        		} 
        		layers = "";
        		layers = cell.get('map_four_layer_status');
        		var map2 = this.compare_maps[2];
        		while(layers!='*'){
    				var layer = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var flag = layers.slice(layers.indexOf("\"")+1,layers.indexOf("\","));
    				layers = layers.slice(layers.indexOf(",")+1);
    				var lay = map2.layers.get_by_name(layer);
    				if(lay) {
				    	if(flag==='true'){
				    		lay.set_enabled(true);
				    	}else{
				    		lay.set_enabled(false);
				    	}	
				    }
        		}
        	}
        },
        
        status_layer_map: function(map_name){
        	// enable layer, amazonas bounds
        	/*
        	 * id{1} name{Brazil Legal Amazon}
        	 * id{2} name{Brazil Municipalities Public}
        	 * id{3} name{Brazil States Public}
        	 * id{4} name{Brazil Federal Conservation Unit Public}
        	 * id{5} name{Brazil State Conservation Unit Public}
        	 * id{6} name{Terrain} this's not saving
        	 * id{7} name{Satellite} this's not saving
        	 * id{8} name{Hybrid} this's not saving
        	 * id{9} name{Roadmap} this's not saving
        	 * id{9affcec73a8b645dc4974ff4da8830f0} name{LANDSAT/L7_L1T}
        	 * id{f69b3bb6add9276eef4d0ab158de74e8} name{NDFI T0}
        	 * id{?} name{True color RGB141}
        	 * id{?} name{False color RGB421}
        	 * id{?} name{F color infrared RGB214}
        	 * 
        	 */ 
        	var arraylayer = new Array("Brazil Legal Amazon","Brazil Municipalities Public","Brazil States Public","Brazil Federal Conservation Unit Public",
        			"Brazil State Conservation Unit Public","LANDSAT/L7_L1T","SMA","RGB","NDFI T0","NDFI T1","NDFI analysis","True color RGB141","False color RGB421",
        			"F color infrared RGB214","Validated polygons");
        	var save_status_layer="";
        	for(var num=0; num<arraylayer.length;num++){
	            var lay = map_name.layers.get_by_name(arraylayer[num]);
	            if(lay) {
	                if(lay.get_enabled()){
	                	if(num==(arraylayer.length-1)){
	                		save_status_layer += "\""+arraylayer[num]+"\",\""+lay.get_enabled()+"\",*";
	                	}else{
	                		save_status_layer += "\""+arraylayer[num]+"\",\""+lay.get_enabled()+"\",";
	                	}
	                }else{
	                	if(num==(arraylayer.length-1)){
	                		save_status_layer += "\""+arraylayer[num]+"\",\""+lay.get_enabled()+"\",*";
	                	}else{
	                		save_status_layer += "\""+arraylayer[num]+"\",\""+lay.get_enabled()+"\",";
	                	}                	
	                }
	            }
        	}
        	return save_status_layer;
        },

        compare_view_save: function(num) {
        	var cell = this.gridstack.current_cell;
        	cell.set({'compare_view':num});
        	cell.save();
        },	
        
        compare_view: function(compare_type) {
            var self = this;
            var compare_type_view = compare_type;
            this.map.close_layer_editor();
            if(compare_type !== 'one') {
                
                if(this.compare_layout !== null) {
                    this.compare_view('one');
                    this.compare_view_save('one');
                }
                // el gran putiferio
                if(compare_type === 'two') {
                    this.compare_two();	
                    this.compare_view_save('two');
                } else {
                    this.compare_four();
                    this.compare_view_save('four');
                }
                this.map.crosshair(true);
                _.each(this.compare_maps, function(m) {
                    m.map.setZoom(self.map.map.getZoom());
                    m.map.setCenter(self.map.map.getCenter());
                    self.map.bind('center_changed', m.set_center_silence);
                    self.map.bind('click', m.close_layer_editor);
                    self.map.bind('open_layer_editor', m.close_layer_editor);
                    m.bind('center_changed', self.map.set_center_silence);
                    m.bind('click', self.map.close_layer_editor);
                    m.bind('open_layer_editor', self.map.close_layer_editor);
                    m.layers.reset(self.available_layers.toJSON());
                    m.crosshair(true);
                    // add rgb layers
                    add_rgb_layers(m.layers, self.gridstack, self.active_report.get('id'));
                    m.layers.trigger('reset');
                    _.each(self.compare_maps, function(other) {
                        if(other !== m) {
                            m.bind('center_changed', other.set_center_silence);
                            m.bind('click', other.close_layer_editor);
                            m.bind('open_layer_editor', other.close_layer_editor);
                        }
                    });
                });
            } else {
            	this.compare_view_save('one');
                //restore
                this.map.el.css({width: '100%'});
                this.map.adjustSize();
                this.map.crosshair(false);
                if(this.compare_layout !== null) {
                    this.compare_layout.hide();
                    this.compare_layout = null;
                }
                _.each(this.compare_maps, function(m) {
                    // unbind!
                    self.map.unbind('center_changed', m.set_center_silence);
                    m.unbind('center_changed', self.map.set_center_silence);
                    self.map.unbind('click', m.close_layer_editor);
                    m.unbind('click', self.map.close_layer_editor);
                    self.map.unbind('open_layer_editor', m.close_layer_editor);
                    m.unbind('open_layer_editor', self.map.close_layer_editor);
                    unbind_rgb_layers(m.layers, self.gridstack);
                    _.each(self.compare_maps, function(other) {
                        if(other !== m) {
                            m.unbind('center_changed', other.set_center_silence);
                            m.unbind('click', other.close_layer_editor);
                            m.unbind('open_layer_editor', other.close_layer_editor);
                        }
                    });
                });
                this.compare_maps = [];
            }
        },

        change_report: function() {
            this.active_report = this.reports.models[0];
            this.cell_polygons.polygons.report = this.active_report;
            this.cell_polygons.polygons.fetch();
        },


        // entering on work mode
        work_mode: function(x, y, z) {
            this.selection_toolbar.hide();
            this.polygon_tools.show();
            this.ndfi_layer.show();
            this.map.show_zoom_control();
            this.map.show_layers_control();

            //update slider with current cell values
            var cell = this.gridstack.current_cell;
            this.polygon_tools.ndfi_range.set_values(cell.get('ndfi_low'), cell.get('ndfi_high'));
            this.compare_view(cell.get('compare_view'));
            //cell done!
            this.overview.set_note_count(this.gridstack.current_cell.get('note_count'));
            this.overview.set_ndfi(this.gridstack.current_cell.get('ndfi_change_value'));
            this.cell_polygons.polygons.x = x;
            this.cell_polygons.polygons.y = y;
            this.cell_polygons.polygons.z = z;
            this.cell_polygons.polygons.fetch();

            this.editing_router = new EditingToolsRuoter({
                app: this
            });
            this.get_status_layer_map(cell.get('compare_view'));
        },

        cell_done: function() {
            var cell = this.gridstack.current_cell;
            if(!cell.get('done')) {
                this.user.inc_cells();
            }
            cell.set({'done': true});
            cell.save();
            // got to parent cell
            this.go_back();
            // cells count must be updated
            this.active_report.fetch();
        },

        go_back: function() {  
        	//alert(this.status_layer_map(this.map)); 
        	console.log(this.compare_type_view);
        	this.status_layer_map_save(this.compare_type_view);
        	//this.status_layer_map_save('two');
        	//this.get_status_layer_map('one');
            var p = this.gridstack.current_cell.parent_cell();
            this.to_cell(p.get('z'), p.get('x'), p.get('y'));
            router.navigate('cell/' +  p.get('z') + "/" + p.get('x') + "/" + p.get('y'));
        },

        // entering on select_mode
        select_mode: function() {
            this.map.hide_zoom_control();
            this.compare_view('one');
            this.selection_toolbar.show();
            this.polygon_tools.hide();
            this.ndfi_layer.hide();
            this.overview.select_mode();
            this.cell_polygons.polygons.reset();
            if(this.editing_router) {
                //unbind all
                this.editing_router.reset();
                this.polygon_tools.reset();
                delete this.editing_router;
            }
        },

        // this function is called when map is loaded
        // and all stuff can start to work.
        // do *NOT* perform any operation over map before this function
        // is called
        start: function() {
            var self = this;

            this.map.hide_controls();
            this.map.show_layers_control();

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

            add_rgb_layers(this.map.layers, this.gridstack, this.active_report.get('id'));
            this.map.layers.trigger('reset');

            // enable layer, amazonas bounds
            var lay = this.map.layers.get_by_name('Brazil Legal Amazon');
            if(lay) {
                lay.set_enabled(true);
            }
            // enable layer, rgb
            lay = this.map.layers.get_by_name('rgb');
            if(lay) {
                lay.set_enabled(true);
            }
            // add a layer to control polygon showing
            var polygons = new LayerModel({
                  id: 'polygons',
                  type: 'fake',
                  description: 'Validated polygons'
            });
            polygons.set_enabled(true);
            polygons.bind('change', function(layer) {
                self.cell_polygons.show_polygons(layer.enabled);
            });
            this.map.layers.add(polygons);

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
            var self = this;
            if(self.notes_dialog === undefined) {
                self.notes_dialog = new NotesDialog({
                    el: this.$(".mamufas"),
                    cell: this.gridstack.current_cell
                });
                self.notes_dialog.notes.bind('add', function(note, notes) {
                    self.overview.set_note_count(notes.models.length);
                });
            } else {
                self.notes_dialog.set_cell(this.gridstack.current_cell);
            }
            self.notes_dialog.open();
        },

        open_settings: function() {
            var self = this;
            if(self.settings_dialog === undefined) {
                self.settings_dialog = new UsersDialog();
            }
            self.settings_dialog.open();
        },

        close_report: function() {
            window.loading.loading();
            $.ajax({
              type: 'POST',
              url: '/api/v0/report/' + this.active_report.get('id') + "/close",
              success: function() {
                window.location.reload();
              },
              error: function() {
                show_error('There was a problem closing report, try it later');
                window.loading.finished();
              }
            });

        }


    });

    window.loading = new Loading();
    window.loading_small = new LoadingSmall();
    var bb_sync = Backbone.sync;
    // avoid cached GET
    /*Backbone.sync = function(method, model, options) {
        window.loading_small.loading();
        var s = options.success;
        var e = options.error;
        var success = function(resp, status, xhr) {
            window.loading_small.finished();
            if(s) {
                s(resp, status, xhr);
            }
        };
        var error = function(resp, status, xhr) {
            window.loading_small.finished();
            if(e) {
                e.error(resp, status, xhr);
            }
        };
        options.success = success;
        options.error = error;
        bb_sync(method, model, options);
    };*/

    $.ajaxSetup({ cache: false });
    // some error tracking
    window.onerror = function(m, u, l) {
        $.post("/error_track", { 
            msg: m,
            url: u,
            line: l
        });
    };

    //setup global object to centralize all projection operations
    window.mapper = new Mapper();
    window.app = new IMazon();


});
