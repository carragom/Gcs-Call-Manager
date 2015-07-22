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

socket.on('freshData', function(data){
	alertify.log('freshData');
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


/**
 * Returns an html string with the appropiate icon stack
 *
 * Recieves the state id and returns the icon stack for that state
 *
 **/
ko.bindingHandlers.statusIcon = {
	update: function(element, valueAccessor) {
		var iconMain ='';
		var iconCircle = 'icon-circle-blank';
		var status = valueAccessor();

		switch (status) {
			case '1':
				iconMain = 'icon-phone';
				break;
			case '2':
				iconMain = 'icon-comments-alt';
				break;
			case '3':
				iconMain = 'icon-minus-sign-alt';
				break;
			case '4':
				iconMain = 'icon-asterisk';
				break;
			case '5':
				iconMain = 'icon-phone';
				iconCircle = 'icon-ban-circle';
				break;
			case '6':
				iconMain = 'icon-bell';
				break;
			case '7':
				iconMain = 'icon-bell-alt';
				break;
			case '8':
				iconMain = 'icon-music';
				break;
			default:
				iconMain = 'icon-asterisk';
		}

		var iconStack = '<span class="icon-stack" title:"Status"><i class="'+iconMain+'"></i><i class="'+iconCircle+' icon-stack-base"></i></span>';
		$(element).html(iconStack);
	}
};


/**
 * Pause an Agent in the selected Queue
 *
 **/
/* exported pauseAgent */ //needed for JsHint
function pauseAgent(data) {
	var pkg = {
		id: data.id(),
		queue: data.queue(),
		interface: data.location(),
		paused: data.paused(),
		origin: 2
	};
	console.log(pkg.paused);
	if ('0' === pkg.paused) { //send a one to pause, zero to unPause
		pkg.paused = 1;
		alertify.log('Request to Pause '+data.name()+ ' in queue '+data.queue());
	} else {
		alertify.log('Request to Resume '+data.name()+ ' in queue '+data.queue());
		pkg.paused = 0;
	}
	socket.emit('pauseAgent', pkg);
}


/**
 * Remove an Agent from the selected Queue
 *
 **/
/* exported removeAgent */ //needed for JsHint
function removeAgent(data) {
	alertify.log('Request to remove '+data.name()+' '+data.id()+' from queue '+data.queue());
	var pkg = {
		id: data.id(),
		queue: data.queue(),
		interface: data.location(),
		origin: 2
	};
	socket.emit('removeAgent', pkg);
	clearAgentData(null, null);
}

ko.applyBindings(queueViewModel);