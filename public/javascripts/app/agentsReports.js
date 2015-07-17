'use strict';

/*var calls = {statCalls:[
	{calls: [], length:'0', name:''},
	{calls: [], length:'0', name:''}
	]};*/
var calls = {users: []};

var queueViewModel = ko.viewmodel.fromModel(calls, {
	extend: {
		'{root}': function(root) {
			root.selectedStat =  ko.observable({
				calls: ko.observableArray(),
				length: '',
				name: ''
			});
		}
	}
});

/**
 * Connect to the socket.io server
 *
 **/
var socket = io.connect('/');

function agentReport() {
	var exten = $('#agentReport').val();	
	socket.emit('agentReport', exten);
}

agentReport();

socket.on('agentReport', function(data){
	alertify.log('agentReport');
	calls.users = data;
	ko.viewmodel.updateFromModel(queueViewModel, calls);
});

function markSelectedStat(data, evt) {
	var stat = evt.currentTarget;
	if (queueViewModel.selectedStat() !== data) {
		var siblings = $(stat).siblings();
		$(siblings).removeClass('selectedAgent');
		$(stat).addClass('selectedAgent');
		queueViewModel.selectedStat(data);
	} else {
		$(stat).removeClass('selectedAgent');
		clearSelectedStat();
	}	
}

function clearSelectedStat() {
	queueViewModel.selectedStat({
		calls: ko.observableArray(),
		length: '',
		name: ''
	});
	queueViewModel.selectedStat().calls.removeAll();
}

ko.applyBindings(queueViewModel);