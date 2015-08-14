'use strict'

var campaing = require('../models/campaing'),
	moment = require('moment');

exports.add = function (data) {
	var dateStart = moment(data.dateStart),
		dateFinish = moment(data.dateFinish),
		// queues = [],
		queue = data.queues,
		phones = [], 
		splits;

	for (var i = 0; i < data.phones.length-1; i++) {
		splits = data.phones[i].split(',');
		phones.push({name: splits[0], phone: splits[1]});
	};

	/*splits = data.queues.split(',');
	for (var i = 0; i < splits.length; i++) {
		queues.push({queue: splits[i]});
	};*/

	var newCampaing = new campaing({
		dateStart: dateStart,
		epochStart: dateStart.unix(),
		dateFinish: dateFinish,
		epochFinish: dateFinish.unix(),
		queue/*s*/: queue/*s*/,
		phones: phones,
		status: 0
	});

	newCampaing.save(function(err, camp){
		if(err) console.log(err)
		console.log(camp)
	})
}

exports.task = function (cb) {
	//moment('2010-10-20').isBetween('2010-10-19', '2010-10-25');
	var epochActual = moment().unix(),
		pkg = {start:[], unpause:[], pause:[]};
	campaing.find({status: {'$nin': [1]}}).exec(function (err, camp){
		if(err) console.log(err)
		else {
			if(camp.length != 0) {
				for (var i = 0; i < camp.length; i++) {
 					if(camp[i].epochStart < epochActual && epochActual < camp[i].epochFinish + 1 || epochActual == camp[i].epochStart ){ 
						console.log('Esta dentro del rango de fechas')
						// camp[i].status == 0 ? pkg.start.push(camp[i]) : pkg.unpause.push(camp[i]);
						// camp[i].status == 0 ? pkg.start.push(camp[i]) : camp[i].status == 1 ? pkg.unpause.push(camp[i]) : pkg.pause.push(camp[i]);
						camp[i].status == 0 || camp[i].status == 1 ? pkg.start.push(camp[i]) : pkg.unpause.push(camp[i]);
					}
				};
			} else {
				console.log('No campaign is pending')
			}
		}
		return cb(pkg);
	});
}

exports.updateStatus = function (cmping){
	campaing.findByIdAndUpdate(cmping.id, {status: cmping.status}, function (err, camp) {
		console.log(camp);
	});
}

exports.makeCalls = function(queue, cb){
	var originateArray = [];

	campaing.findOne({queue: queue.queue, status: 2}, function (err, camp) {
		console.log(camp);

	});

	return cb(originateArray);
}