'use strict';


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

// socket.on('connect', function(){
//     var delivery = new Delivery(socket);
 
//     delivery.on('delivery.connect',function(delivery){
// 		$("#uploadSpan").click(function(evt){
// 			var file0 = $("input[type=file]").val();
// 			var file = $("input[type=file]")[0].files[0];
// 			delivery.send(file);
// 			evt.preventDefault();
// 		});
//     });
// });

/*$(document).ready(function() {

    // The event listener for the file upload
    document.getElementById('fileUpload').addEventListener('change', upload, false);

    // Method that checks that the browser supports the HTML5 File API
    function browserSupportFileUpload() {
        var isCompatible = false;
        if (window.File && window.FileReader && window.FileList && window.Blob) {
        isCompatible = true;
        }
        return isCompatible;
    }

    // Method that reads and processes the selected file
    function upload(evt) {
    if (!browserSupportFileUpload()) {
        alert('The File APIs are not fully supported in this browser!');
        } else {
            var data = null;
            var file = evt.target.files[0];
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function(event) {
                var csvData = event.target.result;
                data = $.csv.toArrays(csvData);
                if (data && data.length > 0) {
                  alert('Imported -' + data.length + '- rows successfully!');
                } else {
                    alert('No data to import!');
                }
            };
            reader.onerror = function() {
                alert('Unable to read ' + file.fileName);
            };
        }
    }
)};*/



function read(){
	var file    = document.querySelector('input[type=file]').files[0];
	var reader = new FileReader();
    reader.onload = function(){
		var text = reader.result;
		var split = text.split('\n');
		socket.emit( 'csv', {arrayData: split});
    };
    reader.readAsText(file);
}
