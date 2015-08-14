'use strict';

/*$('#dateFrom').datepick({dateFormat: 'yyyy-mm-dd'});//'dd-mm-yyyy'
$('#dateUntil').datepick({dateFormat: 'yyyy-mm-dd'});//'dd-mm-yyyy'*/

jQuery('#dateFrom').datetimepicker();
jQuery('#dateUntil').datetimepicker();

var campaigns = {directory:[]}

var campaignsViewModel = ko.viewmodel.fromModel(campaigns);

ko.applyBindings(campaignsViewModel);

$(document).on('change', '.btn-file :file', function() {
  var input = $(this),
      numFiles = input.get(0).files ? input.get(0).files.length : 1,
      label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
  input.trigger('fileselect', [numFiles, label]);
});

$(document).ready( function() {
    $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
        
        var input = $(this).parents('.input-group').find(':text'),
            log = numFiles > 1 ? numFiles + ' files selected' : label;
        
        if( input.length ) {
            input.val(log);
        } else {
            if( log ) alert(log);
        }
        
    });
});

var socket = io.connect('/');


function read(){
	var file    = document.querySelector('input[type=file]').files[0];
    if(file){
    	var reader = new FileReader();
        reader.onload = function(){
    		var text = reader.result;
    		var split = text.split('\n');
            var dateStart = $('#dateFrom').val(),
                dateFinish = $('#dateUntil').val(),
                queues = $('#queues').val();
            if(dateStart != '' && dateFinish != '' && queues != ''){
                socket.emit( 'csv', {dateStart: dateStart, dateFinish: dateFinish, queues: queues, phones: split});
                $('#dateFrom').val('');
                $('#dateUntil').val('');
                $('#queues').val('');
                $('#fileUpload').val('');
                $('.input-browse').val('');
            } else {
                alertify.error('Fill all the blanks');
            }
        };
        reader.readAsText(file);
    } else {
        alertify.error('Selected a file');
    }
}