
var LayerModel = Backbone.Model.extend({

    hidden: false,

    initialize: function() {
        _.bindAll(this, 'set_enabled');
    },

    set_enabled: function(b) {
        this.enabled = b;
        this.trigger('change');
    }

});


var LayerCollection = Backbone.Collection.extend({

        model: LayerModel,

        initialize: function()  {
        },
        
        get_by_name: function(name) {
            var lay;
            this.each(function(m) {
                if(m.get('description') === name) {
                    lay = m;
                }
            });
            return lay;
        }

});
