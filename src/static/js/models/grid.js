
var Cell = Backbone.Model.extend({
    defaults: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        background: "rgba(0, 0, 0, 0.5)"
    }
});


var Cells = Backbone.Collection.extend({
  model: Cell
});
