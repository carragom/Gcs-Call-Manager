'use strict';

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// User Schema 
var campaingSchema = new Schema({
	phones: [{
        name: {type: String, default: ''},
		phone: {type: String, default: ''}
     }],
	dateStart: {type: String, default: ''},
	epochStart: {type: Number, default: 0},
	dateFinish: {type: String, default: ''},
	epochFinish: {type: Number, default: 0},
	//queues: [{queue: String, default: ''}],
	queue: {type: String, default: ''},
	status: {type: Number, default: 0},
});


module.exports = mongoose.model('campaing', campaingSchema);