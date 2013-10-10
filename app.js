
/**
 * Module dependencies.
 **/

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
	cookie = require('express/node_modules/cookie'),
	connect = require('express/node_modules/connect'),
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

io.set('authorization', function (handshakeData, accept) {

  if (handshakeData.headers.cookie) {

    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);

    handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['connect.sid'], 'We4aN6chi7');

    if (handshakeData.cookie['connect.sid'] == handshakeData.sessionID) {
      return accept('Cookie is invalid.', false);
    }

  } else {
    return accept('No cookie transmitted.', false);
  } 

  accept(null, true);
});

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
			context: 'from-internal',
			timeout: '30000',
			supervisor: data.supervisorId,
			agent: data.agentId
		};
		gcsAmi.send({order: "spyAgent", payload: pkg});
	});

	gcsAmi.on('agentRemoved', function(payload) {
		// payload has all data needed to send the clients
		socket.emit('agentRemoved', payload);
	});

	gcsAmi.on('freshData', function(ami_data){
		socket.emit('freshData', ami_data);
	});

});

