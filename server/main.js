var express = require('express');
var http = require('http');
var https = require('https');

var instaToken = "235597193.173372b.50bdb5394d7b4063b8147f10b928532d";

function getPicsBefore (lat, lon, dist_km, before,  callback) {
    var url = "https://api.instagram.com/v1/media/search?lat="+lat+"&lng="+lon+"&distance="+(dist_km*1000);
    if(before) url += "&max_timestamp="+before;
    url += "&access_token="+instaToken; // +"&callback=?";
    //console.log(url);

    // the 0 image is the newest image
    /*$.ajax({
	url: url,
	dataType: "jsonp",
	success: function (data) {
	    callback(data);
	}
    });*/

    https.get(url, function (ev) {
	var buffer = "";
	ev.on('data', function (buf) {
	    buffer += buf.toString();
	});
	ev.on('end', function () {
	    var j = {};
	    try {
		j = JSON.parse(buffer);
	    } catch(e) {}
	    callback(j);
	});
    }).on('error', function (err) {
	console.log('err', err);
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


var app = express();

app.get('/', function(req, res) {
    res.redirect('/index.html');
});


app.get('/test', function (req, res) {
    res.end('running');
    getPics(37.483, -122.15, 10, 10, function (c) {
	console.log(c);
    });
});








app.use(express.static(".."));
app.use(app.router);


app.listen(3000);

console.log('server running on 3000');