var http = require('http');
var path = require('path');
var fs = require('fs');
var mysql = require('mysql');
var betacid = 55505;
var expedia;
(function() { var options = {
        cid     : betacid,
        apiKey  : process.env.expediakey,
        locale  : "en_US",  // optional defaults to en_US
        currencyCode :"USD"  // optional defaults to USD
    };


   expedia = require("expedia")(options);
})();

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



exports.expediaSearch =  function(req,res) {
	var params = req.body;
var options = {
  "customerSessionId" : "thisisauniqueID",
  "customerIpAddress" : "127.0.0.1",
  "customerUserAgent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)",
  "HotelListRequest": {
    "city": params.city,
    "countryCode": params.country,
    "arrivalDate": params.arrdate,
    "departureDate": params.depdate,
    "RoomGroup": {
      "Room": { "numberOfAdults": params.Guests }
    }
}
};
	expedia.hotels.list(options, function(err, result) {
		 var hotels = result.HotelListResponse.HotelList.HotelSummary;
		 var array = [];
		 var length = hotels.length;
		var z = 0;
		 for(var i = 0; i < length; i++) {
			(function(data, arr) {
				connection.query('select Venue.venueid, name, street, userid, imageurl, stars, longitude, latitude from Venue left join  ReviewText on ReviewText.venueid = Venue.venueid where Venue.venueid = ?', data.hotelId, function(err, result) {
				z++;	
				if(result.length > 0) {
				var reviewList = [];
				var avg = 0;
				for(var j = 0; j<result.length; j++) {
					reviewList[j] = result[j].userid; 
					avg += result[j].stars;
				}
				avg /= result.length;
				params.pricehi = params.pricehi || 1000000;
				params.pricelo = params.pricelo || 0;
				console.log(params.pricehi + '\t' + data.highRate + '\t' + params.pricelo + '\t' + data.lowRate);
				var avgPrice = (data.highRate + data.lowRate)/2;
				if((params.pricehi > avgPrice) && (params.pricelo < avgPrice))  {
					arr.push({id:result[0].venueid, name: result[0].name, address: result[0].street, priceHi: data.highRate, priceLo: data.lowRate, reviewers: reviewList, imageurl: "images.travelnow.com/"+result[0].imageurl, avgrating: avg, longitude: result[0].longitude, latitude: result[0].latitude});
					console.log('here');
				}
				
				}
				if(z == hotels.length) {
					res.send(arr);
				}
	});
			 })(hotels[i], array);
		 } 
	});
}


exports.expediaInfo =  function(req,res) {
	var params = req.body;
var options = {
  "customerSessionId" : "thisisauniqueID",
  "customerIpAddress" : "127.0.0.1",
  "customerUserAgent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)",
  "HotelInformationRequest": {
	"hotelId": req.params[0]
    }
};
	expedia.hotels.info(options, function(err, result) {
		var info = result.HotelInformationResponse.HotelSummary;
		var details = result.HotelInformationResponse.HotelDetails;
		var retObject = {
			id: req.params[0],
			name: info.name,
			address: info.address1 + "\n" + info.address2,
			about: details.propertyDescription,
			number_of_rooms: details.numberOfRooms,
			latitude: info.latitude,
			longitude: info.longitude,
			affiliate_link: null,
			imageurl: null
		};
		connection.query('select url, imageurl from Venue where  Venue.venueid = ?', req.params[0], function(err, result) {
			if(result.length > 0) {
				retObject.affiliate_link = result[0].url;
				retObject.imageurl = "images.travelnow.com/" + result[0].imageurl;
				res.send(retObject);
				
			} else {
				res.send("{error: \"HotelId not found\"}");
			}
		});
});
}
