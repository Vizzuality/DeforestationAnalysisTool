

// render polygon to kml
google.maps.Polygon.prototype.kml = function() {
    var kml = "<LineString>";
    kml+= "<tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode>"
    kml+="<coordinates>";
    this.getPath().forEach(function(p) {
        kml+= p.lat() + "," + p.lng() + ",0\n";
    });
    kml += "</coordinates>";
    kml += "</LineString>";
    return kml;
}
