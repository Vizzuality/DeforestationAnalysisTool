
function canvas_setup(canvas, coord, zoom) {
      console.log(coord.x, coord.y, zoom);
      var image = new Image();  
      var ctx = canvas.getContext('2d');
      image.src = "static/map/z" + zoom + "/"+ coord.x + "/" + coord.y +".png";
      canvas.image = image;
      canvas.coord = coord;
      $(image).load(function() { 
            //ctx.globalAlpha = 0.5;
            ctx.drawImage(image, 0, 0);  
            canvas.image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            App.heightLayer.filter_tile(canvas, [App.threshold]);
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

function filter(image_data, w, h, threshold) {
    var components = 4; //rgba
    var pixel_pos;
    for(var i=0; i < w; ++i) {
        for(var j=0; j < h; ++j) {
            var pixel_pos = (j*w + i) * components;
            if(image_data[pixel_pos] <= threshold) {
                image_data[pixel_pos + 3] = 0;
            } else {
                var col = colorize(image_data[pixel_pos] - 100);
                image_data[pixel_pos] = col[0];
                image_data[pixel_pos + 1] = col[1];
                image_data[pixel_pos + 2] = col[2];
                image_data[pixel_pos + 3] = 255;//image_data[pixel_pos];
            }
        }
    }
};


var App = function() {

        var me = {};

        me.init = function(layer) {
            var mapOptions = {
                zoom: 3,
                center: new google.maps.LatLng(41.850033,-87.6500523),
                mapTypeId: google.maps.MapTypeId.ROADMAP
            }
            var map = new google.maps.Map(document.getElementById("map"), mapOptions);
            this.map = map;
            this.layer = new CanvasTileLayer(canvas_setup, filter);
            map.overlayMapTypes.insertAt(0, this.layer);
            this.setup_ui();
       
        }

        me.setup_ui = function() {
            var that = this;
            $("#slider").slider({
                slide: function(event, ui) {  
                    that.layer.filter_tiles(ui.value*256.0/100.0);
                }
            });
        }
        return me;
 }();

