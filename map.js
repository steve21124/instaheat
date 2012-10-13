// returns google maps points from a list of raw points
// .lon: longitude
// .lat: latitude
function getCoord(points) {
    var mapPts = [];
    for (var i = 0; i < points.length; ++i) {
        mapPts.push(new google.maps.LatLng(points[i].lon, points[i].lat));
    }
    return mapPts;
}

// fetch raw data containing points info
function fetchRawPts() {
}

function initialize() {

    var sanFrancisco = new google.maps.LatLng(37.774546, -122.433523);

    // the options of the heat map
    var mapOptions = {
        zoom: 10,
        center: sanFrancisco,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    // toy
    // var pointsData = getCoord([{'a':1, lon: 22, lat:112}, {lon:22, lat:110}]); 
    var pointsData = getCoord(fetchRawPts());

    var map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

    var pointArray = new google.maps.MVCArray(pointsData);

    var heatmap = new google.maps.visualization.HeatmapLayer({
        data: pointArray
    });

    heatmap.setMap(map);
}
