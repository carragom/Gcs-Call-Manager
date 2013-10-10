/** 	Greencore Solutions SRL
 * Client side script for Greencore's Queue Manager
 *
 * Uses knockout.js, knockout viewmodel plugin, alertify
 *
 **/


/**
 * Animates transitions
 *
 **/
ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
        var shouldDisplay = valueAccessor();
        shouldDisplay ? $(element).fadeIn('slow') : $(element).hide();
    },
    update: function(element, valueAccessor) {
        var shouldDisplay = valueAccessor();
        shouldDisplay ? $(element).fadeIn('slow') : $(element).fadeOut();
    }
};

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
		};

		var iconStack = '<span class="icon-stack" title:"Status"><i class="'+iconMain+'"></i><i class="'+iconCircle+' icon-stack-base"></i></span>';
		$(element).html(iconStack);
	}
};

/**
 * If status changes to a non talking state, cancel Spy attempt
 *
 **/
ko.bindingHandlers.checkStatusForSpy = {
	update: function(element, valueAccessor) {
		if (!isTalking(valueAccessor()) && $(element).is(":visible")) {
			$(element).fadeOut('200');
			alertify.log('The Call has ended, monitor canceled')
		};
	}
};


//var queueArray = {queues:[{id: 'default', completed:'0', abandoned:'0', holdtime:'0', waiting_calls:'0', agents:[{id:'0', location:''}],age:'0'}]};
var queueArray = {queues:[]};

var socket = io.connect('http://10.42.20.55:3001');

var AppViewModel = ko.viewmodel.fromModel(queueArray, {
	arrayChildId: {
		"{root}.queues":"id",
		"{root}.queues[i].agents": "id"
	},
	extend: {
		"{root}": function(root) {
			root.selectedAgent = ko.observable({
				name: "Select an agent", 
				queue:false,
				location:'',
				stInterface:'',
				membership:'',
				lastCall:'',
				status:ko.observable(), //needs to be observable from the start
				statusName:'',
				paused:ko.observable(),
				taken:'',
				penalty:'',
				caller:'',
				id:'',
				age:''
			});			
		},

		"{root}.queues[i].agents[i]": function(agent) {
			agent.selected = ko.observable(false);
		}
	}
});

/**
 * Hide Queue div
 *
 **/
function hideQueue(data, evt) {
	$(evt.currentTarget).siblings().toggle('slow');
	$(evt.currentTarget).parent().not(this).siblings().slideToggle('slow');
};

/** showDropUl and displayAgentData might not be needed anymore
	function showDropUl(data, evt) {
		var ul = $(evt.currentTarget).siblings(); //TODO revisar que esto funcione
		if (ul.is(':visible')) {
			ul.slideToggle('slow');
		} else {
			$(".agentDrop").not(this).slideUp('slow');
			ul.slideDown('slow');
		};
	};

	function displayAgentData(data, evt) {
		console.log(data.id());
		queueArray.selectedAgent('Nueva Paja');
		console.log(queueArray.selectedAgent);
		ko.viewmodel.updateFromModel(AppViewModel, queueArray)
	};
**/

/**
 * Fade Out the selected agent and then reset the selectedAgent observable
 *
 **/
function clearAgentData(data, evt) {
	$('#infoAgentData').fadeOut('400', function(){		
		AppViewModel.selectedAgent({name: "Select an agent",
			queue: false,
			location:'',
			stInterface:'',
			membership:'',
			lastCall:'',
			status:ko.observable(), //needs to be observable from the start
			statusName:'',
			paused:ko.observable(),
			taken:'',
			penalty:'',
			caller:'',
			id:'',
			age:''
		});
	});
	$('.agentTop').removeClass('selectedAgent');
};

/**
 * Check if agent is in any mode that allows chanSpy
 *
 **/
function isTalking(data) {
	switch (data) {
		case '2':
		case '7':
		case '8':
			return true;
		default:
			return false;
	};
};

/**
 * Pause an Agent in the selected Queue
 *
 **/
function pauseAgent(data) {
	var pkg = {
		id: data.id(),
		queue: data.queue(),
		interface: data.location(),
		paused: data.paused()
	}
	if (0 == pkg.paused) { //send a one to pause, zero to unPause
		pkg.paused = 1;
	} else {
		pkg.paused = 0;
	};
	socket.emit('pauseAgent', pkg);
};


/**
 * Remove an Agent from the selected Queue
 *
 **/
function removeAgent(data) {
	alertify.log(data.name()+' '+data.id()+' '+data.queue());
	var pkg = {
		queue: data.queue(),
		interface: data.location()
	};
	socket.emit('removeAgent', pkg);
	clearAgentData(null, null);
};

/**
 * Originate a ChanSpy channel to monitor the selected agent
 *
 * The agent must be in a state that allows it and needs an 
 * extension number to send the monitoring channel
 *
 **/
function spyAgent(form) {
	console.log('Inputted extension: '+form.supExtension.value);
	console.log('create chanspy with: '+AppViewModel.selectedAgent().location()+' and Local/'+form.supExtension.value);
	var pkg = {
		agentId: AppViewModel.selectedAgent().stInterface(),
		supervisorId: "SIP/"+form.supExtension.value
	};
	$('#spyForm').toggle('slow');
	if (isTalking(AppViewModel.selectedAgent().status())) {
		socket.emit('spyAgent', pkg);
	} else {
		alertify.log('Agent Monitor Canceled, '+AppViewModel.selectedAgent().name+' call ended');
	}
};

/**
 * Toggle visibility on ChanSpy Form 
 *
 **/
function toggleSpyForm(data, evt) {
	$('#spyForm').toggle('slow');
};

function amISelected(data, evt) {
	if (AppViewModel.selectedAgent() == data) {
		alertify.log(data.name+' está seleccionado');
		return true;
	} else {
		return false;
	}
};

function markSelectedItem(data, evt) {
	//data.selected(!data.selected());	
	if (AppViewModel.selectedAgent() != data) {
		var clickedElement = $('evt.currentTarget');
		$('.agentTop').not(evt.currentTarget).removeClass('selectedAgent');
		$(evt.currentTarget).addClass('selectedAgent');
		AppViewModel.selectedAgent(data);
	};	
};

socket.on('generalMsg', function(msg){
	alertify.log(msg.msg);
});

socket.on('freshData', function(data){
	queueArray.queues = data;
	ko.viewmodel.updateFromModel(AppViewModel, queueArray);
});

socket.on('agentRemoved', function(data){
	alertify.log('Agent '+data.name+' removed from queue '+data.queue);
	if ((AppViewModel.selectedAgent().id() == data.id) && (AppViewModel.selectedAgent().queue() == data.queue)) {
		clearAgentData(null, null);
	};
});


ko.applyBindings(AppViewModel);