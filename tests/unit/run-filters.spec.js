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
        ContextParserHandlebars = require("../../src/context-parser-handlebars");

    /* 
    * the following test make sure the correct filters/helpers are added to the hbs template
    */
    describe("Handlebars Context Parser filter test suite", function() {

        it("Filter 000 - add yd filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_000.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd name}}}/);
        });

        it("Filter 001 - add yd and yc filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_001.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yc comment}}}/);
            expect(data).to.match(/{{{yd name}}}/);
        });

        it("Filter 002 - add href filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_002.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yubl \(yavd \(yufull url11\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url12\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull url13\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url14\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url15\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url16\)\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path16\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q11\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q14\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q15\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q17\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q18\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q19\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q20\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q21\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q22\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q23\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q24\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q25\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash11\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash14\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash15\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash16\)}}}/);
        });

        it("Filter 003 - add href filters to <form> test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_003.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yubl \(yavd \(yufull url11\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url12\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull url13\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url14\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url15\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url16\)\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path16\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q11\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q14\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q15\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q17\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q18\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q19\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q20\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q21\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q22\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q23\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q24\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q25\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash11\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash14\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash15\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash16\)}}}/);
        });

        it("Filter 004 - add href filters to <img> test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_004.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yubl \(yavd \(yufull url11\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url12\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull url13\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url14\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url15\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url16\)\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path16\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q11\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q14\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q15\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q17\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q18\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q19\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q20\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q21\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q22\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q23\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q24\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q25\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash11\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash14\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash15\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash16\)}}}/);
        });

        it("Filter 005 - add href filters to <button formaction> test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_005.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yubl \(yavd \(yufull url11\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url12\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull url13\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull url14\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url15\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull url16\)\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu path13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu path14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu path16\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv11\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv12\)}}}/);
            expect(data).to.match(/{{{yavd \(yu kv13\)}}}/);
            expect(data).to.match(/{{{yavs \(yu kv14\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv15\)}}}/);
            expect(data).to.match(/{{{yavu \(yu kv16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q11\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q14\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q15\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q16\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q17\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc q18\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q19\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc q20\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q21\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q22\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q23\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q24\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc q25\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash11\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash12\)}}}/);
            expect(data).to.match(/{{{yavd \(yuc hash13\)}}}/);
            expect(data).to.match(/{{{yavs \(yuc hash14\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash15\)}}}/);
            expect(data).to.match(/{{{yavu \(yuc hash16\)}}}/);
        });

        it("Filter 006 - add style filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_006.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y color11}}}/);
            expect(data).to.match(/{{{y color12}}}/);
            expect(data).to.match(/{{{y color21}}}/);
            expect(data).to.match(/{{{y color22}}}/);
            expect(data).to.match(/{{{y color31}}}/);
            expect(data).to.match(/{{{y color32}}}/);
            expect(data).to.match(/{{{y color41}}}/);
            expect(data).to.match(/{{{y color42}}}/);
            expect(data).to.match(/{{{y color43}}}/);
            expect(data).to.match(/{{{y color5}}}/);
            expect(data).to.match(/{{{y color6}}}/);
            expect(data).to.match(/{{{y color7}}}/);
            expect(data).to.match(/{{{y bgcolor1}}}/);
            expect(data).to.match(/{{{y bgcolor2}}}/);
            expect(data).to.match(/{{{y bgcolor3}}}/);
            expect(data).to.match(/{{{y bgcolor5}}}/);
            expect(data).to.match(/{{{y bgcolor6}}}/);
            expect(data).to.match(/{{{y bgcolor7}}}/);
        });

        it("Filter 007 - add ycss_quoted and ycss_unquoted filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_007.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y style1}}}/);
            expect(data).to.match(/{{{y style2}}}/);
            expect(data).to.match(/{{{y style3}}}/);
            expect(data).to.match(/{{{y style4}}}/);
            expect(data).to.match(/{{{y style5}}}/);
            expect(data).to.match(/{{{y style6}}}/);
        });

        it("Filter 008 - add y filters to <script> tag test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_008.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y arg11}}}/);
            expect(data).to.match(/{{{y arg12}}}/);
            expect(data).to.match(/{{{y arg13}}}/);
        });

        it("Filter 009 - add yav_xxx filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_009.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yavd class1}}}/);
            expect(data).to.match(/{{{yavs class2}}}/);
            expect(data).to.match(/{{{yavu class3}}}/);
            expect(data).to.match(/{{{yavd class4}}}/);
            expect(data).to.match(/{{{yavs class5}}}/);
            expect(data).to.match(/{{{yavu class6}}}/);
            expect(data).to.match(/{{{yavu class7}}}/);
        });

        it("Filter 010 - add yavu filters to border test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_010.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yavu border}}}/);
        });

        it("Filter 011 - add y filter to onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_011.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y arg1}}}/);
            expect(data).to.match(/{{{y arg2}}}/);
            expect(data).to.match(/{{{y arg3}}}/);
            expect(data).to.match(/{{{y arg4}}}/);
            expect(data).to.match(/{{{y arg5}}}/);
            expect(data).to.match(/{{{y arg6}}}/);
            expect(data).to.match(/{{{y arg7}}}/);
            expect(data).to.match(/{{{y arg8}}}/);
            expect(data).to.match(/{{{y arg9}}}/);
        });

        it("Filter 012 - add y filters to onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_012.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y arg1}}}/);
            expect(data).to.match(/{{{y arg2}}}/);
            expect(data).to.match(/{{{y arg3}}}/);
            expect(data).to.match(/{{{y arg4}}}/);
            expect(data).to.match(/{{{y arg5}}}/);
            expect(data).to.match(/{{{y arg6}}}/);
            expect(data).to.match(/{{{y arg7}}}/);
            expect(data).to.match(/{{{y arg8}}}/);
            expect(data).to.match(/{{{y arg9}}}/);
            expect(data).to.match(/{{{y arg10}}}/);
            expect(data).to.match(/{{{y arg11}}}/);
            expect(data).to.match(/{{{y arg12}}}/);
            expect(data).to.match(/{{{y arg13}}}/);
            expect(data).to.match(/{{{y arg14}}}/);
            expect(data).to.match(/{{{y arg15}}}/);
            expect(data).to.match(/{{{y arg16}}}/);
            expect(data).to.match(/{{{y arg17}}}/);
            expect(data).to.match(/{{{y arg18}}}/);
            expect(data).to.match(/{{{y arg19}}}/);
            expect(data).to.match(/{{{y arg20}}}/);
            expect(data).to.match(/{{{y arg21}}}/);
            expect(data).to.match(/{{{y arg22}}}/);
            expect(data).to.match(/{{{y arg23}}}/);
            expect(data).to.match(/{{{y arg24}}}/);
            expect(data).to.match(/{{{y arg25}}}/);
            expect(data).to.match(/{{{y arg26}}}/);
            expect(data).to.match(/{{{y arg27}}}/);
        });

        it("Filter 013 - add y filters to quoted onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_013.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');

            expect(data).to.match(/{{{y arg10}}}/);
            expect(data).to.match(/{{{y arg11}}}/);
            expect(data).to.match(/{{{y arg12}}}/);
            expect(data).to.match(/{{{y arg13}}}/);
            expect(data).to.match(/{{{y arg14}}}/);
            expect(data).to.match(/{{{y arg15}}}/);
            expect(data).to.match(/{{{y arg16}}}/);
            expect(data).to.match(/{{{y arg17}}}/);
            expect(data).to.match(/{{{y arg18}}}/);
            expect(data).to.match(/{{{y arg19}}}/);

            expect(data).to.match(/{{{y arg20}}}/);
            expect(data).to.match(/{{{y arg21}}}/);
            expect(data).to.match(/{{{y arg22}}}/);
            expect(data).to.match(/{{{y arg23}}}/);
            expect(data).to.match(/{{{y arg24}}}/);
            expect(data).to.match(/{{{y arg25}}}/);
            expect(data).to.match(/{{{y arg26}}}/);
            expect(data).to.match(/{{{y arg27}}}/);
            expect(data).to.match(/{{{y arg28}}}/);
            expect(data).to.match(/{{{y arg29}}}/);

            expect(data).to.match(/{{{y arg30}}}/);
            expect(data).to.match(/{{{y arg31}}}/);
            expect(data).to.match(/{{{y arg32}}}/);
            expect(data).to.match(/{{{y arg33}}}/);
            expect(data).to.match(/{{{y arg34}}}/);
            expect(data).to.match(/{{{y arg35}}}/);

            expect(data).to.match(/{{{y arg36}}}/);
            expect(data).to.match(/{{{y arg37}}}/);
            expect(data).to.match(/{{{y arg38}}}/);
            expect(data).to.match(/{{{y arg39}}}/);

            expect(data).to.match(/{{{y arg40}}}/);
            expect(data).to.match(/{{{y arg41}}}/);
            expect(data).to.match(/{{{y arg42}}}/);
            expect(data).to.match(/{{{y arg43}}}/);
            expect(data).to.match(/{{{y arg44}}}/);
            expect(data).to.match(/{{{y arg45}}}/);
        });

        it("Filter 014 - add y filters unquoted onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_014.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y arg10}}}/);
            expect(data).to.match(/{{{y arg11}}}/);
            expect(data).to.match(/{{{y arg12}}}/);
            expect(data).to.match(/{{{y arg13}}}/);
            expect(data).to.match(/{{{y arg14}}}/);

            expect(data).to.match(/{{{y arg20}}}/);
            expect(data).to.match(/{{{y arg21}}}/);
            expect(data).to.match(/{{{y arg22}}}/);
            expect(data).to.match(/{{{y arg23}}}/);
            expect(data).to.match(/{{{y arg24}}}/);
            expect(data).to.match(/{{{y arg25}}}/);
            expect(data).to.match(/{{{y arg26}}}/);
        });

        it("Filter 015 - add y filters to <script> block", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_015.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y value1}}}/);
            expect(data).to.match(/{{{y value2}}}/);
            expect(data).to.match(/{{{y value3}}}/);
        });

        it("Filter 016 - add y filter to <style> block", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_016.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y fontsize}}}/);
        });

        it("Filter 018 - add y filters to quoted href test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_018.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');

            expect(data).to.match(/{{{y arg10}}}/);
            expect(data).to.match(/{{{y arg11}}}/);
            expect(data).to.match(/{{{y arg12}}}/);
            expect(data).to.match(/{{{y arg13}}}/);
            expect(data).to.match(/{{{y arg14}}}/);
            expect(data).to.match(/{{{y arg15}}}/);
            expect(data).to.match(/{{{y arg16}}}/);
            expect(data).to.match(/{{{y arg17}}}/);
            expect(data).to.match(/{{{y arg18}}}/);
            expect(data).to.match(/{{{y arg19}}}/);

            expect(data).to.match(/{{{y arg20}}}/);
            expect(data).to.match(/{{{y arg21}}}/);
            expect(data).to.match(/{{{y arg22}}}/);
            expect(data).to.match(/{{{y arg23}}}/);
            expect(data).to.match(/{{{y arg24}}}/);
            expect(data).to.match(/{{{y arg25}}}/);
            expect(data).to.match(/{{{y arg26}}}/);
            expect(data).to.match(/{{{y arg27}}}/);
            expect(data).to.match(/{{{y arg28}}}/);
            expect(data).to.match(/{{{y arg29}}}/);

            expect(data).to.match(/{{{y arg30}}}/);
            expect(data).to.match(/{{{y arg31}}}/);
            expect(data).to.match(/{{{y arg32}}}/);
            expect(data).to.match(/{{{y arg33}}}/);
            expect(data).to.match(/{{{y arg34}}}/);
            expect(data).to.match(/{{{y arg35}}}/);

            expect(data).to.match(/{{{y arg36}}}/);
            expect(data).to.match(/{{{y arg37}}}/);
            expect(data).to.match(/{{{y arg38}}}/);
            expect(data).to.match(/{{{y arg39}}}/);

            expect(data).to.match(/{{{y vbarg10}}}/);
            expect(data).to.match(/{{{y vbarg11}}}/);
            expect(data).to.match(/{{{y vbarg12}}}/);
            expect(data).to.match(/{{{y vbarg13}}}/);
            expect(data).to.match(/{{{y vbarg14}}}/);
            expect(data).to.match(/{{{y vbarg15}}}/);
            expect(data).to.match(/{{{y vbarg16}}}/);
            expect(data).to.match(/{{{y vbarg17}}}/);
            expect(data).to.match(/{{{y vbarg18}}}/);
            expect(data).to.match(/{{{y vbarg19}}}/);

            expect(data).to.match(/{{{y vbarg20}}}/);
            expect(data).to.match(/{{{y vbarg21}}}/);
            expect(data).to.match(/{{{y vbarg22}}}/);
            expect(data).to.match(/{{{y vbarg23}}}/);
            expect(data).to.match(/{{{y vbarg24}}}/);
            expect(data).to.match(/{{{y vbarg25}}}/);
            expect(data).to.match(/{{{y vbarg26}}}/);
            expect(data).to.match(/{{{y vbarg27}}}/);
            expect(data).to.match(/{{{y vbarg28}}}/);
            expect(data).to.match(/{{{y vbarg29}}}/);

            expect(data).to.match(/{{{y vbarg30}}}/);
            expect(data).to.match(/{{{y vbarg31}}}/);
            expect(data).to.match(/{{{y vbarg32}}}/);
            expect(data).to.match(/{{{y vbarg33}}}/);
            expect(data).to.match(/{{{y vbarg34}}}/);
            expect(data).to.match(/{{{y vbarg35}}}/);

            expect(data).to.match(/{{{y vbarg36}}}/);
            expect(data).to.match(/{{{y vbarg37}}}/);
            expect(data).to.match(/{{{y vbarg38}}}/);
            expect(data).to.match(/{{{y vbarg39}}}/);

            expect(data).to.match(/{{{yubl \(yavd \(yufull arg40\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull arg41\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull arg42\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavd \(yufull arg43\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavs \(yufull arg44\)\)}}}/);
            expect(data).to.match(/{{{yubl \(yavu \(yufull arg45\)\)}}}/);
        });

        it("Filter 019 - add y filters unquoted href test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_019.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{y arg10}}}/);
            expect(data).to.match(/{{{y arg11}}}/);
            expect(data).to.match(/{{{y arg12}}}/);
            expect(data).to.match(/{{{y arg13}}}/);
            expect(data).to.match(/{{{y arg14}}}/);

            expect(data).to.match(/{{{y arg20}}}/);
            expect(data).to.match(/{{{y arg21}}}/);
            expect(data).to.match(/{{{y arg22}}}/);
            expect(data).to.match(/{{{y arg23}}}/);
            expect(data).to.match(/{{{y arg24}}}/);
            expect(data).to.match(/{{{y arg25}}}/);
            expect(data).to.match(/{{{y arg26}}}/);

            expect(data).to.match(/{{{y vbarg10}}}/);
            expect(data).to.match(/{{{y vbarg11}}}/);
            expect(data).to.match(/{{{y vbarg12}}}/);
            expect(data).to.match(/{{{y vbarg13}}}/);
            expect(data).to.match(/{{{y vbarg14}}}/);

            expect(data).to.match(/{{{y vbarg20}}}/);
            expect(data).to.match(/{{{y vbarg21}}}/);
            expect(data).to.match(/{{{y vbarg22}}}/);
            expect(data).to.match(/{{{y vbarg23}}}/);
            expect(data).to.match(/{{{y vbarg24}}}/);
            expect(data).to.match(/{{{y vbarg25}}}/);
            expect(data).to.match(/{{{y vbarg26}}}/);
        });

        it("Filter 020 - add yd filters to RCDATA test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_020.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            expect(data).to.match(/{{{yd title}}}/);
        });

        it("Filter - subexpression format test", function() {
            var t1 = new ContextParserHandlebars(false);
            var data = "<html><title>{{title}}</title></html>";
            t1.contextualize(data);
            var output = t1.getBuffer().join('');
            expect(output).to.match(/{{{yd title}}}/);

            var t2 = new ContextParserHandlebars(false);
            var data = "<a href='{{url}}'>link</a>";
            t2.contextualize(data);
            var output = t2.getBuffer().join('');
            expect(output).to.match(/{{{yubl \(yavs \(yufull url\)\)}}}/);
        });
    });

}());
