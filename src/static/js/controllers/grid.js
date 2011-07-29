
function linear(t, a, b) {
    return (a + t*(b-a)) >> 0;
}

var CellView = Backbone.View.extend({

    tagName: 'div',

    template: _.template($('#cell-template').html()),

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
        var border = 2;
        var p = window.mapper.cell_position(this.model.get('x'),
            this.model.get('y'),
            this.model.get('z'));
        cell.style.top = Math.floor(p.y - topy) + "px";
        cell.style.left = Math.floor(p.x - topx) + "px";
        cell.style.width = Math.ceil(p.width) - border + "px";
        cell.style.height = Math.ceil(p.height) - border+ "px";
        cell.style.margin = border + "px" ;//"0 " + border + "px " + border + "px";
        cell.style.padding= 0;
        cell.style.display = "block";
        cell.style.position = "absolute";
        if(this.model.get('done')) {
            $(cell).addClass('finished');
            cell.style['background-color'] = "rgba(0, 0 ,0, 0.6)";

        } else {
            var t = this.model.get('ndfi_change_value');
            t = t || 1;
            var r = linear(t, 225, 224);
            var g = linear(t, 125, 222);
            var b = linear(t, 40, 122);
            cell.style['background-color'] = "rgba(" + r + "," + g + "," + b +", 0.9)";
        }
        $(cell).append(this.template(this.model.toJSON())).addClass('cell');
        return this;
    },

    onmouseover: function() {
        var el = $(this.el);
        var popup = el.find('.cell_wrapper_info');
        popup.show();
        popup.css({left: el.width()});
        popup.css({height: el.height() + 6});
        el.addClass('hover');
        var p = $(this.el).position();
        el.css({top: p.top - 3, left: p.left - 3});
        el.css({'z-index': 9});

    },

    onmouseout: function() {
        var el = $(this.el);
        var popup = el.find('.cell_wrapper_info');
        popup.hide();
        el.removeClass('hover');
        var p = $(this.el).position();
        el.css({top: p.top + 3, left: p.left + 3});
        el.css({'z-index': 1});
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
        _.bindAll(this, 'map_ready', 'enter_cell', 'cell_click', 'set_visible_zone');
        this.mapview = options.mapview;
        this.bounds = options.initial_bounds;
        this.report = options.report;
        this.level = 0;

        this.oclusion_poly = new google.maps.Polygon({
          paths: [],
          strokeWeight: 0,
          fillColor: '#000',
          fillOpacity: 0.5
        });

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
        window.loading.loading('set_cells');
        this.current_cells = cells;
        this.grid.populate_cells(this.current_cells);
        this.current_cells.bind('reset', function() {
            self.el.show();
            window.loading.finished('set_cells');
        });
        this.current_cells.fetch();
    },

    cell_click: function(cell) {
        this.enter_cell(cell.get('x'), cell.get('y'), cell.get('z'), cell);
    },

    set_visible_zone: function(bounds) {
        // calculate outer and inner polygon
        var X = 179.5;
        var Y = 85;
        var sw = bounds.getSouthWest();
        var ne = bounds.getNorthEast();
        var paths = [[
            new google.maps.LatLng(-X, -Y),
                new google.maps.LatLng(-X, Y),
                new google.maps.LatLng(X, Y),
                new google.maps.LatLng(X, -Y)
        ], [
            sw,
            new google.maps.LatLng(ne.lat(), sw.lng()),
            ne,
            new google.maps.LatLng(sw.lat(), ne.lng())
        ]];

        this.oclusion_poly.setPaths(paths);
        this.oclusion_poly.setMap(this.mapview.map);
    },

    clear_visible_zone: function() {
        this.oclusion_poly.setMap(null);
    },

    to_parent: function() {

    },
    // when user enter on a cell, this level cells need to be loaded
    // and map changed to this bounds
    enter_cell: function(x, y, z, cell) {
        var self = this;

        this.current_cell = cell || new Cell({
            report_id: this.report.id,
            x: x,
            y: y,
            z: z
        });

        this.clear_visible_zone();
        //TODO: show loading
        var cell_bounds = window.mapper.cell_bounds(x, y, z);
        this.mapview.map.fitBounds(cell_bounds);
        this.mapview.map.setZoom(this.zoom_mapping[z]);
        if(z > 0) {
            this.set_visible_zone(cell_bounds);
        }
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
            if(this.current_cell.isNew()){
                this.current_cell.fetch({
                    success: function() {
                        self.trigger('work_mode', x, y, z);
                    }
                });
            } else {
                this.trigger('work_mode', x, y, z);
            }
        }
    }

});
