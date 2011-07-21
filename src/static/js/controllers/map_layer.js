
function is_color(col1, col2) {
    return col1[0] == col2[0] && 
            col1[1] == col2[1] &&
            col1[2] == col2[2];
}

var NDFILayer = Backbone.View.extend({

    DEFORESTATION_COLOR: [248, 8, 8],
    DEGRADATION_COLOR: [247, 119, 87],
    FOREST_COLOR: [32, 224, 32],
    NDFI_ENCODING_LIMIT: 200,

    initialize: function() {
        _.bindAll(this, 'canvas_setup', 'filter', 'apply_filter', 'map_auth', 'click');
        this.mapview = this.options.mapview;
        this.report = this.options.report;
        this.layer = new CanvasTileLayer(this.canvas_setup, this.filter);
        this.low = 40;
        this.high = 60;
        this.showing = false;
        this.inner_poly_sensibility = 10;

        this.ndfimap = new NDFIMap({report_id: this.report.id});
        this.ndfimap.bind('change', this.map_auth);
        this.mapview.bind('click', this.click);
        this.ndfimap.fetch();
        console.log(" === NDFI layer created === ");
    },

    map_auth: function() {
        this.token = this.ndfimap.get('token');
        this.mapid = this.ndfimap.get('mapid');
        // reload tiles
        if(this.showing) {
            this.hide();
            this.show();
        }
    },
    

    click: function(e) {
        var self = this;
        var c = this.layer.composed(this.mapview.el[0]);
        var point = this.mapview.projector.transformCoordinates(e.latLng);

        // rendef offscreen
        var ctx = c.getContext('2d');
        var image_data = ctx.getImageData(0, 0, c.width, c.height);


        // get pixel color
        var pixel_pos = (point.y*c.width + point.x) * 4;
        var color = [];
        color[0] = image_data.data[pixel_pos + 0];
        color[1] = image_data.data[pixel_pos + 1];
        color[2] = image_data.data[pixel_pos + 2];
        color[3] = image_data.data[pixel_pos + 3];
        var deg = is_color(color, this.DEFORESTATION_COLOR);
        var def = is_color(color, this.DEGRADATION_COLOR);
        if(!deg && !def) {
            return;
        }

        var poly = contour(image_data.data, c.width, c.height, point.x, point.y);

        var inners = inner_polygons(image_data.data,
                 c.width, c.height, poly, color);

        // discard small polys
        inners = _.select(inners, function(p){ return p.length > self.inner_poly_sensibility; });

        var newpoly = this.create_poly(poly, inners);
        console.log(newpoly);
        //TODO: inner rings
        this.trigger('polygon', {paths: newpoly, type: 0});

        delete image_data;
        delete c;
    },

    create_poly: function(points, inners) {
            var self = this;
            var paths = [];

            // pixel -> latlon
            function unproject(p) {
                var ll = self.mapview.projector.untransformCoordinates(
                    new google.maps.Point(p[0], p[1])
                );
                return [ll.lat(), ll.lng()];
            }
            // outer path
            paths.push(_.map(points, unproject));

            // inner paths (reversed)
            _.each(inners, function(p) {
                paths.push(_.map(p.reverse(), unproject));
            });

            return paths;
            //inners && console.log(inners.length);

            /*
            var poly = new google.maps.Polygon({
                paths: paths,
                strokeWeight: 1
            })
            poly.setMap(App.map);
            return poly;
            */

    },

    show: function() {
        this.showing = true;
        if(this.token) {
            this.mapview.map.overlayMapTypes.insertAt(0, this.layer);
            console.log("showing NDFI");
        }
    },

    hide: function() {
        this.showing = false;
        if(this.mapview.map.overlayMapTypes.get(0)) {
            this.mapview.map.overlayMapTypes.removeAt(0);
        }
    },

    apply_filter: function(low, high) {
        this.low = low;
        this.high = high;
        this.layer.filter_tiles(low, high);
    },

    canvas_setup: function (canvas, coord, zoom) {
      var self = this;
      if (zoom != 12) {
        return;
      }
      var image = new Image();
      var ctx = canvas.getContext('2d');
      image.src = "/ee/tiles/" + this.mapid + "/"+ zoom + "/"+ coord.x + "/" + coord.y +"?token=" + this.token;
      canvas.image = image;
      canvas.coord = coord;
      window.loading.loading();
      $(image).load(function() {
            //ctx.globalAlpha = 0.5;
            ctx.drawImage(image, 0, 0);
            canvas.image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            self.layer.filter_tile(canvas, [self.low, self.high]);
            window.loading.finished();
      }).error(function() {
            console.log("server error loading image");
            window.loading.finished();
      });
    },

    // filter image canvas based on thresholds
    // and color it
    filter: function(image_data, w, h, low, high) {
        var components = 4; //rgba

        // yes, this variables are the same as declared on this view
        // this is because javascript looks like optimize if
        // variables are local and a constant
        var NDFI_ENCODING_LIMIT = this.NDFI_ENCODING_LIMIT;
        var DEFORESTATION_COLOR= [248, 8, 8];
        var DEGRADATION_COLOR= [247, 119, 87];
        var FOREST_COLOR= [32, 224, 32];

        var pixel_pos;
        for(var i=0; i < w; ++i) {
            for(var j=0; j < h; ++j) {
                pixel_pos = (j*w + i) * components;
                var p = image_data[pixel_pos];
                // there is a better way to do this but is more fast 
                if(p < low) {
                    image_data[pixel_pos + 0] = FOREST_COLOR[0];
                    image_data[pixel_pos + 1] = FOREST_COLOR[1];
                    image_data[pixel_pos + 2] = FOREST_COLOR[2];
                } else if(p > high) {
                    image_data[pixel_pos + 0] = DEFORESTATION_COLOR[0];
                    image_data[pixel_pos + 1] = DEFORESTATION_COLOR[1];
                    image_data[pixel_pos + 2] = DEFORESTATION_COLOR[2];
                } else {
                    image_data[pixel_pos + 0] = DEGRADATION_COLOR[0];
                    image_data[pixel_pos + 1] = DEGRADATION_COLOR[1];
                    image_data[pixel_pos + 2] = DEGRADATION_COLOR[2];
                }

                if(p > NDFI_ENCODING_LIMIT) {
                    image_data[pixel_pos + 0] = 0;
                    image_data[pixel_pos + 1] = 0;
                    image_data[pixel_pos + 2] = 0;
                    image_data[pixel_pos + 3] = 150;
                } else {
                    image_data[pixel_pos + 3] = 255;
                }
            }
        }
    }

});
