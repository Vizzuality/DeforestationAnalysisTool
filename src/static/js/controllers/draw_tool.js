

var PolygonDrawTool = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'add_vertex', 'create_polygon', 'reset', 'editing_state');
        this.mapview = this.options.mapview;
        this.map = this.mapview.map;
        this.reset();
    },

    editing_state: function(editing) {
        if(editing) {
            this.mapview.bind('click', this.add_vertex);
        } else {
            this.mapview.unbind('click', this.add_vertex);
        }
    },

    reset: function() {
        if(this.polyline !== undefined) {
            this.polyline.setMap(null);
            delete this.polyline;
        }
        if(this.markers !== undefined) {
            _.each(this.markers, function(m) {
                m.setMap(null);
            });
        }
        this.markers = [];
        this.vertex = [];
        this.polyline = new google.maps.Polyline({
          path:[],
          strokeColor: "#DC143C",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          map: this.map
        });
    },

    add_vertex: function(e) {
        var latLng = e.latLng;
        var self = this;

        var image = new google.maps.MarkerImage('/static/img/sprite.png',
                    new google.maps.Size(11, 11),
                    new google.maps.Point(0,52),
                    new google.maps.Point(5, 5)
        );

        var marker = new google.maps.Marker({position:
                latLng,
                map: this.map,
                icon: image});

        this.markers.push(marker);

        if (this.vertex.length === 0) {
            google.maps.event.addListener(marker, "dblclick", function() {
                self.create_polygon(self.vertex);
                self.reset();
            });
        }
        this.vertex.push(latLng);
        this.polyline.setPath(this.vertex);
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
