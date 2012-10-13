var sanFrancisco = new google.maps.LatLng(37.774546, -122.433523);
var shenZhen = new google.maps.LatLng(22.562025, 114.029846);
var berkeley = new google.maps.LatLng(37.875527, -122.258639);
var map, heatmap, pointArray;
//var testPointsData = toMapPts([{location: {longitude: 22.489065, latitude: 113.912812}}, {location: {longitude: 22.485591, latitude: 113.917026}}]); // my home ;)

// Transforms google maps points from a list of raw points.
function toMapPts(points) {
    var mapPts = [];
    for (var i = 0; i < points.length; ++i) {
        //console.log(points[i].location.longitude, points[i].location.latitude);
        mapPts.push(new google.maps.LatLng(points[i].location.latitude, points[i].location.longitude));
    }
    return mapPts;
}

// Fetches raw data containing points info.
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(channelLoc);
    } else {
        alert("CRASH! getLocation")
    }
}

// Initializes the map.
function initialize() {
    var center = berkeley;
    var mapOptions = {
        zoom: 13,
        center: center,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);
    getLocation();
}

// Shifts center and loads the heat map.
function loadHeatMap(mapPts, lat ,lon) {
    var pointArray = new google.maps.MVCArray(mapPts);
    var heatmap = new google.maps.visualization.HeatmapLayer({
       data: pointArray
    });
    heatmap.setMap(map);
    map.panTo(new google.maps.LatLng(lat, lon));
}

// Makes an ajax request to browser to retrieve user's location, and channels
// it to loadHeatMap().
function channelLoc(position) {
    $.ajax({
        url: "/data?lon=" + position.coords.longitude + "&lat=" +
            position.coords.latitude,//"&dist="dist
        dataType: "json",
        success: function (d) {
            console.log(d);
            loadHeatMap(toMapPts(d), position.coords.latitude,
                        position.coords.longitude);
            processImages(d);
        },
        error: function () {
            console.log("ERROR");
        }
    });
}

function processImages(data) {
    var i = 0;
    data.sort(function (a,b) {
        return b.likes.count - a.likes.count;
    });
   // console.log(data);
    $(".picture").each(function () {
        if(i > data.length) return;
        $(this).css("background-image", "url("+data[i++].images.standard_resolution.url+")");
    });
}
