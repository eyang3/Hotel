var http = require('http');
var path = require('path');
var fs = require('fs');
var mysql = require('mysql');
var betacid = 55505;
var expedia;
/*(function() { var options = {
        cid     : betacid,
        apiKey  : process.env.expediakey,
        locale  : "en_US",  // optional defaults to en_US
        currencyCode :"USD"  // optional defaults to USD
    };


   expedia = require("expedia")(options);
})();*/

exports.expediaSearch =  function(params) {
/*var options = {
  "customerSessionId" : "thisisauniqueID",
  "customerIpAddress" : "127.0.0.1",
  "customerUserAgent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)",
  "HotelListRequest": {
    "city": params.City,
    "countryCode": params.Country,
    "arrivalDate": params.arrDate
    "departureDate": params.depDate
    "RoomGroup": {
      "Room": { "numberOfAdults": params.Guests }
    },
    "numberOfResults": "25"
}
};*/
	console.log("Hissy");
/*	expedia.hotels.list(options, function(err, result) {
		console.log(result);
	});*/
}



