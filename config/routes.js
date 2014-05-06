/** Greencore Solutions QueueMonitor Router
 *
 * / for login
 * /queueMonitor authenticated 
 *
 **/

var async = require('async')

/** Add controllers here
 *
 **/

/** Route Middlewares
 *
 **/

var auth = require('./middleware/authorization'),
	users = require('./middleware/users'),
	userCookie = require('./middleware/userCookie')

/** Finally Expose routes
 *
 **/

module.exports = function (app, passport) {

	app.get('/', function(req, res){
		res.redirect('/login');
	});

	app.get('/login', function(req, res){
		res.render('login', {user: req.user, message: req.flash('error')});
	});

	app.post('/login', passport.authenticate('local', 
			{
				failureRedirect: '/login', 
				failureFlash: 'Invalid username or password'
			}),
		function (req, res) {
			res.redirect('/queueMonitor');
		}
	);

	app.get('/userAdmin', auth.requiresLogin, function(req, res) {
		res.render('users', {user: req.user});
	});

	app.get('/api/users', auth.requiresLogin, users.list);

	app.post('/api/users', auth.requiresLogin, users.add, function(req, res) {
		res.render('users');
	});

	app.put('/api/users', auth.requiresLogin, users.set);
	app.delete('/api/users', auth.requiresLogin, users.remove);

	app.get('/queueMonitor', auth.requiresLogin, userCookie.set, function(req, res){
		res.render('queueMonitor', {title: 'Greencore Solutions Queue Monitor'});
	});

	app.get('/logout', function(req, res){
		req.logout();
		res.redirect('/login');
	});
	
};
