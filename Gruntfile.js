var path = require('path');

module.exports = function  (grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		express: {
			options: {
				port: 3001,
				server: 'app.js',
				serverreload: true
			},
			server: {
				options: {
					script: 'app.js',
					debug: true
				}
			},
			livereload: {
                options: {
                    port: 9000,
                    debug: true,
                }
            }
		},
		watch: {
			css: {
				files: '**/*.css',
				options: {
					livereload: true
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-express');
	grunt.registerTask('default', ['express', 'express-keepalive']);

}