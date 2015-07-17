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
        testPatterns = require("../test-patterns.js"),
        expect = require('chai').expect,
        ContextParserHandlebars = require("../../src/context-parser-handlebars");

    // TODO: need to improve the processing time of the unit test.
    var config = {}, t = 400;
    config.printCharEnable = false;

    var genTemplateFileWithSpecialChars = function() {
        /* template file with null char in the template, output expression, raw expression, raw block and special expression */
        var o = "abcde\x00null\x0012345{\x00}{{express\x00ion}}{{{rawexpress\x00ion}}}{{{{raw\x00block}}}}\x00nullinrawblock\x00{{{{/raw\x00block}}}}{{>part\x00ial}}";

        var f = fs.openSync("./tests/samples/files/handlebarsjs_template_special_char.hbs", "w");
        fs.writeSync(f, o);
        fs.closeSync(f);
    };

    describe("Handlebars PreProcessor Test Suite", function() {

        before(function() {
            genTemplateFileWithSpecialChars();
        });

        /* template tests */
        testPatterns.templatePatterns.forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspp '+testObj.file)
                .timeout(t)
                .done(function(e){
                    testObj.result.forEach(function(r) {
                        expect(e.toString()).to.match(r);
                    });
                    done();
                });
            });
        });

        /* filter template tests */
        testPatterns.filterTemplatePatterns.forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspp '+testObj.file+' -e .hbs -p tests/samples/files/partials -c false')
                .timeout(t)
                .done(function(e){
                    testObj.result.forEach(function(r) {
                        expect(e.toString()).to.match(r);
                    });
                    done();
                });
            });
        });

        /* partial tests */
        testPatterns.partialPatterns.forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspp '+testObj.file+' -e .hbs -p tests/samples/files/partials -c '+testObj.combine)
                .timeout(t)
                .done(function(e){
                    testObj.result.forEach(function(r) {
                        expect(e.toString()).to.match(r);
                    });
                    done();
                });
            });
        });

        /* exception tests */
        testPatterns.exceptionPatterns.forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspp '+testObj.file+' -e .hbs -p tests/samples/files/partials -s '+testObj.strictMode)
                .timeout(t)
                .catch(function(e){
                    testObj.result.forEach(function(r) {
                        expect(e.toString()).to.match(r);
                    });
                    done();
                });
            });
        });

        /* reported bug tests */
        testPatterns.reportedBugPatterns.forEach(function(testObj) {
            it(testObj.title, function(done) {
                var exec = promise.promisify(require("child_process").exec);
                exec('./bin/handlebarspp '+testObj.file)
                .timeout(t)
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
