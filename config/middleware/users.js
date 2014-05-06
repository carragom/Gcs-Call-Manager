var mongoose = require('mongoose'),
	User = mongoose.model('User');

exports.add = function(req, res, next) {
	var user = new User(req.body)
	user.provider = 'local';
	//user.name = req.body.username;
	user.save(function(err) {
		if (err) {
			console.log(err)
			res.json(err)
		} else {
			res.json({ok:1})
		}
	});
};

exports.set = function(req, res, next) {
	var userData = req.body;
	User.findById(userData.id, function(err, user) {
		if (err) {
			res.json(500, err);
		} else {
			user.name = userData.name;
			user.username = userData.username;
			user.role = userData.role;
			user.email = userData.email;
			if (userData.password) {
				user.password = userData.password;
			}
			user.save(function(err) {
				if (err) {
					res.json(500, err)
				} else {
					res.json({ok:1});
				}
			});
		}
	}) 
}

exports.remove = function(req, res, next) {
	User.findById(req.body.id, function(err, user) {
		if (err) {
			res.json(500, err);
		} else {
			user.remove(function(err) {
				if (err) {
					res.json(500, err);
				} else {
					res.json({ok:1});
				}
			});
		}
	})
}

exports.list = function (req, res, next) {
	User.find({}, function(err, users) {
		if (err) {
			res.send(500, err);
		} else {
			var userList = [];
			users.forEach(function(user) {
				userList.push(user.userInfo);
			});
			res.json(userList);
		}
	});
}