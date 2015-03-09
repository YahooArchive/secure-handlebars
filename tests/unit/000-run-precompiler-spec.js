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
        expect = require('chai').expect,
        ContextParserHandlebars = require("../../src/context-parser-handlebars");

    var NO_OF_TEMPLATE = 24,
        NO_OF_FILTER_TEMPLATE = 20;

    describe("Handlebars pre-compiler test suite", function() {

        it("Running ./bin/handlebarspc test", function(done) {
            var exec = promise.promisify(require("child_process").exec)
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_000.hbs')
            .timeout(1000)
            .then(function(streams){
                expect(streams[0]).to.match(/{{yd name}}/);
            })
            .then(done);
        });

        var append_zero = function(i) {
            var s = i.toString();
            while(s.length < 3) {
                s = "0" + s;
            }
            return s;    
        };

        var genPrecompiledTemplateFiles = function(id) {
            it("ContextParserHandlebars#contextualize template " + id + " test", function() {
                var file = './tests/samples/files/handlebarsjs_template_'+id+'.hbs';
                var data = fs.readFileSync(file, 'utf-8');
                var parser = new ContextParserHandlebars(false, true);
                try {
                    parser.contextualize(data);
                    var output = parser.getBuffer().join('');
                    fs.writeFileSync("./tests/samples/files/handlebarsjs_template_"+id+".hbs.precompiled", output, {flag:'w'});
                } catch (err) {
                    console.log(err)
                    // it is ok to have exception error for file generation.
                }
            });
        };

        /* generate the template files */
        for(var i=0;i<=NO_OF_TEMPLATE;++i) {
            id = append_zero(i);
            genPrecompiledTemplateFiles(id);
        }

        var genPrecompiledFilterFiles = function(id) {
            it("ContextParserHandlebars#contextualize filter " + id + " test", function() {
                var file = './tests/samples/files/handlebarsjs_filter_'+id+'.hbs';
                var data = fs.readFileSync(file, 'utf-8');
                var parser = new ContextParserHandlebars(false, true);
                try {
                    parser.contextualize(data);
                    var output = parser.getBuffer().join('');
                    fs.writeFileSync("./tests/samples/files/handlebarsjs_filter_"+id+".hbs.precompiled", output, {flag:'w'});
                } catch (err) {
                    console.log(err)                    
                    // it is ok to have exception error for file generation.
                }
            });
        };

        /* generate the filter files */
        for(var i=0;i<=NO_OF_FILTER_TEMPLATE;++i) {
            id = append_zero(i);
            genPrecompiledFilterFiles(id);
        }

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc broken conditional {{#if}} template test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_017.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc conditional/iteration mismatch template test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_018.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc broken conditional {{/if}} template test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_019.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc invalid expression test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_021.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc invalid expression test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_022.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc invalid expression test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_024.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

        it("./bin/handlebarspc html5 inconsistent state test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/bugs/004.script.hb')
            .timeout(300)
            .done(function(e){
                done();
            });
        });

        it("./bin/handlebarspc line no and char no reporting test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/bugs/005.line.report.hb')
            .timeout(300)
            .done(function(e){
                expect(e).to.match(/lineNo:2,charNo:38/);
                expect(e).to.match(/lineNo:4,charNo:91/);
                expect(e).to.match(/lineNo:8,charNo:177/);
                expect(e).to.match(/lineNo:10,charNo:274/);
                expect(e).to.match(/lineNo:12,charNo:298/);
                done();
            });
        });

        it("./bin/handlebarspc full state propagation in logical template test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/bugs/006.state.hb')
            .timeout(300)
            .done(function(e){
                expect(e).to.match(/{{{y styleoutput}}}/);
                expect(e).to.match(/{{{yavd classoutput}}}/);
                done();
            });
        });
    });
}());
