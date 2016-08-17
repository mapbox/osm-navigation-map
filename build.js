(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
    var mapillaryClientId = "MFo5YmpwMmxHMmxJaUt3VW14c0ZCZzphZDU5ZDBjNTMzN2Y3YTE3";
    var mapillaryTrafficSigns = {
        "type": "vector",
        "tiles": [
            "https://a.mapillary.com/v3/tiles/{z}/{x}/{y}.mapbox?objects=accuracy,alt,first_seen_at,last_seen_at,rect_count,rects,updated_at,value,user_keys&client_id=" + mapillaryClientId,
        ],
        "minzoon": 14,
        "maxzoom": 14
    };

    var mapillaryCoverage = {
        "type": "vector",
        "tiles": [
            "http://d25uarhxywzl1j.cloudfront.net/v0.1/{z}/{x}/{y}.mvt"
        ],
        "maxzoom": 14
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
},{"mapbox-data-team":4,"mapbox/lib/services/datasets":10}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
    try {
        cachedSetTimeout = setTimeout;
    } catch (e) {
        cachedSetTimeout = function () {
            throw new Error('setTimeout is not defined');
        }
    }
    try {
        cachedClearTimeout = clearTimeout;
    } catch (e) {
        cachedClearTimeout = function () {
            throw new Error('clearTimeout is not defined');
        }
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
'use strict';

module.exports = {
    'team': [
        {
            'username': 'Aaron Lidman',
            'uid': '53073',
            'fname': 'Aaron',
            'lname': 'Lidman',
            'fullname': 'Aaron Lidman'
        },
        {
            'username': 'aarthy',
            'uid': '2985232',
            'fname': 'Aarthy',
            'lname': 'Chandrasekhar',
            'fullname': 'Aarthy Chandrasekhar'
        },
        {
            'username': 'saikabhi',
            'uid': '3029661',
            'fname': 'Abhishek',
            'lname': 'Saikia',
            'fullname': 'Abhishek Saikia'
        },
        {
            'username': 'ajithranka',
            'uid': '3878839',
            'fname': 'Ajith',
            'lname': 'Ranka',
            'fullname': 'Ajith Ranka'
        },
        {
            'username': 'lxbarth',
            'uid': '589596',
            'fname': 'Alex',
            'lname': 'Barth',
            'fullname': 'Alex Barth'
        },
        {
            'username': 'andygol',
            'uid': '94578',
            'fname': 'Andrey',
            'lname': 'Golovin',
            'fullname': 'Andrey Golovin'
        },
        {
            'username': 'PlaneMad',
            'uid': '1306',
            'fname': 'Arun',
            'lname': 'Ganesh',
            'fullname': 'Arun Ganesh'
        },
        {
            'username': 'Arunasank',
            'uid': '2477516',
            'fname': 'Aruna',
            'lname': 'Sankaranarayanan',
            'fullname': 'Aruna Sankaranarayanan'
        },
        {
            'username': 'bkowshik',
            'uid': '1087876',
            'fname': 'Bhargav',
            'lname': 'Kowshik',
            'fullname': 'Bhargav Kowshik'
        },
        {
            'username': 'calfarome',
            'uid': '2511706',
            'fname': 'Cesar',
            'lname': 'Alfaro',
            'fullname': 'Cesar Alfaro'
        },
        {
            'username': 'Chetan_Gowda',
            'uid': '2644101',
            'fname': 'Chethan',
            'lname': 'Gowda',
            'fullname': 'Chethan Gowda'
        },
        {
            'username': 'dannykath',
            'uid': '2226712',
            'fname': 'Danny',
            'mname': 'Aiquipa',
            'lname': 'Pacheco',
            'fullname': 'Danny Aiquipa Pacheco'
        },
        {
            'username': 'ediyes',
            'uid': '1240849',
            'fname': 'Edith',
            'lname': 'Quispe',
            'fullname': 'Edith Quispe'
        },
        {
            'username': 'samely',
            'uid': '2512300',
            'fname': 'Eliane Sammy',
            'mname': 'Joyo',
            'lname': 'Meneses',
            'fullname': 'Eliane Sammy Joyo Meneses'
        },
        {
            'username': 'yurasi',
            'uid': '3526564',
            'fname': 'Galia',
            'mname': 'Eyzaguirre',
            'lname': 'Luque',
            'fullname': 'Galia Eyzaguirre Luque'
        },
        {
            'username': 'jinalfoflia',
            'uid': '2847988',
            'fname': 'Jinal',
            'lname': 'Foflia',
            'fullname': 'Jinal Foflia'
        },
        {
            'username': 'Jothirnadh',
            'uid': '2015224',
            'fname': 'Jothirnadh',
            'lname': 'Sai',
            'fullname': 'Jothirnadh Sai'
        },
        {
            'username': 'karitotp',
            'uid': '2748195',
            'fname': 'Karito',
            'mname': 'Tenorio',
            'lname': 'Palomino',
            'fullname': 'Karito Tenorio Palomino'
        },
        {
            'username': 'Luis36995',
            'uid': '1829683',
            'fname': 'Luis',
            'mname': 'Alanya',
            'lname': 'Ortega',
            'fullname': 'Luis Alanya Ortega'
        },
        {
            'username': 'Maanya',
            'uid': '3572302',
            'fname': 'Maanya',
            'lname': 'Umashaanker',
            'fullname': 'Maanya Umashaanker'
        },
        {
            'username': 'manings',
            'uid': '3272286',
            'fname': 'Maning',
            'lname': 'Sambale',
            'fullname': 'Maning Sambale'
        },
        {
            'username': 'manoharuss',
            'uid': '3769434',
            'fname': 'Manohar',
            'lname': 'Erikipati',
            'fullname': 'Manohar Erikipati'
        },
        {
            'username': 'nammala',
            'uid': '3479270',
            'fname': 'Krishna',
            'lname': 'Nammala',
            'fullname': 'Krishna Nammala'
        },
        {
            'username': 'nikhilprabhakar',
            'uid': '2835928',
            'fname': 'Nikhil',
            'lname': 'Prabhakar',
            'fullname': 'Nikhil Prabhakar'
        },
        {
            'username': 'oini',
            'uid': '3057995',
            'fname': 'Oindrila',
            'lname': 'Gupta',
            'fullname': 'Oindrila Gupta'
        },
        {
            'username': 'ridixcr',
            'uid': '2508151',
            'fname': 'Pavel',
            'lname': 'Baez',
            'fullname': 'Pavel Baez'
        },
        {
            'username': 'piligab',
            'uid': '3877019',
            'fname': 'Pilar Gabriela',
            'mname': 'Serrano',
            'lname': 'Quispe',
            'fullname': 'Pilar Gabriela Serrano Quispe'
        },
        {
            'username': 'poornibadrinath',
            'uid': '1597155',
            'fname': 'Poornima',
            'lname': 'Badrinath',
            'fullname': 'Poornima Badrinath'
        },
        {
            'username': 'pratikyadav',
            'uid': '2905914',
            'fname': 'Pratik',
            'lname': 'Yadav',
            'fullname': 'Pratik Yadav'
        },
        {
            'username': 'ramyaragupathy',
            'uid': '2823295',
            'fname': 'Ramya',
            'lname': 'Ragupathy',
            'fullname': 'Ramya Ragupathy'
        },
        {
            'username': 'RichRico',
            'uid': '2219338',
            'fname': 'Richman',
            'mname': 'Pariona',
            'lname': 'Torres',
            'fullname': 'Richman Pariona Torres'
        },
        {
            'username': 'Rub21',
            'uid': '510836',
            'fname': 'Ruben',
            'lname': 'Lopez Mendoza',
            'fullname': 'Ruben Lopez Mendoza'
        },
        {
            'username': 'ruthmaben',
            'uid': '2554698',
            'fname': 'Ruth',
            'lname': 'Maben',
            'fullname': 'Ruth Maben'
        },
        {
            'username': 'geohacker',
            'uid': '146675',
            'fname': 'Sajjad',
            'lname': 'Anwar',
            'fullname': 'Sajjad Anwar'
        },
        {
            'username': 'sanjayb',
            'uid': '261012',
            'fname': 'Sanjay',
            'lname': 'Bhangar',
            'fullname': 'Sanjay Bhangar'
        },
        {
            'username': 'shvrm',
            'uid': '2306749',
            'fname': 'Sivaram',
            'lname': 'Ramachandran',
            'fullname': 'Sivaram Ramachandran'
        },
        {
            'username': 'srividya_c',
            'uid': '2115749',
            'fname': 'Srividya',
            'lname': 'Bharadwaj',
            'fullname': 'Srividya Bharadwaj'
        }
    ]
};

},{}],4:[function(require,module,exports){
'use strict';

var team = require('./data/team.js').team;

function getData(returnField, searchField, value, json) {
    var teamJSON = json || team;
    if (!searchField) {
        return teamJSON.map(function (member) {
            return member[returnField];
        }).sort();
    } else {
        return teamJSON.filter(function (member) {
            return (member[searchField].toLowerCase() === value.toLowerCase());
        }).map(function (member) {
            return member[returnField];
        }).sort();
    }
}

function getUsernames(json) {
    return getData('username', null, null, json);
}

function getUserIds(json) {
    return getData('uid', null, null, json);
}

function getUsernamesFor(field, value, json) {
    return getData('username', field, value, json);
}

function getUserIdsFor(field, value, json) {
    return getData('uid', field, value, json);
}

function getNames(json) {
    return getData('fullname', null, null, json);
}

function getEverything(json) {
    return json || team;
}

module.exports = {
    'getUsernames': getUsernames,
    'getNames': getNames,
    'getUserIds': getUserIds,
    'getUsernamesFor': getUsernamesFor,
    'getUserIdsFor': getUserIdsFor,
    'getEverything': getEverything
};

},{"./data/team.js":3}],5:[function(require,module,exports){
'use strict';

var interceptor = require('rest/interceptor');

var callbackify = interceptor({
  success: function (response) {
    var request = response && response.request;
    var callback = request && request.callback;

    if (typeof callback === 'function') {
      callback(null, response.entity);
    }

    return response;
  },
  error: function (response) {
    var request = response && response.request;
    var callback = request && request.callback;

    if (typeof callback === 'function') {
      var err = response.error || response.entity;
      if (typeof err !== 'object') err = new Error(err);
      callback(err);
    }

    return response;
  }
});

module.exports = callbackify;

},{"rest/interceptor":16}],6:[function(require,module,exports){
'use strict';

var rest = require('rest');
var callbackify = require('./callbackify');

// rest.js client with MIME support
module.exports = function(config) {
  return rest
    .wrap(require('rest/interceptor/errorCode'))
    .wrap(require('rest/interceptor/pathPrefix'), { prefix: config.endpoint })
    .wrap(require('rest/interceptor/mime'), { mime: 'application/json' })
    .wrap(require('rest/interceptor/params'))
    .wrap(require('rest/interceptor/defaultRequest'), {
      params: { access_token: config.accessToken }
    })
    .wrap(require('rest/interceptor/template'))
    .wrap(callbackify);
};

},{"./callbackify":5,"rest":12,"rest/interceptor/defaultRequest":17,"rest/interceptor/errorCode":18,"rest/interceptor/mime":19,"rest/interceptor/params":20,"rest/interceptor/pathPrefix":21,"rest/interceptor/template":22}],7:[function(require,module,exports){
// We keep all of the constants that declare endpoints in one
// place, so that we could concievably update this for API layout
// revisions.
module.exports.DEFAULT_ENDPOINT = 'https://api.mapbox.com';

module.exports.API_GEOCODING_FORWARD = '/geocoding/v5/{dataset}/{query}.json{?proximity,country,types,bbox}';
module.exports.API_GEOCODING_REVERSE = '/geocoding/v5/{dataset}/{longitude},{latitude}.json{?types}';

module.exports.API_DIRECTIONS = '/v4/directions/{profile}/{encodedWaypoints}.json{?alternatives,instructions,geometry,steps}';
module.exports.API_DISTANCE = '/distances/v1/mapbox/{profile}';

module.exports.API_SURFACE = '/v4/surface/{mapid}.json{?layer,fields,points,geojson,interpolate,encoded_polyline}';

module.exports.API_UPLOADS = '/uploads/v1/{owner}';
module.exports.API_UPLOAD = '/uploads/v1/{owner}/{upload}';
module.exports.API_UPLOAD_CREDENTIALS = '/uploads/v1/{owner}/credentials';

module.exports.API_MATCHING = '/matching/v4/{profile}.json';

module.exports.API_DATASET_DATASETS = '/datasets/v1/{owner}';
module.exports.API_DATASET_DATASET = '/datasets/v1/{owner}/{dataset}';
module.exports.API_DATASET_FEATURES = '/datasets/v1/{owner}/{dataset}/features{?reverse,limit,start}';
module.exports.API_DATASET_FEATURE = '/datasets/v1/{owner}/{dataset}/features/{id}';

module.exports.API_TILESTATS_STATISTICS = '/tilestats/v1/{owner}/{tileset}';
module.exports.API_TILESTATS_LAYER = '/tilestats/v1/{owner}/{tileset}/{layer}';
module.exports.API_TILESTATS_ATTRIBUTE = '/tilestats/v1/{owner}/{tileset}/{layer}/{attribute}';

module.exports.API_STATIC = '/v4/{mapid}{+overlay}/{+xyz}/{width}x{height}{+retina}{.format}{?api_token}';

module.exports.API_STYLES_LIST = '/styles/v1/{owner}';
module.exports.API_STYLES_CREATE = '/styles/v1/{owner}';
module.exports.API_STYLES_READ = '/styles/v1/{owner}/{styleid}';
module.exports.API_STYLES_UPDATE = '/styles/v1/{owner}/{styleid}';
module.exports.API_STYLES_DELETE = '/styles/v1/{owner}/{styleid}';
module.exports.API_STYLES_EMBED = '/styles/v1/{owner}/{styleid}.html{?zoomwheel,title,access_token}';
module.exports.API_STYLES_SPRITE = '/styles/v1/{owner}/{styleid}/sprite{+retina}{.format}';
module.exports.API_STYLES_SPRITE_ADD_ICON = '/styles/v1/{owner}/{styleid}/sprite/{iconName}';
module.exports.API_STYLES_SPRITE_DELETE_ICON = '/styles/v1/{owner}/{styleid}/sprite/{iconName}';

module.exports.API_STYLES_FONT_GLYPH_RANGES = '/fonts/v1/{owner}/{font}/{start}-{end}.pbf'

},{}],8:[function(require,module,exports){
'use strict';

var b64 = require('rest/util/base64');

/**
 * Access tokens actually are data, and using them we can derive
 * a user's username. This method attempts to do just that,
 * decoding the part of the token after the first `.` into
 * a username.
 *
 * @private
 * @param {string} token an access token
 * @return {string} username
 */
function getUser(token) {
  var data = token.split('.')[1];
  if (!data) return null;
  data = data.replace(/-/g, '+').replace(/_/g, '/');

  var mod = data.length % 4;
  if (mod === 2) data += '==';
  if (mod === 3) data += '=';
  if (mod === 1 || mod > 3) return null;

  try {
    return JSON.parse(b64.decode(data)).u;
  } catch(err) {
    return null;
  }
}

module.exports = getUser;

},{"rest/util/base64":31}],9:[function(require,module,exports){
'use strict';

var invariant = require('../vendor/invariant');
var constants = require('./constants');
var client = require('./client');
var getUser = require('./get_user');

/**
 * Services all have the same constructor pattern: you initialize them
 * with an access token and options, and they validate those arguments
 * in a predictable way. This is a constructor-generator that makes
 * it possible to require each service's API individually.
 *
 * @private
 * @param {string} name the name of the Mapbox API this class will access:
 * this is set to the name of the function so it will show up in tracebacks
 * @returns {Function} constructor function
 */
function makeService(name) {

  function service(accessToken, options) {
    this.name = name;

    invariant(typeof accessToken === 'string',
      'accessToken required to instantiate Mapbox client');

    var endpoint = constants.DEFAULT_ENDPOINT;

    if (options !== undefined) {
      invariant(typeof options === 'object', 'options must be an object');
      if (options.endpoint) {
        invariant(typeof options.endpoint === 'string', 'endpoint must be a string');
        endpoint = options.endpoint;
      }
      if (options.account) {
        invariant(typeof options.account === 'string', 'account must be a string');
        this.owner = options.account;
      }
    }

    this.client = client({
      endpoint: endpoint,
      accessToken: accessToken
    });

    this.accessToken = accessToken;
    this.endpoint = endpoint;
    this.owner = this.owner || getUser(accessToken);
    invariant(!!this.owner, 'could not determine account from provided accessToken');

  }

  return service;
}

module.exports = makeService;

},{"../vendor/invariant":40,"./client":6,"./constants":7,"./get_user":8}],10:[function(require,module,exports){
'use strict';

var invariant = require('../../vendor/invariant'),
  hat = require('../../vendor/hat'),
  makeService = require('../make_service'),
  constants = require('../constants');

var Datasets = module.exports = makeService('MapboxDatasets');

/**
 * To retrieve a listing of datasets for a particular account.
 * This request requires an access token with the datasets:read scope.
 *
 * @param {Function} callback called with (err, datasets)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * client.listDatasets(function(err, datasets) {
 *   console.log(datasets);
 *   // [
 *   //   {
 *   //     "owner": {account},
 *   //     "id": {dataset id},
 *   //     "name": {dataset name},
 *   //     "description": {dataset description},
 *   //     "created": {timestamp},
 *   //     "modified": {timestamp}
 *   //   },
 *   //   {
 *   //     "owner": {account},
 *   //     "id": {dataset id},
 *   //     "name": {dataset name},
 *   //     "description": {dataset description},
 *   //     "created": {timestamp},
 *   //     "modified": {timestamp}
 *   //   }
 *   // ]
 * });
 */
Datasets.prototype.listDatasets = function(callback) {
  return this.client({
    path: constants.API_DATASET_DATASETS,
    params: {
      owner: this.owner
    },
    callback: callback
  }).entity();
};

/**
 * To create a new dataset. Valid properties include title and description (not required).
 * This request requires an access token with the datasets:write scope.
 *
 * @param {object} [options] an object defining a dataset's properties
 * @param {string} [options.name] the dataset's name
 * @param {string} [options.description] the dataset's description
 * @param {Function} callback called with (err, dataset)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * client.createDataset({ name: 'foo', description: 'bar' }, function(err, dataset) {
 *   console.log(dataset);
 *   // {
 *   //   "owner": {account},
 *   //   "id": {dataset id},
 *   //   "name": "foo",
 *   //   "description": "description",
 *   //   "created": {timestamp},
 *   //   "modified": {timestamp}
 *   // }
 * });
 */
Datasets.prototype.createDataset = function(options, callback) {
  // permit the options argument to be omitted
  if (callback === undefined && typeof options === 'function') {
    callback = options;
    options = {};
  }

  invariant(typeof options === 'object', 'options must be an object');

  return this.client({
    path: constants.API_DATASET_DATASETS,
    params: {
      owner: this.owner
    },
    entity: options,
    callback: callback
  }).entity();
};

/**
 * To retrieve information about a particular dataset.
 * This request requires an access token with the datasets:read scope.
 *
 * @param {string} dataset the id for an existing dataset
 * @param {Function} callback called with (err, dataset)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * client.readDataset('dataset-id', function(err, dataset) {
 *   console.log(dataset);
 *   // {
 *   //   "owner": {account},
 *   //   "id": "dataset-id",
 *   //   "name": {dataset name},
 *   //   "description": {dataset description},
 *   //   "created": {timestamp},
 *   //   "modified": {timestamp}
 *   // }
 * });
 */
Datasets.prototype.readDataset = function(dataset, callback) {
  invariant(typeof dataset === 'string', 'dataset must be a string');

  return this.client({
    path: constants.API_DATASET_DATASET,
    params: {
      owner: this.owner,
      dataset: dataset
    },
    callback: callback
  }).entity();
};

/**
 * To make updates to a particular dataset's properties.
 * This request requires an access token with the datasets:write scope.
 *
 * @param {string} dataset the id for an existing dataset
 * @param {object} [options] an object defining updates to the dataset's properties
 * @param {string} [options.name] the updated dataset's name
 * @param {string} [options.description] the updated dataset's description
 * @param {Function} callback called with (err, dataset)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * var options = { name: 'foo' };
 * client.updateDataset('dataset-id', options, function(err, dataset) {
 *   console.log(dataset);
 *   // {
 *   //   "owner": {account},
 *   //   "id": "dataset-id",
 *   //   "name": "foo",
 *   //   "description": {dataset description},
 *   //   "created": {timestamp},
 *   //   "modified": {timestamp}
 *   // }
 * });
 */
Datasets.prototype.updateDataset = function(dataset, options, callback) {
  invariant(typeof dataset === 'string', 'dataset must be a string');
  invariant(typeof options === 'object', 'options must be an object');
  invariant(!!options.name || !!options.description, 'options must include a name or a description');

  return this.client({
    path: constants.API_DATASET_DATASET,
    params: {
      owner: this.owner,
      dataset: dataset
    },
    method: 'patch',
    entity: options,
    callback: callback
  }).entity();
};

/**
 * To delete a particular dataset.
 * This request requires an access token with the datasets:write scope.
 *
 * @param {string} dataset the id for an existing dataset
 * @param {Function} callback called with (err)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * client.deleteDataset('dataset-id', function(err) {
 *   if (!err) console.log('deleted!');
 * });
 */
Datasets.prototype.deleteDataset = function(dataset, callback) {
  invariant(typeof dataset === 'string', 'dataset must be a string');

  return this.client({
    path: constants.API_DATASET_DATASET,
    params: {
      owner: this.owner,
      dataset: dataset
    },
    method: 'delete',
    callback: callback
  }).entity();
};

/**
 * Retrive a list of the features in a particular dataset. The response body will be a GeoJSON FeatureCollection.
 * This request requires an access token with the datasets:read scope.
 *
 * @param {string} dataset the id for an existing dataset
 * @param {object} [options] an object for passing pagination arguments
 * @param {boolean} [options.reverse] Set to `true` to reverse the default sort order of the listing.
 * @param {number} [options.limit] The maximum number of objects to return. This value must be between 1 and 100. The API will attempt to return the requested number of objects, but receiving fewer objects does not necessarily signal the end of the collection. Receiving an empty page of results is the only way to determine when you are at the end of a collection.
 * @param {string} [options.start] The object id that acts as the cursor for pagination and defines your location in the collection. This argument is exclusive so the object associated with the id provided to the start argument will not be included in the response.
 * @param {Function} callback called with (err, collection)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * client.listFeatures('dataset-id', options, function(err, collection) {
 *   console.log(collection);
 *   {
 *     "type": "FeatureCollection",
 *     "features": [
 *       {
 *         "id": {feature id},
 *         "type": "Feature",
 *         "properties": {feature properties}
 *         "geometry": {feature geometry}
 *       },
 *       {
 *         "id": {feature id},
 *         "type": "Feature",
 *         "properties": {feature properties}
 *         "geometry": {feature geometry}
 *       }
 *     ]
 *   }
 * });
 */
Datasets.prototype.listFeatures = function(dataset, options, callback) {
  // permit the options argument to be omitted
  if (callback === undefined && typeof options === 'function') {
    callback = options;
    options = {};
  }

  invariant(typeof dataset === 'string', 'dataset must be a string');
  invariant(typeof options === 'object', 'options must be a object');

  var params = {
    owner: this.owner,
    dataset: dataset
  };

  if (options.reverse) {
    invariant(typeof options.reverse === 'boolean', 'reverse option must be a boolean');
    params.reverse = options.reverse;
  }

  if (options.limit) {
    invariant(typeof options.limit === 'number', 'limit option must be a number');
    params.limit = options.limit;
  }

  if (options.start) {
    invariant(typeof options.start === 'string', 'start option must be a string');
    params.start = options.start;
  }

  return this.client({
    path: constants.API_DATASET_FEATURES,
    params: params,
    callback: callback
  }).entity();
};

/**
 * Insert a feature into a dataset. This can be a new feature, or overwrite an existing one.
 * If overwriting an existing feature, make sure that the feature's `id` property correctly identifies
 * the feature you wish to overwrite.
 * For new features, specifying an `id` is optional. If you do not specify an `id`, one will be assigned
 * and returned as part of the response.
 * This request requires an access token with the datasets:write scope.
 * There are a number of limits to consider when making this request:
 *   - a single feature cannot be larger than 500 KB
 *   - the dataset must not exceed 2000 total features
 *   - the dataset must not exceed a total of 5 MB
 *
 * @param {object} feature the feature to insert. Must be a valid GeoJSON feature per http://geojson.org/geojson-spec.html#feature-objects
 * @param {string} dataset the id for an existing dataset
 * @param {Function} callback called with (err, feature)
 * @returns {undefined} nothing, calls callback
 * @example
 * // Insert a brand new feature without an id
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * var feature = {
 *   "type": "Feature",
 *   "properties": {
 *     "name": "Null Island"
 *   },
 *   "geometry": {
 *     "type": "Point",
 *     "coordinates": [0, 0]
 *   }
 * };
 * client.insertFeature(feature, 'dataset-id', function(err, feature) {
 *   console.log(feature);
 *   // {
 *   //   "id": {feature id},
 *   //   "type": "Feature",
 *   //   "properties": {
 *   //     "name": "Null Island"
 *   //   },
 *   //   "geometry": {
 *   //     "type": "Point",
 *   //     "coordinates": [0, 0]
 *   //   }
 *   // }
 * });
 * @example
 * // Insert a brand new feature with an id, or overwrite an existing feature at that id
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * var feature = {
 *   "id": "feature-id",
 *   "type": "Feature",
 *   "properties": {
 *     "name": "Null Island"
 *   },
 *   "geometry": {
 *     "type": "Point",
 *     "coordinates": [0, 0]
 *   }
 * };
 * client.insertFeature(feature, 'dataset-id', function(err, feature) {
 *   console.log(feature);
 *   // {
 *   //   "id": "feature-id",
 *   //   "type": "Feature",
 *   //   "properties": {
 *   //     "name": "Null Island"
 *   //   },
 *   //   "geometry": {
 *   //     "type": "Point",
 *   //     "coordinates": [0, 0]
 *   //   }
 *   // }
 * });
 */
Datasets.prototype.insertFeature = function(feature, dataset, callback) {
  invariant(typeof dataset === 'string', 'dataset must be a string');

  var id = feature.id || hat();
  invariant(typeof id === 'string', 'The GeoJSON feature\'s id must be a string');

  return this.client({
    path: constants.API_DATASET_FEATURE,
    params: {
      owner: this.owner,
      dataset: dataset,
      id: id
    },
    method: 'put',
    entity: feature,
    callback: callback
  }).entity();
};

/**
 * Read an existing feature from a dataset.
 * This request requires an access token with the datasets:read scope.
 *
 * @param {string} id the `id` of the feature to read
 * @param {string} dataset the id for an existing dataset
 * @param {Function} callback called with (err, feature)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * client.readFeature('feature-id', 'dataset-id', function(err, feature) {
 *   console.log(feature);
 *   // {
 *   //   "id": "feature-id",
 *   //   "type": "Feature",
 *   //   "properties": {
 *   //     "name": "Null Island"
 *   //   },
 *   //   "geometry": {
 *   //     "type": "Point",
 *   //     "coordinates": [0, 0]
 *   //   }
 *   // }
 * });
 */
Datasets.prototype.readFeature = function(id, dataset, callback) {
  invariant(typeof id === 'string', 'id must be a string');
  invariant(typeof dataset === 'string', 'dataset must be a string');

  return this.client({
    path: constants.API_DATASET_FEATURE,
    params: {
      owner: this.owner,
      dataset: dataset,
      id: id
    },
    callback: callback
  }).entity();
};

/**
 * Delete an existing feature from a dataset.
 * This request requires an access token with the datasets:write scope.
 *
 * @param {string} id the `id` of the feature to read
 * @param {string} dataset the id for an existing dataset
 * @param {Function} callback called with (err)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * client.deleteFeature('feature-id', 'dataset-id', function(err, feature) {
 *   if (!err) console.log('deleted!');
 * });
 */
Datasets.prototype.deleteFeature = function(id, dataset, callback) {
  invariant(typeof id === 'string', 'id must be a string');
  invariant(typeof dataset === 'string', 'dataset must be a string');

  return this.client({
    path: constants.API_DATASET_FEATURE,
    params: {
      owner: this.owner,
      dataset: dataset,
      id: id
    },
    method: 'delete',
    callback: callback
  }).entity();
};

/**
 * Perform a batch of inserts, updates, and deletes to a dataset in a single combined request.
 * This request requires an access token with the datasets:write scope.
 * There are a number of limits to consider when making this request:
 *   - you can send a total of 100 changes (sum of puts + deletes) in a single request
 *   - any single feature cannot be larger than 500 KB
 *   - the dataset must not exceed 2000 total features
 *   - the dataset must not exceed a total of 5 MB
 *
 * @param {object} update an object describing features in insert and/or delete
 * @param {Array<object>} [update.put] features to insert. Each feature must be a valid GeoJSON feature per http://geojson.org/geojson-spec.html#feature-objects
 * @param {Array<string>} [update.delete] ids of features to delete
 * @param {string} dataset the id for an existing dataset
 * @param {Function} callback called with (err, results)
 * @returns {undefined} nothing, calls callback
 * @example
 * var MapboxClient = require('mapbox');
 * var client = new MapboxClient('ACCESSTOKEN');
 * var inserts = [
 *   {
 *     "id": "1",
 *     "type": "Feature",
 *     "properties": {
 *       "name": "Null Island"
 *     },
 *     "geometry": {
 *       "type": "Point",
 *       "coordinates": [0, 0]
 *     }
 *   },
 *   {
 *     "id": "2",
 *     "type": "Feature",
 *     "properties": {
 *       "name": "Offshore from Null Island"
 *     },
 *     "geometry": {
 *       "type": "Point",
 *       "coordinates": [0.01, 0.01]
 *     }
 *   }
 * ];
 * var deletes =[
 *   'feature-id-1',
 *   'feature-id-2'
 * ];
 * client.batchFeatureUpdate({ put: inserts, delete: deletes }, dataset, function(err, results) {
 *  console.log(results);
 * // {
 * //   "put": [
 * //     {
 * //       "id": {feature-id},
 * //       "type": "Feature",
 * //       "properties": {
 * //         "name": "Null Island"
 * //       },
 * //       "geometry": {
 * //         "type": "Point",
 * //         "coordinates": [0, 0]
 * //       }
 * //     },
 * //     {
 * //       "id": {feature-id},
 * //       "type": "Feature",
 * //       "properties": {
 * //         "name": "Offshore from Null Island"
 * //       },
 * //       "geometry": {
 * //         "type": "Point",
 * //         "coordinates": [0.01, 0.01]
 * //       }
 * //     }
 * //   ],
 * //   "delete": [
 * //     "feature-id-1",
 * //     "feature-id-2"
 * //   ]
 * // }
 * });
 */
Datasets.prototype.batchFeatureUpdate = function(update, dataset, callback) {
  invariant(typeof update === 'object', 'update must be an object');
  invariant(typeof dataset === 'string', 'dataset must be a string');

  var inserts = update.put || [];
  var deletes = update.delete || [];

  invariant(
    inserts.every(function(feature) { return feature.id; }),
    'inserted GeoJSON features must include ids'
  );

  invariant(
    deletes.every(function(id) { return typeof id === 'string'; }),
    'update.delete must be an array of strings'
  );

  return this.client({
    path: constants.API_DATASET_FEATURES,
    params: {
      owner: this.owner,
      dataset: dataset
    },
    method: 'post',
    entity: { put: inserts, delete: deletes },
    callback: callback
  }).entity();
};

},{"../../vendor/hat":39,"../../vendor/invariant":40,"../constants":7,"../make_service":9}],11:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var mixin, xWWWFormURLEncoder, origin, urlRE, absoluteUrlRE, fullyQualifiedUrlRE;

mixin = require('./util/mixin');
xWWWFormURLEncoder = require('./mime/type/application/x-www-form-urlencoded');

urlRE = /([a-z][a-z0-9\+\-\.]*:)\/\/([^@]+@)?(([^:\/]+)(:([0-9]+))?)?(\/[^?#]*)?(\?[^#]*)?(#\S*)?/i;
absoluteUrlRE = /^([a-z][a-z0-9\-\+\.]*:\/\/|\/)/i;
fullyQualifiedUrlRE = /([a-z][a-z0-9\+\-\.]*:)\/\/([^@]+@)?(([^:\/]+)(:([0-9]+))?)?\//i;

/**
 * Apply params to the template to create a URL.
 *
 * Parameters that are not applied directly to the template, are appended
 * to the URL as query string parameters.
 *
 * @param {string} template the URI template
 * @param {Object} params parameters to apply to the template
 * @return {string} the resulting URL
 */
function buildUrl(template, params) {
	// internal builder to convert template with params.
	var url, name, queryStringParams, queryString, re;

	url = template;
	queryStringParams = {};

	if (params) {
		for (name in params) {
			/*jshint forin:false */
			re = new RegExp('\\{' + name + '\\}');
			if (re.test(url)) {
				url = url.replace(re, encodeURIComponent(params[name]), 'g');
			}
			else {
				queryStringParams[name] = params[name];
			}
		}

		queryString = xWWWFormURLEncoder.write(queryStringParams);
		if (queryString) {
			url += url.indexOf('?') === -1 ? '?' : '&';
			url += queryString;
		}
	}
	return url;
}

function startsWith(str, test) {
	return str.indexOf(test) === 0;
}

/**
 * Create a new URL Builder
 *
 * @param {string|UrlBuilder} template the base template to build from, may be another UrlBuilder
 * @param {Object} [params] base parameters
 * @constructor
 */
function UrlBuilder(template, params) {
	if (!(this instanceof UrlBuilder)) {
		// invoke as a constructor
		return new UrlBuilder(template, params);
	}

	if (template instanceof UrlBuilder) {
		this._template = template.template;
		this._params = mixin({}, this._params, params);
	}
	else {
		this._template = (template || '').toString();
		this._params = params || {};
	}
}

UrlBuilder.prototype = {

	/**
	 * Create a new UrlBuilder instance that extends the current builder.
	 * The current builder is unmodified.
	 *
	 * @param {string} [template] URL template to append to the current template
	 * @param {Object} [params] params to combine with current params.  New params override existing params
	 * @return {UrlBuilder} the new builder
	 */
	append: function (template,  params) {
		// TODO consider query strings and fragments
		return new UrlBuilder(this._template + template, mixin({}, this._params, params));
	},

	/**
	 * Create a new UrlBuilder with a fully qualified URL based on the
	 * window's location or base href and the current templates relative URL.
	 *
	 * Path variables are preserved.
	 *
	 * *Browser only*
	 *
	 * @return {UrlBuilder} the fully qualified URL template
	 */
	fullyQualify: function () {
		if (typeof location === 'undefined') { return this; }
		if (this.isFullyQualified()) { return this; }

		var template = this._template;

		if (startsWith(template, '//')) {
			template = origin.protocol + template;
		}
		else if (startsWith(template, '/')) {
			template = origin.origin + template;
		}
		else if (!this.isAbsolute()) {
			template = origin.origin + origin.pathname.substring(0, origin.pathname.lastIndexOf('/') + 1);
		}

		if (template.indexOf('/', 8) === -1) {
			// default the pathname to '/'
			template = template + '/';
		}

		return new UrlBuilder(template, this._params);
	},

	/**
	 * True if the URL is absolute
	 *
	 * @return {boolean}
	 */
	isAbsolute: function () {
		return absoluteUrlRE.test(this.build());
	},

	/**
	 * True if the URL is fully qualified
	 *
	 * @return {boolean}
	 */
	isFullyQualified: function () {
		return fullyQualifiedUrlRE.test(this.build());
	},

	/**
	 * True if the URL is cross origin. The protocol, host and port must not be
	 * the same in order to be cross origin,
	 *
	 * @return {boolean}
	 */
	isCrossOrigin: function () {
		if (!origin) {
			return true;
		}
		var url = this.parts();
		return url.protocol !== origin.protocol ||
		       url.hostname !== origin.hostname ||
		       url.port !== origin.port;
	},

	/**
	 * Split a URL into its consituent parts following the naming convention of
	 * 'window.location'. One difference is that the port will contain the
	 * protocol default if not specified.
	 *
	 * @see https://developer.mozilla.org/en-US/docs/DOM/window.location
	 *
	 * @returns {Object} a 'window.location'-like object
	 */
	parts: function () {
		/*jshint maxcomplexity:20 */
		var url, parts;
		url = this.fullyQualify().build().match(urlRE);
		parts = {
			href: url[0],
			protocol: url[1],
			host: url[3] || '',
			hostname: url[4] || '',
			port: url[6],
			pathname: url[7] || '',
			search: url[8] || '',
			hash: url[9] || ''
		};
		parts.origin = parts.protocol + '//' + parts.host;
		parts.port = parts.port || (parts.protocol === 'https:' ? '443' : parts.protocol === 'http:' ? '80' : '');
		return parts;
	},

	/**
	 * Expand the template replacing path variables with parameters
	 *
	 * @param {Object} [params] params to combine with current params.  New params override existing params
	 * @return {string} the expanded URL
	 */
	build: function (params) {
		return buildUrl(this._template, mixin({}, this._params, params));
	},

	/**
	 * @see build
	 */
	toString: function () {
		return this.build();
	}

};

origin = typeof location !== 'undefined' ? new UrlBuilder(location.href).parts() : void 0;

module.exports = UrlBuilder;

},{"./mime/type/application/x-www-form-urlencoded":27,"./util/mixin":34}],12:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var rest = require('./client/default'),
    browser = require('./client/xhr');

rest.setPlatformDefaultClient(browser);

module.exports = rest;

},{"./client/default":14,"./client/xhr":15}],13:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Add common helper methods to a client impl
 *
 * @param {function} impl the client implementation
 * @param {Client} [target] target of this client, used when wrapping other clients
 * @returns {Client} the client impl with additional methods
 */
module.exports = function client(impl, target) {

	if (target) {

		/**
		 * @returns {Client} the target client
		 */
		impl.skip = function skip() {
			return target;
		};

	}

	/**
	 * Allow a client to easily be wrapped by an interceptor
	 *
	 * @param {Interceptor} interceptor the interceptor to wrap this client with
	 * @param [config] configuration for the interceptor
	 * @returns {Client} the newly wrapped client
	 */
	impl.wrap = function wrap(interceptor, config) {
		return interceptor(impl, config);
	};

	/**
	 * @deprecated
	 */
	impl.chain = function chain() {
		if (typeof console !== 'undefined') {
			console.log('rest.js: client.chain() is deprecated, use client.wrap() instead');
		}

		return impl.wrap.apply(this, arguments);
	};

	return impl;

};

},{}],14:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Plain JS Object containing properties that represent an HTTP request.
 *
 * Depending on the capabilities of the underlying client, a request
 * may be cancelable. If a request may be canceled, the client will add
 * a canceled flag and cancel function to the request object. Canceling
 * the request will put the response into an error state.
 *
 * @field {string} [method='GET'] HTTP method, commonly GET, POST, PUT, DELETE or HEAD
 * @field {string|UrlBuilder} [path=''] path template with optional path variables
 * @field {Object} [params] parameters for the path template and query string
 * @field {Object} [headers] custom HTTP headers to send, in addition to the clients default headers
 * @field [entity] the HTTP entity, common for POST or PUT requests
 * @field {boolean} [canceled] true if the request has been canceled, set by the client
 * @field {Function} [cancel] cancels the request if invoked, provided by the client
 * @field {Client} [originator] the client that first handled this request, provided by the interceptor
 *
 * @class Request
 */

/**
 * Plain JS Object containing properties that represent an HTTP response
 *
 * @field {Object} [request] the request object as received by the root client
 * @field {Object} [raw] the underlying request object, like XmlHttpRequest in a browser
 * @field {number} [status.code] status code of the response (i.e. 200, 404)
 * @field {string} [status.text] status phrase of the response
 * @field {Object] [headers] response headers hash of normalized name, value pairs
 * @field [entity] the response body
 *
 * @class Response
 */

/**
 * HTTP client particularly suited for RESTful operations.
 *
 * @field {function} wrap wraps this client with a new interceptor returning the wrapped client
 *
 * @param {Request} the HTTP request
 * @returns {ResponsePromise<Response>} a promise the resolves to the HTTP response
 *
 * @class Client
 */

 /**
  * Extended when.js Promises/A+ promise with HTTP specific helpers
  *q
  * @method entity promise for the HTTP entity
  * @method status promise for the HTTP status code
  * @method headers promise for the HTTP response headers
  * @method header promise for a specific HTTP response header
  *
  * @class ResponsePromise
  * @extends Promise
  */

var client, target, platformDefault;

client = require('../client');

if (typeof Promise !== 'function' && console && console.log) {
	console.log('An ES6 Promise implementation is required to use rest.js. See https://github.com/cujojs/when/blob/master/docs/es6-promise-shim.md for using when.js as a Promise polyfill.');
}

/**
 * Make a request with the default client
 * @param {Request} the HTTP request
 * @returns {Promise<Response>} a promise the resolves to the HTTP response
 */
function defaultClient() {
	return target.apply(void 0, arguments);
}

/**
 * Change the default client
 * @param {Client} client the new default client
 */
defaultClient.setDefaultClient = function setDefaultClient(client) {
	target = client;
};

/**
 * Obtain a direct reference to the current default client
 * @returns {Client} the default client
 */
defaultClient.getDefaultClient = function getDefaultClient() {
	return target;
};

/**
 * Reset the default client to the platform default
 */
defaultClient.resetDefaultClient = function resetDefaultClient() {
	target = platformDefault;
};

/**
 * @private
 */
defaultClient.setPlatformDefaultClient = function setPlatformDefaultClient(client) {
	if (platformDefault) {
		throw new Error('Unable to redefine platformDefaultClient');
	}
	target = platformDefault = client;
};

module.exports = client(defaultClient);

},{"../client":13}],15:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var normalizeHeaderName, responsePromise, client, headerSplitRE;

normalizeHeaderName = require('../util/normalizeHeaderName');
responsePromise = require('../util/responsePromise');
client = require('../client');

// according to the spec, the line break is '\r\n', but doesn't hold true in practice
headerSplitRE = /[\r|\n]+/;

function parseHeaders(raw) {
	// Note: Set-Cookie will be removed by the browser
	var headers = {};

	if (!raw) { return headers; }

	raw.trim().split(headerSplitRE).forEach(function (header) {
		var boundary, name, value;
		boundary = header.indexOf(':');
		name = normalizeHeaderName(header.substring(0, boundary).trim());
		value = header.substring(boundary + 1).trim();
		if (headers[name]) {
			if (Array.isArray(headers[name])) {
				// add to an existing array
				headers[name].push(value);
			}
			else {
				// convert single value to array
				headers[name] = [headers[name], value];
			}
		}
		else {
			// new, single value
			headers[name] = value;
		}
	});

	return headers;
}

function safeMixin(target, source) {
	Object.keys(source || {}).forEach(function (prop) {
		// make sure the property already exists as
		// IE 6 will blow up if we add a new prop
		if (source.hasOwnProperty(prop) && prop in target) {
			try {
				target[prop] = source[prop];
			}
			catch (e) {
				// ignore, expected for some properties at some points in the request lifecycle
			}
		}
	});

	return target;
}

module.exports = client(function xhr(request) {
	return responsePromise.promise(function (resolve, reject) {
		/*jshint maxcomplexity:20 */

		var client, method, url, headers, entity, headerName, response, XHR;

		request = typeof request === 'string' ? { path: request } : request || {};
		response = { request: request };

		if (request.canceled) {
			response.error = 'precanceled';
			reject(response);
			return;
		}

		XHR = request.engine || XMLHttpRequest;
		if (!XHR) {
			reject({ request: request, error: 'xhr-not-available' });
			return;
		}

		entity = request.entity;
		request.method = request.method || (entity ? 'POST' : 'GET');
		method = request.method;
		url = response.url = request.path || '';

		try {
			client = response.raw = new XHR();

			// mixin extra request properties before and after opening the request as some properties require being set at different phases of the request
			safeMixin(client, request.mixin);
			client.open(method, url, true);
			safeMixin(client, request.mixin);

			headers = request.headers;
			for (headerName in headers) {
				/*jshint forin:false */
				if (headerName === 'Content-Type' && headers[headerName] === 'multipart/form-data') {
					// XMLHttpRequest generates its own Content-Type header with the
					// appropriate multipart boundary when sending multipart/form-data.
					continue;
				}

				client.setRequestHeader(headerName, headers[headerName]);
			}

			request.canceled = false;
			request.cancel = function cancel() {
				request.canceled = true;
				client.abort();
				reject(response);
			};

			client.onreadystatechange = function (/* e */) {
				if (request.canceled) { return; }
				if (client.readyState === (XHR.DONE || 4)) {
					response.status = {
						code: client.status,
						text: client.statusText
					};
					response.headers = parseHeaders(client.getAllResponseHeaders());
					response.entity = client.responseText;

					// #125 -- Sometimes IE8-9 uses 1223 instead of 204
					// http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
					if (response.status.code === 1223) {
						response.status.code = 204;
					}

					if (response.status.code > 0) {
						// check status code as readystatechange fires before error event
						resolve(response);
					}
					else {
						// give the error callback a chance to fire before resolving
						// requests for file:// URLs do not have a status code
						setTimeout(function () {
							resolve(response);
						}, 0);
					}
				}
			};

			try {
				client.onerror = function (/* e */) {
					response.error = 'loaderror';
					reject(response);
				};
			}
			catch (e) {
				// IE 6 will not support error handling
			}

			client.send(entity);
		}
		catch (e) {
			response.error = 'loaderror';
			reject(response);
		}

	});
});

},{"../client":13,"../util/normalizeHeaderName":35,"../util/responsePromise":36}],16:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var defaultClient, mixin, responsePromise, client;

defaultClient = require('./client/default');
mixin = require('./util/mixin');
responsePromise = require('./util/responsePromise');
client = require('./client');

/**
 * Interceptors have the ability to intercept the request and/org response
 * objects.  They may augment, prune, transform or replace the
 * request/response as needed.  Clients may be composed by wrapping
 * together multiple interceptors.
 *
 * Configured interceptors are functional in nature.  Wrapping a client in
 * an interceptor will not affect the client, merely the data that flows in
 * and out of that client.  A common configuration can be created once and
 * shared; specialization can be created by further wrapping that client
 * with custom interceptors.
 *
 * @param {Client} [target] client to wrap
 * @param {Object} [config] configuration for the interceptor, properties will be specific to the interceptor implementation
 * @returns {Client} A client wrapped with the interceptor
 *
 * @class Interceptor
 */

function defaultInitHandler(config) {
	return config;
}

function defaultRequestHandler(request /*, config, meta */) {
	return request;
}

function defaultResponseHandler(response /*, config, meta */) {
	return response;
}

/**
 * Alternate return type for the request handler that allows for more complex interactions.
 *
 * @param properties.request the traditional request return object
 * @param {Promise} [properties.abort] promise that resolves if/when the request is aborted
 * @param {Client} [properties.client] override the defined client with an alternate client
 * @param [properties.response] response for the request, short circuit the request
 */
function ComplexRequest(properties) {
	if (!(this instanceof ComplexRequest)) {
		// in case users forget the 'new' don't mix into the interceptor
		return new ComplexRequest(properties);
	}
	mixin(this, properties);
}

/**
 * Create a new interceptor for the provided handlers.
 *
 * @param {Function} [handlers.init] one time intialization, must return the config object
 * @param {Function} [handlers.request] request handler
 * @param {Function} [handlers.response] response handler regardless of error state
 * @param {Function} [handlers.success] response handler when the request is not in error
 * @param {Function} [handlers.error] response handler when the request is in error, may be used to 'unreject' an error state
 * @param {Function} [handlers.client] the client to use if otherwise not specified, defaults to platform default client
 *
 * @returns {Interceptor}
 */
function interceptor(handlers) {

	var initHandler, requestHandler, successResponseHandler, errorResponseHandler;

	handlers = handlers || {};

	initHandler            = handlers.init    || defaultInitHandler;
	requestHandler         = handlers.request || defaultRequestHandler;
	successResponseHandler = handlers.success || handlers.response || defaultResponseHandler;
	errorResponseHandler   = handlers.error   || function () {
		// Propagate the rejection, with the result of the handler
		return Promise.resolve((handlers.response || defaultResponseHandler).apply(this, arguments))
			.then(Promise.reject.bind(Promise));
	};

	return function (target, config) {

		if (typeof target === 'object') {
			config = target;
		}
		if (typeof target !== 'function') {
			target = handlers.client || defaultClient;
		}

		config = initHandler(config || {});

		function interceptedClient(request) {
			var context, meta;
			context = {};
			meta = { 'arguments': Array.prototype.slice.call(arguments), client: interceptedClient };
			request = typeof request === 'string' ? { path: request } : request || {};
			request.originator = request.originator || interceptedClient;
			return responsePromise(
				requestHandler.call(context, request, config, meta),
				function (request) {
					var response, abort, next;
					next = target;
					if (request instanceof ComplexRequest) {
						// unpack request
						abort = request.abort;
						next = request.client || next;
						response = request.response;
						// normalize request, must be last
						request = request.request;
					}
					response = response || Promise.resolve(request).then(function (request) {
						return Promise.resolve(next(request)).then(
							function (response) {
								return successResponseHandler.call(context, response, config, meta);
							},
							function (response) {
								return errorResponseHandler.call(context, response, config, meta);
							}
						);
					});
					return abort ? Promise.race([response, abort]) : response;
				},
				function (error) {
					return Promise.reject({ request: request, error: error });
				}
			);
		}

		return client(interceptedClient, target);
	};
}

interceptor.ComplexRequest = ComplexRequest;

module.exports = interceptor;

},{"./client":13,"./client/default":14,"./util/mixin":34,"./util/responsePromise":36}],17:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, mixinUtil, defaulter;

interceptor = require('../interceptor');
mixinUtil = require('../util/mixin');

defaulter = (function () {

	function mixin(prop, target, defaults) {
		if (prop in target || prop in defaults) {
			target[prop] = mixinUtil({}, defaults[prop], target[prop]);
		}
	}

	function copy(prop, target, defaults) {
		if (prop in defaults && !(prop in target)) {
			target[prop] = defaults[prop];
		}
	}

	var mappings = {
		method: copy,
		path: copy,
		params: mixin,
		headers: mixin,
		entity: copy,
		mixin: mixin
	};

	return function (target, defaults) {
		for (var prop in mappings) {
			/*jshint forin: false */
			mappings[prop](prop, target, defaults);
		}
		return target;
	};

}());

/**
 * Provide default values for a request. These values will be applied to the
 * request if the request object does not already contain an explicit value.
 *
 * For 'params', 'headers', and 'mixin', individual values are mixed in with the
 * request's values. The result is a new object representiing the combined
 * request and config values. Neither input object is mutated.
 *
 * @param {Client} [client] client to wrap
 * @param {string} [config.method] the default method
 * @param {string} [config.path] the default path
 * @param {Object} [config.params] the default params, mixed with the request's existing params
 * @param {Object} [config.headers] the default headers, mixed with the request's existing headers
 * @param {Object} [config.mixin] the default "mixins" (http/https options), mixed with the request's existing "mixins"
 *
 * @returns {Client}
 */
module.exports = interceptor({
	request: function handleRequest(request, config) {
		return defaulter(request, config);
	}
});

},{"../interceptor":16,"../util/mixin":34}],18:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor;

interceptor = require('../interceptor');

/**
 * Rejects the response promise based on the status code.
 *
 * Codes greater than or equal to the provided value are rejected.  Default
 * value 400.
 *
 * @param {Client} [client] client to wrap
 * @param {number} [config.code=400] code to indicate a rejection
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.code = config.code || 400;
		return config;
	},
	response: function (response, config) {
		if (response.status && response.status.code >= config.code) {
			return Promise.reject(response);
		}
		return response;
	}
});

},{"../interceptor":16}],19:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, mime, registry, noopConverter, missingConverter, attempt;

interceptor = require('../interceptor');
mime = require('../mime');
registry = require('../mime/registry');
attempt = require('../util/attempt');

noopConverter = {
	read: function (obj) { return obj; },
	write: function (obj) { return obj; }
};

missingConverter = {
	read: function () { throw 'No read method found on converter'; },
	write: function () { throw 'No write method found on converter'; }
};

/**
 * MIME type support for request and response entities.  Entities are
 * (de)serialized using the converter for the MIME type.
 *
 * Request entities are converted using the desired converter and the
 * 'Accept' request header prefers this MIME.
 *
 * Response entities are converted based on the Content-Type response header.
 *
 * @param {Client} [client] client to wrap
 * @param {string} [config.mime='text/plain'] MIME type to encode the request
 *   entity
 * @param {string} [config.accept] Accept header for the request
 * @param {Client} [config.client=<request.originator>] client passed to the
 *   converter, defaults to the client originating the request
 * @param {Registry} [config.registry] MIME registry, defaults to the root
 *   registry
 * @param {boolean} [config.permissive] Allow an unkown request MIME type
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.registry = config.registry || registry;
		return config;
	},
	request: function (request, config) {
		var type, headers;

		headers = request.headers || (request.headers = {});
		type = mime.parse(headers['Content-Type'] || config.mime || 'text/plain');
		headers.Accept = headers.Accept || config.accept || type.raw + ', application/json;q=0.8, text/plain;q=0.5, */*;q=0.2';

		if (!('entity' in request)) {
			return request;
		}

		headers['Content-Type'] = type.raw;

		return config.registry.lookup(type)['catch'](function () {
			// failed to resolve converter
			if (config.permissive) {
				return noopConverter;
			}
			throw 'mime-unknown';
		}).then(function (converter) {
			var client = config.client || request.originator,
				write = converter.write || missingConverter.write;

			return attempt(write.bind(void 0, request.entity, { client: client, request: request, mime: type, registry: config.registry }))
				['catch'](function() {
					throw 'mime-serialization';
				})
				.then(function(entity) {
					request.entity = entity;
					return request;
				});
		});
	},
	response: function (response, config) {
		if (!(response.headers && response.headers['Content-Type'] && response.entity)) {
			return response;
		}

		var type = mime.parse(response.headers['Content-Type']);

		return config.registry.lookup(type)['catch'](function () { return noopConverter; }).then(function (converter) {
			var client = config.client || response.request && response.request.originator,
				read = converter.read || missingConverter.read;

			return attempt(read.bind(void 0, response.entity, { client: client, response: response, mime: type, registry: config.registry }))
				['catch'](function (e) {
					response.error = 'mime-deserialization';
					response.cause = e;
					throw response;
				})
				.then(function (entity) {
					response.entity = entity;
					return response;
				});
		});
	}
});

},{"../interceptor":16,"../mime":23,"../mime/registry":24,"../util/attempt":30}],20:[function(require,module,exports){
/*
 * Copyright 2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, UrlBuilder;

interceptor = require('../interceptor');
UrlBuilder = require('../UrlBuilder');

/**
 * Applies request params to the path by token replacement
 *
 * Params not applied as a token are appended to the query string. Params
 * are removed from the request object, as they have been consumed.
 *
 * @deprecated The template interceptor `rest/interceptor/template` is a
 * much richer way to apply paramters to a template. This interceptor is
 * available as a bridge to users who previousled depended on this
 * functionality being available directly on clients.
 *
 * @param {Client} [client] client to wrap
 * @param {Object} [config.params] default param values
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.params = config.params || {};
		return config;
	},
	request: function (request, config) {
		var path, params;

		path = request.path || '';
		params = request.params || {};

		request.path = new UrlBuilder(path, config.params).append('', params).build();
		delete request.params;

		return request;
	}
});

},{"../UrlBuilder":11,"../interceptor":16}],21:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, UrlBuilder;

interceptor = require('../interceptor');
UrlBuilder = require('../UrlBuilder');

function startsWith(str, prefix) {
	return str.indexOf(prefix) === 0;
}

function endsWith(str, suffix) {
	return str.lastIndexOf(suffix) + suffix.length === str.length;
}

/**
 * Prefixes the request path with a common value.
 *
 * @param {Client} [client] client to wrap
 * @param {number} [config.prefix] path prefix
 *
 * @returns {Client}
 */
module.exports = interceptor({
	request: function (request, config) {
		var path;

		if (config.prefix && !(new UrlBuilder(request.path).isFullyQualified())) {
			path = config.prefix;
			if (request.path) {
				if (!endsWith(path, '/') && !startsWith(request.path, '/')) {
					// add missing '/' between path sections
					path += '/';
				}
				path += request.path;
			}
			request.path = path;
		}

		return request;
	}
});

},{"../UrlBuilder":11,"../interceptor":16}],22:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var interceptor, uriTemplate, mixin;

interceptor = require('../interceptor');
uriTemplate = require('../util/uriTemplate');
mixin = require('../util/mixin');

/**
 * Applies request params to the path as a URI Template
 *
 * Params are removed from the request object, as they have been consumed.
 *
 * @see https://tools.ietf.org/html/rfc6570
 *
 * @param {Client} [client] client to wrap
 * @param {Object} [config.params] default param values
 * @param {string} [config.template] default template
 *
 * @returns {Client}
 */
module.exports = interceptor({
	init: function (config) {
		config.params = config.params || {};
		config.template = config.template || '';
		return config;
	},
	request: function (request, config) {
		var template, params;

		template = request.path || config.template;
		params = mixin({}, request.params, config.params);

		request.path = uriTemplate.expand(template, params);
		delete request.params;

		return request;
	}
});

},{"../interceptor":16,"../util/mixin":34,"../util/uriTemplate":38}],23:[function(require,module,exports){
/*
* Copyright 2014-2016 the original author or authors
* @license MIT, see LICENSE.txt for details
*
* @author Scott Andrews
*/

'use strict';

/**
 * Parse a MIME type into it's constituent parts
 *
 * @param {string} mime MIME type to parse
 * @return {{
 *   {string} raw the original MIME type
 *   {string} type the type and subtype
 *   {string} [suffix] mime suffix, including the plus, if any
 *   {Object} params key/value pair of attributes
 * }}
 */
function parse(mime) {
	var params, type;

	params = mime.split(';');
	type = params[0].trim().split('+');

	return {
		raw: mime,
		type: type[0],
		suffix: type[1] ? '+' + type[1] : '',
		params: params.slice(1).reduce(function (params, pair) {
			pair = pair.split('=');
			params[pair[0].trim()] = pair[1] ? pair[1].trim() : void 0;
			return params;
		}, {})
	};
}

module.exports = {
	parse: parse
};

},{}],24:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var mime, registry;

mime = require('../mime');

function Registry(mimes) {

	/**
	 * Lookup the converter for a MIME type
	 *
	 * @param {string} type the MIME type
	 * @return a promise for the converter
	 */
	this.lookup = function lookup(type) {
		var parsed;

		parsed = typeof type === 'string' ? mime.parse(type) : type;

		if (mimes[parsed.raw]) {
			return mimes[parsed.raw];
		}
		if (mimes[parsed.type + parsed.suffix]) {
			return mimes[parsed.type + parsed.suffix];
		}
		if (mimes[parsed.type]) {
			return mimes[parsed.type];
		}
		if (mimes[parsed.suffix]) {
			return mimes[parsed.suffix];
		}

		return Promise.reject(new Error('Unable to locate converter for mime "' + parsed.raw + '"'));
	};

	/**
	 * Create a late dispatched proxy to the target converter.
	 *
	 * Common when a converter is registered under multiple names and
	 * should be kept in sync if updated.
	 *
	 * @param {string} type mime converter to dispatch to
	 * @returns converter whose read/write methods target the desired mime converter
	 */
	this.delegate = function delegate(type) {
		return {
			read: function () {
				var args = arguments;
				return this.lookup(type).then(function (converter) {
					return converter.read.apply(this, args);
				}.bind(this));
			}.bind(this),
			write: function () {
				var args = arguments;
				return this.lookup(type).then(function (converter) {
					return converter.write.apply(this, args);
				}.bind(this));
			}.bind(this)
		};
	};

	/**
	 * Register a custom converter for a MIME type
	 *
	 * @param {string} type the MIME type
	 * @param converter the converter for the MIME type
	 * @return a promise for the converter
	 */
	this.register = function register(type, converter) {
		mimes[type] = Promise.resolve(converter);
		return mimes[type];
	};

	/**
	 * Create a child registry whoes registered converters remain local, while
	 * able to lookup converters from its parent.
	 *
	 * @returns child MIME registry
	 */
	this.child = function child() {
		return new Registry(Object.create(mimes));
	};

}

registry = new Registry({});

// include provided serializers
registry.register('application/hal', require('./type/application/hal'));
registry.register('application/json', require('./type/application/json'));
registry.register('application/x-www-form-urlencoded', require('./type/application/x-www-form-urlencoded'));
registry.register('multipart/form-data', require('./type/multipart/form-data'));
registry.register('text/plain', require('./type/text/plain'));

registry.register('+json', registry.delegate('application/json'));

module.exports = registry;

},{"../mime":23,"./type/application/hal":25,"./type/application/json":26,"./type/application/x-www-form-urlencoded":27,"./type/multipart/form-data":28,"./type/text/plain":29}],25:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var pathPrefix, template, find, lazyPromise, responsePromise;

pathPrefix = require('../../../interceptor/pathPrefix');
template = require('../../../interceptor/template');
find = require('../../../util/find');
lazyPromise = require('../../../util/lazyPromise');
responsePromise = require('../../../util/responsePromise');

function defineProperty(obj, name, value) {
	Object.defineProperty(obj, name, {
		value: value,
		configurable: true,
		enumerable: false,
		writeable: true
	});
}

/**
 * Hypertext Application Language serializer
 *
 * Implemented to https://tools.ietf.org/html/draft-kelly-json-hal-06
 *
 * As the spec is still a draft, this implementation will be updated as the
 * spec evolves
 *
 * Objects are read as HAL indexing links and embedded objects on to the
 * resource. Objects are written as plain JSON.
 *
 * Embedded relationships are indexed onto the resource by the relationship
 * as a promise for the related resource.
 *
 * Links are indexed onto the resource as a lazy promise that will GET the
 * resource when a handler is first registered on the promise.
 *
 * A `requestFor` method is added to the entity to make a request for the
 * relationship.
 *
 * A `clientFor` method is added to the entity to get a full Client for a
 * relationship.
 *
 * The `_links` and `_embedded` properties on the resource are made
 * non-enumerable.
 */
module.exports = {

	read: function (str, opts) {
		var client, console;

		opts = opts || {};
		client = opts.client;
		console = opts.console || console;

		function deprecationWarning(relationship, deprecation) {
			if (deprecation && console && console.warn || console.log) {
				(console.warn || console.log).call(console, 'Relationship \'' + relationship + '\' is deprecated, see ' + deprecation);
			}
		}

		return opts.registry.lookup(opts.mime.suffix).then(function (converter) {
			return converter.read(str, opts);
		}).then(function (root) {
			find.findProperties(root, '_embedded', function (embedded, resource, name) {
				Object.keys(embedded).forEach(function (relationship) {
					if (relationship in resource) { return; }
					var related = responsePromise({
						entity: embedded[relationship]
					});
					defineProperty(resource, relationship, related);
				});
				defineProperty(resource, name, embedded);
			});
			find.findProperties(root, '_links', function (links, resource, name) {
				Object.keys(links).forEach(function (relationship) {
					var link = links[relationship];
					if (relationship in resource) { return; }
					defineProperty(resource, relationship, responsePromise.make(lazyPromise(function () {
						if (link.deprecation) { deprecationWarning(relationship, link.deprecation); }
						if (link.templated === true) {
							return template(client)({ path: link.href });
						}
						return client({ path: link.href });
					})));
				});
				defineProperty(resource, name, links);
				defineProperty(resource, 'clientFor', function (relationship, clientOverride) {
					var link = links[relationship];
					if (!link) {
						throw new Error('Unknown relationship: ' + relationship);
					}
					if (link.deprecation) { deprecationWarning(relationship, link.deprecation); }
					if (link.templated === true) {
						return template(
							clientOverride || client,
							{ template: link.href }
						);
					}
					return pathPrefix(
						clientOverride || client,
						{ prefix: link.href }
					);
				});
				defineProperty(resource, 'requestFor', function (relationship, request, clientOverride) {
					var client = this.clientFor(relationship, clientOverride);
					return client(request);
				});
			});

			return root;
		});

	},

	write: function (obj, opts) {
		return opts.registry.lookup(opts.mime.suffix).then(function (converter) {
			return converter.write(obj, opts);
		});
	}

};

},{"../../../interceptor/pathPrefix":21,"../../../interceptor/template":22,"../../../util/find":32,"../../../util/lazyPromise":33,"../../../util/responsePromise":36}],26:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Create a new JSON converter with custom reviver/replacer.
 *
 * The extended converter must be published to a MIME registry in order
 * to be used. The existing converter will not be modified.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON
 *
 * @param {function} [reviver=undefined] custom JSON.parse reviver
 * @param {function|Array} [replacer=undefined] custom JSON.stringify replacer
 */
function createConverter(reviver, replacer) {
	return {

		read: function (str) {
			return JSON.parse(str, reviver);
		},

		write: function (obj) {
			return JSON.stringify(obj, replacer);
		},

		extend: createConverter

	};
}

module.exports = createConverter();

},{}],27:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var encodedSpaceRE, urlEncodedSpaceRE;

encodedSpaceRE = /%20/g;
urlEncodedSpaceRE = /\+/g;

function urlEncode(str) {
	str = encodeURIComponent(str);
	// spec says space should be encoded as '+'
	return str.replace(encodedSpaceRE, '+');
}

function urlDecode(str) {
	// spec says space should be encoded as '+'
	str = str.replace(urlEncodedSpaceRE, ' ');
	return decodeURIComponent(str);
}

function append(str, name, value) {
	if (Array.isArray(value)) {
		value.forEach(function (value) {
			str = append(str, name, value);
		});
	}
	else {
		if (str.length > 0) {
			str += '&';
		}
		str += urlEncode(name);
		if (value !== undefined && value !== null) {
			str += '=' + urlEncode(value);
		}
	}
	return str;
}

module.exports = {

	read: function (str) {
		var obj = {};
		str.split('&').forEach(function (entry) {
			var pair, name, value;
			pair = entry.split('=');
			name = urlDecode(pair[0]);
			if (pair.length === 2) {
				value = urlDecode(pair[1]);
			}
			else {
				value = null;
			}
			if (name in obj) {
				if (!Array.isArray(obj[name])) {
					// convert to an array, perserving currnent value
					obj[name] = [obj[name]];
				}
				obj[name].push(value);
			}
			else {
				obj[name] = value;
			}
		});
		return obj;
	},

	write: function (obj) {
		var str = '';
		Object.keys(obj).forEach(function (name) {
			str = append(str, name, obj[name]);
		});
		return str;
	}

};

},{}],28:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Michael Jackson
 */

/* global FormData, File, Blob */

'use strict';

function isFormElement(object) {
	return object &&
		object.nodeType === 1 && // Node.ELEMENT_NODE
		object.tagName === 'FORM';
}

function createFormDataFromObject(object) {
	var formData = new FormData();

	var value;
	for (var property in object) {
		if (object.hasOwnProperty(property)) {
			value = object[property];

			if (value instanceof File) {
				formData.append(property, value, value.name);
			} else if (value instanceof Blob) {
				formData.append(property, value);
			} else {
				formData.append(property, String(value));
			}
		}
	}

	return formData;
}

module.exports = {

	write: function (object) {
		if (typeof FormData === 'undefined') {
			throw new Error('The multipart/form-data mime serializer requires FormData support');
		}

		// Support FormData directly.
		if (object instanceof FormData) {
			return object;
		}

		// Support <form> elements.
		if (isFormElement(object)) {
			return new FormData(object);
		}

		// Support plain objects, may contain File/Blob as value.
		if (typeof object === 'object' && object !== null) {
			return createFormDataFromObject(object);
		}

		throw new Error('Unable to create FormData from object ' + object);
	}

};

},{}],29:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

module.exports = {

	read: function (str) {
		return str;
	},

	write: function (obj) {
		return obj.toString();
	}

};

},{}],30:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Attempt to invoke a function capturing the resulting value as a Promise
 *
 * If the method throws, the caught value used to reject the Promise.
 *
 * @param {function} work function to invoke
 * @returns {Promise} Promise for the output of the work function
 */
function attempt(work) {
	try {
		return Promise.resolve(work());
	}
	catch (e) {
		return Promise.reject(e);
	}
}

module.exports = attempt;

},{}],31:[function(require,module,exports){
/*
 * Copyright (c) 2009 Nicholas C. Zakas. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*
 * Base 64 implementation in JavaScript
 * Original source available at https://raw.github.com/nzakas/computer-science-in-javascript/02a2745b4aa8214f2cae1bf0b15b447ca1a91b23/encodings/base64/base64.js
 *
 * Linter refinement by Scott Andrews
 */

'use strict';

/*jshint bitwise: false */

var digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Base64-encodes a string of text.
 *
 * @param {string} text The text to encode.
 * @return {string} The base64-encoded string.
 */
function base64Encode(text) {

	if (/([^\u0000-\u00ff])/.test(text)) {
		throw new Error('Can\'t base64 encode non-ASCII characters.');
	}

	var i = 0,
		cur, prev, byteNum,
		result = [];

	while (i < text.length) {

		cur = text.charCodeAt(i);
		byteNum = i % 3;

		switch (byteNum) {
		case 0: //first byte
			result.push(digits.charAt(cur >> 2));
			break;

		case 1: //second byte
			result.push(digits.charAt((prev & 3) << 4 | (cur >> 4)));
			break;

		case 2: //third byte
			result.push(digits.charAt((prev & 0x0f) << 2 | (cur >> 6)));
			result.push(digits.charAt(cur & 0x3f));
			break;
		}

		prev = cur;
		i += 1;
	}

	if (byteNum === 0) {
		result.push(digits.charAt((prev & 3) << 4));
		result.push('==');
	} else if (byteNum === 1) {
		result.push(digits.charAt((prev & 0x0f) << 2));
		result.push('=');
	}

	return result.join('');
}

/**
 * Base64-decodes a string of text.
 *
 * @param {string} text The text to decode.
 * @return {string} The base64-decoded string.
 */
function base64Decode(text) {

	//ignore white space
	text = text.replace(/\s/g, '');

	//first check for any unexpected input
	if (!(/^[a-z0-9\+\/\s]+\={0,2}$/i.test(text)) || text.length % 4 > 0) {
		throw new Error('Not a base64-encoded string.');
	}

	//local variables
	var cur, prev, digitNum,
		i = 0,
		result = [];

	//remove any equals signs
	text = text.replace(/\=/g, '');

	//loop over each character
	while (i < text.length) {

		cur = digits.indexOf(text.charAt(i));
		digitNum = i % 4;

		switch (digitNum) {

		//case 0: first digit - do nothing, not enough info to work with

		case 1: //second digit
			result.push(String.fromCharCode(prev << 2 | cur >> 4));
			break;

		case 2: //third digit
			result.push(String.fromCharCode((prev & 0x0f) << 4 | cur >> 2));
			break;

		case 3: //fourth digit
			result.push(String.fromCharCode((prev & 3) << 6 | cur));
			break;
		}

		prev = cur;
		i += 1;
	}

	//return a string
	return result.join('');

}

module.exports = {
	encode: base64Encode,
	decode: base64Decode
};

},{}],32:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

module.exports = {

	/**
	 * Find objects within a graph the contain a property of a certain name.
	 *
	 * NOTE: this method will not discover object graph cycles.
	 *
	 * @param {*} obj object to search on
	 * @param {string} prop name of the property to search for
	 * @param {Function} callback function to receive the found properties and their parent
	 */
	findProperties: function findProperties(obj, prop, callback) {
		if (typeof obj !== 'object' || obj === null) { return; }
		if (prop in obj) {
			callback(obj[prop], obj, prop);
		}
		Object.keys(obj).forEach(function (key) {
			findProperties(obj[key], prop, callback);
		});
	}

};

},{}],33:[function(require,module,exports){
/*
 * Copyright 2013-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var attempt = require('./attempt');

/**
 * Create a promise whose work is started only when a handler is registered.
 *
 * The work function will be invoked at most once. Thrown values will result
 * in promise rejection.
 *
 * @param {Function} work function whose ouput is used to resolve the
 *   returned promise.
 * @returns {Promise} a lazy promise
 */
function lazyPromise(work) {
	var started, resolver, promise, then;

	started = false;

	promise = new Promise(function (resolve, reject) {
		resolver = {
			resolve: resolve,
			reject: reject
		};
	});
	then = promise.then;

	promise.then = function () {
		if (!started) {
			started = true;
			attempt(work).then(resolver.resolve, resolver.reject);
		}
		return then.apply(promise, arguments);
	};

	return promise;
}

module.exports = lazyPromise;

},{"./attempt":30}],34:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var empty = {};

/**
 * Mix the properties from the source object into the destination object.
 * When the same property occurs in more then one object, the right most
 * value wins.
 *
 * @param {Object} dest the object to copy properties to
 * @param {Object} sources the objects to copy properties from.  May be 1 to N arguments, but not an Array.
 * @return {Object} the destination object
 */
function mixin(dest /*, sources... */) {
	var i, l, source, name;

	if (!dest) { dest = {}; }
	for (i = 1, l = arguments.length; i < l; i += 1) {
		source = arguments[i];
		for (name in source) {
			if (!(name in dest) || (dest[name] !== source[name] && (!(name in empty) || empty[name] !== source[name]))) {
				dest[name] = source[name];
			}
		}
	}

	return dest; // Object
}

module.exports = mixin;

},{}],35:[function(require,module,exports){
/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/**
 * Normalize HTTP header names using the pseudo camel case.
 *
 * For example:
 *   content-type         -> Content-Type
 *   accepts              -> Accepts
 *   x-custom-header-name -> X-Custom-Header-Name
 *
 * @param {string} name the raw header name
 * @return {string} the normalized header name
 */
function normalizeHeaderName(name) {
	return name.toLowerCase()
		.split('-')
		.map(function (chunk) { return chunk.charAt(0).toUpperCase() + chunk.slice(1); })
		.join('-');
}

module.exports = normalizeHeaderName;

},{}],36:[function(require,module,exports){
/*
 * Copyright 2014-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

/*jshint latedef: nofunc */

var normalizeHeaderName = require('./normalizeHeaderName');

function property(promise, name) {
	return promise.then(
		function (value) {
			return value && value[name];
		},
		function (value) {
			return Promise.reject(value && value[name]);
		}
	);
}

/**
 * Obtain the response entity
 *
 * @returns {Promise} for the response entity
 */
function entity() {
	/*jshint validthis:true */
	return property(this, 'entity');
}

/**
 * Obtain the response status
 *
 * @returns {Promise} for the response status
 */
function status() {
	/*jshint validthis:true */
	return property(property(this, 'status'), 'code');
}

/**
 * Obtain the response headers map
 *
 * @returns {Promise} for the response headers map
 */
function headers() {
	/*jshint validthis:true */
	return property(this, 'headers');
}

/**
 * Obtain a specific response header
 *
 * @param {String} headerName the header to retrieve
 * @returns {Promise} for the response header's value
 */
function header(headerName) {
	/*jshint validthis:true */
	headerName = normalizeHeaderName(headerName);
	return property(this.headers(), headerName);
}

/**
 * Follow a related resource
 *
 * The relationship to follow may be define as a plain string, an object
 * with the rel and params, or an array containing one or more entries
 * with the previous forms.
 *
 * Examples:
 *   response.follow('next')
 *
 *   response.follow({ rel: 'next', params: { pageSize: 100 } })
 *
 *   response.follow([
 *       { rel: 'items', params: { projection: 'noImages' } },
 *       'search',
 *       { rel: 'findByGalleryIsNull', params: { projection: 'noImages' } },
 *       'items'
 *   ])
 *
 * @param {String|Object|Array} rels one, or more, relationships to follow
 * @returns ResponsePromise<Response> related resource
 */
function follow(rels) {
	/*jshint validthis:true */
	rels = [].concat(rels);

	return make(rels.reduce(function (response, rel) {
		return response.then(function (response) {
			if (typeof rel === 'string') {
				rel = { rel: rel };
			}
			if (typeof response.entity.clientFor !== 'function') {
				throw new Error('Hypermedia response expected');
			}
			var client = response.entity.clientFor(rel.rel);
			return client({ params: rel.params });
		});
	}, this));
}

/**
 * Wrap a Promise as an ResponsePromise
 *
 * @param {Promise<Response>} promise the promise for an HTTP Response
 * @returns {ResponsePromise<Response>} wrapped promise for Response with additional helper methods
 */
function make(promise) {
	promise.status = status;
	promise.headers = headers;
	promise.header = header;
	promise.entity = entity;
	promise.follow = follow;
	return promise;
}

function responsePromise(obj, callback, errback) {
	return make(Promise.resolve(obj).then(callback, errback));
}

responsePromise.make = make;
responsePromise.reject = function (val) {
	return make(Promise.reject(val));
};
responsePromise.promise = function (func) {
	return make(new Promise(func));
};

module.exports = responsePromise;

},{"./normalizeHeaderName":35}],37:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var charMap;

charMap = (function () {
	var strings = {
		alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
		digit: '0123456789'
	};

	strings.genDelims = ':/?#[]@';
	strings.subDelims = '!$&\'()*+,;=';
	strings.reserved = strings.genDelims + strings.subDelims;
	strings.unreserved = strings.alpha + strings.digit + '-._~';
	strings.url = strings.reserved + strings.unreserved;
	strings.scheme = strings.alpha + strings.digit + '+-.';
	strings.userinfo = strings.unreserved + strings.subDelims + ':';
	strings.host = strings.unreserved + strings.subDelims;
	strings.port = strings.digit;
	strings.pchar = strings.unreserved + strings.subDelims + ':@';
	strings.segment = strings.pchar;
	strings.path = strings.segment + '/';
	strings.query = strings.pchar + '/?';
	strings.fragment = strings.pchar + '/?';

	return Object.keys(strings).reduce(function (charMap, set) {
		charMap[set] = strings[set].split('').reduce(function (chars, myChar) {
			chars[myChar] = true;
			return chars;
		}, {});
		return charMap;
	}, {});
}());

function encode(str, allowed) {
	if (typeof str !== 'string') {
		throw new Error('String required for URL encoding');
	}
	return str.split('').map(function (myChar) {
		if (allowed.hasOwnProperty(myChar)) {
			return myChar;
		}
		var code = myChar.charCodeAt(0);
		if (code <= 127) {
			var encoded = code.toString(16).toUpperCase();
 			return '%' + (encoded.length % 2 === 1 ? '0' : '') + encoded;
		}
		else {
			return encodeURIComponent(myChar).toUpperCase();
		}
	}).join('');
}

function makeEncoder(allowed) {
	allowed = allowed || charMap.unreserved;
	return function (str) {
		return encode(str, allowed);
	};
}

function decode(str) {
	return decodeURIComponent(str);
}

module.exports = {

	/*
	 * Decode URL encoded strings
	 *
	 * @param {string} URL encoded string
	 * @returns {string} URL decoded string
	 */
	decode: decode,

	/*
	 * URL encode a string
	 *
	 * All but alpha-numerics and a very limited set of punctuation - . _ ~ are
	 * encoded.
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encode: makeEncoder(),

	/*
	* URL encode a URL
	*
	* All character permitted anywhere in a URL are left unencoded even
	* if that character is not permitted in that portion of a URL.
	*
	* Note: This method is typically not what you want.
	*
	* @param {string} string to encode
	* @returns {string} URL encoded string
	*/
	encodeURL: makeEncoder(charMap.url),

	/*
	 * URL encode the scheme portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeScheme: makeEncoder(charMap.scheme),

	/*
	 * URL encode the user info portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeUserInfo: makeEncoder(charMap.userinfo),

	/*
	 * URL encode the host portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeHost: makeEncoder(charMap.host),

	/*
	 * URL encode the port portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodePort: makeEncoder(charMap.port),

	/*
	 * URL encode a path segment portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodePathSegment: makeEncoder(charMap.segment),

	/*
	 * URL encode the path portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodePath: makeEncoder(charMap.path),

	/*
	 * URL encode the query portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeQuery: makeEncoder(charMap.query),

	/*
	 * URL encode the fragment portion of a URL
	 *
	 * @param {string} string to encode
	 * @returns {string} URL encoded string
	 */
	encodeFragment: makeEncoder(charMap.fragment)

};

},{}],38:[function(require,module,exports){
/*
 * Copyright 2015-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Scott Andrews
 */

'use strict';

var uriEncoder, operations, prefixRE;

uriEncoder = require('./uriEncoder');

prefixRE = /^([^:]*):([0-9]+)$/;
operations = {
	'':  { first: '',  separator: ',', named: false, empty: '',  encoder: uriEncoder.encode },
	'+': { first: '',  separator: ',', named: false, empty: '',  encoder: uriEncoder.encodeURL },
	'#': { first: '#', separator: ',', named: false, empty: '',  encoder: uriEncoder.encodeURL },
	'.': { first: '.', separator: '.', named: false, empty: '',  encoder: uriEncoder.encode },
	'/': { first: '/', separator: '/', named: false, empty: '',  encoder: uriEncoder.encode },
	';': { first: ';', separator: ';', named: true,  empty: '',  encoder: uriEncoder.encode },
	'?': { first: '?', separator: '&', named: true,  empty: '=', encoder: uriEncoder.encode },
	'&': { first: '&', separator: '&', named: true,  empty: '=', encoder: uriEncoder.encode },
	'=': { reserved: true },
	',': { reserved: true },
	'!': { reserved: true },
	'@': { reserved: true },
	'|': { reserved: true }
};

function apply(operation, expression, params) {
	/*jshint maxcomplexity:11 */
	return expression.split(',').reduce(function (result, variable) {
		var opts, value;

		opts = {};
		if (variable.slice(-1) === '*') {
			variable = variable.slice(0, -1);
			opts.explode = true;
		}
		if (prefixRE.test(variable)) {
			var prefix = prefixRE.exec(variable);
			variable = prefix[1];
			opts.maxLength = parseInt(prefix[2]);
		}

		variable = uriEncoder.decode(variable);
		value = params[variable];

		if (value === void 0 || value === null) {
			return result;
		}
		if (Array.isArray(value)) {
			result = value.reduce(function (result, value) {
				if (result.length) {
					result += opts.explode ? operation.separator : ',';
					if (operation.named && opts.explode) {
						result += operation.encoder(variable);
						result += value.length ? '=' : operation.empty;
					}
				}
				else {
					result += operation.first;
					if (operation.named) {
						result += operation.encoder(variable);
						result += value.length ? '=' : operation.empty;
					}
				}
				result += operation.encoder(value);
				return result;
			}, result);
		}
		else if (typeof value === 'object') {
			result = Object.keys(value).reduce(function (result, name) {
				if (result.length) {
					result += opts.explode ? operation.separator : ',';
				}
				else {
					result += operation.first;
					if (operation.named && !opts.explode) {
						result += operation.encoder(variable);
						result += value[name].length ? '=' : operation.empty;
					}
				}
				result += operation.encoder(name);
				result += opts.explode ? '=' : ',';
				result += operation.encoder(value[name]);
				return result;
			}, result);
		}
		else {
			value = String(value);
			if (opts.maxLength) {
				value = value.slice(0, opts.maxLength);
			}
			result += result.length ? operation.separator : operation.first;
			if (operation.named) {
				result += operation.encoder(variable);
				result += value.length ? '=' : operation.empty;
			}
			result += operation.encoder(value);
		}

		return result;
	}, '');
}

function expandExpression(expression, params) {
	var operation;

	operation = operations[expression.slice(0,1)];
	if (operation) {
		expression = expression.slice(1);
	}
	else {
		operation = operations[''];
	}

	if (operation.reserved) {
		throw new Error('Reserved expression operations are not supported');
	}

	return apply(operation, expression, params);
}

function expandTemplate(template, params) {
	var start, end, uri;

	uri = '';
	end = 0;
	while (true) {
		start = template.indexOf('{', end);
		if (start === -1) {
			// no more expressions
			uri += template.slice(end);
			break;
		}
		uri += template.slice(end, start);
		end = template.indexOf('}', start) + 1;
		uri += expandExpression(template.slice(start + 1, end - 1), params);
	}

	return uri;
}

module.exports = {

	/**
	 * Expand a URI Template with parameters to form a URI.
	 *
	 * Full implementation (level 4) of rfc6570.
	 * @see https://tools.ietf.org/html/rfc6570
	 *
	 * @param {string} template URI template
	 * @param {Object} [params] params to apply to the template durring expantion
	 * @returns {string} expanded URI
	 */
	expand: expandTemplate

};

},{"./uriEncoder":37}],39:[function(require,module,exports){
/* eslint-disable */
/**
 * hat
 * written by James Halliday, licensed under MIT/X11
 * https://github.com/substack/node-hat
 */
var hat = module.exports = function (bits, base) {
    if (!base) base = 16;
    if (bits === undefined) bits = 128;
    if (bits <= 0) return '0';
    
    var digits = Math.log(Math.pow(2, bits)) / Math.log(base);
    for (var i = 2; digits === Infinity; i *= 2) {
        digits = Math.log(Math.pow(2, bits / i)) / Math.log(base) * i;
    }
    
    var rem = digits - Math.floor(digits);
    
    var res = '';
    
    for (var i = 0; i < Math.floor(digits); i++) {
        var x = Math.floor(Math.random() * base).toString(base);
        res = x + res;
    }
    
    if (rem) {
        var b = Math.pow(base, rem);
        var x = Math.floor(Math.random() * b).toString(base);
        res = x + res;
    }
    
    var parsed = parseInt(res, base);
    if (parsed !== Infinity && parsed >= Math.pow(2, bits)) {
        return hat(bits, base)
    }
    else return res;
};

},{}],40:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var NODE_ENV = process.env.NODE_ENV;

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (NODE_ENV !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

}).call(this,require('_process'))
},{"_process":2}]},{},[1]);
