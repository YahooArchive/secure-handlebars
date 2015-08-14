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

    describe("handlebars-utils test suite", function() {

        /* lookBackTest */
        it("handlebars-utils#lookBacktest", function() {
            [
                {str:'{{xxxxxxxx       ', pos:0, type:handlebarsUtils.NOT_ESCAPED_MUSTACHE},
                {str:'\\{{xxxxxxxx     ', pos:1, type:handlebarsUtils.SINGLE_ESCAPED_MUSTACHE},
                {str:'\\\\{{xxxxxxxx   ', pos:2, type:handlebarsUtils.DOUBLE_ESCAPED_MUSTACHE},

                {str:'\\{{xxxxxxxx     ', pos:0, type:handlebarsUtils.UNHANDLED_EXPRESSION},
                {str:'\\\\{{xxxxxxxx   ', pos:0, type:handlebarsUtils.UNHANDLED_EXPRESSION},

                {str:'\\\\\\{{xxxxxxxx ', pos:3, type:handlebarsUtils.DOUBLE_ESCAPED_MUSTACHE},
            ].forEach(function(testObj) {
                var r = handlebarsUtils.lookBackTest(testObj.str, testObj.pos);
                expect(r).to.equal(testObj.type);
            });
        });

        /* lookAheadTest */
        it("handlebars-utils#lookAheadTest test", function() {
            [
                {str:'{{#xxxxxxxx   ', type:handlebarsUtils.BRANCH_EXPRESSION},
                {str:'{{^xxxxxxxx   ', type:handlebarsUtils.BRANCH_EXPRESSION},
                {str:'{{^}}',          type:handlebarsUtils.ELSE_EXPRESSION},
                {str:'{{else}}',       type:handlebarsUtils.ELSE_EXPRESSION},
                {str:'{{/xxxxxxxx   ', type:handlebarsUtils.BRANCH_END_EXPRESSION},
                {str:'{{>xxxxxxxx   ', type:handlebarsUtils.PARTIAL_EXPRESSION},
                {str:'{{!--xxxxxx   ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM},
                {str:'{{!xxxxxxxx   ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM},

                {str:'{{~#xxxxxxxx  ', type:handlebarsUtils.BRANCH_EXPRESSION},
                {str:'{{~^xxxxxxxx  ', type:handlebarsUtils.BRANCH_EXPRESSION},
                {str:'{{~^~}}',        type:handlebarsUtils.ELSE_EXPRESSION},
                {str:'{{~else~}}',     type:handlebarsUtils.ELSE_EXPRESSION},
                {str:'{{~/xxxxxxxx  ', type:handlebarsUtils.BRANCH_END_EXPRESSION},
                {str:'{{~>xxxxxxxx  ', type:handlebarsUtils.PARTIAL_EXPRESSION},
                {str:'{{~!--xxxxxx  ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM},
                {str:'{{~!xxxxxxxx  ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM},
            ].forEach(function(testObj) {
                var r = handlebarsUtils.lookAheadTest(testObj.str, 0);
                expect(r).to.equal(testObj.type);
            });
        });

        /* isValidExpression rawExpressionRegExp test */
        it("handlebars-utils#isValidExpression rawExpressionRegExp test", function() {
            testPatterns.rawExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });

        /* isValidExpression rawBlockRegExp test
           Please refer to "handlebars {{{{raw block}}}} test" in run-handlebars-3.0-spec.js */
        it("handlebars-utils#isValidExpression rawBlockRegExp test", function() {
            testPatterns.rawBlockTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                if (r.result) {
                    expect(r.result).to.equal(testObj.result[1]);
                } else {
                    expect(r.result).to.equal(testObj.result[1]);
                    expect(r.tag).to.equal(testObj.rstr);
                }
            });
            testPatterns.rawEndBlockTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });

        /* isValidExpression escapeExpressionRegExp test */
        it("handlebars-utils#isValidExpression escapeExpressionRegExp test", function() {
            testPatterns.escapeExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
                expect(r.isSingleID).to.equal(testObj.isSingleID);
            });
        });

        /* isValidExpression referenceExpressionRegExp test */
        it("handlebars-utils#isValidExpression referenceExpressionRegExp test", function() {
            testPatterns.referenceExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });
   
        /* isValidExpression partialExpressionRegExp test */
        it("handlebars-utils#isValidExpression partialExpressionRegExp test", function() {
            testPatterns.partialExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });
   
        /* isValidExpression branchExpressionRegExp test */
        it("handlebars-utils#isValidExpression branchExpressionRegExp test", function() {
            testPatterns.branchExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });

        /* isValidExpression branchEndExpressionRegExp test */
        it("handlebars-utils#isValidExpression branchEndExpressionRegExp test", function() {
            testPatterns.branchEndExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });

        /* isValidExpression elseExpressionRegExp test */
        it("handlebars-utils#isValidExpression elseExpressionRegExp test", function() {
            testPatterns.elseExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });

        /* isValidExpression commentExpressionRegExp test */
        it("handlebars-utils#isValidExpression commentExpressionRegExp test", function() {
            testPatterns.commentExpressionTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isValidExpression(testObj.syntax, 0, testObj.type);
                expect(r.result).to.equal(testObj.result[1]);
                expect(r.tag).to.equal(testObj.rstr);
            });
        });

        /* isReservedChar test */
        it("handlebars-utils#isReservedChar test", function() {
            /* reserved char we care about */
            [
                '#', '/', '>', '^', '!', '&',
                '~#', '~/', '~>', '~^', '~!', '~&',
            ].forEach(function(testObj) {
                var r = handlebarsUtils.isReservedChar(testObj, 0);
                expect(r).to.equal(true);
            });
            /* reserved char we don't care about */
            [
                ' ', '"', '%', "'", '(', ')', '*', '+', ',', '.', '<', '=', '@', '[', ']', '`', '{', '|', '}',
                '~ ', '~"', '~%', "~'", '~(', '~)', '~*', '~+', '~,', '~.', '~<', '~=', '~@', '~[', '~]', '~`', '~{', '~|', '~}',
            ].forEach(function(testObj) {
                var r = handlebarsUtils.isReservedChar(testObj, 0);
                expect(r).to.equal(false);
            });
        });

        /* handleError test */
        it("handlebars-utils#handleError test", function() {
            // no need to test it directly.
        });

        /* isScriptableTag test */
        it("handlebars-utils#isScriptableTag test", function() {
            testPatterns.scriptableTagTestPatterns.forEach(function(testObj) {
                var r = handlebarsUtils.isScriptableTag(testObj.tag);
                expect(r).to.equal(testObj.result);
            });
        });
    });
}());
