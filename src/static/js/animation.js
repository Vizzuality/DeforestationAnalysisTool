
var loader = new Loading();

var Map = Backbone.View.extend({
    mapOptions: {
            zoom: 6,
            center: new google.maps.LatLng(39.48, -4.42),

            mapTypeId: google.maps.MapTypeId.TERRAIN,
            disableDefaultUI: true,
            disableDoubleClickZoom: true,
            draggableCursor:'default',
            scrollwheel: false,
            mapTypeControl: true
    },

    el: $("#map"),

    initialize: function() {
       this.map = new google.maps.Map(this.el[0], this.mapOptions);
    }

});

var DeforestationMovie = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'canvas_setup', 'filter', 'set_time');
        this.mapview = this.options.mapview;
        this.layer = new CanvasTileLayer(this.canvas_setup, this.filter);
        this.mapview.map.overlayMapTypes.setAt(0, this.layer);
        this.month = 0;
    },

    set_time: function(month) {
        this.layer.filter_tiles(month);
        this.month = month;
    },

    canvas_setup: function (canvas, coord, zoom) {
      var url = "/proxy/mountainbiodiversity.org/env/z" + zoom + "/"+ coord.x + "/" + coord.y +".png";
      var self = this;
      var image = new Image();
      image.src = url;
      canvas.image = image;
      canvas.coord = coord;
      var ctx = canvas.getContext('2d');
      $(image).load(function() {
            ctx.drawImage(image, 0, 0);
            canvas.image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            self.layer.filter_tile(canvas, [self.month]);
      }).error(function() {
            console.log("server error loading image");
      });
    },

    filter: function(image_data, w, h, month) {
        var components = 4; //rgba
        var pixel_pos;
        for(var i=0; i < w; ++i) {
            for(var j=0; j < h; ++j) {
                pixel_pos = (j*w + i) * components;
                var p = image_data[pixel_pos];
                var a = image_data[pixel_pos + 3];
                if(a > 0) {
                    if(p > month) {
                        image_data[pixel_pos + 0] = 100;
                        image_data[pixel_pos + 1] = 100;
                        image_data[pixel_pos + 2] = 100;
                        image_data[pixel_pos + 3] = 0;
                    } else {
                        image_data[pixel_pos + 0] = 100;
                        image_data[pixel_pos + 1] = 100;
                        image_data[pixel_pos + 2] = 100;
                        image_data[pixel_pos + 3] = 100;
                    }
                }
            }
        }
    }

});

var Control = Backbone.View.extend({

    el: $('#control'),

    events: {
        'click #play': 'play_pause'
    },

    initialize: function() {
        _.bindAll(this, 'slide', 'play_pause', 'set_time');
        var self = this;
        this.timeline = this.$("#timeline").slider({
            min: 0,
            max: 255,
            value: 0,
            slide: function(event, ui) {
                    var month = ui.value;
                    self.slide(month);
            }
        });
        this.playing = false;
        this.play = this.$('#play');
        this.time = this.$('#time');
        this.set_time(0); 
    },

    slide: function(month) {
        this.month = month;
        this.trigger('time', month);
    },

    set_time: function(month) {
        this.slide(month);
        this.timeline.slider( "value" , [month]);
        this.time.html(this.month%12 + "/" + (2010 + Math.floor(this.month/12) + 1));
    },

    play_pause: function() {
        var self = this;
        this.playing = !this.playing;
        if(this.playing) {
            this.play.html('pause');
            this.timer = setInterval(function() {
                if(self.month >= 255) {
                    self.play_pause();
                } else {
                    self.set_time(self.month + 1);
                }
            }, 200);
        } else {
            this.play.html('play');
            clearInterval(this.timer);
        }
    }

});

var Vizzualization = Backbone.View.extend({

    initialize: function() {
        loader.loading('Vizzualization::initialize', 'loading data');
        this.load_map();
    },

    load_map: function() {
        this.map = new Map();
        this.movie = new DeforestationMovie({mapview: this.map});
        this.control = new Control();
    
        //binds
        this.control.bind('time', this.movie.set_time);
        loader.finished('Vizzualization::initialize');
    }

});
