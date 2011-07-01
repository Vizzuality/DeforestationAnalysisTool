
function GridOverlay(map) {
    this.map = map;
    this.states = [];
    this.level = 0;
    this.cell = { coord: {x: 0, y: 0} };
    this.projector = new Projector(this.map);
    this.bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-18.47960905583197, -74.0478515625),
        new google.maps.LatLng(5.462895560209557, -43.43994140625)
    );
    
    var that = this;
    var listener = google.maps.event.addListener(App.map, 'tilesloaded', function() {
        // its needed to wait to tiles was rendered to
        // google maps call 'draw' on projector overlay and 
        // getProjection can be called
        that.create_grid();
        google.maps.event.removeListener(listener);
    });

}

GridOverlay.prototype.hide= function() {
    $('#grid').fadeOut();
}

GridOverlay.prototype.show= function() {
    $('#grid').fadeIn();
}

GridOverlay.prototype.push= function() {
    // clone FTW
    var b = new google.maps.LatLngBounds(
        this.bounds.getSouthWest(),
        this.bounds.getNorthEast()
    );
    this.states.push({
        bounds: b,
        cell: _.clone(this.cell)
    });
}

GridOverlay.prototype.pop = function() {
    if(this.states.length > 0) {
        var st = this.states.pop();
        this.bounds = st.bounds;
        this.cell = st.cell;
        this.level--;
        this.show();
        this.create_grid();
        if(this.on_select_cell)
            this.on_select_cell(this.level, this.cell.coord);
    }
}

// focus map on this cell
GridOverlay.prototype.focus_on = function(cell) {
    //calculate new bounds and recreate grid
    var grid_pos = $(grid).position();
    var cell_pos = $(cell).position();
    var x = Math.floor(grid_pos.left + cell_pos.left);
    var y = Math.floor(grid_pos.top + cell_pos.top);
    this.push();
    this.bounds = new google.maps.LatLngBounds(
        this.projector.untransformCoordinates(
            new google.maps.Point(x, y + Math.ceil($(cell).height()))
        ),
        this.projector.untransformCoordinates(
            new google.maps.Point(x + Math.ceil($(cell).width()), y)
        )
    );

    this.map.fitBounds(this.bounds);
    this.level++;
    this.cell.coord = cell.coord;

    // callback time
    if(this.on_select_cell)
        this.on_select_cell(this.level, this.cell.coord);
    
    if(this.level < 2) {
        this.create_grid();
    } else {
        var n = this.map.getZoom() + 1;
        this.map.setZoom(n);
        this.hide();
        this.onworklevel && this.onworklevel();
    }
    
}

GridOverlay.prototype.create_cell = function(x, y, w, h) {
    var self = this;
    var cell = document.createElement('DIV');
    cell.style.top = y + "px";
    cell.style.left = x + "px";
    cell.style.width= w + "px";
    cell.style.height= h + "px";
    cell.style.display = "block";
    cell.style.position = "absolute";
    cell.style.background = "rgba(0, 0, 0, 0.3)";
    cell.style.border= "1px solid white";
    $(cell).mouseover(function() {
        $(this).css('background', "rgba(0, 0, 0, 0.1)");
    }).mouseout(function() {
        $(this).css('background', "rgba(0, 0, 0, 0.3)");
    }).click(function() {
        self.focus_on(cell);
    });
    return cell;
}

GridOverlay.prototype.create_grid = function() {
    this.map.fitBounds(this.bounds);
    var righttop = this.projector.transformCoordinates(this.bounds.getNorthEast());
    var leftbottom = this.projector.transformCoordinates(this.bounds.getSouthWest());
    var x = leftbottom.x;
    var y = righttop.y;
    var w = righttop.x - leftbottom.x;
    var h = - righttop.y + leftbottom.y;
    var grid = document.getElementById('grid');
    this.grid = grid;

    grid.innerHTML = '';

    grid.style.top = y + "px";
    grid.style.left = x + "px";
    grid.style.width= w + "px";
    grid.style.height= h + "px";
    grid.style.display = "block";
    sp = 10;
    var sx = w/sp;      
    var sy = h/sp;
    for(var i=0; i < sp;++i) {
        for(var j=0; j < sp;++j) {
            var cell = this.create_cell(i*sx, j*sy, sx, sy);
            cell.coord = {x: i, y: j};
            grid.appendChild(cell);
        }
    }
    //this.map.fitBounds(this.bounds);
    //grid.style.background = "#333";
    //var grid= ownerDocument.createElement('DIV');

}

/*
GridOverlay.prototype.tileSize = new google.maps.Size(256,256);
GridOverlay.prototype.maxZoom = 19;

GridOverlay.prototype.outer = function(ownerDocument, w, h) {
  var div = ownerDocument.createElement('DIV');
  div.style.width = w  + 'px';
  div.style.height = h + 'px';
  div.style.fontSize = '20';
  div.style.borderStyle = 'solid';
  div.style.borderWidth = '1px';
  div.style.borderColor = '#AAAAAA';
  return div;
}

GridOverlay.prototype.getTile = function(coord, zoom, ownerDocument) {

  var div = this.outer(ownerDocument, this.tileSize.width, this.tileSize.height);
  var sp = 1 << (this.splits[zoom] || 1);
  var sub_width = this.tileSize.width/sp;
  var sub_heigth= this.tileSize.height/sp;
  div.setAttribute("id", zoom + "_" + coord.x + "_" + coord.y);
  console.log("id", zoom + "_" + coord.x + "_" + coord.y);

   google.maps.event.addListener(div, 'mouseover', function() {
            alert('click');
   });
 
  for(var i=0; i < sp;++i) {
    for(var j=0; j < sp;++j) {
        var subdiv = document.createElement('div');
        subdiv.innerHTML = i + "," +j;
        subdiv.style.width = sub_width - 2 + 'px';
        subdiv.style.height = sub_heigth - 2+ 'px';
        subdiv.style.position= "absolute";
        subdiv.style.top = j*sub_width + "px";
        subdiv.style.left = i*sub_heigth + "px";
        subdiv.style.fontSize = '10';
        subdiv.style.borderStyle = 'solid';
        subdiv.style.borderWidth = '1px';
        subdiv.style.borderColor = '#888';
        subdiv.onclick = function() {
            alert('click');
        }
        div.appendChild(subdiv);
    }
  }
    
  
  return div;
};
*/
