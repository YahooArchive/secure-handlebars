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

    describe("context-parser-handlebars test suite", function() {

        it("context-parser-handlebars#_parseExpression invalid format test", function() {
        });

        it("context-parser-handlebars#_parseExpression {{else}} test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for {{else}}
                {str:'{else}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // test for {{else}} with space after else 
                {str:'{else   }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                // test for {{else}} with space before/after else
                {str:'{    else   }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},

                // with ~
                {str:'{~else}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~else~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~  else}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~  else  ~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},

                {str:'{^}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{^    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{    ^    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},

                // with ~
                {str:'{~^}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~^~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~    ^}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~    ^    ~}}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression basic test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for single identifier with the same name as known filter {y}}
                {str:'{y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{    y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},

                // with ~
                {str:'{~y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~    y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~y~}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~y    ~}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~    y    ~}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},

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

        it("context-parser-handlebars#_parseExpression test", function() {
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

                // with ~
                {str:'{~y output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{~y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{~     y    output}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{~h output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{~h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},
                {str:'{~    h    output}}', isPrefixWithKnownFilter:false, filter:'h', isSingleIdentifier:false},

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

        it("context-parser-handlebars#_parseExpression 2 arguments test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for expression with the same name as known filter {y}}
                {str:'{y xxx zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y   xxx   zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{   y    xxx    zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{~y xxx zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{~y   xxx   zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{~   y    xxx    zzz}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as unknown filter
                {str:'{unknown xxx zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{unknown xxx   zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{   unknown    xxx    zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},

                // with ~
                {str:'{~unknown xxx zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{~unknown xxx   zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{~   unknown    xxx    zzz}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression 2 arguments (reference format) test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for expression with the same name as known filter {y}} with different parameter format
                {str:'{y people.name ../name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y article[0] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{y article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{~y people.name ../name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{~y article[0] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},
                {str:'{~y article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // test for expression with the same name as known filter {unknown}} with different parameter format
                {str:'{unknown people.name ../name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{unknown article[0] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{unknown article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},

                {str:'{~unknown people.name ../name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{~unknown article[0] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false},
                {str:'{~unknown article.[0].[#comments] article/name}}', isPrefixWithKnownFilter:false, filter:'unknown', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression reserved tag test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // test for reserved expression {{#.*}}
                {str:'{#y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{#   y   xxx}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{~#y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{~#   y   xxx}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{/.*}}
                {str:'{/y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{/   y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{~/y}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{~/   y    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{>.*}}
                {str:'{>partial}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{>   partial    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{~>partial}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{~>   partial    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{^.*}}
                {str:'{^negation}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{^   negation   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{~^negation}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{~^   negation   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{!.*}}
                {str:'{!comment}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{!   comment    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{~!comment}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{~!   comment    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // test for reserved expression {{@.*}}
                {str:'{@var}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{@   var   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                // with ~
                {str:'{~@var}}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false},
                {str:'{~@   var   }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
            });
        });

        it("context-parser-handlebars#_parseExpression subexpression test", function() {
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

        it("context-parser-handlebars#_parseExpression greedy match test", function() {
            var parser = new ContextParserHandlebars();

            var arr = [
                // immediate after an expression
                {str:'{else}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{y}}{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{y param}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{~else}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~else~}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~y}}{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~y~}}{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~y param}}{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // not immediate after an expression
                {str:'{else}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{y}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{y param}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false},

                // with ~
                {str:'{~else}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~else~}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'', isSingleIdentifier:false},
                {str:'{~y}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~y~}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:false, filter:'', isSingleIdentifier:true},
                {str:'{~y param}}xxxx{{h    zzz    }}', isPrefixWithKnownFilter:true, filter:'y', isSingleIdentifier:false}
            ];
            arr.forEach(function(obj) {
                var r = parser._parseExpression(obj.str, 0);
                utils.testExpression(r, obj); 
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

                {str: '{{~! comment }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:15},
                {str: '{{~! comment }} }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:15},
                {str: '{{~!-- comment --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:19},
                {str: '{{~!-- comment --}}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:19},
                {str: '{{~!-- comment }}  --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:23},

                // these cases are guarded against by isCommentExpression
                {str: '{{!-- comment }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, result:16},
                {str: '{{! comment --}}', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, result:16}
            ].forEach(function(obj) {
                var r = parser._handleCommentExpression(obj.str, 0, obj.str.length, obj.type);
                expect(r).to.equal(obj.result);
            });
        });
    });
}());
