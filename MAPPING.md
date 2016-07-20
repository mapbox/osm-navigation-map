# Mapping navigation features

## Turn Restrictions

![](https://farm3.staticflickr.com/2900/14360050862_ef35f7ffa8_b.jpg)

1. Browse the map to the city of your choice

2. Zoom in to the streets where there is coverage of [Mapillary street view]() indicated by green colored lines to browse detected traffic signages (green markers)<br>![untitled2](https://cloud.githubusercontent.com/assets/126868/16985921/4678017c-4ea1-11e6-8038-42f47d483df4.gif)

3. Click on a detected turn restriction to open the street view photograph to verify the location<br>![untitled2](https://cloud.githubusercontent.com/assets/126868/16986045/11523354-4ea2-11e6-8c22-6102ad64d2f7.gif)

4. Edit the location on [OpenStreetMap](http://www.osm.org) and add the turn restriction. Using the [iD web editor](https://www.mapbox.com/blog/simple-editing-for-turn-restrictions-in-openstreetmap/) or [JOSM advanced editor](https://www.mapbox.com/blog/turn-restrictions/)

5. Once done, mark the status of the restriction on the navigation map:
 - `valid` - The detected restriction is valid and has been added to OSM
 - `redundant` - The detected restriction is correct but is not required to be added to OSM since it is redundant for routing. eg. A no left turn against a oneway road.
 - `invalid` The detected restriction is incorrect or is a false positive. Do not add to OSM.

