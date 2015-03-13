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
        expect = require('chai').expect,
        utils = require('../utils.js'),
        ContextParserHandlebars = require("../../src/context-parser-handlebars");

    var config = {};
    config.printCharEnable = false;

    /* 
    * the following test make sure the correct filters/helpers are added to the hbs template
    */
    describe("Handlebars Context Parser filter test suite", function() {

        it("Filter 000 - add yd filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_000.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [ 
                /{{{yd name}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 001 - add yd and yc filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_001.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [ 
                /{{{yc comment}}}/, /{{{yd name}}}/ 
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 002 - add href filters test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_002.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [ 
                // test against double quoted, single quoted and unquoted URL in attribute href
                /{{{yubl \(yavd \(yufull url11\)\)}}}/, /{{{yubl \(yavs \(yufull url12\)\)}}}/, /{{{yubl \(yavd \(yufull url13\)\)}}}/,
                /{{{yubl \(yavs \(yufull url14\)\)}}}/, /{{{yubl \(yavu \(yufull url15\)\)}}}/, /{{{yubl \(yavu \(yufull url16\)\)}}}/,
                // test against double quoted, single quoted and unquoted URL Path in attribute href
                /{{{yavd \(yu path11\)}}}/, /{{{yavs \(yu path12\)}}}/, /{{{yavd \(yu path13\)}}}/,
                /{{{yavs \(yu path14\)}}}/, /{{{yavu \(yu path15\)}}}/, /{{{yavu \(yu path16\)}}}/,
                // test against double quoted, single quoted and unquoted after URL ? in attribute href
                /{{{yavd \(yu kv11\)}}}/, /{{{yavs \(yu kv12\)}}}/, /{{{yavd \(yu kv13\)}}}/,
                /{{{yavs \(yu kv14\)}}}/, /{{{yavu \(yu kv15\)}}}/, /{{{yavu \(yu kv16\)}}}/,
                // test against double quoted, single quoted and unquoted URL query string in attribute href
                /{{{yavd \(yuc q11\)}}}/, /{{{yavd \(yuc q12\)}}}/, /{{{yavd \(yuc q13\)}}}/,
                /{{{yavs \(yuc q14\)}}}/, /{{{yavs \(yuc q15\)}}}/, /{{{yavs \(yuc q16\)}}}/,
                /{{{yavd \(yuc q17\)}}}/, /{{{yavd \(yuc q18\)}}}/, /{{{yavs \(yuc q19\)}}}/,
                /{{{yavs \(yuc q20\)}}}/, /{{{yavu \(yuc q21\)}}}/, /{{{yavu \(yuc q22\)}}}/,
                /{{{yavu \(yuc q22\)}}}/, /{{{yavu \(yuc q23\)}}}/, /{{{yavu \(yuc q24\)}}}/,
                /{{{yavu \(yuc q25\)}}}/,
                // test against double quoted, single quoted and unquoted URL hash in attribute href
                /{{{yavd \(yuc hash11\)}}}/, /{{{yavs \(yuc hash12\)}}}/, /{{{yavd \(yuc hash13\)}}}/,
                /{{{yavs \(yuc hash14\)}}}/, /{{{yavu \(yuc hash15\)}}}/, /{{{yavu \(yuc hash16\)}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 003 - add href filters to <form> test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_003.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [ 
                // test against double quoted, single quoted and unquoted URL in attribute form's action 
                /{{{yubl \(yavd \(yufull url11\)\)}}}/, /{{{yubl \(yavs \(yufull url12\)\)}}}/, /{{{yubl \(yavd \(yufull url13\)\)}}}/,
                /{{{yubl \(yavs \(yufull url14\)\)}}}/, /{{{yubl \(yavu \(yufull url15\)\)}}}/, /{{{yubl \(yavu \(yufull url16\)\)}}}/,
                // test against double quoted, single quoted and unquoted URL Path in attribute form's action 
                /{{{yavd \(yu path11\)}}}/, /{{{yavs \(yu path12\)}}}/, /{{{yavd \(yu path13\)}}}/,
                /{{{yavs \(yu path14\)}}}/, /{{{yavu \(yu path15\)}}}/, /{{{yavu \(yu path16\)}}}/,
                // test against double quoted, single quoted and unquoted after URL ? in attribute form's action
                /{{{yavd \(yu kv11\)}}}/, /{{{yavs \(yu kv12\)}}}/, /{{{yavd \(yu kv13\)}}}/,
                /{{{yavs \(yu kv14\)}}}/, /{{{yavu \(yu kv15\)}}}/, /{{{yavu \(yu kv16\)}}}/,
                // test against double quoted, single quoted and unquoted URL query string in attribute form's action
                /{{{yavd \(yuc q11\)}}}/, /{{{yavd \(yuc q12\)}}}/, /{{{yavd \(yuc q13\)}}}/,
                /{{{yavs \(yuc q14\)}}}/, /{{{yavs \(yuc q15\)}}}/, /{{{yavs \(yuc q16\)}}}/,
                /{{{yavd \(yuc q17\)}}}/, /{{{yavd \(yuc q18\)}}}/, /{{{yavs \(yuc q19\)}}}/,
                /{{{yavs \(yuc q20\)}}}/, /{{{yavu \(yuc q21\)}}}/, /{{{yavu \(yuc q22\)}}}/,
                /{{{yavu \(yuc q22\)}}}/, /{{{yavu \(yuc q23\)}}}/, /{{{yavu \(yuc q24\)}}}/,
                /{{{yavu \(yuc q25\)}}}/,
                // test against double quoted, single quoted and unquoted URL hash in attribute form's action
                /{{{yavd \(yuc hash11\)}}}/, /{{{yavs \(yuc hash12\)}}}/, /{{{yavd \(yuc hash13\)}}}/,
                /{{{yavs \(yuc hash14\)}}}/, /{{{yavu \(yuc hash15\)}}}/, /{{{yavu \(yuc hash16\)}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 004 - add href filters to <img> test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_004.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [ 
                // test against double quoted, single quoted and unquoted URL in attribute img's src
                /{{{yubl \(yavd \(yufull url11\)\)}}}/, /{{{yubl \(yavs \(yufull url12\)\)}}}/, /{{{yubl \(yavd \(yufull url13\)\)}}}/,
                /{{{yubl \(yavs \(yufull url14\)\)}}}/, /{{{yubl \(yavu \(yufull url15\)\)}}}/, /{{{yubl \(yavu \(yufull url16\)\)}}}/,
                // test against double quoted, single quoted and unquoted URL Path in attribute img's src
                /{{{yavd \(yu path11\)}}}/, /{{{yavs \(yu path12\)}}}/, /{{{yavd \(yu path13\)}}}/,
                /{{{yavs \(yu path14\)}}}/, /{{{yavu \(yu path15\)}}}/, /{{{yavu \(yu path16\)}}}/,
                // test against double quoted, single quoted and unquoted after URL ? in attribute img's src
                /{{{yavd \(yu kv11\)}}}/, /{{{yavs \(yu kv12\)}}}/, /{{{yavd \(yu kv13\)}}}/,
                /{{{yavs \(yu kv14\)}}}/, /{{{yavu \(yu kv15\)}}}/, /{{{yavu \(yu kv16\)}}}/,
                // test against double quoted, single quoted and unquoted URL query string in attribute img's src
                /{{{yavd \(yuc q11\)}}}/, /{{{yavd \(yuc q12\)}}}/, /{{{yavd \(yuc q13\)}}}/,
                /{{{yavs \(yuc q14\)}}}/, /{{{yavs \(yuc q15\)}}}/, /{{{yavs \(yuc q16\)}}}/,
                /{{{yavd \(yuc q17\)}}}/, /{{{yavd \(yuc q18\)}}}/, /{{{yavs \(yuc q19\)}}}/,
                /{{{yavs \(yuc q20\)}}}/, /{{{yavu \(yuc q21\)}}}/, /{{{yavu \(yuc q22\)}}}/,
                /{{{yavu \(yuc q22\)}}}/, /{{{yavu \(yuc q23\)}}}/, /{{{yavu \(yuc q24\)}}}/,
                /{{{yavu \(yuc q25\)}}}/,
                // test against double quoted, single quoted and unquoted URL hash in attribute img's src
                /{{{yavd \(yuc hash11\)}}}/, /{{{yavs \(yuc hash12\)}}}/, /{{{yavd \(yuc hash13\)}}}/,
                /{{{yavs \(yuc hash14\)}}}/, /{{{yavu \(yuc hash15\)}}}/, /{{{yavu \(yuc hash16\)}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 005 - add href filters to <button formaction> test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_005.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [ 
                // test against double quoted, single quoted and unquoted URL in attribute button's formaction 
                /{{{yubl \(yavd \(yufull url11\)\)}}}/, /{{{yubl \(yavs \(yufull url12\)\)}}}/, /{{{yubl \(yavd \(yufull url13\)\)}}}/,
                /{{{yubl \(yavs \(yufull url14\)\)}}}/, /{{{yubl \(yavu \(yufull url15\)\)}}}/, /{{{yubl \(yavu \(yufull url16\)\)}}}/,
                // test against double quoted, single quoted and unquoted URL Path in attribute button's formaction
                /{{{yavd \(yu path11\)}}}/, /{{{yavs \(yu path12\)}}}/, /{{{yavd \(yu path13\)}}}/,
                /{{{yavs \(yu path14\)}}}/, /{{{yavu \(yu path15\)}}}/, /{{{yavu \(yu path16\)}}}/,
                // test against double quoted, single quoted and unquoted after URL ? in attribute button's formaction
                /{{{yavd \(yu kv11\)}}}/, /{{{yavs \(yu kv12\)}}}/, /{{{yavd \(yu kv13\)}}}/,
                /{{{yavs \(yu kv14\)}}}/, /{{{yavu \(yu kv15\)}}}/, /{{{yavu \(yu kv16\)}}}/,
                // test against double quoted, single quoted and unquoted URL query string in attribute button's formaction
                /{{{yavd \(yuc q11\)}}}/, /{{{yavd \(yuc q12\)}}}/, /{{{yavd \(yuc q13\)}}}/,
                /{{{yavs \(yuc q14\)}}}/, /{{{yavs \(yuc q15\)}}}/, /{{{yavs \(yuc q16\)}}}/,
                /{{{yavd \(yuc q17\)}}}/, /{{{yavd \(yuc q18\)}}}/, /{{{yavs \(yuc q19\)}}}/,
                /{{{yavs \(yuc q20\)}}}/, /{{{yavu \(yuc q21\)}}}/, /{{{yavu \(yuc q22\)}}}/,
                /{{{yavu \(yuc q22\)}}}/, /{{{yavu \(yuc q23\)}}}/, /{{{yavu \(yuc q24\)}}}/,
                /{{{yavu \(yuc q25\)}}}/,
                // test against double quoted, single quoted and unquoted URL hash in attribute button's formaction
                /{{{yavd \(yuc hash11\)}}}/, /{{{yavs \(yuc hash12\)}}}/, /{{{yavd \(yuc hash13\)}}}/,
                /{{{yavs \(yuc hash14\)}}}/, /{{{yavu \(yuc hash15\)}}}/, /{{{yavu \(yuc hash16\)}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 006 - add y filters to style attribute test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_006.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted
                /{{{y color11}}}/, /{{{y color12}}}/, /{{{y bgcolor1}}}/, /{{{y color41}}}/,
                /{{{y color5}}}/, /{{{y bgcolor5}}}/,
                // single quoted
                /{{{y color21}}}/, /{{{y color22}}}/, /{{{y bgcolor2}}}/, /{{{y color42}}}/,
                /{{{y color6}}}/, /{{{y bgcolor6}}}/,
                // unquoted
                /{{{y color31}}}/, /{{{y color32}}}/, /{{{y bgcolor3}}}/, /{{{y color43}}}/,
                /{{{y color7}}}/, /{{{y bgcolor7}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 007 - add y filters to style attribute test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_007.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted
                /{{{y style1}}}/, /{{{y style4}}}/,
                // single quoted
                /{{{y style2}}}/, /{{{y style5}}}/,
                // unquoted
                /{{{y style3}}}/, /{{{y style6}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 008 - add y filters to <script> tag test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_008.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // single quoted
                /{{{y arg11}}}/,
                // double quoted
                /{{{y arg12}}}/,
                // unquoted
                /{{{y arg13}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 009 - add yavX filters to class attribute test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_009.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted
                /{{{yavd class1}}}/, /{{{yavd class4}}}/,
                // single quoted
                /{{{yavs class2}}}/, /{{{yavs class5}}}/,
                // unquoted
                /{{{yavu class3}}}/, /{{{yavu class6}}}/, /{{{yavu class7}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 010 - add yavu filters to border test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_010.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yavu border}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 011 - add y filter to onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_011.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted
                /{{{y arg1}}}/, /{{{y arg4}}}/,
                // single quoted
                /{{{y arg2}}}/, /{{{y arg5}}}/,
                // unquoted
                /{{{y arg3}}}/, /{{{y arg6}}}/,
                // double/single/unqouted line break 
                /{{{y arg7}}}/, /{{{y arg8}}}/, /{{{y arg9}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 012 - add y filters to onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_012.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted with parameter unquoted
                /{{{y arg1}}}/, /{{{y arg2}}}/, /{{{y arg3}}}/, /{{{y arg4}}}/, /{{{y arg5}}}/, /{{{y arg6}}}/, /{{{y arg7}}}/, /{{{y arg8}}}/, /{{{y arg9}}}/,
                // single quoted with parameter unquoted
                /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/, /{{{y arg13}}}/, /{{{y arg14}}}/, /{{{y arg15}}}/, /{{{y arg16}}}/, /{{{y arg17}}}/, /{{{y arg18}}}/,
                // unquoted with parameter unquoted
                /{{{y arg19}}}/, /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/, /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/, /{{{y arg26}}}/, /{{{y arg27}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 013 - add y filters to quoted onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_013.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted with parameter unquoted
                /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/,
                // single quoted with parameter unquoted
                /{{{y arg13}}}/, /{{{y arg14}}}/, /{{{y arg15}}}/,
                // double quoted with parameter unquoted (with space)
                /{{{y arg16}}}/, /{{{y arg17}}}/,
                // single quoted with parameter unquoted (with space)
                /{{{y arg18}}}/, /{{{y arg19}}}/,
                // double quoted with parameter quoted
                /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/,
                // single quoted with parameter quoted
                /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/,
                // double quoted with parameter quoted (with space)
                /{{{y arg26}}}/, /{{{y arg27}}}/,
                // single quoted with parameter quoted (with space)
                /{{{y arg28}}}/, /{{{y arg29}}}/,
                // double quoted with parameter slash quoted
                /{{{y arg30}}}/, /{{{y arg31}}}/, /{{{y arg32}}}/,
                // single quoted with parameter slash quoted
                /{{{y arg33}}}/, /{{{y arg34}}}/, /{{{y arg35}}}/,
                // double quoted with parameter slash quoted (with space)
                /{{{y arg36}}}/, /{{{y arg37}}}/,
                // single quoted with parameter slash quoted (with space)
                /{{{y arg38}}}/, /{{{y arg39}}}/,
                // double quoted 
                /{{{y arg40}}}/, /{{{y arg43}}}/,
                // single quoted 
                /{{{y arg41}}}/, /{{{y arg44}}}/,
                // unquoted 
                /{{{y arg42}}}/, /{{{y arg45}}}/,
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 014 - add y filters unquoted onclick test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_014.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // unquoted with parameter unquoted
                /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/, /{{{y arg13}}}/, /{{{y arg14}}}/,
                // unquoted with parameter single / double quoted
                /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/, 
                // unquoted with parameter single quoted
                /{{{y arg23}}}/, /{{{y arg24}}}/,
                // unquoted with parameter double quoted
                /{{{y arg25}}}/, /{{{y arg26}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 015 - add y filters to <script> block", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_015.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted
                /{{{y value1}}}/, 
                // single quoted
                /{{{y value2}}}/, 
                // unquoted
                /{{{y value3}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 016 - add y filter to <style> block", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_016.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{y fontsize}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 018 - add y filters to quoted href test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_018.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // double quoted with parameter unquoted
                /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/,
                // single quoted with parameter unquoted
                /{{{y arg13}}}/, /{{{y arg14}}}/, /{{{y arg15}}}/,
                // double quoted with parameter unquoted (with space)
                /{{{y arg16}}}/, /{{{y arg17}}}/,
                // single quoted with parameter unquoted (with space)
                /{{{y arg18}}}/, /{{{y arg19}}}/,
                // double quoted with parameter quoted
                /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/,
                // single quoted with parameter quoted
                /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/,
                // double quoted with parameter quoted (with space)
                /{{{y arg26}}}/, /{{{y arg27}}}/,
                // single quoted with parameter quoted (with space)
                /{{{y arg28}}}/, /{{{y arg29}}}/,
                // double quoted with parameter slash quoted
                /{{{y arg30}}}/, /{{{y arg31}}}/, /{{{y arg32}}}/,
                // single quoted with parameter slash quoted
                /{{{y arg33}}}/, /{{{y arg34}}}/, /{{{y arg35}}}/,
                // double quoted with parameter slash quoted (with space)
                /{{{y arg36}}}/, /{{{y arg37}}}/,
                // single quoted with parameter slash quoted (with space)
                /{{{y arg38}}}/, /{{{y arg39}}}/,
                // double quoted with parameter unquoted
                /{{{y vbarg10}}}/, /{{{y vbarg11}}}/, /{{{y vbarg12}}}/,
                // single quoted with parameter unquoted
                /{{{y vbarg13}}}/, /{{{y vbarg14}}}/, /{{{y vbarg15}}}/,
                // double quoted with parameter unquoted (with space)
                /{{{y vbarg16}}}/, /{{{y vbarg17}}}/,
                // single quoted with parameter unquoted (with space)
                /{{{y vbarg18}}}/, /{{{y vbarg19}}}/,
                // double quoted with parameter quoted
                /{{{y vbarg20}}}/, /{{{y vbarg21}}}/, /{{{y vbarg22}}}/,
                // single quoted with parameter quoted
                /{{{y vbarg23}}}/, /{{{y vbarg24}}}/, /{{{y vbarg25}}}/,
                // double quoted with parameter quoted (with space)
                /{{{y vbarg26}}}/, /{{{y vbarg27}}}/,
                // single quoted with parameter quoted (with space)
                /{{{y vbarg28}}}/, /{{{y vbarg29}}}/,
                // double quoted with parameter slash quoted
                /{{{y vbarg30}}}/, /{{{y vbarg31}}}/, /{{{y vbarg32}}}/,
                // single quoted with parameter slash quoted
                /{{{y vbarg33}}}/, /{{{y vbarg34}}}/, /{{{y vbarg35}}}/,
                // double quoted with parameter slash quoted (with space)
                /{{{y vbarg36}}}/, /{{{y vbarg37}}}/,
                // single quoted with parameter slash quoted (with space)
                /{{{y vbarg38}}}/, /{{{y vbarg39}}}/,
                // double quoted
                /{{{yubl \(yavd \(yufull arg40\)\)}}}/, /{{{yubl \(yavd \(yufull arg43\)\)}}}/,
                // single quoted
                /{{{yubl \(yavs \(yufull arg41\)\)}}}/, /{{{yubl \(yavs \(yufull arg44\)\)}}}/,
                // unquoted
                /{{{yubl \(yavu \(yufull arg42\)\)}}}/, /{{{yubl \(yavu \(yufull arg45\)\)}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 019 - add y filters unquoted href test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_019.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                // unquoted with parameter unquoted
                /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/, /{{{y arg13}}}/, /{{{y arg14}}}/,
                // unquoted with parameter double / single unquoted
                /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/, /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/, /{{{y arg26}}}/,
                // unquoted with parameter unquoted (vbscript)
                /{{{y vbarg10}}}/, /{{{y vbarg11}}}/, /{{{y vbarg12}}}/, /{{{y vbarg13}}}/, /{{{y vbarg14}}}/,
                // unquoted with parameter double / single unquoted (vbscript)
                /{{{y vbarg20}}}/, /{{{y vbarg21}}}/, /{{{y vbarg22}}}/, /{{{y vbarg23}}}/, /{{{y vbarg24}}}/, /{{{y vbarg25}}}/, /{{{y vbarg26}}}/,
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter 020 - add yd filters to RCDATA test", function() {
            var file = "./tests/samples/files/handlebarsjs_filter_020.hbs.precompiled";
            var data = fs.readFileSync(file, 'utf-8');
            var arr = [
                /{{{yd title}}}/
            ];
            utils.testArrMatch(data, arr);
        });

        it("Filter - subexpression format test", function() {
            var t1 = new ContextParserHandlebars(config);
            var data = "<html><title>{{title}}</title></html>";
            t1.contextualize(data);
            var output = t1.getOutput();
            var arr = [
                /{{{yd title}}}/
            ];
            utils.testArrMatch(output, arr);

            var t2 = new ContextParserHandlebars(false);
            var data = "<a href='{{url}}'>link</a>";
            t2.contextualize(data);
            var output = t2.getOutput();
            var arr = [
                /{{{yubl \(yavs \(yufull url\)\)}}}/
            ];
            utils.testArrMatch(output, arr);
        });
    });
}());
