## OpenStreetMap Navigation Map

The [OpenStreetMap Navigation map](http://mapbox.github.io/osm-navigation-map/) is a web application which uses [Mapillary vector layer](http://blog.mapillary.com/update/2015/05/27/vectortiles.html) to highlight the traffic signages detected in Mapillary images. The application is helpful to add/verify/modify turn-restrictions on OpenStreetMap.

![image](https://cloud.githubusercontent.com/assets/3423533/18305622/07e3b772-7506-11e6-9367-e1fed45eb10a.png)

### Develop

* git clone
* `npm install && npm start`

### Tilesets

The map uses various custom Mapbox tilesets maintained by @planemad that has OSM navigation data extracted via overpass/[shaktimaan](https://github.com/geohacker/shaktiman). The tilesets are updated infrequently, please request an update if required.

- Project cities boundaries - [`maning.worldcities`](https://www.mapbox.com/studio/tilesets/maning.worldcities/)
- OSM turn restrictions `type=restriction` - [`planemad.osmturnrestrictions`](https://www.mapbox.com/studio/tilesets/planemad.osmturnrestrictions/)
- OSM turn lanes `turn:lanes` `turn:lanes:forward` `turn:lanes:backward`  - [`planemad.osmturnlanes`](https://www.mapbox.com/studio/tilesets/planemad.osmturnlanes/)
- OSM traffic signals `highway=traffic_signals` - [`planemad.osmtrafficsignals`](https://www.mapbox.com/studio/tilesets/planemad.osmtrafficsignals/)
- OSM speed limits `maxspeed=*` - [`planemad.osmmaxspeed`](https://www.mapbox.com/studio/tilesets/planemad.osmmaxspeed/)
- OSM access restrictions `access=*` - [`planemad.osmaccess`](https://www.mapbox.com/studio/tilesets/planemad.osmaccess/)

### Interface

OpenStreetMap Navigation Map consists of 3 layers which helps you to navigate between OpenStreetMap data and Mapillary data.

![image](https://cloud.githubusercontent.com/assets/3423533/18305101/91e3a9e4-7503-11e6-9cfc-857bccdcd322.png)

- **Tile Boundaries** : Tile boundaries is a overlay layer which divides the map into tiles which is visible after zoom10. This layer helps to divides the working area/city into blocks and make sure that mappers don't work on the same area.

![image](https://cloud.githubusercontent.com/assets/3423533/18306061/c3270eb6-7507-11e6-9b16-8cc30b2273f5.png)

*Image showing tile boundaries along with tile numbers*

- **Oneways** : The Oneway layer highlights the roads with `oneway` tag in OpenStreetMap which helps the mapper to analyse the turn-restriction and the road data before adding it.

![image](https://cloud.githubusercontent.com/assets/3423533/18305778/b6806eec-7506-11e6-9831-7704f479b4a2.png)

*Image showing `oneways` highlighted in map style*

- **Mapillary Street Photos** : Mapillary Street Photos enables the Mapillary vector layer on the map which highlights the detected images with signages in it. The arrow on the GPS traces indicate the direction of the Mapillary sequence.

![mapillary-traces](https://cloud.githubusercontent.com/assets/3423533/18306030/a739ef34-7507-11e6-8385-b120b1774f92.png)

*Image showing Mapillary traces in map style*

### Map Styles

OpenStreetMap Navigation map highlights different features present in OpenStreetMap and Mapillary detected signs in different colours. Below is the description on colours used in the map style:

- **Mapillary detected Turn-restriction** : The turn-restrictions detected on Mapillary vector layer are shown in the form on respective detected icons. The turn-restriction signages differ from country to country. Below are few examples:

![trs2](https://cloud.githubusercontent.com/assets/3423533/18307853/c9bbc9a8-750f-11e6-8784-a9236abf51b9.png)

- **Turn-Restriction present on OpenStreetMap** : The map shows the turn-restrictions present on OpenStreetMap for the mapper to get the overview of the detection and go forward.
    - **No-turns** : No turn-restriction like `no-left-turn`, `no-right-turn`, `no-u-turn` and `no-straight-on` are styled with
        - `from` as yellow line.
        - `via` as red circle/dashed-line.(orange in case of `no-u-turn`)
        - `to` as red dashed-line.
    ![t1](https://cloud.githubusercontent.com/assets/3423533/18308365/d315c7fe-7511-11e6-975f-179da21a1997.png)</br>![uturn](https://cloud.githubusercontent.com/assets/3423533/18378323/eaad3342-7689-11e6-8d20-862fbae5f478.png)

    - **Only-turns** : Only turn-restriction like `only-left-turn`, `only-right-turn` and `only-straight-on` are styled with
        - `from` as yellow line.
        - `via` as blue dot/line.
        - `to` as in blue dashed-line.
    ![tt1](https://cloud.githubusercontent.com/assets/3423533/18308794/b46a4576-7513-11e6-879c-b5f85a739080.png)


### Workflow

#### Step 1

**Login to OpenStreetMap** : Logging-in to your OpenStreetMap account helps to know who reviewed the detected turn-restriction.

![image](https://cloud.githubusercontent.com/assets/3423533/18309190/b8eea1bc-7515-11e6-9f70-1365530f3b27.png)

#### Step 2

**Detecting turn-restriction images** : The position of the detected signage will be a probable location of the turn-restriction.

![des](https://cloud.githubusercontent.com/assets/3423533/18381733/4ce24852-769b-11e6-8de8-f5065ee967c4.png)

1. When clicked on the specific detected signage, you get to edit add/edit the label for the turn-restriction.
2. The respective images location of detected signage is highlighted as **big** `green arrow`. The highlighted green arrow have the signage in it and lets you to play the sequence of the images to get an overview of   where the turn-restriction is applicable when you click on it.
3. The detected image Mapillary sequence can be played to see the images and get the identify better image with signage.
4. laying the sequence all the photos present in that sequence are shown as smaller green arrows. We can also open image in a new tab to get a wider picture of the turn restriction by clicking on the image.

*Note : Sometimes the popup might hide the detected image location. Close the popup to find green-arrows with image location*

![nav41](https://cloud.githubusercontent.com/assets/3423533/18381323/563d0e2a-7699-11e6-8006-d129647f8909.gif)

#### Step 3

**Add/Verify/Modify turn-restriction** : While navigating in the navigation map using image sequence, we can find out where and to which junction the turn-restriction applies to.

- Click on `Edit Map` to edit using iD editor - Follow instructions [here](https://github.com/mapbox/mapping/wiki/Mapping-guide-for-adding-turn-restrictions-using-Mapillary#mapping-turn-restrictions-with-id-editor) on how to add turn-restriction in iD editor.
- When clicked on detected signage, the map view bounding box will be downloaded as layer in JOSM (if JOSM is open) - Follow instruction [here](https://github.com/mapbox/mapping/wiki/Mapping-guide-for-adding-turn-restrictions-using-Mapillary#mapping-turn-restrictions-with-josm) on how to add turn-restriction in JOSM editor.


#### Step 4

**Label reviewed turn-restriction** : Once done, update the status of the restriction on the OSM navigation map:

![screenshot 2016-09-07 16 52 16](https://cloud.githubusercontent.com/assets/3423533/18310334/57f6d59a-751b-11e6-8f31-a879cb6aaaef.png)

- `Valid` - The detected restriction is valid and is either already present on OpenStreetMap or added to OpenStreetMap base dont his workflow.
- `Redundant` - The detected restriction is correct but is not necessary to be added to OpenStreetMap since it is redundant for routing. eg. A no left turn against a oneway road.
- `Invalid` - The detected restriction on Mapillary is incorrect. *Do not add to the map*
- `Note` - An OpenStreetMap note can be added if you want any local mapper to verify the turn-restriction before it is added to OpenStreetMap.

*Note : For junctions where same signage is detected multiple times, review one of them and leave the rest unattended and do not label them with any of the above.*
