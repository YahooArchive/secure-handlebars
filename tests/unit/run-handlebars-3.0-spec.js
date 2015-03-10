/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    mocha = require("mocha");
    var expect = require('chai').expect,
        handlebars = require('handlebars');

    describe("Handlebars Parsing Test Suite", function() {

        /* we are not using handlebars to build the AST, so the following test can be skipped
        *
        it("handlebars {{expression}} test", function() {
            [
                '{{expression}}',
                '{{expression}} }',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
            });
            [
                '{ {expression}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('content');
            });
        });

        it("handlebars {{expression}} subexpression with \\r\\n test", function() {
            [
                '{{expression\rion}}',
                '{{expression\nion}}',
                '{{expression\r\nion}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
	        expect(ast.statements[0].params[0].string).to.equal('ion');
	        expect(ast.statements[0].isHelper).to.equal(true);
            });
            ].forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.expression);
                    expect(ast.body).to.be.ok;
                    expect(ast.body[0].type).to.equal(testObj.result);
                } catch (e) {
                }
            });
        });

        /* we are not using handlebars to build the AST, so the following test can be skipped
        *
        it("handlebars {{expression}} test", function() {
            [
                '{{expression}}',
                '{{expression}} }',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
            });
            [
                '{ {expression}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('content');
            });
        });

        it("handlebars {{expression}} subexpression with \\r\\n test", function() {
            [
                '{{expression\rion}}',
                '{{expression\nion}}',
                '{{expression\r\nion}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
	        expect(ast.statements[0].params[0].string).to.equal('ion');
	        expect(ast.statements[0].isHelper).to.equal(true);
            });
        });

        it("handlebars invalid {{expression}} test", function() {
            [
                '{ {anything}}', 
                '{{anything}', '{{anything} }', '{{anything}}}',
                '{{    {anything}}', '{{    }anything}}',
                '{{}}'
            ].forEach(function(e) {
                try {
                    var ast = handlebars.parse(e);
                    expect(false).to.equal(true);
                } catch (err) {
                    expect(true).to.equal(true);
                }
            });
        });

        it("handlebars {{{raw expression}}} test", function() {
            [
                '{{{expression}}}',
                '{{{expression}}} }',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
            });
            [
                '{ { {expression}}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('content');
            });
        });

        it("handlebars invalid {{{raw expression}}} test", function() {
            [
                '{ {{anything}}}', '{{ {anything}}}',
                '{{{anything}', '{{{anything}}', '{{{anything}}}}',
                '{{{    {anything}}}', '{{{    }anything}}}',
                '{{{}}}'
            ].forEach(function(e) {
                try {
                    var ast = handlebars.parse(e);
                    expect(false).to.equal(true);
                } catch (err) {
                    expect(true).to.equal(true);
                }
            });
        });

        it("handlebars white space control test", function() {
            [
                '{{#each nav ~}}\
                    xxx\
                {{~/each}}',
                '{{#each nav ~}}\
                    xxx\
                {{~/   each}}'
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
                expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            });
            [
                // cannot have space between ~ and }}
                '{{#each nav ~   }}\
                    xxx\
                {{~/each}}',
                // cannot have space between ~ and /
                '{{#each nav ~}}\
                    xxx\
                {{~  /   each}}'
            ].forEach(function(t) {
                try {
                    var ast = handlebars.parse(e);
                    expect(false).to.equal(true);
                } catch (err) {
                    expect(true).to.equal(true);
                }
            });
        });

        /* Handlebars {{{{raw block}}}} test */
        it("handlebars {{{{raw block}}}} test", function() {
            [
                // valid syntax
                {
                    syntax: '{{{{rawblockname}}}} xxx {{{{/rawblockname}}}}',
                    result: 'BlockStatement',
                },
                {
                    // it is fine to have space in the start rawblockname.
                    syntax: '{{{{  rawblockname   }}}} xxx {{{{/rawblockname}}}}',
                    result: 'BlockStatement',
                },

                // invalid syntax
                // throw exception if {{{{rawblockname}}}} end with unbalanced } count.
                { syntax: '{{{{rawblockname} xxx {{{{/rawblockname}}}}    ', result: false, },
                { syntax: '{{{{rawblockname}} xxx {{{{/rawblockname}}}}   ', result: false, },
                { syntax: '{{{{rawblockname}}} xxx {{{{/rawblockname}}}}  ', result: false, },
                { syntax: '{{{{rawblockname}}}}} xxx {{{{/rawblockname}}}}', result: false, },
                {
                    // throw exception if {{{{/rawblockname}}}} with space.
                    syntax: '{{{{rawblockname}}}} xxx {{{{/    rawblockname}}}}',
                    result: false,
                },
                {
                    // throw exception if {{{{/rawblockname}}}} with space.
                    syntax: '{{{{rawblockname}}}} xxx {{{{/rawblockname    }}}}',
                    result: false,
                },
                {
                    // throw exception if unbalanced {{{{rawblockname}}}}.
                    syntax: '{{{{rawblockname1}}}} xxx {{{{/rawblockname2}}}}',
                    result: false,
                },
                {
                    // throw exception if another {{{{rawblock}}}} within another {{{{rawblock}}}}.
                    syntax: '{{{{rawblockname}}}} {{{{rawblock}}}} xxx {{{{/rawblock}}}} {{{{/rawblockname}}}}',
                    result: false,
                },

                // throw exception, {{{{rawblockname}}}} does not support special character and white space control.
                // reference http://handlebarsjs.com/expressions.html
                { syntax: '{{{{!rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{"rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { synatx: '{{{{#rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{%rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{&rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: "{{{{'rawblockname}}}} xxx {{{{/rawblockname}}}}", result: false, },
                { syntax: '{{{{(rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{)rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{*rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{+rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{,rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{.rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{/rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{;rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{>rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{=rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{<rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{@rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{[rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{^rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{]rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{`rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{{rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{}rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{~rawblockname}}}} xxx {{{{/rawblockname}}}}', result: false, },
                { syntax: '{{{{rawblockname~}}}} xxx {{{{/rawblockname}}}}', result: false, },

            ].forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(ast.body[0].type).to.equal(testObj.result);
                } catch (e) {
                    expect(testObj.result).to.equal(false);
                }
            });
        });
    });
}());
