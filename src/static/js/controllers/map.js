

// google maps map
var MapView = Backbone.View.extend({
    mapOptions: {
            zoom: 5,
            center: new google.maps.LatLng(-7.409408064269147,-50.00213741352536),
            mapTypeId: google.maps.MapTypeId.TERRAIN,
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            draggableCursor:'default'
    },

    events: {
            'click .layer_editor': 'open_layer_editor',
            'click .zoom_in': 'zoom_in',
            'click .zoom_out': 'zoom_out'
    },
    //el: $("#map"),

    initialize: function() {
        _.bindAll(this, 'center_changed', 'ready', 'click', 'set_center', 'reoder_layers', 'change_layer', 'open_layer_editor', 'zoom_changed', 'zoom_in', 'zoom_out', 'adjustSize', 'set_zoom_silence', 'set_center_silence');
       this.map_layers = {};
       this.map = new google.maps.Map(this.$('.map')[0], this.mapOptions);
       google.maps.event.addListener(this.map, 'center_changed', this.center_changed);
       google.maps.event.addListener(this.map, 'zoom_changed', this.zoom_changed);
       google.maps.event.addListener(this.map, 'click', this.click);
       //google.maps.event.addListener(this.map, 'idle', this.tilesloaded);
       this.projector = new Projector(this.map);
       this.projector.draw = this.ready;
       this.layers = new LayerCollection();
       this.signals_on = true;
    },

    adjustSize: function() {
        google.maps.event.trigger(this.map, "resize");

    },
    hide_controls: function() {
        this.$('.layer_editor').hide();
        this.$('.zoom_control').hide();
    },

    show_controls: function() {
        this.$('.layer_editor').show();
        this.$('.zoom_control').show();
    },

    center_changed: function() {
        if(this.signals_on) {
            this.trigger('center_changed', this.map.getCenter());
        }
    },

    zoom_in: function(e) {
        e.preventDefault();
        this.map.setZoom(this.map.getZoom() + 1);
    },

    zoom_out: function(e) {
        e.preventDefault();
        this.map.setZoom(this.map.getZoom() - 1);
    },
    zoom_changed: function() {
        if(this.signals_on) {
            this.trigger('zoom_changed', this.map.getZoom());
        }
    },

    set_center: function(c, s) {
        this.signals_on = s === undefined? true: s;
        this.map.setCenter(c);
        this.signals_on = true;
    },
    
    set_center_silence: function(c) {
        this.set_center(c, false);
    },

    set_zoom: function(z, s) {
        this.signals_on = s === undefined? true: s;
        this.map.setZoom(z);
        this.signals_on = true;
    },

    set_zoom_silence: function(z) {
        this.set_zoom(z, false);
    },

    click: function(e) {
            this.trigger('click', e);
    },

    open_layer_editor: function(e) {
            e.preventDefault();
            if(this.layer_editor === undefined) {
                this.layer_editor = new LayerEditor({
                    parent: this.el,
                    layers: this.layers
                });
            }

            if(this.layer_editor.showing) {
                this.layer_editor.close();
            } else {
                this.layer_editor.show(this.$('.layer_editor').position());
            }
    },

    // called when map is ready
    // its a helper method to avoid calling getProjection whiout map loaded
    ready: function() {
            this.projector.draw = function(){};
            this.layers.bind('reset', this.reoder_layers);
            this.trigger('ready');
    },

    enable_layer: function(idx) {
    },

    change_layer: function(layer) {
        var self = this;
        if(layer.enabled) {
            if(layer.get('type') === 'fusion_tables') {
                layer.map_layer.setMap(self.map);
            }
            else {
                //self.map.overlayMapTypes.insertAt(layer.map_position, layer.map_layer);
                self.map.overlayMapTypes.insertAt(0, layer.map_layer);
            }
        } else {
            if(layer.get('type') === 'fusion_tables') {
                layer.map_layer.setMap(null);
            } else {
                self.map.overlayMapTypes.removeAt(layer.map_position);
            }
        }
    },

    reoder_layers: function() {
        var self = this;
        //self.map.overlayMapTypes.clear();
        self.layers.each(function(layer, index) {
            var lyr;
            if(layer.map_layer === undefined) {
                lyr = self.create_layer(layer.toJSON());
                layer.map_layer = lyr;
                layer.map_position = index;
                layer.bind('changed', self.change_layer);
            }
            lyr = layer.map_layer;
            if(lyr) {
                if(layer.get('type') === 'fusion_tables') {
                    // fusion tables can't be added as overlayMapTypes
                    if(layer.enabled) {
                        lyr.setMap(self.map);
                    }
                } else {
                    if(layer.enabled) {
                        self.map.overlayMapTypes.setAt(index, lyr);
                    }
                }
            }
        });
    },

    create_layer: function(model_layer) {
        var layer;
        var type = model_layer.type;
        var url = model_layer.url;
        if (type === '') {
          if (url.search('.kml') != -1 || url.search('.kmz') != -1) {
            type = 'kml';
          } else {
            type = 'xyz';
          }
        }

        if (type === 'kml') {
            layer = new google.maps.KmlLayer(url, { suppressInfoWindows: true, preserveViewport:true});
        } else if (type === 'fusion_tables') {
            layer = new google.maps.FusionTablesLayer({
              query: {
                select: model_layer.select,
                from: model_layer.table
              }
            });
        } else { //xyz
            if (url && url.search('{X}') != -1 && url.search('{Z}') != -1 && url.search('{Y}') != -1) {
                  layer = new google.maps.ImageMapType({
                      getTileUrl: function(tile, zoom) {
                        var y = tile.y;
                        console.log("TILINGGG");
                        var tileRange = 1 << zoom;
                        if (y < 0 || y  >= tileRange) {
                          return null;
                        }
                        var x = tile.x;
                        if (x < 0 || x >= tileRange) {
                          x = (x % tileRange + tileRange) % tileRange;
                        }
                        return this.urlPattern.replace("{X}",x).replace("{Y}",y).replace("{Z}",zoom);
                      },
                      tileSize: new google.maps.Size(256, 256),
                      opacity: 1.0,
                      isPng: true,
                      urlPattern:url
               });
            }
        }
        return layer;
    }


});
