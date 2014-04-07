app.js:    var query = connection.query('select userid,password from LocalUser where username = ? or  email = ?', [username, username], function(err, result) {
app.js:        connection.query('select * from Users where userid = ?', profile.id, function(err, result) {
app.js:                connection.query('select * from Users where userid = ?', res.data[a].id, function(err, result) {
app.js:                        connection.query('select * from Friends where userid1 = ? and userid2 = ?', [userid1, result.userid], function(err, result) {
app.js:    var query = connection.query('select  reviewid, stars, comment, name  from ReviewText, Users where venueid = ? and ReviewText.userid = Users.userid', req.params[0], function(err, result) {
app.js:    var query = connection.query('select * from Venue', null, function(err, result) {
app.js:    var query = connection.query('select  userid2, name, imageurl from Friends, Users where userid1 = ? and userid2 = userid', req.params[0], function(err, result) {
app.js:    var query = connection.query('select count(*) as counter from Follow where userid1 = ? and userid2 = ?', [req.params[0], req.params[1]], function(err, result) {
app.js:	var query = connection.query('select ReviewText.reviewid, Venue.venueid, name, imageurl, videourl, location, Room, count(User) as L from ReviewText join Videos on Videos.reviewid = ReviewText.reviewid   join Venue on Venue.venueid = ReviewText.venueid    left outer join Likes on Likes.videoid = Videos.videoid and ReviewText.userid =  ? group by Venue.venueid, name, imageurl, videourl, location, Room', req.params[0], function(err, result) {
app.js:    var query = connection.query('select WishList.venueid, name, imageurl from WishList, Venue where userid = ? and WishList.venueid = Venue.venueid', req.params[0], function(err, result) {
app.js:	var query = connection.query('select Users.userid, name, imageURL, followers, following, posts, points from Users, (select ? as userid, count(*) as followers from Follow where userid2 = ? group by userid) as a, '+ 
app.js:				     '(select ? as userid, count(*) as following from Follow where userid1 = ? group by userid) as b, '+
app.js:				     '(select ? as userid, count(*) as posts from ReviewText where userid = ? group by userid) as c '+
app.js:    var query = connection.query('select * from top3 where userid = ?', req.params[0], function(err, result) {
app.js:    var query = connection.query('select  videoid, reviewid, videourl, ThumbURL, location from Videos where reviewid = ?', req.params[0], function(err, result) {
app.js:    var query = connection.query('select User, name, imageURL  from Likes,Users  where videoid = ? and Likes.User = Users.userid', req.params[0], function(err, result) {
app.js:    var query = connection.query('select Likes.videoid, reviewid, videourl, thumburl from Likes , Videos where User  = ? and Likes.videoid = Videos.videoid', req.params[0], function(err, result) {
app.js:    var query = connection.query('select Users.userid, count(videoid) as Likes , Users.name, Users.imageURL from (select Videos.videoid, userid from Videos, ReviewText,Venue,Likes where Venue.city=? and Venue.venueid = ReviewText.venueid and Videos.reviewid = ReviewText.reviewid and Likes.videoid = Videos.videoid) as p, Users where Users.userid = p.userid group by userid order by Likes desc limit 10', req.query.city, function(err, result) {
app.js:    var query = connection.query('select facebookuserseecret from Facebook where facebookid = ?', req.params[0], function(err, result) {
app.js:	var query = connection.query('select commentid, created, title, content, userid, name, imageURL from Comment, Users where Users.userid = Comment.userid and reviewid = ?', req.params[0], function(err, result) {
app.js:	var query = connection.query('select * from Categories', req.params[0], function(err, result) {
Expedia.js:				connection.query('select Venue.venueid, name, street, userid, imageurl, stars, longitude, latitude from Venue left join  ReviewText on ReviewText.venueid = Venue.venueid where Venue.venueid = ?', data.hotelId, function(err, result) {
Expedia.js:		connection.query('select url, imageurl from Venue where  Venue.venueid = ?', req.params[0], function(err, result) {
