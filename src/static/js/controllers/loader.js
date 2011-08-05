var Loading = Backbone.View.extend({

    el: $("#loading"),

    refcount: 0,

    initialize: function() {
    },

    loading: function(where) {
        this.refcount++;
        this.el.fadeIn();
    },
    finished: function() {
        --this.refcount;
        if(this.refcount === 0) {
            this.el.hide();
        }
    }

});

var LoadingSmall = Backbone.View.extend({

    el: $("#loading_small"),

    refcount: 0,

    initialize: function() {
    },

    loading: function(where) {
        if(this.timer !== undefined) {
            clearTimeout(this.timer);
        }
        this.refcount++;
        this.show();
    },

    show: function() {
        this.el.animate({bottom: "-3px"}, 500);
    },

    finished: function() {
        var self = this;
        --this.refcount;
        if(this.refcount === 0) {
            this.timer = setTimeout(function() {
                self.el.animate({bottom: "-171px"}, 1500);
                self.timer = undefined;
            }, 1000);
        }
        if(this.refcount < 0) {
            this.refcount = 0;
        }
    }
});
