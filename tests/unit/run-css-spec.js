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
        testPatterns = require("../test-patterns.js"),
        cssParser = require("../../src/css-parser/css-parser.js"),
        cssParserUtils = require("../../src/css-utils.js"),
        HtmlDecoder = require("html-decoder");

    describe("CSS Parser test suite", function() {

        it("CSS Style Value Attribute HTML entities decode test", function() {
            testPatterns.cssHtmlEntitiesPattern.forEach(function(testObj) {
                var r = HtmlDecoder.decode(testObj.html);
                expect(testObj.result).to.equal(r);
            });
            testPatterns.cssStyleAttributeValuePatterns1.forEach(function(testObj) {
                var r = HtmlDecoder.decode(testObj.css);
                expect(testObj.result).to.equal(r);
            });
        });

        it("CSS Style Value Attribute Partial Parser test", function() {
            testPatterns.cssStyleAttributeValuePatterns2.forEach(function(testObj) {
                var r;
                try {
                    r = cssParser.parse(testObj.css);
                    expect(testObj.result).to.deep.equal(r);
                } catch (err) {
                    expect(err.message).to.match(/Parse error/);
                    if (err.message.match(/Parse error/)) {
                        expect(testObj.result[0].type).to.equal(cssParserUtils.STYLE_ATTRIBUTE_ERROR);
                    }
                }
            });
        });

        it("CSS Style Value Attribute CSS Parser Utils parseStyleAttributeValue test", function() {
            testPatterns.cssStyleAttributeValuePatterns2.forEach(function(testObj) {
                var r,
                    obj = testObj.result[testObj.result.length-1]; 
                try {
                    r = cssParserUtils.parseStyleAttributeValue(testObj.css);
                    expect(obj.type).to.deep.equal(r.code);
                } catch (err) {
                    expect(err.message).to.match(/Parse error/);
                    if (err.message.match(/Parse error/)) {
                        expect(obj.type).to.equal(cssParserUtils.STYLE_ATTRIBUTE_ERROR);
                    }
                }
            });
        });

    });
}());
