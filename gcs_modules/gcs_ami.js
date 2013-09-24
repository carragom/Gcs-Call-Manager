/*	
	Greencore Solutions SRL
		Node module to send and get information from the asterisk communications framework
		Require asterisk-ami module from http://travis-ci.org/holidayextras/node-asterisk-ami
*/

var AsteriskAmi = require('asterisk-ami'); //required for AMI communication
var events      = require('events'); // required	for Event Emitting
var sys         = require('sys'); // In order of expanding event emitter we need sys helper "inherit"
var moment = require('moment'); //Format dates to human readable

//Session setup
//var ami = null;
var ami = new AsteriskAmi({ 
	host: '10.42.20.20',
	username: 'dev',
	password: 'phos7oH6',
	reconnect: true,
	reconnect_after: '1500'
});

var queueArray = [new makeQueue('default',0,0,0,0,[])];

function makeQueue (id, completed, abandoned, holdtime, waiting_calls) {
  this.id            = id; //Queue Number
  this.completed     = completed; //Completed Calls
  this.abandoned     = abandoned; //Abandoned Calls
  this.holdtime      = holdtime; //Hold time
  this.waiting_calls = waiting_calls; //Calls on hold
  this.agents        = new Array; //An array of members
  this.age           = 0; //If age > 0 then is not in asterisk anymore
};

function makeAgent (queue, name, location, stInterface, membership, lastcall, status, paused, taken, penalty ) {
  this.name        = name; //Agent Name
  this.queue       = queue; //Queue
  this.location    = location; //Agent extension
  this.stInterface = stInterface;
  this.membership  = membership; //Membership type (static for manually added by admin, dynamic for just that :)
  this.lastCall    = utimeToDate(lastcall); //Last call in ?? format
  this.status      = status;
  this.statusName  = getStatusByName(status); //Agent Status
  this.paused      = paused; //Is Agent Paused?
  this.taken       = taken; //Calls Taken
  this.penalty     = penalty; //Agent penalty
  this.caller      = 'nobody';
  this.id          = location.replace(/Local\//,'').replace(/@from-queue\/n/,''); //clean up for ID
  this.age         = 0; //If age > 0 then is no longer in queue
};

function utimeToDate(utime) { //Insert asterisk epoch into a JS Date object
  var date = moment(utime*1000);
  if (2010 > date.year()) {
    return 'never';
  }
	return date.fromNow();
};

function getStatusByName(status) { //Return the status description from the code
  switch (status) {
    case '1':
      return "Available";
      break;
    case '2':
      return "In use";
      break;
    case '3':
      return "Busy";
      break;
    case '4':
      return "Invalid";
      break; 
    case '5':
      return "Not Available";
      break;
    case '6':
      return "Ringing";
      break;
    case '7':
      return "In use and Ringing";
      break;
    case '8':
      return "On Hold";
      break;
    default:
      return "Unknown";
  };
};

function queueGarbageCollector(controller) { //The garbage Collector looks for old agents and queues that don't exist in the fresh data
  for (var i = 1; i < queueArray.length; i++) {
    if (0 != queueArray[i].age) {
      delQueueMsg = {
        order: 'deleteQueue',
        queue: queueArray[i].id
      };
      //controller.send({message: delQueueMsg});
      queueArray.splice(i, 1);
    } else {
      for (var j = 0; j < queueArray[i].agents.length; j++) {
        if (0 != queueArray[i].agents[j].age) {
          delAgentMsg = {
            order: 'deleteAgent',
            queue: queueArray[i].id,
            agent: queueArray[i].agents[j].id,
            name:  queueArray[i].agents[j].name
          };
          //controller.send({message: delAgentMsg});
          queueArray[i].agents.splice(j, 1);
        };
      };
    };
  };
};

function incAge() { //Everyone get's older for the garbage collector 
  for (var i = 1; i < queueArray.length; i++) {
    queueArray[i].age++;
    for (var j = 0; j < queueArray[i].agents.length; j++) {
      queueArray[i].agents[j].age++;
    };
  };
};

function isQueueInArray (id) { //Returns the index if the queue id string is in the array
  for (var i = 0; i < queueArray.length; i++) { 
    if (id == queueArray[i]["id"]) {
      return i;
    };
  };
  return -1;
};

function isAgentInQueue (id, arr) { //Returns the index if the agent exists in the queue agents array
  for (var i = 0; i < arr.length; i++) {
    if (id == arr[i]["id"]) {
      return i;
    };
  };
  return -1;
};

updateQueue = function (datos) {
  tmpQueue = new makeQueue (datos.queue, datos.completed, datos.abandoned, datos.holdtime, datos.calls); //format the raw data
  var ind = isQueueInArray(tmpQueue.id);
  if (-1 != ind) {
    //Queue exists, just Update the Values
    queueArray[ind].completed     = tmpQueue.completed;
    queueArray[ind].abandoned     = tmpQueue.abandoned;
    queueArray[ind].holdtime      = tmpQueue.holdtime;
    queueArray[ind].waiting_calls = tmpQueue.waiting_calls;
    queueArray[ind].age           = 0; //Age is back to 0 to keep it safe from the garbage collector
  } else {
    queueArray.push(tmpQueue);
  };
};

updateAgent = function (datos, cola) {
  //update agent
  var qInd = isQueueInArray(cola);
  if (-1 == qInd) {
    console.log("Alert, Agent found from non existent Queue "+ qInd);
    return -1;
  } else {
    var tmpAgent = new makeAgent (datos.queue, datos.name, datos.location, datos.stateinterface, datos.membership, datos.lastcall, datos.status, datos.paused, datos.callstaken, datos.penalty);
    var aInd = isAgentInQueue(tmpAgent.id, queueArray[qInd].agents);
    if (-1 != aInd) {
      if (tmpAgent.status != queueArray[qInd].agents[aInd].status) {
        //gcsAmi.send({action: 'gcs_getCallers'});
      };
      // else { 
        switch (datos.status) { //If the agent is still talking keep the caller id data
          case '2':
          case '7':
          case '8':
            tmpAgent.caller = queueArray[qInd].agents[aInd].caller
        };
      //};
      queueArray[qInd].agents[aInd] = tmpAgent;
    } else {
      queueArray[qInd].agents.push(tmpAgent);
    };
    queueArray[qInd].agents.sort(function(a,b) { //Sort the Array by Extension Number
      return ((a.id < b.id) ? -1: (a.id > b.id) ? 1: 0);
    });
  };
};

function removeAgent(agent, cola) {
  var qInd = isQueueInArray(cola);
  if (-1 == qInd) {
    console.log("Alert, Refered queue doesn't exist");
    return -1;
  } else {
    var aInd = isAgentInQueue(agent.id, queueArray[qInd].agents);
    if (-1 != aInd) {
      queueArray[qInd].agents[aInd].age = 2;
    } else {
      console.log('Agent not found: '+agent.location+'in queue '+cola);
    };
  };
};





//******************************************************************************

function gcs_ami() {
	if (false === this instanceof gcs_ami) {
		return new gcs_ami;
	}
	events.EventEmitter.call(this);
};

sys.inherits(gcs_ami, events.EventEmitter);
 
gcs_ami.prototype.connect = function () {
	var self = this;

	ami.connect(function(){
		setInterval(function (){
			incAge();
			ami.send({action: 'QueueStatus'});
			//ami.send({action: 'CoreShowChannels'});
		}, 1000);
	});

	ami.on('ami_socket_error', function(){
		self.emit('error', "Socket error");
	});
	ami.on('ami_socket_timeout',function(){
		self.emit('error', "Timeout error");
	});

	ami.on('ami_data', function (ami_datos) {
		//console.log('AMI DATA', ami_datos.event);
		switch (ami_datos.event) {
			case 'CoreShowChannel':
				self.emit('gcs_talking', ami_datos);
				break;
      case 'QueueParams':
        updateQueue(ami_datos);
        break;

      case 'QueueMember':
        updateAgent(ami_datos, ami_datos.queue);
        break;

      case 'QueueStatusComplete':
        statusMsg = {
          order: 'qStatusFresh',
          data: queueArray
        }
        self.emit('freshData', queueArray);
        queueGarbageCollector();
        break;

      case 'QueueMemberAdded':
      /*In this case we just tell the frontend who's new for a nice popup, the interval code will 
        handle the insertion of the member in the data structures

        TODO, see if this is correct
      */
        //updateAgent(ami_datos, ami_datos.queue);
        var addAgentMsg = {
          order: 'addAgent',
          name: ami_datos.membername,
          queue: ami_datos.queue
        };
        self.emit('newAgent', addAgentMsg)
        break;

      case 'QueueMemberRemoved':
        removeAgent(ami_datos, ami_datos.queue);
        queueGarbageCollector();
        break; 

      case 'QueueMemberPaused':
        var pausedAgentMsg = {
          order: 'pausedAgent',
          name: ami_datos.membername,
          queue: ami_datos.queue,
          paused: ami_datos.paused
        };
        self.emit('agentPaused', pausedAgentMsg);

			default:
				self.emit('gcs_ami_data', ami_datos);	
		};
		
	});


};

gcs_ami.prototype.send = function (req) {
	//Check if req.action is valid and allowed
	if ('gcs_getCallers' == req.action) {
		ami.send({action: 'CoreShowChannels'})
		console.log('get callers');
	} else {
		ami.send(req);
	};
};

process.on('SIGINT', function() { //Clean Logout when node process shuts down
        ami.disconnect();
        console.log('AMI disconnect');
        process.exit(0);
});

module.exports = gcs_ami;