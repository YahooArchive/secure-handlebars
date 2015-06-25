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
        testPatterns = require("../test-patterns.js"),
        handlebarsUtils = require("../../src/handlebars-utils.js"),
        ContextParserHandlebars = require("../../src/context-parser-handlebars.js");

    var config = {};
    config.printCharEnable = false;

    describe("context-parser-handlebars test suite", function() {

        it("context-parser-handlebars#countNewLineChar test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#addFilters invalid format test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#handleEscapeExpression test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#basic branch AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a b {{/if}}xxxxxxx";
            var ast = parser.buildAst(s, 0, []);
            expect(ast.left[0].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[0].content).to.equal('{{#if xxx}}');
            expect(ast.left[0].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[1].content).to.equal(' a b ');
            expect(ast.left[0].content.left[2].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[2].content).to.equal('{{/if}}');
            expect(ast.left[0].content.right).to.deep.equal([]);
            expect(ast.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[1].content).to.equal('xxxxxxx');
            expect(ast.right).to.deep.equal([]);
            expect(ast.index).to.equal(s.length);

            var contextParser = parser.contextParser;
            contextParser.state = 1;
            var r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.equal(s);
        });

        it("context-parser-handlebars#basic branch with {{expression}} AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a b {{expression}} {{/if}}xxxxxxx";
            var ast = parser.buildAst(s, 0, []);
            expect(ast.left[0].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[0].content).to.equal('{{#if xxx}}');
            expect(ast.left[0].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[1].content).to.equal(' a b ');
            expect(ast.left[0].content.left[2].type).to.equal(handlebarsUtils.ESCAPE_EXPRESSION);
            expect(ast.left[0].content.left[2].content).to.equal('{{expression}}');
            expect(ast.left[0].content.left[3].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[3].content).to.equal(' ');
            expect(ast.left[0].content.left[4].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[4].content).to.equal('{{/if}}');
            expect(ast.left[0].content.right).to.deep.equal([]);
            expect(ast.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[1].content).to.equal('xxxxxxx');
            expect(ast.right).to.deep.equal([]);
            expect(ast.index).to.equal(s.length);

            var contextParser = parser.contextParser;
            contextParser.state = 1;
            var r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.not.equal(s);
        });

        it("context-parser-handlebars#basic branch with {{!comment}} AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a b {{!--comment  {{#if xxx}} abc {{/if}} --}} {{/if}}xxxxxxx";
            var ast = parser.buildAst(s, 0, []);
            expect(ast.left[0].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[0].content).to.equal('{{#if xxx}}');
            expect(ast.left[0].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[1].content).to.equal(' a b ');
            expect(ast.left[0].content.left[2].type).to.equal(handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM);
            expect(ast.left[0].content.left[2].content).to.equal('{{!--comment  {{#if xxx}} abc {{/if}} --}}');
            expect(ast.left[0].content.left[3].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[3].content).to.equal(' ');
            expect(ast.left[0].content.left[4].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[4].content).to.equal('{{/if}}');
            expect(ast.left[0].content.right).to.deep.equal([]);
            expect(ast.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[1].content).to.equal('xxxxxxx');
            expect(ast.right).to.deep.equal([]);
            expect(ast.index).to.equal(s.length);

            var contextParser = parser.contextParser;
            contextParser.state = 1;
            var r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.equal(s);

            /* this is not a valid template
            s = "{{#if xxx}} a b {{!comment  {{#if xxx}} abc {{/if}} --}} {{/if}}xxxxxxx";
            ast = parser.buildAst(s, 0, []);
            expect(ast.left[0].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[0].content).to.equal('{{#if xxx}}');
            expect(ast.left[0].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[1].content).to.equal(' a b ');
            expect(ast.left[0].content.left[2].type).to.equal(handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM);
            expect(ast.left[0].content.left[2].content).to.equal('{{!comment  {{#if xxx}}');
            expect(ast.left[0].content.left[3].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[3].content).to.equal(' abc ');
            expect(ast.left[0].content.left[4].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[4].content).to.equal('{{/if}}');
            expect(ast.left[0].content.right).to.deep.equal([]);
            expect(ast.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[1].content).to.equal(' --}} ');
            expect(ast.left[2].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[2].content).to.equal('{{/if}}');
            expect(ast.right).to.deep.equal([]);
            expect(ast.index).to.equal(s.length);

            var contextParser = parser.contextParser;
            contextParser.state = 1;
            r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.equal(s);
            */
        });

        it("context-parser-handlebars#basic branch with right AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a {{else}} b {{/if}}xxxxxxxx";
            var ast = parser.buildAst(s, 0, []);
            expect(ast.left[0].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[0].content).to.equal('{{#if xxx}}');
            expect(ast.left[0].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[1].content).to.equal(' a ');
            expect(ast.left[0].content.right[0].type).to.equal(handlebarsUtils.ELSE_EXPRESSION);
            expect(ast.left[0].content.right[0].content).to.equal('{{else}}');
            expect(ast.left[0].content.right[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.right[1].content).to.equal(' b ');
            expect(ast.left[0].content.right[2].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.right[2].content).to.equal('{{/if}}');
            expect(ast.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[1].content).to.equal('xxxxxxxx');
            expect(ast.index).to.equal(s.length);

            var contextParser = parser.contextParser;
            contextParser.state = 1;
            var r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.equal(s);
        });

        it("context-parser-handlebars#nested branch AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}xxxxxx";
            var ast = parser.buildAst(s, 0, []);
            expect(ast.left[0].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[0].content).to.equal('{{#if xxx}}');
            expect(ast.left[0].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[1].content).to.equal(' a ');
            expect(ast.left[0].content.left[2].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[2].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[2].content.left[0].content).to.equal('{{#if yyy}}');
            expect(ast.left[0].content.left[2].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[2].content.left[1].content).to.equal(' b ');
            expect(ast.left[0].content.left[2].content.right[0].type).to.equal(handlebarsUtils.ELSE_EXPRESSION);
            expect(ast.left[0].content.left[2].content.right[0].content).to.equal('{{else}}');
            expect(ast.left[0].content.left[2].content.right[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[2].content.right[1].content).to.equal(' c ');
            expect(ast.left[0].content.left[2].content.right[2].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[2].content.right[2].content).to.equal('{{/if}}');
            expect(ast.left[0].content.left[3].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[3].content).to.equal(' d ');

            expect(ast.left[0].content.right[0].type).to.equal(handlebarsUtils.ELSE_EXPRESSION);
            expect(ast.left[0].content.right[0].content).to.equal('{{else}}');
            expect(ast.left[0].content.right[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.right[1].content).to.equal(' e ');
            expect(ast.left[0].content.right[2].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.right[2].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.right[2].content.left[0].content).to.equal('{{#if}}');
            expect(ast.left[0].content.right[2].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.right[2].content.left[1].content).to.equal(' f ');
            expect(ast.left[0].content.right[2].content.right[0].type).to.equal(handlebarsUtils.ELSE_EXPRESSION);
            expect(ast.left[0].content.right[2].content.right[0].content).to.equal('{{else}}');
            expect(ast.left[0].content.right[2].content.right[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.right[2].content.right[1].content).to.equal(' g ');
            expect(ast.left[0].content.right[2].content.right[2].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.right[2].content.right[2].content).to.equal('{{/if}}');
            expect(ast.left[0].content.right[3].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.right[3].content).to.equal(' h ');
            expect(ast.left[0].content.right[4].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.right[4].content).to.equal('{{/if}}');

            expect(ast.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[1].content).to.equal('xxxxxx');
            expect(ast.index).to.equal(s.length);

            var contextParser = parser.contextParser;
            contextParser.state = 1;
            var r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.equal(s);
        });

        it("context-parser-handlebars#parallel branch AST test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{#if}} e {{else}} f {{/if}} g {{/if}}xxxxxxx";
            var ast = parser.buildAst(s, 0, []);
            expect(ast.left[0].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[0].content).to.equal('{{#if xxx}}');
            expect(ast.left[0].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[1].content).to.equal(' a ');
            expect(ast.left[0].content.left[2].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[2].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[2].content.left[0].content).to.equal('{{#if yyy}}');
            expect(ast.left[0].content.left[2].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[2].content.left[1].content).to.equal(' b ');
            expect(ast.left[0].content.left[2].content.right[0].type).to.equal(handlebarsUtils.ELSE_EXPRESSION);
            expect(ast.left[0].content.left[2].content.right[0].content).to.equal('{{else}}');
            expect(ast.left[0].content.left[2].content.right[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[2].content.right[1].content).to.equal(' c ');
            expect(ast.left[0].content.left[2].content.right[2].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[2].content.right[2].content).to.equal('{{/if}}');
            expect(ast.left[0].content.left[3].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[3].content).to.equal(' d ');
            expect(ast.left[0].content.left[4].type).to.equal(handlebarsUtils.AST_NODE);
            expect(ast.left[0].content.left[4].content.left[0].type).to.equal(handlebarsUtils.BRANCH_EXPRESSION);
            expect(ast.left[0].content.left[4].content.left[0].content).to.equal('{{#if}}');
            expect(ast.left[0].content.left[4].content.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[4].content.left[1].content).to.equal(' e ');
            expect(ast.left[0].content.left[4].content.right[0].type).to.equal(handlebarsUtils.ELSE_EXPRESSION);
            expect(ast.left[0].content.left[4].content.right[0].content).to.equal('{{else}}');
            expect(ast.left[0].content.left[4].content.right[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[4].content.right[1].content).to.equal(' f ');
            expect(ast.left[0].content.left[4].content.right[2].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[4].content.right[2].content).to.equal('{{/if}}');
            expect(ast.left[0].content.left[5].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[0].content.left[5].content).to.equal(' g ');
            expect(ast.left[0].content.left[6].type).to.equal(handlebarsUtils.BRANCH_END_EXPRESSION);
            expect(ast.left[0].content.left[6].content).to.equal('{{/if}}');

            expect(ast.left[1].type).to.equal(handlebarsUtils.AST_HTML);
            expect(ast.left[1].content).to.equal('xxxxxxx');
            expect(ast.index).to.equal(s.length);

            var contextParser = parser.contextParser;
            contextParser.state = 1;
            var r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.equal(s);
        });

        it("context-parser-handlebars#branch with <script> test", function() {
            var parser = new ContextParserHandlebars(config);
            var s = "{{#if}} <script> {{#if xxx}} path2 {{else}} path3 {{/if}} </script> {{else}} path4 {{/if}}";
            var ast = parser.buildAst(s, 0, []);
            var contextParser = parser.contextParser;
            contextParser.state = 1;
            var r = parser.analyzeAst(ast, contextParser);
            expect(r.output).to.equal(s);
        });

        /* consumeExpression test */
        it("context-parser-handlebars#consumeExpression test", function() {
            testPatterns.partialExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser.consumeExpression(testObj.syntax, 0, testObj.type, 1);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
            testPatterns.referenceExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser.consumeExpression(testObj.syntax, 0, testObj.type, 1);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleRawExpression test */
        it("context-parser-handlebars#handleRawExpression test", function() {
            testPatterns.rawExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser.consumeExpression(testObj.syntax, 0, testObj.type, false);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleRawBlock test */
        it("context-parser-handlebars#handleRawBlock test", function() {
            testPatterns.rawBlockTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser.handleRawBlock(testObj.syntax, 0);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleCommentExpression test */
        it("context-parser-handlebars#handleCommentExpression test", function() {
            testPatterns.commentExpressionTestPatterns.forEach(function(testObj) {
                try {
                    var parser = new ContextParserHandlebars(config);
                    var r = parser.consumeExpression(testObj.syntax, 0, testObj.type, false);
                    expect(testObj.result[2]).to.equal(r.index);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(r).to.equal(undefined);
                    expect(testObj.result[2]).to.equal(false);
                }
            });
        });

        /* handleTemplate test */
        it("context-parser-handlebars#handleTemplate test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#setInternalState test", function() {
            // no need to test it directly
        });

        it("context-parser-handlebars#getInternalState test", function() {
            // no need to test it directly
        });

        /* deepCompareState test */
        it("Customized Context Parser deepCompareState test", function() {
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
                var contextParser1, contextParser2;
                parser1.contextParser.contextualize(testObj.s1);
                parser2.contextParser.contextualize(testObj.s2);
                // contextParser1 = parser1._html5Parser.getInternalState();
                // contextParser2 = parser2._html5Parser.getInternalState();
                expect(parser1.contextParser.state === parser2.contextParser.state).to.equal(testObj.result);
            });
        });

        it("context-parser-handlebars#buildAst/analyzeAst test", function() {
            testPatterns.buildAstPatterns.forEach(function(testObj) {
                var parser = new ContextParserHandlebars(config);
                var ast = parser.buildAst(testObj.syntax, 0, []);
                ast.left.forEach(function(r, i) {
                    expect(r.type).to.equal(testObj.rtype[i]);
                    if (r.type !== handlebarsUtils.AST_NODE) {
                        expect(r.content).to.equal(testObj.rstr[i]);
                    } else {
                        utils.testBranch(r.content, testObj.rstr[i]);
                    }
                });

                var contextParser = parser.contextParser;
                contextParser.state = 1;
                var r = parser.analyzeAst(ast, contextParser);
                expect(r.output).to.equal(testObj.output);
            });
        });
    });
}());
