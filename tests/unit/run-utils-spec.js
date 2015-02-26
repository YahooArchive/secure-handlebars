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
    var expect = require('chai').expect,
        utils = require("../utils.js"),
        handlebarsUtils = require("../../src/handlebars-utils.js"),
        ContextParserHandlebars = require("../../src/context-parser-handlebars.js");

    describe("handlebars-utils test suite", function() {

        it("handlebars-utils#isValidExpression escapeExpressionRegExp test", function() {
            [
                // basic
                {str:'{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{anything}}'},
                {str:'{{   anything   }}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{   anything   }}'},
                // with \r and \n
                {str:'{{any\rthing}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\rthing}}'},
                {str:'{{any\nthing}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\nthing}}'},
                {str:'{{any\r\nthing}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\r\nthing}}'},

                {str:'{{any\'thing\'}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\'thing\'}}'},
                {str:"{{any'thing'}}", type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:"{{any'thing'}}"},
                {str:"{{~any'thing'~}}", type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:"{{~any'thing'~}}"},
                {str:'{{any"thing"}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any"thing"}}'},

                // with ~
                {str:'{{~anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{~anything}}'},
                {str:'{{~anything~}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{~anything~}}'},
                {str:'{{~  anything  ~}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{~  anything  ~}}'},

                // invalid reserved expression
                /* this patten is guarded against by getExpressionType
                {str:'{{#anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{~#anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{/anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{~/anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{@anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{~@anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{^anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{~^anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{!anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{~!anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{!--anything--}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{~!--anything--}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{>anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{~>anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                */

                // invalid expression
                {str:'{ {anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{anything}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{anything} }', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{anything}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{    {anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{    }anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{    ~anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},

            ].forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-utils#isValidExpression rawExpressionRegExp test", function() {
            [
                // basic
                {str:'{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{anything}}}'},
                {str:'{{{   anything   }}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{   anything   }}}'},
                // with \r and \n
                {str:'{{{any\rthing}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\rthing}}}'},
                {str:'{{{any\nthing}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\nthing}}}'},
                {str:'{{{any\r\nthing}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\r\nthing}}}'},

                // with ~
                {str:'{{{~anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{~anything}}}'},
                {str:'{{{~anything~}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{~anything~}}}'},
                {str:'{{{~  anything  ~}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{~  anything  ~}}}'},

                // invalid expression
                {str:'{ {{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{ {anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{{anything}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{{anything}}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{{anything}}}}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{{   {anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{{   }anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{{   ~anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:false},
                {str:'{{{}}}', type:handlebarsUtils.RAW_EXPRESSION, result:false}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-utils#isValidExpression greedy match test", function() {
            [
                // basic
                {str:'{{anything}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{anything}}'},
                {str:'{{   anything   }}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{   anything   }}'},
                {str:'{{anything}}xxx{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{anything}}'},
                {str:'{{   anything   }}xxx{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{   anything   }}'},

                // with \r and \n
                {str:'{{any\rthing}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\rthing}}'},
                {str:'{{any\nthing}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\nthing}}'},
                {str:'{{any\r\nthing}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\r\nthing}}'},

                // with ~
                {str:'{{~anything}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{~anything}}'},
                {str:'{{~anything~}}{{~anything~}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{~anything~}}'},
                {str:'{{~  anything  ~}}{{~  anything  ~}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{~  anything  ~}}'},

                // basic
                {str:'{{{anything}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{anything}}}'},
                {str:'{{{   anything   }}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{   anything   }}}'},
                {str:'{{{anything}}}xxx{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{anything}}}'},
                {str:'{{{   anything   }}}xxx{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{   anything   }}}'},

                // with \r and \n
                {str:'{{{any\rthing}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\rthing}}}'},
                {str:'{{{any\nthing}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\nthing}}}'},
                {str:'{{{any\r\nthing}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\r\nthing}}}'},

                // with ~
                {str:'{{{~anything}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{~anything}}}'},
                {str:'{{{~anything~}}}{{{~anything~}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{~anything~}}}'},
                {str:'{{{~  anything  ~}}}{{{~  anything  ~}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{~  anything  ~}}}'},
            ].forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-utils#isValidExpression partialExpressionRegExp test", function() {
            var arr = [
                // basic
                {str:'{{>anything}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{>anything}}'},
                {str:'{{>   anything   }}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{>   anything   }}'},
                // with \r and \n
                {str:'{{>any\rthing}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{>any\rthing}}'},
                {str:'{{>any\nthing}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{>any\nthing}}'},
                {str:'{{>any\r\nthing}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{>any\r\nthing}}'},

                // with ~
                {str:'{{~>anything}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{~>anything}}'},
                {str:'{{~>anything~}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{~>anything~}}'},
                {str:'{{~>  anything  ~}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:true, rstr:'{{~>  anything  ~}}'},

                // invalid 
                {str:'{{@anything}}', type:handlebarsUtils.PARTIAL_EXPRESSION, result:false},
            ];
            arr.forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-utils#isValidExpression dataVarExpressionRegExp test", function() {
            [
                // basic
                {str:'{{@anything}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{@anything}}'},
                {str:'{{@   anything   }}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{@   anything   }}'},
                // with \r and \n
                {str:'{{@any\rthing}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{@any\rthing}}'},
                {str:'{{@any\nthing}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{@any\nthing}}'},
                {str:'{{@any\r\nthing}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{@any\r\nthing}}'},

                // with ~
                {str:'{{~@anything}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{~@anything}}'},
                {str:'{{~@anything~}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{~@anything~}}'},
                {str:'{{~@  anything  ~}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:true, rstr:'{{~@  anything  ~}}'},

                // invalid 
                {str:'{{>anything}}', type:handlebarsUtils.DATA_VAR_EXPRESSION, result:false},
            ].forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-utils#isBranchExpression test", function() {
            [
                {str: '{{#if xxx}}', rstr: 'if'},
                {str: '{{#if xxx}}{{#if xxx}}', rstr: 'if'},
                {str: '{{#if xxx}}x{{#if xxx}}', rstr: 'if'},
                {str: '{{#if xxx}} x {{#if xxx}}', rstr: 'if'},
                {str: '{{#   if   xxx}}', rstr: 'if'},

                {str: '{{~#if xxx}}', rstr: 'if'},
                {str: '{{~#if xxx}}{{#if xxx}}', rstr: 'if'},
                {str: '{{~#if xxx}}x{{#if xxx}}', rstr: 'if'},
                {str: '{{~#if xxx}} x {{#if xxx}}', rstr: 'if'},
                {str: '{{~#   if   xxx}}', rstr: 'if'},
                {str: '{{~#if xxx~}}', rstr: 'if'},
                {str: '{{~#if xxx~}}{{#if xxx}}', rstr: 'if'},
                {str: '{{~#if xxx~}}x{{#if xxx}}', rstr: 'if'},
                {str: '{{~#if xxx~}} x {{#if xxx}}', rstr: 'if'},
                {str: '{{~#   if   xxx~}}', rstr: 'if'},

                {str: '{{#with xxx}}', rstr: 'with'},
                {str: '{{#each xxx}}', rstr: 'each'},
                {str: '{{#list xxx}}', rstr: 'list'},
                {str: '{{#unless xxx}}', rstr: 'unless'},
                {str: '{{#tag xxx}}', rstr: 'tag'},
                {str: '{{^msg xxx}}', rstr: 'msg'},

                {str: '{{~^msg xxx}}', rstr: 'msg'},

                {str: '{{^}}', rstr: false},
                {str: '{{~^}}', rstr: false},
                {str: '{{~^~}}', rstr: false},
                {str: '{{~  ^  ~}}', rstr: false},

                // illegal handlebars format
                {str: '{{#t-ag xxx}}', rstr: 't-ag'}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isBranchExpression(obj.str);
                expect(r).to.equal(obj.rstr);
            });
        });

        it("handlebars-utils#isBranchEndExpression test", function() {
            [
                {str: '{{/if}}', rstr: 'if'},
                {str: '{{/if}}{{/if}}', rstr: 'if'},
                {str: '{{/if}}x{{/if}}', rstr: 'if'},
                {str: '{{/if}} x {{/if}}', rstr: 'if'},
                {str: '{{/   if   }}', rstr: 'if'},

                {str: '{{~/if}}', rstr: 'if'},
                {str: '{{~/if}}{{/if}}', rstr: 'if'},
                {str: '{{~/if}}x{{/if}}', rstr: 'if'},
                {str: '{{~/if}} x {{/if}}', rstr: 'if'},
                {str: '{{~/   if   }}', rstr: 'if'},
                {str: '{{~/if~}}', rstr: 'if'},
                {str: '{{~/if~}}{{/if}}', rstr: 'if'},
                {str: '{{~/if~}}x{{/if}}', rstr: 'if'},
                {str: '{{~/if~}} x {{/if}}', rstr: 'if'},
                {str: '{{~/   if   ~}}', rstr: 'if'},

                {str: '{{/with}}', rstr: 'with'},
                {str: '{{/each}}', rstr: 'each'},
                {str: '{{/list}}', rstr: 'list'},
                {str: '{{/unless}}', rstr: 'unless'},
                {str: '{{/tag}}', rstr: 'tag'},
                {str: '{{/msg}}', rstr: 'msg'},

                // illegal handlebars format
                {str: '{{/t-ag}}', rstr: 't-ag'}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isBranchEndExpression(obj.str);
                expect(r).to.equal(obj.rstr);
            });
        });

        it("handlebars-utils#isElseExpression test", function() {
            [
                {str: '{{else}}', result:true},
                {str: '{{   else   }}', result:true},
                {str: '{{else}}{{else}}', result:true},
                {str: '{{else}}x{{else}}', result:true},
                {str: '{{else}} x {{else}}', result:true},

                {str: '{{~else~}}', result:true},
                {str: '{{~   else   ~}}', result:true},
                {str: '{{~else~}}{{~else~}}', result:true},
                {str: '{{~else~}}x{{~else~}}', result:true},
                {str: '{{~else~}} x {{~else~}}', result:true},

                {str: '{{^}}', result:true},
                {str: '{{~^~}}', result:true},
                {str: '{{~   ^   ~}}', result:true},
                {str: '{{^   }}', result:true},
                {str: '{{^   ~}}', result:true},
                {str: '{{^}}{{^}}', result:true},
                {str: '{{^}}x{{^}}', result:true},
                {str: '{{^}} x {{^}}', result:true},
                {str: '{{~^~}}{{~^~}}', result:true},

                {str: '{{^msg}}', result:false},
                {str: '{{^msg ~}}', result:false},
                {str: '{{^   msg}}', result:false},
                {str: '{{^   msg   }}', result:false}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isElseExpression(obj.str);
                expect(r).to.equal(obj.result);
            });
        });

        it("handlebars-utils#isBranchExpressions test", function() {
            [
                {str: '{{#if xxx}}', result:true},
                {str: '{{#if xxx}}{{#if xxx}}', result:true},
                {str: '{{#if xxx}}x{{#if xxx}}', result:true},
                {str: '{{#if xxx}} x {{#if xxx}}', result:true},

                {str: '{{#with xxx}}', result:true},
                {str: '{{#each xxx}}', result:true},
                {str: '{{#list xxx}}', result:true},
                {str: '{{#unless xxx}}', result:true},
                {str: '{{#tag xxx}}', result:true},

                {str: '{{^msg xxx}}', result:true},

                {str: '{{else}}', result:false},
                {str: '{{^}}', result:false},
                {str: '{{expression}}', result:false},
                {str: '{{@partial}}', result:false},
                {str: '{{{expression}}}', result:false},
            ].forEach(function(obj) {
                var r = handlebarsUtils.isBranchExpressions(obj.str);
                expect(r).to.equal(obj.result);
            });
        });

        it("handlebars-utils#isReservedChar test", function() {
            [
                '#', '/', '>', '@', '^', '!',
                '~#', '~/', '~>', '~@', '~^', '~!'
            ].forEach(function(s) {
                var r = handlebarsUtils.isReservedChar(s, 0);
                expect(r).to.equal(true);
            });
        });

        it("context-parser-handlebars#_handleCommentExpression test", function() {
            var parser = new ContextParserHandlebars();
            [
                {str: '{{! comment }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:14},
                {str: '{{! comment }} }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:14},
                {str: '{{!-- comment --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:18},
                {str: '{{!-- comment --}}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:18},
                {str: '{{!-- comment }}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:22},

                // these cases are guarded against by isCommentExpression
                {str: '{{!-- comment }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:16},
                {str: '{{! comment --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:16}
            ].forEach(function(obj) {
                var r = parser._handleCommentExpression(obj.str, 0, obj.str.length, obj.type);
                expect(r).to.equal(obj.result);
            });
        });

        it("handlebars-utils - build basic branch AST test", function() {
            var s = "{{#if xxx}} a b {{/if}}xxxxxxx";
            var ast = handlebarsUtils.buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(22);
            var r = handlebarsUtils.analyseBranchAst(ast, 1);
            expect(r.output).to.equal('{{#if xxx}} a b {{/if}}');
        });

        it("handlebars-utils - build basic branch with {{expression}} AST test", function() {
            var s = "{{#if xxx}} a b {{expression}} {{/if}}xxxxxxx";
            var ast = handlebarsUtils.buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b {{expression}} ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(37);
            var r = handlebarsUtils.analyseBranchAst(ast, 1);
            expect(r.output).to.equal('{{#if xxx}} a b {{{yd expression}}} {{/if}}');
        });

        it("handlebars-utils - build basic branch with {{!comment}} AST test", function() {
            var s = "{{#if xxx}} a b {{!--comment  {{#if xxx}} abc {{/if}} --}} {{/if}}xxxxxxx";
            var ast = handlebarsUtils.buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b {{!--comment  {{#if xxx}} abc {{/if}} --}} ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(65);
            var r = handlebarsUtils.analyseBranchAst(ast, 1);
            expect(r.output).to.equal('{{#if xxx}} a b {{!--comment  {{#if xxx}} abc {{/if}} --}} {{/if}}');

            s = "{{#if xxx}} a b {{!comment  {{#if xxx}} abc {{/if}} --}} {{/if}}xxxxxxx";
            ast = handlebarsUtils.buildBranchAst(s, 0);
            expect(ast.program[0].type).to.equal('branch');
            expect(ast.program[0].content).to.equal('{{#if xxx}}');
            expect(ast.program[1].type).to.equal('content');
            expect(ast.program[1].content).to.equal(' a b {{!comment  {{#if xxx}} abc ');
            expect(ast.program[2].type).to.equal('branchend');
            expect(ast.program[2].content).to.equal('{{/if}}');
            expect(ast.inverse).to.deep.equal([]);
            expect(ast.index).to.equal(50);
            r = handlebarsUtils.analyseBranchAst(ast, 1);
            expect(r.output).to.equal('{{#if xxx}} a b {{!comment  {{#if xxx}} abc {{/if}}');
        });

        it("handlebars-utils - build basic branch with inverse AST test", function() {
            var s = "{{#if xxx}} a {{else}} b {{/if}}xxxxxxxx";
            var ast = handlebarsUtils.buildBranchAst(s, 0);
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
            var r = handlebarsUtils.analyseBranchAst(ast, 1);
            expect(r.output).to.equal('{{#if xxx}} a {{else}} b {{/if}}');
        });

        it("handlebars-utils - build nested branch AST test", function() {
            var s = "{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}xxxxxx";
            var ast = handlebarsUtils.buildBranchAst(s, 0);
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
            var r = handlebarsUtils.analyseBranchAst(ast, 1);
            expect(r.output).to.equal('{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}');
        });

        it("handlebars-utils - build parallel branch AST test", function() {
            var s = "{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{#if}} e {{else}} f {{/if}} g {{/if}}xxxxxxx";
            var ast = handlebarsUtils.buildBranchAst(s, 0);
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
            var r = handlebarsUtils.analyseBranchAst(ast, 1);
            expect(r.output).to.equal('{{#if xxx}} a {{#if yyy}} b {{else}} c {{/if}} d {{#if}} e {{else}} f {{/if}} g {{/if}}');
        });

    });
}());
