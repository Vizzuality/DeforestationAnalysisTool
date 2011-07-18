
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

    render: function() {
        var cell = this.el;
        var border = 1;
        cell.style.top = this.model.get('top') + "px";
        cell.style.left = this.model.get('left') + "px";
        cell.style.width = this.model.get('width') - 2*border + "px";
        cell.style.height = this.model.get('height') - 2*border+ "px";
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
            var cellview = new CellView({model: c});
            that.el.append(cellview.render().el);
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
        this.cells.calc_projection();
        this.el.css('top', this.cells.y);
        this.el.css('left', this.cells.x);
        this.el.css('width', this.cells.w);
        this.el.css('height', this.cells.h);
        this.el.css('background', 'rgba(0,0,0,0.2)');
    }

});


// controls grid and map changes
var GridStack = Backbone.View.extend({
    // contains cells for each level

    initialize: function(options) {
        _.bindAll(this, 'map_ready', 'enter_cell');
        this.mapview = options.mapview;
        this.bounds = options.initial_bounds;
        this.level = 0;
        this.mapview.bind('ready', this.map_ready);
        this.grid = new Grid({
            mapview: this.mapview,
            el: options.el
        });
        this.grid.bind('enter_cell', this.enter_cell);
    },

    // this function is called when tiles on map are loaded
    // and projection can be used
    map_ready: function() {
        var cells = new Cells(undefined, {
            bounds: this.bounds,
            projector: this.mapview.projector
        });
        this.set_cells(cells);
        this.mapview.bind('center_changed', this.grid.render);
        // hack, set projector into prototype to avoid projector mess
        Cell.prototype.projector = this.mapview.projector;
        console.log(" === Grid stack ready === ");
    },

    set_cells: function(cells) {
        this.current_cells = cells;
        this.grid.populate_cells(this.current_cells);
        this.current_cells.populate_cells();
    },

    // when user enter on a cell, this level cells need to be loaded
    // and map changed to this bounds
    enter_cell: function(cell) {
        this.bounds = cell.bounds();
        this.mapview.map.fitBounds(this.bounds);
        var cells = new Cells(undefined, {
            bounds: this.bounds,
            projector: this.mapview.projector
        });
        this.set_cells(cells);
    }

});
