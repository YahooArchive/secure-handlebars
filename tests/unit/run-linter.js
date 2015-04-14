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
        ContextParserLinter = require("../../src/context-parser-linter.js");

    var config = {};

    describe("Context Parser Linter Test Suite", function() {

        it("null character replacement test", function() {
            var linter = new ContextParserLinter(config);
            var input = "\x00null\x00";
            linter.contextualize(input);
            var output = linter.getOutput();
            expect(output).to.equal("\ufffdnull\ufffd");
        });
    });
}());
