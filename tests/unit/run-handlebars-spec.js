/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    mocha = require("mocha");
    var expect = require('chai').expect,
        handlebars = require('handlebars');

    describe("Vanilla Handlebars parsing test suite", function() {

        it("handlebars {{expression}} test", function() {
            [
                '{{expression}}',
                '{{expression}} }',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
            });
            [
                '{ {expression}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('content');
            });
        });

        it("handlebars {{expression}} subexpression with \r\n test", function() {
            [
                '{{expression\rion}}',
                '{{expression\nion}}',
                '{{expression\r\nion}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
	        expect(ast.statements[0].params[0].string).to.equal('ion');
	        expect(ast.statements[0].isHelper).to.equal(true);
            });
        });

        it("handlebars invalid {{expression}} test", function() {
            [
                '{ {anything}}', 
                '{{anything}', '{{anything} }', '{{anything}}}',
                '{{    {anything}}', '{{    }anything}}',
                '{{}}'
            ].forEach(function(e) {
                try {
                    var ast = handlebars.parse(e);
                    expect(false).to.equal(true);
                } catch (err) {
                    expect(true).to.equal(true);
                }
            });
        });

        it("handlebars {{{raw expression}}} test", function() {
            [
                '{{{expression}}}',
                '{{{expression}}} }',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('mustache');
            });
            [
                '{ { {expression}}}',
            ].forEach(function(t) {
                var ast = handlebars.parse(t);
	        expect(ast.statements[0].type).to.equal('content');
            });
        });

        it("handlebars invalid {{{raw expression}}} test", function() {
            [
                '{ {{anything}}}', '{{ {anything}}}',
                '{{{anything}', '{{{anything}}', '{{{anything}}}}',
                '{{{    {anything}}}', '{{{    }anything}}}',
                '{{{}}}'
            ].forEach(function(e) {
                try {
                    var ast = handlebars.parse(e);
                    expect(false).to.equal(true);
                } catch (err) {
                    expect(true).to.equal(true);
                }
            });
        });

        it("handlebars {{#if}} {{!-- comment --}} {{/if}} parsing test", function() {
            var t = '{{#if}}xxx{{!-- comment --}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].comment).to.equal(' comment ');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{expression}} {{/if}} parsing test", function() {
            var t = '{{#if}}xxx{{expression}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].id.string).to.equal('expression');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{{expression}}} {{/if}} parsing test", function() {
            var t = '{{#if}}xxx{{{expression}}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].id.string).to.equal('expression');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{helper1 param1 param2}} {{/if}} parsing test 1", function() {
            var t = '{{#if}}xxx{{helper1 param1 param2}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].id.string).to.equal('helper1');
            expect(ast.statements[0].program.statements[1].params[0].string).to.equal('param1');
            expect(ast.statements[0].program.statements[1].params[1].string).to.equal('param2');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{helper1 param1 param2}} {{/if}} parsing test 2", function() {
            var t = '{{#if}}xxx{{helper1 (helper2 (param2))}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].id.string).to.equal('helper1');
            expect(ast.statements[0].program.statements[1].params[0].id.string).to.equal('helper2');
            expect(ast.statements[0].program.statements[1].params[0].params[0].id.string).to.equal('param2');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{helper1 param1 param2}} {{/if}} parsing test 3", function() {
            var t = '{{#if}}xxx{{helper1 (helper2 param2)}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].id.string).to.equal('helper1');
            expect(ast.statements[0].program.statements[1].params[0].id.string).to.equal('helper2');
            expect(ast.statements[0].program.statements[1].params[0].params[0].string).to.equal('param2');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{>partial}} {{/if}} parsing test", function() {
            var t = '{{#if}}xxx{{>partialname}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].partialName.name).to.equal('partialname');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{/if}} with {{#list}} parsing test", function() {
            var t = '{{#if}}xxx{{#list people}}{{firstName}}{{lastName}}{{/list}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('list');
            expect(ast.statements[0].program.statements[1].mustache.sexpr.params[0].string).to.equal('people');
            expect(ast.statements[0].program.statements[1].program.statements[0].id.string).to.equal('firstName');
            expect(ast.statements[0].program.statements[1].program.statements[1].id.string).to.equal('lastName');
            expect(ast.statements[0].program.statements[2].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{/if}} parsing test", function() {
            var t = '{{#if}}xxx{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse).to.equal(undefined);
        });

        it("handlebars {{#if}} {{else}} {{/if}} parsing test 1", function() {
            var t = '{{#if}}xxx{{else}}yyy{{/if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('yyy');
        });

        it("handlebars {{#if}} {{else}} {{/if}} parsing test 2", function() {
            var t = '{{# if}}xxx{{ else }}yyy{{/ if}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('yyy');

            t = '{{# if }}xxx{{ else }}yyy{{/ if}}';
            ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('yyy');

            t = '{{ # if}}xxx{{else}}yyy{{ / if}}';
            try {
                ast = handlebars.parse(t);
                expect(false).to.equal(true);
            } catch (err) {
                expect(true).to.equal(true);
            }
        });

        it("handlebars nested {{#if}} parsing test", function() {
            var t = '{{#if}}111{{#if}}222{{else}}333{{/if}}444{{else}}555{{#if}}666{{else}}777{{/if}}888{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[1].inverse.statements[0].string).to.equal('333');
            expect(ast.statements[0].program.statements[2].string).to.equal('444');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('777');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('888');
        });

        it("handlebars nested {{#if}} / {{#with}} parsing test", function() {
            var t = '{{#if}}111{{#with}}222{{/with}}333{{else}}444{{#if}}555{{else}}666{{/if}}777{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('with');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[1].inverse).to.equal(undefined);
            expect(ast.statements[0].program.statements[2].string).to.equal('333');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('444');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('777');
        });

        it("handlebars nested {{#if}} / {{#with}} / {{else}}  parsing test", function() {
            var t = '{{#if}}111{{#with}}222{{else}}333{{/with}}444{{else}}555{{#if}}666{{else}}777{{/if}}888{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('with');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[1].inverse.statements[0].string).to.equal('333');
            expect(ast.statements[0].program.statements[2].string).to.equal('444');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('777');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('888');
        });

        it("handlebars nested {{#if}} / {{#each}} parsing test", function() {
            var t = '{{#if}}111{{#each}}222{{/each}}333{{else}}444{{#if}}555{{else}}666{{/if}}777{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('each');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[1].inverse).to.equal(undefined);
            expect(ast.statements[0].program.statements[2].string).to.equal('333');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('444');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('777');
        });

        it("handlebars nested {{#if}} / {{#each}} / {{else}}  parsing test", function() {
            var t = '{{#if}}111{{#each}}222{{else}}333{{/each}}444{{else}}555{{#if}}666{{else}}777{{/if}}888{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('each');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[1].inverse.statements[0].string).to.equal('333');
            expect(ast.statements[0].program.statements[2].string).to.equal('444');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('777');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('888');
        });

        it("handlebars nested {{#if}} / {{#list}} parsing test", function() {
            var t = '{{#if}}111{{#list people}}people{{/list}}333{{else}}444{{#if}}555{{else}}666{{/if}}777{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('list');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('people');
            expect(ast.statements[0].program.statements[1].inverse).to.equal(undefined);
            expect(ast.statements[0].program.statements[2].string).to.equal('333');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('444');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('777');
        });

        it("handlebars nested {{#if}} / {{#list}} / {{else}}  parsing test", function() {
            var t = '{{#if}}111{{#list people}}people{{else}}no people{{/list}}444{{else}}555{{#if}}666{{else}}777{{/if}}888{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('list');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('people');
            expect(ast.statements[0].program.statements[1].inverse.statements[0].string).to.equal('no people');
            expect(ast.statements[0].program.statements[2].string).to.equal('444');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('777');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('888');
        });

        it("handlebars nested {{#if}} / {{#tag}} parsing test", function() {
            var t = '{{#if}}111{{#tag people}}people{{/tag}}333{{else}}444{{#if}}555{{else}}666{{/if}}777{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('tag');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('people');
            expect(ast.statements[0].program.statements[1].inverse).to.equal(undefined);
            expect(ast.statements[0].program.statements[2].string).to.equal('333');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('444');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('777');
        });

        it("handlebars nested {{#if}} / {{#tag}} / {{else}}  parsing test", function() {
            var t = '{{#if}}111{{#tag people}}people{{else}}no people{{/tag}}444{{else}}555{{#if}}666{{else}}777{{/if}}888{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('tag');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('people');
            expect(ast.statements[0].program.statements[1].inverse.statements[0].string).to.equal('no people');
            expect(ast.statements[0].program.statements[2].string).to.equal('444');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('777');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('888');
        });

        it("handlebars nested {{#if}} / {{^msg}} parsing test", function() {
            var t = '{{#if}}111{{^msg}}222{{/msg}}333{{else}}444{{#if}}555{{else}}666{{/if}}777{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('msg');
            expect(ast.statements[0].program.statements[1].program).to.equal(undefined);
            expect(ast.statements[0].program.statements[1].inverse.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[2].string).to.equal('333');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('444');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('777');
        });

        it("handlebars nested {{#if}} / {{^msg}} / {{else}}  parsing test", function() {
            var t = '{{#if}}111{{^msg}}222{{else}}333{{/msg}}444{{else}}555{{#if}}666{{else}}777{{/if}}888{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('msg');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('333');
            expect(ast.statements[0].program.statements[1].inverse.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[2].string).to.equal('444');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('777');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('888');
        });

        it("handlebars nested {{#if}} / {{#unless}} parsing test", function() {
            var t = '{{#if}}111{{#unless}}222{{/unless}}333{{else}}444{{#if}}555{{else}}666{{/if}}777{{/if}}';
            var ast = handlebars.parse(t);

            expect(ast.statements[0].mustache.id.string).to.equal('if');
            expect(ast.statements[0].program.statements[0].string).to.equal('111');
            expect(ast.statements[0].program.statements[1].mustache.id.string).to.equal('unless');
            expect(ast.statements[0].program.statements[1].program.statements[0].string).to.equal('222');
            expect(ast.statements[0].program.statements[1].inverse).to.equal(undefined);
            expect(ast.statements[0].program.statements[2].string).to.equal('333');

            expect(ast.statements[0].inverse.statements[0].string).to.equal('444');
            expect(ast.statements[0].inverse.statements[1].mustache.id.string).to.equal('if');
            expect(ast.statements[0].inverse.statements[1].program.statements[0].string).to.equal('555');
            expect(ast.statements[0].inverse.statements[1].inverse.statements[0].string).to.equal('666');
            expect(ast.statements[0].inverse.statements[2].string).to.equal('777');
        });

        it("handlebars {{#unless}} {{/unless}} parsing test", function() {
            var t = '{{#unless}}xxx{{/unless}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('unless');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse).to.equal(undefined);
        });

        it("handlebars {{#each}} {{/each}} parsing test", function() {
            var t = '{{#each}}xxx{{/each}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('each');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse).to.equal(undefined);
        });

        it("handlebars {{#each}} {{else}} {{/each}} parsing test", function() {
            var t = '{{#each}}xxx{{else}}yyy{{/each}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('each');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('yyy');
        });

        it("handlebars {{#list}} {{/list}} parsing test", function() {
            var t = '{{#list people}}xxx{{/list}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('list');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse).to.equal(undefined);
        });

        it("handlebars {{#list}} {{else}} {{/list}} parsing test", function() {
            var t = '{{#list people}}xxx{{else}}yyy{{/list}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('list');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('yyy');
        });

        it("handlebars {{#with}} {{/with}} parsing test", function() {
            var t = '{{#with}}xxx{{/with}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('with');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse).to.equal(undefined);
        });

        it("handlebars {{#with}} {{else}} {{/with}} parsing test", function() {
            var t = '{{#with people}}xxx{{else}}yyy{{/with}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('with');
            expect(ast.statements[0].program.statements[0].string).to.equal('xxx');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('yyy');
        });

        it("handlebars {{#tag}} {{/tag}} parsing test", function() {
            var t = '{{#tag people}}has people{{/tag}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('tag');
            expect(ast.statements[0].program.statements[0].string).to.equal('has people');
            expect(ast.statements[0].inverse).to.equal(undefined);
        });

        it("handlebars {{#tag}} {{else}} {{/tag}} parsing test", function() {
            var t = '{{#tag people}}has people{{else}}no people{{/tag}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('tag');
            expect(ast.statements[0].program.statements[0].string).to.equal('has people');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('no people');
        });

        it("handlebars {{^msg}} {{/msg}} parsing test", function() {
            var t = '{{^msg}}xxx{{/msg}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('msg');
            expect(ast.statements[0].program).to.equal(undefined);
            expect(ast.statements[0].inverse.statements[0].string).to.equal('xxx');
        });

        it("handlebars {{^msg}} {{else}} {{/msg}} parsing test", function() {
            var t = '{{^msg}}has people{{else}}no people{{/msg}}';
            var ast = handlebars.parse(t);
            expect(ast.statements[0].mustache.id.string).to.equal('msg');
            expect(ast.statements[0].program.statements[0].string).to.equal('no people');
            expect(ast.statements[0].inverse.statements[0].string).to.equal('has people');
        });

    });
}());
