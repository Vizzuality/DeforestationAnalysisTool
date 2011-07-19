

var NDFILayer = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'canvas_setup', 'filter', 'apply_filter', 'map_auth');
        this.mapview = this.options.mapview;
        this.report = this.options.report;
        this.layer = new CanvasTileLayer(this.canvas_setup, this.filter);
        this.low = 40;
        this.high = 60;
        this.showing = false;

        this.ndfimap = new NDFIMap({report_id: this.report.id});
        this.ndfimap.bind('change', this.map_auth);
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
      $(image).load(function() {
            //ctx.globalAlpha = 0.5;
            ctx.drawImage(image, 0, 0);
            canvas.image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            self.layer.filter_tile(canvas, [self.low, self.high]);
      }).error(function() {
        console.log("server error loading image");
      });
    },

    // filter image canvas based on thresholds
    // and color it
    filter: function(image_data, w, h, low, high) {
        var components = 4; //rgba
        var pixel_pos;
        for(var i=0; i < w; ++i) {
            for(var j=0; j < h; ++j) {
                pixel_pos = (j*w + i) * components;
                var p = image_data[pixel_pos];
                var color = [255, 255, 0];
                if(p < low) {
                    color = [0, 255, 0];
                } else if(p > high) {
                    color = [255, 0, 0];
                }
                image_data[pixel_pos + 0] = color[0];
                image_data[pixel_pos + 1] = color[1];
                image_data[pixel_pos + 2] = color[2];
                if(p > 100) {
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
