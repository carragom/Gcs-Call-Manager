'use strict';

var mongoose = require('mongoose'),
	User = mongoose.model('User');

// Clear old users, then add a default admin user and a normal user
User.find({}).remove(function() {
	User.create({
		provider: 'local',
		name: 'Admin Sample User',
		username: 'admin',
		email: 'admin@nowher.com',
		role: true,
		password: 'greencoreAdmin'
	}, function(){console.log('Sample admin user added - admin/greencoreAdmin');});
	User.create({
		provider: 'local',
		name: 'Admin Sample User',
		username: 'admin',
		email: 'admin@nowher.com',
		role: true,
		password: 'greencoreAdmin'
	}, function() {console.log('finished populating users');});
});
