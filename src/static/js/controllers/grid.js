
function linear(t, a, b) {
    return (a + t*(b-a)) >> 0;
}

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
        cell.style.width = p.width - border + "px";
        cell.style.height = p.height - border+ "px";
        cell.style.margin = "0 " + border + "px " + border + "px";
        cell.style.padding= 0;
        cell.style.display = "block";
        cell.style.position = "absolute";
        var t = this.model.get('ndfi_change_value');
        t = t || 1;
        var r = linear(t, 225, 224);
        var g = linear(t, 125, 222);
        var b = linear(t, 40, 122);
        cell.style.background = "rgba(" + r + "," + g + "," + b +", 0.9)";
        return this;
    },

    onmouseover: function() {
        //$(this.el).css('background', "rgba(0, 0, 0, 0.5)");
    },

    onmouseout: function() {
        //$(this.el).css('background', "rgba(0, 0, 0, 0.1)");
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
        var p = window.mapper.cell_position(this.cells.x, this.cells.y, this.cells.z);
        this.cells.each(function(c) {
            var pos = that.el.position();
            var cellview = new CellView({model: c});
            that.el.append(cellview.render(p.x, p.y).el);
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
    },

    render: function() {
        if(this.cells) {
            var p = window.mapper.cell_position(this.cells.x, this.cells.y, this.cells.z);
            this.el.css('top', p.y);
            this.el.css('left', p.x);
            this.el.css('width', p.width);
            this.el.css('height', p.height);
        }
        //this.el.css('background', 'rgba(0,0,0,0.2)');
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
        this.report = options.report;
        this.level = 0;

        this.grid = new Grid({
            mapview: this.mapview,
            el: options.el
        });
        this.grid.bind('enter_cell', this.cell_click);
        this.map_ready();
    },


    // this function is called when tiles on map are loaded
    // and projection can be used
    map_ready: function() {
        window.mapper.projector = this.mapview.projector;
        //var cells = new Cells(undefined, {x: 0, y:0, z: 0, report: this.report});
        //this.set_cells(cells);
        this.mapview.bind('center_changed', this.grid.render);
        console.log(" === Grid stack ready === ");
    },

    set_cells: function(cells) {
        var self = this;
        this.el.hide();
        window.loading.loading();
        this.current_cells = cells;
        this.grid.populate_cells(this.current_cells);
        this.current_cells.bind('reset', function() {
            self.el.show();
            window.loading.finished();
        });
        this.current_cells.fetch();
    },
    
    cell_click: function(cell) {
        this.enter_cell(cell.get('x'), cell.get('y'), cell.get('z'));
    },

    // when user enter on a cell, this level cells need to be loaded
    // and map changed to this bounds
    enter_cell: function(x, y, z) {
        //TODO: show loading
        this.mapview.map.fitBounds(window.mapper.cell_bounds(x, y, z));
        this.mapview.map.setZoom(this.zoom_mapping[z]);
        if(z < this.WORKING_ZOOM) {
            var cells = new Cells(undefined, {
                x: x,
                y: y,
                z: z,
                report: this.report
            });
            this.set_cells(cells);
            this.trigger('select_mode');
        } else {
            this.el.hide();
            this.trigger('work_mode', x, y, z);
        }
    }

});
