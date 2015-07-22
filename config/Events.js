'use strict';

var Event = require('../models/Event');
var queue = require('../models/queue');
var moment = require('moment');
var User = require('../models/user');

exports.add = function (eventAMI) {
	// console.log(eventAMI)
	var epochTime = moment().unix();
	var momentDate = moment().format('MMM Do YYYY, h:mm:ss a');

	var exten = (eventAMI.event == "Join") ? eventAMI.queue : eventAMI.exten;
		var ev = new Event({
			events: [{
		        status: eventAMI.channelstatedesc,
				epoch: epochTime /*1434777777*/,
				exten: exten,
				name: eventAMI.event
		     }],
			date: momentDate,
			status: "Abandoned",
			channel: eventAMI.channel,
			uniqueid: eventAMI.uniqueid,
			calleridnum: eventAMI.calleridnum,
			calleridname: eventAMI.calleridname,
			connectedlinenum: eventAMI.connectedlinenum,
			connectedlinename: eventAMI.connectedlinename
		});
		if(!eventAMI.hasOwnProperty("connectedlinenum") ){
			ev.connectedlinenum = '';
			ev.connectedlinename = '';
		}
		if(!eventAMI.hasOwnProperty("calleridnum") ){
			ev.calleridnum = '';
			ev.calleridname = '';
		}
		// console.log(ev)
		ev.save(function(error, evnt) {
			if (error) console.log(error);
			// else console.log(evnt)
		});
}


exports.freshData = function (queueArray, extenUser, cb) {
	// console.log("*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+*+")
	// console.log(queueArray)
	// console.log(extenUser)
	if(extenUser === '') {
		queue.find().exec( function (err, queues){
	 		abandonedCalls(queueArray, function(queueArray){
				var j = queues[0].queues.length - 1;
				for (var i = 1; i < queueArray.length; i++) {
					queueArray[i].abandoned = queues[0].queues[j--].abandoned;
				};//for i
				// console.log("antes de enviar a app");
	 			return cb(queueArray);
	 		});
		})//queue
	} else {
		for (var i = 0; i < queueArray.length; i++) {
			for (var j = 0; j < queueArray[i].agents.length; j++) {
				if(queueArray[i].agents[j].id === extenUser){
					agentReport(queueArray[i].agents[j], function(users){
						return cb(users);
					});
				}
			};
		};
	}
}

exports.mergeEvents = function (cb){
	// console.log("------------------------------------------ Entro al metodo de mergeEvents !!!!!!!!!!!!!")
	queue.find({}, function (err, queues) {
		var colas = queues[0];
		Event.find({events: { '$elemMatch': { epoch: { '$gte': colas.epoch} } } },{uniqueid:1}).sort({uniqueid:1}).exec(function(err,events){
			// console.log(events.length)
			var uniqueids = [ ],
				y = 0;
			for (var i = 0; i < events.length; i++) {
				if(y == 0) uniqueids[y++] = events[i].uniqueid;
			 	else{
			 		if(uniqueids[y - 1] != events[i].uniqueid){
			 			uniqueids[y++] = events[i].uniqueid;
			 		}
			 	}
			 	if(i == events.length - 1) {
			 		merge(uniqueids, function(){
			 			return cb();
			 		});
			 	}
			};
		});
	});
}

function merge (uniqueids, cb){
	for (var h = 0; h < uniqueids.length; h++) {
		var delField = [ ]; 
		Event.find({uniqueid: uniqueids[h]}).exec(function(err,evnts){
			if(evnts.length > 1){
				var ev;
				for (var i = 0; i < evnts.length; i++) {
					// console.log("============================================================")
					// console.log(evnts[i])
					// console.log(i)
					delField.push(evnts[i]._id);
					if(i == 0){
						ev = new Event({
							events: evnts[i].events,
							date: evnts[i].date,
							status: evnts[i].status,
							channel: evnts[i].channel,
							uniqueid: evnts[i].uniqueid,
							calleridnum: evnts[i].calleridnum,
							calleridname: evnts[i].calleridname,
							connectedlinenum: evnts[i].connectedlinenum,
							connectedlinename: evnts[i].connectedlinename
						});
						if(evnts[i].events[0].status == 'Up') {
							ev.status = "Completed";
						} else if(evnts[i].events[0].status == 'Ringing') {
							ev.calleridnum = evnts[i].connectedlinenum,
							ev.calleridname = evnts[i].connectedlinename,
							ev.connectedlinenum = evnts[i].calleridnum,
							ev.connectedlinename = evnts[i].calleridname
						}
					} else {
						// console.log(ev)
						if(ev.connectedlinenum === '' && evnts[i].connectedlinenum != ''){
							ev.connectedlinename = evnts[i].connectedlinename;
							ev.connectedlinenum = evnts[i].connectedlinenum;
						}
						if(ev.calleridnum === '' && evnts[i].calleridnum != ''){
							ev.calleridname = evnts[i].calleridname;
							ev.calleridnum = evnts[i].calleridnum;
						}
						for (var j = 0; j < evnts[i].events.length; j++) {
							ev.events.push(evnts[i].events[j])
							
							if(evnts[i].events[j].status == 'Up'){
								ev.status = "Completed";
							} else if(evnts[i].events[0].status == 'Ringing') {
								ev.calleridnum = evnts[i].connectedlinenum,
								ev.calleridname = evnts[i].connectedlinename,
								ev.connectedlinenum = evnts[i].calleridnum,
								ev.connectedlinename = evnts[i].calleridname
							}
						};
					}
					//console.log(ev)
					Event.findByIdAndRemove(evnts[i]._id, function (err, callback){
						if(err) console.log(err)
					});
				};//For loop
				// console.log("////////////////////////////////////////////////////////////////")
				// console.log(ev)
				// console.log("////////////////////////////////////////////////////////////////")
				
				ev.save();

				if(h == uniqueids.length - 1 && i == evnts.length - 1){
					return cb();
				}
			}
		});
	}//For loop 
}

exports.abandoned = function(cb){
	queue.find({}, function (err, queues) {
		var colas = queues[0];
		// console.log(colas)
		Event.find({channel: {'$regex': /SIP/}, '$and': [{'events.status': {'$ne': 'Up'}}, {'events.status': 'Ringing'}, {'events.name': 'Hangup'}, {'events.epoch': {'$gte' : colas.epoch}}]}).exec( function (err, ami_datos){
			for (var i = 0; i < ami_datos.length; i++) {
				// console.log(ami_datos[i]);
				var splitConnectedName = ami_datos[i].connectedlinename.split('-');
				if(splitConnectedName.length > 1){
					splitConnectedName[0] == 'RE' ? colas.queues[0].abandoned = parseInt(colas.queues[0].abandoned) + 1 : // 0 :
					splitConnectedName[0] == 'ST' ? colas.queues[1].abandoned = parseInt(colas.queues[1].abandoned) + 1 : // 0 :
					splitConnectedName[0] == 'VE' ? colas.queues[2].abandoned = parseInt(colas.queues[2].abandoned) + 1 : // 0 :
					splitConnectedName[0] == 'CU' ? colas.queues[3].abandoned = parseInt(colas.queues[3].abandoned) + 1 : // 0 :
					splitConnectedName[0] == 'CO' ? colas.queues[4].abandoned = parseInt(colas.queues[4].abandoned) + 1 : // 0 :
										    /*UNA*/	colas.queues[5].abandoned = parseInt(colas.queues[5].abandoned) + 1 ; // 0 ;
					// console.log(ami_datos[i]);
				}
				if(i == ami_datos.length - 1){
					var j = 0;
					while('Hangup' !== ami_datos[i].events[j].name){ /*console.log(ami_datos[i].events[j]);*/ j++;}
					// console.log(ami_datos[i])
					colas.epoch = parseInt(ami_datos[i].events[j].epoch) + 1;
				}
			}

			colas.save(function (err, cola){
				if(err) console.log(err);
				// console.log(colas);
				return cb();
			});
		});
	});
}

function abandonedCalls (queueArray, cb){
	// console.log(queueArray);
	var epochLte = moment(),
		epochGte = moment();
	epochGte.hours(0);
	epochGte.minutes(0);
	epochGte.seconds(0);

	Event.find({channel: {'$regex': /SIP/}, '$and': [{'events.status': {'$ne': 'Up'}}, {'events.status': 'Ringing'}, {'events.name': 'Hangup'}, {'events.epoch': {'$gte' : epochGte.unix() }}]}).exec( function (err, ami_datos){

		if(err) return cb(queueArray);
		//var abandonedCalls = [ [], [], [], [], [] ];
		var abandonedCalls = new Array(6);
		for (var i = 0; i < 6; i++) {
			var qi = new Array();
			abandonedCalls[i] = qi;
		}
		
		for (var i = 0; i < ami_datos.length; i++) {

			var splitCallerIdName = ami_datos[i].calleridname.split('-');
			if(splitCallerIdName.length > 1){
				splitCallerIdName[0] == 'RE' ? abandonedCalls[0].push( ami_datos[i] ) : // 0 :
				splitCallerIdName[0] == 'ST' ? abandonedCalls[1].push( ami_datos[i] ) : // 0 :
				splitCallerIdName[0] == 'VE' ? abandonedCalls[2].push( ami_datos[i] ) : // 0 :
				splitCallerIdName[0] == 'CU' ? abandonedCalls[3].push( ami_datos[i] ) : // 0 :
				splitCallerIdName[0] == 'CO' ? abandonedCalls[4].push( ami_datos[i] ) : // 0 :
									    /*UNA*/	abandonedCalls[5].push( ami_datos[i] ) ; // 0 ;
			}
			// console.log("abandonedCalls function ----------------------------------------------------");
				
		}
		
		for (var j = 1, k = queueArray.length - 2; j < queueArray.length; j++, k--) {
			queueArray[j].statsCalls   = abandonedCalls[k];
			queueArray[j].abandonedDay = abandonedCalls[k].length;
		};
		return cb(queueArray);
	});//eventos
}

exports.queueReport = function (queueArray, cb){
	// console.log(queueArray);

	Event.find({channel: {'$regex': /SIP/}, '$and': [{'events.status': {'$ne': 'Up'}}, {'events.status': 'Ringing'}, {'events.name': 'Hangup'}]}).exec( function (err, abandoned){
		Event.find({channel: {'$regex': /SIP/}, '$and': [{'events.status': 'Up'}, {'events.name': 'Hangup'}]}).exec( function (err, completed){

			if(err) return cb(queueArray);
			//var abandonedCalls = [ [], [], [], [], [] ];
			var abandonedCalls = new Array(6);
			var completedCalls = new Array(6);
			for (var i = 0; i < 6; i++) {
				var qi = new Array();
				abandonedCalls[i] = qi;
				completedCalls[i] = new Array();
			}
			
			for (var i = 0; i < abandoned.length; i++) {

				var splitCallerIdName = abandoned[i].calleridname.split('-');
				if(splitCallerIdName.length > 1){
					splitCallerIdName[0] == 'RE' ? abandonedCalls[0].push( abandoned[i] ) : // 0 :
					splitCallerIdName[0] == 'ST' ? abandonedCalls[1].push( abandoned[i] ) : // 0 :
					splitCallerIdName[0] == 'VE' ? abandonedCalls[2].push( abandoned[i] ) : // 0 :
					splitCallerIdName[0] == 'CU' ? abandonedCalls[3].push( abandoned[i] ) : // 0 :
					splitCallerIdName[0] == 'CO' ? abandonedCalls[4].push( abandoned[i] ) : // 0 :
										    /*UNA*/	abandonedCalls[5].push( abandoned[i] ) ; // 0 ;
				}
				// console.log("abandonedCalls function ----------------------------------------------------");	
			}

			
			for (var i = 0; i < completed.length; i++) {

				var splitCallerIdName = completed[i].calleridname.split('-');
				if(splitCallerIdName.length > 1){
					splitCallerIdName[0] == 'RE' ? completedCalls[0].push( completed[i] ) : // 0 :
					splitCallerIdName[0] == 'ST' ? completedCalls[1].push( completed[i] ) : // 0 :
					splitCallerIdName[0] == 'VE' ? completedCalls[2].push( completed[i] ) : // 0 :
					splitCallerIdName[0] == 'CU' ? completedCalls[3].push( completed[i] ) : // 0 :
					splitCallerIdName[0] == 'CO' ? completedCalls[4].push( completed[i] ) : // 0 :
										    /*UNA*/	completedCalls[5].push( completed[i] ) ; // 0 ;
				}
				// console.log("abandonedCalls function ----------------------------------------------------");	
			}

			for (var j = 1, k = queueArray.length - 2; j < queueArray.length; j++, k--) {
				queueArray[j].statsCalls.push({calls: completedCalls[k], name: "Completed: ", length: completedCalls[k].length});
				queueArray[j].statsCalls.push({calls: abandonedCalls[k], name: "Abandoned: ", length: abandonedCalls[k].length});
				queueArray[j].abandonedDay = abandonedCalls[k].length;
			};
			return cb(queueArray);
		});//eventos
	});//eventos
}

function agentReport (agent, cb){
	// console.log(agent);

	Event.find({channel: {'$regex': /SIP/}, 'connectedlinenum': agent.id, 'events.status': 'Ringing'}).exec( function (err, received){
		Event.find({channel: {'$regex': /SIP/}, 'calleridnum': agent.id, 'events.status': 'Ring', '$and' : [{'events.exten': { '$not': /\*45/ }}, {'events.exten': { '$not': /555/ }}]}).exec( function (err, realized){

			if(!err){
				var statsCalls = [];
				statsCalls.push({calls: received, name: "Received: ", length: received.length});
				statsCalls.push({calls: realized, name: "Realized: ", length: realized.length});
				agent.statsCalls = statsCalls;
				// console.log(agent)
			}
			var users = [agent];
			return cb(users);
		});//realized
	});//received

}