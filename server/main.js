var express = require('express');
var http = require('http');
var https = require('https');
var fs = require('fs');
var async = require('./async').async;

if(typeof heroku == "undefined") {
    heroku = false;
}

console.log("heroku: ", heroku);

var instaToken = "235597193.173372b.50bdb5394d7b4063b8147f10b928532d"; // first token
//var instaToken = "235597193.fc50470.fb1fab07e49a4cdcb9f45344e834d51a"; // second token

function getPicsBefore (lat, lon, dist_km, before,  callback) {
    if(dist_km > 5) dist_km = 5;
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

/*
function fourSquareConvert (ven) {

    return {
	"four_square": true,
	"likes": { "count": ven.likes.count },
	"location": ven.location

    };
}

function fourSquareGet(lat, lon, dist_km, count, callback, timestamp) {
    var ret=[];
    if(count > 50) count = 50;
    var url = "https://api.foursquare.com/v2/venues/search?ll="+lat+","+lon+"&intent=browse&limit="+count+"&radius="+(dist_km*1000)+"&oauth_token=IB2GQUQBVWSQERK2N2BDJQOJBA4BUJD4W35YJK0YHJM5N0HI";
    https.get(url, function (ev) {
	var buffer="";
	ev.on('data', function (dat) {
	    buffer += dat.toString();
	});
	ev.on('end', function () {
	    var j =[];
	    try {
		console.log(buffer);
		var dat = JSON.parse(buffer);

		console.log(JSON.stringify(dat, null, 1));


		for(var i=0;i<dat.response.venues.length; i++) {
		    j.push(dat.response.venues[i]);
		}
	    }catch(e) {
		console.log("4square error ", e);
	    }
	    callback(j);
	});
    }).on('error', function (err) {
	console.log("4square error ", err);
	callback([]);
    });
}
*/

function copy (obj) {
    if(typeof obj != "object") return obj;
    var ret = obj.constructor();
    for(var a in obj) {
	ret[a] = copy(obj[a]);
    }
    return ret;
}

function extremeDistance (lat, lon, dist_km, max) {
    var at = {
	latitude: lat*1,
	longitude: lon*1
    };

    var MOVE_CONST = .07;//.048; // about 5km

    var ret = [at];
    var outer = copy(at);

    while(true) {
	outer.latitude += MOVE_CONST;
	if(distance(at, outer) >= dist_km) break;
	var inner = copy(outer);
	while(true) {
	    if(distance(at, inner) < dist_km) {
		ret.push(inner)
	    }else break;
	    inner.longitude += MOVE_CONST;
	}
	inner = copy(outer);
	while(true) {
	    inner.longitude -= MOVE_CONST;
	    if(distance(at, inner) < dist_km) {
		ret.push(inner)
	    }else break;
	}
    }

    outer = copy(at);
    while(true) {
	outer.latitude -= MOVE_CONST;
	if(distance(at, outer) >= dist_km) break;
	var inner = copy(outer);
	while(true) {
	    if(distance(at, inner) < dist_km) {
		ret.push(inner)
	    }else break;
	    inner.longitude += MOVE_CONST;
	}
	inner = copy(outer);
	while(true) {
	    inner.longitude -= MOVE_CONST;
	    if(distance(at, inner) < dist_km) {
		ret.push(inner)
	    }else break;
	}
    }


    //console.log("extreme: ", ret, "\n\nDistance:", dist_km);
    return ret; // return an array of all the places that should be check
}

function getArea (lat, lon, dist_km, count, callFun, max, callback) {
    var check = extremeDistance(lat, lon, dist_km, max);
    var count=1;
    for(var i=0;i<check.length;i++) {
	count++;
	callFun(check[i].latitude, check[i].longitude, max/* useless */, count, function (data) {
	    cache = cache.concat(data);
	    if(!--count) {
		update_cache();
		save_cache();
		callback();
	    }
	});
    }
    if(!--count) {
	update_cache();
	save_cache();
	callback();
    }
    save_cache_stats(lat, lon, dist_km, new Date());
}

// hold a catch of data that has been already returned

Array.prototype.remove = function(from, to) {
    var rest = this.slice((to || from) + 1 || this.length);
    this.length = from < 0 ? this.length + from : from;
    return this.push.apply(this, rest);
};

var cache = [];
var cache_stats = [];

try {
    cache = JSON.parse(fs.readFileSync(heroku ? 'server/cache_data.json' : 'cache_data.json').toString());


    try {
	cache_stats = JSON.parse(fs.readFileSync(heroku ? 'server/cache_data_stat.json' : 'cache_data_stat.json').toString());
    }catch(e) {
	console.log("json reading file stats error", e);
    }

}catch(e) {
    console.log("json reading file error", e);
}

function save_cache () {
    fs.writeFile(heroku ? 'server/cache_data.json' : 'cache_data.json', JSON.stringify(cache, null, 1));
    fs.writeFile(heroku ? 'server/cache_data_stat.json' : 'cache_data_stat.json', JSON.stringify(cache_stats, null, 1));
}

function update_cache () {
    cache.sort(function (a,b) {
	return a.location.longitude - b.location.longitude;
    });
    cache_stats.sort(function (a,b) {
	return a.longitude - b.longitude;
    });
    var oldest = new Date(new Date() - 1000 * 60 * 60 * 24 * 14); // 14 days
    for(var i=1; i < cache.length; i++) {
	if(!cache[i] || !cache[i].id || !cache[i].created_time) {
	    console.log('~~cache: ', cache[i]);
	    cache.remove(i--);
	}
	//else if(new Date(cache[i].created_time * 1000) < oldest){
	//cache.remove(i--);
	//}
	else if(cache[i-1].id == cache[i].id) {
	    cache.remove(i--);
	}
    }

    var oldest_stat = new Date(new Date() - 1000 * 60 * 60 * 4); // 2 hours
    for(var i=0; i< cache_stats.length; i++) {
	if(new Date(cache_stats[i].time) < oldest_stat)
	    cache_stats.remove(i--);
    }
}

function save_cache_stats (lat, lon, dist_km, time) {
    cache_stats.push({longitude: lon*1,
		      latitude: lat*1,
		      dist: dist_km,
		      time: new Date(time)
		     });
}

function check_cache_stats (lat, lon, dist_km) {
    var i = Math.floor(cache_stats.length/2);
    var move = Math.floor(cache_stats.length/4);

    var target = {
	latitude: lat*1,
	longitude: lon*1
    };
    while(move > 3) {
	if(i < 0) i = cache_stat.length - 1;
	if(i >= cache_stat.length) i = 0;
	var d = cache_stat[i].longitude - target.longitude;
	if(d < 0)
	    d -= move;
	else
	    d += move;
	move = Math.floor(move/2);
    }
    var newest = new Date(0);
    var d = 0;
    while(true) {
	var run = false;
	if(i+d < cache_stats.length) {
	    if(distance(cache_stats[i+d], target) < cache_stats[i+d].dist - dist_km) {
		if(new Date(cache_stats[i+d].time) > newest)
		    newest = new Date(cache_stats[i+d]);
		run = true;
	    }
	}
	if(d != 0 && i-d > 0) {
	    if(distance(cache_stats[i-d], target) < cache_stats[i-d].dist - dist_km) {
		if(new Date(cache_stats[i-d].time) > newest)
		    newest = new Date(cache_stats[i-d]);
		run = true;
	    }
	}
	d++;
	if(!run) break;
    }
    return newest;
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
    ret.sort(function (a,b) {
	return b.likes.count - a.likes.count;
    });
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
    var dist = req.param('dist') || req.param('distance') || 3000;
    dist /= 1000;
    if(!lon || !lat) {
	res.end("------ BAD REQUEST -------");
	return;
    }
    /*var ret = search_cache(lat, lon, dist);
    var count = 100 - ret.length;
    if(count < 10) count = 10;
    async([
	[
	    function () {
		getPics(lat, lon, dist, count, this);
	    },
	    function () {
		//flickrGet(lat, lon, dist, count, this);
		this();
	    }
	],
	function () {
	    ret = ret.concat(this[0]);//.concat(this[1]);
	    cache = cache.concat(this[0]);//.concat(this[1]);
	    update_cache();
	    save_cache();
	    res.end(JSON.stringify(ret));
	}
    ]);*/
    async([
	[
	    function () {
		// instaGram
		var latest = check_cache_stats(lat, lon, dist);
		var oldest =  new Date(new Date() - 1000 * 60 * 60 * 2);
		if(latest > oldest)
		    this(0);
		else
		    getArea(lat, lon, dist, 15/* useless */, getPics, 100, this);
	    }
	],
	function () {
	    var ret = search_cache(lat, lon, dist);
	    res.json(ret);
	    res.end();
	}
    ]);
});

app.get('/square', function(req, res) {
    var lon = req.param('lon');
    var lat = req.param('lat');
    var dist = req.param('dist') || 3;
    if(!lon || !lat) {
	res.end("------ BAD REQUEST -------");
	return;
    }
    var ret = [];
    fourSquareGet(lat, lon, dist, 50, function (c) {
	res.end(JSON.stringify(c));
    });
});


app.get('/ff', function (req, res) {
    res.end(__dirname);
});




app.use(express.static(__dirname + "/../"));
app.use(app.router);


app.listen(process.env.PORT || 3000);

console.log('server running on 3000');
