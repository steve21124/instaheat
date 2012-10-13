// A script that gets the current location on the browser client
// Oct 12th, 2012
// T.B.

var x=document.getElementById("demo");

function getLocation()
  {
  if (navigator.geolocation)
    {
    navigator.geolocation.getCurrentPosition(makeRequest);
    //console.log("IF")

    }
  else{console.log("CRUSH!")}
  }


function makeRequest(position)
  {
  console.log(position.coords.longitude)
  // the 0 image is the newest image
  $.ajax({
  url: "/data?lon=" + position.coords.longitude + "&lat=" + position.coords.latitude,//"&dist="dist
  dataType: "json",
  success: function (d) {
      console.log(d);
  },
  error: function () {
      console.log("ERROR");
  } 
    });

  }
