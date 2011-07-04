

// render polygon to kml
google.maps.Polygon.prototype.kml = function() {
    var kml = "<Polygon>";
    kml+= "<outerBoundaryIs>";
    kml+= "<LinearRing>";
    kml+="<coordinates>";
    this.getPath().forEach(function(p) {
        kml+= p.lng() + "," + p.lat() + ",0\n";
    });
    kml += "</coordinates>";
    kml+= "</LinearRing>";
    kml+= "</outerBoundaryIs>";
    kml += "</Polygon>";
    return kml;
}
