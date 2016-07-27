# osm-navigation-map
![untitled2](https://cloud.githubusercontent.com/assets/126868/15677497/23779148-2768-11e6-8dc0-1923abcc760e.gif)

A map to explore navigation data in OpenStreetMap. This is a useful too to explore Mapillary detected turn restrictions and add them to OSM. Once its added, one can also add a custom marker on the map to set the status of the detected restriction. See the project for [Mapping turn restrictions with Mapillary](https://github.com/mapbox/mapping/issues/187) for details.

### Using the map
Read the [MAPPING](MAPPING.md) guide on how you can map turn restrictions using Mapillary.

### Tilesets

The map uses various custom Mapbox tilesets maintained by @planemad that has OSM navigation data extracted via overpass/[shaktimaan](https://github.com/geohacker/shaktiman). The tilesets are updated infrequently, please request an update if required.

- Project cities boundaries - [`maning.worldcities`](https://www.mapbox.com/studio/tilesets/maning.worldcities/)
- OSM turn restrictions `type=restriction` - [`planemad.osmturnrestrictions`](https://www.mapbox.com/studio/tilesets/planemad.osmturnrestrictions/)
- OSM turn lanes `turn:lanes` `turn:lanes:forward` `turn:lanes:backward`  - [`planemad.osmturnlanes`](https://www.mapbox.com/studio/tilesets/planemad.osmturnlanes/)
- OSM traffic signals `highway=traffic_signals` - [`planemad.osmtrafficsignals`](https://www.mapbox.com/studio/tilesets/planemad.osmtrafficsignals/)
- OSM speed limits `maxspeed=*` - [`planemad.osmmaxspeed`](https://www.mapbox.com/studio/tilesets/planemad.osmmaxspeed/)
- OSM access restrictions `access=*` - [`planemad.osmaccess`](https://www.mapbox.com/studio/tilesets/planemad.osmaccess/)

### Develop

* git clone
* `npm install && npm start`
