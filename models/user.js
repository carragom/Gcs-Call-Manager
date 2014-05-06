var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	crypto = require('crypto'),
	_ = require('underscore')

var emailRegexp = new RegExp('^[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,4}$', 'i');
var queueViews = ['ignored', 'colapsed', 'normal'];

// User Schema 
var UserSchema = new Schema({
	name: {type: String, default: ''},
	role: {type: Boolean, default:'false'},
	email: {type: String, default: ''},
	username: {type: String, default: ''},
	provider: {type: String, default: ''},
	hashed_password: {type: String, default: ''},
	salt: {type: String, default: ''},
	authToken: {type: String, default: ''},
	queues: {
		queueId: {type: String},
		view: {type: String, enum: queueViews}
	}
});

//Virtuals
UserSchema
	.virtual('password')
	.set(function(password){
		this._password = password
		this.salt = this.makeSalt()
		this.hashed_password = this.encryptPassword(password)
	})
	.get(function(){
		return this._password
	})

UserSchema
	.virtual('userInfo')
	.get(function() {
		return {
			'id': this._id,
			'name': this.name,
			'username': this.username,
			'role': this.role,
			'email': this.email,
			'queues': this.queues
		}
	})

//Validations
var validatePresenceOf = function(value) {
	return value && value.length;
};

UserSchema.path('name').validate(function (name){
	return name.length;
}, 'Name cannot be blank');

UserSchema.path('email').validate(function (email){
	return emailRegexp.test(email);
}, 'Email is not valid');

UserSchema.path('email').validate(function (email, fn){
	var User = mongoose.model('User')

	if (this.isNew || this.isModified('email')) {
		User.find({email: email}).exec(function(err, users) {
			fn(!err && users.length === 0)
		})
	} else fn(true);
}, 'Email already exists');

UserSchema.path('username').validate(function (username){
	return username.length;
}, 'Username cannot be blank');

UserSchema.path('username').validate(function (username, fn) {
	var User = mongoose.model('User')

	if (this.isNew || this.isModified('username')) {
		User.find({username: username}).exec(function(err, users) {
			fn(!err && users.length === 0)
		})
	} else {
		fn(true);
	}
}, 'Username already exists');

UserSchema.path('hashed_password').validate(function (hashed_password){
	return hashed_password.length;
}, 'Password cannot be blank');

/** Pre Save hook **/

UserSchema.pre('save', function(next){
	if (!this.isNew) return next();

	if (!validatePresenceOf(this.password)) {
		next(new Error('Invalid password'));
	} else {
		next();
	};
});

UserSchema.methods = {
	/** Authenticate if passwords are the same
	 * @param {String} plainText
	 * @return {Boolean}
	 * @api public
	 */

	 authenticate: function(plainText) {
	 	return this.encryptPassword(plainText) === this.hashed_password;
	 },

	 /** Make Salt
	  *
	  * @return {String}
	  * @api public
	  */

	makeSalt: function() {
		return Math.round((new Date().valueOf() * Math.random())) + '';
	},

	/** Encrypt password
	 *
	 * @param {String}
	 * @return {String}
	 * @api public
	 */

	encryptPassword: function(password) {
		if (!password) return '';
		var encrypted;
		try {
			encrypted = crypto.createHmac('sha1', this.salt).update(password).digest('hex');
			return encrypted;			
		} catch (err) {
			return '';
		};
	}
}

mongoose.model('User', UserSchema);
