

// fb location: 37.4832526, -122.150037



$(function () {
    // test case:
    console.log(getPics(37.483, -122.1500, 10, 10, function (d) {
	pics = d;
	console.log(d);
    }));
});