var sanFrancisco = new google.maps.LatLng(37.774546, -122.433523);
var shenZhen = new google.maps.LatLng(22.562025, 114.029846);
var berkeley = new google.maps.LatLng(37.875527, -122.258639);
var map, heatmap, pointArray;
var graphdata=[ ];
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
        alert("Oops. Looks like your location can't be fetched.");
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

    var nowTime, lastTime = 0, newCenter;
    google.maps.event.addListener(map, 'bounds_changed', function() {
        nowTime = new Date().getTime();
        if (nowTime - lastTime > 1500) {
            newCenter = {coords: {latitude: map.getCenter().lat(), longitude: map.getCenter().lng()}};
            channelLoc(newCenter)
        }
        lastTime = new Date().getTime();
    });

    getLocation();
}

// Shifts center and loads the heat map.
function loadHeatMap(mapPts, lat ,lon) {
    console.log("in loadHeatMap");
    var pointArray = new google.maps.MVCArray(mapPts);
    var heatmap = new google.maps.visualization.HeatmapLayer({
       data: pointArray
    });
    heatmap.setMap(map);
    map.panTo(new google.maps.LatLng(lat, lon));
}

// Makes an ajax request to browser to retrieve user's location, and channels
// it to loadHeatMap(), adjusting the map.
function channelLoc(position) {
    console.log("in channelLoc");
    $.ajax({
        url: "/data?lon=" + position.coords.longitude + "&lat=" +
            position.coords.latitude,//"&dist="dist
        dataType: "json",
        success: function (d) {
<<<<<<< HEAD
            //console.log(d);
=======
            console.log(d);
            computeHist(d);
>>>>>>> histogram working
            loadHeatMap(toMapPts(d), position.coords.latitude,
                        position.coords.longitude);
            processImages(d);
        },
        error: function () {
            console.log("ERROR: Unable to fetch Instagram data.");
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
        if (i > data.length || data.length == 0) return;
        $(this).css("background-image", "url(" + data[i++].images.standard_resolution.url + ")");
    });
}
function computeHist(data){
    var nb_points=10, time= 3600*24;
    var ts = Math.round((new Date()).getTime() / 1000);
    var ratio;
    var array=[];
    var i=0;
    while (i<nb_points) {array[i] = 0;i++;}

    for (var i = 0;i < data.length ; i++) {
        if((ts - data[i].created_time)< (time)){
            ratio = Math.floor((ts - data[i].created_time)/(time)*nb_points);
            array[ratio]+=1;
        }
    };
    for (var i = 0;i < nb_points ; i++) {
        graphdata.push({x: i,y: array[i]});
    };
    console.log(graphdata);
    plotgraph(graphdata);
}
