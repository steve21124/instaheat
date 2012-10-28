/**************************************************************************** 
Instaheat - google heatmap of Instagram pictures

Map.js - MAIN CLASS with:
- map initialization, 
- ajax requests to the server
- map listeners
****************************************************************************/


/*********************************************************************
GLOBAL VARIABLES
**********************************************************************/


//var sanFrancisco = new google.maps.LatLng(37.774546, -122.433523);
//var shenZhen = new google.maps.LatLng(22.562025, 114.029846);

var berkeley = new google.maps.LatLng(37.875527, -122.258639);
var map, heatmap, pointArray;
var graphdata=[ ];

// global variable to track data within maps
var data_within_map = [];

// global var to store previous zoom level, set to the default value
var previous_zoom_level = 14; 

//var testPointsData = toMapPts([{location: {longitude: 22.489065, latitude: 113.912812}}, {location: {longitude: 22.485591, latitude: 113.917026}}]); // my home ;)

// already loaded points in google maps
var loaded_points=[];
// already loaded points in google maps format + raw data from the server
var all_points=[];

var UPDATE_ON_MAP_DRAG = false;
var UPDATE_ON_MAP_ZOOM = false;
var UPDATE_DATA_WITHIN_MAPS = true;






/*********************************************************************
*
*  FUNCTIONS. Main flow. Arranged similar to the calling order
*
**********************************************************************/



// Initializes the map. Called when the index.html is loaded in a browser
function initialize() {

    // put Berkeley as a first viewed city on the map
    var center = berkeley;

    // set up map options
    var mapOptions = {
        zoom: 14,
        center: center,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

    // Requests hadnling-related times, map center location
    var nowTime, lastTime = 0, newCenter;
     // Min Time between update requests on map change events (zoom, drag etc)
    var MIN_INTERVAL_MLSEC = 1800; 
    // initial zoom
    var current_zoom = 14;

    // Ask browser for it's location
    getLocation();

    // listener to map drag events, updates the heatmap (calls channelLoc) if the flag UPDATE_ON_MAP_DRAG is true
    google.maps.event.addListener(map, 'dragend', function() {
        
        nowTime = new Date().getTime();
        
        //console.log("dragend fired: new lat lon are ", map.getCenter().lat(), map.getCenter().lng());
        if (nowTime - lastTime > MIN_INTERVAL_MLSEC) {

            newCenter = {coords: {latitude: map.getCenter().lat(), longitude: map.getCenter().lng()}};

            updateWithinMaps();

            if (UPDATE_ON_MAP_DRAG){            
                channelLoc(newCenter,false, MapSize(map).width);
            }

        }
        
        // Update the time when we last asked for the heapmap updates through channelLoc
        lastTime = new Date().getTime();        

    });


    // listener to map zoom events, updates the heatmap (calls channelLoc) if the flag UPDATE_ON_MAP_ZOOM is true
    google.maps.event.addListener(map, 'zoom_changed', function() {
        nowTime = new Date().getTime();
        //console.log("zoom_changed fired: new lat lon are ", map.getCenter().lat(), map.getCenter().lng());
        if (nowTime - lastTime > MIN_INTERVAL_MLSEC) {

            newCenter = {coords: {latitude: map.getCenter().lat(), longitude: map.getCenter().lng()}};

            current_zoom = map.getZoom();

            updateWithinMaps();

            if (UPDATE_ON_MAP_ZOOM){
                if ((current_zoom - previous_zoom_level) > 0 ) {
                    channelLoc(newCenter,false, MapSize(map).width);
                }

            }
            
            previous_zoom_level = current_zoom;
            console.log("Google Maps zoomed. heigth is", current_zoom, MapSize(map).height,"width", MapSize(map).width);
        }

        // Update the time when we last asked for the heapmap updates through channelLoc
        lastTime = new Date().getTime();        

    });

}

// Fetches raw data containing points info. Gets user's browser location.
function getLocation() {

    console.log("in getLocation");

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(firstChannel);
    } else {
        alert("Oops. Looks like your location can't be fetched.");
    }
}

// Calls the channelLoc - function that post request to server - for the first time
function firstChannel(loc) {

    console.log("in firstChannel");

    channelLoc(loc, 1);
}

// Makes an ajax request to server, and CHANNELS it to loadHeatMap(). Calculates the graph via computeHist(). Calls ProcessImages().
function channelLoc(position, toPan, dist) {

    // Check if we pass the distance to the function    
    if (typeof dist == "undefined")  { 
        dist = 6787;
        console.log("in ChannelLoc, Distance was undefined");
    }

    // Pull data from last 24 hours
    min_timestamp = (new Date()).getTime() / 1000 - 24*3600; 


     var request_url = "/data?lon=" + position.coords.longitude + "&lat=" +
            position.coords.latitude + "&distance="+ dist + "&min_timestamp=" + min_timestamp;
    
    console.log("in channelLoc. Posting request: ", request_url);

    // post the request to our server (server calls Instagram API)
    $.ajax({

        url: request_url,
        
        dataType: "json",
        
        success: function (d) {
        
            console.log("Data retrieved: ", d.length);

            // update the global variable of data
            data_within_map = d;

            loadHeatMap(toMapPts(d), position.coords.latitude,
                        position.coords.longitude, toPan);
            
            // Calculate data for the graph
            computeHist(d);
            
            processImages(d);
        },

        error: function () {
            console.log("ERROR: Unable to fetch Instagram data.");
        }

    });
}

// Loads the heat map shifting the center to current location. mapPts - array of points; toPan - used for the search bar implementation
function loadHeatMap(mapPts, lat, lon, toPan) {
    
    console.log("in loadHeatMap");

    var pointArray = new google.maps.MVCArray(mapPts);

    var heatmap = new google.maps.visualization.HeatmapLayer({
        data: pointArray,
        radius: 20,
        dissipating: true
    });

    heatmap.setMap(map);

    // Check if we call this using the search bar
    if (toPan) map.panTo(new google.maps.LatLng(lat, lon));
}

// Function that calculates data for the graph
// TODO - Get a hand of different timezones
function computeHist(data){

    console.log("in computeHist()");

    // number of histogram bars, time that we are plotting within
    var nb_points=25, time= 3600*24;
    // current time
    var current_time = new Date();
    var ts = Math.round(current_time.getTime() / 1000);

    var ratio, interval;
    var array=[];
    var i=0;
    graphdata = [];

    // update data to the data within maps
    if (UPDATE_DATA_WITHIN_MAPS){
        data = data_within_map; 
    }  

    // nullify the array
    while (i<nb_points) {array[i] = 0;i++;}

    // get the array filled with interpolated values
    for (var i = 0;i < data.length ; i++) {

        interval< (ts - data[i].created_time)

        if(interval <= time)
        // if the object was created within the plottable time
        {
            ratio = Math.floor((ts - data[i].created_time)/(time)*nb_points);
            array[ratio]+=1;
        }
    };

    // Push the array together with the timestamp to the graph data
    for (var i = nb_points - 1; i > 0 ; i--) {

        // creating timestamp in hours
        var timestamp =  (nb_points - i + current_time.getHours()) * 3600;

        console.log(timestamp, array[i]);

        graphdata.push({x: timestamp, y: array[i] } );
    };

    plotgraph(graphdata);
}


// Processing the images
function processImages(data) {
    return;
    var i = 0;
    data.sort(function (a,b) {
        return b.likes.count - a.likes.count;
    });
   // console.log(data);
    $(".picture").each(function () {
        if (i > data.length || data.length == 0) return;
        $(this).css("background-image", "url(" + data[i++].images.standard_resolution.url + ")");
        $(this).html('<div class="text"></div>');

    });
}






/*********************************************************************
*
*  FUNCTIONS. Secondary ones - used to process/convert the data.
*
**********************************************************************/



// Creates google maps "edible" points from a list of raw points.
function toMapPts(points) {

    var mapPts = [];

    for (var i = 0; i < points.length; ++i) {

        if(loaded_points.indexOf(points[i].id) == -1) 
        // first check if the point was already loaded into google maps
        { 
    	    // create the point and push it to the google map points array
            var pt = new google.maps.LatLng(points[i].location.latitude, points[i].location.longitude);
    	    mapPts.push(pt);

            // update the global variables
    	    loaded_points.push(points[i].id);
    	    all_points.push([pt, points[i]]);
	   }
    }

    return mapPts;
}

// Calculate the width and height of a google map and returns a list with 2 fields: width, height
function MapSize (mapobj) {

    // function that calculates distance on the map
    google.maps.LatLng.prototype.distanceFrom = function(latlng) {
      var lat = [this.lat(), latlng.lat()]
      var lng = [this.lng(), latlng.lng()]
      var R = 6378137;
      var dLat = (lat[1]-lat[0]) * Math.PI / 180;
      var dLng = (lng[1]-lng[0]) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat[0] * Math.PI / 180 ) * Math.cos(lat[1] * Math.PI / 180 ) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      var d = R * c;
      return Math.round(d);
    }

    //
    var bounds = mapobj.getBounds(), 
    cor1 = bounds.getNorthEast(), 
    cor2 = bounds.getSouthWest(), 
    cor3 = new google.maps.LatLng(cor2.lat(), cor1.lng()), 
    cor4 = new google.maps.LatLng(cor1.lat(), cor2.lng()), 
    height = cor1.distanceFrom(cor3), 
    width = cor1.distanceFrom(cor4);

    return {width: width, height: height};
}


// Updates the global variable data_within_maps so that it only has values within current bounds
function updateWithinMaps () {

    var bounds = map.getBounds();
    data_within_map = []
    for(var i = 0; i < all_points.length; i++) {
        if(bounds.contains(all_points[i][0])) {
            data_within_map.push(all_points[i][1]);
        }
    }
}

// Update the images to ony have those within map boundaries. Arnaud - please explain what's being done below inline
function updateImages() {
    
    // first find images that are in the bounds
    imgs = data_within_map;

    // sort by the like number
    imgs.sort(function (a,b) {
	return b.likes.count - a.likes.count;
    });


    $(".picture").remove();
    var target = $("#tabs-2");
    var link;

    for(var i = 0; i < imgs.length; i++)
    {   //Clean url for the links
        if (imgs[i].link==null)link = "#tabs-2";else link =imgs[i].link;
        $('<a href="' +link+'" class="picture_link"><div class="picture"></div></a>').appendTo(target);
    } 

    var i=0;

    $(".picture").each(function () {
       var img= imgs[i++];
   
       var infos= format_infos(img);
        $(this).css("background-image", "url(" + img.images.standard_resolution.url + ")");
        $(this).html('<div class="text">'+infos+'</div>');
    });
}


$(function () {
    $(".icon2").click(updateImages);
});


// Handling the search bar in index.html
function search() {

    var addressField = document.getElementById('search_address');

    var geocoder = new google.maps.Geocoder();

    geocoder.geocode(
        {'address': addressField.value}, 
        function(results, status) { 
            if (status == google.maps.GeocoderStatus.OK) { 

                var loc = results[0].geometry.location;
                var newCenter = {coords: {latitude: loc.lat(), longitude: loc.lng()}};

                console.log(newCenter);
                
                firstChannel(newCenter);
                // use loc.lat(), loc.lng()
            } 
            else {
                alert("Not found: " + status); 
            } 
        }
    );
};

// Format info shown on pictures
function format_infos(img){

    var name, informations,likes;

    // some pics don't have info - so try/catch it
    try {
        name=img.user.full_name;
    }
    catch(err) {
        name=' ';
    }

    likes = img.likes.count;
    informations='<li>'+name+ '</li><li class="ico like">j &nbsp;</li><li class="like">'+ likes +'</li>';
    
    return informations;
}
