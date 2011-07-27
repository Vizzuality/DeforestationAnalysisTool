
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
        $(this.el).html(this.model.get('description'));
        return this;
    }, 

    click: function() {
        if(this.enabled) {
            this.trigger('disable', this);
        } else {
            this.trigger('enable', this);
        }
        this.enabled = !this.enabled;
    }
});

var LayerEditor = Backbone.View.extend({

    showing: false,

    initialize: function() {
        _.bindAll(this, 'show', 'addLayer', 'addLayers');
        this.layers = this.options.layers;
        this.addLayers(this.layers);
        this.el.find('ul').jScrollPane({autoReinitialise:true});
    },

    addLayer: function(layer) {
        var ul = this.el.find('ul');
        var view = new LayerView({model: layer});
        ul.append(view.render().el);
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
    },

    close: function() {
        this.el.fadeOut();
        this.showing = false;
    }



});
