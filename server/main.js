var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');

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
	    var j = [];
	    try {
		j = JSON.parse(buffer);
	    } catch(e) {}
	    callback(j);
	    //console.log(buffer);
	});
    }).on('error', function (err) {
	console.log('err', err);
	callback([]);
    });
}

function getPics (lat, lon, dist_km, count, callback, timestamp) {
    var ret=[];
    var oldest = timestamp || 0;
    (function (ret) {
	function getMore() {
	    getPicsBefore(lat, lon, dist_km, oldest, function (data) {
		//console.log(data);
		try {
		    // if there is no data then this crashes and falls back to the callback
		    oldest = data.data[data.data.length-1].created_time - 1;
		    ret = ret.concat(data.data);
		    //console.log(ret);
		    if(ret.length < count)
			getMore();
		    else
			callback(ret);
		}catch(e) {
		    callback(ret);
		}

	    });
	}
	getMore();
    })(ret);
}



// hold a catch of data that has been already returned

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

var cache = JSON.parse(fs.readFileSync('cache_data.json').toString());

function update_cache () {
    cache.sort(function (a,b) {
	return a.location.longitude - b.location.longitude;
    });
    for(var i=1; i < cache.length; i++) {
	if(cache[i-1].id == cache[i].id) {
	    cache.remove(i--);
	}
    }
}

if (typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function() {
	return this * Math.PI / 180;
    }
}


function distance (a,b) {
    var R = 6371; // km
    var dLat = (a.latitude-b.latitude).toRad();
    var dLon = (a.longitude-b.longitude).toRad();
    var lat1 = a.latitude.toRad();
    var lat2 = b.latitude.toRad();

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d;
}

function save_cache () {
    fs.writeFile('cache_data.json', JSON.stringify(cache));
}

function search_cache (lat, lon, dist_km) {
    console.log(cache.length);
    var ret = [];
    var i = Math.floor(cache.length/2);
    var move = Math.floor(cache.length/4);
    var target = {
	latitude: lat*1,
	longitude: lon*1
    };
    while(move > 3) {
	if(i < 0) i = cache.length - 1;
	if(i >= cache.length) i = 0;
	var d = cache[i].location.longitude - target.longitude;
	if(d < 0)
	    d -= move;
	else
	    d += move;
	move = Math.floor(move/2);
    }
    console.log("at location: ", i);
    var d =0;
    while(true) {
	var run = false;
	if(i+d < cache.length) {
	    if(distance(cache[i+d].location, target) < dist_km) {
		ret.push(cache[i+d]);
	    }
	    run = true;
	}
	if(d != 0 && i - d > 0) {
	    if(distance(cache[i-d].location, target) < dist_km) {
		ret.push(cache[i-d]);
	    }
	    run	 = true;
	}
	d++;
	if(!run || ret.length > 200) break;
    }
    console.log("Returing data length: ", ret.length);
    return ret;
}


var app = express();

app.get('/', function(req, res) {
    res.redirect('/index.html');
});


app.get('/_test', function (req, res) {
    getPics(37.483, -122.15, 10, 10, function (c) {
	res.end(JSON.stringify(c));
    });
});

app.get('/_cache', function (req, res) {
    res.end('making cache');
    getPics(37.483, -122.15, 10, 10, function (c) {
	cache = cache.concat(c);
	update_cache();
	save_cache();
    });
});

app.get('/data', function(req, res) {
    // calling this the data url where stuff comes from
    //ret = search_cache(
    //res.end(JSON.stringify(search_cache(37.483,-122.15, 10)));
    var lon = req.param('lon');
    var lat = req.param('lat');
    var dist = req.param('dist') || 3;
    if(!lon || !lat) {
	res.end("------ BAD REQUEST -------");
	return;
    }
    var ret = search_cache(lat, lon, dist);
    var count = 100 - ret.length;
    if(count < 10) count = 10;
    getPics(lat, lon, count, dist, function (c) {
	ret = ret.concat(c); // should clean the ret array
	cache = cache.concat(c);
	update_cache();
	save_cache();
	res.end(JSON.stringify(ret));
    });
});






app.use(express.static(".."));
app.use(app.router);


app.listen(3000);

console.log('server running on 3000');