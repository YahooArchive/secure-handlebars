/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com, neraliu@gmail.com>
*/
(function () {

    require("mocha");
    var expect = require('chai').expect,
        fs = require('fs'),
        testPatterns = require("../test-patterns-html-decoder.js");
        htmlEntitiesDecoder = require("../../src/html-decoder/html-decoder.js");

    describe("HTML Entities Decoder test suite", function() {

        var inspectTrie = function(trie, arr, codepoint, depth, currDepth) {
            expect(trie[arr[currDepth]]).to.not.equal(undefined);
            if (arr[currDepth] === 0) {
                // test for codepoints
                expect(trie[arr[currDepth]].codepoints).to.deep.equal(codepoint);
            } 
            if(currDepth < depth) {
                inspectTrie(trie[arr[currDepth]], arr, codepoint, depth, currDepth+1);
            }
        }

        it("html-entities# buildNamedCharReferenceTrie/findStringFromRoot test", function() {
            var decoder = new htmlEntitiesDecoder({load:false});

            testPatterns.htmlEntities.forEach(function(testObj) {
                var trie = decoder.namedCharReferenceTrie;

                // build and test for the data structure
                decoder.buildNamedCharReferenceTrie(testObj.o);

                for (var i=0;i<testObj.result.paths.length;++i) {
                    inspectTrie(trie, testObj.result.paths[i], 
                        testObj.result.codepoints[i],
                        testObj.result.paths[i].length-1, 0);
                }
            });

            // test for existence after build
            testPatterns.htmlEntities.forEach(function(testObj) {
                var trie = decoder.namedCharReferenceTrie;
                for (var key in testObj.o) {
                    expect(decoder._findStringFromRoot(trie, key, 0)).to.not.equal(undefined);
                }
            });

            delete decoder;
        });

        it("html-entities# html5 full entities test", function() {
            var f = __dirname+"/../../data/entities.json",
                d = fs.readFileSync(f, "utf8"),
                o = JSON.parse(d),
                decoder = new htmlEntitiesDecoder({load:false});

            // build the tree
            decoder.buildNamedCharReferenceTrie(o);

            for (var str in o) {
                if (o.hasOwnProperty(str)) {
                    var info = o[str];
                    var r = decoder._findString(str);
                    expect(r.codepoints).to.deep.equal(info.codepoints);
                }
            }

            testPatterns.htmlEntitiesFindString.forEach(function(testObj) {
                var r = decoder._findString(testObj.str);
                expect(r).to.deep.equal(testObj.result);
            });

            delete decoder;
        });

        it("html-entities# saveNamedCharReferenceTrie entities test", function() {
            var f = __dirname+"/../../data/entities.json",
                d = fs.readFileSync(f, "utf8"),
                o = JSON.parse(d),
                decoder = new htmlEntitiesDecoder({load:false});

            // build the tree
            decoder.buildNamedCharReferenceTrie(o);
            
            var saveFile = __dirname+"/../../data/trie.js";
            if (fs.existsSync(saveFile))
                fs.unlinkSync(saveFile);
            decoder.saveNamedCharReferenceTrie(saveFile);
            expect(fs.existsSync(saveFile)).to.equal(true);

            delete decoder;
        });

        it("html-entities# load NamedCharReferenceTrie entities test", function() {
            var saveFile = __dirname+"/../../data/trie.js",
                decoder = new htmlEntitiesDecoder({load:false}),
                trie = require(saveFile);

            var f = __dirname+"/../../data/entities.json",
                d = fs.readFileSync(f, "utf8"),
                o = JSON.parse(d);

            expect(fs.existsSync(f)).to.equal(true);
            expect(fs.existsSync(saveFile)).to.equal(true);
            decoder.namedCharReferenceTrie = trie;

            for (var str in o) {
                if (o.hasOwnProperty(str)) {
                    var info = o[str];
                    var r = decoder._findString(str);
                    expect(r).to.deep.equal(info);
                }
            }

            if (fs.existsSync(saveFile))
                fs.unlinkSync(saveFile);
            delete decoder;
        });

        it("html-entities# encoding test", function() {
            var decoder = new htmlEntitiesDecoder();
            testPatterns.htmlEntitiesEncode.forEach(function(testObj) {
                var r = decoder.encode(testObj.str);
                expect(r).to.equal(testObj.result);
            });
            delete decoder;
        });

        it("html-entities# decoding test", function() {
            var decoder = new htmlEntitiesDecoder();
            testPatterns.htmlEntitiesDecode.forEach(function(testObj) {
                var r = decoder.decode(testObj.str);
                expect(r).to.equal(testObj.result);
            });
            delete decoder;
        });

        it("html-entities# parse error decoding test", function() {
            var decoder = new htmlEntitiesDecoder();
            testPatterns.htmlEntitiesParseErrorDecode.forEach(function(testObj) {
                var r = decoder.decode(testObj.str);
                expect(r).to.equal(testObj.result);
            });
            delete decoder;
        });
    });
}());
