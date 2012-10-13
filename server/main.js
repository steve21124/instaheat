var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var async = require('./async').async;

var instaToken = "235597193.173372b.50bdb5394d7b4063b8147f10b928532d"; // first token
//var instaToken = "235597193.fc50470.fb1fab07e49a4cdcb9f45344e834d51a"; // second token

function getPicsBefore (lat, lon, dist_km, before,  callback) {
    if(dist_km > 5) dist_km = 5;
    var url = "https://api.instagram.com/v1/media/search?lat="+lat+"&lng="+lon+"&distance="+(dist_km*1000);
    if(before) url += "&max_timestamp="+before;
    url += "&access_token="+instaToken; // +"&callback=?";
    console.log(url);

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

	console.log("instagram headers: ", ev.headers);

	ev.on('data', function (buf) {
	    buffer += buf.toString();
	});
	ev.on('end', function () {
	    var j = [];
	    try {
		j = JSON.parse(buffer);
	    } catch(e) {
		console.log("error ", buffer)
	    }
	    callback(j);
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
                if (ret.length < count)
                    getMore();
                else
                    callback(ret);
            } catch(e) {
                callback(ret);
            }
            });
        }
	getMore();
    })(ret);
}


// flickr

// { "id": "8081614731", "owner": "23119895@N00", "secret": "8ac217ef5f", "server": "8475", "farm": 9, "title": "Pumpkins", "ispublic": 1, "isfriend": 0, "isfamily": 0, "datetaken": "2012-10-07 16:07:06", "datetakengranularity": 0, "latitude": 37.475167, "longitude": -122.418167, "accuracy": 16, "context": 0, "place_id": "N8DyJRJTVrsXl6Uo", "woeid": "2416227", "geo_is_family": 0, "geo_is_friend": 0, "geo_is_contact": 0, "geo_is_public": 1 , views: 26 },
// flickr url: http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_z.jpg'

/* instagram:
   {
   "data": [{
   "distance": 41.741369194629698,
   "type": "image",
   "filter": "Earlybird",
   "tags": [],
   "comments": { ... },
   "caption": null,
   "likes": { ... },
   "link": "http://instagr.am/p/BQEEq/",
   "user": {
   "username": "mahaface",
   "profile_picture": "http://distillery.s3.amazonaws.com/profiles/profile_1329896_75sq_1294131373.jpg",
   "id": "1329896"
   },
   "created_time": "1296251679",
   "images": {
   "low_resolution": {
   "url": "http://distillery.s3.amazonaws.com/media/2011/01/28/0cc4f24f25654b1c8d655835c58b850a_6.jpg",
   "width": 306,
   "height": 306
   },
   "thumbnail": {
   "url": "http://distillery.s3.amazonaws.com/media/2011/01/28/0cc4f24f25654b1c8d655835c58b850a_5.jpg",
   "width": 150,
   "height": 150
   },
   "standard_resolution": {
   "url": "http://distillery.s3.amazonaws.com/media/2011/01/28/0cc4f24f25654b1c8d655835c58b850a_7.jpg",
   "width": 612,
   "height": 612
   }
   },
   "id": "20988202",
   "location": null
   },
*/


function flickr2insta (pic) {
    var url = ("http://farm{farm}.static.flickr.com/{server}/{id}_{secret}_z.jpg")
	.replace(/{farm}/g, pic.farm)
	.replace(/{server}/g, pic.server)
	.replace(/{id}/g, pic.id)
	.replace(/{secret}/g, pic.secret);
    return {
	"created_time": new Date(pic.datetaken)*1/1000 + "",
	"id": "flickr_"+pic.id,
	"likes": {
	    "count": Math.floor(pic.views/10),
	},
	"location": {
	    "latitude": pic.latitude,
	    "longitude": pic.longitude
	},
	"images": {
	    "low_resolution": {
		"url": url,
		"width": 306,
		"height": 306
	    },
	    "thumbnail": {
		"url": url,
		"width": 150,
		"height": 150
	    },
	    "standard_resolution": {
		"url": url,
		"width": 612,
		"height": 612
	    }
	}
    };
}

function flickrGet (lat, lon, dist_km, count, callback, timestamp) {
    var ret = [];
    if(dist_km > 20) dist_km = 20;
    var url = "http://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=45165da8fef2794bea1b10800c19c67e&lat="+lat+"&lon="+lon+"&radius="+dist_km+
	"&extras=date_taken%2Cgeo%2Cviews&per_page="+count+"&format=json&nojsoncallback=1"

    console.log(url);
    http.get(url , function (ev) {
	var buffer = "";
	ev.on('data', function (dat) {
	    buffer += dat.toString();
	});
	ev.on('end',function () {
	    var j = [];
	    try {
		console.log(buffer);
		var result = JSON.parse(buffer);
		for(var i=0; i < result.photos.photo.length; i++) {
		    j.push(flickr2insta(result.photos.photo[i]));
		}

	    }catch(e) {
		console.log('flickr error', e);
	    }

	    callback(j);
	});
    }).on('error', function (err) {
	console.log('flickr error ', err);
	callback([]);
    });
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
	if(!cache[i] || !cache[i].id) {
	    console.log('~~cache: ', cache[i]);
	    cache.remove(i--);
	}else if(cache[i-1].id == cache[i].id) {
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
    fs.writeFile('cache_data.json', JSON.stringify(cache, null, 1));
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

app.get('/ftest', function (req, res) {
    flickrGet(37.483, -122.15, 10, 10, function (c) {
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
    async([
	[
	    function () {
		getPics(lat, lon, dist, count, this);
	    },
	    function () {
		flickrGet(lat, lon, dist, count, this);
	    }
	],
	function () {
	    ret = ret.concat(this[0]).concat(this[1]);
	    cache = cache.concat(this[0]).concat(this[1]);
	    update_cache();
	    save_cache();
	    res.end(JSON.stringify(ret));
	}
    ]);
});






app.use(express.static(".."));
app.use(app.router);


app.listen(3000);

console.log('server running on 3000');
