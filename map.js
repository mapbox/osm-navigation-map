mapboxgl.accessToken = 'pk.eyJ1IjoicGxhbmVtYWQiLCJhIjoiemdYSVVLRSJ9.g3lbg_eN0kztmsfIPxa9MQ';
var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/planemad/cinpwopfb008hcam0mqxbxwuq', //stylesheet location
    center: [-122.4310, 37.7638], // starting position
    zoom: 11, // starting zoom
    hash: true,
    attributionControl: false
});

// Define switchable map layers
var toggleLayers = {
  'turn-restrictions': {
    'layers': ['noturn','noturn from', 'noturn via', 'noturn via highlight', 'noturn labels'],
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
    'filter-compare': ['==','meta_user'],
    'filter-values': ["ruthmaben","PlaneMad","srividya_c","Chetan_Gowda","ramyaragupathy","nikhilprabhakar","jinalfoflia","pratikyadav","aarthy","oini","Jothirnadh","saikabhi","geohacker","shvrm","manings","sanjayb","Arunasank","nammala","poornibadrinath"]
  }
}

// Parse the toggleFilters to build the compound filter arrays
function parseToggleFilters(){
  for (var filterItem in toggleFilters){

    var parsedFilter = new Array();
    parsedFilter.push(toggleFilters[filterItem]['filter-mode']);

    for (var value in toggleFilters[filterItem]['filter-values']){
      var filter = new Array();
      filter.push(toggleFilters[filterItem]['filter-compare'][0],toggleFilters[filterItem]['filter-compare'][1],toggleFilters[filterItem]['filter-values'][value]);
      parsedFilter.push(filter);
    }

    toggleFilters[filterItem]['filter'] = parsedFilter;
  }
}
parseToggleFilters();

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
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
        } else {
            $(this).addClass('active');
        }

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
});

function init() {
    // do all initialisation stuff here
    var mapillaryTrafficSource = {
      "type": "vector",
      "tiles": [
          "http://mapillary-vector.mapillary.io/tiles/{z}/{x}/{y}.mapbox?ors=key,l,package,value,validated,image_key,user,score,obj,rect",
        ],
        "minzoon": 16,
        "maxzoom": 16
    };

    var mapillaryLineSource = {
        "type": "vector",
        "tiles": [
        "https://d2munx5tg0hw47.cloudfront.net/tiles/{z}/{x}/{y}.mapbox"
        ],
        "minzoom": 2,
        "maxzoom": 16
    };

    map.addSource("mapillary", mapillaryTrafficSource);
    map.addSource("mapillaryLineSource", mapillaryLineSource);

    var mapillaryTrafficLayer = {
        "id": "mapillaryTrafficLayer",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'ors',
        'layout': {
            'visibility': 'none'
        },
        "paint": {
            "circle-radius": 4,
            "circle-color": "#05d107"
        }
    };

    var mapillaryLineStyle = {
        "id": "mapillaryLineStyle",
        "type": "line",
        "source": "mapillaryLineSource",
        "source-layer": "mapillary-sequences",
        "layout": {
            "visibility": "none"
        },
        "paint": {
            "line-color": '#007501',
            "line-width": 2,
            "line-opacity": 0.5
        }
    };

    var mapillaryTrafficLayerOuter = {
        "id": "mapillaryTrafficLayerOuter",
        "type": "circle",
        "source": "mapillary",
        'source-layer': 'ors',
        "layout": {
            "visibility": "none"
        },
        "paint": {
            "circle-radius": 15,
            "circle-color": "#007501",
            "circle-blur": 1
        },
        "filter": ["==", "key", ""]
    };

    var mapillaryLabel = {
        "id": "mapillarylabel",
        "type": "symbol",
        "source": "mapillary",
        "source-layer": "ors",
        "layout": {
            "text-field": "{value}",
            "text-size": 15,
            "text-offset": [0,2],
            "visibility": "none"
        },
        "paint": {
            "text-color": "#05d107",
            "text-halo-color": "black",
            "text-halo-width": 1
        }
    };

    map.addLayer(mapillaryLineStyle);
    map.addLayer(mapillaryTrafficLayerOuter);
    map.addLayer(mapillaryTrafficLayer);
    map.addLayer(mapillaryLabel);

    map.on('click', function(e) {
        var f = map.queryRenderedFeatures(e.point, {layers:['mapillaryTrafficLayer']});
        if (f.length) {
            var imageKey = f[0].properties.image_key;
            var imageUrl = 'https://d1cuyjsrcm0gby.cloudfront.net/'+imageKey+'/thumb-640.jpg';
            map.setFilter('mapillaryTrafficLayerOuter', ['==', 'key', f[0].properties.key]);
            $('#mapillary-image').removeClass('hidden');
            $('#mapillary-image').attr('src', imageUrl);

            //Open in JOSM
            var bounds = map.getBounds();
            var top = bounds.getNorth();
            var bottom = bounds.getSouth();
            var left = bounds.getWest();
            var right = bounds.getEast();
            var josmUrl = 'http://127.0.0.1:8111/load_and_zoom?left='+left+'&right='+right+'&top='+top+'&bottom='+bottom;
            $.ajax(josmUrl, function() {});
        }

        // Show popup of OSM feature
        var osmFeature = map.queryRenderedFeatures(e.point, {layers:['noturn']})
        if (osmFeature.length) {

          // Check if feature is node or a way
          var osmType = osmFeature[0].geometry.type == 'LineString' ? 'way' : 'node';
          var point = osmType == 'way' ? e.lngLat : osmFeature[0].geometry.coordinates ;
          var popupHTML = "<strong>OpenStreetMap Turn Restriction</strong><br>" + osmType + "</b>: <a href='https://www.openstreetmap.org/" + osmType + "/" + osmFeature[0].properties.id + "'>" + osmFeature[0].properties.id + "</a>"

          var popup = new mapboxgl.Popup()
          .setLngLat(point)
          .setHTML(popupHTML)
          .addTo(map);
        }
        //Open in JOSM
        var bounds = map.getBounds();
        var top = bounds.getNorth();
        var bottom = bounds.getSouth();
        var left = bounds.getWest();
        var right = bounds.getEast();
        var josmUrl = 'https://127.0.0.1:8112/load_and_zoom?left='+left+'&right='+right+'&top='+top+'&bottom='+bottom;
        $.ajax(josmUrl, function() {});

    });

    map.on('load', function() {
        // Set feature counts
        var turnrestrictionsCount = map.querySourceFeatures('composite', {'sourceLayer': 'turnrestrictions'}).length;
        var onewayCount = map.querySourceFeatures('composite', {'sourceLayer': 'road'}).length;
        var turnlanesCount = map.querySourceFeatures('composite', {'sourceLayer': 'turnlanes'}).length;
        var trafficsignalsCount = map.querySourceFeatures('composite', {'sourceLayer': 'trafficsignals'}).length;
        var speedCount = map.querySourceFeatures('composite', {'sourceLayer': 'maxspeed'}).length;
        var mapillaryphotoCount = map.querySourceFeatures('mapillary', {'sourceLayer': 'ors'}).length;

        $('#turn-restriction-count').text(Math.floor(turnrestrictionsCount / 3));
        $('#oneway-count').text(onewayCount);
        $('#turn-lanes-count').text(turnlanesCount);
        $('#traffic-signals-count').text(trafficsignalsCount);
        $('#maxspeed-count').text(speedCount);
    });
}



function toggleMapillary() {
    var mapillaryLayers = ['mapillaryLineStyle', 'mapillaryTrafficLayerOuter', 'mapillaryTrafficLayer', 'mapillarylabel'];
    mapillaryLayers.forEach(function (id) {
        var currentState = map.getLayoutProperty(id, 'visibility');
        var nextState = currentState === 'none' ? 'visible' : 'none';
        map.setLayoutProperty(id, 'visibility', nextState);
    });
    if (!$("#mapillary-image").hasClass('hidden')) {
        $("#mapillary-image").addClass('hidden');
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
  for (var layerItem in toggleLayers){
    for (var layer in toggleLayers[layerItem].layers){
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
function toggleLayerFilters(layerItems, filterItem){

  for (var i in layerItems){
    for (var j in toggleLayers[layerItems[i]].layers){

      var existingFilter = map.getFilter(toggleLayers[layerItems[i]].layers[j]);

      // Construct and add the filters if none exist for the layers
      if(typeof existingFilter == 'undefined'){
        map.setFilter(toggleLayers[layerItems[i]].layers[j], toggleFilters[filterItem].filter);
      }
      else{
        // Not implemented
        var newFilter = mergeLayerFilters(existingFilter, toggleFilters[filterItem].filter);
        map.setFilter(toggleLayers[layerItems[i]].layers[j], newFilter);
        // console.log(newFilter);
      }

    }
  }
}

// Merge two GL layer filters into one
function mergeLayerFilters(existingFilter, mergeFilter){
  var newFilter = new Array();

  // If the layer has a simple single filter
  if (existingFilter[0] == '=='){
    newFilter.push("all", existingFilter, mergeFilter)
  }

  return newFilter;
}

// Show title and description in the info bar
// function setInfo(id) {
//   $('.info #title').text(toggleLayers[id].title);
//   $('.info #description').text(toggleLayers[id].description);
// }
