

/**
 * flood fill algorithm 
 * image_data is an array with pixel information as provided in canvas_context.data
 * (x, y) is starting point and color is the color used to replace old color
 */
function flood_fill(image_data, canvas_width, canvas_height, x, y, color) {

    var components = 4; //rgba

    // unpack values
    var  fillColorR = color[0];
    var  fillColorG = color[1];
    var  fillColorB = color[2];

    // get start point
    var pixel_pos = (y*canvas_width + x) * components;
    var startR = image_data[pixel_pos];
    var startG = image_data[pixel_pos + 1];
    var startB = image_data[pixel_pos + 2];

    function matchStartColor(pixel_pos) {
      return startR == image_data[pixel_pos] && 
             startG == image_data[pixel_pos+1] &&
             startB == image_data[pixel_pos+2];
    }

    function colorPixel(pixel_pos) {
      image_data[pixel_pos] = fillColorR;
      image_data[pixel_pos+1] = fillColorG;
      image_data[pixel_pos+2] = fillColorB;
      image_data[pixel_pos+3] = 255;
    }

    var pixelStack = [[x, y]];

    while(pixelStack.length)
    {
      var newPos, x, y, pixel_pos, reachLeft, reachRight;
      newPos = pixelStack.pop();
      x = newPos[0];
      y = newPos[1];
      
      pixel_pos = (y*canvas_width + x) * components;
      while(y-- >= 0 && matchStartColor(pixel_pos))
      {
        pixel_pos -= canvas_width * components;
      }
      pixel_pos += canvas_width * components;
      ++y;

      var sides = [];
      sides[-1] = false;
      sides[1] = false;

      function trace(dir) {
          if(matchStartColor(pixel_pos + dir*components)) {
            if(!sides[dir]) {
              pixelStack.push([x + dir, y]);
              sides[dir]= true;
            }
          }
          else if(sides[dir]) {
            sides[dir]= false;
          }
      }

      while(y++ < canvas_height-1 && matchStartColor(pixel_pos)) {
        colorPixel(pixel_pos);

        // left side
        if(x > 0) {
            trace(-1);
        }

        // right side
        if(x < canvas_width-1) { 
            trace(1);
        }
        pixel_pos += canvas_width * components;

      }
    }
}

// moore neightbour algorithm
// usage:
// var m = new MooreNeighbour([1, 3]);
// var pos = m.next(function(x, y) {
//    return point_inside_contouned_area();
// });
// pos => [2, 3]
function MooreNeighbour(start_point) {
    //clockwise order
    var positions = [[0 , 1],
                     [-1, 1],
                     [-1, 0],
                     [-1,-1],
                     [ 0,-1],
                     [ 1,-1],
                     [ 1, 0],
                     [ 1, 1]];

    var x = start_point[0];
    var y = start_point[1];
    var old_cell = [x, y + 1];

    // based on diff return the next position clockwise
    function clockwise_next(diff) {
        for(var i=0; i<8; ++i) {
            var d = positions[i];
            if (d[0] == diff[0] && d[1] == diff[1])
                return positions[(i+1)%8];
        }
    }

    // with current cell and old_cell return new cell to test
    function next_cell(cell, old_cell) {
        var dx = cell[0] - old_cell[0];
        var dy = cell[1] - old_cell[1];
        var i = clockwise_next([-dx, -dy]);
        return [cell[0] + i[0], cell[1] + i[1]];
    }

    // return next contour cell, undefined if no new cell
    this.next = function(inside) {
        var c = 8; // max 8 positions to test
        while(c--) {
            var n = next_cell([x, y], old_cell);
            if(inside(n[0], n[1])) {
                //console.log("curr", [x, y], "to", n, "old", old_cell);
                x = n[0]; y = n[1];
                return [x, y];
            }
            old_cell = n;
        }
    }
};

/**
    this function finds contour for a bunch of pixel given 
    color of an image.
    Uses the Moore-Neighbor Tracing.
    Returns poligon whitout any processing
    usage:
        var poly = countour(ctx_imagedata.data, ctx.with, ctx.height, pointx, pointy)
*/
function contour(image_data, width, height, x, y) {
    
    var components = 4; //rgba

    // get color to match 
    var pixel_pos = (y*width + x) * components;
    var color = [image_data[pixel_pos],
                 image_data[pixel_pos + 1],
                 image_data[pixel_pos + 2]];

    // helper 
    function match_color(x, y) {
      if(x<0 || x>=width || y<0 || y>=height)  
        return false;

      var pixel_pos = (y*width + x) * components;
      return color[0] == image_data[pixel_pos] && 
             color[1] == image_data[pixel_pos+1] &&
             color[2] == image_data[pixel_pos+2];
    }

    var poly = [];

    // first find the starting point
    var lower_y = y;
    while(match_color(x, ++lower_y)) { }
    --lower_y;
    var start_point = [x, lower_y];

    // start with moore-neightbor
    var moore = new MooreNeighbour(start_point);
    var point;
    do {
        point = moore.next(match_color);
        poly.push(point);
    } while(!(start_point[0] == point[0] && start_point[1] == point[1]) && point != undefined);
    return poly;
}
