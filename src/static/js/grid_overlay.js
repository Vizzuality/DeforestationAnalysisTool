
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
    $('#grid').hide();
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
        this.map.setZoom(12);
        this.hide();
        this.onworklevel && this.onworklevel();
        this.set_visible_zone();
    }
    
}


GridOverlay.prototype.set_visible_zone = function() {
    // calculate outer and inner polygon
    var X = 179.5;
    var Y = 85;
    var sw = this.bounds.getSouthWest();
    var ne = this.bounds.getNorthEast();
    var paths = [[
        new google.maps.LatLng(-X, -Y),
            new google.maps.LatLng(-X, Y),
            new google.maps.LatLng(X, Y),
            new google.maps.LatLng(X, -Y)
    ], [
        sw, 
        new google.maps.LatLng(ne.lat(), sw.lng()),
        ne,
        new google.maps.LatLng(sw.lat(), ne.lng()),
    ]];

    this.poly = new google.maps.Polygon({
      paths: paths,
      strokeWeight: 3,
      fillColor: '#000',
      fillOpacity: 0.5
    });

    this.poly.setMap(this.map);
}

GridOverlay.prototype.clear_visible_zone = function() {
    if(this.poly) {
        this.poly.setMap(null);
        delete this.poly;
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
    cell.style.background = "rgba(0, 0, 0, 0.5)";
    cell.style.border= "1px solid white";
    cell.innerHTML = "<div class='cell_wrap'><div class='progress'><div class='data'>15/100</div></div></div>";
    $(cell).mouseover(function() {
        $(this).css('background', "rgba(0, 0, 0, 0.0)");
        $(this).css('cursor','pointer');
    }).mouseout(function() {
        $(this).css('background', "rgba(0, 0, 0, 0.5)");
        $(this).css('cursor', 'auto');
    }).click(function() {
        self.focus_on(cell);
    });
    return cell;
}

GridOverlay.prototype.create_grid = function() {
    this.hide();
    this.clear_visible_zone();
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
    this.show();

}

