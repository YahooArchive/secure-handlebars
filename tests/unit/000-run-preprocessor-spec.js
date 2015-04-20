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

    var NO_OF_TEMPLATE = 16,
        NO_OF_FILTER_TEMPLATE = 20;

    var config = {};
    config.printCharEnable = false;

    describe("Handlebars PreProcessor Test Suite", function() {

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

        var genTemplateFileWithSpecialChars = function() {
            /* template file with null char in the template, output expression, raw expression, raw block and special expression */
            var o = "abcde\x00null\x0012345{\x00}{{express\x00ion}}{{{rawexpress\x00ion}}}{{{{raw\x00block}}}}\x00nullinrawblock\x00{{{{/raw\x00block}}}}{{>part\x00ial}}";

            var f = fs.openSync("./tests/samples/files/handlebarsjs_template_special_char.hbs", "w");
            fs.writeSync(f, o);
            fs.closeSync(f);
        };
        genTemplateFileWithSpecialChars();

        /* template tests */
        utils.templatePatterns.forEach(function(testObj) {
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

        /* exception tests */
        utils.exceptionPatterns.forEach(function(testObj) {
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

        /* reported bug tests */
        utils.reportedBugPatterns.forEach(function(testObj) {
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
