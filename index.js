var DATASETS_ID = 'cir7dfh3b000oijmgxkaoy0tx';
var DATASETS_BASE_URL = 'https://api.mapbox.com/datasets/v1/theplanemad/' + DATASETS_ID + '/';
var DATASETS_ACCESS_TOKEN = 'sk.eyJ1IjoidGhlcGxhbmVtYWQiLCJhIjoiY2lyN2RobWgyMDAwOGlrbWdkbWp2cWdjNiJ9.AnPKx0Iqk-uzARdoOthoFg';

var MapboxClient = require('mapbox/lib/services/datasets');
var mapbox = new MapboxClient(DATASETS_ACCESS_TOKEN);

var MAPBOX_DATA_TEAM = require('mapbox-data-team').getUsernames();

var reviewer;

mapboxgl.accessToken = 'pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/planemad/cinpwopfb008hcam0mqxbxwuq',
    center: [-105.2, 44.6],
    zoom: 3.5,
    hash: true,
    attributionControl: false
});

map.addControl(new mapboxgl.Navigation({ position: 'top-right' }));
map.addControl(new mapboxgl.Geocoder({ container: 'geocoder-container' }));

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
                [15, 15]
            ]
        },
        'circle-color': {
            'property': 'status',
            'type': 'categorical',
            'stops': [
                ['valid', '#02b3eb'],
                ['redundant', 'yellow'],
                ['invalid', 'red']
            ]
        },
        'circle-blur': .9
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

    showOnlyLayers(toggleLayers, 'turn-restrictions');

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
    var mapillaryClientId = "***REMOVED***3";
    var mapillaryTrafficSigns = {
        "type": "vector",
        "tiles": [
            "https://a.mapillary.com/v3/tiles/{z}/{x}/{y}.mapbox?objects=accuracy,alt,first_seen_at,last_seen_at,rect_count,rects,updated_at,value,user_keys&client_id=" + mapillaryClientId,
        ],
        "minzoon": 14,
        "maxzoom": 16
    };

    var mapillaryCoverage = {
        "type": "vector",
        "tiles": [
            "http://d25uarhxywzl1j.cloudfront.net/v0.1/{z}/{x}/{y}.mvt"
        ],
        "minzoom": 2,
        "maxzoom": 16
    };

    map.addSource("mapillary", mapillaryTrafficSigns);
    map.addSource("mapillaryCoverage", mapillaryCoverage);
    map.addSource('reviewedRestrictionsSource', reviewedRestrictionsSource);
    map.addLayer(reviewedRestrictions);

    // Fetch data every 10 minutes
    refreshData(10);

    var mapillaryRestrictionsFilter = ["in", "value", "regulatory--no-left-turn--us", "regulatory--no-right-turn--us", "regulatory--no-straight-through--us", "regulatory--no-u-turn--us", "regulatory--no-left-or-u-turn--us", "regulatory--no-left-turn--ca", "regulatory--no-right-turn--ca", "regulatory--no-straight-through--ca", "regulatory--no-u-turn--ca", "regulatory--no-left-or-u-turn--ca", "regulatory--no-left-turn", "regulatory--no-right-turn", "regulatory--no-straight-through", "regulatory--no-u-turn", "regulatory--no-left-or-u-turn", "mandatory--turn-left--de","mandatory--proceed-straight-or-turn-left--de","mandatory--turn-right--de","mandatory--proceed-straight-or-turn-right--de","mandatory--proceed-straight--de","mandatory--turn-left-ahead--de","mandatory--turn-right-ahead--de"]

    var mapillaryTraffic = {
        "id": "mapillaryTraffic",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'objects',
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
        'source-layer': 'objects',
        'layout': {
            'visibility': 'none'
        },
        "paint": {
            "circle-radius": 5,
            "circle-color": "hsl(112, 100%, 50%)"
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
            "line-color": '#2e870a',
            "line-width": {
                "stops": [
                    [8, 1],
                    [15, 3]
                ]
            },
            "line-opacity": {
                "stops": [
                    [8, 0.2],
                    [17, 1]
                ]
            }
        }
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
        }
    };

    var mapillaryTrafficHighlight = {
        "id": "mapillaryTrafficHighlight",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'objects',
        "layout": {
            "visibility": "none"
        },
        "paint": {
            "circle-radius": 10,
            "circle-opacity": 0.3,
            "circle-color": "white"
        },
        "filter": ["==", "key", ""]
    };

    var mapillaryTrafficLabel = {
        "id": "mapillaryTrafficLabel",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "objects",
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

    var mapillaryTrafficRestrictionsLabel = {
        "id": "mapillaryTrafficRestrictionsLabel",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "objects",
        "layout": {
            "text-field": "{value}",
            "text-size": 14,
            "text-offset": [0, 2],
            "text-font": ["Clan Offc Pro Bold"],
            "icon-image": "{value}",
            "visibility": "none"
        },
        "paint": {
            "text-color": "hsl(112, 100%, 50%)",
            "text-halo-color": "black",
            "text-halo-width": 1
        },
        "filter": mapillaryRestrictionsFilter
    };

    map.addLayer(mapillaryCoverageLine, 'noturn');
    map.addLayer(mapillaryCoverageLineDirection);

    map.addLayer(mapillaryTrafficHighlight);
    map.addLayer(mapillaryTrafficLabel);
    map.addLayer(mapillaryTrafficRestrictions, 'noturn');
    map.addLayer(mapillaryTraffic, 'noturn');
    map.addLayer(mapillaryTrafficRestrictionsLabel);


    map.on('click', function(e) {

        var mapillaryRestrictions = map.queryRenderedFeatures([
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ], {
            layers: ['mapillaryTraffic']
        });


        if (mapillaryRestrictions.length) {
            var imageKey = JSON.parse(mapillaryRestrictions[0].properties.rects)[0].image_key;
            var imageUrl = 'https://d1cuyjsrcm0gby.cloudfront.net/' + imageKey + '/thumb-640.jpg';
            map.setFilter('mapillaryTrafficHighlight', ['==', 'rects', mapillaryRestrictions[0].properties.rects]);
            $('#mapillary-image').removeClass('hidden');
            $('#mapillary-image').attr('src', imageUrl);
            // Log properties
            console.log(mapillaryRestrictions[0].properties);

            openInJOSM();

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
                var formOptions = "<div class='radio-pill pill pad2y clearfix' style='width:350px'><input id='valid' type='radio' name='review' value='valid' checked='checked'><label for='valid' class='col4 button short icon check fill-green'>Valid</label><input id='redundant' type='radio' name='review' value='redundant'><label for='redundant' class='col4 button short icon check fill-mustard'>Redundant</label><input id='invalid' type='radio' name='review' value='invalid'><label for='invalid' class='col4 button icon short check fill-red'>Invalid</label></div>";
                var formReviewer = "<fieldset><label>Reviewed by: <span id='reviewer' style='padding:5px;background-color:#eee'></span></label><input type='text' name='reviewer' placeholder='OSM username'></input></fieldset>"
                var popupHTML = "<h3>" + restriction + " <a class='short button' target='_blank' href='https://www.openstreetmap.org/edit?editor=id#map=20/" + e.lngLat.lat + "/" + e.lngLat.lng + "'>Edit Map</a></h3><form>" + formOptions + formReviewer + "<a id='saveReview' class='button col4' href='#'>Save</a><a id='deleteReview' class='button quiet fr col4' href='#' style=''>Delete</a></form>";
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

                // Set reviewer name if previously saved
                if (reviewer) {
                    $("input[name=reviewer]").val(reviewer);
                }

                // Update dataset with feature status on clicking save
                document.getElementById("saveReview").onclick = function() {
                    newfeaturesGeoJSON.properties["status"] = $("input[name=review]:checked").val();
                    reviewer = $("input[name=reviewer]").val();
                    newfeaturesGeoJSON.properties["reviewed_by"] = reviewer;
                    popup.remove();
                    mapbox.insertFeature(newfeaturesGeoJSON, DATASETS_ID, function(err, response) {
                        console.log(response);
                        featuresGeoJSON.features = featuresGeoJSON.features.concat(response);
                        reviewedRestrictionsSource.setData(featuresGeoJSON);
                    });
                };
                // Delete feature on clicking delete
                document.getElementById("deleteReview").onclick = function() {
                    popup.remove();
                    mapbox.deleteFeature(newfeaturesGeoJSON["id"], DATASETS_ID, function(err, response) {
                        console.log(response);
                    });
                };
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
}



function toggleMapillary() {
    var mapillaryLayers = ['mapillaryCoverageLine', 'mapillaryCoverageLineDirection', 'mapillaryTrafficHighlight', 'mapillaryTraffic', 'mapillaryTrafficRestrictions', 'mapillaryTrafficLabel', 'mapillaryTrafficRestrictionsLabel'];

    mapillaryLayers.forEach(function(id) {
        var currentState = map.getLayoutProperty(id, 'visibility');
        var nextState = currentState === 'none' ? 'visible' : 'none';
        map.setLayoutProperty(id, 'visibility', nextState);
    });
    if (!$("#mapillary-image").hasClass('hidden')) {
        $("#mapillary-image").addClass('hidden');
    }
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

        var url = DATASETS_BASE_URL + 'features';
        var params = {
            'access_token': DATASETS_ACCESS_TOKEN
        };

        // Begin with the last feature of previous request
        if (startID) {
            params.start = startID;
        }

        $.getJSON(url, params, function(data) {

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

// Open fullsize Mapillary image in new tab onclicking thumbnail
$('#mapillary-image').click(function() {
    var url = $('#mapillary-image').attr('src').replace('640', '2048');
    window.open(url, '_blank');
});

function countProperty(geojson, property) {
    var stats = {};
    geojson.features.forEach(function(feature) {
        var val = feature.properties[property];
        stats[val] = stats[val] + 1 || 1;
    });
    stats['total'] = geojson.features.length;
    return stats;
}