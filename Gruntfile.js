/*
 * Copyright (c) 2015, Yahoo Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    exec: {
      cssparser: {
        command: './node_modules/jison/lib/cli.js src/css-parser/css-parser.strict.attr.partial.y src/css-parser/css.strict.l --outfile src/css-parser/css-parser.js'
      },
    },
    jshint: {
      files: [ 'src/*.js' ],
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
            ' * Bundling handlebars v3.0.3',
            ' * Copyright (C) 2011-2014 by Yehuda Katz',
            ' * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',
            ' */', ''].join('\n'),
        compress: {
          join_vars: true
        }
      },
      buildMin: {
        src: ['src/polyfills/*.js', 'dist/<%= pkg.name %>.js'],
        dest: 'dist/<%= pkg.name %>.min.js'
      },
      buildMinWithVersion: {
        src: ['src/polyfills/*.js', 'dist/<%= pkg.name %>.js'],
        dest: 'dist/<%= pkg.name %>.<%= pkg.version %>.min.js'
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
          excludes: [
            'src/css-parser/css-parser.js',
            'src/polyfills/browser.js',
            'src/polyfills/minimal.js'
          ],
          coverage: true,
          check: {
            lines: 80,
            statements: 80 
          }
        }
      }
    },
    bump: {
      options: {
        files: [ 'package.json', 'bower.json'],
        updateConfigs: ['pkg'],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json', 'bower.json', 'dist/.'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: false,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
        prereleaseName: false,
        regExp: false
      }
    },
    clean: {
      all: ['artifacts', 'coverage', 'node_modules'],
      buildResidues: ['artifacts', 'coverage']
    }
  });

  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-mocha-istanbul');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-bump');

  grunt.registerTask('test', ['clean:buildResidues', 'jshint', 'exec', 'dist', 'karma', 'mocha_istanbul']);
  grunt.registerTask('dist', ['browserify', 'uglify']);
  grunt.registerTask('default', ['test']);
  grunt.registerTask('release', ['bump-only', 'dist'])

};