/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    var mocha = require("mocha"),
        fs = require('fs'),
        expect = require('expect.js'),
        util = require("../../src/handlebars-utils.js");

    describe("handlebars-utils test suite", function() {

        it("handlebars-utils#_getExpressionExtraInfo {{else}} test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            var str = '{else}}';
            var r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{else   }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{   else   }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(false);
        });

        it("handlebars-utils#_getExpressionExtraInfo output markup test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            var str = '{y}}';
            var r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{h}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{people.name}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{../name}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{article/title}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{article[0]}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{articles.[10].[#comments]}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{y   }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{   y   }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);
        });

        it("handlebars-utils#_getExpressionExtraInfo test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            var str = '{y output}}';
            var r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{h output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('h');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{people.name output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('people.name');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{../name output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('../name');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y   output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{h   output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('h');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{    y   output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{    h   output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('h');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y ../output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y    ../output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{    y    ../output}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);
        });

        it("handlebars-utils#_getExpressionExtraInfo 2 arguments test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            var str = '{y xxx zzz}}';
            var r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y    xxx    zzz}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{    y    xxx    zzz}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);
        });

        it("handlebars-utils#_getExpressionExtraInfo 2 arguments (reference format) test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            var str = '{y xxx.name zzz}}';
            var r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y ../xxx.name zzz}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{   y    xxx.name    zzz}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{   y    ../xxx.name    zzz}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);
        });

        it("handlebars-utils#_getExpressionExtraInfo reserved tag test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            var str = '{#y }}';
            var r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{#    y    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(false);
        });

        it("handlebars-utils#_getExpressionExtraInfo subexpression test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            /* not a valid handlebars syntax
            str = '{y(output)}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);
            */

            str = '{y (output)}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y    ( output    )}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y (helper xxx)}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y    (   helper    xxx    )}}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = "{y (helper 'xxx')}}";
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = "{y    (   helper   'xxx'   )}}";
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = "{y helper2 (    helper1    'xxx'    )}}";
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = "{y (outer-helper (inner-helper 'abc') 'def')}}";
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = "{y     (    outer-helper (inner-helper 'abc') 'def')}}";
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);
        });

        it("handlebars-utils#_getExpressionExtraInfo greedy match test", function() {
            var ContextParserHandlebars = require("../../src/context-parser-handlebars.js");
            var parser = new ContextParserHandlebars();

            var str = '{else    }}{{h    zzz    }}';
            var r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y}}xxxxx{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{y}}{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{y    }}{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(true);

            str = '{y    xxx    }}{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y    ../xxx    }}{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{y    xxx.name    }}{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{#y    }}{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(false);
            expect(r.filter).to.equal('');
            expect(r.isSingleIdentifier).to.equal(false);

            str = '{   y   (   helper   xxx   )}}{{h    zzz    }}';
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = "{   y   (   helper   'xxx'  )}}{{h    zzz    }}";
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);

            str = "{   y   helper2    (   helper1   xxx  )}}{{h    zzz    }}";
            r = parser._getExpressionExtraInfo(str, 0);
            expect(r.isKnownFilter).to.equal(true);
            expect(r.filter).to.equal('y');
            expect(r.isSingleIdentifier).to.equal(false);
        });

        it("handlebars-utils#generateNonce test", function() {
            var n1 = util.generateNonce();
            var n2 = util.generateNonce();
            expect(n1).not.to.equal(n2);
        });

        it("handlebars-utils#isReservedChar test", function() {
            var s = "#";
            var r = util.isReservedChar(s);
            expect(r).to.equal(true);
            s = "/";
            r = util.isReservedChar(s);
            expect(r).to.equal(true);
            s = ">";
            r = util.isReservedChar(s);
            expect(r).to.equal(true);
            s = "@";
            r = util.isReservedChar(s);
            expect(r).to.equal(true);
            s = "^";
            r = util.isReservedChar(s);
            expect(r).to.equal(true);
            s = "!";
            r = util.isReservedChar(s);
            expect(r).to.equal(true);
        });

        it("handlebars-utils#isBranchTag (if) test", function() {
            var s = "{{#if xxx}}";
            var r = util.isBranchTag(s);
            expect(r).to.equal('if');
            s = "{{#   if   xxx}}";
            r = util.isBranchTag(s);
            expect(r).to.equal('if');
            s = "{{/if}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('if');
            s = "{{/   if   }}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('if');
        });

        it("handlebars-utils#isBranchTag (with) test", function() {
            var s = "{{#with xxx}}";
            var r = util.isBranchTag(s);
            expect(r).to.equal('with');
            s = "{{#   with   xxx}}";
            r = util.isBranchTag(s);
            expect(r).to.equal('with');
            s = "{{/with}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('with');
            s = "{{/   with   }}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('with');
        });

        it("handlebars-utils#isBranchTag (each) test", function() {
            var s = "{{#each xxx}}";
            var r = util.isBranchTag(s);
            expect(r).to.equal('each');
            s = "{{#   each   xxx}}";
            r = util.isBranchTag(s);
            expect(r).to.equal('each');
            s = "{{/each}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('each');
            s = "{{/   each   }}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('each');
        });

        it("handlebars-utils#isBranchTag (list) test", function() {
            var s = "{{#list xxx}}";
            var r = util.isBranchTag(s);
            expect(r).to.equal('list');
            s = "{{#   list   xxx}}";
            r = util.isBranchTag(s);
            expect(r).to.equal('list');
            s = "{{/list}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('list');
            s = "{{/   list   }}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('list');
        });

        it("handlebars-utils#isBranchTag (anything) test", function() {
            s = "{{tag}}xxx";
            r = util.isBranchTag(s);
            expect(r).to.equal(false);

            s = "{{#tag}}xxx";
            r = util.isBranchTag(s);
            expect(r).to.equal("tag");
            s = "{{#   tag}}xxx";
            r = util.isBranchTag(s);
            expect(r).to.equal("tag");
            s = "{{#   tag   }}xxx";
            r = util.isBranchTag(s);
            expect(r).to.equal("tag");
            s = "{{#   tag   xxx}}xxx";
            r = util.isBranchTag(s);
            expect(r).to.equal("tag");
            s = "{{#   tag   xxx   }}xxx";
            r = util.isBranchTag(s);
            expect(r).to.equal("tag");

            s = "{{/tag}}xxx";
            r = util.isBranchEndTag(s);
            expect(r).to.equal("tag");
            s = "{{/   tag}}xxx";
            r = util.isBranchEndTag(s);
            expect(r).to.equal("tag");
            s = "{{/   tag   }}xxx";
            r = util.isBranchEndTag(s);
            expect(r).to.equal("tag");
        });

        it("handlebars-utils#isBranchTag (negation ^msg) test", function() {
            var s = "{{^msg}}";
            var r = util.isBranchTag(s);
            expect(r).to.equal('msg');
            s = "{{^   msg    }}";
            r = util.isBranchTag(s);
            expect(r).to.equal('msg');
            s = "{{/msg}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('msg');
            s = "{{/   msg    }}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('msg');
        });

        it("handlebars-utils#isBranchTag (illegal tag format) test", function() {
            s = "{{#   t-ag   xxx}}xxx";
            r = util.isBranchTag(s);
            expect(r).to.equal("t-ag");
            s = "{{/   t-ag   }}xxx";
            r = util.isBranchEndTag(s);
            expect(r).to.equal("t-ag");
        });

        it("handlebars-utils#isBranchTag (unless) test", function() {
            var s = "{{#unless xxx}}";
            var r = util.isBranchTag(s);
            expect(r).to.equal('unless');
            s = "{{#unless xxx}}{{#unless xxx}}";
            r = util.isBranchTag(s);
            expect(r).to.equal('unless');
            s = "{{#unless xxx}} xxx {{#unless xxx}}";
            r = util.isBranchTag(s);
            expect(r).to.equal('unless');
            s = "{{#   unless xxx}}";
            r = util.isBranchTag(s);
            expect(r).to.equal('unless');

            s = "{{/unless}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('unless');
            s = "{{/unless}}{{/unless}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('unless');
            s = "{{/unless}} xxx {{/unless}}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('unless');
            s = "{{/   unless   }}";
            r = util.isBranchEndTag(s);
            expect(r).to.equal('unless');
        });

        it("handlebars-utils#isElseTag test", function() {
            var s = "{{else}}";
            var r = util.isElseTag(s);
            expect(r).to.equal(true);
            s = "{{   else   }}";
            r = util.isElseTag(s);
            expect(r).to.equal(true);
            s = "{{else}}{{else}}";
            r = util.isElseTag(s);
            expect(r).to.equal(true);
            s = "{{else}} xxxx {{else}}";
            r = util.isElseTag(s);
            expect(r).to.equal(true);
        });

        it("handlebars-utils#isBranchTags test", function() {
            var s = "{{#if xxx}}";
            var r = util.isBranchTags(s);
            expect(r).to.equal(true);

            s = "{{#with}}";
            r = util.isBranchTags(s);
            expect(r).to.equal(true);

            s = "{{#each}}";
            r = util.isBranchTags(s);
            expect(r).to.equal(true);

            s = "{{#list}}";
            r = util.isBranchTags(s);
            expect(r).to.equal(true);

            s = "{{#tag}}";
            r = util.isBranchTags(s);
            expect(r).to.equal(true);

            s = "{{^msg}}";
            r = util.isBranchTags(s);
            expect(r).to.equal(true);

            s = "{{#unless}}";
            r = util.isBranchTags(s);
            expect(r).to.equal(true);

            s = "{{else}}";
            r = util.isBranchTags(s);
            expect(r).to.equal(false);
        });

        it("handlebars-utils - extract basic Handlebars {{#if xxx}} statement test", function() {
            var s = "{{#if xxx}} a {{/if}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#if xxx}} a {{\/if}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#if xxx}} statement with {{else}} test", function() {
            var s = "{{#if xxx}} a {{else}} b {{/if}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#if xxx}} a {{else}} b {{\/if}}');
        });

        it("handlebars-utils - extract nested Handlebars {{#if xxx}} statement test", function() {
            var s = "{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} h {{/if}} i {{/if}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} h {{/if}} i {{/if}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#with xxx}} statement test", function() {
            var s = "{{#with xxx}} a {{/with}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#with xxx}} a {{\/with}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#with xxx}} statement with {{else}} test", function() {
            var s = "{{#with xxx}} a {{else}} b {{/with}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#with xxx}} a {{else}} b {{\/with}}');
        });

        it("handlebars-utils - extract nested Handlebars {{#with xxx}} statement test", function() {
            var s = "{{#with xxx}} a {{#with}} b {{else}} c {{/with}} d {{else}} e {{#with}} f {{else}} h {{/with}} i {{/with}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#with xxx}} a {{#with}} b {{else}} c {{/with}} d {{else}} e {{#with}} f {{else}} h {{/with}} i {{/with}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#each xxx}} statement test", function() {
            var s = "{{#each xxx}} a {{/each}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#each xxx}} a {{\/each}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#each xxx}} statement with {{else}} test", function() {
            var s = "{{#each xxx}} a {{else}} b {{/each}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#each xxx}} a {{else}} b {{\/each}}');
        });

        it("handlebars-utils - extract nested Handlebars {{#each xxx}} statement test", function() {
            var s = "{{#each xxx}} a {{#each}} b {{else}} c {{/each}} d {{else}} e {{#each}} f {{else}} h {{/each}} i {{/each}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#each xxx}} a {{#each}} b {{else}} c {{/each}} d {{else}} e {{#each}} f {{else}} h {{/each}} i {{/each}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#list xxx}} statement test", function() {
            var s = "{{#list xxx}} a {{/list}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#list xxx}} a {{\/list}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#list xxx}} statement with {{else}} test", function() {
            var s = "{{#list xxx}} a {{else}} b {{/list}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#list xxx}} a {{else}} b {{\/list}}');
        });

        it("handlebars-utils - extract nested Handlebars {{#list xxx}} statement test", function() {
            var s = "{{#list xxx}} a {{#list yyy}} b {{else}} c {{/list}} d {{else}} e {{#list zzz}} f {{else}} h {{/list}} i {{/list}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#list xxx}} a {{#list yyy}} b {{else}} c {{/list}} d {{else}} e {{#list zzz}} f {{else}} h {{/list}} i {{/list}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#tag xxx}} statement test", function() {
            var s = "{{#tag xxx}} a {{/tag}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#tag xxx}} a {{\/tag}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#tag xxx}} statement with {{else}} test", function() {
            var s = "{{#tag xxx}} a {{else}} b {{/tag}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#tag xxx}} a {{else}} b {{\/tag}}');
        });

        it("handlebars-utils - extract nested Handlebars {{#tag xxx}} statement test", function() {
            var s = "{{#tag xxx}} a {{#tag yyy}} b {{else}} c {{/tag}} d {{else}} e {{#tag zzz}} f {{else}} h {{/tag}} i {{/tag}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#tag xxx}} a {{#tag yyy}} b {{else}} c {{/tag}} d {{else}} e {{#tag zzz}} f {{else}} h {{/tag}} i {{/tag}}');
        });

        it("handlebars-utils - extract basic Handlebars {{^msg}} statement test", function() {
            var s = "{{^msg}} a {{/msg}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{^msg}} a {{\/msg}}');
        });

        it("handlebars-utils - extract basic Handlebars {{^msg}} statement with {{else}} test", function() {
            var s = "{{^msg}} a {{else}} b {{/msg}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{^msg}} a {{else}} b {{\/msg}}');
        });

        it("handlebars-utils - extract nested Handlebars {{^msg}} statement test", function() {
            var s = "{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} h {{/msg}} i {{/msg}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} h {{/msg}} i {{/msg}}');
        });

        it("handlebars-utils - extract basic Handlebars {{#unless xxx}} statement test", function() {
            var s = "{{#unless xxx}} a {{/unless}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#unless xxx}} a {{\/unless}}');
        });

        it("handlebars-utils - extract nested Handlebars {{#unless xxx}} statement test", function() {
            var s = "{{#unless xxx}} a {{#unless xxx}} b {{/unless}} c {{/unless}} zzzzzzzz";
            var r = util.extractBranchStmt(s, 0, false);
            expect(r['stmt']).to.equal('{{#unless xxx}} a {{#unless xxx}} b {{/unless}} c {{/unless}}');
        });

        it("handlebars-utils - extract nested Handlebars {{#unless xxx}} statement exception test", function() {
            var s = "{{#if} aaaaaaaa";
            try {
                var r = util.extractBranchStmt(s, 0, false);
                expect(false).to.equal(true);
            } catch (err) {
                expect(true).to.equal(true);
            }
        });

        it("handlebars-utils - parse basic Handlebars {{#if xxx}} statement parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{/if}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{/if}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // 'empty string' (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse basic Handlebars {{#if xxx}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{else}} b {{/if}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{else}} b {{/if}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // b (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse nested Handlebars {{#if xxx}} statement parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{/if}} c {{/if}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{/if}} c {{/if}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a  b  c (1st branch)
            // a  c (1st branch)
            // 'empty string' (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse nested Handlebars {{#if xxx}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{else}} e {{#if}} f {{else}} g {{/if}} h {{/if}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a  b  d (1st branch)
            // a  c  d (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse parallel Handlebars {{#if xxx}} statement parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if xyz}} f {{else}} g {{/if}} h {{/if}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if xyz}} f {{else}} g {{/if}} h {{/if}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a  b  d  b  f (1st branch)
            // a  c  d  b  f (1st branch)
            // a  b  d  c  f (1st branch)
            // a  c  d  c  f (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse parallel Handlebars {{#if}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if}} f {{else}} g {{/if}} h {{#if}} 1 {{else}} 2 {{/if}} h {{/if}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{#if xxx}} a {{#if}} b {{else}} c {{/if}} d {{#if}} b {{else}} c {{/if}} f {{else}} e {{#if}} f {{else}} g {{/if}} h {{#if}} 1 {{else}} 2 {{/if}} h {{/if}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
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

        it("handlebars-utils - parse basic Handlebars {{^msg}} statement parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{/msg}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{/msg}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // b (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse basic Handlebars {{^msg}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{else}} b {{/msg}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{else}} b {{/msg}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a (1st branch)
            // b (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse nested Handlebars {{^msg}} statement parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{/msg}} c {{/msg}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{/msg}} c {{/msg}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a  b  c (1st branch)
            // a  c (1st branch)
            // 'empty string' (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse nested Handlebars {{^msg}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a  b  d (1st branch)
            // a  c  d (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse parallel Handlebars {{^msg}} statement parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{/msg}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
            // a  b  d  b  f (1st branch)
            // a  c  d  b  f (1st branch)
            // a  b  d  c  f (1st branch)
            // a  c  d  c  f (1st branch)
            // e  f  h (2nd branch)
            // e  g  h (2nd branch)
            expect(r.lastStates[0]).to.equal(39);
            expect(r.lastStates[1]).to.equal(39);
        });

        it("handlebars-utils - parse parallel Handlebars {{^msg}} statement with {{else}} parseAstTreeState test", function() {
            var s = "<a href='{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{^msg}} 1 {{else}} 2 {{/msg}} h {{/msg}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            expect(obj.stmt).to.equal('{{^msg}} a {{^msg}} b {{else}} c {{/msg}} d {{^msg}} b {{else}} c {{/msg}} f {{else}} e {{^msg}} f {{else}} g {{/msg}} h {{^msg}} 1 {{else}} 2 {{/msg}} h {{/msg}}');
            var ast = util.parseBranchStmt(obj.stmt);
            var r = util.parseAstTreeState(ast, 39, obj);
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

        it("handlebars-utils - parse basic Handlebars {{#if xxx}} broken statement with {{else}} parseAstTreeState exception test", function() {
            var s = "<a href='{{#if xxx}} a {{else}} b'> {{/if}}'>";
            var obj = util.extractBranchStmt(s, 9, true);
            var ast = util.parseBranchStmt(obj.stmt);
            try {
                var r = util.parseAstTreeState(ast, 39, obj);
                expect(false).to.equal(true);
            } catch (err) {
                expect(true).to.equal(true);
            }
        });

    });

}());
