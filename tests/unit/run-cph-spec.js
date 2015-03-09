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

    describe("context-parser-handlebars test suite", function() {

        it("context-parser-handlebars#_countNewLineChar test", function() {
        });

        it("context-parser-handlebars#_parseExpression invalid format test", function() {
        });

        it("context-parser-handlebars#_addFilters invalid format test", function() {
        });

        it("context-parser-handlebars#_parseExpression {{else}} test", function() {
            var parser = new ContextParserHandlebars();
            [
                // test for {{else}}
                {str:'{{else}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // test for {{else}} with space after else 
                {str:'{{else   }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // test for {{else}} with space before/after else
                {str:'{{    else   }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // invalid format
                {str:'{else}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},

                // with ~
                {str:'{{~else}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~else~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~  else}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~  else  ~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},

                {str:'{{^}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{^    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{    ^    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},

                // with ~
                {str:'{{~^}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~^~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~    ^}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~    ^    ~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression basic test", function() {
            var parser = new ContextParserHandlebars();
            [
                // test for single identifier with the same name as known filter {{y}}
                {str:'{{y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{    y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},

                // with ~
                {str:'{{~y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~    y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~y~}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~y    ~}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~    y    ~}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},

                // test for single identifier with the same name as known default filter {{h}}
                {str:'{{h}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with dot notation
                {str:'{{people.name}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with ../
                {str:'{{../name}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with /
                {str:'{{article/name}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with []
                {str:'{{article[0]}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with []
                {str:'{{article.[0].[#comments]}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for expression with \r and \n as separator
                {str:'{{y\rparam}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y\nparam}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y\r\nparam}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression test", function() {
            var parser = new ContextParserHandlebars();
            [
                // test for expression with the same name as known filter {{y}}
                {str:'{{y output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{     y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // test for expression with the same name as default filter {h}}
                {str:'{{h output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{{h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{{    h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},

                // with ~
                {str:'{{~y output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{~y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{~     y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{~h output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{{~h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{{~    h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},

                // test for expression with dot notation filter
                {str:'{{people.name output}}', isPrefixWithKnownFilter:false, filter:'people.name', isSingleIdentifier:false},
                // test for expression with ../ filter
                {str:'{{../name output}}', isPrefixWithKnownFilter:false, filter:'../name', isSingleIdentifier:false},

                // test for expression with the same name as known filter {{y}} and parameter in dot notation
                {str:'{{y people.name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
		{str:'{{y    people.name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{     y    people.name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as known filter {{y}} and parameter with ../
                {str:'{{y ../output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
		{str:'{{y    ../output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{     y    ../output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression 2 arguments test", function() {
            var parser = new ContextParserHandlebars();
            [
                // test for expression with the same name as known filter {{y}}
                {str:'{{y xxx zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y   xxx   zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{   y    xxx    zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{{~y xxx zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{~y   xxx   zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{~   y    xxx    zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as unknown filter
                {str:'{{unknown xxx zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{unknown xxx   zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{   unknown    xxx    zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},

                // with ~
                {str:'{{~unknown xxx zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{~unknown xxx   zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{~   unknown    xxx    zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false}
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression 2 arguments (reference format) test", function() {
            var parser = new ContextParserHandlebars();
            [
                // test for expression with the same name as known filter {{y}} with different parameter format
                {str:'{{y people.name ../name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y article[0] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{{~y people.name ../name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{~y article[0] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{~y article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as known filter {{unknown}} with different parameter format
                {str:'{{unknown people.name ../name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{unknown article[0] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{unknown article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},

                {str:'{{~unknown people.name ../name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{~unknown article[0] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{{~unknown article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false}
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression reserved tag test", function() {
            var parser = new ContextParserHandlebars();
            [
                // test for reserved expression {{#.*}}
                {str:'{{#y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{#   y   xxx}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{{~#y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{~#   y   xxx}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{/.*}}
                {str:'{{/y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{/   y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{{~/y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{~/   y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{>.*}}
                {str:'{{>partial}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{>   partial    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{{~>partial}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{~>   partial    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{^.*}}
                {str:'{{^negation}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{^   negation   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{{~^negation}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{~^   negation   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{!.*}}
                {str:'{{!comment}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{!   comment    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{{~!comment}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{~!   comment    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{@.*}}
                {str:'{{@var}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{@   var   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{{~@var}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{{~@   var   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false}
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression subexpression test", function() {
            var parser = new ContextParserHandlebars();
            [
                // not a valid handlebars syntax, no need to test
                // {str:'{{y(output)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // subexpression with one chain
                {str:'{{y (output)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y    (   output   )    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // subexpression with two chain
                {str:'{{y (helper xxx)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y    (   helper    xxx   )   }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y (helper "xxx")}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y    (   helper    "xxx"   )   }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // subexpression with three chain
                {str:'{{y helper2 (helper1 xxx)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y    helper2    (   helper1    xxx   )}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{{y    helper2    (   helper1    "xxx"   )}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                //
                {str:'{{y     (    outer-helper (inner-helper "abc") "def")}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false}
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression greedy match test", function() {
            var parser = new ContextParserHandlebars();
            [
                // immediate after an expression
                {str:'{{else}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{y}}{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{y param}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{{~else}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~else~}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~y}}{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~y~}}{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~y param}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // not immediate after an expression
                {str:'{{else}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{y}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{y param}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{{~else}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~else~}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{{~y}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~y~}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{{~y param}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false}
            ].forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_handleRawExpression test", function() {
        });

        it("context-parser-handlebars#_handleEscapeExpression test", function() {
        });

        it("context-parser-handlebars#_handleCommentExpression test", function() {
            var parser = new ContextParserHandlebars();
            [
                {str: '{{! comment }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:13},
                {str: '{{! comment }} }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:13},
                {str: '{{!-- comment --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:17},
                {str: '{{!-- comment --}}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:17},
                {str: '{{!-- comment }}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:21},

                {str: '{{~! comment }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:14},
                {str: '{{~! comment }} }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:14},
                {str: '{{~!-- comment --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:18},
                {str: '{{~!-- comment --}}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:18},
                {str: '{{~!-- comment }}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:22},

                // these cases are guarded against by isCommentExpression
                {str: '{{!-- comment }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:15},
                {str: '{{! comment --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:15}
            ].forEach(function(obj) {
                var r = parser._handleCommentExpression(obj.str, 0, obj.str.length, obj.type, false);
                expect(r.index).to.equal(obj.result);
            });
        });

        it("context-parser-handlebars#_handleExpression test", function() {
        });

        it("context-parser-handlebars#_handleRawBlock test", function() {
            var parser = new ContextParserHandlebars();
            [
                {str: '{{{{rawblock}}}} {{{{/rawblock}}}}', result:33, tag:'rawblock'},
            ].forEach(function(obj) {
                var r = parser._handleRawBlock(obj.str, 0, obj.str.length, obj.tag);
                expect(r.index).to.equal(obj.result);
            });
        });

        it("context-parser-handlebars#_handleBranchExpression test", function() {
        });

        it("context-parser-handlebars - basic branch AST test", function() {
            var parser = new ContextParserHandlebars();
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
            var stateObj = parser._getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a b {{/if}}');
        });

        it("context-parser-handlebars - basic branch with {{expression}} AST test", function() {
            var parser = new ContextParserHandlebars();
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
            var stateObj = parser._getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a b {{{yd expression}}} {{/if}}');
        });

        it("context-parser-handlebars - basic branch with {{!comment}} AST test", function() {
            var parser = new ContextParserHandlebars();
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
            var stateObj = parser._getInternalState();
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
            stateObj = parser._getInternalState();
            stateObj.state = 1;
            r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a b {{!comment  {{#if xxx}} abc {{/if}}');
        });

        it("context-parser-handlebars - basic branch with inverse AST test", function() {
            var parser = new ContextParserHandlebars();
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
            var stateObj = parser._getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a {{else}} b {{/if}}');
        });

        it("context-parser-handlebars - nested branch AST test", function() {
            var parser = new ContextParserHandlebars();
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
            var stateObj = parser._getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}');
        });

        it("context-parser-handlebars - parallel branch AST test", function() {
            var parser = new ContextParserHandlebars();
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
            var stateObj = parser._getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{#if}} e {{else}} f {{/if}} g {{/if}}');
        });

        it("context-parser-handlebars#_handleTemplate test", function() {
        });

        it("context-parser-handlebars - branch with <script> test", function() {
            var parser = new ContextParserHandlebars();
            var s = "{{#if}} <script> {{#if xxx}} path2 {{else}} path3 {{/if}} </script> {{else}} path4 {{/if}}";
            var ast = parser._buildBranchAst(s, 0);
            var stateObj = parser._getInternalState();
            stateObj.state = 1;
            var r = parser._analyseBranchAst(ast, stateObj);
            expect(r.output).to.equal('{{#if}} <script> {{#if xxx}} path2 {{else}} path3 {{/if}} </script> {{else}} path4 {{/if}}');
        });
    });

}());
