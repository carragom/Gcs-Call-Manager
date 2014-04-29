/** 	     Greencore Solutions SRL
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
		}

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
			alertify.log('The Call has ended, monitor canceled');
		}
	}
};


//var queueArray = {queues:[{id: 'default', completed:'0', abandoned:'0', holdtime:'0', waiting_calls:'0', agents:[{id:'0', location:''}],age:'0'}]};
var queueArray = {queues:[
		{
			name: "Test", 
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
		}
	]};

/**
 * Connect to the socket.io server
 *
 **/
var socket = io.connect('http://10.42.20.55:3001');


/**
 * Create and expand the KnockOut viewmodel
 *
 * The selectedAgent expansion is for the infoWindow, and the agent.selected expansion is for adding or removing
 * selected class to the View
 *
 **/
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
	$(evt.currentTarget).parent().siblings().not('.emptyAlert').slideToggle('slow');
}

/**
 * When client is mobile instead of the info Window we use a dropdown that we show with this function
 *
 **/
function showDropUl(data, evt) {
	var agentTop = evt.currentTarget;
	var ul = $(agentTop).siblings();		if (ul.is(':visible')) {
		ul.slideUp('slow');
		$('.agentTop').removeClass('selectedAgent');
	} else {
		$(".agentDrop").not(this).slideUp('slow');
		$('.agentTop').not(agentTop).removeClass('selectedAgent');
		$(agentTop).addClass('selectedAgent');
		ul.slideDown('slow');
	}
}

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
	}
}

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
	};
	if (0 === pkg.paused) { //send a one to pause, zero to unPause
		pkg.paused = 1;
	} else {
		pkg.paused = 0;
	}
	socket.emit('pauseAgent', pkg);
}


/**
 * Remove an Agent from the selected Queue
 *
 **/
function removeAgent(data) {
	alertify.log('Request to remove '+data.name()+' '+data.id()+' from queue '+data.queue());
	var pkg = {
		queue: data.queue(),
		interface: data.location()
	};
	socket.emit('removeAgent', pkg);
	clearAgentData(null, null);
}

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
		supervisorId: form.supExtension.value
	};
	$('#spyForm').toggle('slow');
	if (isTalking(AppViewModel.selectedAgent().status())) {
		socket.emit('spyAgent', pkg);
	} else {
		alertify.log('Agent Monitor Canceled, '+AppViewModel.selectedAgent().name+' call ended');
	}
}

/**
 * Toggle visibility on ChanSpy Form 
 *
 **/
function toggleSpyForm(data, evt) {
	$('#spyForm').toggle('slow');
}

/**
 * Apply special style to selected agent and clear all other agentTops
 * 
 * -- If the clicked agent is currently selected, then unselect all
 *
 **/
function markSelectedAgent(data, evt) {
	if ($('.infoContainer').is(':visible')) {
		if (AppViewModel.selectedAgent() != data) {
			var clickedElement = $(evt.currentTarget);
			$('.agentTop').not(clickedElement).removeClass('selectedAgent');
			$(clickedElement).addClass('selectedAgent');
			AppViewModel.selectedAgent(data);
		} else {
			clearAgentData();
		}
	} else {
		showDropUl(data, evt);
	}
}

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
}


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
	}
});

socket.on('newAgent', function(data) {
	alertify.log('Agent '+data.name+' added to queue '+data.queue);
});

ko.applyBindings(AppViewModel);
