
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
        if(this.get('enabled') === true) {
            this.set_enabled(true);
        }
    },

    set_enabled: function(b) {
        if(!this._static) {
            this.enabled = b;
            this.trigger('change', this);
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
        },
        // return a new collection 
        filter_by_type: function(callback) {
            return new LayerCollection(
                this.filter(function(layer) {
                    return callback(layer.get('type'));
                })
            );
        },
        base_layers: function() {
            return this.filter_by_type(function(t) { return t === 'google_maps'; });
        },

        raster_layers: function() {
            return this.filter_by_type(function(t) { return t !== 'google_maps'; });
        }

});
