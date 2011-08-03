
var LayerView = Backbone.View.extend({

    tagName: 'li',

    enabled: false,

    events: {
        'click': 'click'
    },

    initialize: function() {
        _.bindAll(this, 'render', 'click');
    },

    render: function() {
        var el = $(this.el);
        this.id = 'layer_' + this.model.get('id');
        el.html("<a href='#'>" + this.model.get('description') + "</a>");
        el.attr('id', this.id);
        if(this.model.enabled) {
            el.addClass('selected');
        }
        return this;
    },

    click: function(e) {
        e.preventDefault();
        this.enabled = !this.enabled;
        if(!this.enabled) {
            this.trigger('disable', this);
            $(this.el).removeClass('selected');
        } else {
            $(this.el).addClass('selected');
            this.trigger('enable', this);
        }
        this.model.set_enabled(this.enabled);
    }
});

var LayerEditor = Backbone.View.extend({

    showing: false,

    template: _.template($('#layer-editor').html()),

    initialize: function() {
        _.bindAll(this, 'show', 'addLayer', 'addLayers', 'sortLayers', 'addLayer');
        var self = this;

        this.item_view_map = {};
        this.layers = this.options.layers;
        this.el = $(this.template());
        this.options.parent.append(this.el);
        this.addLayers(this.layers);
        this.el.find('ul').jScrollPane({autoReinitialise:true});

        this.el.find('ul, div.jspPane').sortable({
          revert: false,
          items: 'li',
          cursor: 'pointer',
          stop:function(event,ui){
            $(ui.item).removeClass('moving');
            //
            //DONT CALL THIS FUNCTION ON beforeStop event, it will crash :D
            //
            self.sortLayers();
          },
          start:function(event,ui){
            $(ui.item).addClass('moving');
          }
        });
    },

    // reorder layers in map
    sortLayers: function() {
        var self = this;
        var new_order_list = [];
        // sort layers
        this.el.find('ul').find('li').each(function(idx, item) {
            var id = $(item).attr('id');
            var view = self.item_view_map[id];
            new_order_list.push(view.model);
        });
        this.layers.reset(new_order_list);
    },

    addLayer: function(layer) {
        if(!layer.hidden) {
            var ul = this.el.find('ul');
            var view = new LayerView({model: layer});
            ul.append(view.render().el);
            this.item_view_map[view.id] = view;
        }
    },

    addLayers: function(layers) {
         this.el.find('ul').html('');
         layers.each(this.addLayer);
    },

    show: function(pos, side) {
        if(side == 'right') {
            this.el.css({top: pos.top, left: pos.left});
        } else {
            this.el.css({top: pos.top, left: pos.left - this.el.width() - 10});
        }
        this.el.fadeIn();
        this.showing = true;
        this.layers.trigger('reset');
    },

    close: function() {
        this.el.fadeOut();
        this.showing = false;
    }

});
