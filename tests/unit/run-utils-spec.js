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

    describe("handlebars-utils test suite", function() {

        it("handlebars-utils#getExpressionType test", function() {
        });

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

        it("handlebars-utils#isValidExpression branchExpressionRegExp test", function() {
            [
                {str: '{{#if xxx}}', rstr: 'if', result: true},
                {str: '{{#if xxx}}{{#if xxx}}', rstr: 'if', result: true},
                {str: '{{#if xxx}}x{{#if xxx}}', rstr: 'if', result: true},
                {str: '{{#if xxx}} x {{#if xxx}}', rstr: 'if', result: true},
                {str: '{{#   if   xxx}}', rstr: 'if', result: true},

                {str: '{{~#if xxx}}', rstr: 'if', result: true},
                {str: '{{~#if xxx}}{{#if xxx}}', rstr: 'if', result: true},
                {str: '{{~#if xxx}}x{{#if xxx}}', rstr: 'if', result: true},
                {str: '{{~#if xxx}} x {{#if xxx}}', rstr: 'if', result: true},
                {str: '{{~#   if   xxx}}', rstr: 'if', result: true},
                {str: '{{~#if xxx~}}', rstr: 'if', result: true},
                {str: '{{~#if xxx~}}{{#if xxx}}', rstr: 'if', result: true},
                {str: '{{~#if xxx~}}x{{#if xxx}}', rstr: 'if', result: true},
                {str: '{{~#if xxx~}} x {{#if xxx}}', rstr: 'if', result: true},
                {str: '{{~#   if   xxx~}}', rstr: 'if', result: true},

                {str: '{{#with xxx}}', rstr: 'with', result: true},
                {str: '{{#each xxx}}', rstr: 'each', result: true},
                {str: '{{#list xxx}}', rstr: 'list', result: true},
                {str: '{{#unless xxx}}', rstr: 'unless', result: true},
                {str: '{{#tag xxx}}', rstr: 'tag', result: true},
                {str: '{{^msg xxx}}', rstr: 'msg', result: true},

                {str: '{{~^msg xxx}}', rstr: 'msg', result: true},

                {str: '{{^}}', rstr: false, result: false},
                {str: '{{~^}}', rstr: false, result: false},
                {str: '{{~^~}}', rstr: false, result: false},
                {str: '{{~  ^  ~}}', rstr: false, result: false},

                {str: '{{else}}', rstr: false, result:false},
                {str: '{{^}}', rstr: false, result:false},
                {str: '{{expression}}', rstr: false, result:false},
                {str: '{{@partial}}', rstr: false, result:false},
                {str: '{{{expression}}}', rstr: false, result:false},

                // illegal handlebars format
                {str: '{{#t-ag xxx}}', rstr: 't-ag', result: true}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, handlebarsUtils.BRANCH_EXPRESSION);
                expect(r.tag).to.equal(obj.rstr);
                expect(r.result).to.equal(obj.result);
            });
        });

        it("handlebars-utils#isValidExpression branchEndExpressionRegExp test", function() {
            [
                {str: '{{/if}}', rstr: 'if', result: true},
                {str: '{{/if}}{{/if}}', rstr: 'if', result: true},
                {str: '{{/if}}x{{/if}}', rstr: 'if', result: true},
                {str: '{{/if}} x {{/if}}', rstr: 'if', result: true},
                {str: '{{/   if   }}', rstr: 'if', result: true},

                {str: '{{~/if}}', rstr: 'if', result: true},
                {str: '{{~/if}}{{/if}}', rstr: 'if', result: true},
                {str: '{{~/if}}x{{/if}}', rstr: 'if', result: true},
                {str: '{{~/if}} x {{/if}}', rstr: 'if', result: true},
                {str: '{{~/   if   }}', rstr: 'if', result: true},
                {str: '{{~/if~}}', rstr: 'if', result: true},
                {str: '{{~/if~}}{{/if}}', rstr: 'if', result: true},
                {str: '{{~/if~}}x{{/if}}', rstr: 'if', result: true},
                {str: '{{~/if~}} x {{/if}}', rstr: 'if', result: true},
                {str: '{{~/   if   ~}}', rstr: 'if', result: true},

                {str: '{{/with}}', rstr: 'with', result: true},
                {str: '{{/each}}', rstr: 'each', result: true},
                {str: '{{/list}}', rstr: 'list', result: true},
                {str: '{{/unless}}', rstr: 'unless', result: true},
                {str: '{{/tag}}', rstr: 'tag', result: true},
                {str: '{{/msg}}', rstr: 'msg', result: true},

                // illegal handlebars format
                {str: '{{/t-ag}}', rstr: 't-ag', result: true}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, handlebarsUtils.BRANCH_END_EXPRESSION);
                expect(r.tag).to.equal(obj.rstr);
                expect(r.result).to.equal(obj.result);
            });
        });

        it("handlebars-utils#isValidExpression elseExpressionRegExp test", function() {
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
                var r = handlebarsUtils.isValidExpression(obj.str, 0, handlebarsUtils.ELSE_EXPRESSION);
                expect(r.result).to.equal(obj.result);
            });
        });

        it("handlebars-utils#isValidExpression rawBlockRegExp test", function() {
            [
                {str:'{{{{anything}}}}', type:handlebarsUtils.RAW_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~anything}}}}', type:handlebarsUtils.RAW_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~   anything}}}}', type:handlebarsUtils.RAW_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~   anything   }}}}', type:handlebarsUtils.RAW_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~anything~}}}}', type:handlebarsUtils.RAW_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~anything   ~}}}}', type:handlebarsUtils.RAW_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~   anything   ~}}}}', type:handlebarsUtils.RAW_BLOCK, result:true, rstr:'anything'},

                {str:'{{{{/anything}}}}', type:handlebarsUtils.RAW_END_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~/anything}}}}', type:handlebarsUtils.RAW_END_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~/   anything}}}}', type:handlebarsUtils.RAW_END_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~/   anything   }}}}', type:handlebarsUtils.RAW_END_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~/anything~}}}}', type:handlebarsUtils.RAW_END_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~/anything   ~}}}}', type:handlebarsUtils.RAW_END_BLOCK, result:true, rstr:'anything'},
                {str:'{{{{~/   anything   ~}}}}', type:handlebarsUtils.RAW_END_BLOCK, result:true, rstr:'anything'},
            ].forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                expect(r.result).to.equal(obj.result);
                expect(r.tag).to.equal(obj.rstr);
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

        it("handlebars-utils#handleError test", function() {
        });
    });
}());
