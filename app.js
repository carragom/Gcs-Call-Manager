
/**
 * Module dependencies.
 */

/*
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
*/

// development only
/*if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}*/

var express = require('express'),
	http = require('http'),
	fs = require('fs'),
	passport = require('passport'),
	Gcs_Ami = require('./gcs_modules/gcs_ami'),
	gcsAmi = new Gcs_Ami();

var env = process.env.NODE_ENV || 'development',
	config = require('./config/config')[env],
	mongoose = require('mongoose');

mongoose.connect(config.db);

require('./models/user'); //If more models change to "for *js" 

require('./config/passport')(passport, config);

var app = express();

require('./config/express')(app, config, passport);
require('./config/routes')(app, passport);


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

	socket.on('spyAgent', function(data){
		var pkg = {
			action: 'Originate',
			application: 'ExtenSpy',
			options: 'qES',
			supervisor: data.supervisorId,
			agent: data.agentId
		};
		gcsAmi.send({order: "spyAgent", payload: pkg});
	});

	gcsAmi.on('freshData', function(ami_data){
		socket.emit('freshData', ami_data);
	});

});

