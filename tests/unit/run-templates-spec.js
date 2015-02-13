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
        expect = require('expect.js');

    describe("Handlebars Context Parser template test suite", function() {

        it("Template 000 - basic {{expression}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_000.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd name}}}/);
        });

        it("Template 001 - basic raw {{{expression}}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_001.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{name}}}/);
        });

        it("Template 002 - basic block {{#expression}} {{/expression}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_002.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{#list people}}{{{yd firstName}}} {{{yd lastName}}}{{\/list}}/);
        });

        it("Template 003 - {{ expression}} with space test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_003.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd  name}}}/);
        });

        it("Template 004 - broken open brace {  {expression}} test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_004.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{  {name}}/);
        });

        it("Template 005 - {{#with}} helper test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_005.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{#with story}}/);
            expect(data).to.match(/<div class="intro">{{{yd intro}}}<\/div>/);
            expect(data).to.match(/<div class="body">{{{yd body}}}<\/div>/);
            expect(data).to.match(/{{\/with}}/);
        });

        it("Template 006 - {{#with}} helper with space test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_006.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{#   with story}}/);
            expect(data).to.match(/<div class="intro">{{{yd intro}}}<\/div>/);
            expect(data).to.match(/<div class="body">{{{yd body}}}<\/div>/);
            expect(data).to.match(/{{\/with}}/);
        });

        it("Template 007 - comment markup test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_007.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{!--    comment1  --}}/);
            expect(data).to.match(/{{!--    comment2  }}/);
            expect(data).to.match(/{{! comment3 }}/);
        });

        it("Template 008 - {{>partial}} template test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_008.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{>html_header}}/);
            expect(data).to.match(/{{>header}}/);
            expect(data).to.match(/{{>footer}}/);
            expect(data).to.match(/{{>html_footer}}/);
        });

        it("Template 009 - subexpression test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_009.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd \(outer-helper1 \(inner-helper1 'abc'\) 'def'\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull \(outer-helper2 \(inner-helper2 'abc'\) 'def'\)\)\)}}}/);
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
            expect(data).to.match(/{{else}}/);
            expect(data).to.not.match(/{{{else}}}/);
        });

        it("Template 011 - attribute name state test", function() {
            var file = "./tests/samples/files/handlebarsjs_template_011.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yavd classname}}}/);
            expect(data).to.match(/{{{yavd index_active}}}/);
            expect(data).to.match(/{{{yavd safejstemplating_active1}}}/);
            expect(data).to.match(/{{{y safejstemplating_active2}}}/);
        });

        it("Template 012 - quoted attribute value after unquoted attribute test ", function() {
            var file = "./tests/samples/files/handlebarsjs_template_012.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd html}}/);
            expect(data).to.match(/{{{yavu SELECTED1}}}/);
            expect(data).to.match(/{{{yavu SELECTED21}}}/);
            expect(data).to.match(/{{{yavu SELECTED22}}}/);
            expect(data).to.match(/{{{yavd SELECTED3}}}/);
            expect(data).to.match(/{{{yavd SELECTED4}}}/);
            expect(data).to.match(/{{{yd NAME1}}}/);
            expect(data).to.match(/{{{yd NAME2}}}/);
            expect(data).to.match(/{{{yd NAME3}}}/);
            expect(data).to.match(/{{{yd NAME4}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull URL1\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull URL2\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull URL3\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull URL4\)\)}}}/);
            expect(data).to.match(/{{{yc COMMENT1}}}/);
            expect(data).to.match(/{{{yc COMMENT2}}}/);
            expect(data).to.match(/{{{y ATTR1}}}/);
        });

        it("Template 013 - {{#if}} statement test with correct filter", function() {
            var file = "./tests/samples/files/handlebarsjs_template_013.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd placeholder3}}}/);
        });

        it("Template 014 - {{#if}} statement test with output markup within if statement", function() {
            var file = "./tests/samples/files/handlebarsjs_template_014.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd placeholder1}}}/);
            expect(data).to.match(/{{{yd placeholder2}}}/);
            expect(data).to.match(/{{{yd placeholder3}}}/);
        });

        it("Template 015 - {{#if}} statement test with raw expression markup within if statement", function() {
            var file = "./tests/samples/files/handlebarsjs_template_015.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{placeholder1}}}/);
            expect(data).to.match(/{{{placeholder2}}}/);
            expect(data).to.match(/{{{yd placeholder3}}}/);
        });

        it("Template 016 - {{#if}} statement test with iteration expression markup within if statement", function() {
            var file = "./tests/samples/files/handlebarsjs_template_016.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yavd valueA}}}/);
            expect(data).to.match(/{{{yd firstName11}}}/);
            expect(data).to.match(/{{{yd lastName12}}}/);
            expect(data).to.match(/{{{yd placeholderA}}}/);

            expect(data).to.match(/{{{yavd valueB}}}/);
            expect(data).to.match(/{{{yd firstName21}}}/);
            expect(data).to.match(/{{{yd lastName22}}}/);
            expect(data).to.match(/{{{yd placeholderB}}}/);

            expect(data).to.match(/{{{yavd valueC}}}/);
            expect(data).to.match(/{{{yd firstName31}}}/);
            expect(data).to.match(/{{{yd lastName32}}}/);
            expect(data).to.match(/{{{yd placeholderC}}}/);

            expect(data).to.match(/{{{yavd valueD}}}/);
            expect(data).to.match(/{{{yd firstName41}}}/);
            expect(data).to.match(/{{{yd lastName42}}}/);
            expect(data).to.match(/{{{yd placeholderD}}}/);

            expect(data).to.match(/{{{yavd valueE}}}/);
            expect(data).to.match(/{{{yd firstName51}}}/);
            expect(data).to.match(/{{{yd lastName52}}}/);
            expect(data).to.match(/{{{yd placeholderE}}}/);
        });

        it("Template 020 - {{^msg}} statement test with correct filter", function() {
            var file = "./tests/samples/files/handlebarsjs_template_020.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yavd nomsg}}}/);
            expect(data).to.match(/{{{yd name}}}/);
            expect(data).to.match(/{{\^msg}}/);
            expect(data).to.match(/{{\/msg}}/);
        });

    });
}());
