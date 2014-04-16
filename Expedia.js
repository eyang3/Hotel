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
function handleDisconnect() {
    connection = mysql.createConnection({
        host: 'localhost',
        user: process.env.user,
        password: process.env.password,
        database: 'vidviews'
    });
    connection.connect(function(err) {
        console.log('reconnected');
        console.log(err);
        });
    connection.on('error', function(err) {
        console.log('db error', err);
        if (err.code == 'PROTOCOL_CONNECTION_LOST') {
                connection.destroy();
    connection = mysql.createConnection({
        host: 'localhost',
        user: process.env.user,
        password: process.env.password,
        database: 'vidviews'
    });
            handleDisconnect();
            connection.connect(function(err) { console.log(err);});
        }
    });
}
handleDisconnect();




exports.expediaSearch =  function(req,res) {
	var params = req.body;
var options = {
  "customerSessionId" : "thisisauniqueID",
  "customerIpAddress" : "127.0.0.1",
  "customerUserAgent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko)",
  "HotelListRequest": {
    "city": params.city,
    "countryCode": params.country,
    "arrivalDate": params.arrival_date,
    "departureDate": params.depart_date,
    "RoomGroup": {
      "Room": { "numberOfAdults": params.number_of_guests }
    }
}
};
	expedia.hotels.list(options, function(err, result) {
		 var hotels;
		try {
			hotels =  result.HotelListResponse.HotelList.HotelSummary;
		}
		catch(ex ) {
			res.json({status: "error", message: "you must specify a city"});
			return;
		}
		 var array = [];
		 var length = hotels.length;
		var z = 0;
		 for(var i = 0; i < length; i++) {
			(function(data, arr) {
				connection.query('select Venue.venueid as venue_id , name, street, userid as user_id, Venue.imageurl as image_url, stars, longitude, latitude from Venue left join  Videos on Videos.venueid = Venue.venueid where Venue.venueid = ?', data.hotelId, function(err, result) {
				connection.query('select * from HotelLoop where venueid = ?', data.hotelId, function(err1, result1) {
				console.log(err);
				z++;	
				if(result.length > 0) {
				var reviewList = [];
				var loop_images = [];
				var avg = 0;
				for(var j = 0; j<result1.length; j++) {
					loop_images.push({image_url: result1[j].image_url});
				}
				for(var j = 0; j<result.length; j++) {
					reviewList[j] = result[j].userid; 
					avg += result[j].stars;
				}
				avg /= result.length;
				params.price_high = params.price_high || 1000000;
				params.price_low = params.price_low || 0;
				var avgPrice = (data.highRate + data.lowRate)/2;
				if((params.price_high > avgPrice) && (params.price_low < avgPrice))  {
					arr.push({id:result[0].venue_id, name: result[0].name, address: result[0].street, price_high: data.highRate, price_low: data.lowRate, reviewers: reviewList, image_url: "images.travelnow.com"+result[0].image_url, avg_rating: avg, longitude: result[0].longitude, latitude: result[0].latitude, loop_image:loop_images});
					console.log('here');
				}
				
				}
				if(z == hotels.length) {
					res.json({status: "success", output: arr});
				}
				});
				
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
		console.log(err);
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
		connection.query('select url, imageurl as image_url from Venue where  Venue.venueid = ?', req.params[0], function(err, result) {
			if(result.length > 0) {
				retObject.affiliate_link = result[0].url;
				retObject.image_url = "images.travelnow.com/" + result[0].image_url;
				res.json(retObject);
				
			} else {
				res.json({status: 'error', message: 'hotelId not found'});
			}
		});
});
}
