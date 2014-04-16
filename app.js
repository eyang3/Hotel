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
/*var connection;

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
handleDisconnect();*/


var pool = mysql.createPool({
    host: 'localhost',
    user: process.env.user,
    password: process.env.password,
    database: 'vidviews'
});

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

passport.use(new localstrategy({
        usernameField: 'username',
        passwordField: 'password'
    },
    function(username, password, done) {
        pool.getConnection(function(err, connection) {
            var query = connection.query('select userid,password from LocalUser where username = ? or  email = ?', [username, username], function(err, result) {
                console.log(err);
                if (result.length == 0) {
                    done(null, 'No User');
                } else {
                    for (var i = 0; i < result.length; i++) {
                        if (bcrypt.compareSync(password, result[i].password)) {
                            done(null, result[i].userid);
                        } else {
                            done(null, 'Invalid Password');
                        }
                    }
                }
            });
            connection.release();
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
        pool.getConnection(function(err, connection) {
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
            connection.release();
            return done(null, profile);
        });
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
    pool.getConnection(function(err, connection) {
        var query = connection.query('insert into LocalUser values(?, ?, ?, ?)', [req.body.username, bcrypt.hashSync(req.body.password), userid, email], function(err, result) {

            if (err) {
                res.json({
                    status: "error",
                    message: "user exists"
                });
            } else {
                connection.query('insert into Users (userid, name) values (?,?)', [userid, name], null);
                res.json({
                    status: "success",
                    output: {
                        user_id: userid
                    }
                });
            }
        });
        connection.release();
    });

});


app.post('/login',
    passport.authenticate('local'), function(req, res) {
        console.log(req);
        if ((req.user == 'Invalid Password') || (req.user == "No User")) {
            res.json({
                status: "error",
                message: "authentication failed"
            });
        } else {
            res.json({
                status: "success",
                output: {
                    user_id: req.user
                }
            });
        }

    });

app.get('/auth/facebook',
    passport.authenticate('facebook', {
        scope: ['user_status', 'publish_actions', 'publish_stream']
    }),
    function(req, res) {});

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function(req, res) {
        res.json({
            status: "success",
            output: {
                user_id: req.user.id
            }
        });
    });

app.get('/FacebookLogout', function(req, res) {
    req.logout();
    res.redirect("/vidviews");
});



app.get(/^\/(\d+)\/SearchReviewers/, function(req, res) {
    console.log(req.query.text);
    pool.getConnection(function(err, connection) {
        var query = connection.query('select (case when userid1 is not null then 1 else 0 end ) as followed, a.imageurl as image_url, a.name, a.userid as user_id, a.numreviews as number_of_reviews from (select Users.imageurl, name, Users.userid, count(videoid) as numreviews from Users left join Videos on Users.userid = Videos.userid  where name like ? group by userid) as a left join (select * from Follow where Follow.userid1 = ?) as b on a.userid = b.userid2;', ['%' + req.query.text + '%', req.params[0]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});
app.get(/^\/(\d+)\/ReviewersByVenue\/(\d+)/, function(req, res) {
    console.log(req.query.text);
    pool.getConnection(function(err, connection) {
        var query = connection.query('select (case when userid1 is not null then 1 else 0 end ) as followed, a.imageurl as image_url, a.name, a.userid as user_id, a.numreviews as number_of_reviews from (select Users.imageurl, name, Users.userid, count(videoid) as numreviews from Users left join Videos on Users.userid = Videos.userid  where venueid = ? group by userid) as a left join (select * from Follow where Follow.userid1 = ?) as b on a.userid = b.userid2;', [req.params[1], req.params[0]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});
app.get(/^\/(\d+)\/ListVenueReview/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var location = req.query.location;
        console.log(req.params);
        var sqlString = 'select  Users.userid as user_id,  Users.imageurl as image_url, Videos.videoid as review_id, Videos.stars, name, videourl as video_url, thumburl as thumbnail_url, location,  count(Likes.videoid) as numlikes, count(commentid) as num_comments from Videos left join Likes on Likes.videoid = Videos.videoid left join Comment on Comment.videoid = Videos.videoid, Users  where venueid = ? and Videos.userid = Users.userid group by Videos.videoid, location';
        if (location) {
            sqlString = 'select  Users.userid,  Users.imageurl as image_url, Videos.videoid as review_id, Videos.stars, comment, name, videourl as video_url, thumburl as thumbnail_url, location,  count(Likes.videoid) as num_likes, count(commentid) as num_comments from Videos left join Likes on Likes.videoid = Videos.videoid left join Comment on Comment.videoid = Videos.videoid, Users  where venueid = ? and Videos.userid = Users.userid and Videos.location = ? group by Videos.videoid';
        }
        var query = connection.query(sqlString, [req.params[0], location], function(err, result) {
            console.log(err);
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {

                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});

app.get('/Venues', function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select venueid as venue_id, name, country, city, imageurl as image_url, about, street, latitude, longitude, url from Venue', null, function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});

app.get(/^\/(\d+)\/ListFriends/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select  userid2 as user_id, name, imageurl as image_url from Friends, Users where userid1 = ? and userid2 = userid', req.params[0], function(err, result) {
            res.json({
                status: "success",
                output: result
            });
        });
        connection.release();
    });
});

app.put(/^\/(\d+)\/Link\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('update Facebook set userid = ? where facebookid = ?', [req.params[0], req.params[1]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "No user account exists",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success"
                });
            }
        });
        connection.release();
    });
});
app.get(/^\/(\d+)\/IsFollowing\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select count(*) as is_following from Follow where userid1 = ? and userid2 = ?', [req.params[0], req.params[1]], function(err, result) {
            if (result[0].counter > 0) {
                res.json({
                    status: 'success',
                    output: {
                        result: true
                    }
                });
            } else {
                res.json({
                    status: 'success',
                    output: {
                        result: false
                    }
                });
            }
        });
        connection.release();
    });
});
app.put(/^\/(\d+)\/Follow\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('insert into Follow values (?,?)', [req.params[0], req.params[1]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "user_ids do not exist",
                    dev_error: err
                });
            } else {
                connection.query('select name from Users where userid = ?', req.params[0], function(err, result1) {
                    console.log(result1);
                    connection.query('insert into News (userid, type, message) values (?,?,?)', [req.params[1], 'Following', result1[0].name], function(err, result) {
                        console.log(err);
                    });
                });

                res.json({
                    status: "success"
                });
            }
        });
        connection.release();
    });
});


app.get(/^\/(\d+)\/MyReviews/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select Videos.videoid, Venue.venueid as venue_id, Venue.name, Venue.imageurl, videourl, location, Room, count(User) as L from Videos  join Venue on Venue.venueid = Videos.venueid    left outer join Likes on Likes.videoid = Videos.videoid and Videos.userid =  ? group by Venue.venueid, name, imageurl, videourl, location, Room', req.params[0], function(err, result) {
            console.log(err);
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                var ret = [];
                var dict = {};
                var counter = 0;
                for (var i = 0; i < result.length; i++) {
                    if (result[i].venue_id in dict) {
                        var index = dict[result[i].venue_id];
                        ret[index].info.push({
                            review_id: result[i].videoid,
                            video_url: result[i].videourl,
                            location: result[i].location,
                            room_number: result[i].Room,
                            likes: result[i].L
                        });
                    } else {
                        console.log(result);
                        ret[counter] = {
                            venue_id: result[i].venue_id,
                            name: result[i].name,
                            image_url: "images.travelnow.com" + result[i].imageurl,
                            info: [{
                                review_id: result[i].videoid,
                                likes: result[i].L,
                                video_url: result[i].videourl,
                                location: result[i].location,
                                room_number: result[i].Room
                            }]
                        };
                        dict[result[i].venue_id] = counter;
                        counter++;
                    }
                }
                res.json(ret);
            }
        });
        connection.release();
    });
});

app.get(/^\/(\d+)\/WishedFor/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select WishList.venueid as venue_id, name, imageurl as image_url from WishList, Venue where userid = ? and WishList.venueid = Venue.venueid', req.params[0], function(err, result) {

            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                for (var i = 0; i < result.length; i++) {
                    result[i]["image_url"] = "images.travelnow.com" + result[i]["image_url"];
                }
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});

app.put(/^\/(\d+)\/WishList\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('insert into WishList values (?,?)', [req.params[0], req.params[1]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "user_id or venue_id does not exist",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success"
                });
            }
        });
    });
});

app.post(/^\/(\d+)\/Report\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('insert into Report values (?,?, ?)', [req.params[0], req.params[1], req.body.text], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "user_id or venue_id does not exist",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success"
                });
            }
        });
    });
});
app.put(/^\/(\d+)\/AddFriends\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('insert into Friends values (?,?)', [req.params[0], req.params[1]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "user_ids do not exist",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success"
                });
            }
        });
    });
});

app.get(/^\/(\d+)\/Profile/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select Users.userid as user_id, name, Users.imageURL as image_url, followers, following, posts as number_of_posts, points, Badges.imageurl from Users left join Badges on Users.userid = Badges.userid, (select count(*) as followers from Follow where userid2 = ?) as a, ' +
            '(select count(*) as following from Follow where userid1 = ?) as b, ' +
            '(select count(*) as posts from Videos where userid = ?) as c ' +
            'where Users.userid = ?', [req.params[0], req.params[0], req.params[0], req.params[0], req.params[0], req.params[0], req.params[0]], function(err, result, d) {
                console.log(err);
                if (err) {
                    res.json({
                        status: "error",
                        message: "unknown error",
                        dev_error: err
                    });
                } else {
                    var t = result;
                    if (result.length > 0) {
                        t = {
                            user_id: result[0].user_id,
                            name: result[0].name,
                            image_url: result[0].image_url,
                            followers: result[0].followers,
                            following: result[0].following,
                            number_of_posts: result[0].number_of_posts,
                            points: result[0].points,
                            badges: []
                        };
                        for (var i = 0; i < result.length; i++) {
                            t.badges[i] = result[i].imageurl;
                        }
                    }
                    res.json({
                        status: "success",
                        output: t
                    });
                }

            });
        connection.release();
    });
});
app.post(/^\/(\d+)\/Pref/, function(req, res) {
    pool.getConnection(function(err, connection) {
        console.log(req.body);
        console.log(req.params[0]);
        var query = connection.query('insert into top3(userid, c1, c2, c3) values(?,?,?,?) on duplicate key update c1=values(c1), c2=values(c2), c3=values(c3)', [req.params[0], req.body.c1, req.body.c2, req.body.c3], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "user_id does not exist or location is not in database",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success"
                });
            }
        });
        connection.release();
    });

});
app.get(/^\/(\d+)\/Pref/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select * from top3 where userid = ?', req.params[0], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});



app.get(/^\/(\d+)\/ListVideos/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select  videoid as review_id, videourl as video_url, thumburl as thumbnail_url, location from Videos where videoid = ?', req.params[0], function(err, result) {
            res.json({
                status: "success",
                output: result
            });
        });
        connection.release();
    });
});


app.put(/^\/(\d+)\/Likes\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('insert into Likes values(?,?)', [req.params[0], req.params[1]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "user_id or review_id does not exist",
                    dev_error: err
                });
            } else {
                connection.query('select Videos.userid, name from Videos, Likes, Users where Videos.videoid = ? and Videos.videoid = Likes.videoid and Likes.user = Users.userid', req.params[1], function(err, result1) {
                    console.log(result1);
                    connection.query('insert into News (userid, type, message) values (?,?,?)', [result1[0].userid, 'Like', result1[0].name], function(err, result) {
                        console.log(err);
                    });
                });
                res.json({
                    status: "success"
                });
            }
        });
        connection.release();
    });
});

app.get(/^\/(\d+)\/WhoLikes/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select userid as user_id, name, imageurl as image_url  from Likes,Users  where videoid = ? and Likes.User = Users.userid', req.params[0], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});
app.get(/^\/(\d+)\/UserLikes/, function(req, res) {

    pool.getConnection(function(err, connection) {
        var query = connection.query('select Likes.videoid as review_id, videourl as video_url, thumburl  as thumbnail_url from Likes , Videos where User  = ? and Likes.videoid = Videos.videoid', req.params[0], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});

app.get('/Top', function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('select Users.userid as user_id, count(videoid) as Likes , Users.name, Users.imageURL as image_url from (select Videos.videoid, userid from Videos, Venue,Likes where Venue.city=? and Venue.venueid = Videos.venueid and Likes.videoid = Videos.videoid) as p, Users where Users.userid = p.userid group by userid order by Likes desc limit 10', req.query.city, function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "unknown error",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: result
                });
            }
        });
        connection.release();
    });
});

function generateReview(req, res, url, reviewid) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('insert into ReviewText values(?, ?, ?, ?, ?, ?, ?) on duplicate key update stars=values(stars), comment=values(comment), roomno=values(roomno), imageurl=values(imageurl), reviewid=values(reviewid) ', [reviewid, req.params[1], req.body.stars, req.body.comment, req.params[0], url, req.body.roomno], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "userid or venueid does not exist",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success",
                    output: {
                        reviewid: reviewid
                    }
                });
            }
        });
        connection.release();
    });
}
app.post(/^\/(\d+)\/NewReview\/(\d+)/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var reviewid = parseInt(uuid.v1().toString(), 16);
        if (req.files != null) {
            if (req.files["file"]["type"].search("image") > -1) {
                var newFile = req.params[0] + "_" + req.params[1] + "_" + req.files["file"]["name"];
                blobService.createBlockBlobFromFile("roomshot", newFile, req.files["file"]["path"], function(error) {
                    fs.unlink(req.files["file"]["path"], function(err, r) {});
                    var url = 'http://mediasvcwl567f4k9xg35.blob.core.windows.net/roomshot/' + newFile;
                    generateReview(req, res, url, reviewid);

                });
            }
        } else {
            generateReview(req, res, null, reviewid);
        }
        connection.release();
    });

});

app.post(/^\/(\d+)\/UpdateProfilePic/, function(req, res) {
    pool.getConnection(function(err, connection) {
        if (req.files["file"]["type"].search("image") > -1) {
            var newFile = req.params[0] + "_" + req.files["file"]["name"];
            blobService.createBlockBlobFromFile("profileimage", newFile, req.files["file"]["path"], function(error) {
                fs.unlink(req.files["file"]["path"], function(err, r) {});
                if (error) {
                    res.json(error);
                } else {
                    var url = 'http://mediasvcwl567f4k9xg35.blob.core.windows.net/profileimage/' + newFile;
                    var query = connection.query('update Users set imageURL = ? where userid= ?', [url, req.params[0]], function(err, result) {
                        if (err) {
                            res.json({
                                status: "error",
                                message: "userid does not exist",
                                dev_error: err
                            });
                        } else {
                            res.json({
                                status: "success"
                            });
                        }

                    });
                }
            });
        }

        connection.release();
    });
});
app.post(/^\/(\d+)\/UpdateName/, function(req, res) {
    pool.getConnection(function(err, connection) {
        var query = connection.query('update Users set name = ? where userid = ?', [req.body.name, req.params[0]], function(err, result) {
            if (err) {
                res.json({
                    status: "error",
                    message: "the user_id does not exist",
                    dev_error: err
                });
            } else {
                res.json({
                    status: "success"
                });
            }

        });
        connection.release();
    });
});
app.post(/^\/(\d+)\/EditReview\/(\d+)/, function(req, res) {
        pool.getConnection(function(err, connection) {
            var query = connection.query('update ReviewText set stars = ?, comment = ? where userid=? and reviewid= ?', [req.body.stars, req.body.comment, req.params[0], req.params[1]], function(err, result) {
                if (err) {
                    res.json({
                        status: "error",
                        message: "the reviewid, userid combination does not point to a specific review",
                        dev_error: err
                    });
                } else {
                    res.json({
                        status: "success"
                    });
                }
            });
            connection.release();
        });
});


        app.post(/^\/(\d+)\/Post2Facebook/, function(req, res) {
            pool.getConnection(function(err, connection) {
                var query = connection.query('select facebookuserseecret from Facebook where facebookid = ?', req.params[0], function(err, result) {
                    graph.setAccessToken(result[0].facebookuserseecret);
                    graph.post(req.params[0] + "/feed", {
                        message: "Snow again?"
                    }, function(err, res) {
                        res.json({
                            status: "error",
                            message: "unable to post on facebook",
                            dev_error: err
                        });
                    });
                    res.json({
                        status: "success"
                    });
                    /*

	graph.post(userId + "/feed", wallPost, function(err, res) {
  // returns the post id
  console.log(res); // { id: xxxxx}*/
                });
                connection.release();
            });
        });
        var cache = [];
        app.post(/^\/(\d+)\/ReviewVideo\/(\d+)\/Location\/([A-Za-z]+)/, function(req, res) {
            pool.getConnection(function(err, connection) {
                console.log("Here");
                var params = req.params;
                var videoid = parseInt(uuid.v1().toString(), 16);
                var query = connection.query('insert into Videos (videoid, userid, venueid, location, room, stars) values (?, ?, ?, ?, ?, ?)', [videoid, params[0], params[1], params[2], req.body.room, req.body.stars], function(err, result) {
                    if (err) {
                        res.json({
                            status: 'error',
                            message: 'invalid  user_id, venue_id or location',
                            dev_error: err
                        });
                    } else {
                        uploadFile(req.files["video"]["path"], req.files["video"]["name"], function(e, r) {
                            fs.unlink(req.files["video"]["path"], null);
                            var query = connection.query("update Videos set videourl = ?, thumburl = ? where videoid = ?", [r[1], r[0], videoid], function(e1, r1) {
                                if (e1) {
                                    res.json({
                                        status: 'error',
                                        message: 'unknown error',
                                        dev_error: r1
                                    });
                                } else {
                                    res.json({
                                        status: "success",
                                        output: {
                                            review_id: videoid
                                        }
                                    });
                                };

                            });

                        });
                        var newFile = req.params[0] + "_" + req.params[1] + "_" + req.files["room_img"]["name"];
                        blobService.createBlockBlobFromFile("roomshot", newFile, req.files["room_img"]["path"], function(error) {
                            fs.unlink(req.files["room_img"]["path"], function(err, r) {});
                            var url = 'http://mediasvcwl567f4k9xg35.blob.core.windows.net/roomshot/' + newFile;
                            var query = connection.query('update Videos set roomimgURL = ? where videoid = ?', [url, videoid], function(e2, r2) {});

                        });
                    }
                });
                connection.release();
            });
        });

        app.post(/^\/(\d+)\/PostComment\/(\d+)/, function(req, res) {
            pool.getConnection(function(err, connection) {
                var commentid = parseInt(uuid.v1().toString(), 16);

                var query = connection.query('insert into Comment values (?,?,?,?,?,?)', [commentid, new Date(), req.body.title, req.body.content, req.params[0], req.params[1]], function(err, result) {
                    console.log(err);
                    if (err) {
                        res.json({
                            status: "error",
                            message: "userid or videoid does not exist",
                            dev_error: err
                        });
                    } else {
                        connection.query('select Videos.userid, name from Videos, Comment, Users where Videos.videoid = ? and Videos.videoid = Comment.videoid and Comment.userid = Users.userid', req.params[1], function(err, result1) {
                            console.log(result1);
                            connection.query('insert into News (userid, type, message) values (?,?,?)', [result1[0].userid, 'Comment', result1[0].name], function(err, result) {
                                console.log(err);
                            });
                        });
                        res.json({
                            status: "success"
                        });
                    }
                });
                connection.release();
            });
        });

        app.get(/^\/(\d+)\/ReviewComments/, function(req, res) {
            pool.getConnection(function(err, connection) {
                var query = connection.query('select commentid as comment_id, created, title, content, Users.userid as user_id, Users.name, imageURL as image_url from Comment, Users where Users.userid = Comment.userid and videoid = ?', req.params[0], function(err, result) {
                    if (err) {
                        res.json({
                            status: "error",
                            message: "unknown error",
                            dev_error: err
                        });
                    } else {
                        res.json({
                            status: "success",
                            output: result
                        });
                    }
                });
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
        }
        //var job = AzureObject.Job("Test", z);
        app.post("/SearchVenues", Expedia.expediaSearch);
        app.get(/^\/(\d+)\/ForgotPassword/, function(req, res) {

            res.json({
                status: "success",
            });
        });
        app.get(/^\/(\d+)\/ResetPassword/, function(req, res) {});


        app.get(/^\/(\d+)\/VenueInfo/, Expedia.expediaInfo);


        app.get(/^\/(\d+)\/News/, function(req, res) {
            pool.getConnection(function(err, connection) {
                var query = connection.query('select type, message, created from News where userid = ?', req.params[0], function(err, result) {
                    if (err) {
                        res.json({
                            status: "error",
                            message: "unknown error",
                            dev_error: err
                        });
                    } else {
                        res.json({
                            status: "success",
                            output: result
                        });
                    }
                });
                connection.release();
            });
        });
        app.get(/^\/(\d+)\/Badges/, function(req, res) {
            pool.getConnection(function(err, connection) {
                var query = connection.query('select imageurl as image_url from Badges where userid = ?', req.params[0], function(err, result) {
                    if (err) {
                        res.json({
                            status: "error",
                            message: "unknown error",
                            dev_error: err
                        });
                    } else {
                        res.json({
                            status: "success",
                            output: result
                        });
                    }
                });
                connection.release();
            });
        });


        app.post("/AddHotel", function(req, res) {
            pool.getConnection(function(err, connection) {
                var longitude = req.body.longitude;
                var latitude = req.body.latitude;
                var name = req.body.name;
                var venueid = parseInt(uuid.v1().toString(), 16);
                connection.query('insert into Venue (name, longitude, latitude, venueid) values (?,?,?,?)', [name, longitude, latitude, venueid], function(err, result) {
                    if (err) {
                        res.json({
                            status: "error",
                            message: "unknown error",
                            dev_error: err
                        });
                    } else {
                        res.json({
                            status: "success",
                            output: {
                                venue_id: venueid
                            }
                        });
                    }

                });
                connection.release();
            });
        });



        app.get("/Tips", function(req, res) {
            pool.getConnection(function(err, connection) {
                var query = connection.query('select Categories as category, tip from Categories', req.params[0], function(err, result) {
                    if (err) {
                        res.json({
                            status: "error",
                            message: "unknown error",
                            dev_error: err
                        });
                    } else {
                        res.json({
                            status: "success",
                            output: result
                        });
                    }
                });
                connection.release();
            });
        });

        app.post("/SendFacebookInfo", function(req, res) {
            pool.getConnection(function(err, connection) {
                var query = connection.query('insert into Facebook values (?, ?, ?) on duplicate key update facebookuserseecret = values(facebookuserseecret)', [req.body.facebook_id, req.body.facebook_id, req.body.facebook_user_secret], function(err, result) {
                    console.log(err);
                    var query2 = connection.query('insert into Users values (?, ?, ?, ?, ?) on duplicate key update usersecret = values(usersecret)', [req.body.facebook_id, req.body.facebook_user_secret, req.body.name, req.body.image_url, 0], function(err, result) {
                        console.log(err);
                        if (err) {
                            res.json({
                                status: "error",
                                message: "unknown error",
                                dev_error: err
                            });
                        } else {
                            res.json({
                                status: "success"
                            });
                        }
                    });
                });
                connection.release();
            });
        });

        app.post(/^\/(\d+)\/PushInfo/, function(req, res) {
            pool.getConnection(function(err, connection) {
                var query = connection.query('insert into PushInfo values(?, ?)', [req.params[0], req.body.uuid], function(err, result) {
                    if (err) {
                        res.json({
                            status: "error",
                            message: "user_id does not exist",
                            dev_error: err
                        });
                    } else {
                        res.json({
                            status: "success"
                        });
                    }
                });
                connection.release();
            });
        });
