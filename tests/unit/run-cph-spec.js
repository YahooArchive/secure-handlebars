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
    var expect = require('chai').expect,
        utils = require("../utils.js"),
        handlebarsUtils = require("../../src/handlebars-utils.js"),
        ContextParserHandlebars = require("../../src/context-parser-handlebars.js");

    var config = {};
    config.printCharEnable = false;

    describe("context-parser-handlebars test suite", function() {

        it("context-parser-handlebars#_countNewLineChar test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#_addFilters invalid format test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#_handleEscapeExpression test", function() {
            // no need to test it directly
        });

        /* handleBranchExpression test */
        it("context-parser-handlebars#_handleBranchExpression test", function() {
            utils.branchExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser._handleBranchExpression(testObj.syntax, 0, 1);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        it("context-parser-handlebars#basic branch AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a b {{/if}}xxxxxxx";
            var ast = parser._buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(22);
            var stateObj = parser.getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a b {{/if}}');
        });

        it("context-parser-handlebars#basic branch with {{expression}} AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a b {{expression}} {{/if}}xxxxxxx";
            var ast = parser._buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b {{expression}} ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(37);
            var stateObj = parser.getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a b {{{yd expression}}} {{/if}}');
        });

        it("context-parser-handlebars#basic branch with {{!comment}} AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a b {{!--comment  {{#if xxx}} abc {{/if}} --}} {{/if}}xxxxxxx";
            var ast = parser._buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b {{!--comment  {{#if xxx}} abc {{/if}} --}} ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(65);
            var stateObj = parser.getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a b {{!--comment  {{#if xxx}} abc {{/if}} --}} {{/if}}');

            s = "{{#if xxx}} a b {{!comment  {{#if xxx}} abc {{/if}} --}} {{/if}}xxxxxxx";
            ast = parser._buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b {{!comment  {{#if xxx}} abc ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(50);
            stateObj = parser.getInternalState();
            stateObj.state = 1;
            r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a b {{!comment  {{#if xxx}} abc {{/if}}');
        });

        it("context-parser-handlebars#basic branch with inverse AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a {{else}} b {{/if}}xxxxxxxx";
            var ast = parser._buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a ');

            expect(ast.inverse[0].type).to.equal('branchelse');
            expect(ast.inverse[0].content).to.equal('{{else}}');
            expect(ast.inverse[1].type).to.equal('content');
            expect(ast.inverse[1].content).to.equal(' b ');
            expect(ast.inverse[2].type).to.equal('branchend');
            expect(ast.inverse[2].content).to.equal('{{/if}}');
            expect(ast.index).to.equal(31);
            var stateObj = parser.getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a {{else}} b {{/if}}');
        });

        it("context-parser-handlebars#nested branch AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}xxxxxx";
            var ast = parser._buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a ');
            expect(ast.program[2].type).to.equal('node');
            expect(ast.program[2].content.program[0].type).to.equal('branch');
            expect(ast.program[2].content.program[0].content).to.equal('{{#if yyy}}');
            expect(ast.program[2].content.program[1].type).to.equal('content');
            expect(ast.program[2].content.program[1].content).to.equal(' b ');
            expect(ast.program[2].content.inverse[0].type).to.equal('branchelse');
            expect(ast.program[2].content.inverse[0].content).to.equal('{{else}}');
            expect(ast.program[2].content.inverse[1].type).to.equal('content');
            expect(ast.program[2].content.inverse[1].content).to.equal(' c ');
            expect(ast.program[2].content.inverse[2].type).to.equal('branchend');
            expect(ast.program[2].content.inverse[2].content).to.equal('{{/if}}');
            expect(ast.program[3].type).to.equal('content');
            expect(ast.program[3].content).to.equal(' d ');

            expect(ast.inverse[0].type).to.equal('branchelse');
            expect(ast.inverse[0].content).to.equal('{{else}}');
            expect(ast.inverse[1].type).to.equal('content');
            expect(ast.inverse[1].content).to.equal(' e ');
            expect(ast.inverse[2].type).to.equal('node');
            expect(ast.inverse[2].content.program[0].type).to.equal('branch');
            expect(ast.inverse[2].content.program[0].content).to.equal('{{#if}}');
            expect(ast.inverse[2].content.program[1].type).to.equal('content');
            expect(ast.inverse[2].content.program[1].content).to.equal(' f ');
            expect(ast.inverse[2].content.inverse[0].type).to.equal('branchelse');
            expect(ast.inverse[2].content.inverse[0].content).to.equal('{{else}}');
            expect(ast.inverse[2].content.inverse[1].type).to.equal('content');
            expect(ast.inverse[2].content.inverse[1].content).to.equal(' g ');
            expect(ast.inverse[2].content.inverse[2].type).to.equal('branchend');
            expect(ast.inverse[2].content.inverse[2].content).to.equal('{{/if}}');
            expect(ast.inverse[3].type).to.equal('content');
            expect(ast.inverse[3].content).to.equal(' h ');
            expect(ast.inverse[4].type).to.equal('branchend');
            expect(ast.inverse[4].content).to.equal('{{/if}}');
            expect(ast.index).to.equal(97);
            var stateObj = parser.getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}');
        });

        it("context-parser-handlebars#parallel branch AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{#if}} e {{else}} f {{/if}} g {{/if}}xxxxxxx";
            var ast = parser._buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a ');
            expect(ast.program[2].type).to.equal('node');
            expect(ast.program[2].content.program[0].type).to.equal('branch');
            expect(ast.program[2].content.program[0].content).to.equal('{{#if yyy}}');
            expect(ast.program[2].content.program[1].type).to.equal('content');
            expect(ast.program[2].content.program[1].content).to.equal(' b ');
            expect(ast.program[2].content.inverse[0].type).to.equal('branchelse');
            expect(ast.program[2].content.inverse[0].content).to.equal('{{else}}');
            expect(ast.program[2].content.inverse[1].type).to.equal('content');
            expect(ast.program[2].content.inverse[1].content).to.equal(' c ');
            expect(ast.program[2].content.inverse[2].type).to.equal('branchend');
            expect(ast.program[2].content.inverse[2].content).to.equal('{{/if}}');
            expect(ast.program[3].type).to.equal('content');
            expect(ast.program[3].content).to.equal(' d ');
            expect(ast.program[4].type).to.equal('node');
            expect(ast.program[4].content.program[0].type).to.equal('branch');
            expect(ast.program[4].content.program[0].content).to.equal('{{#if}}');
            expect(ast.program[4].content.program[1].type).to.equal('content');
            expect(ast.program[4].content.program[1].content).to.equal(' e ');
            expect(ast.program[4].content.inverse[0].type).to.equal('branchelse');
            expect(ast.program[4].content.inverse[0].content).to.equal('{{else}}');
            expect(ast.program[4].content.inverse[1].type).to.equal('content');
            expect(ast.program[4].content.inverse[1].content).to.equal(' f ');
            expect(ast.program[4].content.inverse[2].type).to.equal('branchend');
            expect(ast.program[4].content.inverse[2].content).to.equal('{{/if}}');
            expect(ast.program[5].type).to.equal('content');
            expect(ast.program[5].content).to.equal(' g ');
            expect(ast.program[6].type).to.equal('branchend');
            expect(ast.program[6].content).to.equal('{{/if}}');
            expect(ast.index).to.equal(86);
            var stateObj = parser.getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{#if}} e {{else}} f {{/if}} g {{/if}}');
        });

        it("context-parser-handlebars#branch with <script> test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if}} <script> {{#if xxx}} path2 {{else}} path3 {{/if}} </script> {{else}} path4 {{/if}}";
            var ast = parser._buildBranchAst(s, 0);
            var stateObj = parser.getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal(s);
        });

        /* consumeExpression test */
        it("context-parser-handlebars#_consumeExpression test", function() {
            utils.partialExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser._consumeExpression(testObj.syntax, 0, testObj.type, 1);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
            utils.referenceExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser._consumeExpression(testObj.syntax, 0, testObj.type, 1);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleRawExpression test */
        it("context-parser-handlebars#_handleRawExpression test", function() {
            utils.rawExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser._consumeExpression(testObj.syntax, 0, testObj.type, false);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleRawBlock test */
        it("context-parser-handlebars#_handleRawBlock test", function() {
            utils.rawBlockTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser._handleRawBlock(testObj.syntax, 0);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleCommentExpression test */
        it("context-parser-handlebars#_handleCommentExpression test", function() {
            utils.commentExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser._consumeExpression(testObj.syntax, 0, testObj.type, false);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleTemplate test */
        it("context-parser-handlebars#_handleTemplate test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#setInternalState test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#getInternalState test", function() {
            // no need to test it directly
        });

        /* deepCompareState test */
        it("context-parser-handlebars#_deepCompareState test", function() {
            [
                // true test
                {s1:"<html></html>", s2:"<html></html>", result:true},
                {s1:"<html></html>", s2:"", result:true},
                {s1:"<script>alert(0);", s2:"<script>alert(0);", result:true},

                // attributeName does not affect the result 
                {s1:"<div class=''>", s2:"<div style=''>", result:true},

                // attributeValue does not affect the result 
                {s1:"<div class='classname'>", s2:"<div style=''>", result:true},

                // false test
                {s1:"<html></html>", s2:"<htm", result:false},
                {s1:"<script>alert(0);", s2:"alert(0);</script>", result:false},

            ].forEach(function(testObj) {
                var parser1 = new ContextParserHandlebars(config);
                var parser2 = new ContextParserHandlebars(config);
                var stateObj1, stateObj2;
                parser1.contextualize(testObj.s1);
                parser2.contextualize(testObj.s2);
                stateObj1 = parser1.getInternalState();
                stateObj2 = parser2.getInternalState();
                expect(parser1._deepCompareState(stateObj1, stateObj2)).to.equal(testObj.result);
            });
        });
    });
}());
