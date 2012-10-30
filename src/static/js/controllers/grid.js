
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

    render: function(topx, topy, x, y, w, h) {
        var cell = this.el;
        var border = 1;
        if(this.model.get('blocked')) {
            border = 0;
        }
        cell.style.top = (y +  border) + "px";
        cell.style.left =  (x + border) + "px";
        cell.style.width = (w - border) + "px";
        cell.style.height = (h - border) + "px";

        cell.style.margin = 0;//(border/2) + "px" ;//"0 " + border + "px " + border + "px";
        cell.style.padding= 0;
        cell.style.display = "block";
        cell.style.position = "absolute";

        if(!this.model.get('blocked')) {
            if(this.model.get('done')) {
                $(cell).addClass('finished');
                cell.style['background-image'] = "url('/static/img/cell_completed_pattern.png')";
            } else if(this.model.has_changes()) {
                cell.style['background-image'] = "url('/static/img/cell_stripes.png')";
            }
            var t = 1.0 - this.model.ndfi_change();
            var r = linear(t, 225, 224);
            var g = linear(t, 125, 222);
            var b = linear(t, 40, 122);
            cell.style['background-color'] = "rgba(" + r + "," + g + "," + b +", 0.8)";
        } else {
            cell.style['background-color'] = "rgba(0, 0, 0, 0.8)";
        }
        $(cell).append(this.template(this.model.toJSON())).addClass('cell');
        return this;
    },

    border_size: 8,
    onmouseover: function() {
        var border_size = this.border_size;
        if(this.model.get('blocked')) {
            return;
        }
        var el = $(this.el);
        var popup = el.find('.cell_wrapper_info');
        popup.show();
        popup.css({left: el.width()});
        popup.css({height: el.height() + border_size});
        el.addClass('hover');
        var p = $(this.el).position();
        el.css({top: p.top - border_size/2, left: p.left - border_size/2});
        el.css({'z-index': 9});
        el.css({'border-size': border_size/2});
        el[0].style['background-color'] = "rgba(0, 0, 0, 0)";
    },

    onmouseout: function() {
        var border_size = this.border_size;
        if(this.model.get('blocked')) {
            return;
        }
        var el = $(this.el);
        var popup = el.find('.cell_wrapper_info');
        popup.hide();
        el.removeClass('hover');
        var p = $(this.el).position();
        el.css({top: p.top + border_size/2, left: p.left + border_size/2});
        el.css({'z-index': 1});

        var t = 1.0 - this.model.ndfi_change();
        var r = linear(t, 225, 224);
        var g = linear(t, 125, 222);
        var b = linear(t, 40, 122);
        el[0].style['background-color'] = "rgba(" + r + "," + g + "," + b +", 0.8)";
    },

    onclick: function(e) {
        this.trigger('enter', this.model);
    }
});

// render a grid over a map
var Grid = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'render', 'add_cells', 'cell_selected', 'populate_cells','set_visible_zone', 'clear_visible_zone');
        if(this.options.mapview === undefined) {
            throw "you should specify MapView in constructor";
        }
        this.mapview = this.options.mapview;
        this.el.css('position', 'absolute');
        this.oclusion_poly = new google.maps.Polygon({
          paths: [],
          strokeWeight: 0,
          fillColor: '#000',
          fillOpacity: 0.8
        });

    },

    add_cells: function() {
        var that = this;
        this.el.html('');
        var p = window.mapper.cell_position(this.cells.x, this.cells.y, this.cells.z);
        // normalize
        var x = Math.floor(p.x);
        var y = Math.floor(p.y);
        var w = Math.floor((p.width/5))*5;
        var h = Math.floor((p.height/5))*5;
        var marginx = 0;//Math.floor((p.width - w)/2);
        var marginy = 0;//Math.floor((p.height- h)/2);

        var wc = w/5;
        var wh = h/5;
        
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        var srcx = this.cells.x*5;
        var srcy = this.cells.y*5;

        this.cells.each(function(c) {
            var pos = that.el.position();
            var cellview = new CellView({model: c});
            that.el.append(cellview.render(p.x, p.y, marginx + (c.get('x') - srcx)*wc, marginy + (c.get('y') - srcy)*wh, wc, wh).el);
            cellview.bind('enter', that.cell_selected);
        });
        var cell_bounds = this.bounds();
        this.set_visible_zone(cell_bounds);
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
            x =  Math.floor(p.x);
            y =  Math.floor(p.y);
            w =  5 + Math.floor((p.width/5)*5);
            h =  5 + Math.floor((p.height/5)*5);
            this.el.css('top', y);
            this.el.css('left', x);
            this.el.css('width', w);
            this.el.css('height', h);
        }
        //this.el.css('background', 'rgba(0,255,0,0.2)');
    },

    bounds: function() {
        var prj = this.mapview.projector;
        bounds = new google.maps.LatLngBounds(
            prj.untransformCoordinates(new google.maps.Point(this.x, this.y + this.h)),
            prj.untransformCoordinates(new google.maps.Point(this.x + this.w, this.y))
        );
        return bounds;
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

    events:  {
        //'mouseover': 'onmouseover',
        //'mouseout': 'onmouseout'
    },

    onmouseover: function() {
        var el = $(this.el);
        el.css({opacity: 1.0});

    },

    onmouseout: function() {
        var el = $(this.el);
        el.css({opacity: 0.1});
    },


    initialize: function(options) {
        _.bindAll(this, 'map_ready', 'enter_cell', 'cell_click', 'onmouseout', 'onmouseover');
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
        window.loading.loading('set_cells', 'Loading cells...');
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

        //TODO: show loading
        var cell_bounds = window.mapper.cell_bounds(x, y, z);
        this.mapview.map.fitBounds(cell_bounds);
        this.mapview.map.setZoom(this.zoom_mapping[z]);
        if(true || z > 0) {
            //var cell_bounds = window.mapper.cell_bounds(x, y, z);
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
            self.mapview.tile_info('');
        } else {
            this.grid.set_visible_zone(cell_bounds);
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
            this.current_cell.landstat_info(function(data) {
                var d = new Date(data.timestamp);
                var dstr =  d.getUTCFullYear()+'-' + (d.getUTCMonth()+1)+'-' + (d.getUTCDate());
                self.mapview.tile_info("LANDSAT · path/row: " + data.path + "/" + data.row + " date: " + dstr);
            });
         }
    }

});
