/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    require("mocha");
    var expect = require("chai").expect,
        Parser = require("context-parser").Parser;

    describe('HTML5 Context Parser html5 state test suite', function(){

        /* 
         * this test is to simulate the case that the developer is putting the output place holder after 
         * the state 12.2.4.34 and test what correct filter should be applied.
         *
         * the next state of state 12.2.4.34 is 12.2.4.1 (>,EOF), 12.2.4.35 (a-zA-Z,null,",',<,=,anything) and 12.2.4.43 (/), 
         * as 'anything' triggers the state change to 12.2.4.35, so we need to handle this state accordingly
         *
         */
        it('HTML5 Context Parser placeholder after before-attribute-name-state (12.2.4.34) test', function(){
            var p1 = new Parser();
	    var html = '<div id="1" {';
            p1.contextualize(html);
            var states = p1.getStates();
            expect(states.toString()).to.equal('1,8,10,10,10,34,35,35,37,38,38,42,34,35');
        });

        /* 
         * this test is to simulate the case that the developer is putting the output place holder after 
         * the state 12.2.4.36 and test what correct filter should be applied.
         *
         * the next state of state 12.2.4.36 is 12.2.4.1 (>,EOF), 12.2.4.35 (a-zA-Z,null,",',<,anything), 12.2.4.37 (=) and 12.2.4.43 (/), 
         * as 'anything' triggers the state change to 12.2.4.35, so we need to handle this state accordingly
         *
         */
        it('HTML5 Context Parser placeholder after after-attribute-name-state (12.2.4.36) test', function(){
            var p1 = new Parser();
	    var html = '<option value="1" selected {';
            p1.contextualize(html);
            var states = p1.getStates();
            expect(states.toString()).to.equal('1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38,42,34,35,35,35,35,35,35,35,35,36,35');
        });

        /* 
         * this test is to simulate the case that the developer is putting the output place holder after 
         * the state 12.2.4.37 and test what correct filter should be applied.
         *
         * the next state of state 12.2.4.37 is 12.2.4.1 (>,EOF), 12.2.4.38 ("), 12.2.4.39 ('), and 12.2.4.40 (&,null,<,=,`,anything),
         * as 'anything' triggers the state change to 12.2.4.40, so we need to handle this state accordingly
         *
         */
        it('HTML5 Context Parser placeholder after before-attribute-value-state (12.2.4.37) test', function(){
            var p1 = new Parser();
	    var html = '<option value={';
            p1.contextualize(html);
            var states = p1.getStates();
            expect(states.toString()).to.equal('1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,40');
        });

        /* 
         * this test is to simulate the case that the developer is putting the output place holder after 
         * the state 12.2.4.38 and test what correct filter should be applied.
         *
         * the next state of state 12.2.4.38 is 12.2.4.1 (EOF) and 12.2.4.42 ("),
         * as 'anything' does not trigger the state change, so we need to handle this state accordingly
         *
         */
        it('HTML5 Context Parser placeholder after attribute-value-(double-quoted)-state (12.2.4.38) test', function(){
            var p1 = new Parser();
	    var html = '<option value="{';
            p1.contextualize(html);
            var states = p1.getStates();
            expect(states.toString()).to.equal('1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,38,38');
        });

        /* 
         * this test is to simulate the case that the developer is putting the output place holder after 
         * the state 12.2.4.39 and test what correct filter should be applied.
         *
         * the next state of state 12.2.4.39 is 12.2.4.1 (EOF) and 12.2.4.42 ('),
         * as 'anything' does not trigger the state change, so we need to handle this state accordingly
         *
         */
        it('HTML5 Context Parser placeholder after attribute-value-(single-quoted)-state (12.2.4.39) test', function(){
            var p1 = new Parser();
	    var html = '<option value=\'{';
            p1.contextualize(html);
            var states = p1.getStates();
            expect(states.toString()).to.equal('1,8,10,10,10,10,10,10,34,35,35,35,35,35,37,39,39');
        });

        /* 
         * this test is to simulate the case that the developer is putting the output place holder after 
         * the state 12.2.4.42 and test what correct filter should be applied.
         *
         * the next state of state 12.2.4.42 is 12.2.4.1 (>,EOF), 12.2.4.34 (space etc,anything), 12.2.4.43 (/),
         * however, 'anything' triggers the state change to 12.2.4.34 and reconsume logic,
         * it replaces the states buffer with 12.2.4.34, this falls back to the previous handling case above.
         *
         */
        it('HTML5 Context Parser after-attribute-value-(quoted)-state (12.2.4.42) test', function(){
            var p1 = new Parser();
	    var html = '<div id="1"{';
            p1.contextualize(html);
            var states = p1.getStates();
            expect(states.toString()).to.equal('1,8,10,10,10,34,35,35,37,38,38,34,35');
        });

    });

}());
