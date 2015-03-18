/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    require("mocha");
    var promise = require('bluebird'),
        fs = require('fs'),
        utils = require("../utils.js"),
        expect = require('chai').expect,
        ContextParserHandlebars = require("../../src/context-parser-handlebars");

    var NO_OF_TEMPLATE = 24,
        NO_OF_FILTER_TEMPLATE = 20;

    var config = {};
    config.printCharEnable = false;

    describe("Handlebars PreCompiler Test Suite", function() {

        // basic test
        it("Running ./bin/handlebarspc test", function(done) {
            var exec = promise.promisify(require("child_process").exec)
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_000.hbs')
            .timeout(1000)
            .then(function(streams){
                expect(streams[0]).to.match(/{{yd name}}/);
            })
            .then(done);
        });

        /* generate the template files */
        var genPrecompiledTemplateFiles = function(id) {
            it("ContextParserHandlebars#contextualize template " + id + " test", function() {
                var file = './tests/samples/files/handlebarsjs_template_'+id+'.hbs';
                var data = fs.readFileSync(file, 'utf-8');
                var parser = new ContextParserHandlebars(config);
                try {
                    parser.contextualize(data);
                    var output = parser.getOutput();
                    fs.writeFileSync("./tests/samples/files/handlebarsjs_template_"+id+".hbs.precompiled", output, {flag:'w'});
                } catch (err) {
                    console.log(err)
                    // it is ok to have exception error for file generation.
                }
            });
        };
        for(var i=0;i<=NO_OF_TEMPLATE;++i) {
            id = utils.append_zero(i);
            genPrecompiledTemplateFiles(id);
        }

        /* generate the filter files */
        var genPrecompiledFilterFiles = function(id) {
            it("ContextParserHandlebars#contextualize filter " + id + " test", function() {
                var file = './tests/samples/files/handlebarsjs_filter_'+id+'.hbs';
                var data = fs.readFileSync(file, 'utf-8');
                var parser = new ContextParserHandlebars(config);
                try {
                    parser.contextualize(data);
                    var output = parser.getOutput();
                    fs.writeFileSync("./tests/samples/files/handlebarsjs_filter_"+id+".hbs.precompiled", output, {flag:'w'});
                } catch (err) {
                    console.log(err)                    
                    // it is ok to have exception error for file generation.
                }
            });
        };
        for(var i=0;i<=NO_OF_FILTER_TEMPLATE;++i) {
            id = utils.append_zero(i);
            genPrecompiledFilterFiles(id);
        }

        /* more throwing exception tests */
        [
            {
                title: './bin/handlebarspc broken conditional {{#if}} without {{/if}} template test',
                file: './tests/samples/files/handlebarsjs_template_017.hbs',
            },
            {
                title: './bin/handlebarspc branching logic startName/endName mismatch template test',
                file: './tests/samples/files/handlebarsjs_template_018.hbs',
            },
            {
                title: './bin/handlebarspc broken conditional {{#if}} without {{#if}} template test',
                file: './tests/samples/files/handlebarsjs_template_019.hbs',
            },
            {
                title: './bin/handlebarspc invalid {{expression}} template test',
                file: './tests/samples/files/handlebarsjs_template_021.hbs',
            },
            {
                title: './bin/handlebarspc invalid {{{expression}}} template test',
                file: './tests/samples/files/handlebarsjs_template_022.hbs',
            },
            {
                title: './bin/handlebarspc invalid raw block startName/endName mismatch template test',
                file: './tests/samples/files/handlebarsjs_template_024.hbs',
            },
            {
                title: '/bin/handlebarspc html5 inconsistent state (42/34) test',
                file: './tests/samples/bugs/003.html5.inconsitent.hb',
            },
            /* remove this test as we don't test for tagNameIdx in deepCompare
            {
                title: 'state (missing close tag) in branching template test',
                file: './tests/samples/bugs/006.state.missing-close-tag.hb',
            },
            */
        ].forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspc '+testObj.file)
                .timeout(300)
                .catch(function(e){
                    done();
                });
            });
        });

        /* reported bug tests */
        [
            {
                title: './bin/handlebarspc line no and char no reporting test',
                file: './tests/samples/bugs/005.line.report.hb',
                result: [ /lineNo:2,charNo:38/, /lineNo:4,charNo:91/, /lineNo:8,charNo:177/, /lineNo:10,charNo:274/, /lineNo:12,charNo:298/ ],
            },
            {
                title: 'state (tag name) propagation in branching template test',
                file: './tests/samples/bugs/004.script.hb',
                result: [],
            },
            {
                title: 'state (attribute name) propagation in branching template test',
                file: './tests/samples/bugs/006.state.attribute-name.hb',
                result: [ /{{{y styleoutput}}}/, /{{{yavd classoutput}}}/ ],
            },
        ].forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspc '+testObj.file)
                .timeout(300)
                .done(function(e){
                    testObj.result.forEach(function(r) {
                        expect(e).to.match(r);
                    });
                    done();
                });
            });
        });
    });
}());
