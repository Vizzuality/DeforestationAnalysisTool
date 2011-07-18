
var CellView = Backbone.View.extend({

    tagName: 'div',

    events:  {
        'mouseover': 'onmouseover',
        'mouseout': 'onmouseout',
        'click': 'onclick'
    },

    initialize: function() {
        _.bindAll(this, 'onmouseover', 'onmouseout', 'onclick');
    },

    render: function(topx, topy) {
        var cell = this.el;
        var border = 1;
        var p = window.mapper.cell_position(this.model.get('x'),
            this.model.get('y'),
            this.model.get('z'));
        cell.style.top = p.y - topy + "px";
        cell.style.left = p.x - topx + "px";
        cell.style.width = p.width - 2*border + "px";
        cell.style.height = p.height - 2*border+ "px";
        cell.style.margin = border + "px";
        cell.style.padding= 0;
        cell.style.display = "block";
        cell.style.position = "absolute";
        cell.style.background = "rgba(0, 0, 0, 0.1)";
        //cell.style.border= "1px solid white";
        ////cell.innerHTML = "<div class='cell_wrap'><div class='progress'><div class='data'>15/100</div></div></div>";
        return this;
    },

    onmouseover: function() {
        $(this.el).css('background', "rgba(0, 0, 0, 0.5)");
    },

    onmouseout: function() {
        $(this.el).css('background', "rgba(0, 0, 0, 0.1)");
    },

    onclick: function(e) {
        this.trigger('enter', this.model);
    }
});

// render a grid over a map
var Grid = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'render', 'add_cells', 'cell_selected', 'populate_cells');
        if(this.options.mapview === undefined) {
            throw "you should specify MapView in constructor";
        }
        this.el.css('position', 'absolute');
    },

    add_cells: function() {
        var that = this;
        this.el.html('');
        this.cells.each(function(c) {
            var pos = that.el.position();
            var cellview = new CellView({model: c});
            that.el.append(cellview.render(pos.left, pos.top).el);
            cellview.bind('enter', that.cell_selected);
        });
        this.render();
    },

    // called when user clicks on a cell
    cell_selected: function(cell) {
        this.trigger('enter_cell', cell);
    },

    populate_cells: function(cells) {
        this.cells = cells;
        this.cells.bind('reset', this.add_cells);
        this.render();
    },

    render: function() {
        var p = window.mapper.cell_position(this.cells.x, this.cells.y, this.cells.z);
        this.el.css('top', p.y);
        this.el.css('left', p.x);
        this.el.css('width', p.width);
        this.el.css('height', p.height);
        this.el.css('background', 'rgba(0,0,0,0.2)');
    }

});


// controls grid and map changes
var GridStack = Backbone.View.extend({
    zoom_mapping: {
        0: 5,
        1: 8,
        2: 12
    },

    WORKING_ZOOM: 2,

    initialize: function(options) {
        _.bindAll(this, 'map_ready', 'enter_cell', 'cell_click');
        this.mapview = options.mapview;
        this.bounds = options.initial_bounds;
        this.level = 0;
        this.mapview.bind('ready', this.map_ready);
        this.grid = new Grid({
            mapview: this.mapview,
            el: options.el
        });
        this.grid.bind('enter_cell', this.cell_click);
    },


    // this function is called when tiles on map are loaded
    // and projection can be used
    map_ready: function() {
        window.mapper.projector = this.mapview.projector;
        var cells = new Cells(undefined, {x: 0, y:0, z: 0});
        this.set_cells(cells);
        this.mapview.bind('center_changed', this.grid.render);
        console.log(" === Grid stack ready === ");
    },

    set_cells: function(cells) {
        this.current_cells = cells;
        this.grid.populate_cells(this.current_cells);
        this.current_cells.populate_cells();
    },
    
    cell_click: function(cell) {
        this.enter_cell(cell.get('x'), cell.get('y'), cell.get('z'));
    },

    // when user enter on a cell, this level cells need to be loaded
    // and map changed to this bounds
    enter_cell: function(x, y, z) {
        this.mapview.map.fitBounds(window.mapper.cell_bounds(x, y, z));
        this.mapview.map.setZoom(this.zoom_mapping[z]);
        if(z < this.WORKING_ZOOM) {
            var cells = new Cells(undefined, {
                x: x,
                y: y,
                z: z
            });
            this.set_cells(cells);
        } else {
            this.el.hide();
        }
    }

});
