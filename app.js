
/**
 * Module dependencies.
 **/

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

gcsAmi.connect(config.ami); //This call opens the connection to asterisk AMI
gcsAmi.on('error', function(error){
	console.log('AMI error: '+error);
});



/**
 * Authorize socket.io for logged users only
 *
 **/
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

/**
 * React to client events from socket.io
 *
 **/
io.sockets.on('connection', function(socket){
	socket.on('my event', function(data){
		console.log(data);
	});

	socket.on('userPrefs', function	(data) {
		var User = mongoose.model('User');
		User.findById(data.userId, function(err, user) {
			if (!err) {
				var index = user.queues.map(function(q) {return q.queueId}).indexOf(data.queueId);
				if (-1 !== index) {
					user.queues[index].view = data.view;
				} else {
					user.queues.push({queueId: data.queueId, view: data.view});
				}
				user.save(function(err, user) {
					if (err) {
						console.log('error saving user prefs '+error);
					}
				});
			}
		});
	});

	socket.on('pauseAgent', function(data){ //Toggle Paused state for an agent in a queue
		var pkg = {
			action: 'QueuePause', 
			queue: data.queue, 
			interface: data.interface, 
			paused: data.paused
		};
		gcsAmi.send({order: 'QueuePause', payload: pkg});
	});

	socket.on('removeAgent', function(data){ //Remove an agent from a queue
		var pkg = {
			action: 'QueueRemove', 
			queue: data.queue, 
			interface: data.interface
		};
		gcsAmi.send({order: 'QueueRemove', payload: pkg});
	});

	socket.on('spyAgent', function(data){ //Create ChannelSpy channel for the supervisor
		/*var pkg = {
			action: 'Originate',
			application: 'ExtenSpy',
			options: 'qES',
			context: 'from-internal',
			timeout: '30000',
			supervisor: data.supervisorId,
			agent: data.agentId
		};*/ //This pkg was intended to use extenSpy, but asterisk did not cooperate, so chanspy was used with the next pkg
		var pkg = {
			action: 'Originate',
			channel: 'Local/'+data.supervisorId,
			exten: '556',
			timeout: '30000',
			priority: '1',
			variable: 'agent='+data.agentId,
			context: 'from-internal'
		};
		gcsAmi.send({order: "spyAgent", payload: pkg});
	});

	gcsAmi.on('newAgent', function(payload) { //If a new agent is found in a queue, alert the clients
		// payload has all data needed to send the clients
		socket.emit('newAgent', payload);
	});

	gcsAmi.on('agentRemoved', function(payload) { //If an agent is removed from a queue, alert the clients
		// payload has all data needed to send the clients
		socket.emit('agentRemoved', payload);
	});

	gcsAmi.on('freshData', function(ami_data){ //If gcsAmi gets fresh queue data, send it to the clients
		socket.emit('freshData', ami_data);
	});

});

