
function canvas_setup(canvas, coord, zoom) {
      //console.log(coord.x, coord.y, zoom);
      var image = new Image();  
      var ctx = canvas.getContext('2d');
      image.src = "/tiles/" + zoom + "/"+ coord.x + "/" + coord.y +".png";
      canvas.image = image;
      canvas.coord = coord;
      $(image).load(function() { 
            //ctx.globalAlpha = 0.5;
            ctx.drawImage(image, 0, 0);  
            canvas.image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            App.layer.filter_tile(canvas, [App.threshold.low, App.threshold.high]);
      });
}

function colorize(v) {
    if(v < 50) {
        return [0, 100, 0];
    } else if (v < 80) {
        return [0, 255, 255];
    } else if (v < 123) {
        return [0, 0, 255];
    }
    return [255, 0, 0];
}

function filter(image_data, w, h, low, high) {
    var components = 4; //rgba
    var pixel_pos;
    for(var i=0; i < w; ++i) {
        for(var j=0; j < h; ++j) {
            var pixel_pos = (j*w + i) * components;
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
                image_data[pixel_pos + 3] = 0;
            } else {
                image_data[pixel_pos + 3] = 255;
            }
        }
    }
};

var MapOptions = (function () {
       var map;
       function encode_hash() {
            var ll = map.getCenter();
            location.hash =  ll.lat() + ","+ ll.lng() + "," + map.getZoom();
       }

       function decode_hash() {
            var tk = location.hash.slice(1).split(',');
            if(tk.length >= 3) {
                map.setCenter(new google.maps.LatLng(parseFloat(tk[0]), parseFloat(tk[1])));
                map.setZoom(parseInt(tk[2]));
            }
       }

       function init(m) {
            map = m;
            google.maps.event.addListener(map, 'center_changed', encode_hash);
            google.maps.event.addListener(map, 'zoom_changed', encode_hash);
            decode_hash();
       }
       return init;

})();

var App = function() {

        var me = {
            deforestation_polys: []
        };

        me.init = function(layer) {
            var mapOptions = {
                zoom: 11,
                center: new google.maps.LatLng(-7.409408064269147,-50.00213741352536),
                mapTypeId: google.maps.MapTypeId.SATELLITE
            }
            var map = new google.maps.Map(document.getElementById("map"), mapOptions);
            this.map = map;
            this.layer = new CanvasTileLayer(canvas_setup, filter);
            map.overlayMapTypes.insertAt(0, this.layer);
            this.threshold = {
                low: 60,
                high: 80
            }
            this.setup_ui();
            MapOptions(this.map);
            setup_map();
        }

        function apply_filter(low, high) {
            me.layer.filter_tiles(low, high);
            $("#slider_values").html(low + " - " + high);
        }

        me.setup_ui = function() {
            var that = this;
            $("#slider").slider({
                range: true,
                min: 0,
                max: 100,
                values: [ that.threshold.low,  that.threshold.high],
                slide: function(event, ui) {  
                    that.threshold.low = ui.values[0];
                    that.threshold.high= ui.values[1];
                    apply_filter(that.threshold.low, that.threshold.high);
                }
            });
            
            $("#done").click(function(e) {
                send_polys();
                e.preventDefault();
            });
        }
        // 
        mapCanvasStub = function(map) { this.setMap(map); }
        mapCanvasStub.prototype = new google.maps.OverlayView(); 
        mapCanvasStub.prototype.draw = function() {};
        mapCanvasStub.prototype.transformCoordinates = function(point) {
          return this.getProjection().fromLatLngToContainerPixel(point);
        };
        mapCanvasStub.prototype.untransformCoordinates = function(point) {
          return this.getProjection().fromContainerPixelToLatLng(point);
        };

        
        function create_poly(points) {
            var ll = [];
            var p;
            for(var i in points) {
                p = points[i];
                var l = App.app_canvas.untransformCoordinates(new google.maps.Point(p[0], p[1]))
                ll.push(l);
            }
            var poly = new google.maps.Polygon();
            poly.setPath(ll);
            poly.setMap(App.map);
            return poly;
            
        }
        function setup_map() {
           App.app_canvas = new mapCanvasStub(me.map);
           google.maps.event.addListener(App.map, 'click', function(e) {
                var c = App.layer.composed("#map");
                var point = App.app_canvas.transformCoordinates(e.latLng);
                // rendef offscreen
                var ctx = c.getContext('2d');
                var image_data = ctx.getImageData(0, 0, c.width, c.height);
                var poly = contour(image_data.data, c.width, c.height, point.x, point.y);
            
                var newpoly = create_poly(poly);
                me.deforestation_polys.push(newpoly);
                delete c;
                
           });
        }
        
        function post(url, data) {
            $("#msg").hide();
            $("#sending").show();
            $("#loading").fadeIn();
            $.post(url, data, function(ret) {
                var msg = ret.msg;
                if(msg) {
                    $("#msg").html(msg);
                    $("#sending").hide();
                    $("#msg").show(msg);
                }
                $("#loading").delay(1000).fadeOut();
            }).error(function() {
                $("#loading").fadeOut();
            });
        }

        function send_polys() {
            if(me.deforestation_polys.length > 0) {
                var polys_kml = [];
                _.each(me.deforestation_polys, function(o) {
                    polys_kml.push(o.kml());
                });
                post('/api/v0/poly/new', "polys=" + JSON.stringify(polys_kml));
                me.deforestation_polys = [];

            } else {
                alert("you should select at least one deforested zone");
            }
            
        }

       return me;
 }();

