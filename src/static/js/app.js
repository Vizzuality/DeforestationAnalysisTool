
$(function() {
 
    // application 
    var IMazon = Backbone.View.extend({
        initialize:function() {
            this.map = new MapView();
        }
    });

    var app = new IMazon();

});
