
/*
 * GET home page.
 */

exports.pic = function(req, res){
  console.log('Boo');
  res.render('pic', { title: 'Express' });
};
