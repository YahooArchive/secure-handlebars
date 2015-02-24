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

    describe("handlebars-handlebarsUtilss test suite", function() {

        it("handlebars-handlebarsUtilss#generateNonce test", function() {
            var n1 = handlebarsUtils.generateNonce();
            var n2 = handlebarsUtils.generateNonce();
            expect(n1).not.to.equal(n2);
        });

        it("handlebars-handlebarsUtilss#_parseExpression invalid format test", function() {
        });

        it("handlebars-handlebarsUtilss#_parseExpression {{else}} test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for {{else}}
                {str:'{else}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // test for {{else}} with space after else 
                {str:'{else   }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // test for {{else}} with space before/after else
                {str:'{    else   }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // test for {{else}} with space before/after else
                // {str:'{{else}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#_parseExpression basic test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for single identifier with the same name as known filter {y}}
                {str:'{y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{    y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},

                // test for single identifier with the same name as known default filter {h}}
                {str:'{h}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with dot notation
                {str:'{people.name}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with ../
                {str:'{../name}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with /
                {str:'{article/name}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with []
                {str:'{article[0]}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for single identifier with []
                {str:'{article.[0].[#comments]}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                // test for expression with \r and \n as separator
                {str:'{y\rparam}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y\nparam}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y\r\nparam}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#_parseExpression test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for expression with the same name as known filter {y}}
                {str:'{y output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{     y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // test for expression with the same name as default filter {h}}
                {str:'{h output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{    h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},

                // test for expression with dot notation filter
                {str:'{people.name output}}', isPrefixWithKnownFilter:false, filter:'people.name', isSingleIdentifier:false},
                // test for expression with ../ filter
                {str:'{../name output}}', isPrefixWithKnownFilter:false, filter:'../name', isSingleIdentifier:false},

                // test for expression with the same name as known filter {y}} and parameter in dot notation
                {str:'{y people.name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
		{str:'{y    people.name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{     y    people.name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as known filter {y}} and parameter with ../
                {str:'{y ../output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
		{str:'{y    ../output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{     y    ../output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#_parseExpression 2 arguments test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for expression with the same name as known filter {y}}
                {str:'{y xxx zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y   xxx   zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{   y    xxx    zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as unknown filter
                {str:'{unknown xxx zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{unknown xxx   zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{   unknown    xxx    zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#_parseExpression 2 arguments (reference format) test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for expression with the same name as known filter {y}} with different parameter format
                {str:'{y people.name ../name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y article[0] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as known filter {unknown}} with different parameter format
                {str:'{unknown people.name ../name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{unknown article[0] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{unknown article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#_parseExpression reserved tag test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for reserved expression {{#.*}}
                {str:'{#y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{#   y   xxx}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{/.*}}
                {str:'{/y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{/   y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{>.*}}
                {str:'{>partial}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{>   partial    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{^.*}}
                {str:'{^negation}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{^   negation   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{!.*}}
                {str:'{!comment}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{!   comment    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{@.*}}
                {str:'{@var}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{@   var   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#_parseExpression subexpression test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // not a valid handlebars syntax, no need to test
                // {str:'{y(output)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // subexpression with one chain
                {str:'{y (output)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y    (   output   )    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // subexpression with two chain
                {str:'{y (helper xxx)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y    (   helper    xxx   )   }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y (helper "xxx")}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y    (   helper    "xxx"   )   }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // subexpression with three chain
                {str:'{y helper2 (helper1 xxx)}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y    helper2    (   helper1    xxx   )}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y    helper2    (   helper1    "xxx"   )}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                //
                {str:'{y     (    outer-helper (inner-helper "abc") "def")}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#_parseExpression greedy match test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // immediate after an expression
                {str:'{else}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{y}}{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{y param}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                // not immediate after an expression
                {str:'{else}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{y}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{y param}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#isValidExpression escapeExpressionRegExp test", function() {
            var arr = [
                // basic
                {str:'{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{anything}}'},
                {str:'{{   anything   }}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{   anything   }}'},
                // with \r and \n
                {str:'{{any\rthing}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\rthing}}'},
                {str:'{{any\nthing}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\nthing}}'},
                {str:'{{any\r\nthing}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\r\nthing}}'},

                // invalid expression
                {str:'{ {anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{anything}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{anything} }', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{anything}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{    {anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{    }anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false}
            ];
            arr.forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#isValidExpression rawExpressionRegExp test", function() {
            var arr = [
                // basic
                {str:'{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{anything}}}'},
                {str:'{{{   anything   }}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{   anything   }}}'},
                // with \r and \n
                {str:'{{{any\rthing}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\rthing}}}'},
                {str:'{{{any\nthing}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\nthing}}}'},
                {str:'{{{any\r\nthing}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\r\nthing}}}'},

                // invalid expression
                {str:'{ {{anything}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{ {anything}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{{anything}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{{anything}}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{{   {anything}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{{   }anything}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false},
                {str:'{{{}}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:false}
            ];
            arr.forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#isValidExpression greedy match test", function() {
            var arr = [
                // basic
                {str:'{{anything}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{anything}}'},
                {str:'{{   anything   }}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{   anything   }}'},
                {str:'{{anything}}xxx{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{anything}}'},
                {str:'{{   anything   }}xxx{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{   anything   }}'},

                // with \r and \n
                {str:'{{any\rthing}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\rthing}}'},
                {str:'{{any\nthing}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\nthing}}'},
                {str:'{{any\r\nthing}}{{anything}}', type:handlebarsUtils.ESCAPE_EXPRESSION, result:true, rstr:'{{any\r\nthing}}'},

                // basic
                {str:'{{{anything}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{anything}}}'},
                {str:'{{{   anything   }}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{   anything   }}}'},
                {str:'{{{anything}}}xxx{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{anything}}}'},
                {str:'{{{   anything   }}}xxx{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{   anything   }}}'},

                // with \r and \n
                {str:'{{{any\rthing}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\rthing}}}'},
                {str:'{{{any\nthing}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\nthing}}}'},
                {str:'{{{any\r\nthing}}}{{{anything}}}', type:handlebarsUtils.RAW_EXPRESSION, result:true, rstr:'{{{any\r\nthing}}}'},
            ];
            arr.forEach(function(obj) {
                var r = handlebarsUtils.isValidExpression(obj.str, 0, obj.type);
                utils.testIsValidExpression(r, obj); 
            });
        });

        it("handlebars-handlebarsUtilss#isReservedChar test", function() {
            [
                '#', '/', '>', '@', '^', '!'
            ].forEach(function(c) {
                var r = handlebarsUtils.isReservedChar(c);
                expect(r).to.equal(true);
            });
        });

        it("handlebars-handlebarsUtilss#isBranchExpression test", function() {
            [
                {str: '{{#if xxx}}', rstr: 'if'},
                {str: '{{#if xxx}}{{#if xxx}}', rstr: 'if'},
                {str: '{{#if xxx}}x{{#if xxx}}', rstr: 'if'},
                {str: '{{#if xxx}} x {{#if xxx}}', rstr: 'if'},
                {str: '{{#   if   xxx}}', rstr: 'if'},

                {str: '{{#with xxx}}', rstr: 'with'},
                {str: '{{#each xxx}}', rstr: 'each'},
                {str: '{{#list xxx}}', rstr: 'list'},
                {str: '{{#unless xxx}}', rstr: 'unless'},
                {str: '{{#tag xxx}}', rstr: 'tag'},
                {str: '{{^msg xxx}}', rstr: 'msg'},

                // illegal handlebars format
                {str: '{{#t-ag xxx}}', rstr: 't-ag'}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isBranchExpression(obj.str);
                expect(r).to.equal(obj.rstr);
            });
        });

        it("handlebars-handlebarsUtilss#isBranchEndExpression test", function() {
            [
                {str: '{{/if}}', rstr: 'if'},
                {str: '{{/if}}{{/if}}', rstr: 'if'},
                {str: '{{/if}}x{{/if}}', rstr: 'if'},
                {str: '{{/if}} x {{/if}}', rstr: 'if'},
                {str: '{{/   if   }}', rstr: 'if'},

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

        it("handlebars-handlebarsUtilss#isElseExpression test", function() {
            [
                {str: '{{else}}', result:true},
                {str: '{{   else   }}', result:true},
                {str: '{{else}}{{else}}', result:true},
                {str: '{{else}}x{{else}}', result:true},
                {str: '{{else}} x {{else}}', result:true}
            ].forEach(function(obj) {
                var r = handlebarsUtils.isElseExpression(obj.str);
                expect(r).to.equal(obj.result);
            });
        });

        it("handlebars-handlebarsUtilss#isBranchExpressions test", function() {
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
                {str: '{{expression}}', result:false},
                {str: '{{{expression}}}', result:false},
            ].forEach(function(obj) {
                var r = handlebarsUtils.isBranchExpressions(obj.str);
                expect(r).to.equal(obj.result);
            });
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#if xxx}} statement test", function() {
            var s = "{{#if xxx}} a {{/if}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#if xxx}} a {{\/if}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#if xxx}} statement with {{else}} test", function() {
            var s = "{{#if xxx}} a {{else}} b {{/if}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#if xxx}} a {{else}} b {{\/if}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{#if xxx}} statement test", function() {
            var s = "{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} h {{/if}} i {{/if}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} h {{/if}} i {{/if}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#with xxx}} statement test", function() {
            var s = "{{#with xxx}} a {{/with}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#with xxx}} a {{\/with}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#with xxx}} statement with {{else}} test", function() {
            var s = "{{#with xxx}} a {{else}} b {{/with}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#with xxx}} a {{else}} b {{\/with}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{#with xxx}} statement test", function() {
            var s = "{{#with xxx}} a {{#with}} b {{else}} c {{/with}} d {{else}} e {{#with}} f {{else}} h {{/with}} i {{/with}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#with xxx}} a {{#with}} b {{else}} c {{/with}} d {{else}} e {{#with}} f {{else}} h {{/with}} i {{/with}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#each xxx}} statement test", function() {
            var s = "{{#each xxx}} a {{/each}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#each xxx}} a {{\/each}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#each xxx}} statement with {{else}} test", function() {
            var s = "{{#each xxx}} a {{else}} b {{/each}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#each xxx}} a {{else}} b {{\/each}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{#each xxx}} statement test", function() {
            var s = "{{#each xxx}} a {{#each}} b {{else}} c {{/each}} d {{else}} e {{#each}} f {{else}} h {{/each}} i {{/each}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#each xxx}} a {{#each}} b {{else}} c {{/each}} d {{else}} e {{#each}} f {{else}} h {{/each}} i {{/each}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#list xxx}} statement test", function() {
            var s = "{{#list xxx}} a {{/list}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#list xxx}} a {{\/list}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#list xxx}} statement with {{else}} test", function() {
            var s = "{{#list xxx}} a {{else}} b {{/list}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#list xxx}} a {{else}} b {{\/list}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{#list xxx}} statement test", function() {
            var s = "{{#list xxx}} a {{#list yyy}} b {{else}} c {{/list}} d {{else}} e {{#list zzz}} f {{else}} h {{/list}} i {{/list}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#list xxx}} a {{#list yyy}} b {{else}} c {{/list}} d {{else}} e {{#list zzz}} f {{else}} h {{/list}} i {{/list}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#tag xxx}} statement test", function() {
            var s = "{{#tag xxx}} a {{/tag}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#tag xxx}} a {{\/tag}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#tag xxx}} statement with {{else}} test", function() {
            var s = "{{#tag xxx}} a {{else}} b {{/tag}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#tag xxx}} a {{else}} b {{\/tag}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{#tag xxx}} statement test", function() {
            var s = "{{#tag xxx}} a {{#tag yyy}} b {{else}} c {{/tag}} d {{else}} e {{#tag zzz}} f {{else}} h {{/tag}} i {{/tag}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#tag xxx}} a {{#tag yyy}} b {{else}} c {{/tag}} d {{else}} e {{#tag zzz}} f {{else}} h {{/tag}} i {{/tag}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{^msg}} statement test", function() {
            var s = "{{^msg}} a {{/msg}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{^msg}} a {{\/msg}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{^msg}} statement with {{else}} test", function() {
            var s = "{{^msg}} a {{else}} b {{/msg}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{^msg}} a {{else}} b {{\/msg}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{^msg}} statement test", function() {
            var s = "{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} h {{/msg}} i {{/msg}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} h {{/msg}} i {{/msg}}');
        });

        it("handlebars-handlebarsUtilss - extract basic Handlebars {{#unless xxx}} statement test", function() {
            var s = "{{#unless xxx}} a {{/unless}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#unless xxx}} a {{\/unless}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{#unless xxx}} statement test", function() {
            var s = "{{#unless xxx}} a {{#unless xxx}} b {{/unless}} c {{/unless}} zzzzzzzz";
            var r = handlebarsUtils.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#unless xxx}} a {{#unless xxx}} b {{/unless}} c {{/unless}}');
        });

        it("handlebars-handlebarsUtilss - extract nested Handlebars {{#unless xxx}} statement exception test", function() {
            var s = "{{#if} aaaaaaaa";
            try {
                var r = handlebarsUtils.extractBranchStmt(s, 0, false);
                expect(false).to.equal(true);
            } catch (err) {
                expect(true).to.equal(true);
            }
        });

        it("handlebars-handlebarsUtilss - parse basic Handlebars {{#if xxx}} statement parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{/if}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{/if}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // 'empty string' (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse basic Handlebars {{#if xxx}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{else}} b {{/if}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{else}} b {{/if}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // b (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse nested Handlebars {{#if xxx}} statement parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{/if}} c {{/if}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{/if}} c {{/if}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  c (1st branch)
            // a  c (1st branch)
            // 'empty string' (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse nested Handlebars {{#if xxx}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  d (1st branch)
            // a  c  d (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse parallel Handlebars {{#if xxx}} statement parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if xyz}} f {{else}} g {{/if}} h {{/if}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if xyz}} f {{else}} g {{/if}} h {{/if}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  d  b  f (1st branch)
            // a  c  d  b  f (1st branch)
            // a  b  d  c  f (1st branch)
            // a  c  d  c  f (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse parallel Handlebars {{#if}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if}} f {{else}} g {{/if}} h {{#if}} 1 {{else}} 2 {{/if}} h {{/if}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if}} f {{else}} g {{/if}} h {{#if}} 1 {{else}} 2 {{/if}} h {{/if}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  d  b  f (1st branch)
            // a  c  d  b  f (1st branch)
            // a  b  d  c  f (1st branch)
            // a  c  d  c  f (1st branch)
            // e  f  h  1  h (2nd branch)
            // e  g  h  1  h (2nd branch)
            // e  f  h  2  h (2nd branch)
            // e  g  h  2  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse basic Handlebars {{^msg}} statement parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{/msg}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{/msg}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // b (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse basic Handlebars {{^msg}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{else}} b {{/msg}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{else}} b {{/msg}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // b (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse nested Handlebars {{^msg}} statement parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{/msg}} c {{/msg}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{/msg}} c {{/msg}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  c (1st branch)
            // a  c (1st branch)
            // 'empty string' (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse nested Handlebars {{^msg}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  d (1st branch)
            // a  c  d (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse parallel Handlebars {{^msg}} statement parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  d  b  f (1st branch)
            // a  c  d  b  f (1st branch)
            // a  b  d  c  f (1st branch)
            // a  c  d  c  f (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse parallel Handlebars {{^msg}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{^msg}} 1 {{else}} 2 {{/msg}} h {{/msg}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{^msg}} 1 {{else}} 2 {{/msg}} h {{/msg}}');
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
            // a  b  d  b  f (1st branch)
            // a  c  d  b  f (1st branch)
            // a  b  d  c  f (1st branch)
            // a  c  d  c  f (1st branch)
            // e  f  h  1  h (2nd branch)
            // e  g  h  1  h (2nd branch)
            // e  f  h  2  h (2nd branch)
            // e  g  h  2  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-handlebarsUtilss - parse basic Handlebars {{#if xxx}} broken statement with {{else}} parseAstTreeState exception test", function() {
            var s = "<a href='{{#if xxx}} a {{else}} b'> {{/if}}'>";
            var obj = handlebarsUtils.extractBranchStmt(s, 9, true);
            var ast = handlebarsUtils.parseBranchStmt(obj.stmt);
            try {
                var r = handlebarsUtils.parseAstTreeState(ast, 39, obj);
                expect(false).to.equal(true);
            } catch (err) {
                expect(true).to.equal(true);
            }
        });

    });

}());
