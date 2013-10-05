/*ko.bindingHandlers.fadeVisible = {
    init: function(element, valueAccessor) {
        var shouldDisplay = valueAccessor();
        $(element).toggle(shouldDisplay);
    },
    update: function(element, valueAccessor) {
        var shouldDisplay = valueAccessor();
        shouldDisplay ? $(element).fadeIn('slow') : $(element).fadeOut('slow');
    }
};*/

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

//TODO add action buttons custom binding

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
				name: "Select an agent to display", 
				queue:false,
				location:'',
				stInterface:'',
				membership:'',
				lastCall:'',
				status:ko.observable(), //needs to be observable from the start
				statusName:'',
				paused:'',
				taken:'',
				penalty:'',
				caller:'',
				id:'',
				age:''
			});
		}
	}
});

function hideQueue(data, evt) {
	$(evt.currentTarget).siblings().toggle('slow');
	$(evt.currentTarget).parent().not(this).siblings().slideToggle('slow');
};

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

function clearAgentData(data, evt) {
	AppViewModel.selectedAgent({name: "Select an agent to display", queue: false})
}

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

function removeAgent(data) {
	alertify.log(data.name()+' '+data.id()+' '+data.queue());
	var pkg = {
		queue: data.queue(),
		interface: data.location()
	};
	socket.emit('removeAgent', pkg);
};

function spyAgent(data, evt) {
	alertify.log(data.name()+' '+data.id()+' '+data.queue());
	//$('div.modal').omniWindow().trigger('show');
	socket.emit('spyAgent');
};

socket.on('generalMsg', function(msg){
	alertify.log(msg.msg);
});

socket.on('freshData', function(data){
		queueArray.queues = data;
		ko.viewmodel.updateFromModel(AppViewModel, queueArray);
});

ko.applyBindings(AppViewModel);