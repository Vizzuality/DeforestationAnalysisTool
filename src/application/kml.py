

def path_to_kml(paths):
    kml = "<Polygon>"
    kml+= "<outerBoundaryIs>"
    kml+= "<LinearRing>"
    kml+="<coordinates>"
    for p in paths[0]:
        kml+= str(p[1]) + "," + str(p[0]) + ",0\n"
    kml += "</coordinates>"
    kml+= "</LinearRing>"
    kml+= "</outerBoundaryIs>"
    for inner in paths[1:]:
        kml +="<innerBoundaryIs>"
        kml+= "<LinearRing>"
        kml+="<coordinates>"
        for p in inner:
            kml+= str(p[1]) + "," + str(p[0]) + ",0\n"
        kml += "</coordinates>"
        kml+= "</LinearRing>"
        kml +="</innerBoundaryIs>"
    kml += "</Polygon>"
    return kml;
