
function canvas_setup(canvas, coord, zoom) {
      if (zoom != 12) {
        return;
      }
      var image = new Image();
      var ctx = canvas.getContext('2d');
      var token = "b50ffb43564bfa6dffb5dba524750e7c";
      var mapid = "90b0dacb31e53042a8e1f396b771f235";
    
      image.src = "/ee/tiles/" + mapid + "/"+ zoom + "/"+ coord.x + "/" + coord.y +"?token=" + token;
      canvas.image = image;
      canvas.coord = coord;
      $(image).load(function() {
            //ctx.globalAlpha = 0.5;
            ctx.drawImage(image, 0, 0);
            canvas.image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            App.layer.filter_tile(canvas, [App.threshold.low, App.threshold.high]);
      }).error(function() {
        console.log("server error loading image");
      });
}

/// filter image canvas based on thresholds
/// and color it
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
                image_data[pixel_pos + 0] = 0;
                image_data[pixel_pos + 1] = 0;
                image_data[pixel_pos + 2] = 0;
                image_data[pixel_pos + 3] = 150;
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

        // model
        var DEGRADATION = 0;
        var DEFORESTATION = 1;
        var selected_polygon_type = DEFORESTATION;
        var inner_poly_sensibility = 8;
        var me = {
            deforestation_polys: [],
        };

        me.init = function(layer) {
            var mapOptions = {
                zoom: 5, //11,
                center: new google.maps.LatLng(-7.409408064269147,-50.00213741352536),
                mapTypeId: google.maps.MapTypeId.SATELLITE,
                disableDefaultUI: true,
                disableDoubleClickZoom: true,
                draggableCursor:'default'
            }
            var map = new google.maps.Map(document.getElementById("map"), mapOptions);
            this.map = map;
            this.layer = new CanvasTileLayer(canvas_setup, filter);
            map.overlayMapTypes.insertAt(0, this.layer);
            me.grid = new GridOverlay(map);
            me.grid.on_select_cell = function(level, coord) {
                $("#youarein").html(level + "/" + coord.x + "/" + coord.y);
            }
            this.threshold = {
                low: 40,
                high: 60
            }

            this.setup_ui();
            //MapOptions(this.map);
            setup_map();

            /*var marker = new google.maps.Marker({
                  position: new google.maps.LatLng(-18.47960905583197, -74.0478515625),
                  map: map,
                  title:"Hello World!"
            });
            marker = new google.maps.Marker({
                  position: new google.maps.LatLng(5.462895560209557, -43.43994140625),
                  map: map,
                  title:"Hello World!"
            });*/
            marker = new google.maps.Marker({
                  position: new google.maps.LatLng(-7.409408064269147,-50.00213741352536),
                  map: map,
                  title:"Hello World!"
            });
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
                max: 200,
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

            $("#degradation").click(function(e) {
                $("#deforestation").removeClass('selected');
                $(this).addClass('selected');
                e.preventDefault();

                selected_polygon_type = DEGRADATION;
            });

            $("#deforestation").click(function(e) {
                $("#degradation").removeClass('selected');
                $(this).addClass('selected');
                e.preventDefault();

                selected_polygon_type = DEFORESTATION;
            });


            $("#back").click(function(e) {
                me.grid.pop();
                e.preventDefault();
            });

            $("#inner_slider").slider({
                value: 75,
                min: 0,
                max: 100,
                slide: function(event, ui) {
                    var s = 100 - ui.value;
                    inner_poly_sensibility = 1 + 30*s/100.0;
                    console.log(inner_poly_sensibility);
                    $("#inner_slider_value").html(inner_poly_sensibility);
                }
            });
        }
        function create_poly(points, inners) {
            var paths = []

            // pixel -> latlon
            function unproject(p) {
                return App.app_canvas.untransformCoordinates(
                    new google.maps.Point(p[0], p[1])
                );
            }
            // outer path
            paths.push(_.map(points, unproject));

            // inner paths (reversed)
            _.each(inners, function(p) {
                paths.push(_.map(p.reverse(), unproject));
            });
            //inners && console.log(inners.length);

            var poly = new google.maps.Polygon({
                paths: paths,
                strokeWeight: 1
            })
            poly.setMap(App.map);
            return poly;

        }
        
        function setup_map() {
           /*$("#canvas_test").click(function() {
                var c = App.layer.composed("#map");
                var cn = document.getElementById('canvas_test');
                var ctx = cn.getContext('2d');
                cn.width = ctx.width = c.width;
                cn.height = ctx.height = c.height;
                //ctx.globalAlpha = 0.5;
                ctx.drawImage(c, 0, 0);
                console.log("canvas");
           });*/
           App.app_canvas = new Projector(me.map);
           google.maps.event.addListener(App.map, 'click', function(e) {
                if (App.map.getZoom() != 12)
                    return;
                var c = App.layer.composed("#map");
                var point = App.app_canvas.transformCoordinates(e.latLng);

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
                // if isn't a solid color can't be picked
                if(color[3] != 255) {
                    return;
                }

                var poly = contour(image_data.data, c.width, c.height, point.x, point.y);

                var inners = inner_polygons(image_data.data,
                         c.width, c.height, poly, color);

                // discard small polys
                inners = _.select(inners, function(p){ return p.length > inner_poly_sensibility; });

                var newpoly = create_poly(poly, inners);
                newpoly.type = selected_polygon_type;
                me.deforestation_polys.push(newpoly);
                (function(newpoly) {
                    google.maps.event.addListener(newpoly, 'click', function(event) {
                        var infowindow = new google.maps.InfoWindow();
                        infowindow.setContent(newpoly.type == 1 ? "deforestation":"degradation");
                        infowindow.setPosition(event.latLng);
                        infowindow.open(App.map);
                    })
                })(newpoly);
                delete image_data;
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
                var polys = [];
                _.each(me.deforestation_polys, function(o) {
                    polys.push({
                        geom: o.kml(),
                        type: o.type
                    });
                });
                post('/api/v0/poly/new', "polys=" + JSON.stringify(polys));
                me.deforestation_polys = [];

            } else {
                alert("you should select at least one deforested zone");
            }

        }

       return me;
 }();

