/*global $:false */
/*global ko:false */
/*global alertify:false */

'use strict';

/*var queueArray = {queues:[
	{id: 'default2', completed:'0', abandoned:'0', holdtime:'0', waiting_calls:'0', agents:[
		{id:'0',name: 'fede', location:'', status: 1, paused: 0, statusName:'', caller:'', lastCall:'', taken:'', queue:'default2'},
		{id:'1',name: 'Conde de Romanones Calientes', location:'', status: 1, paused: 1, statusName:'', caller:'', lastCall:'', taken:'', queue:'default2'}]
		,age:'0'},
	{id: 'default3', completed:'0', abandoned:'0', holdtime:'0', waiting_calls:'0', agents:[
		{id:'0',name: 'fede', location:'', status: 1, paused: 1, statusName:'', caller:'', lastCall:'', taken:'', queue:'default3'}]
		,age:'0'}
	]};*/
var queueArray = {queues:[]};

var queueViewModel = ko.viewmodel.fromModel(queueArray, {
	arrayChildId: {
		'{root}.queues':'id',
		'{root}.queues[i].agents': 'id'
	},
	extend: {
		'{root}': function(root) {
			root.selectedQueue = ko.observable({
				queue:false,
				id: '',
				completed: '',
				abandoned: '',
				holdtime: '',
				waiting_calls: '',
				abandonedCalls: ko.observableArray()
			});
			root.selectedStat =  ko.observableArray();
		}
	}
});

/**
 * Connect to the socket.io server
 *
 **/
var socket = io.connect('/');

socket.emit('queueReport');

socket.on('queueReport', function(data){
	alertify.log('queueReport');
	queueArray.queues = data;
	ko.viewmodel.updateFromModel(queueViewModel, queueArray);
});

function markSelectedQueue(data, evt) {
	var parent = $(evt.currentTarget).parent();
	if (queueViewModel.selectedQueue() !== data) {
		var siblings = $(parent).siblings();
		$(siblings).removeClass('active');
		$(parent).addClass('active');
		queueViewModel.selectedQueue(data);
	} else {
		$(parent).removeClass('active');
		clearSelectedQueue();
	}	
}

function clearSelectedQueue() {
	queueViewModel.selectedQueue({
		queue:false,
		id: '',
		completed: '',
		abandoned: '',
		holdtime: '',
		waiting_calls: '',
		abandonedCalls: ko.observableArray()
	});
}


function markSelectedStat(data, evt) {
	var stat = evt.currentTarget;
	if (queueViewModel.selectedStat() !== data) {
		$(stat).removeClass('selectedAgent');
		$(stat).addClass('selectedAgent');
		queueViewModel.selectedStat(data.abandonedCalls);
	} else {
		$(stat).removeClass('selectedAgent');
		clearSelectedStat();
	}	
}

function clearSelectedStat() {
	queueViewModel.selectedStat();
}

ko.applyBindings(queueViewModel);