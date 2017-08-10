var DATASETS_PROXY_URL = 'https://57cj94alhd.execute-api.us-east-1.amazonaws.com/testing/features';

var MAPBOX_DATA_TEAM = require('mapbox-data-team').getUsernames();

var MAPILLARY_CLIENT_ID = "MFo5YmpwMmxHMmxJaUt3VW14c0ZCZzphZDU5ZDBjNTMzN2Y3YTE3";

var cover = require('tile-cover');
var turf = require('turf');
var hat = require('hat');

var osmAuth = require('osm-auth');
var auth = require('./auth');
auth.update();

var queryOverpass = require('query-overpass');

var reviewer, mapillaryId, mapillaryImageKey;

mapboxgl.accessToken = 'pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/planemad/cinpwopfb008hcam0mqxbxwuq',
    center: [-105.2, 44.6],
    zoom: 3.5,
    hash: true,
    attributionControl: false,
    keyboard: false
});

map.addControl(new mapboxgl.Navigation({
    position: 'top-right'
}));
map.addControl(new mapboxgl.Geocoder({
    container: 'geocoder-container'
}));

var mly = new Mapillary.Viewer('mly', MAPILLARY_CLIENT_ID);
$('#mly').hide();

// Layer for review markers
var reviewedRestrictionsSource = new mapboxgl.GeoJSONSource({
    data: {}
});
var reviewedRestrictions = {
    'id': 'reviewedRestrictions',
    'type': 'circle',
    'source': 'reviewedRestrictionsSource',
    'interactive': true,
    'layout': {
        visibility: 'visible'
    },
    'paint': {
        'circle-radius': {
            "stops": [
                [5, 1],
                [14, 14]
            ]
        },
        'circle-blur': {
            'stops': [
                [12, 1],
                [14, 0]
            ]
        },
        'circle-color': {
            'property': 'status',
            'type': 'categorical',
            'stops': [
                ['valid', '#52a1d8'],
                ['redundant', '#fbb03b'],
                ['invalid', '#e55e5e'],
                ['note', '#8a8acb']
            ]
        },
        'circle-opacity': {
            'stops': [
                [13.9, 1],
                [14, 0.5]
            ]
        }
    }
};

// Define switchable map layers
var toggleLayers = {
    'turn-restrictions': {
        'layers': ['noturn', 'noturn from', 'noturn via', 'noturn via highlight', 'noturn labels'],
        'title': 'Turn restrictions',
        'description': 'Junctions where a regular turn is prohibited'
    },
    'oneways': {
        'layers': ['oneways', 'oneways arrows'],
        'title': 'Oneway Streets',
        'description': 'Includes oneways segments part of a two way dual carriageway road'
    },
    'traffic-signals': {
        'layers': ['trafficsignals'],
        'title': 'Traffic signals',
        'description': 'Junctions with a street light'
    },
    'turn-lanes': {
        'layers': ['turnlanes'],
        'title': 'Turn lanes',
        'description': 'Streets with turn restricted lanes'
    },
    'maxspeed': {
        'layers': ['maxspeed', 'maxspeed labels'],
        'title': 'Speed limits',
        'description': 'Legal speed limits'
    }
};

// Define switchable map layer filters
var toggleFilters = {
    'mapbox-team': {
        'filter-mode': 'any',
        'filter-compare': ['==', 'meta_user'],
        'filter-values': MAPBOX_DATA_TEAM
    }
}

// Add Mapillary sprites
// var style = map.getStyle();
// style.sprite = 'https://www.mapillary.com/sprites/';
// map.setStyle(style);

// Map ready
map.on('style.load', function(e) {
    init();

    showOnlyLayers(toggleLayers, null);

    // Highlight only team edits
    // toggleLayerFilters('turn-restrictions','mapbox-team');

    // Toggle map layers list
    $('.toggles a').on('click', function(e) {
        e.preventDefault();
        var toggleItem = e.target.id.split('#')[0];

        // Highlight clicked item
        $(this).toggleClass('active');

        // Mapillary overlay toggle
        if (toggleItem === 'mapillary') {
            toggleMapillary();
        } else if(toggleItem === 'tileBoundaryLayer') {
            toggleTileBoundary();
        } else {
            var layers = toggleLayers[toggleItem].layers;
            for (var i in layers) {
                toggle(layers[i]);
            }
        }

        // Style layers toggle

        // Object.keys(toggleLayers).forEach(function (type) {
        //   if (type != listId) {
        //     hide(toggleLayers[type].id);
        //   }
        // });



        // setInfo(toggleItem);
    });
    $('#mapillary').click(); // Show Mapillary layer
});

function init() {
    // do all initialisation stuff here
    var mapillaryTrafficSigns = {
        "type": "vector",
        "tiles": [
            "https://a.mapillary.com/v3/tiles/objects/{z}/{x}/{y}.mvt?layers=mapillary-objects-trafficsigns&client_id=" + MAPILLARY_CLIENT_ID,
        ],
        "minzoom": 14,
        "maxzoom": 19
    };

    var mapillaryCoverage = {
        "type": "vector",
        "tiles": [
            "https://d25uarhxywzl1j.cloudfront.net/v0.1/{z}/{x}/{y}.mvt"
        ],
        "maxzoom": 14
    };

    var osmTurnRestrictions = {
        "type": "geojson",
        "data": {
            "type": "FeatureCollection",
            "features": []
        }
    };

    var tileBoundarySource = {
        "type": "geojson",
        "data": ""
    };

    map.addSource("mapillary", mapillaryTrafficSigns);
    map.addSource("mapillaryCoverage", mapillaryCoverage);
    map.addSource("reviewedRestrictionsSource", reviewedRestrictionsSource);
    map.addSource("osmTurnRestrictions", osmTurnRestrictions);
    map.addSource("tileBoundarySource", tileBoundarySource);
    map.addLayer(reviewedRestrictions);

    // Fetch data every 10 minutes
    refreshData(10);

    var mapillaryRestrictionsFilter = [
      "all",
      ["in", "value", "regulatory--no-left-turn--g1", "regulatory--no-left-turn--g2", "regulatory--no-right-turn--g1", "regulatory--no-right-turn--g2", "regulatory--no-straight-through--g1", "regulatory--no-u-turn--g1", "regulatory--no-left-or-u-turn--g1", "regulatory--turn-left--g1", "regulatory--turn-right--g1", "regulatory--go-straight--g1", "regulatory--go-straight-or-turn-left--g1", "regulatory--go-straight-or-turn-right--g1", "regulatory--turn-left-ahead--g1", "regulatory--turn-right-ahead--g1"],
      [">=", "updated_at", Date.now() - 86400000 * 90],
    ];

    var mapillaryCoverageFilter = [
      ">=", "captured_at", Date.now() - 86400000 * 90
    ];

    var days = location.search;

    if (days) {
        days = days.split('=')[1];
        mapillaryRestrictionsFilter[2] = [">=", "updated_at", Date.now() - 86400000 * parseInt(days, 10)];
        mapillaryCoverageFilter = [">=", "captured_at", Date.now() - 86400000 * parseInt(days, 10)];
    } else {
        updateUrl('90');
    }

    function updateUrl(days) {
        location.search = '?days=' + days;
    }

    var mapillaryTraffic = {
        "id": "mapillaryTraffic",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'mapillary-objects-trafficsigns',
        'layout': {
            'visibility': 'none'
        },
        "paint": {
            "circle-radius": 2,
            "circle-color": "white",
            "circle-opacity": {
                "stops": [
                    [14, 0.5],
                    [16, 1]
                ]
            }
        }
    };

    var mapillaryTrafficRestrictions = {
        "id": "mapillaryTrafficRestrictions",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'mapillary-objects-trafficsigns',
        'layout': {
            'visibility': 'none'
        },
        "paint": {
            "circle-radius": 9,
            "circle-color": "hsl(112, 0%, 100%)"
        },
        "filter": mapillaryRestrictionsFilter
    };

    var mapillaryCoverageLine = {
        "id": "mapillaryCoverageLine",
        "type": "line",
        "source": "mapillaryCoverage",
        "source-layer": "mapillary-sequences",
        "layout": {
            "visibility": "none"
        },
        "paint": {
            "line-color": 'white',
            "line-width": {
                "stops": [
                    [8, 1],
                    [13, 3],
                    [16, 1]
                ]
            },
            "line-opacity": {
                "stops": [
                    [8, 0.2],
                    [13, 0.7],
                    [16, 0.4]
                ]
            }
        },
        "filter": mapillaryCoverageFilter
    };

    var mapillaryCoverageLineDirection = {
        "id": "mapillaryCoverageLineDirection",
        "type": "symbol",
        "source": "mapillaryCoverage",
        "source-layer": "mapillary-sequences",
        "layout": {
            "icon-image": "mapillary-direction",
            "icon-rotation-alignment": "map",
            "icon-keep-upright": false,
            "symbol-spacing": 100,
            "icon-rotate": 90,
            "icon-allow-overlap": false,
            "symbol-placement": "line",
            "visibility": "none",
            "icon-size": {
                "base": 1,
                "stops": [
                    [
                        14,
                        0
                    ],
                    [
                        16,
                        1
                    ]
                ]
            },
            "icon-ignore-placement": false
        },
        "paint": {
            "icon-opacity": 1
        },
        "filter": mapillaryCoverageFilter
    };

    var mapillaryTrafficHighlight = {
        "id": "mapillaryTrafficHighlight",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'mapillary-objects-trafficsigns',
        "layout": {
            "visibility": "none"
        },
        "paint": {
            "circle-radius": 15,
            "circle-opacity": 0.3,
            "circle-color": "white"
        },
        "filter": ["==", "key", ""]
    };

    var mapillaryTrafficLabel = {
        "id": "mapillaryTrafficLabel",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "mapillary-objects-trafficsigns",
        "layout": {
            "text-field": "{value}",
            "text-size": 8,
            "text-offset": [0, 2],
            "visibility": "none"
        },
        "paint": {
            "text-color": "white",
            "text-halo-color": "black",
            "text-halo-width": 1,
            "text-opacity": {
                "stops": [
                    [14, 0],
                    [18, 1]
                ]
            }
        }
    };

    var mapillaryTrafficRestrictionsIcon = {
        "id": "mapillaryTrafficRestrictionsIcon",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "mapillary-objects-trafficsigns",
        "layout": {
            "icon-image": "{value}",
            'icon-image': '{value}',
            'icon-allow-overlap': true,
            'icon-size': 0.8,
            'visibility': 'none'
        },
        "filter": mapillaryRestrictionsFilter
    };

    var mapillaryTrafficRestrictionsLabel = {
        "id": "mapillaryTrafficRestrictionsLabel",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "mapillary-objects-trafficsigns",
        "layout": {
            "text-field": "{value}",
            "text-size": 14,
            "text-offset": [0, 2],
            "text-font": ["Clan Offc Pro Bold"],
            "visibility": "none",
            'text-allow-overlap': false
        },
        "paint": {
            "text-color": "hsl(112, 100%, 50%)",
            "text-halo-color": "black",
            "text-halo-width": 1,
            "text-opacity": {
                "stops": [
                    [15, 0],
                    [16, 1]
                ]
            }
        },
        "filter": mapillaryRestrictionsFilter
    };

    var mapillaryImages = {
        'id': 'mapillaryImages',
        'type': 'symbol',
        'source': 'mapillaryCoverage',
        'source-layer': 'mapillary-images',
        'layout': {
            'visibility': 'visible',
            'icon-image': 'Pointer-1',
            'icon-rotate': {
              'property': 'ca',
              'stops': iconRotations()
            }
        },
        'filter': ['==', 'key', '']
    };

    var mapillaryImagesHighlight = {
        'id': 'mapillaryImagesHighlight',
        'type': 'symbol',
        'source': 'mapillaryCoverage',
        'source-layer': 'mapillary-images',
        'layout': {
            'visibility': 'visible',
            'icon-image': 'Pointer-1-focus',
            'icon-rotate': {
              'property': 'ca',
              'stops': iconRotations()
            }
        },
        'filter': ['==', 'key', '']
    };

    var mapillarySequence = {
        'id': 'mapillarySequence',
        'type': 'symbol',
        'source': 'mapillaryCoverage',
        'source-layer': 'mapillary-images',
        'layout': {
            'visibility': 'visible',
            'icon-image': 'Pointer-2',
            'icon-rotate': {
              'property': 'ca',
              'stops': iconRotations()
            }
        },
        'filter': ['==', 'skey', '']
    };

    var mapillarySequenceHighlight = {
        'id': 'mapillarySequenceHighlight',
        'type': 'symbol',
        'source': 'mapillaryCoverage',
        'source-layer': 'mapillary-images',
        'layout': {
            'visibility': 'visible',
            'icon-image': 'Pointer-2-focus',
            'icon-rotate': {
              'property': 'ca',
              'stops': iconRotations()
            }
        },
        'filter': ['==', 'key', '']
    };

    var osmNoStraightFrom = {
        'id': 'no-straight-from',
        'type': 'line',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "LineString"
            ],
            [
                "==",
                "relations_role",
                "from"
            ]
        ],
        "layout": {
            "visibility": "visible",
            "line-cap": "butt",
            "line-join": "round"
        },
        "paint": {
            "line-color": "hsl(49, 71%, 58%)",
            "line-opacity": {
                "base": 1,
                "stops": [
                    [
                        14.9,
                        0
                    ],
                    [
                        15.1,
                        0.5
                    ]
                ]
            },
            "line-width": 4
        }
    };

    var osmNoStraightTo = {
        'id': 'no-straight-to',
        'type': 'line',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "LineString"
            ],
            [
                "all",
                [
                    "==",
                    "relations_role",
                    "to"
                ],
                [
                    "in",
                    "relations_reltags_restriction",
                    "no_left_turn",
                    "no_right_turn",
                    "no_straight_on",
                    "no_u_turn"
                ]
            ]
        ],
        "layout": {
            "visibility": "visible",
            "line-cap": "round",
            "line-join": "round"
        },
        "paint": {
            "line-color": "hsl(0, 91%, 55%)",
            "line-opacity": {
                "base": 1,
                "stops": [
                    [
                        14.9,
                        0
                    ],
                    [
                        15.1,
                        0.7
                    ]
                ]
            },
            "line-dasharray": {
                "base": 1,
                "stops": [
                    [
                        15,
                        [
                            1,
                            2
                        ]
                    ],
                    [
                        18,
                        [
                            4,
                            4
                        ]
                    ]
                ]
            },
            "line-width": 2
        }
    };

    var osmOnlyTo = {
        'id': 'only-to',
        'type': 'line',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "LineString"
            ],
            [
                "all",
                [
                    "==",
                    "relations_role",
                    "to"
                ],
                [
                    "in",
                    "relations_reltags_restriction",
                    "only_left_turn",
                    "only_right_turn",
                    "only_straight_on"
                ]
            ]
        ],
        "layout": {
            "visibility": "visible",
            "line-cap": "round",
            "line-join": "round"
        },
        "paint": {
            "line-color": "hsl(206, 100%, 50%)",
            "line-opacity": {
                "base": 1,
                "stops": [
                    [
                        14.9,
                        0
                    ],
                    [
                        15.1,
                        0.7
                    ]
                ]
            },
            "line-width": 3,
            "line-dasharray": {
                "base": 1,
                "stops": [
                    [
                        15,
                        [
                            3,
                            1
                        ]
                    ],
                    [
                        18,
                        [
                            6,
                            2
                        ]
                    ]
                ]
            }
        }
    };

    var osmToConditional = {
        'id': 'to-conditional',
        'type': 'line',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "LineString"
            ],
            [
                "all",
                [
                    "!has",
                    "relations_reltags_restriction"
                ],
                [
                    "==",
                    "relations_role",
                    "to"
                ]
            ]
        ],
        "layout": {
            "visibility": "visible",
            "line-cap": "round",
            "line-join": "round"
        },
        "paint": {
            "line-color": "hsl(0, 91%, 55%)",
            "line-opacity": {
                "base": 1,
                "stops": [
                    [
                        14.9,
                        0
                    ],
                    [
                        15.1,
                        0.7
                    ]
                ]
            },
            "line-dasharray": {
                "base": 1,
                "stops": [
                    [
                        15,
                        [
                            1,
                            2
                        ]
                    ],
                    [
                        18,
                        [
                            4,
                            4
                        ]
                    ]
                ]
            },
            "line-width": 2
        }
    };

    var osmNoUVia = {
        'id': 'no-u-via',
        'type': 'line',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "LineString"
            ],
            [
                "==",
                "relations_role",
                "via"
            ]
        ],
        "layout": {
            "visibility": "visible",
            "line-cap": "round",
            "line-join": "round"
        },
        "paint": {
            "line-color": "hsl(29, 100%, 50%)",
            "line-opacity": {
                "base": 1,
                "stops": [
                    [
                        14.9,
                        0
                    ],
                    [
                        15.1,
                        0.7
                    ]
                ]
            },
            "line-dasharray": [
                1,
                2
            ],
            "line-width": 3
        }
    };

    var osmNoStraightViaNodes = {
        'id': 'no-straight-via-nodes',
        'type': 'circle',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "Point"
            ],
            [
                "all",
                [
                    "==",
                    "relations_role",
                    "via"
                ],
                [
                    "in",
                    "relations_reltags_restriction",
                    "no_left_turn",
                    "no_right_turn",
                    "no_straight_on",
                    "no_u_turn"
                ]
            ]
        ],
        "layout": {
            "visibility": "visible"
        },
        "paint": {
            "circle-color": "hsl(0, 66%, 53%)",
            "circle-opacity": {
                "base": 1,
                "stops": [
                    [
                        13.9,
                        0
                    ],
                    [
                        14,
                        0.6
                    ]
                ]
            },
            "circle-radius": {
                "base": 1,
                "stops": [
                    [
                        10,
                        4
                    ],
                    [
                        13.9,
                        6
                    ],
                    [
                        14,
                        5
                    ]
                ]
            }
        }
    };

    var osmOnlyViaNodes = {
        'id': 'only-via-nodes',
        'type': 'circle',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "Point"
            ],
            [
                "all",
                [
                    "==",
                    "relations_role",
                    "via"
                ],
                [
                    "in",
                    "relations_reltags_restriction",
                    "only_left_turn",
                    "only_right_turn",
                    "only_straight_on"
                ]
            ]
        ],
        "layout": {
            "visibility": "visible"
        },
        "paint": {
            "circle-color": "hsl(206, 100%, 50%)",
            "circle-opacity": {
                "base": 1,
                "stops": [
                    [
                        13.9,
                        0
                    ],
                    [
                        14,
                        0.6
                    ]
                ]
            },
            "circle-radius": {
                "base": 1,
                "stops": [
                    [
                        10,
                        4
                    ],
                    [
                        13.9,
                        6
                    ],
                    [
                        14,
                        5
                    ]
                ]
            }
        }
    };

    var osmViaNodesConditional = {
        'id': 'via-nodes-conditional',
        'type': 'circle',
        'source': 'osmTurnRestrictions',
        "filter": [
            "all",
            [
                "==",
                "$type",
                "Point"
            ],
            [
                "all",
                [
                    "!has",
                    "relations_reltags_restriction"
                ],
                [
                    "==",
                    "relations_role",
                    "via"
                ]
            ]
        ],
        "layout": {
            "visibility": "visible"
        },
        "paint": {
            "circle-color": "hsl(0, 66%, 53%)",
            "circle-opacity": {
                "base": 1,
                "stops": [
                    [
                        12,
                        0.4
                    ],
                    [
                        14,
                        0.6
                    ]
                ]
            },
            "circle-radius": {
                "base": 1,
                "stops": [
                    [
                        10,
                        4
                    ],
                    [
                        13.9,
                        6
                    ],
                    [
                        14,
                        5
                    ]
                ]
            }
        }
    };

    var tileBoundaryLayer = {
        'id': 'tileBoundaryLayer',
        'type': 'line',
        'source': 'tileBoundarySource',
        'layout': {
            'visibility': 'none',
        },
        "paint": {
            "line-color": 'red',
        }
    };

    var tileBoundaryTextLayer = {
        'id': 'tileBoundaryTextLayer',
        'type': 'symbol',
        'source': 'tileBoundarySource',
        'layout': {
            'visibility': 'none',
            "text-field": "{id}",
            "text-size": 14,
            "text-offset": [4, 4],
        },
        "paint": {
            "text-color": 'red',
        }
    };

    map.addLayer(mapillaryCoverageLine, 'noturn');
    map.addLayer(mapillaryCoverageLineDirection);

    map.addLayer(osmNoStraightFrom);
    map.addLayer(osmNoStraightTo);
    map.addLayer(osmOnlyTo);
    map.addLayer(osmToConditional);
    map.addLayer(osmNoUVia);
    map.addLayer(osmNoStraightViaNodes);
    map.addLayer(osmOnlyViaNodes);
    map.addLayer(osmViaNodesConditional);

    map.addLayer(mapillaryTrafficHighlight);
    map.addLayer(mapillaryTrafficLabel);
    map.addLayer(mapillaryTrafficRestrictions, 'noturn');
    map.addLayer(mapillaryTraffic, 'noturn');
    map.addLayer(mapillaryTrafficRestrictionsIcon);
    map.addLayer(mapillaryTrafficRestrictionsLabel);

    map.addLayer(mapillaryImages);
    map.addLayer(mapillaryImagesHighlight);
    map.addLayer(mapillarySequence, 'mapillaryImages');
    map.addLayer(mapillarySequenceHighlight, 'mapillaryImagesHighlight');

    map.addLayer(tileBoundaryLayer, 'tileBoundaryLayer');
    map.addLayer(tileBoundaryTextLayer,'tileBoundaryTextLayer');

    document.getElementById('logout').onclick = function() {
        auth.logout();
        auth.update();
    };

    updateRestrictionValidator();
    map.on('moveend', function () {
        updateRestrictionValidator();
        var tileBoundarybutton = document.getElementById('tileBoundaryLayer');
        if (map.getZoom() >= 10 && tileBoundarybutton.classList.contains('active')) {
            showTileBoundary();
        } else {
            hideTileBoundary();
        }
    });

    function updateRestrictionValidator() {
        var zoom = Math.round(map.getZoom());
        var lat = map.getCenter().lat;
        var lng = map.getCenter().lng;
        if (zoom > 14) {
            document.getElementById('restrictionValidator').style.display = 'block';
            document.getElementById('restrictionValidator').onclick = function () {
                window.open('http://restrictions.morbz.de/#' + zoom + '/' + lat + '/' + lng);
            };
        }   else {
            document.getElementById('restrictionValidator').style.display = 'none';
        }
    }

    map.on('click', function(e) {
        var mapillaryRestrictions = map.queryRenderedFeatures([
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ], {
            layers: ['mapillaryTraffic']
        });


        if (mapillaryRestrictions.length) {
            var restriction = mapillaryRestrictions[0];

            var detections = restriction.properties.detections;
            var imageKeys = JSON.parse(detections).map(function(detections) {
                return detections.image_key;
            });

            var restrictionKey = restriction.properties.key;

            map.setFilter('mapillaryTrafficHighlight', ['==', 'key', restrictionKey]);
            map.setFilter('mapillaryImages', ['in', 'key'].concat(imageKeys));
            map.setFilter('mapillaryImagesHighlight', ['==', 'key', '']);
            map.setFilter('mapillarySequence', ['==', 'skey', '']);
            map.setFilter('mapillarySequenceHighlight', ['==', 'key', '']);

            $('#mly').hide();

            openInJOSM();
        }

        var mapillaryImages = map.queryRenderedFeatures([
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ], {
            layers: ['mapillaryImages']
        });

        if (mapillaryImages.length) {
            var image = mapillaryImages[0];
            var imageKey = image.properties.key;
            var sequenceKey = image.properties.skey;

            mapillaryId = imageKey;
            mapillaryImageKey = imageKey;

            map.setFilter('mapillaryImagesHighlight', ['==', 'key', image.properties.key]);

            $('#mly').show();
            mly.moveToKey(imageKey);
        }

        var mapillarySequence = map.queryRenderedFeatures([
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ], {
            layers: ['mapillarySequence']
        });

        if (mapillarySequence.length) {
            var image = mapillarySequence[0];
            var imageKey = image.properties.key;

            mapillaryImageKey = imageKey;

            map.setFilter('mapillarySequenceHighlight', ['==', 'key', image.properties.key]);

            mly.moveToKey(imageKey);
        }

        // Show popup of OSM feature
        var osmFeature = map.queryRenderedFeatures(e.point, {
            layers: ['noturn']
        });
        if (osmFeature.length) {

            // Check if feature is node or a way
            var osmType = osmFeature[0].geometry.type == 'LineString' ? 'way' : 'node';
            var point = osmType == 'way' ? e.lngLat : osmFeature[0].geometry.coordinates;
            var popupHTML = "<strong>OpenStreetMap Turn Restriction</strong><br>" + osmType + "</b>: <a href='https://www.openstreetmap.org/" + osmType + "/" + osmFeature[0].properties.id + "'>" + osmFeature[0].properties.id + "</a>"

            var popup = new mapboxgl.Popup()
                .setLngLat(point)
                .setHTML(popupHTML)
                .addTo(map);
            openInJOSM();
        }

        // Add review marker
        var newfeaturesGeoJSON = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "coordinates": [

                ],
                "type": "Point"
            },

        };

        // Create review popup if there is a mapillary restriction nearby
        if (mapillaryRestrictions.length) {

            var restriction = mapillaryRestrictions[0].properties.value;

            if (!featuresGeoJSON.features.length) {
                console.log("This is an empty dataset");
                reviewFeature();

            } else {

                var reviewedFeatures = map.queryRenderedFeatures(e.point, {
                    layers: ['reviewedRestrictions']
                });
                if (reviewedFeatures.length) {
                    reviewFeature(reviewedFeatures[0]);

                    // var popupHTML = "<h3>" + restriction + "</h3>" + "already reviewed as " + reviewedFeatures[0].properties["status"];
                    // var popup = new mapboxgl.Popup()
                    //     .setLngLat(e.lngLat)
                    //     .setHTML(popupHTML)
                    //     .addTo(map);

                } else {
                    reviewFeature();
                }
            }

            function reviewFeature(feature) {
                var formOptions = "<div class='radio-pill pill pad2y clearfix' style='width:350px'><input id='valid' type='radio' name='review' value='valid' checked='checked'><label for='valid' class='col3 button short icon check fill-green'>Valid</label><input id='redundant' type='radio' name='review' value='redundant'><label for='redundant' class='col3 button short icon check fill-mustard'>Redundant</label><input id='invalid' type='radio' name='review' value='invalid'><label for='invalid' class='col3 button icon short check fill-red'>Invalid</label><input id='note' type='radio' name='review' value='note'><label for='note' class='col3 button icon short check fill-purple'>Note</label></div>";
                var formReviewer;
                var popupHTML;
                if (auth.authenticated()) {
                    formReviewer = "<fieldset><label>Reviewed by: <span id='reviewer' style='padding:5px;background-color:#eee'></span></label><label>User: <span id='currentReviewer' style='padding:5px;background-color:#eee'></span></label></fieldset>";
                    popupHTML = "<h3>" + restriction + " <a class='short button' target='_blank' href='https://www.openstreetmap.org/edit?editor=id#map=20/" + e.lngLat.lat + "/" + e.lngLat.lng + "'>Edit Map</a></h3><form>" + formOptions + formReviewer + "<a id='saveReview' class='button col4' href='#'>Save</a><a id='deleteReview' class='button quiet fr col4' href='#' style=''>Delete</a></form>";
                } else {
                    formReviewer = "<fieldset><label>Reviewed by: <span id='reviewer' style='padding:5px;background-color:#eee'></span></label></fieldset>";
                    popupHTML = "<h3>" + restriction + " <a class='short button' target='_blank' href='https://www.openstreetmap.org/edit?editor=id#map=20/" + e.lngLat.lat + "/" + e.lngLat.lng + "'>Edit Map</a></h3><form>" + formOptions + formReviewer + "<a id='authenticate' class='button col4' href='#'>Login</a></form>";
                }

                var popup = new mapboxgl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(popupHTML)
                    .addTo(map);

                // Show existing status if available
                if (feature) {
                    $("input[name=review][value=" + feature.properties["status"] + "]").prop('checked', true);
                    $("#reviewer").html(feature.properties["reviewed_by"]);
                    newfeaturesGeoJSON = feature;
                    newfeaturesGeoJSON["id"] = feature.properties["id"];
                    console.log(feature);
                } else {
                    newfeaturesGeoJSON.properties["name"] = restriction;
                    newfeaturesGeoJSON.geometry.coordinates = e.lngLat.toArray();
                }

                if (auth.authenticated()) {
                    var userName = document.getElementById('user').innerHTML;
                    $("#currentReviewer").html(userName);

                    // Update dataset with feature status on clicking save
                    document.getElementById("saveReview").onclick = function() {
                        newfeaturesGeoJSON.properties["status"] = $("input[name=review]:checked").val();
                        reviewer = $("input[name=reviewer]").val();
                        newfeaturesGeoJSON.properties["reviewed_by"] = reviewer;
                        newfeaturesGeoJSON.properties["reviewed_on"] = Date.now();
                        newfeaturesGeoJSON.properties["mapillary_id"] = mapillaryId;
                        popup.remove();
                        newfeaturesGeoJSON["id"] = newfeaturesGeoJSON["id"] || hat();
                        $.ajax({
                          url: DATASETS_PROXY_URL + "/" + newfeaturesGeoJSON["id"],
                          type: "PUT",
                          contentType: "application/json",
                          data: JSON.stringify(newfeaturesGeoJSON)
                        }).done(function(response) {
                          featuresGeoJSON.features = featuresGeoJSON.features.concat(response);
                          reviewedRestrictionsSource.setData(featuresGeoJSON);
                        });
                    };
                    // Delete feature on clicking delete
                    document.getElementById("deleteReview").onclick = function() {
                        popup.remove();
                        $.ajax({
                          url: DATASETS_PROXY_URL + "/" + newfeaturesGeoJSON["id"],
                          type: "DELETE"
                        })
                    };

                    document.getElementById('logout').onclick = function() {
                        auth.logout();
                        auth.update();
                        popup.remove();
                    };
                } else {
                    document.getElementById("authenticate").onclick = function() {
                        auth.authenticate(function() {
                            auth.update();
                            if (auth.authenticated) {
                                popup.remove();
                                reviewFeature(feature);
                            }
                        });
                    };
                }
            }
        }
    });

    map.on('load', function() {
        // Set feature counts
        var turnrestrictionsCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'turnrestrictions'
        }).length;
        var onewayCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'road'
        }).length;
        var turnlanesCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'turnlanes'
        }).length;
        var trafficsignalsCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'trafficsignals'
        }).length;
        var speedCount = map.querySourceFeatures('composite', {
            'sourceLayer': 'maxspeed'
        }).length;
        var mapillaryphotoCount = map.querySourceFeatures('mapillary', {
            'sourceLayer': 'objects'
        }).length;

        $('#turn-restriction-count').text(Math.floor(turnrestrictionsCount / 3));
        $('#oneway-count').text(onewayCount);
        $('#turn-lanes-count').text(turnlanesCount);
        $('#traffic-signals-count').text(trafficsignalsCount);
        $('#maxspeed-count').text(speedCount);
    });


    mly.on(Mapillary.Viewer.nodechanged, function(node) {
        map.setFilter('mapillarySequence', ['==', 'skey', node.sequenceKey]);
        map.setFilter('mapillarySequenceHighlight', ['==', 'key', node.key]);

        mapillaryImageKey = node.key;
    });

    map.on('dragend', function(event) {
      if (map.getZoom() > 14) {
        getTurnRestrictions(function(error, data) {
          if (error) return console.error(error);
          map.getSource('osmTurnRestrictions').setData(data);
        });
      }
    });

    map.on('zoomend', function(event) {
      if (map.getZoom() > 14) {
        getTurnRestrictions(function(error, data) {
          if (error) return console.error(error);
          map.getSource('osmTurnRestrictions').setData(data);
        })
      }
    });
}


function toggleMapillary() {
    var mapillaryLayers = ['mapillaryCoverageLine', 'mapillaryCoverageLineDirection', 'mapillaryTrafficHighlight', 'mapillaryTraffic', 'mapillaryTrafficRestrictions', 'mapillaryTrafficLabel', 'mapillaryTrafficRestrictionsIcon', 'mapillaryTrafficRestrictionsLabel'];

    mapillaryLayers.forEach(function(id) {
        var currentState = map.getLayoutProperty(id, 'visibility');
        var nextState = currentState === 'none' ? 'visible' : 'none';
        map.setLayoutProperty(id, 'visibility', nextState);
    });
    // if (!$("#mapillary-image").hasClass('hidden')) {
    //     $("#mapillary-image").addClass('hidden');
    // }
}

function toggleTileBoundary() {
    var tileBoundarybutton = document.getElementById('tileBoundaryLayer');
    if (tileBoundarybutton.classList.contains('active') && map.getZoom() >= 10) {
        showTileBoundary();
    } else {
        hideTileBoundary();
    }
}

function showTileBoundary() {
    map.setLayoutProperty('tileBoundaryLayer', 'visibility', 'visible');
    map.setLayoutProperty('tileBoundaryTextLayer', 'visibility', 'visible');
    var bbox = [map.getBounds()["_sw"]["lng"], map.getBounds()["_sw"]["lat"], map.getBounds()["_ne"]["lng"], map.getBounds()["_ne"]["lat"]];
    var poly = turf.bboxPolygon(bbox);
    var limits = {
        min_zoom: 14,
        max_zoom: 14
    };

    var geojson = cover.geojson(poly.geometry, limits);
    var indexes = [];
    indexes = cover.tiles(poly.geometry, limits);
    var arr = geojson.features;
    var i;

    for(i = 0; i < geojson.features.length; i++) {
        geojson.features[i]["properties"] = {'id' : indexes[i][0] + ',' + indexes[i][1]};
    }
    console.log(geojson);
    map.getSource('tileBoundarySource').setData(geojson);
}

function hideTileBoundary() {
    map.setLayoutProperty('tileBoundaryLayer', 'visibility', 'none');
    map.setLayoutProperty('tileBoundaryTextLayer', 'visibility', 'none');
}

// Get data from a Mapbox dataset

var featuresGeoJSON = {
    'type': 'FeatureCollection',
    'features': []
};

function refreshData(refreshRate) {
    featuresGeoJSON = {
        'type': 'FeatureCollection',
        'features': []
    };

    getFeatures();

    // setInterval(function(){ getFeatures(); }, 3000);

    function getFeatures(startID) {

        var url = DATASETS_PROXY_URL + (startID ? '?start=' + startID : '');

        $.getJSON(url, function(data) {

            console.log(data);

            if (data.features.length) {
                data.features.forEach(function(feature) {
                    // Add dataset feature id as a property
                    feature.properties.id = feature.id;
                });
                featuresGeoJSON.features = featuresGeoJSON.features.concat(data.features);
                var lastFeatureID = data.features[data.features.length - 1].id;
                getFeatures(lastFeatureID);
                reviewedRestrictionsSource.setData(featuresGeoJSON);
            }
            reviewedRestrictionsSource.setData(featuresGeoJSON);

            var stats = countProperty(featuresGeoJSON, 'status');
            // Update counts in the page
            for (var prop in stats) {
                $('[data-count-feature="' + prop + '"]').html(stats[prop]);
            }
        });
    }

}



// Toggle visibility of a layer
function toggle(id) {
    var currentState = map.getLayoutProperty(id, 'visibility');
    var nextState = currentState === 'none' ? 'visible' : 'none';
    map.setLayoutProperty(id, 'visibility', nextState);
}

// Show only a specific group of layers
function showOnlyLayers(toggleLayers, showLayerItem) {
    for (var layerItem in toggleLayers) {
        for (var layer in toggleLayers[layerItem].layers) {
            if (showLayerItem == layerItem)
                map.setLayoutProperty(toggleLayers[layerItem].layers[layer], 'visibility', 'visible');
            else
                map.setLayoutProperty(toggleLayers[layerItem].layers[layer], 'visibility', 'none');
        }
    }
    // Highlight menu items
    $('.toggles a').removeClass('active');
    $('#' + showLayerItem).addClass('active');
}



// Toggle a set of filters for a set of layers
function toggleLayerFilters(layerItems, filterItem) {

    for (var i in layerItems) {
        for (var j in toggleLayers[layerItems[i]].layers) {

            var existingFilter = map.getFilter(toggleLayers[layerItems[i]].layers[j]);

            // Construct and add the filters if none exist for the layers
            if (typeof existingFilter == 'undefined') {
                map.setFilter(toggleLayers[layerItems[i]].layers[j], toggleFilters[filterItem].filter);
            } else {
                // Not implemented
                var newFilter = mergeLayerFilters(existingFilter, toggleFilters[filterItem].filter);
                map.setFilter(toggleLayers[layerItems[i]].layers[j], newFilter);
                // console.log(newFilter);
            }

        }
    }
}

// Merge two GL layer filters into one
function mergeLayerFilters(existingFilter, mergeFilter) {
    var newFilter = new Array();

    // If the layer has a simple single filter
    if (existingFilter[0] == '==') {
        newFilter.push("all", existingFilter, mergeFilter)
    }

    return newFilter;
}

function openInJOSM() {
    //Open map location in JOSM
    var bounds = map.getBounds();
    var top = bounds.getNorth();
    var bottom = bounds.getSouth();
    var left = bounds.getWest();
    var right = bounds.getEast();
    // var josmUrl = 'https://127.0.0.1:8112/load_and_zoom?left='+left+'&right='+right+'&top='+top+'&bottom='+bottom;
    var josmUrl = 'http://127.0.0.1:8111/load_and_zoom?left=' + left + '&right=' + right + '&top=' + top + '&bottom=' + bottom;
    $.ajax(josmUrl, function() {});
}

function countProperty(geojson, property) {
    var stats = {};
    geojson.features.forEach(function(feature) {
        var val = feature.properties[property];
        stats[val] = stats[val] + 1 || 1;
    });
    stats['total'] = geojson.features.length;
    return stats;
}

function getTurnRestrictions(callback) {
  var bounds = map.getBounds();

  var south  = bounds.getSouth(),
      west   = bounds.getWest(),
      north  = bounds.getNorth(),
      east   = bounds.getEast();

  var query = '[out:json][timeout:600];(relation[~"^restriction.*$"~"."](' + south + ',' + west + ',' + north + ',' + east + '););out body;>;out skel qt;'

  queryOverpass(query, function(error, data) {
    if (error) callback(error);
    data.features.forEach(function(feature) {
        var props = feature.properties;
        var keys = Object.keys(props);
        keys.forEach(function(key) {
            if (props[key] instanceof Array) {
                props[key].forEach(function(prop) {
                    flatten(prop, key, props);
                });
            }

            if (props[key] instanceof Object) {
                flatten(props[key], key, props);
            }
        });
    });
    callback(null, data);
  }, {
    overpassUrl: 'https://overpass-cfn-production.tilestream.net/api/interpreter',
    flatProperties: false
  })
}

function flatten(obj, parentKey, properties) {
    Object.keys(obj).forEach(function(key) {
        if (obj[key] instanceof Object) {
            flatten(obj[key], parentKey + '_' + key, properties);
            delete properties[parentKey];
        }
        properties[parentKey + '_' + key] = obj[key];
        delete properties[parentKey];
    });
}

function iconRotations() {
  var stops = [];
  for (var i = -360; i <= 360; i++) {
    stops.push([i, i]);
  }
  return stops;
}
