/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var pic = require('./routes/pic');
var http = require('http');
var path = require('path');
var fs = require('fs');
var Promise = require("node-promise").Promise;
var promise = new Promise();
var mysql = require('mysql');
var passport = require('passport');
var util = require('util');
var facebookstrategy = require('passport-facebook').Strategy;
var localstrategy = require('passport-local').Strategy;
var graph = require('fbgraph');
var bcrypt = require('bcrypt-nodejs');
var azure = require('azure');
var AzureMedia = require('node-azure-media');
var AzureObject = null;
var blobService = azure.createBlobService('mediasvcwl567f4k9xg35', 'P3/a1liMyElk6aEiMGT3RJ0syEG/iO6dkxZIjenTB0vvJULMi0LikeCh142z9TTGKy3BrrFrTwcZV60FzQWJzQ==');
var Expedia = require('./Expedia');
var api = new AzureMedia('videocon', process.env.azureprimary, function(e, r) {
    console.log("Azure Media Initialized");
    AzureObject = r;
});
var uuid = require('node-uuid');


var app = express();
var connection;

function handleDisconnect() {
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
}
handleDisconnect();


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(passport.initialize());
app.use(passport.session());
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(express.multipart({
    uploadDir: './tmp'
}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/Pic', pic.pic);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
/* note move to the env variable */

passport.use(new localstrategy({usernameField:'username', passwordField: 'password'},
  function(username, password, done) {
    var query = connection.query('select userid,password from LocalUser where username = ? or  email = ?', [username, username], function(err, result) {
	console.log(err);
	if(result.length == 0) {
		done(null, 'No User');
	} else {
		for(var i = 0; i<result.length; i++) {
			if(bcrypt.compareSync(password, result[i].password)) {
				done(null, result[i].userid);
			} else {
				done(null, 'Invalid Password');
			}
		}
	}
    });

}));


passport.use(new facebookstrategy({
        clientID: 195434197332795,
        clientSecret: '8c6ea3c9be144c6c67748197a15cecdd',
        callbackURL: "http://vidviews.cloudapp.net/vidviews/auth/facebook/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        //console.log(accessToken);
        //console.log(profile);
        var post = {
            userid: profile.id,
            name: profile.displayName,
            usersecret: accessToken,
            imageURL: "http://graph.facebook.com/" + profile.id + "/picture"
        };
        connection.query('insert into Facebook (userid, facebookid, facebookuserseecret) values (?, ?, ?)', [profile.id, profile.id, accessToken], function(err, result) {
            console.log(profile.id);
            console.log(accessToken);
            console.log("Boo");
            console.log(err);
            console.log("Boo");
        });
        connection.query('select * from Users where userid = ?', profile.id, function(err, result) {
            if (result.length > 0) {
                var query = connection.query('update Users set ? where userid = ?', [post, profile.id], function(err, result) {
                    console.log(err);
                });
            } else {
                var query = connection.query('insert into Users set ?', post, function(err, result) {
                    console.log(err);
                });
            }

        });
        var userid1 = profile.id;
        graph.setAccessToken(accessToken);
        graph.get(profile.id + '/friends', function(err, res) {
            var l = res.data.length;
            for (var a = 0; a < l; a++) {
                var userid2 = res.data[a].id;
                connection.query('select * from Users where userid = ?', res.data[a].id, function(err, result) {
                    if (result.length != 0) {
                        var toEnter = result[0].userid;
                        connection.query('select * from Friends where userid1 = ? and userid2 = ?', [userid1, result.userid], function(err, result) {
                            if (result.length == 0) {
                                var friends = {
                                    userid1: userid1,
                                    userid2: toEnter
                                };
                                var query = connection.query('insert into Friends set ?', friends, function(err, result) {
                                    console.log(err);
                                });
                            }
                        });
                    }
                });
            }
        });
        return done(null, profile);
    }));



passport.serializeUser(function(user, done) {
    done(null, user);
});


passport.deserializeUser(function(obj, done) {
    done(null, obj);
});



app.post('/CreateLocalUser', function(req, res) {
    var userid = parseInt(uuid.v1().toString(), 16);
    var name = req.body.full_name;
    var email = req.body.email;
    var query = connection.query('insert into LocalUser values(?, ?, ?, ?)', [req.body.username, bcrypt.hashSync(req.body.password), userid, email], function(err, result) {
        connection.query('insert into Users (userid, name) values (?,?)', [userid, name], null);

        if (err) {
	    res.send({status:"error", message:"User Exists"});
        } else {
	    console.log(userid);
	    res.send({status: "success", output: {user_id: userid}}); 
        }
    });
});


app.post('/login', 
    passport.authenticate('local'),  function(req, res) {
	console.log(req);
	if((req.user == 'Invalid Password') || (req.user == "No User")) {
		res.send(401, "{\"status\":\"error\", \"message\":\"authentication failed\"}");
	} else { 
		res.send({status: "success", output:{userid: req.user}});
	}

    });

app.get('/auth/facebook',
    passport.authenticate('facebook', {scope: ['user_status', 'publish_actions', 'publish_stream']}),
    function(req, res) {});

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function(req, res) {
	res.send({status: "success", output:{userid: req.user.id}});
    });

app.get('/FacebookLogout', function(req, res) {
    req.logout();
    res.redirect("/vidviews");
});




app.get(/^\/(\d+)\/ListVenueReview/, function(req, res) {
    var query = connection.query('select  reviewid, stars, comment, name  from ReviewText, Users where venueid = ? and ReviewText.userid = Users.userid', req.params[0], function(err, result) {
	if(err) {
		 res.send({status: "error", message: err});
	} else {
	        res.send({status: "success", output: result});
	}
    });
});

app.get('/Venues', function(req, res) {
    var query = connection.query('select * from Venue', null, function(err, result) {
	if(err) {
		 res.send({status: "error", message: err});
	} else {
	        res.send({status: "success", output: result});
	}
    });
});

app.get(/^\/(\d+)\/ListFriends/, function(req, res) {
    var query = connection.query('select  userid2, name, imageurl from Friends, Users where userid1 = ? and userid2 = userid', req.params[0], function(err, result) {
        res.send({status: "success", output: result});
    });
});

app.put(/^\/(\d+)\/Link\/(\d+)/, function(req, res) {
    var query = connection.query('update Facebook set userid = ? where facebookid = ?', [req.params[0], req.params[1]], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status:"success"});
        }
    });
});
app.get(/^\/(\d+)\/IsFollowing\/(\d+)/, function(req, res) {
    var query = connection.query('select count(*) as counter from Follow where userid1 = ? and userid2 = ?', [req.params[0], req.params[1]], function(err, result) {
		if(result[0].counter > 0) {
			res.send({status: 'success', output: {result: true}});
		} else {
			res.send({status: 'success', output: {result: false}});
		}
	});
});
app.put(/^\/(\d+)\/Follow\/(\d+)/, function(req, res) {
    var query = connection.query('insert into Follow values (?,?)', [req.params[0], req.params[1]], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status:"success"});
        }
    });
});


app.get(/^\/(\d+)\/MyReviews/, function(req, res) {
	var query = connection.query('select ReviewText.reviewid, Venue.venueid, name, imageurl, videourl, location, Room, count(User) as L from ReviewText join Videos on Videos.reviewid = ReviewText.reviewid   join Venue on Venue.venueid = ReviewText.venueid    left outer join Likes on Likes.videoid = Videos.videoid and ReviewText.userid =  ? group by Venue.venueid, name, imageurl, videourl, location, Room', req.params[0], function(err, result) {
	console.log(err);
	if(err) {
		res.send({status: "error", message: err});
	} else {
		var ret = [];
		var dict = {};
		var counter = 0;
		for(var i = 0; i<result.length; i++) {
			if(result[i].venueid in dict) {
				var index = dict[result[i].venueid];
				ret[index].likes += result[i].L;
				ret[index].info.push({videourl: result[i].videourl, loc: result[i].location, roomno: result[i].Room});
			} else {
				ret[counter] = {reviewid: result[i].reviewid, venue: result[i].venueid, name: result[i].name, image: result[i].image, likes: result[i].L, info: [{videourl: result[i].videourl, loc: result[i].location, roomno: result[i].Room}]};  
				dict[result[i].venueid] = counter;
				counter++;
			}
		}
		res.send(ret);
	}
});
});

app.get(/^\/(\d+)\/WishedFor/, function(req, res) {
    var query = connection.query('select WishList.venueid, name, imageurl from WishList, Venue where userid = ? and WishList.venueid = Venue.venueid', req.params[0], function(err, result) {

        if (err) {
            res.send({status: "error", message: err});
        } else {
	   for(var i = 0; i<result.length; i++) {
		    result[i]["imageurl"] =  "images.travelnow.com/"+result[i]["imageurl"];
		}
            res.send({status: "success", output: result});
        }
    });
});

app.put(/^\/(\d+)\/WishList\/(\d+)/, function(req, res) {
    var query = connection.query('insert into WishList values (?,?)', [req.params[0], req.params[1]], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
	    res.send({status: "success"});
        }
    });
});
app.put(/^\/(\d+)\/AddFriends\/(\d+)/, function(req, res) {
    var query = connection.query('insert into Friends values (?,?)', [req.params[0], req.params[1]], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
	    res.send({status: "success"});
        }
    });
});

app.get(/^\/(\d+)\/Profile/, function(req, res) {
	var query = connection.query('select Users.userid, name, imageURL, followers, following, posts, points from Users, (select ? as userid, count(*) as followers from Follow where userid2 = ? group by userid) as a, '+ 
				     '(select ? as userid, count(*) as following from Follow where userid1 = ? group by userid) as b, '+
				     '(select ? as userid, count(*) as posts from ReviewText where userid = ? group by userid) as c '+
				     'where Users.userid = ?'
		, [req.params[0], req.params[0], req.params[0], req.params[0], req.params[0], req.params[0], req.params[0]], function(err, result, d) {
	console.log(err);
	if(err) {
		res.send({status: "error", message: err});
	} else {
            res.send({status: "success", output: result});
	}
	
});
});
app.post(/^\/(\d+)\/Pref/, function(req, res) {
    var query = connection.query('insert into top3(userid, c1, c2, c3) values(?,?,?,?) on duplicate key update c1=values(c1), c2=values(c2), c3=values(c3)', [req.params[0], req.body.c1, req.body.c2, req.body.c3], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status:"success"});
        }
    });

});
app.get(/^\/(\d+)\/Pref/, function(req, res) {
    var query = connection.query('select * from top3 where userid = ?', req.params[0], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status: "success", output: result});
        }
    });
});



app.get(/^\/(\d+)\/ListVideos/, function(req, res) {
    var query = connection.query('select  videoid, reviewid, videourl, ThumbURL, location from Videos where reviewid = ?', req.params[0], function(err, result) {
        res.send({status: "success", output: result});
    });
});


app.put(/^\/(\d+)\/Likes\/(\d+)/, function(req, res) {
    var query = connection.query('insert into Likes values(?,?)', [req.params[0], req.params[1]], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status:"success"});
        }
    });
});

app.get(/^\/(\d+)\/WhoLikes/, function(req, res) {
    var query = connection.query('select User, name, imageURL  from Likes,Users  where videoid = ? and Likes.User = Users.userid', req.params[0], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status: "success", output: result});
        }
    });
});
app.get(/^\/(\d+)\/UserLikes/, function(req, res) {
    var query = connection.query('select Likes.videoid, reviewid, videourl, thumburl from Likes , Videos where User  = ? and Likes.videoid = Videos.videoid', req.params[0], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status: "success", output: result});
        }
    });
});

app.get('/Top', function(req, res) {
    var query = connection.query('select Users.userid, count(videoid) as Likes , Users.name, Users.imageURL from (select Videos.videoid, userid from Videos, ReviewText,Venue,Likes where Venue.city=? and Venue.venueid = ReviewText.venueid and Videos.reviewid = ReviewText.reviewid and Likes.videoid = Videos.videoid) as p, Users where Users.userid = p.userid group by userid order by Likes desc limit 10', req.query.city, function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send({status: "success", output: result});
        }
    });
});
app.post(/^\/(\d+)\/NewReview\/(\d+)/, function(req, res) {
    var reviewid = parseInt(uuid.v1().toString(), 16);
    var query = connection.query('insert into ReviewText values(?, ?, ?, ?, ?)', [reviewid, req.params[1], req.body.stars, req.body.comment, req.params[0]], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
            res.send(reviewid);
        }
    });

});

app.post(/^\/(\d+)\/UpdateProfilePic/, function(req, res) {
    if (req.files["file"]["type"].search("image") > -1) {
        var newFile = req.params[0] + "_" + req.files["file"]["name"];
        blobService.createBlockBlobFromFile("profileimage", newFile, req.files["file"]["path"], function(error) {
            fs.unlink(req.files["file"]["path"], function(err, r){});
            if (error) {
                res.send(error);
            } else {
                var url = 'http://mediasvcwl567f4k9xg35.blob.core.windows.net/profileimage/' + newFile;
                var query = connection.query('update Users set imageURL = ? where userid= ?', [url, req.params[0]], function(err, result) {
                    if (err) {
                        res.send({status: "error", message: err});
                    } else {
			    res.send({status:"success"});
                    }

                });
            }
        });
    }

});

app.post(/^\/(\d+)\/EditReview\/(\d+)/, function(req, res) {
    var query = connection.query('update ReviewText set stars = ?, comment = ? where userid=? and reviewid= ?', [req.body.stars, req.body.comment, req.params[0], req.params[1]], function(err, result) {
        if (err) {
            res.send({status: "error", message: err});
        } else {
	    res.send({status:"success"});
        }
    });
});


app.post(/^\/(\d+)\/Post2Facebook/, function(req, res) {
    var query = connection.query('select facebookuserseecret from Facebook where facebookid = ?', req.params[0], function(err, result) {
	graph.setAccessToken(result[0].facebookuserseecret);
	graph.post(req.params[0] + "/feed", {message:"Snow again?"}, function(err, res) {
            res.send({status: "error", message: err});
	});
	    res.send({status:"success"});
        /*

	graph.post(userId + "/feed", wallPost, function(err, res) {
  // returns the post id
  console.log(res); // { id: xxxxx}*/
    });
});
var cache = [];
app.post(/^\/(\d+)\/ReviewVideo\/([A-Za-z]+)/, function(req, res) {
	console.log("Here");
    if (req.files["file"]["type"].search("video") > -1) {
		uploadFile(req.files["file"]["path"], req.files["file"]["name"], function(e, r) {
		    var videoid = parseInt(uuid.v1().toString(), 16);
		    fs.unlink(req.files["file"]["path"], null);
			console.log(r);
		        var query = connection.query('insert into Videos values (?,?,?,?,?,?, ?)', [videoid, req.params[0], r[1], r[0], req.params[1], req.body.stars, req.body.room], function(err, result) {
		if(err) {
			res.send({status: "error", message: err});
		} else {
		    res.send({status:"success"});
		}
	});
		});
    }
});
app.post(/^\/(\d+)\/PostComment\/(\d+)/, function(req, res) {
	var commentid = parseInt(uuid.v1().toString(), 16);
	var query = connection.query('insert into comment values (?,?,?,?,?)', [commentid, new Date(), req.body.title, req.body.content, req.params[0], req.params[1]],  function(err, result) {
		if(err) {
			res.send({status: "error", message: err});
		 } else {
		    res.send({status:"success"});
		}
	});
});

app.get(/^\/(\d+)\/ReviewComments/, function(req, res) {
	var query = connection.query('select commentid, created, title, content, userid, name, imageURL from Comment, Users where Users.userid = Comment.userid and reviewid = ?', req.params[0], function(err, result) {
	if(err) {
		res.send({status: "error", message: err});
	} else {
		res.send({status: "success", output: result});
	}
});
});

function uploadFile(path, name, callback) {
    var z = AzureObject.Asset.create(name, null, function(err, asset) {
        var assetString = asset["Id"];
        var index = 'nb:cid:UUID:'.length;
        assetString = 'asset-' + assetString.substring(index, assetString.length);
        blobService.createBlockBlobFromFile(assetString, name, path, function(error) {
            var sharedAccessPolicy = {
                AccessPolicy: {
                    Permissions: azure.Constants.BlobConstants.SharedAccessPermissions.READ,
                    Start: '01-01-1999',
                    Expiry: '01-01-2050'
                }
            };
	    var signature_vid = blobService.generateSharedAccessSignature(assetString, name, sharedAccessPolicy);
            AzureObject.AssetFile.create(asset, function(e, rAsset) {
                var job = new AzureObject.Job("Encode", [asset]);
                var mediaProcess = new AzureObject.MediaProcessor();
                var t = AzureObject.MediaProcessor.getLatestByName("Windows Azure Media Encoder", function(e, r) {
                    job.addTask("Encode", r.Id, "Thumbnails", 0);
                    job.submit(function(err, r) {
			console.log(rAsset);
                        job.getOutputMediaAssets(function(err, r) {
			    console.log(name);
				var filename = name.substr(0, name.lastIndexOf('.'));
			    var assetString2 = r[0]["Id"];
				assetString2 = 'asset-' + assetString2.substring(index, assetString2.length);
			    var signature = blobService.generateSharedAccessSignature(assetString2, filename + '_1.jpg', sharedAccessPolicy);
				process.nextTick(function() {
					callback(null, [signature.url(), signature_vid.url()]);
				});
                        });
                    });
                });
            });
        });
    });

    //var job = AzureObject.Job("Test", z);
}
app.post("/SearchVenues", Expedia.expediaSearch); 
app.get(/^\/(\d+)\/VenueInfo/, Expedia.expediaInfo);
app.get("/Tips", function(req, res) {
	var query = connection.query('select * from Categories', req.params[0], function(err, result) {
		if(err) {
			res.send({status: "error", message: err});
		} else {
			res.send({status: "success", output: result});
		}
	});
});
