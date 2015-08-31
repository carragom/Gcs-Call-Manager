'use strict'

var campaing = require('../models/campaing'),
	Event = require('../models/Event'),
	moment = require('moment');

exports.add = function (data) {
	var dateStart = moment(data.dateStart,"YYYY/MM/DD HH:mm"),
		dateFinish = moment(data.dateFinish,"YYYY/MM/DD HH:mm"),
		// queues = [],
		queue = data.queues,
		phones = [], 
		splits;

	for (var i = 0; i < data.phones.length-1; i++) {
		splits = data.phones[i].split(',');
		phones.push({name: splits[0], phone: splits[1], status: 'in list', agent: '', comment: ''});
	};

	var newCampaing = new campaing({
		dateStart: dateStart,
		epochStart: dateStart.unix(),
		dateFinish: dateFinish,
		epochFinish: dateFinish.unix(),
		queue: queue,
		phones: phones,
		status: 0,
		index: 0
	});

	newCampaing.save(function(err, camp){
		if(err) console.log(err)
		console.log(camp)
	})
}

exports.task = function (cb) {
	//moment('2010-10-20').isBetween('2010-10-19', '2010-10-25');
	var epochActual = moment().unix(),
		pkg = {start:[],/* pause:[], */inProgress:[]};
	campaing.find({status: {'$nin': [1, 3]}}).exec(function (err, camp){
		if(err) console.log(err)
		else {
			// console.log(camp)
			if(camp.length != 0) {
				for (var i = 0; i < camp.length; i++) {
 					if(camp[i].epochStart <= epochActual && epochActual < camp[i].epochFinish){ 
						// console.log('Esta dentro del rango de fechas')
						camp[i].status == 0 ? pkg.start.push(camp[i]) : pkg.inProgress.push(camp[i]);
						// camp[i].status == 0 ? pkg.start.push(camp[i]) : camp[i].status == 2 ? pkg.inProgress.push(camp[i]) : pkg.pause.push(camp[i]);
						// camp[i].status == 0 || camp[i].status == 1 ? pkg.start.push(camp[i]) : pkg.unpause.push(camp[i]);
					} else if (camp[i].epochFinish >= epochActual) {
						campaing.findByIdAndUpdate(camp[i]._id, {status: 1}, function (err, camp) {});
					}
				};
			} else {
				console.log('No campaign is pending')
			}
		}
		return cb(pkg);
	});
}

exports.updateStatus = function (cmping, cb){
	campaing.findByIdAndUpdate(cmping.id, {status: cmping.status}, function (err, camp) {
		return cb();
	});
}

exports.makeCalls = function(queue, cb){
	var originateArray = [], cola = '';

	campaing.findOne({queue: queue.queue, status: 2}).exec(function (err, camp) {

		if(err) console.log(err);
		if(camp){
			var index = camp.index;
			cola = camp.queue;
			if(index < camp.phones.length){
				for (var i = 0; i < queue.available; i++) {
					originateArray.push(camp.phones[index++]);
				};
				campaing.findByIdAndUpdate(camp._id, {index: index}, function (err, cmp) {});
			} else {
				campaing.findByIdAndUpdate(camp._id, {status: 1}, function (err, cmp) {});
				return cb({originateArray: [], queue: cola, isEmpty: true, _id: camp._id})
			}
		}
		return cb({originateArray: originateArray, queue: cola, isEmpty: false});
	});
}

exports.startCampaing = function(started, cb) {
	var cmping = []
	for (var i = 0; i < started.length; i++) {
		cmping.push(started[i].queue);
	};
	campaing.find({ status: 2, queue: { '$in': cmping} }, function (err, camp) {
		// console.log(camp)
		return cb(camp);
	});
}

exports.callStatus = function(call) {
	console.log('------------ change Status')
	console.log(call)
	campaing.findById(call.campaing._id, function (err, camp) {
		console.log(camp)
		Event.find({uniqueid: call.uniqueid}, function (err, event) {
			console.log(event)
			for (var i = 0; i < camp.phones.length; i++) {
				// if(camp.phones[i].phone == ){}

			};
		});
	});
}