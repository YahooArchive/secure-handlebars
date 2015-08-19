/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    var expect = require('chai').expect,
        secureHandlebars = require('../../src/secure-handlebars'),
        handlebars = require('handlebars');

    describe("Secure Handlebars test suite", function() {

        var data = {url: 'javascript:alert(1)'};

        it("empty template test", function() {
            expect(secureHandlebars.compile('')(data)).to.be.equal('');
            expect(secureHandlebars.preprocess('')).to.be.equal('');
        });

        var template = '{{#if url}}<a href="{{url}}"{{else}}<a href="{{url}}">closed</a>{{/if}}';
        it("fallback on compile error test", function() {
            var t1 = secureHandlebars.compile(template);
            var t2 = handlebars.compile(template);

            expect(t1(data)).to.be.equal(t2(data));
        });

        it("fallback on precompile error test", function() {
            var templateSpec1 = secureHandlebars.precompile(template);
            var t1 = secureHandlebars.template(eval('(' + templateSpec1 + ')'));

            var templateSpec2 = handlebars.precompile(template);
            var t2 = handlebars.template(eval('(' + templateSpec2 + ')'));

            expect(t1(data)).to.be.equal(t2(data));
        });

        it("SafeString test", function() {
            var template = '<a href="{{url}}">hello</a>';
            var templateSpec1 = secureHandlebars.compile(template);
            var data = {url: new handlebars.SafeString('javascript:alert(1)')};

            expect(templateSpec1(data)).to.be.equal('<a href="javascript:alert(1)">hello</a>');
        });

        it("precompile() test", function() {
            var template = '<a href="{{url}}">hello</a>';
            var templateSpec1 = secureHandlebars.precompile(template);
            var t1 = secureHandlebars.template(eval('(' + templateSpec1 + ')'));

            expect(t1(data)).to.be.equal('<a href="x-javascript:alert(1)">hello</a>');
        });

        it("compile() test", function() {
            var template = '<a href="{{url}}">hello</a>';
            var t1 = secureHandlebars.compile(template);
            expect(t1(data)).to.be.equal('<a href="x-javascript:alert(1)">hello</a>');

            // must not be the same as vanilla handlebars
            var t2 = handlebars.compile(template);
            expect(t1(data)).not.to.be.equal(t2(data));
        });

        it("preprocess() and compilePreprocessed() test", function() {
            var template = '<a href="{{url}}">hello</a>';
            var templatePreProcessed = secureHandlebars.preprocess(template);

            expect(templatePreProcessed).to.be.equal('<a href="{{{yubl (yavd (yufull url))}}}">hello</a>');

            var t1 = secureHandlebars.compilePreprocessed(templatePreProcessed);

            expect(t1(data)).to.be.equal('<a href="x-javascript:alert(1)">hello</a>');
        });

        it("create() test", function() {

            var secureHbs = secureHandlebars.create();
            // secureHbs and special filters exist
            expect(typeof secureHbs).to.be.equal('object');
            expect(typeof secureHbs.helpers.yd).to.be.equal('function');
            expect(typeof secureHbs.helpers.inHTMLData).to.be.equal('function');

            // no more create() from the created one
            expect(typeof secureHbs.create).to.be.equal('undefined');

            // compile works
            var template = '<a href="{{url}}">hello</a>';
            var t1 = secureHbs.compile(template);
            expect(t1(data)).to.be.equal('<a href="x-javascript:alert(1)">hello</a>');
        });
    });

}());
