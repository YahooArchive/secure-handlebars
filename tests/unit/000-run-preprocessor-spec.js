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

    var NO_OF_TEMPLATE = 25,
        NO_OF_FILTER_TEMPLATE = 20;

    var config = {};
    config.printCharEnable = false;

    describe("Handlebars PreProcessor Test Suite", function() {

        // basic test
        it("Running ./bin/handlebarspp test", function(done) {
            var exec = promise.promisify(require("child_process").exec)
            exec('./bin/handlebarspp ./tests/samples/files/handlebarsjs_template_000.hbs')
            .timeout(1000)
            .then(function(streams){
                expect(streams[0]).to.match(/{{yd name}}/);
            })
            .then(done);
        });

        /* generate the template files */
        var genPrecompiledTemplateFiles = function(id) {
            it("ContextParserHandlebars#analyzeContext template " + id + " test", function() {
                var file = './tests/samples/files/handlebarsjs_template_'+id+'.hbs';
                var data = fs.readFileSync(file, 'utf-8');
                var parser = new ContextParserHandlebars(config);
                try {
                    var output = parser.analyzeContext(data);
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
            it("ContextParserHandlebars#analyzeContext filter " + id + " test", function() {
                var file = './tests/samples/files/handlebarsjs_filter_'+id+'.hbs';
                var data = fs.readFileSync(file, 'utf-8');
                var parser = new ContextParserHandlebars(config);
                try {
                    var output = parser.analyzeContext(data);
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
                title: './bin/handlebarspp broken conditional {{#if}} without {{/if}} template test',
                file: './tests/samples/files/handlebarsjs_template_017.hbs',
                strictMode: false,
                result: [ /Template does not have branching close expression/, /lineNo:3,charNo:101/ ],
            },
            {
                title: './bin/handlebarspp branching logic startName/endName mismatch template test',
                file: './tests/samples/files/handlebarsjs_template_018.hbs',
                strictMode: false,
                result: [ /Template expression mismatch/, /lineNo:2,charNo:104/ ],
            },
            {
                title: './bin/handlebarspp broken conditional {{#if}} without {{#if}} template test',
                file: './tests/samples/files/handlebarsjs_template_019.hbs',
                strictMode: false,
                result: [ /Template expression mismatch/, /lineNo:2,charNo:87/ ],
            },
            {
                title: './bin/handlebarspp invalid {{expression}} template test',
                file: './tests/samples/files/handlebarsjs_template_021.hbs',
                strictMode: false,
                result: [ /Invalid expression/, /lineNo:4,charNo:80/ ],
            },
            {
                title: './bin/handlebarspp invalid {{{expression}}} template test',
                file: './tests/samples/files/handlebarsjs_template_022.hbs',
                strictMode: false,
                result: [ /Invalid expression/, /lineNo:4,charNo:88/ ],
            },
            {
                title: './bin/handlebarspp invalid raw block startName/endName mismatch template test',
                file: './tests/samples/files/handlebarsjs_template_024.hbs',
                strictMode: false,
                result: [ /raw block name mismatch/, /lineNo:2,charNo:52/ ],
            },
            {
                title: '/bin/handlebarspp html5 inconsistent state (42/34) test',
                file: './tests/samples/bugs/003.html5.inconsitent.hb',
                strictMode: false,
                result: [ /Inconsistent HTML5 state/, /lineNo:5,charNo:387/ ],
            },
            {
                title: './bin/handlebarspp line no and char no reporting buildAst test',
                file: './tests/samples/bugs/005-2.line.report.hb',
                strictMode: false,
                result: [ /lineNo:8,charNo:223/ ],
            },
            /* remove this test as we don't test for tagNameIdx in deepCompare
            {
                title: 'state (missing close tag) in branching template test',
                file: './tests/samples/bugs/006.state.missing-close-tag.hb',
                strictMode: false,
                result: [],
            },
            */
            {
                title: './bin/handlebarspp STATE_SCRIPT_DATA strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_001.hbs',
                strictMode: true,
                result: [ /ERROR/, /STATE_SCRIPT_DATA/, ],
            },
            {
                title: './bin/handlebarspp STATE_ATTRIBUTE_NAME strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_002.hbs',
                strictMode: true,
                result: [ /ERROR/, /STATE_ATTRIBUTE_NAME/ ],
            },
            {
                title: './bin/handlebarspp STATE_RAWTEXT strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_003.hbs',
                strictMode: true,
                result: [ /ERROR/, /STATE_RAWTEXT/ ],
            },
            {
                title: './bin/handlebarspp NOT HANDLE strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_004.hbs',
                strictMode: true,
                result: [ /ERROR/, /NOT HANDLE/ ],
            },
            {
                title: './bin/handlebarspp attribute URI Javascript context strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_005.hbs',
                strictMode: true,
                result: [ /ERROR/, /attribute URI Javascript context/ ],
            },
            {
                title: './bin/handlebarspp attribute style CSS context strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_006.hbs',
                strictMode: true,
                result: [ /ERROR/, /attribute style CSS context/ ],
            },
            {
                title: './bin/handlebarspp attribute on* Javascript context strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_007.hbs',
                strictMode: true,
                result: [ /ERROR/, /attribute on\* Javascript context/ ],
            },
            {
                title: './bin/handlebarspp NOT HANDLE state strict mode test',
                file: './tests/samples/files/handlebarsjs_template_strict_mode_008.hbs',
                strictMode: true,
                result: [ /ERROR/, /NOT HANDLE/ ],
            },
        ].forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspp '+testObj.file+' '+testObj.strictMode)
                .timeout(300)
                .catch(function(e){
                    testObj.result.forEach(function(r) {
                        expect(e.toString()).to.match(r);
                    });
                    done();
                });
            });
        });

        var genTemplateFileWithSpecialChars = function() {
            /* template file with null char in the template, output expression, raw expression, raw block and special expression */
            var o = "abcde\x00null\x0012345{\x00}{{express\x00ion}}{{{rawexpress\x00ion}}}{{{{raw\x00block}}}}\x00nullinrawblock\x00{{{{/raw\x00block}}}}{{>part\x00ial}}";

            var f = fs.openSync("./tests/samples/files/handlebarsjs_template_special_char.hbs", "w");
            fs.writeSync(f, o);
            fs.closeSync(f);
        };
        genTemplateFileWithSpecialChars();

        /* reported bug tests */
        [
            {
                title: './bin/handlebarspp line no and char no reporting addFilters test',
                file: './tests/samples/bugs/005-1.line.report.hb',
                result: [ /lineNo:4,charNo:122/, /lineNo:6,charNo:175/, /lineNo:10,charNo:261/, /lineNo:13,charNo:359/, /lineNo:15,charNo:383/ ],
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
/* disable this test during the code refactoring
            {
                title: 'template file with special character',
                file: './tests/samples/files/handlebarsjs_template_special_char.hbs',
                result: [ /{\ufffd}/, /abcde\ufffdnull\ufffd12345/, /{{{yd express\ufffdion}}}/, 
                          /{{{rawexpress\ufffdion}}}/, /{{>part\ufffdial}}/,
                          /{{{{raw\ufffdblock}}}}\ufffdnullinrawblock\ufffd{{{{\/raw\ufffdblock}}}}/ ],
            },
*/
        ].forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspp '+testObj.file)
                .timeout(300)
                .done(function(e){
                    testObj.result.forEach(function(r) {
                        expect(e.toString()).to.match(r);
                    });
                    done();
                });
            });
        });
    });
}());
