var http = require('http');
var path = require('path');
var fs = require('fs');
var mysql = require('mysql');
var betacid = 55505;

 var options = {
        cid     : betacid,
        apiKey  : process.env.expediakey,
        locale  : "en_US",  // optional defaults to en_US
        currencyCode :"USD"  // optional defaults to USD
    };


var expedia = require("expedia")(options);
var connection = null;
(function handleDisconnect() {
        connection = mysql.createConnection({
            host: 'localhost',
            user: process.env.user,
            password: process.env.password,
            database: 'vidviews'
        });
        connection.connect(function(err) {});
        connection.on('error', function(err) {
                console.log('db error', err);
                if(err.code == 'PROTOCOL_CONNECTION_LIST') {
                        connection.connect(function(err) {});
                        handleDisconnect();
                }
        });
})();


(function UpdateTable() {
var options = {
  "customerSessionId" : "thisisauniqueID",
  "customerIpAddress" : "127.0.0.1",
  "customerUserAgent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)",
  "HotelListRequest": {
    "city": "Tel Aviv",
    "countryCode": "IL",
    "arrivalDate": "9/30/2014",
    "departureDate": "10/2/2014",
    "RoomGroup": {
      "Room": { "numberOfAdults": "2" }
    },
    "numberOfResults": "25"
}
};
	expedia.hotels.list(options, function(err, result) {
		var hotels = result.HotelListResponse.HotelList.HotelSummary;
		var length = hotels.length;
		for(var i = 0; i<length; i++) {
			var data = [hotels[i].hotelId, hotels[i].name, hotels[i].countryCode, hotels[i].city, hotels[i].thumbNailUrl, hotels[i].shortDescription, hotels[i].address1 + '\n' + hotels[i].address, hotels[i].longitude, hotels[i].latitude, hotels[i].deepLink];
			(function(data) {
				var m = data;
				connection.query('insert into Venue values (?, ?, ?, ?, ?, ?, ?, ?)', data, function(err, result) {
					if(err) {
						connection.query('update Venue set imageurl = ?, About = ?, longitude = ?, latitude = ? , url=?where venueid = ?', [data[4], data[5], data[7], data[8], data[9], data[0]], function(erro, result) { console.log(erro);});
					}
				});})(data);
		}
	});
})();



