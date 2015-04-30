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
        cssParser = require("../../src/css-parser.js");

    describe("CSS Parser test suite", function() {

        it("CSS Style Value Attribute HTML entities decode test", function() {
            testPatterns.cssStyleAttributeValuePatterns1.forEach(function(testObj) {
                var r = cssParser.htmlStyleAttributeValueEntitiesDecode(testObj.css);
                expect(testObj.result).to.equal(r);
            });
        });

        it("CSS Style Value Attribute HTML test", function() {
            testPatterns.cssStyleAttributeValuePatterns2.forEach(function(testObj) {
                var r = cssParser.parseStyleAttributeValue(testObj.css);
                expect(testObj.result).to.deep.equal(r);
            });
        });
    });

}());
