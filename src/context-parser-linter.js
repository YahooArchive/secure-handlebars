/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*jshint -W030 */
(function () {
"use strict";

var debug = require('debug')('linter-debug');

/* import the html context parser */
var contextParser = require('context-parser'),
    stateMachine = contextParser.StateMachine;

/** 
* @module ContextParserLinter
*/
function ContextParserLinter(config) {
    config || (config = {});

    /* super() */
    contextParser.Parser.call(this);

    /* save the processed char */
    this._buffer = [];

    /* the configuration of ContextParserHandlebars */
    this._config = {};

    /* the flag is used to strict mode of handling un-handled state */
    this._config._strictMode = config.strictMode === undefined ? false: config.strictMode;

    /* save the line number being processed */
    this._charNo = 1;
}

/* inherit the prototype of contextParser.Parser */
ContextParserLinter.prototype = Object.create(contextParser.Parser.prototype);

/** 
* @function ContextParserLinter._replaceCharForBrowserConsistency
*
* @description
* This function replaces the character for the sake of browser consistency 
* or warn the developer if the error cannot be recovered.
*/
ContextParserLinter.prototype._replaceCharForBrowserConsistency = function(ch, state) {
    switch(ch) {
        case '\x00':
            return '\ufffd';
        default:
            return ch;
    }
};

/* overriding the HTML5 Context Parser's beforeWalk */
ContextParserLinter.prototype.beforeWalk = function(i, input) {

    var len = input.length,
        symbol, state;

    /* lookup the symbol and state transition */
    symbol = this.lookupChar(input[i]);
    state = stateMachine.lookupStateFromSymbol[symbol][this.state];

    /* make the replacement */
    var replaceChar = this._replaceCharForBrowserConsistency(input[i], state);
    replaceChar !== input[i]? this._buffer.push(replaceChar) : this._buffer.push(input[i]);

    /* for reporting */
    this._charNo++;

    return i;
};

/**
* @function module:ContextParserLinter.getOutput
*
* @description
* <p>Get the output of processed chars.</p>
*
*/
ContextParserLinter.prototype.getOutput = function() {
    return this._buffer.join('');
};

/* exposing it */
module.exports = ContextParserLinter;

})();
