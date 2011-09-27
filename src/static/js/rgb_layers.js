

var RGB_layers =  [
    {
        r: 1,
        g: 4,
        b: 3,
        description: 'True color RGB141'
    },
    {
        r: 5,
        g: 2,
        b: 1,
        description: 'False color RGB421'
    },
    {
        r: 2,
        g: 1,
        b: 4,
        description: 'F color infrared RGB214'
    }
];

/*
 ==========================================
 helper to add rgb layers to maps
 ==========================================
*/
function add_rgb_layers(layers, gridstack, report_id) {
    _(RGB_layers).each(function(layer) {
        var rgb = new RGBStrechLayer({
            r: layer.r,
            g: layer.g,
            b: layer.b,
            report_id: report_id,
            description: layer.description
        });

        layers.add(rgb);
        gridstack.bind('work_mode', rgb.on_cell);
        var c = gridstack.current_cell;
        if(c) {
            rgb.on_cell(c.get('x'), c.get('y'), c.get('z'));
        }
    });
}


/*
 ==========================================
 unbind rgb layers for map
 ==========================================
*/
function unbind_rgb_layers(layers, gridstack) {
    _(RGB_layers).each(function(layer) {
        var lyr = layers.get_by_name(layer.description);
        gridstack.unbind('work_mode', lyr.on_cell);
    });
}
