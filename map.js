var sanFrancisco = new google.maps.LatLng(37.774546, -122.433523);
var shenZhen = new google.maps.LatLng(22.562025, 114.029846);
var berkeley = new google.maps.LatLng(37.875527, -122.258639);
var map, heatmap, pointArray;
var graphdata=[ ];

var data_within_map = [];

// var to store previous zoom level, set to the default value
var previous_zoom_level = 14; 
//var testPointsData = toMapPts([{location: {longitude: 22.489065, latitude: 113.912812}}, {location: {longitude: 22.485591, latitude: 113.917026}}]); // my home ;)

// already loaded points in google maps
var loaded_points=[];
var all_points=[];

// Transforms google maps points from a list of raw points.
function toMapPts(points) {
    var mapPts = [];
    for (var i = 0; i < points.length; ++i) {
        //console.log(points[i].location.longitude, points[i].location.latitude);
        if(loaded_points.indexOf(points[i].id) == -1) { // check if the point was already loaded into google maps
	    var pt = new google.maps.LatLng(points[i].location.latitude, points[i].location.longitude);
	    mapPts.push(pt);
	    loaded_points.push(points[i].id);
	    all_points.push([pt, points[i]]);
	   }
    }
    return mapPts;
}

function toMapPtsFrsq(points) {
    var mapPts = [];
    for (var i = 0; i < points.length; ++i) {
        //console.log(points[i].location.longitude, points[i].location.latitude);
        if(loaded_points.indexOf(points[i].id) == -1) { // check if the point was already loaded into google maps
        var pt = {location: new google.maps.LatLng(points[i].location.latitude, points[i].location.longitude), weight: points[i].likes.count};
        mapPts.push(pt);
        loaded_points.push(points[i].id);
        all_points.push([pt, points[i]]);
        }
    }
    return mapPts;
}

function firstChannel(loc) {
    console.log("in firstChannel");
    channelLoc(loc, 1);
}

// Fetches raw data containing points info.
function getLocation() {
    console.log("in getLocation");
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(firstChannel);
    } else {
        alert("Oops. Looks like your location can't be fetched.");
    }
}

// Initializes the map.
function initialize() {
    var center = berkeley;
    var mapOptions = {
        zoom: 14,
        center: center,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

    var nowTime, lastTime = 0, newCenter;
    var MIN_INTERVAL_MLSEC = 1800; // Min Time between update requests 
    var current_zoom = 14;

    google.maps.event.addListener(map, 'dragend', function() {
        nowTime = new Date().getTime();
        //console.log("dragend fired: new lat lon are ", map.getCenter().lat(), map.getCenter().lng());
        if (nowTime - lastTime > MIN_INTERVAL_MLSEC) {

            newCenter = {coords: {latitude: map.getCenter().lat(), longitude: map.getCenter().lng()}};


            updateWithinMaps();            
            channelLoc(newCenter,false, MapSize(map).height);


        }

        lastTime = new Date().getTime();

    });

    google.maps.event.addListener(map, 'zoom_changed', function() {
        nowTime = new Date().getTime();
        //console.log("zoom_changed fired: new lat lon are ", map.getCenter().lat(), map.getCenter().lng());
        if (nowTime - lastTime > MIN_INTERVAL_MLSEC) {

            newCenter = {coords: {latitude: map.getCenter().lat(), longitude: map.getCenter().lng()}};

            current_zoom = map.getZoom();

            updateWithinMaps();

            if ((current_zoom - previous_zoom_level) > 0 ) {
                channelLoc(newCenter,false, MapSize(map).height);
            }
            previous_zoom_level = current_zoom;
            console.log("Google Maps zoomed. heigth is", current_zoom, MapSize(map).height,"width", MapSize(map).width);
        }

        lastTime = new Date().getTime();        

    });

    getLocation();
}


// Calculate the width and height of a google map
function MapSize (mapobj) {

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

    var bounds = mapobj.getBounds(), 
    cor1 = bounds.getNorthEast(), 
    cor2 = bounds.getSouthWest(), 
    cor3 = new google.maps.LatLng(cor2.lat(), cor1.lng()), 
    cor4 = new google.maps.LatLng(cor1.lat(), cor2.lng()), 
    width = cor1.distanceFrom(cor3), 
    height = cor1.distanceFrom(cor4);

    return {width: width, height: height};
}

// Shifts center and loads the heat map.
function loadHeatMap(mapPts, lat, lon, toPan) {
    console.log("in loadHeatMap");
    var pointArray = new google.maps.MVCArray(mapPts);
    var heatmap = new google.maps.visualization.HeatmapLayer({
        data: pointArray,
        radius: 20,
        dissipating: true
    });
    heatmap.setMap(map);
    if (toPan) map.panTo(new google.maps.LatLng(lat, lon));
}

// Makes an ajax request to browser to retrieve user's location, and channels
// it to loadHeatMap(), adjusting the map.
function channelLoc(position, toPan, dist) {
    
    if (typeof dist == "undefined")  { 
        dist = 6787;
        console.log("in ChannelLoc, Distance was undefined");
    }

    min_timestamp = (new Date()).getTime() / 1000 - 24*3600; // data from last 24 hours
    console.log("in channelLoc");
    $.ajax({
        url: "/data?lon=" + position.coords.longitude + "&lat=" +
            position.coords.latitude + "&distance="+ dist + "&min_timestamp=" + min_timestamp,
        dataType: "json",
        success: function (d) {
            console.log("Data retrieved: ", d.length);

            data_within_map = d;

            loadHeatMap(toMapPts(d), position.coords.latitude,
                        position.coords.longitude, toPan);
            
            computeHist(d);
            
            processImages(d);
        },
        error: function () {
            console.log("ERROR: Unable to fetch Instagram data.");
        }
    });
}
/*
function channelLocFrsq(position) {

    console.log("in channelLoc, distance reuested = ", dist);
    $.ajax({
        url: "/data?lon=" + position.coords.longitude + "&lat=" +
            position.coords.latitude + "&distance="dist,
        dataType: "json",
        success: function (d) {
            computeHist(d);
            loadHeatMap(toMapFrsqPts(d), position.coords.latitude,
                        position.coords.longitude);
            processImages(d);
        },
        error: function () {
            console.log("ERROR: Unable to fetch Instagram data.");
        }
    });
}
*/
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

// TODO - Get a hand of different timezones
function computeHist(data){
    console.log("in computeHist()");
    var nb_points=25, time= 3600*24;
    var current_time = new Date();
    var ts = Math.round(current_time.getTime() / 1000);
    var ratio;
    var array=[];
    var i=0;
    graphdata = [];

    data = data_within_map;

    // nullify the array
    while (i<nb_points) {array[i] = 0;i++;}

    // get the array filled with interpolated values
    for (var i = 0;i < data.length ; i++) {
        if((ts - data[i].created_time)< (time)){
            ratio = Math.floor((ts - data[i].created_time)/(time)*nb_points);
            array[ratio]+=1;
        }
    };

    // Push the array together with the timestamp to the graph data
    for (var i = nb_points - 1; i > 0 ; i--) {
        var timestamp =  (nb_points - i + current_time.getHours()) * 3600;
        console.log(timestamp, array[i]);
        graphdata.push({x: timestamp, y: array[i] } ); // we output x axis * 60 for plotttng purposes
    };
    //console.log("Graphdata =:", graphdata);
    plotgraph(graphdata);
}

function updateWithinMaps () {

    var bounds = map.getBounds();
    data_within_map = []
    for(var i = 0; i < all_points.length; i++) {
        if(bounds.contains(all_points[i][0])) {
            data_within_map.push(all_points[i][1]);
        }
    }
}

function updateImages() {
    
    // first find images that are in the bounds
    imgs = data_within_map;

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
function format_infos(img){
    var name, informations,likes;
    try{
        name=img.user.full_name;
    }catch(err){
        name=' ';
    }
    likes = img.likes.count;
    informations='<li>'+name+ '</li><li class="ico like">j &nbsp;</li><li class="like">'+ likes +'</li>';
    return informations;
}
