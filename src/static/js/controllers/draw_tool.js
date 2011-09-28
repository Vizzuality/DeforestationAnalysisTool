/*
 ===========================================
 generic tool for polygon drawing over google maps map
 ===========================================
 
*/
var PolygonDrawTool = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'add_vertex', 'create_polygon', 'reset', 'editing_state', '_add_vertex', 'edit_polygon', 'poly_type');
        this.mapview = this.options.mapview;
        this.map = this.mapview.map;
        this.reset();

        this.image = new google.maps.MarkerImage('/static/img/sprite.png',
                    new google.maps.Size(11, 11),
                    new google.maps.Point(0,52),
                    new google.maps.Point(5, 5)
        );
    },

    editing_state: function(editing) {
        if(editing) {
            this.mapview.bind('click', this.add_vertex);
        } else {
            this.reset();
            this.mapview.unbind('click', this.add_vertex);
        }
    },


    reset: function() {
        var self = this;
        if(this.polyline !== undefined) {
            this.polyline.setMap(null);
            delete this.polyline;
            this.polygon.setMap(null);
            delete this.polygon;
        }
        if(this.markers !== undefined) {
            _.each(this.markers, function(m) {
                m.setMap(null);
            });
        }
        this.markers = [];
        this.vertex = [];
        this.polyline = new google.maps.Polygon({
          path:[],
          //strokeColor: "#DC143C",
          strokeColor: "#FFF",
          strokeOpacity: 1.0,
          fillOpacity: 0.0,
          strokeWeight: 1,
          map: this.map
        });
        this.polygon = new google.maps.Polygon({
          path:[],
          strokeColor: "#DC143C",
          strokeOpacity: 0.8,
          strokeWeight: 0,
          map: this.map
        });

        google.maps.event.addListener(this.polygon, "click", function(e) {
            self.trigger('polygon_click', this.getPath(), e.latLng);
        });

    },

    edit_polygon: function(polygon) {
        var self = this;
        var paths = polygon.paths();
        self.reset();

        _.each(paths, function(path, path_index) {
            _.each(path, function(p, i) {
                var marker = new google.maps.Marker({position:
                    p,
                    map: self.map,
                    icon: self.image,
                    draggable: true,
                    flat : true,
                    raiseOnDrag: false
                });
                marker.path_index = path_index;
                marker.index = i;
                self.markers.push(marker);
                google.maps.event.addListener(marker, "dragstart", function(e) {
                    self.polyline.setPaths(paths);
                    self.polyline.setMap(self.map);
                });
                google.maps.event.addListener(marker, "drag", function(e) {
                    self.polyline.getPath(this.path_index).setAt(this.index, e.latLng);
                });
                google.maps.event.addListener(marker, "dragend", function(e) {
                    polygon.update_pos(this.path_index, 
                        this.index, [e.latLng.lat(), e.latLng.lng()]);
                    polygon.save();
                });

            });
        });

    },

    _add_vertex: function(latLng) {
        var marker = new google.maps.Marker({position:
                latLng,
                map: this.map,
                icon: this.image,
                draggable: false
        });

        marker.index = this.vertex.length;
        this.markers.push(marker);
        this.vertex.push(latLng);
        this.polyline.setPath(this.vertex);
        this.polygon.setPath(this.vertex);
        return marker;
    },

    add_vertex: function(e) {
        var latLng = e.latLng;
        var marker = this._add_vertex(latLng);
        var self = this;
        if (this.vertex.length === 1) {
            google.maps.event.addListener(marker, "click", function() {
                self.create_polygon(self.vertex);
                self.reset();
            });
        }
    },

    create_polygon: function(vertex) {
        var type = Polygon.prototype.DEGRADATION;
        if(this.selected_poly_type === "def") {
            type = Polygon.prototype.DEFORESTATION;
        }
        var v = _.map(vertex, function(p) { return [p.lat(), p.lng()]; });
        this.trigger('polygon', {paths: [v], type: type});
    },

    poly_type: function(type) {
        console.log("selected type", type);
        this.selected_poly_type = type;
    }


});


var PolygonDrawEditTool = PolygonDrawTool.extend({
    initialize: function() {
        this.constructor.__super__.initialize.call(this);
    },

    editing_state: function(editing) {
        if(editing) {
            this.mapview.bind('click', this.add_vertex);
        } else {
            this.reset();
            this.mapview.unbind('click', this.add_vertex);
        }
    },

    _add_vertex: function(latLng) {
        var self = this;
        var marker = new google.maps.Marker({position:
                latLng,
                map: this.map,
                icon: this.image,
                draggable: true,
                flat : true,
                raiseOnDrag: false
        });

        marker.index = this.vertex.length;
        this.markers.push(marker);
        this.vertex.push(latLng);
        this.polyline.setPath(this.vertex);
        this.polygon.setPath(this.vertex);

        google.maps.event.addListener(marker, "drag", function(e) {
            self.polyline.getPath().setAt(this.index, e.latLng);
            self.polygon.getPath().setAt(this.index, e.latLng);
        });
        return marker;
    },

    add_vertex: function(e) {
        var latLng = e.latLng;
        var marker = this._add_vertex(latLng);
    }

});

