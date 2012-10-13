function initialize() {

    var sanFrancisco = new google.maps.LatLng(37.774546, -122.433523);

    // the options of the heat map
    var mapOptions = {
        zoom: 13,
        center: sanFrancisco,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    // coordinates of points; toy example
    // should fetch & parse json
    var pointsData = [
        new google.maps.LatLng(37.782551, -122.445368),
        new google.maps.LatLng(37.782745, -122.444586),
        new google.maps.LatLng(37.782842, -122.443688),
        new google.maps.LatLng(37.782919, -122.442815),
        new google.maps.LatLng(37.782992, -122.442112),
        new google.maps.LatLng(37.783100, -122.441461),
        new google.maps.LatLng(37.783206, -122.440829),
        new google.maps.LatLng(37.783273, -122.440324),
        new google.maps.LatLng(37.783316, -122.440023),
        new google.maps.LatLng(37.783357, -122.439794),
        new google.maps.LatLng(37.783371, -122.439687)
    ]

    var map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

    var pointArray = new google.maps.MVCArray(pointsData);

    var heatmap = new google.maps.visualization.HeatmapLayer({
        data: pointArray
    });

    heatmap.setMap(map);
}
