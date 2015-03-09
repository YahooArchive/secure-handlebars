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
    var fs = require('fs'),
        utils = require('../utils.js'),
        expect = require('chai').expect;

    describe("Handlebars Context Parser template test suite", function() {

        it("Template 000 - basic {{expression}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_000.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yd name}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 001 - basic raw {{{expression}}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_001.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{name}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 002 - basic block {{#expression}} {{/expression}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_002.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{#list people}}{{{yd firstName}}} {{{yd lastName}}}{{\/list}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 003 - {{ expression}} with space test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_003.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yd  name}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 004 - broken open brace {  {expression}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_004.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{  {name}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 005 - {{#with}} helper test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_005.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{#with story}}/,
                /<div class="intro">{{{yd intro}}}<\/div>/,
                /<div class="body">{{{yd body}}}<\/div>/,
                /{{\/with}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 006 - {{#with}} helper with space test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_006.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{#   with story}}/,
                /<div class="intro">{{{yd intro}}}<\/div>/,
                /<div class="body">{{{yd body}}}<\/div>/,
                /{{\/with}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 007 - comment markup test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_007.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{!--    comment1  --}}/,
                /{{!--    comment2  }}   --}}/,
                /{{! comment3 }}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 008 - {{>partial}} template test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_008.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{>html_header}}/,
                /{{>header}}/,
                /{{>footer}}/,
                /{{>html_footer}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 009 - subexpression test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_009.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yd \(outer-helper1 \(inner-helper1 'abc'\) 'def'\)}}}/,
                /{{{yubl \(yavd \(yufull \(outer-helper2 \(inner-helper2 'abc'\) 'def'\)\)\)}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 010 - {{#if}} statement with yd, yattribute_value_quoted, yURI and y test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_010.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yavd SELECTED1}}}/);
            expect(data).to.match(/{{{yavd SELECTED2}}}/);
            expect(data).to.match(/{{{yavd SELECTED3}}}/);
            expect(data).to.match(/{{{yavd SELECTED4}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull URL1\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull URL2\)\)}}}/);
            expect(data).to.match(/{{{yd NAME1}}}/);
            expect(data).to.match(/{{{yd NAME2}}}/);
            expect(data).to.match(/{{{y SELECTED}}}/);
            expect(data).to.match(/{{#NAVIGATION}}/);
            expect(data).to.match(/{{\/NAVIGATION}}/);
            expect(data).to.match(/{{#if SELECTED}}/);
            expect(data).to.match(/{{\/if}}/);
        });

        it("Template 010 - known filter {{else}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_010.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{else}}/
            ];
            utils.testArrMatch(data, arr);
            expect(data).to.not.match(/{{{else}}}/);
        });

        it("Template 011 - attribute name state test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_011.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yavd classname}}}/,
                /{{{yavd index_active}}}/,
                /{{{yavd safejstemplating_active1}}}/,
                /{{{y safejstemplating_active2}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 012 - quoted attribute value after unquoted attribute test ", function() {
            var file = "./tests/samples/files/handlebarsjs_template_012.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yd html}}}/,
                /{{{yavu SELECTED1}}}/,
                /{{{yavu SELECTED21}}}/,
                /{{{yavu SELECTED22}}}/,
                /{{{yavd SELECTED3}}}/,
                /{{{yavd SELECTED4}}}/,
                /{{{yd NAME1}}}/, /{{{yd NAME2}}}/, /{{{yd NAME3}}}/, /{{{yd NAME4}}}/,
                /{{{yubl \(yavd \(yufull URL1\)\)}}}/, /{{{yubl \(yavd \(yufull URL2\)\)}}}/, /{{{yubl \(yavu \(yufull URL3\)\)}}}/, /{{{yubl \(yavu \(yufull URL4\)\)}}}/,
                /{{{yc COMMENT1}}}/, /{{{yc COMMENT2}}}/,
                /{{{y ATTR1}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 013 - {{#if}} statement test with correct filter", function() {
            var file = "./tests/samples/files/handlebarsjs_template_013.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd placeholder3}}}/);
            var arr = [
                /{{{yd placeholder3}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 014 - {{#if}} statement test with output markup within if statement", function() {
            var file = "./tests/samples/files/handlebarsjs_template_014.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yd placeholder1}}}/,
                /{{{yd placeholder2}}}/,
                /{{{yd placeholder3}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 015 - {{#if}} statement test with raw expression markup within if statement", function() {
            var file = "./tests/samples/files/handlebarsjs_template_015.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{placeholder1}}}/,
                /{{{placeholder2}}}/,
                /{{{yd placeholder3}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 016 - {{#if}} statement test with iteration expression markup within if statement", function() {
            var file = "./tests/samples/files/handlebarsjs_template_016.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // {{{#list}}
                /{{{yavd valueA}}}/, /{{{yd firstName11}}}/, /{{{yd lastName12}}}/, /{{{yd placeholderA}}}/,
                // {{{#each}}
                /{{{yavd valueB}}}/, /{{{yd firstName21}}}/, /{{{yd lastName22}}}/, /{{{yd placeholderB}}}/,
                // {{{#with}}
                /{{{yavd valueC}}}/, /{{{yd firstName31}}}/, /{{{yd lastName32}}}/, /{{{yd placeholderC}}}/,
                // {{{#tag}}
                /{{{yavd valueD}}}/, /{{{yd firstName41}}}/, /{{{yd lastName42}}}/, /{{{yd placeholderD}}}/,
                // {{{#unless}}
                /{{{yavd valueE}}}/, /{{{yd firstName51}}}/, /{{{yd lastName52}}}/, /{{{yd placeholderE}}}/,
            ];
            utils.testArrMatch(data, arr);
        });

        it("Template 020 - {{^msg}} statement test with correct filter", function() {
            var file = "./tests/samples/files/handlebarsjs_template_020.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yavd nomsg}}}/,
                /{{{yd name}}}/,
                /{{\^msg}}/,
                /{{\/msg}}/
            ];
            utils.testArrMatch(data, arr);
        });

/*
        it("Template 023 - {{raw block}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_023.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{foo}}/,
                /{{rawblock}}/,
                /{{\/rawblock}}/,
            ];
            utils.testArrMatch(data, arr);
        });
*/
    });
}());
