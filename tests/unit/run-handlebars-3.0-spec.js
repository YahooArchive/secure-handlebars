/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    mocha = require("mocha");
    var expect = require('chai').expect,
        testPatterns = require('../test-patterns.js'),
        handlebars = require('handlebars');

    describe("Handlebars 3.0 Parsing Test Suite", function() {

        /* Handlebars basic {{expression}} test */
        it("handlebars basic {{expression}} test", function() {
            testPatterns.expressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars {{{raw expression}}} test */
        it("handlebars {{{raw expression}}} test", function() {
            testPatterns.rawExpressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars {{{{raw block}}}} test */
        it("handlebars {{{{raw block}}}} test", function() {
            testPatterns.rawBlockTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars {{escape expression}} test */
        it("handlebars {{escape expression}} test", function() {
            testPatterns.escapeExpressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars {{>partial}} test */
        it("handlebars {{>partial}} test", function() {
            testPatterns.partialExpressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars {{&reference}} test */
        it("handlebars {{&reference}} test", function() {
            testPatterns.referenceExpressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars {{[#|^]branch}} test */
        it("handlebars {{[#|^]branch}} test", function() {
            testPatterns.branchExpressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars {{!comment}} test */
        it("handlebars {{!comment}} test", function() {
            testPatterns.commentExpressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });

        /* Handlebars \{{expression}} \\{{expression}} test */
        it("handlebars \{{expression}} \\{{expression} test", function() {
            testPatterns.escapeBraceExpressionTestPatterns.forEach(function(testObj) {
                var ast;
                try {
                    ast = handlebars.parse(testObj.syntax);
                    expect(ast.body).to.be.ok;
                    expect(testObj.result[0]).to.equal(ast.body[0].type);
                } catch (e) {
                    // guard against AssertionError, any good method to do it?
                    expect(ast).to.equal(undefined); 
                    expect(testObj.result[0]).to.equal(false);
                }
            });
        });
    });
}());
