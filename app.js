
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var util = require('util');
var connect = require('express/node_modules/connect');
var cookie = require('express/node_modules/cookie');

var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var Gcs_Ami = require('./gcs_modules/gcs_ami');
var gcsAmi = new Gcs_Ami();

// development only
/*if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}*/


var users = [
	{id: 1, username: 'fede', password: 'cisco', email: 'fede@paja.com'},
	{id: 2, username: 'alvaro', password: 'paja', email: 'alvaro@paja.com'}
];

function findById(id, fn) {
	var idx=id-1;
	if (users[idx]) {
		fn(null, users[idx]);
	} else {
		fn(new Error('user '+ id + 'does not exist'));
	};
};

function findByUsername(username, fn) {
	for (var i = 0, len = users.length; i < len; i++) {
		var user = users[i];
		if (user.username === username) {
			return fn(null, user);
		};
	};
	return fn(null, null);
};

// Serialize user to support persisten login sessions

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	findById(id, function(err, user){
		done(err, user);
	});
});

//Set up Passport Strategy
passport.use(new LocalStrategy( function(username, password, done){
	process.nextTick(function (){
		findByUsername(username, function(err, user) {
			if (err) {
				return done(err);
			};
			if (!user) {
				return done(null, false, { message: 'Usuario Desconocido '+username});
			};
			if (user.password != password) {
				return done(null, false, { message: 'Password Incorrecto'});
			};
			return done(null, user);
		})
	});
}));


var app = express();

// all environments
/*app.configure(function(){
	app.set('port', process.env.PORT || 3001);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser);
	app.use(express.session({secret: 'We4aN6chi7'}));	

	app.use(flash());
	app.use(passport.initialize());
	app.use(passport.session());

	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});*/

app.configure(function() {
  app.set('port', process.env.PORT || 3001);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + "/public/images/favicon.ico"));

  app.use(express.logger(''));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'We4aN6chi7' }));
  
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});


var queueMonitor = require('./routes/queueMonitor');

app.get('/', function(req, res){
	res.render('index', {user: req.user, title: 'Greencore Solutions Queue Monitor'});
});

app.get('/account', ensureAuthenticated, function(req, res){
	res.render('account', {user: req.user});
});

app.get('/queueMonitor', ensureAuthenticated, queueMonitor.queueMonitor);

app.get('/login', function(req, res) {
	res.render('login', {user: req.user, message: req.flash('error')});
});

//app.get('/users', user.list);

app.post('/login', passport.authenticate('local', {failureRedirect: '/login', failureFlash: true}), 
	function(req, res){
		res.redirect('/queueMonitor');
	}
);

app.get('/logout', function(req, res){
	req.logout();
	res.redirect('/');
});

server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

gcsAmi.connect(); //This call opens the connection to asterisk AMI
gcsAmi.on('error', function(error){
	console.log('AMI error: '+error);
});

var io = require('socket.io').listen(server, {log: false});

/*io.set('authorization', function (handshakeData, accept) {

  if (handshakeData.headers.cookie) {

    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);

    handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['express.sid'], 'We4aN6chi7');

    if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
      return accept('Cookie is invalid.', false);
    }

  } else {
    return accept('No cookie transmitted.', false);
  } 

  accept(null, true);
});*/

io.sockets.on('connection', function(socket){
	socket.on('my event', function(data){
		console.log(data);
	});

	socket.on('pauseAgent', function(data){
		gcsAmi.send({action: 'QueuePause', queue: data.queue, interface: data.interface, paused: data.paused});
	});

	socket.on('removeAgent', function(data){
		gcsAmi.send({action: 'QueueRemove', queue: data.queue, interface: data.interface});
	});

	gcsAmi.on('freshData', function(ami_data){
		socket.emit('freshData', ami_data);
	});

});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	};
	res.redirect('login');
};