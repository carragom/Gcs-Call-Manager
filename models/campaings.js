'use strict';

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

// User Schema 
var campaingsSchema = new Schema({
	numbers: [{
        name: {type: String, default: ''},
		number: {type: String, default: ''}
     }],
	date: {type: String, default: ''},
	epoch: {type: Number, default: 0},
	queues: [{queue: String, default: ''}]
});


module.exports = mongoose.model('campaings', campaingsSchema);