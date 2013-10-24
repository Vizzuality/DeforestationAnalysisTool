

// render polygon to kml
google.maps.Polygon.prototype.kml = function() {
    var kml = "<Polygon>";
    kml+= "<outerBoundaryIs>";
    kml+= "<LinearRing>";
    kml+="<coordinates>";
    this.getPath().forEach(function(p) {
        kml += p.lng() + "," + p.lat() + ",0\n";
    });
    var p = this.getPath()[0];
    kml += p.lng() + "," + p.lat() + ",0\n";
    kml += "</coordinates>";
    kml+= "</LinearRing>";
    kml+= "</outerBoundaryIs>";
    kml += "</Polygon>";
    return kml;
};

var KML = {
   path_to_kml: function(path) {
        var kml = "<Polygon>";
        kml+= "<outerBoundaryIs>";
        kml+= "<LinearRing>";
        kml+="<coordinates>";
        _.each(path, function(p) {
            kml += p.lng() + "," + p.lat() + ",0\n";
        });
        // close polygon
        var p = path[0];
        kml += p.lng() + "," + p.lat() + ",0\n";
        kml += "</coordinates>";
        kml += "</LinearRing>";
        kml += "</outerBoundaryIs>";
        kml += "</Polygon>";
        return kml;
   }
};
