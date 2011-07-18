
var CellView = Backbone.View.extend({

    tagName: 'div',
    
    events:  {
        'mouseover': 'onmouseover',
        'mouseout': 'onmouseout',
        'click': 'onclick'
    },

    initialize: function() {
        _.bindAll(this, 'onmouseover', 'onmouseout', 'click');
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
        this.trigger('enter');
        
    }
    


});

// render a grid over a map, example usage:
// var grid = new Grid({ mapview: MapView,
//            el: $("#grid"),
//            bounds: new google.maps.LatLngBounds(...)
// })
var Grid = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'map_ready', 'render', 'add_cells');
        if(this.options.mapview === undefined) {
            throw "you should specify MapView in constructor";
        }
        this.mapview = this.options.mapview;
        this.bounds = this.options.bounds;
        this.mapview.bind('ready', this.map_ready);
        this.el.css('position', 'absolute');

    },

    add_cells: function() {
        var that = this;
        this.cells.each(function(c) {
            var cellview = new CellView({model: c});
            that.el.append(cellview.render().el);
        });
    },

    // this function is called when tiles on map are loaded
    // and projection can be used
    map_ready: function() {
        this.mapview.unbind('tilesloaded');
        this.mapview.bind('center_changed', this.render);
        this.projector = new Projector(this.mapview.map);
        this.cells = new Cells(undefined, {
            bounds: this.bounds,
            projector: this.projector
        });
        this.cells.bind('reset', this.add_cells);
        var me = this;
        this.cells.populate_cells();
        this.render();
        console.log("map ready");
    },

    render: function() {
        var righttop = this.projector.transformCoordinates(this.bounds.getNorthEast());
        var leftbottom = this.projector.transformCoordinates(this.bounds.getSouthWest());
        var x = leftbottom.x;
        var y = righttop.y;
        var w = righttop.x - leftbottom.x;
        var h = - righttop.y + leftbottom.y;
        this.el.css('top', y);
        this.el.css('left', x);
        this.el.css('width', w);
        this.el.css('height', h);
        this.el.css('background', 'rgba(0,0,0,0.2)');
    }

});


