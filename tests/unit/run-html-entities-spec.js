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
        fs = require('fs'),
        testPatterns = require("../test-patterns.js"),
        htmlEntitiesDecoder = require("../../src/html-entities.js");

    describe("HTML Entities Decoder test suite", function() {

        var htmlEntities = new htmlEntitiesDecoder();

        it("html-entities# full test", function() {
            var f = "./data/entities.json";
            var d = fs.readFileSync(f, "utf8");
            var o = JSON.parse(d);
            // htmlEntities.buildNamedCharReferenceTrie(o);
        });

        it("html-entities# add string test", function() {
            testPatterns.htmlEntities.forEach(function(testObj) {
                htmlEntities.buildNamedCharReferenceTrie(testObj.o);
                var trie = htmlEntities.namedCharReferenceTrie;

                for (var depth in testObj.result) {
                    if (testObj.result.hasOwnProperty(depth)) {
                        var nodes = testObj.result[depth];
                    }
                }
            });
        });

    });
}());
