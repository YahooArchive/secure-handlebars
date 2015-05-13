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

        var inspectTrie = function(trie, arr, codepoint, depth, currDepth) {
            /* expect the current depth node is defined */
            expect(trie[arr[currDepth]]).to.not.equal(undefined);
            if (arr[currDepth] === 0) {
                // test for codepoints
                expect(trie[arr[currDepth]]).to.deep.equal(codepoint);
            } 
            if(currDepth < depth) {
                inspectTrie(trie[arr[currDepth]], arr, codepoint, depth, currDepth+1);
            }
        }

        it("html-entities# buildNamedCharReferenceTrie/findStringWithCodePoint test", function() {
            var htmlEntities = new htmlEntitiesDecoder();

            testPatterns.htmlEntities.forEach(function(testObj) {
                var trie = htmlEntities.namedCharReferenceTrie;

                // test for existence before build
                for (var key in testObj.o) {
                    expect(htmlEntities._findStringWithCodePoint(trie, key, 0)).to.deep.equal(testObj.result.exist);
                }

                // build and test for the data structure
                htmlEntities.buildNamedCharReferenceTrie(testObj.o);
                for (var i=0;i<testObj.result.paths.length;++i) {
                    inspectTrie(trie, testObj.result.paths[i], 
                        testObj.result.codepoints[i],
                        testObj.result.paths[i].length-1, 0);
                }
            });

            // test for existence after build
            testPatterns.htmlEntities.forEach(function(testObj) {
                var trie = htmlEntities.namedCharReferenceTrie;
                for (var key in testObj.o) {
                    expect(htmlEntities._findStringWithCodePoint(trie, key, 0)).to.not.equal(undefined);
                }
            });

            delete htmlEntities;
        });

        it("html-entities# html5 full entities test", function() {
            var f = "./data/entities.json",
                d = fs.readFileSync(f, "utf8"),
                o = JSON.parse(d),
                htmlEntities = new htmlEntitiesDecoder();

            // build the tree
            htmlEntities.buildNamedCharReferenceTrie(o);

            for (var str in o) {
                if (o.hasOwnProperty(str)) {
                    var info = o[str];
                    var r = htmlEntities.findString(str);
                    expect(r).to.deep.equal(info.codepoints);
                }
            }

            testPatterns.htmlEntitiesFindString.forEach(function(testObj) {
                var r = htmlEntities.findString(testObj.str);
                expect(r).to.deep.equal(testObj.result.codepoints);
            });

            delete htmlEntities;
        });

        it("html-entities# saveNamedCharReferenceTrie entities test", function() {
            var f = "./data/entities.json",
                d = fs.readFileSync(f, "utf8"),
                o = JSON.parse(d),
                htmlEntities = new htmlEntitiesDecoder();

            // build the tree
            htmlEntities.buildNamedCharReferenceTrie(o);
            
            var saveFile = "./data/entities.json.test";
            if (fs.existsSync(saveFile))
                fs.unlinkSync(saveFile);
            htmlEntities.saveNamedCharReferenceTrie(saveFile);
            expect(fs.existsSync(saveFile)).to.equal(true);

            delete htmlEntities;
        });

        it("html-entities# loadNamedCharReferenceTrie entities test", function() {
            var saveFile = "./data/entities.json.test",
                htmlEntities = new htmlEntitiesDecoder();

            var f = "./data/entities.json",
                d = fs.readFileSync(f, "utf8"),
                o = JSON.parse(d);

            expect(fs.existsSync(f)).to.equal(true);
            expect(fs.existsSync(saveFile)).to.equal(true);
            htmlEntities.loadNamedCharReferenceTrie(saveFile);

            for (var str in o) {
                if (o.hasOwnProperty(str)) {
                    var info = o[str];
                    var r = htmlEntities.findString(str);
                    expect(r).to.deep.equal(info.codepoints);
                }
            }

            if (fs.existsSync(saveFile))
                fs.unlinkSync(saveFile);
            delete htmlEntities;
        });
    });
}());
