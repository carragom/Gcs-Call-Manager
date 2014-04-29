
function parseForm (form) {
	var obj = {};
	var formArray = $(form).serializeArray()
	$.each(formArray, function(index, input) {
		obj[input.name] = input.value
	})
	;
	return obj
}

function autoUsername (source, dst) {
	var source = $(source),
		dst = $(dst);

	if (!dst.val()) {
		var value = source.val();
		dst.val(value);
	}
}

var userViewModel = userViewModel = ko.viewmodel.fromModel({users: []}, {
	arrayChildId: {
		"{root}.users": "id"
	},
	extend: {
		'{root}': function(root) {
				root.selectedUser = ko.observable({
					id: false,
					name: '',
					username: '',
					email: '',
					password: '',
					role: '0',
				});
		}
	}
});

function getUserList() {
	$.get('/api/users', function(data) {
		ko.viewmodel.updateFromModel(userViewModel, {users: data});
	});
}

getUserList();

function markSelectedUser(data, evt) {
	if (userViewModel.selectedUser() != data) {
		if (!data.password) {
			data.password = null;
		}
		userViewModel.selectedUser(data);
	} else {
		clearSelectedUser();
	}
}

function isSelected(data) {
	if (userViewModel.selectedUser().id == data.id) {
		return 'isSelected'
	}
}

function clearSelectedUser(newId) {
	newId = newId == 'new' ? newId : false
	userViewModel.selectedUser({
		id: newId,
		name: '',
		username: '',
		email: '',
		password: '',
		role: '0'
	})
}

function newUser () {
	if ('new' !== userViewModel.selectedUser().id) {
		clearSelectedUser('new');
	}
}

function saveUser() {
	var userData = ko.toJS(userViewModel.selectedUser);
	if ('new' === userData.id) {
		delete userData.id
		$.post('/api/users', userData, function(msg) {
			if (1 === msg.ok) {
				alertify.log('User created succesfully');
				getUserList();
				clearSelectedUser();				
			}
			console.log(msg);
		})
	} else {
		$.ajax({
			type: 'PUT',
			url: '/api/users',
			data: JSON.stringify(userData),
			contentType: 'application/json'
		}).error(function(obj) {
			console.log(obj.responseJSON);
		}).done(function(msg) {
			if (1 === msg.ok) {
				getUserList();
				clearSelectedUser();
			}
			console.log(msg);
		});
	}
}

function deleteUser() {
	var userData = ko.toJS(userViewModel.selectedUser);
	if ((false !== userData.id) && ('new' !== userData.id)) {
		$.ajax({
			type: 'DELETE',
			url: 'api/users',
			data: JSON.stringify(userData),
			contentType: 'application/json'
		}).error(function(obj) {
			console.log(obj.responseJSON);
		}).done(function(msg) {
			if (1 === msg.ok) {
				getUserList();
				clearSelectedUser();
			}
			console.log(msg);
		});
	}
}

ko.applyBindings(userViewModel);