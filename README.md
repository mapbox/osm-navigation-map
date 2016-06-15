# osm-navigation-map
A map to explore navigation data in OpenStreetMap.

**Tilesets**
The map uses various custom Mapbox tilesets maintained by @planemad that has OSM navigation data extrated via overpass/[shaktimaan](https://github.com/geohacker/shaktiman). The tilesets are updated infrequently, please request an update if required.

- OSM turn restrictions `type=restriction` - `planemad.osmturnrestrictions`
- OSM turn lanes `turn:lanes` `turn:lanes:forward` `turn:lanes:backward`  - `planemad.osmturnlanes`
- OSM traffic signals `highway=traffic_signals` - `planemad.osmtrafficsignals`
- OSM speed limits `maxspeed=*` - `planemad.osmmaxspeed`
- OSM access restrictions `access=*` - `planemad.osmaccess`
