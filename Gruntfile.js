/*
 * Copyright (c) 2015, Yahoo Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    execute: {
      cssparser: {
        options: {
          args: ['src/css-parser.21.attr.partial.y', 'src/css.21.l', '--outfile', 'src/css-parser.js']
        },
        src: ['node_modules/jison/lib/cli.js']
      },
    },
    jshint: {
      files: [ 'src/css-util.js', 
               'src/handlebars-utils.js', 
               'src/polyfill.js', 
               'src/secure-handlebars.js', 
               'src/strict-context-parser.js' ],
      options: {
        scripturl: true,
        camelcase: true
      }
    },
    browserify: {
      standalone: {
        src: 'src/<%= pkg.name %>.js',
        dest: 'dist/<%= pkg.name %>.js',
        options: {
          browserifyOptions: {
            standalone: 'Handlebars'
          }
        }
      },
    },
    uglify: {
      options: {
        banner: ['/**',
            ' * <%= pkg.name %> - v<%= pkg.version %>',
            ' * Bundling context-parser and xss-filters',
            ' * Yahoo! Inc. Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.',
            ' *',
            ' * Bundling handlebars v3.0.2',
            ' * Copyright (C) 2011-2014 by Yehuda Katz',
            ' * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
            ' */', ''].join('\n'),
        compress: {
          join_vars: true
        }
      },
      buildMin: {
        src: ['src/polyfill.js', 'dist/<%= pkg.name %>.js'],
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    karma: {
      integrationtest: {
        options: {
          configFile: 'karma.conf.js',
          files: [
            'node_modules/chai/chai.js',
            'dist/<%= pkg.name %>.js',
            'tests/integration/*.js'
          ]
        }
      },
      integrationtestUsingMinVersion: {
        options: {
          configFile: 'karma.conf.js',
          files: [
            'node_modules/chai/chai.js',
            'dist/<%= pkg.name %>.min.js',
            'tests/integration/*.js'
          ]
        }
      }
    },
    mocha_istanbul: {
      target: {
        src: 'tests/unit',
        options: {
          coverage:true,
          check: {
            lines: 80,
            statements: 80
          }
        }
      }
    },
    clean: {
      all: ['xunit.xml', 'artifacts', 'coverage', 'tests/samples/files/*.precompiled', 'tests/samples/files/*.js', 'node_modules'],
      buildResidues: ['xunit.xml', 'artifacts', 'coverage', 'tests/samples/files/*.precompiled', 'tests/samples/files/*.js']
    }
  });

  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-mocha-istanbul');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-execute');

  grunt.registerTask('test', ['clean:buildResidues', 'jshint', 'execute', 'dist', 'karma', 'mocha_istanbul']);
  grunt.registerTask('dist', ['browserify', 'uglify']);
  grunt.registerTask('default', ['test']);

};
