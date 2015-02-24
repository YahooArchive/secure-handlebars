/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
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

    var NO_OF_TEMPLATE = 22,
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

        /* this test will not throw exception, but the vanilla handlebars will complain, no need to handle */
        it("./bin/handlebarspc broken conditional {{/if}} template test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_019.hbs')
            .timeout(300)
            .then(function(e){
                done();
            });
        });

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc conditional/iteration mismatch template test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_021.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

        /* this test will throw exception, and the vanilla handlebars will complain */
        it("./bin/handlebarspc conditional/iteration mismatch template test", function(done) {
            var exec = promise.promisify(require("child_process").exec);
            exec('./bin/handlebarspc ./tests/samples/files/handlebarsjs_template_022.hbs')
            .timeout(300)
            .catch(function(e){
                done();
            });
        });

    });
}());
