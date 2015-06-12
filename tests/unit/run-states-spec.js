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
    var expect = require("chai").expect,
        configContextParser = {
            enableInputPreProcessing: true,
            enableCanonicalization: true,
            enableVoidingIEConditionalComments: true,
            enableStateTracking: true
        },
        ContextParser = require("context-parser").Parser;

    describe('HTML5 Customized Context Parser html5 state test suite', function(){

        /* 
         * this test is to simulate the case of transitting to the before-attribute-name-state (12.2.4.34) from 
         * attribute-value-(quoted)-state (12.2.4.40), after-attribute-value-(quoted)-state (12.2.4.42) and
         * self-closing start tag state (12.2.4.43), as output place holder cannot be put at the state 34,
         * we don't need to handle it (exception). 
         */
        it('HTML5 Context Parser placeholder TO before-attribute-name-state (12.2.4.34) test', function(){
            [
                { html: '<option value=123 {',       states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,40,40,40,34,35'},
                { html: '<option value="123" {',     states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38,38,38,42,34,35'},
                { html: '<option value="123"/ {',    states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38,38,38,42,34,34,35'},
                { html: '<option value="123"/',      states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38,38,38,42,43'},
            ].forEach(function(testObj) {
                var p1 = new ContextParser(configContextParser);
                p1.contextualize(testObj.html);
                expect(p1.getStates().toString()).to.equal(testObj.states);
            });
        });

        /* 
         * this test is to simulate the case of transitting to the attribute-name-state (12.2.4.35) from 
         * before-attribute-name-state (12.2.4.34) and after-attribute-name-state (12.2.4.36), 
         * so we need to handle the state 35.
         */
        it('HTML5 Context Parser placeholder TO attribute-name-state (12.2.4.35) test', function(){
            [
                { html: '<div id="1" {',                states: '1,8,10,10,10,34,35,35,37,38,38,42,34,35'},
                { html: '<option value="1" selected {', states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38,42,34,35,35,35,35,35,35,35,35,36,35'},
            ].forEach(function(testObj) {
                var p1 = new ContextParser(configContextParser);
                p1.contextualize(testObj.html);
                expect(p1.getStates().toString()).to.equal(testObj.states);
            });
        });

        /* 
         * this test is to simulate the case of transitting to the after-attribute-name-state (12.2.4.36) from 
         * attribute-name-state (12.2.4.35), as output place holder cannot be put at the state 36, 
         * we don't need to handle it (exception).
         */
        it('HTML5 Context Parser placeholder TO after-attribute-name-state (12.2.4.36) test', function(){
            [
                { html: '<option value="1" selected ', states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38,42,34,35,35,35,35,35,35,35,35,36'},
            ].forEach(function(testObj) {
                var p1 = new ContextParser(configContextParser);
                p1.contextualize(testObj.html);
                expect(p1.getStates().toString()).to.equal(testObj.states);
            });
        });

        /* 
         * this test is to simulate the case of transitting to the before-attribute-value-state (12.2.4.37) from
         * attribute-name-state (12.2.4.35) and after-attribute-name-value-state (12.2.4.36),
         * as output place holder cannot be put at the state 37, we don't need to handle it.
         */
        it('HTML5 Context Parser placeholder TO before-attribute-value-state (12.2.4.37) test', function(){
            [
                { html: '<option value=',  states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37'},
                { html: '<option value =', states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,36,37'},
            ].forEach(function(testObj) {
                var p1 = new ContextParser(configContextParser);
                p1.contextualize(testObj.html);
                expect(p1.getStates().toString()).to.equal(testObj.states);
            });
        });

        /* 
         * this test is to simulate the case of transitting to the attribute-value-(double-quoted)-state (12.2.4.38),
         * attribute-value-(single-quoted)-state (12.2.4.39), attribute-value-(unquoted)-state (12.2.4.40)
         * so we need to handle the state 38,39 and 40.
         */
        it('HTML5 Context Parser placeholder TO attribute-value-(double/single/un-quoted)-state (12.2.4.38/39/40) test', function(){
            [
                { html: '<option value="{', states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38'},
                { html: "<option value='{", states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,39,39'},
                { html: '<option value={',  states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,40'}
            ].forEach(function(testObj) {
                var p1 = new ContextParser(configContextParser);
                p1.contextualize(testObj.html);
                expect(p1.getStates().toString()).to.equal(testObj.states);
            });
        });

        /* 
         * this test is to simulate the case of transitting to the after-attribute-value-(quoted)-state (12.2.4.42) from
         * attribute-value-(single-quoted)-state (12.2.4.39), attribute-value-(unquoted)-state (12.2.4.40),
         * as output place holder cannot be put at the state 42, we don't need to handle it (exception).
         */
        it('HTML5 Context Parser placeholder TO after-attribute-value-(quoted)-state (12.2.4.42) test', function(){
            [
                { html: '<option value="{}"', states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38,38,42'},
                { html: "<option value='{}'", states: '1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,39,39,39,42'},
            ].forEach(function(testObj) {
                var p1 = new ContextParser(configContextParser);
                p1.contextualize(testObj.html);
                expect(p1.getStates().toString()).to.equal(testObj.states);
            });
        });
    });
}());
