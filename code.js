var instaToken = "235597193.173372b.50bdb5394d7b4063b8147f10b928532d";



function getPicsBefore (lat, lon, dist_km, before,  callback) {
    var url = "https://api.instagram.com/v1/media/search?lat="+lat+"&lng="+lon+"&distance="+(dist_km*1000);
    if(before) url += "&max_timestamp="+before;
    url += "&access_token="+instaToken+"&callback=?";
    //console.log(url);

    // the 0 image is the newest image
    $.ajax({
	url: url,
	dataType: "jsonp",
	success: function (data) {
	    callback(data);
	}
    });
}

function getPics (lat, lon, dist_km, count, callback, timestamp) {
    var ret=[];
    var oldest = 0;
    (function (ret) {
	function getMore() {
	    getPicsBefore(lat, lon, dist_km, oldest, function (data) {
		//console.log(data);
		oldest = data.data[data.data.length-1].created_time - 1;
		ret = ret.concat(data.data);
		//console.log(ret);
		if(ret.length < count)
		    getMore();
		else
		    callback(ret);
	    });
	}
	getMore();
    })(ret);
}

// fb location: 37.4832526, -122.150037



$(function () {
    // test case:
    console.log(getPics(37.483, -122.1500, 10, 10, function (d) {
	pics = d;
	console.log(d);
    }));
});