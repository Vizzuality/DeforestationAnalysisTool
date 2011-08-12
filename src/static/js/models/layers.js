
var LayerModel = Backbone.Model.extend({

    hidden: false,
    _static: false,

    initialize: function() {
        _.bindAll(this, 'set_enabled');
        if(this.get('static') === true) {
            this._static = true;
            this.enabled = true;
        } else {
            this.enabled = false;
        }
    },

    set_enabled: function(b) {
        if(!this._static) {
            this.enabled = b;
            this.trigger('change');
        }
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
