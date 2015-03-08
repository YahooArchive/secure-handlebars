(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ContextParserHandlebars = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function() {
"use strict";

var debug = require('debug')('context-parser');
var trace = require('debug')('context-parser-trace');
var stateMachine = require('./html5-state-machine.js');

/**
 * @class Parser
 * @constructor Parser
 */
function Parser() {
    this.bytes = [];  /* Save the processed bytes */
    this.state = -1;  /* Save the current status */
    this.states = [stateMachine.State.STATE_DATA]; /* Save the processed status */
    this.contexts = [];
    this.buffer = []; /* Save the processed character into the internal buffer */
    this.symbols = []; /* Save the processed symbols */
    this.tagNames = ['', '']; /* Save the current tag name */
    this.tagNameIdx = '';
    this.attributeName = ''; /* Save the current attribute name */
    this.attributeValue = ''; /* Save the current attribute value */
}

/**
 * @function Parser#contextualize
 *
 * @param {string} input - The byte stream of the HTML5 web page.
 * @returns {integer} The return code of success or failure of parsing.
 *
 * @description
 * <p>The context analyzing function, it analyzes the output context of each character based on
 * the HTML5 WHATWG - https://html.spec.whatwg.org/multipage/</p>
 *
 */
Parser.prototype.contextualize = function(input) {
    var len = input.length;
    this.state = this.states[0];
    this.bytes[0] = '';
    this.symbols[0] = 0;
    this.contexts[0] = 0;
    for(var i = 0; i < len; ++i) {
        i = this.beforeWalk(i, input);
        if ( i >= len ) { break; }
        i = this.walk(i, input);
        if ( i >= len ) { break; }
        this.afterWalk(input[i]);
    }
};

/*
 * @function Parser#walk
 *
 * @param {integer} i - the position of the current character in the input stream
 * @param {string} input - the input stream
 * @returns {integer} the new location of the current character.
 *
 */
Parser.prototype.walk = function(i, input) {

    var ch = input[i],
        len = input.length,
        symbol = this.lookupChar(ch),
        extraLogic = stateMachine.lookupAltLogicFromSymbol[symbol][this.state],
        reconsume = stateMachine.lookupReconsumeFromSymbol[symbol][this.state];

    trace('Enter the walk');
    trace({i: i, ch: ch, symbol: symbol, state: this.state, extraLogic: extraLogic, reconsume: reconsume });
    trace({states: this.states});
    trace({bytes: this.bytes});
    trace({contexts: this.contexts});

    /* Set state based on the current head pointer symbol */
    this.state = stateMachine.lookupStateFromSymbol[symbol][this.state];

    /* See if there is any extra logic required for this state transition */
    switch (extraLogic) {
        case 1:                       /* new start tag token */
            this.tagNameIdx = 0;
            this.tagNames[0] = ch.toLowerCase();
            break;
        case 2:                       /* new end tag token */
            this.tagNameIdx = 1;
            this.tagNames[1] = ch.toLowerCase();
            break;
        case 3:                       /* append to the current start|end tag token */
            this.tagNames[this.tagNameIdx] += ch.toLowerCase();
            break;
        case 4:                       /* remove the end tag token */
            this.tagNameIdx = 1;
            this.tagNames[1] = '';
            break;
        case 5:                       /* new end tag token */
            this.tagNameIdx = 1;
            this.tagNames[1] = ch.toLowerCase();
            break;
        case 6:                       /* match end tag token with start tag token's tag name */
            if(this.tagNames[0] === this.tagNames[1]) {
                /* Extra Logic #6 :
                WHITESPACE: If the current end tag token is an appropriate end tag token, then switch to the before attribute name state.
                        Otherwise, treat it as per the 'anything else' entry below.
                SOLIDUS (/): If the current end tag token is an appropriate end tag token, then switch to the this.closing start tag state.
                        Otherwise, treat it as per the 'anything else' entry below.
                GREATER-THAN SIGN (>): If the current end tag token is an appropriate end tag token, then switch to the data state and emit the current tag token.
                        Otherwise, treat it as per the 'anything else' entry below.
                */
                reconsume = 0;  /* see 12.2.4.13 - switch state for the following case, otherwise, reconsume. */
                this.tagNames[0] = '';
                this.tagNames[1] = '';
                switch (ch) {
                    case ' ': /** Whitespaces */
                        this.state = stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME;
                        break;
                    case '/': /** [/] */
                        this.state = stateMachine.State.STATE_SELF_CLOSING_START_TAG;
                        break;
                    case '>': /** [>] */
                        this.state = stateMachine.State.STATE_DATA;
                        break;
                }
            }
            break;
        case 7:                       /* append to the current end tag token */
            this.tagNameIdx = 1;
            this.tagNames[1] += ch.toLowerCase();
            break;
        case 8:                       /* switch to the script data double escaped state if we see <script> inside <script><!-- */
            if ( this.tagNames[1] === 'script') {
                this.state = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
            }
            break;
        case 9:                       /* Not implemented: attribute value special logic that never get used */
            break;
        case 10:                      /* the case for <!-- */

            // TODO - should introduce a new state instead of looking at input i+1.
            // 12.2.4.45 Markup declaration open state

            if ( i + 1 < len && input[i + 1] === '-') {
                this.state = stateMachine.State.STATE_AS_ONE;
                this.bytes[i + 1] = ch;
                this.states[i + 1] = this.state;
                this.symbols[i + 1] = symbol;
                this.contexts[i + 1] = stateMachine.Context.OPERATOR;
                ++i;
                ch = input[i];
                symbol = this.lookupChar(ch);
                this.state = stateMachine.State.STATE_COMMENT_START;
                this.afterWalk(ch);
            }
            break;
        case 11:                      /* context transition when seeing <sometag> and switch to Script / Rawtext / RCdata / ... */
            switch (this.tagNames[0]) {
                // TODO - give exceptions when non-HTML namespace is used.
                // case 'math':
                // case 'svg':
                //     break;
                case 'script':
                    this.state = stateMachine.State.STATE_SCRIPT_DATA;
                    break;
                case 'noframes':
                case 'style':
                case 'xmp':
                case 'iframe':
                case 'noembed':
                case 'noscript':
                    this.state = stateMachine.State.STATE_RAWTEXT;
                    break;
                case 'textarea':
                case 'title':
                    this.state = stateMachine.State.STATE_RCDATA;
                    break;
                case 'plaintext':
                    this.state = stateMachine.State.STATE_PLAINTEXT;
                    break;
            }
            break;
        case 12:                      /* new attribute name and value token */
            this.attributeValue = '';
            this.attributeName = ch.toLowerCase();
            break;
        case 13:                      /* append to attribute name token */
            this.attributeName += ch.toLowerCase();
            break;
        case 14:                      /* append to attribute value token */
            this.attributeValue += ch.toLowerCase();
            break;
    }

    if (reconsume) {                  /* reconsume the character */
        trace('Reconsuming...');
        this.states[i] = this.state;
        return this.walk(i, input);
    }

    this.bytes[i + 1] = ch;
    this.states[i + 1] = this.state;
    this.symbols[i + 1] = symbol;
    this.contexts[i + 1] = this.extractContext(this.states[i], this.states[i + 1]);

    return i;
};

/**
 * @function Parser#extractContext
 *
 * @param {integer} before - the state before the selected character
 * @param {integer} after - the state after the selected character
 * @returns {integer} the context of the character.

 */
Parser.prototype.extractContext = function(before, after) {

    if ( before === after ) {     /* context that are encapsulated by operators. e.g. bar in <foo>bar</far> */
        switch (after) {
            case stateMachine.State.STATE_DATA:
                return stateMachine.Context.HTML;
            case stateMachine.State.STATE_RCDATA:
                return stateMachine.Context.RCDATA;
            case stateMachine.State.STATE_RAWTEXT:
                return stateMachine.Context.RAWTEXT;
            case stateMachine.State.STATE_SCRIPT_DATA:
                return stateMachine.Context.SCRIPT;
            case stateMachine.State.STATE_PLAINTEXT:
                return stateMachine.Context.PLAINTEXT;
            case stateMachine.State.STATE_TAG_NAME:
            case stateMachine.State.STATE_RCDATA_END_TAG_NAME:
            case stateMachine.State.STATE_RAWTEXT_END_TAG_NAME:
                return stateMachine.Context.TAG_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_NAME:
                return stateMachine.Context.ATTRIBUTE_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_SINGLE_QUOTED;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_UNQUOTED;
            case stateMachine.State.STATE_BOGUS_COMMENT:
                return stateMachine.Context.BOGUS_COMMENT;
            case stateMachine.State.STATE_COMMENT:
                return stateMachine.Context.COMMENT;
            case stateMachine.State.STATE_SCRIPT_DATA_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END:                
                return stateMachine.Context.SCRIPT;                
        }
    } else {                   /* context that are determined by previous operator. e.g. bar in <bar quz=...> */
        switch (after) {
            case stateMachine.State.STATE_TAG_NAME:
            case stateMachine.State.STATE_RCDATA_END_TAG_NAME:
            case stateMachine.State.STATE_RAWTEXT_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME:
                return stateMachine.Context.TAG_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_NAME:
                return stateMachine.Context.ATTRIBUTE_NAME;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                return stateMachine.Context.ATTRIBUTE_VALUE_UNQUOTED;
            case stateMachine.State.STATE_BOGUS_COMMENT:
                return stateMachine.Context.BOGUS_COMMENT;

            // TODO... 
            case stateMachine.State.STATE_SCRIPT_DATA:                
            case stateMachine.State.STATE_SCRIPT_DATA_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN:
            case stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN:
            case stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END:                
                return stateMachine.Context.SCRIPT;
        }
    }

    return stateMachine.Context.OPERATOR;

};

/**
 * @function Parser#lookupChar
 *
 * @param {char} ch - The character.
 * @returns {integer} The integer to represent the type of input character.
 *
 * @description
 * <p>Map the character to character type.
 * e.g. [A-z] = type 17 (Letter [A-z])</p>
 *
 */
Parser.prototype.lookupChar = function(ch) {

    // console.log(' - ' + ch + ' - ')
    var o = ch.charCodeAt(0);

    switch(o) {
        case stateMachine.Char.TAB: return 0;
        case stateMachine.Char.LF: return 0;
        case stateMachine.Char.FF: return 0;
        case stateMachine.Char.SPACE: return 0;
        case stateMachine.Char.EXCLAMATION: return 1;
        case stateMachine.Char.DOUBLE_QUOTE: return 2;
        case stateMachine.Char.AMPERSAND: return 3;
        case stateMachine.Char.SINGLE_QUOTE: return 4;
        case stateMachine.Char.DASH: return 5;
        case stateMachine.Char.SLASH: return 6;
        case stateMachine.Char.GREATER: return 7;
        case stateMachine.Char.EQUAL: return 8;
        case stateMachine.Char.LESS: return 9;
        case stateMachine.Char.QUESTION: return 10;
        default:
            if( o >= stateMachine.Char.SMALL_A && o <= stateMachine.Char.SMALL_Z ) { return 11; }
            if( o >= stateMachine.Char.CAPTIAL_A && o <= stateMachine.Char.CAPTIAL_Z ) { return 11; }
        return 12;
    }
};

/**
 * @function Parser#beforeWalk
 *
 * @param {integer} i - the location of the head pointer.
 * @param {string} input - the input stream
 *
 * @return {integer} the new location of the head pointer.
 *
 * @description
 * Interface function for subclass to implement logics before parsing the character.
 *
 */
Parser.prototype.beforeWalk = function( i, input ) {
    debug('in html5 token beforeWalk');
    return i;
};

/**
 * @function Parser#afterWalk
 *
 * @param {string} ch - The character consumed.
 * @param {integer} i - the head pointer location of this character
 *
 * @description
 * Interface function for subclass to implement logics after parsing the character.
 *
 */
Parser.prototype.afterWalk = function( ch, i ) {
    debug('in html5 token afterWalk');
};

/**
 * @function Parser#setCurrentState
 *
 * @param {integer} state - The state of HTML5 page.
 *
 * @description
 * Set the current state of the HTML5 Context Parser.
 *
 */
Parser.prototype.setCurrentState = function(state) {
    this.state = state;
};

/**
 * @function Parser#getStates
 *
 * @returns {Array} An array of states.
 *
 * @description
 * Get the states of the HTML5 page
 *
 */
Parser.prototype.getStates = function() {
    return this.states;
};

/**
 * @function Parser#setInitState
 *
 * @param {integer} state - The initial state of the HTML5 Context Parser.
 *
 * @description
 * Set the init state of HTML5 Context Parser.
 *
 */
Parser.prototype.setInitState = function(state) {
    this.states[0] = state;
};

/**
 * @function Parser#getInitState
 *
 * @returns {integer} The initial state of the HTML5 Context Parser.
 *
 * @description
 * Get the init state of HTML5 Context Parser.
 *
 */
Parser.prototype.getInitState = function() {
    return this.states[0];
};

/**
 * @function Parser#getLastState
 *
 * @returns {integer} The last state of the HTML5 Context Parser.
 *
 * @description
 * Get the last state of HTML5 Context Parser.
 *
 */
Parser.prototype.getLastState = function() {
    /** undefined if length = 0 */
    return this.states[ this.states.length - 1 ];
};

/**
 * @function Parser#getBuffer
 *
 * @returns {string} The characters of the html page.
 *
 * @description
 * Get the characters from the buffer with _saveToBuffer = true.
 *
 */
Parser.prototype.getBuffer = function() {
    return this.bytes;
};

/**
 * @function Parser#getAttributeName
 *
 * @returns {string} The current handling attribute name.
 *
 * @description
 * Get the current handling attribute name of HTML tag.
 *
 */
Parser.prototype.getAttributeName = function() {
    return this.attributeName;
};

/**
 * @function Parser#getAttributeValue
 *
 * @returns {string} The current handling attribute name's value.
 *
 * @description
 * Get the current handling attribute name's value of HTML tag.
 *
 */
Parser.prototype.getAttributeValue = function() {
    return this.attributeValue;
};

/**
 * @function Parser#getStartTagName
 *
 * @returns {string} The current handling start tag name
 *
 */
Parser.prototype.getStartTagName = function() {
    return this.tagNames[0];
};

module.exports = {
    Parser: Parser,
    StateMachine: stateMachine
};

})();

},{"./html5-state-machine.js":2,"debug":3}],2:[function(require,module,exports){
/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
var StateMachine = {};

/* Character ASCII map */
StateMachine.Char = {};
StateMachine.Char.TAB = 0x09;
StateMachine.Char.LF = 0x0A;
StateMachine.Char.FF = 0x0C;
StateMachine.Char.SPACE = 0x20;
StateMachine.Char.EXCLAMATION = 0x21;
StateMachine.Char.DOUBLE_QUOTE = 0x22;
StateMachine.Char.AMPERSAND = 0x26;
StateMachine.Char.SINGLE_QUOTE = 0x27;
StateMachine.Char.DASH = 0x2D;
StateMachine.Char.SLASH = 0x2F;
StateMachine.Char.GREATER = 0x3C;
StateMachine.Char.EQUAL = 0x3D;
StateMachine.Char.LESS = 0x3E;
StateMachine.Char.QUESTION = 0x3F;
StateMachine.Char.CAPTIAL_A = 0x41;
StateMachine.Char.CAPTIAL_Z = 0x5A;
StateMachine.Char.SMALL_A = 0x61;
StateMachine.Char.SMALL_Z = 0x7A;

StateMachine.State = {};
StateMachine.State.STATE_UNKNOWN = 0;
StateMachine.State.STATE_DATA = 1;
StateMachine.State.STATE_RCDATA = 3;
StateMachine.State.STATE_RAWTEXT = 5;
StateMachine.State.STATE_SCRIPT_DATA = 6;
StateMachine.State.STATE_PLAINTEXT = 7;
StateMachine.State.STATE_TAG_OPEN = 8;
StateMachine.State.STATE_END_TAG_OPEN = 9;
StateMachine.State.STATE_TAG_NAME = 10;
StateMachine.State.STATE_RCDATA_LESS_THAN_SIGN = 11;
StateMachine.State.STATE_RCDATA_END_TAG_OPEN = 12;
StateMachine.State.STATE_RCDATA_END_TAG_NAME = 13;
StateMachine.State.STATE_RAWTEXT_LESS_THAN_SIGN = 14;
StateMachine.State.STATE_RAWTEXT_END_TAG_OPEN = 15;
StateMachine.State.STATE_RAWTEXT_END_TAG_NAME = 16;
StateMachine.State.STATE_SCRIPT_DATA_LESS_THAN_SIGN = 17;
StateMachine.State.STATE_SCRIPT_DATA_END_TAG_OPEN = 18;
StateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME = 19;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START = 20;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPE_START_DASH = 21;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPED = 22;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH = 23;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPED_DASH_DASH = 24;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN = 25;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN = 26;
StateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME = 27;
StateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START = 28;
StateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED = 29;
StateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH = 30;
StateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_DASH_DASH = 31;
StateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED_LESS_THAN_SIGN = 32;
StateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END = 33;
StateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME = 34;
StateMachine.State.STATE_ATTRIBUTE_NAME = 35;
StateMachine.State.STATE_AFTER_ATTRIBUTE_NAME = 36;
StateMachine.State.STATE_BEFORE_ATTRIBUTE_VALUE = 37;
StateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED = 38;
StateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED = 39;
StateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED = 40;
StateMachine.State.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED = 42;
StateMachine.State.STATE_SELF_CLOSING_START_TAG = 43;
StateMachine.State.STATE_BOGUS_COMMENT = 44;
StateMachine.State.STATE_MARKUP_DECLARATION_OPEN = 45;
StateMachine.State.STATE_COMMENT_START = 46;
StateMachine.State.STATE_COMMENT_START_DASH = 47;
StateMachine.State.STATE_COMMENT = 48;
StateMachine.State.STATE_COMMENT_END_DASH = 49;
StateMachine.State.STATE_COMMENT_END = 50;
StateMachine.State.STATE_COMMENT_END_BANG = 51;
StateMachine.State.STATE_AS_ONE = 999;

StateMachine.Context = {};
StateMachine.Context.OPERATOR = 0;
StateMachine.Context.HTML = 1;
StateMachine.Context.RCDATA = 2;
StateMachine.Context.RAWTEXT = 3;
StateMachine.Context.SCRIPT = 4;
StateMachine.Context.PLAINTEXT = 5;
StateMachine.Context.TAG_NAME = 6;
StateMachine.Context.ATTRIBUTE_NAME = 7;
StateMachine.Context.ATTRIBUTE_VALUE_DOUBLE_QUOTED = 8;
StateMachine.Context.ATTRIBUTE_VALUE_SINGLE_QUOTED = 9;
StateMachine.Context.ATTRIBUTE_VALUE_UNQUOTED = 10;
StateMachine.Context.COMMENT = 11;
StateMachine.Context.BOGUS_COMMENT = 12;
StateMachine.Context.SCRIPT_COMMENT = 13;
StateMachine.Context.SCRIPT_IN_SCRIPT = 14;


StateMachine.Symbol = {};
StateMachine.Symbol.SPACE = 0;
StateMachine.Symbol.EXCLAMATION = 1;
StateMachine.Symbol.QUOTATION = 2;
StateMachine.Symbol.AMPERSAND = 3;
StateMachine.Symbol.APOSTROPHE = 4;
StateMachine.Symbol.HYPHEN = 5;
StateMachine.Symbol.SOLIDUS = 6;
StateMachine.Symbol.LESS = 7;
StateMachine.Symbol.EQUAL = 8;
StateMachine.Symbol.GREATER = 9;
StateMachine.Symbol.QUESTIONMARK = 10;
StateMachine.Symbol.LETTER = 11;
StateMachine.Symbol.ELSE = 12;

StateMachine.lookupStateFromSymbol = {
   0: [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,34, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,34,36,36,37,38,39,34, 0,34,34,44,44,48,48,48,48,48,48],
   1: [ 0, 1, 0, 3, 0, 5, 6, 7,45,44,10, 3, 3, 3, 5, 5, 5,20, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,51,48],
   2: [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,38,42,39,40, 0,34,34,44,44,48,48,48,48,48,48],
   3: [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48],
   4: [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,39,38,42,40, 0,34,34,44,44,48,48,48,48,48,48],
   5: [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6,21,24,23,24,24,22,22,22,22,30,31,31,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,47,50,49,50,50,49],
   6: [ 0, 1, 0, 3, 0, 5, 6, 7, 9,44,43,12, 3, 3,15, 5, 5,18, 6, 6, 6, 6,22,22,22,26,22,22,22,29,29,29,33,29,43,43,43,40,38,39,40, 0,43,34,44,44,48,48,48,48,48,48],
   7: [ 0, 8, 0,11, 0,14,17, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,25,25,25,22,22,22,22,32,32,32,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48],
   8: [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,37,37,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48],
   9: [ 0, 1, 0, 3, 0, 5, 6, 7, 1, 1, 1, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22, 6,22,22,22,22,29,29, 6,29,29, 1, 1, 1, 1,38,39, 1, 0, 1, 1, 1,44, 1, 1,48,48, 1, 1],
  10: [ 0, 1, 0, 3, 0, 5, 6, 7,44,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48],
  11: [ 0, 1, 0, 3, 0, 5, 6, 7,10,10,10, 3,13,13, 5,16,16, 6,19,19, 6, 6,22,22,22,28,27,27,28,29,29,29,29,33,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48],
  12: [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48]
};

StateMachine.lookupAltLogicFromSymbol = {
   0: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 6, 8, 0, 0, 0, 0, 8, 0, 0, 0, 0,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   1: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   2: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12, 0, 0,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   3: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12, 0,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   4: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12, 0,14, 0,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   5: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0,10, 0, 0, 0, 0, 0, 0],
   6: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 6, 4, 0, 6, 4, 0, 6, 0, 0, 0, 0, 0, 4, 0, 6, 8, 0, 0, 0, 4, 8, 0, 0, 0,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   7: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   8: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12, 0, 0,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
   9: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 6, 0, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 6, 8, 0, 0, 0, 0, 8,11,11,11,11,14,14,11, 0,11,11, 0, 0, 0, 0, 0, 0, 0, 0],
  10: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  11: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 0, 0, 0, 0, 2, 2, 3, 3, 0, 0, 0, 0, 3,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  12: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

StateMachine.lookupReconsumeFromSymbol = {
   0: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   1: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   2: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   3: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   4: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   5: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   6: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   7: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   8: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
   9: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  10: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  11: [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  12: [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]
};

module.exports = StateMachine;

},{}],3:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Use chrome.storage.local if we are in an app
 */

var storage;

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined')
  storage = chrome.storage.local;
else
  storage = localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      storage.removeItem('debug');
    } else {
      storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":4}],4:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":5}],5:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],6:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],7:[function(require,module,exports){
/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
/*jshint node: true */

exports._getPrivFilters = function () {

    var STR_UD = 'undefined',
        STR_NL = 'null',
        LT     = /</g,
        QUOT   = /\"/g,
        SQUOT  = /\'/g,
        SPECIAL_HTML_CHARS = /[&<>"']/g;

    var COMMENT_SENSITIVE_CHARS = /(--!?>|--?!?$|\]>|\]$)/g;

    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
    var BEFORE_ATTR_VALUE_CHARS = /^["']/;
    var ATTR_VALUE_UNQUOTED_CHARS = /[\t\n\f >]/g;

    // Reference: https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet#Null_breaks_up_JavaScript_directive
    // Reference: https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet#Embedded_newline_to_break_up_XSS
    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
    // Reference for named characters: https://html.spec.whatwg.org/multipage/entities.json
    /*
    var URI_BLACKLIST_INTERIM_WHITESPACE = [
        '(?:',
        [
            // encodeURI/encodeURIComponent has percentage encoded ASCII chars of decimal 0-32
            // '\u0000',                                
            // '\t', '\n', '\r',                        // tab, newline, carriage return
            '&#[xX]0*[9aAdD];?',                    // &#x9, &#xA, &#xD in hex
            '&#0*(?:9|10|13);?',                    // &#9, &#10, &#13 in dec
            '&Tab;', '&NewLine;'                   // tab, newline in char entities
        ].join('|'),
        ')*'
    ].join('');

    // delay building the following as an RegExp() object until the first hit
    var URI_BLACKLIST, URI_BLACKLIST_REGEXPSTR = [

        // https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet#Spaces_and_meta_chars_before_the_JavaScript_in_images_for_XSS
        '^(?:',
        [
            // encodeURI/encodeURIComponent has percentage encoded ASCII chars of decimal 0-32
            // '\u0001', '\u0002', '\u0003', '\u0004', 
            // '\u0005', '\u0006', '\u0007', '\u0008', 
            // '\u0009', '\u000A', '\u000B', '\u000C', 
            // '\u000D', '\u000E', '\u000F', '\u0010', 
            // '\u0011', '\u0012', '\u0013', '\u0014', 
            // '\u0015', '\u0016', '\u0017', '\u0018', 
            // '\u0019', '\u001A', '\u001B', '\u001C', 
            // '\u001D', '\u001E', '\u001F', '\u0020', 
            '&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?',     // &#x1-20 in hex
            '&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?',   // &#1-32  in dec
            '&Tab;', '&NewLine;'                    // space, newline in char entities
            
        ].join('|'),
        ')*',


        // &#x6A;&#x61;&#x76;&#x61;             &#106&#97&#118&#97              java
        // &#x4A;&#x41;&#x56;&#x41;             &#74&#65&#86&#65                JAVA
        // &#x76;&#x62;                         &#118&#98                       vb
        // &#x56;&#x42;                         &#86&#66                        VB
        // &#x73;&#x63;&#x72;&#x69;&#x70;&#x74; &#115&#99&#114&#105&#112&#116   script
        // &#x53;&#x43;&#x52;&#x49;&#x50;&#x54; &#83&#67&#82&#73&#80&#84        SCRIPT
        // &#x3A;                               &#58                            :

        // java|vb
        '(?:',
        [
            // java
            [
                '(?:j|J|&#[xX]0*(?:6|4)[aA];?|&#0*(?:106|74);?)',
                '(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)',
                '(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)',
                '(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)',

            ].join(URI_BLACKLIST_INTERIM_WHITESPACE),
            // vb
            [
                '(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)',
                '(?:b|B|&#[xX]0*(?:6|4)2;?|&#0*(?:98|66);?)'

            ].join(URI_BLACKLIST_INTERIM_WHITESPACE)

        ].join('|'),
        ')',

        URI_BLACKLIST_INTERIM_WHITESPACE,

        // script:
        [
            '(?:s|S|&#[xX]0*(?:7|5)3;?|&#0*(?:115|83);?)',
            '(?:c|C|&#[xX]0*(?:6|4)3;?|&#0*(?:99|67);?)',
            '(?:r|R|&#[xX]0*(?:7|5)2;?|&#0*(?:114|82);?)',
            '(?:i|I|&#[xX]0*(?:6|4)9;?|&#0*(?:105|73);?)',
            '(?:p|P|&#[xX]0*(?:7|5)0;?|&#0*(?:112|80);?)',
            '(?:t|T|&#[xX]0*(?:7|5)4;?|&#0*(?:116|84);?)',
            '(?:\:|&#[xX]0*3[aA];?|&#0*58;?)'

        ].join(URI_BLACKLIST_INTERIM_WHITESPACE)
    ].join('');
    */

    var URI_SLOWLANE = ['&', 'j', 'J', 'v', 'V'],
        URI_BLACKLIST = null, 
        // delay building URI_BLACKLIST as an RegExp() object until the first hit
        // the following str is generated by the above commented logic
        URI_BLACKLIST_REGEXPSTR = "^(?:&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?|&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?|&Tab;|&NewLine;)*(?:(?:j|J|&#[xX]0*(?:6|4)[aA];?|&#0*(?:106|74);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)|(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:b|B|&#[xX]0*(?:6|4)2;?|&#0*(?:98|66);?))(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:s|S|&#[xX]0*(?:7|5)3;?|&#0*(?:115|83);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:c|C|&#[xX]0*(?:6|4)3;?|&#0*(?:99|67);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:r|R|&#[xX]0*(?:7|5)2;?|&#0*(?:114|82);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:i|I|&#[xX]0*(?:6|4)9;?|&#0*(?:105|73);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:p|P|&#[xX]0*(?:7|5)0;?|&#0*(?:112|80);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:t|T|&#[xX]0*(?:7|5)4;?|&#0*(?:116|84);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?::|&#[xX]0*3[aA];?|&#0*58;?)";

    // Given a full URI, need to support "[" ( IPv6address ) "]" in URI as per RFC3986
    // Reference: https://tools.ietf.org/html/rfc3986
    var URL_IPV6 = /\/\/%5[Bb]([A-Fa-f0-9:]+)%5[Dd]/;

    return {

        // TODO: remove the following mappings 
        FILTER_NOT_HANDLE: "y",
        FILTER_DATA: "yd",
        FILTER_COMMENT: "yc",
        FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED: "yavd",
        FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED: "yavs",
        FILTER_ATTRIBUTE_VALUE_UNQUOTED: "yavu",
        FILTER_ENCODE_URI: "yu",
        FILTER_ENCODE_URI_COMPONENT: "yuc",
        FILTER_URI_SCHEME_BLACKLIST: "yubl",
        FILTER_FULL_URI: "yufull",

        /*
         * @param {string} s - An untrusted user input
         * @returns {string} s - The original user input with & < > " ' encoded respectively as &amp; &lt; &gt; &quot; and &#39;.
         *
         * @description
         * <p>This filter is a fallback to use the standard HTML escaping (i.e., encoding &<>"')
         * in contexts that are currently not handled by the automatic context-sensitive templating solution.</p>
         *
         * Workaround this problem by following the suggestion below:
         * Use <input id="strJS" value="{{xssFilters.inHTMLData(data)}}"> 
         * and retrieve your data with document.getElementById('strJS').value. 
         *
         */
        y: function(s) {
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(SPECIAL_HTML_CHARS, function (m) {
                        if (m === '&')      { return '&amp;';  }
                        if (m === '<')      { return '&lt;';   }
                        if (m === '>')      { return '&gt;';   }
                        if (m === '"')      { return '&quot;'; }
                        /* if (m === "'") */  return '&#39;';
                    });
        },

        // FOR DETAILS, refer to inHTMLData()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#data-state
        yd: function (s) {
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(LT, '&lt;');
        },

        // FOR DETAILS, refer to inHTMLComment()
        // '-->' and '--!>' are modified as '-- >' and '--! >' so as stop comment state breaking
        // for string ends with '--!', '--', or '-' are appended with a space, so as to stop collaborative state breaking at {{s}}>, {{s}}!>, {{s}}->
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#comment-state
        // ']>' and 'ends with ]' patterns deal with IE conditional comments. verified in IE that '] >' can stop that.
        // Reference: http://msdn.microsoft.com/en-us/library/ms537512%28v=vs.85%29.aspx
        yc: function (s) {
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(COMMENT_SENSITIVE_CHARS, function(m){
                        if (m === '-->')  { return '-- >';  }
                        if (m === '--!>') { return '--! >'; }
                        if (m === '--!')  { return '--! ';  }
                        if (m === '--')   { return '-- ';   }
                        if (m === '-')    { return '- ';    }
                        if (m === ']>')   { return '] >';   }
                        /*if (m === ']')*/  return '] ';
                    });
        },

        // FOR DETAILS, refer to inDoubleQuotedAttr()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state
        yavd: function (s) {
            return typeof s === STR_UD  ? STR_UD
                 : s === null           ? STR_NL
                 : s.toString()
                    .replace(QUOT, '&quot;');
        },

        // FOR DETAILS, refer to inSingleQuotedAttr()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state
        yavs: function (s) {
            return typeof s === STR_UD  ? STR_UD
                 : s === null           ? STR_NL
                 : s.toString()
                    .replace(SQUOT, '&#39;');
        },

        // FOR DETAILS, refer to inUnQuotedAttr()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
        yavu: function (s) {
            if (typeof s === STR_UD) { return STR_UD; }
            if (s === null)          { return STR_NL; }

            s = s.toString().replace(ATTR_VALUE_UNQUOTED_CHARS, function (m) {
                if (m === '\t')    { return '&Tab;';     }
                if (m === '\n')    { return '&NewLine;'; }
                if (m === '\f')    { return '&#12;';     } // in hex: 0C
                if (m === ' ')     { return '&#32;';     } // in hex: 20
                /*if (m === '>')*/   return '&gt;';
            });

            // if s starts with ' or ", encode it resp. as &#39; or &quot; to enforce the attr value (unquoted) state
            // if instead starts with some whitespaces [\t\n\f ] then optionally a quote, 
            //    then the above encoding has already enforced the attr value (unquoted) state
            //    therefore, no need to encode the quote
            // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
            s = s.replace(BEFORE_ATTR_VALUE_CHARS, function (m) {
                if (m === '"')     { return '&quot;'; }
                /*if (m === "'")*/   return '&#39;';
            });

            // Inject NULL character if an empty string is encountered in 
            // unquoted attribute value state.
            //
            // Example:
            // <input value={{yavu s}} name="passwd"/>
            //
            // Rationale 1: our belief is that developers wouldn't expect an 
            //   empty string would result in ' name="firstname"' rendered as 
            //   attribute value, even though this is how HTML5 is specified.
            // Rationale 2: an empty string can effectively alter its immediate
            //   subsequent state, which violates our design principle. As per 
            //   the HTML 5 spec, NULL or \u0000 is the magic character to end 
            //   the comment state, which therefore will not mess up later 
            //   contexts.
            // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
            return (s === '') ? '\u0000' : s;
        },

        yu: encodeURI,
        yuc: encodeURIComponent,

        /* 
         * =============================
         * Rationale on data: protocol
         * =============================
         * Given there're two execution possibilities:
         *  1. data:text/html,<script>alert(1)</script> in <(i)frame>'s src
         *     expected script execution but it's of a different origin than the included page. hence not CROSS-SITE scripting
         *  2. data:application/javascript,alert(1) or data:,alert(1) in <script>'s src,
         *     data:text/css in <style>'s src
         *     data:image/svg+xml in <svg>'s src
         *     We already made it clear in the DISCLAIMER that anything involving <script>, <style>, and <svg> tags won't be taken care of
         *  Finally, we don't care the use of data: protocol
         */
        // Notice that yubl MUST BE APPLIED LAST, and will not be used independently (expected output from encodeURI/encodeURIComponent and yavd/yavs/yavu)
        // This is used to disable JS execution capabilities by prefixing x- to ^javascript: or ^vbscript: that possibly could trigger script execution in URI attribute context
        yubl: function (s) {
            
            // assumption: s has gone through yavd/yavs/yavu(encodeURI/encodeURIComponent(s))
            // chars like whitespaces are already turned to %-encoding
            // so, let go if the first char is not &, j, J, v nor V
            if (URI_SLOWLANE.indexOf(s[0]) === -1) {
                return s;
            }
            
            // build URI_BLACKLIST as a RegExp() object
            if (URI_BLACKLIST === null) {
                URI_BLACKLIST = new RegExp(URI_BLACKLIST_REGEXPSTR);
            }

            return URI_BLACKLIST.test(s) ? 'x-' + s : s;
        },

        // This is NOT a security-critical filter.
        // Reference: https://tools.ietf.org/html/rfc3986
        yufull: function (s) {
            // return exports.yu(s)
            return encodeURI(s)
                    .replace(URL_IPV6, function(m, p) {
                        return '//[' + p + ']';
                    });
        }
    };
};

// exposing privFilters
// this is an undocumented feature, and please use it with extra care
var privFilters = exports._privFilters = exports._getPrivFilters();


/* chaining filters */

// uriInAttr and literally uriPathInAttr
// yubl is always used 
// Rationale: given pattern like this: <a href="{{{uriPathInDoubleQuotedAttr s}}}">
//            developer may expect s is always prefixed with ? or /, but an attacker can abuse it with 'javascript:alert(1)'
function uriInAttr (s, yav, yu) {
    return privFilters.yubl(yav((yu || privFilters.yufull)(s)));
}

/** 
* Yahoo Secure XSS Filters - just sufficient output filtering to prevent XSS!
* @module xss-filters 
*/

/**
* @function module:xss-filters#inHTMLData
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with '<' encoded as '&amp;lt;'
*
* @description
* This filter is to be placed in HTML Data context to encode all '<' characters into '&amp;lt;'
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <textarea>{{{inHTMLData html_data}}}</textarea>
*
*/
exports.inHTMLData = privFilters.yd;


/**
* @function module:xss-filters#inHTMLComment
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with '-->', '--!>', ']>' respectively replaced with '-- >', '--! >', '] >'. In addition, a space is appended to those string s that ends with '-', '--', '--!', and ']'. 
*
* @description
* This filter is to be placed in HTML Comment context to disable any attempts in closing the html comment state
* <p>Notice: --> and --!> are the syntaxes to close html comment state, while string that ends with -, --, or --! will also enable state closing if the variable is externally suffixed with -> or >.
*            ']>' and string that ends with ']' are changed to '] >' and '] ' to disable Internet Explorer conditional comments, which are actually not part of the HTML 5 standard.</p>
*
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* <li><a href="http://msdn.microsoft.com/en-us/library/ms537512%28v=vs.85%29.aspx">Conditional Comments in Internet Explorer</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- {{{inHTMLComment html_comment}}} -->
*
*/
exports.inHTMLComment = privFilters.yc;

/**
* @function module:xss-filters#inSingleQuotedAttr
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with any single-quote characters encoded into '&amp;&#39;'.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InSingleQuotedAttr filter </p>
* This filter is to be placed in HTML Attribute Value (single-quoted) state to encode all single-quote characters into '&amp;&#39;'
*
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <input name='firstname' value='{{{inSingleQuotedAttr firstname}}}' />
*
*/
exports.inSingleQuotedAttr = privFilters.yavs;

/**
* @function module:xss-filters#inDoubleQuotedAttr
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with any single-quote characters encoded into '&amp;&quot;'.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InDoubleQuotedAttr filter </p>
* This filter is to be placed in HTML Attribute Value (double-quoted) state to encode all single-quote characters into '&amp;&quot;'
*
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <input name="firstname" value="{{{inDoubleQuotedAttr firstname}}}" />
*
*/
exports.inDoubleQuotedAttr = privFilters.yavd;

/**
* @function module:xss-filters#inUnQuotedAttr
*
* @param {string} s - An untrusted user input
* @returns {string} The string s with any tab, LF, FF, space, and '>' encoded.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InUnQuotedAttr filter </p>
* This filter is to be placed in HTML Attribute Value (unquoted) state to encode tab, LF, FF, space, and '>' into their equivalent HTML entity representations.
*
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <input name="firstname" value={{{inUnQuotedAttr firstname}}} />
*
*/
exports.inUnQuotedAttr = privFilters.yavu;


/**
* @function module:xss-filters#uriInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded first by window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for an <strong>absolute</strong> URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='{{{uriInSingleQuotedAttr full_uri}}}'>link</a>
* 
*/
exports.uriInSingleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavs);
};

/**
* @function module:xss-filters#uriInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded first by window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for an <strong>absolute</strong> URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="{{{uriInDoubleQuotedAttr full_uri}}}">link</a>
* 
*/
exports.uriInDoubleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavd);
};


/**
* @function module:xss-filters#uriInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded first by window.encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for an <strong>absolute</strong> URI.<br/>
* The correct order of encoders is thus: first the built-in encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href={{{uriInUnQuotedAttr full_uri}}}>link</a>
* 
*/
exports.uriInUnQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavu);
};

/**
* @function module:xss-filters#uriInHTMLData
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded by window.encodeURI() and then inHTMLData()
*
* @description
* This filter is to be placed in HTML Data state for an <strong>absolute</strong> URI.
*
* <p>Notice: The actual implementation skips inHTMLData(), since '<' is already encoded as '%3C' by encodeURI().</p>
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="/somewhere">{{{uriInHTMLData full_uri}}}</a>
* 
*/
exports.uriInHTMLData = privFilters.yufull;


/**
* @function module:xss-filters#uriInHTMLComment
*
* @param {string} s - An untrusted user input, supposedly an <strong>absolute</strong> URI
* @returns {string} The string s encoded by window.encodeURI(), and finally inHTMLComment()
*
* @description
* This filter is to be placed in HTML Comment state for an <strong>absolute</strong> URI.
*
* <p>Notice: This filter is IPv6 friendly by not encoding '[' and ']'.</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- {{{uriInHTMLComment full_uri}}} -->
* 
*/
exports.uriInHTMLComment = function (s) {
    return privFilters.yc(privFilters.yufull(s));
};




/**
* @function module:xss-filters#uriPathInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded first by window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for a URI Path/Query or relative URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='http://example.com/{{{uriPathInSingleQuotedAttr uri_path}}}'>link</a>
* <a href='http://example.com/?{{{uriQueryInSingleQuotedAttr uri_query}}}'>link</a>
* 
*/
exports.uriPathInSingleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavs, privFilters.yu);
};

/**
* @function module:xss-filters#uriPathInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded first by window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for a URI Path/Query or relative URI.<br/>
* The correct order of encoders is thus: first window.encodeURI(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/{{{uriPathInDoubleQuotedAttr uri_path}}}">link</a>
* <a href="http://example.com/?{{{uriQueryInDoubleQuotedAttr uri_query}}}">link</a>
* 
*/
exports.uriPathInDoubleQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavd, privFilters.yu);
};


/**
* @function module:xss-filters#uriPathInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded first by window.encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for a URI Path/Query or relative URI.<br/>
* The correct order of encoders is thus: first the built-in encodeURI(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href=http://example.com/{{{uriPathInUnQuotedAttr uri_path}}}>link</a>
* <a href=http://example.com/?{{{uriQueryInUnQuotedAttr uri_query}}}>link</a>
* 
*/
exports.uriPathInUnQuotedAttr = function (s) {
    return uriInAttr(s, privFilters.yavu, privFilters.yu);
};

/**
* @function module:xss-filters#uriPathInHTMLData
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded by window.encodeURI() and then inHTMLData()
*
* @description
* This filter is to be placed in HTML Data state for a URI Path/Query or relative URI.
*
* <p>Notice: The actual implementation skips inHTMLData(), since '<' is already encoded as '%3C' by encodeURI().</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/">http://example.com/{{{uriPathInHTMLData uri_path}}}</a>
* <a href="http://example.com/">http://example.com/?{{{uriQueryInHTMLData uri_query}}}</a>
* 
*/
exports.uriPathInHTMLData = privFilters.yu;


/**
* @function module:xss-filters#uriPathInHTMLComment
*
* @param {string} s - An untrusted user input, supposedly a URI Path/Query or relative URI
* @returns {string} The string s encoded by window.encodeURI(), and finally inHTMLComment()
*
* @description
* This filter is to be placed in HTML Comment state for a URI Path/Query or relative URI.
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI">encodeURI | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- http://example.com/{{{uriPathInHTMLComment uri_path}}} -->
* <!-- http://example.com/?{{{uriQueryInHTMLComment uri_query}}} -->
*/
exports.uriPathInHTMLComment = function (s) {
    return privFilters.yc(privFilters.yu(s));
};


/**
* @function module:xss-filters#uriQueryInSingleQuotedAttr
* @description This is an alias of {@link module:xss-filters#uriPathInSingleQuotedAttr}
* 
* @alias module:xss-filters#uriPathInSingleQuotedAttr
*/
exports.uriQueryInSingleQuotedAttr = exports.uriPathInSingleQuotedAttr;

/**
* @function module:xss-filters#uriQueryInDoubleQuotedAttr
* @description This is an alias of {@link module:xss-filters#uriPathInDoubleQuotedAttr}
* 
* @alias module:xss-filters#uriPathInDoubleQuotedAttr
*/
exports.uriQueryInDoubleQuotedAttr = exports.uriPathInDoubleQuotedAttr;

/**
* @function module:xss-filters#uriQueryInUnQuotedAttr
* @description This is an alias of {@link module:xss-filters#uriPathInUnQuotedAttr}
* 
* @alias module:xss-filters#uriPathInUnQuotedAttr
*/
exports.uriQueryInUnQuotedAttr = exports.uriPathInUnQuotedAttr;

/**
* @function module:xss-filters#uriQueryInHTMLData
* @description This is an alias of {@link module:xss-filters#uriPathInHTMLData}
* 
* @alias module:xss-filters#uriPathInHTMLData
*/
exports.uriQueryInHTMLData = exports.uriPathInHTMLData;

/**
* @function module:xss-filters#uriQueryInHTMLComment
* @description This is an alias of {@link module:xss-filters#uriPathInHTMLComment}
* 
* @alias module:xss-filters#uriPathInHTMLComment
*/
exports.uriQueryInHTMLComment = exports.uriPathInHTMLComment;



/**
* @function module:xss-filters#uriComponentInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inSingleQuotedAttr()
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for a URI Component.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inSingleQuotedAttr()
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='http://example.com/?q={{{uriComponentInSingleQuotedAttr uri_component}}}'>link</a>
* 
*/
exports.uriComponentInSingleQuotedAttr = function (s) {
    return privFilters.yavs(privFilters.yuc(s));
};

/**
* @function module:xss-filters#uriComponentInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inDoubleQuotedAttr()
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for a URI Component.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inDoubleQuotedAttr()
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/?q={{{uriComponentInDoubleQuotedAttr uri_component}}}">link</a>
* 
*/
exports.uriComponentInDoubleQuotedAttr = function (s) {
    return privFilters.yavd(privFilters.yuc(s));
};


/**
* @function module:xss-filters#uriComponentInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inUnQuotedAttr()
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for a URI Component.<br/>
* The correct order of encoders is thus: first the built-in encodeURIComponent(), then inUnQuotedAttr()
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href=http://example.com/?q={{{uriComponentInUnQuotedAttr uri_component}}}>link</a>
* 
*/
exports.uriComponentInUnQuotedAttr = function (s) {
    return privFilters.yavu(privFilters.yuc(s));
};

/**
* @function module:xss-filters#uriComponentInHTMLData
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded by window.encodeURIComponent() and then inHTMLData()
*
* @description
* This filter is to be placed in HTML Data state for a URI Component.
*
* <p>Notice: The actual implementation skips inHTMLData(), since '<' is already encoded as '%3C' by encodeURIComponent().</p>
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/">http://example.com/?q={{{uriComponentInHTMLData uri_component}}}</a>
* <a href="http://example.com/">http://example.com/#{{{uriComponentInHTMLData uri_fragment}}}</a>
* 
*/
exports.uriComponentInHTMLData = privFilters.yuc;


/**
* @function module:xss-filters#uriComponentInHTMLComment
*
* @param {string} s - An untrusted user input, supposedly a URI Component
* @returns {string} The string s encoded by window.encodeURIComponent(), and finally inHTMLComment()
*
* @description
* This filter is to be placed in HTML Comment state for a URI Component.
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#data-state">HTML5 Data State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <!-- http://example.com/?q={{{uriComponentInHTMLComment uri_component}}} -->
* <!-- http://example.com/#{{{uriComponentInHTMLComment uri_fragment}}} -->
*/
exports.uriComponentInHTMLComment = function (s) {
    return privFilters.yc(privFilters.yuc(s));
};


// uriFragmentInSingleQuotedAttr
// added yubl on top of uriComponentInAttr 
// Rationale: given pattern like this: <a href='{{{uriFragmentInSingleQuotedAttr s}}}'>
//            developer may expect s is always prefixed with #, but an attacker can abuse it with 'javascript:alert(1)'

/**
* @function module:xss-filters#uriFragmentInSingleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Fragment
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (single-quoted) state for a URI Fragment.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inSingleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state">HTML5 Attribute Value (Single-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href='http://example.com/#{{{uriFragmentInSingleQuotedAttr uri_fragment}}}'>link</a>
* 
*/
exports.uriFragmentInSingleQuotedAttr = function (s) {
    return privFilters.yubl(privFilters.yavs(privFilters.yuc(s)));
};

// uriFragmentInDoubleQuotedAttr
// added yubl on top of uriComponentInAttr 
// Rationale: given pattern like this: <a href="{{{uriFragmentInDoubleQuotedAttr s}}}">
//            developer may expect s is always prefixed with #, but an attacker can abuse it with 'javascript:alert(1)'

/**
* @function module:xss-filters#uriFragmentInDoubleQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Fragment
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (double-quoted) state for a URI Fragment.<br/>
* The correct order of encoders is thus: first window.encodeURIComponent(), then inDoubleQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(double-quoted)-state">HTML5 Attribute Value (Double-Quoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href="http://example.com/#{{{uriFragmentInDoubleQuotedAttr uri_fragment}}}">link</a>
* 
*/
exports.uriFragmentInDoubleQuotedAttr = function (s) {
    return privFilters.yubl(privFilters.yavd(privFilters.yuc(s)));
};

// uriFragmentInUnQuotedAttr
// added yubl on top of uriComponentInAttr 
// Rationale: given pattern like this: <a href={{{uriFragmentInUnQuotedAttr s}}}>
//            developer may expect s is always prefixed with #, but an attacker can abuse it with 'javascript:alert(1)'

/**
* @function module:xss-filters#uriFragmentInUnQuotedAttr
*
* @param {string} s - An untrusted user input, supposedly a URI Fragment
* @returns {string} The string s encoded first by window.encodeURIComponent(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* @description
* This filter is to be placed in HTML Attribute Value (unquoted) state for a URI Fragment.<br/>
* The correct order of encoders is thus: first the built-in encodeURIComponent(), then inUnQuotedAttr(), and finally prefix the resulted string with 'x-' if it begins with 'javascript:' or 'vbscript:' that could possibly lead to script execution
*
* <ul>
* <li><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent">encodeURIComponent | MDN</a></li>
* <li><a href="http://tools.ietf.org/html/rfc3986">RFC 3986</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* </ul>
*
* @example
* // output context to be applied by this filter.
* <a href=http://example.com/#{{{uriFragmentInUnQuotedAttr uri_fragment}}}>link</a>
* 
*/
exports.uriFragmentInUnQuotedAttr = function (s) {
    return privFilters.yubl(privFilters.yavu(privFilters.yuc(s)));
};


/**
* @function module:xss-filters#uriFragmentInHTMLData
* @description This is an alias of {@link module:xss-filters#uriComponentInHTMLData}
* 
* @alias module:xss-filters#uriComponentInHTMLData
*/
exports.uriFragmentInHTMLData = exports.uriComponentInHTMLData;

/**
* @function module:xss-filters#uriFragmentInHTMLComment
* @description This is an alias of {@link module:xss-filters#uriComponentInHTMLComment}
* 
* @alias module:xss-filters#uriComponentInHTMLComment
*/
exports.uriFragmentInHTMLComment = exports.uriComponentInHTMLComment;

},{}],8:[function(require,module,exports){
(function (process){
/* 
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {
"use strict";

/* debug facility */
var debug = require('debug')('cph-debug'),
    debugDump = require('debug')('cph-dump'),
    debugBranch = require('debug')('cph-branching');

/* import the html context parser */
var contextParser = require('context-parser'),
    handlebarsUtils = require('./handlebars-utils.js'),
    stateMachine = contextParser.StateMachine;

var filter = require('xss-filters')._privFilters;

/** 
* @module ContextParserHandlebars
*/
function ContextParserHandlebars(printChar) {

    /* super() */
    contextParser.Parser.call(this);

    /* save the processed char */
    this._buffer = [];

    this._knownFilters = [];
    this._knownFilters.push(filter.FILTER_DATA);
    this._knownFilters.push(filter.FILTER_COMMENT);
    this._knownFilters.push(filter.FILTER_ATTRIBUTE_VALUE_UNQUOTED);
    this._knownFilters.push(filter.FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED);
    this._knownFilters.push(filter.FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED);
    this._knownFilters.push(filter.FILTER_ENCODE_URI);
    this._knownFilters.push(filter.FILTER_ENCODE_URI_COMPONENT);
    this._knownFilters.push(filter.FILTER_URI_SCHEME_BLACKLIST);
    this._knownFilters.push(filter.FILTER_FULL_URI);
    this._knownFilters.push(filter.FILTER_NOT_HANDLE);

    /* the flag is used to print out the char to console */
    this._printCharEnable = typeof printChar !== undefined? printChar : true;

    /* save the line number being processed */
    this._lineNo = 1;
    this._charNo = 1;

    debug("_printChar:"+this._printCharEnable);
}

/* inherit the prototype of contextParser.Parser */
ContextParserHandlebars.prototype = Object.create(contextParser.Parser.prototype);

/**********************************
* OUTPUT FACILITY
**********************************/

// @function module:ContextParserHandlebars._printChar
ContextParserHandlebars.prototype._printChar = function(ch) {
    if (this._printCharEnable) {
        process.stdout.write(ch);
    }
    this._buffer.push(ch);
};

/**
* @function module:ContextParserHandlebars.getBuffer
*
* @description
* <p>Get the internal _buffer of processed chars.</p>
*
*/
ContextParserHandlebars.prototype.getBuffer = function() {
    return this._buffer;
};

/**
* @function module:ContextParserHandlebars.printCharWithState
*
* @description
* <p>Print the internal states of the Context Parser when DEBUG=context-parser-handlebars.</p>
*
*/
ContextParserHandlebars.prototype.printCharWithState = function() {
    var len = this.states.length;
    debugDump('{ statesSize: '+len+' }');
    for(var i=0;i<len;i++) {
        var c = this.bytes[i];
        var s = this.states[i];
        var t = this.symbols[i];
        if (i === 0) {
            debugDump('{ ch: 0, state: '+s+', symbol: 0 }');
        } else {
            if (c !== undefined) {
                debugDump('{ ch: '+c+' [0x'+c.charCodeAt(0).toString(16)+'], state: '+s+', symbol: '+t+' }');
            } else {
                debugDump('{ undefined - char in template without state }');
            }
        }
    }
    return 0;
};

/**********************************
* FILTERS LOGIC
**********************************/

/* '{{' '~'? 'space'* ('not space{}~'+) 'space'* ('not {}~'*) '~'? greedy '}}' and not follow by '}' */
ContextParserHandlebars.expressionRegExp = /^\{\{~?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;

// @function module:ContextParserHandlebars._parseExpression
ContextParserHandlebars.prototype._parseExpression = function(input, i) {

    var obj = {
            filter: '',
            isPrefixWithKnownFilter: false,
            isSingleIdentifier: false
        };

    var str = input.slice(i);
    var m = ContextParserHandlebars.expressionRegExp.exec(str);

    if (m !== null) {
        if (m[1] !== undefined && m[2] !== undefined) {
            if (m[1] === 'else') {
                obj.isSingleIdentifier = false;
                obj.isPrefixWithKnownFilter = true;
                return obj;
            }
            if (m[1] === '^' && m[2] === '') {
                obj.isSingleIdentifier = false;
                obj.isPrefixWithKnownFilter = true;
                return obj;
            }
            if (handlebarsUtils.isReservedChar(m[1], 0)) {
                obj.isSingleIdentifier = false;
                obj.isPrefixWithKnownFilter = false;
                return obj;
            }
            if (m[2] === '') {
                obj.isSingleIdentifier = true;
            } else {
                obj.filter = m[1];
                var k = this._knownFilters.indexOf(obj.filter);
                if (k !== -1) {
                    obj.isPrefixWithKnownFilter = true;
                }
            }
        }
    }
    debug("_parseExpression:"+obj);
    return obj;
};

// @function module:ContextParserHandlebars._addFilters
ContextParserHandlebars.prototype._addFilters = function(state, input, expressionInfo) {

    /* transitent var */
    var e, f, msg;

    /* return filters */
    var filters = [];

    var attributeName = expressionInfo.attributeName,
        attributeValue = expressionInfo.attributeValue;

    debug("_addFilters:state:"+state+",attrname:"+attributeName+",attrvalue:"+attributeValue);

    // 1
    if (state === stateMachine.State.STATE_DATA) {
        filters.push(filter.FILTER_DATA);
        return filters;
    // 3
    } else if (state === stateMachine.State.STATE_RCDATA) {
        filters.push(filter.FILTER_DATA);
        return filters;
    // 5
    } else if (state === stateMachine.State.STATE_RAWTEXT) {
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg);
        return filters;
    // 6
    } else if (state === stateMachine.State.STATE_SCRIPT_DATA) {
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg);
        return filters;
    // 34
    } else if (state === stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME) {
        /* never fall into this state */
    // 35
    } else if (state === stateMachine.State.STATE_ATTRIBUTE_NAME) {
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg);
        return filters;
    // 36
    } else if (state === stateMachine.State.STATE_AFTER_ATTRIBUTE_NAME) {
        /* never fall into this state, please refer to tests/unit/run-states-spec.js */
    // 37
    } else if (state === stateMachine.State.STATE_BEFORE_ATTRIBUTE_VALUE) {
        /* never fall into this state, please refer to tests/unit/run-states-spec.js */
    // 38, 39, 40 + URI scheme
    } else if ((state === stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED || 
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED ||
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED) &&
        (attributeName === "href" || attributeName === "src" || attributeName === "action" || attributeName === "formaction")) {

        /* we don't support javascript parsing yet */
        // TODO: this filtering rule cannot cover all cases.
        if (handlebarsUtils.blacklistProtocol(attributeValue)) {
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
            handlebarsUtils.handleError(msg);
            /* this one is safe to return */
            return filters;
        }

        /* add the correct uri filter */
        var isFullUri = true;
        if (attributeValue.trim() === "") {
            f = filter.FILTER_FULL_URI;
        } else {
            isFullUri = false;
            f = filter.FILTER_ENCODE_URI;
            e = attributeValue.length;
            for(var i=0;i<e;++i) {
                if (attributeValue[i] === '=') {
                    f = filter.FILTER_ENCODE_URI_COMPONENT;
                }
            }
        }
        filters.push(f);

        /* add the attribute value filter */
        f = filter.FILTER_NOT_HANDLE;
        switch(state) {
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                f = filter.FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                break;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                f = filter.FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED;
                break;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                f = filter.FILTER_ATTRIBUTE_VALUE_UNQUOTED;
                break;
            default:
                break;
        }
        filters.push(f);

        /* add blacklist filters at the end of filtering chain */
        if (isFullUri) {
            /* blacklist the URI scheme for full uri */
            filters.push(filter.FILTER_URI_SCHEME_BLACKLIST);
        }

        return filters;
    // 38, 39, 40 + CSS spec
    } else if ((state === stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED || 
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED ||
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED) &&
        (attributeName === "style")) {
        /* we don't support css parser yet
        *
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg);
        return filters;
    // 38, 39, 40 + Javascript spec
    } else if ((state === stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED || 
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED ||
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED) &&
        (attributeName.match(/^on/i))) {
        /* we don't support js parser yet
        *
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg);
        return filters;
    // 38, 39, 40 ONLY and should be placed at last.
    } else if (state === stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED || 
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED ||
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED) {

        /* add the attribute value filter */
        f = filter.FILTER_NOT_HANDLE;
        switch(state) {
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                f = filter.FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                break;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                f = filter.FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED;
                break;
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                f = filter.FILTER_ATTRIBUTE_VALUE_UNQUOTED;
                break;
            default:
                break;
        }
        filters.push(f);
        return filters;
    // 42
    } else if (state === stateMachine.State.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED) {
        /* 
        * please refer to tests/unit/run-states-spec.js, '{' triggers state change to 12.2.4.34
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg);
        return filters;
    // 48
    } else if (state === stateMachine.State.STATE_COMMENT) {
        filters.push(filter.FILTER_COMMENT);
        return filters;
    }

    /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
    * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
    */
    filters.push(filter.FILTER_NOT_HANDLE);
    msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg);
    return filters;
};

/**********************************
* TEMPLATING HANDLING LOGIC
**********************************/

// @function module:ContextParserHandlebars._handleRawExpression
ContextParserHandlebars.prototype._handleRawExpression = function(input, i, len, state) {
    var msg;
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+2<len && input[j+1] === '}' && input[j+2] === '}') {
                this._printChar('}}}');
                /* advance the index pointer j to the char after the last brace of expression. */
                j=j+3;

                /* update the Context Parser's state if it is raw expression */
                this.state = state;

                /* for printCharWithState */
                this.bytes[j] = input[j-1];
                this.symbols[j] = this.lookupChar(input[j-1]);
                this.states[j] = state;

                return j;
        }
        this._printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}}' close brace of raw expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// @function module:ContextParserHandlebars._handleEscapeExpression
ContextParserHandlebars.prototype._handleEscapeExpression = function(input, i, len, state) {
    var msg,
        str = '{{';

    /* parse expression */
    var extraExpressionInfo = this._parseExpression(input, i),
        isPrefixWithKnownFilter = extraExpressionInfo.isPrefixWithKnownFilter,
        filters = [];

    /* add filters if it is not prefix with known filter */
    if (!isPrefixWithKnownFilter) {
        /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
        str += '{';

        /* get the customized filter based on the current HTML5 state before the Handlebars template expression. */
        var expressionInfo = {
            'attributeName': this.getAttributeName(),
            'attributeValue': this.getAttributeValue(),
        };
        filters = this._addFilters(state, input, expressionInfo);
        for(var k=filters.length-1;k>=0;--k) {
            if (extraExpressionInfo.isSingleIdentifier && k === 0) {
                str += filters[k] + " ";
            } else {
                str += filters[k] + " (";
            }
        }
    }
    this._printChar(str);

    for(var j=i+2;j<len;++j) {
        if (input[j] === '}' && j+1 < len && input[j+1] === '}') {
            for(var l=filters.length-1;l>=0;--l) {
                if (extraExpressionInfo.isSingleIdentifier && l === 0) {
                } else {
                    this._printChar(')');
                }
            }

            /* advance the index pointer j to the char after the last brace of expression. */
            this._printChar('}}');
            j=j+2;

            /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
            if (!isPrefixWithKnownFilter) {
                this._printChar('}');
            }

            /* update the Context Parser's state if it is not reserved tag */
            this.state = state;

            /* for printCharWithState */
            this.bytes[j] = input[j-1];
            this.symbols[j] = this.lookupChar(input[j-1]);
            this.states[j] = state;

            return j;
        } else {
            this._printChar(input[j]);
        }
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of escape expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// @function module:ContextParserHandlebars._handleCommentExpression
ContextParserHandlebars.prototype._handleCommentExpression = function(input, i, len, type) {
    var msg;
    for(var j=i;j<len;++j) {
        if (type === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM) {
            if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                this._printChar('--}}');
                /* advance the index pointer j to the char after the last brace of expression. */
                j=j+4;

                return j;
            }
        } else if (type === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
            if (input[j] === '}' && j+1<len && input[j+1] === '}') {
                this._printChar('}}');
                /* advance the index pointer j to the char after the last brace of expression. */
                j=j+2;

                return j;
            }
        }
        this._printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' or '--}}' close brace of comment expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// @function module:ContextParserHandlebars._handleExpression
ContextParserHandlebars.prototype._handleExpression = function(input, i, len) {
    var msg;
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+1<len && input[j+1] === '}') {
            this._printChar('}}');
            /* advance the index pointer j to the char after the last brace of expression. */
            j=j+2;

            return j;
        }
        this._printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of partial expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// @function module:ContextParserHandlebars._handleRawBlock
ContextParserHandlebars.prototype._handleRawBlock = function(input, i, len) {
    var msg;
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+3<len && input[j+1] === '}' && input[j+2] === '}' && input[j+3] === '}') {
                this._printChar('}}}}');
                /* advance the index pointer j to the char after the last brace of expression. */
                j=j+4;
                return j;
        }
        this._printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}}}' close brace of raw block . ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// @function module:ContextParserHandlebars._handleBranchExpression
ContextParserHandlebars.prototype._handleBranchExpression = function(input, i, state) {
    var msg;
    try {
        var ast = this._buildBranchAst(input, i);
        var stateObj = this._getInternalState();
        var result = this._analyseBranchAst(ast, stateObj);

        /* print the output */
        this._printChar(result.output);

        /* advance the index pointer i to the char after the last brace of branching expression. */
        i = i+ast.index+1;
        this.state = result.lastStates[0].state;

        debug("_handleBranchTemplate: state:"+this.state+",i:"+i);
        return i;
    } catch (err) {
       msg = err + " ["+this._lineNo+":"+this._charNo+"]";
       handlebarsUtils.handleError(msg, true);
    }
};

// @function module:ContextParserHandlebars._analyzeContex
ContextParserHandlebars.prototype._analyzeContext = function(stateObj, str) {

    var r = {
        output: '',
        stateObj: {}
    };

    // TODO: refactor
    /* factory class */
    var parser,
        ContextParserHandlebars = require('./context-parser-handlebars');

    /* parse the string */
    parser = new ContextParserHandlebars(false);
    // set the internal state
    parser.tagNames = stateObj.tagNames;
    parser.tagNameIdx = stateObj.tagNameIdx;
    parser.setInitState(stateObj.state);
    parser.contextualize(str);

    r.output = parser.getBuffer().join('');
    // get the internal state
    r.stateObj.tagNames = parser.tagNames;
    r.stateObj.tagNameIdx = parser.tagNameIdx;
    r.stateObj.state = parser.state;

    return r;
};

// @function module:ContextParserHandlebars._analyseBranchAst
ContextParserHandlebars.prototype._analyseBranchAst = function(ast, stateObj) {
    var obj = {},
        len = ast.program.length;

    var r = {},
        t, msg;

    r.lastStates = [];
    r.lastStates[0] = stateObj;
    r.lastStates[1] = stateObj;
    r.output = '';
    
    var programDebugOutput = "", inverseDebugOutput = "";

    for(var i=0;i<len;++i) {
        obj = ast.program[i];
        if (obj.type === 'content') {
            debugBranch("_analyseBranchAst:program:content");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[0].state);
            debugBranch("_analyseBranchAst:content:["+obj.content+"]");

            t = this._analyzeContext(r.lastStates[0], obj.content);
            r.output += t.output;
            r.lastStates[0] = t.stateObj;
            programDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[0].state);
        } else if (obj.type === 'node') {
            debugBranch("_analyseBranchAst:program:node");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[0].state);

            t = this._analyseBranchAst(obj.content, r.lastStates[0]);
            r.lastStates[0] = t.lastStates[0]; // index 0 and 1 MUST be equal
            r.output += t.output;
            programDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[0].state);
        } else if (obj.type === 'branch' ||
            obj.type === 'branchelse' ||
            obj.type === 'branchend') {
            r.output += obj.content;
            programDebugOutput += obj.content;
        }
    }
    len = ast.inverse.length;
    for(i=0;i<len;++i) {
        obj = ast.inverse[i];
        if (obj.type === 'content') {
            debugBranch("_analyseBranchAst:program:content");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[1].state);
            debugBranch("_analyseBranchAst:content:["+obj.content+"]");

            t = this._analyzeContext(r.lastStates[1], obj.content);
            r.output += t.output;
            r.lastStates[1] = t.stateObj;
            inverseDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[1].state);
        } else if (obj.type === 'node') {
            debugBranch("_analyseBranchAst:program:node");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[1].state);

            t = this._analyseBranchAst(obj.content, r.lastStates[1]);
            r.lastStates[1] = t.lastStates[1]; // index 0 and 1 MUST be equal
            r.output += t.output;
            inverseDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[1].state);
        } else if (obj.type === 'branch' ||
            obj.type === 'branchelse' ||
            obj.type === 'branchend') {
            r.output += obj.content;
            inverseDebugOutput += obj.content;
        }
    }

    if (ast.program.length > 0 && ast.inverse.length === 0) {
        debugBranch("_analyseBranchAst:["+r.lastStates[0].state+"/"+r.lastStates[0].state+"]");
        r.lastStates[1] = r.lastStates[0];
    } else if (ast.program.length === 0 && ast.inverse.length > 0) {
        debugBranch("_analyseBranchAst:["+r.lastStates[1].state+"/"+r.lastStates[1].state+"]");
        r.lastStates[0] = r.lastStates[1];
    }

    if (r.lastStates[0].state !== r.lastStates[1].state) {
        msg = "[ERROR] ContextParserHandlebars: Parsing error! Inconsitent HTML5 state after conditional branches. Please fix your template! \n";
        msg += "[ERROR] #if.. branch: " + programDebugOutput.slice(0, 50) + "... (state:"+r.lastStates[0].state+")\n";
        msg += "[ERROR] else branch: " + inverseDebugOutput.slice(0, 50) + "... (state:"+r.lastStates[1].state+")";
        handlebarsUtils.handleError(msg, true);
    }
    return r;
};

// @function module:ContextParserHandlebars._buildBranchAst
ContextParserHandlebars.prototype._buildBranchAst = function(input, i) {

    /* init the data structure */
    var ast = {};
    ast.program = [];
    ast.inverse = [];

    var str = input.slice(i),
        len = str.length;

    var sp = [],
        msg,
        content = '',
        inverse = false,
        obj = {},
        k,j,r = 0;

    for(j=0;j<len;++j) {
        var exp = handlebarsUtils.isValidExpression(str, j, handlebarsUtils.BRANCH_EXPRESSION).tag,
            endExpression = handlebarsUtils.isValidExpression(str, j, handlebarsUtils.BRANCH_END_EXPRESSION).tag;
        
        if (exp !== false) {
            /* encounter the first branch expression */
            if (sp.length === 0) {
                /* save the branch expression name */
                sp.push(exp);

                content = '';
                inverse = false;

                /* consume till the end of expression */
                r = this._consumeTillCloseBrace(str, j, len);
                j = r.index;
                obj = this._saveAstObject('branch', r.str);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

            } else {
                /* encounter another branch expression, save the previous string */
                obj = this._saveAstObject('content', content);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }
                content = '';

                r = this._buildBranchAst(str, j);
                obj = this._saveAstObject('node', r);
                j = j + r.index;
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }
            }
        } else if (handlebarsUtils.isValidExpression(str, j, handlebarsUtils.ELSE_EXPRESSION).result) {
            obj = this._saveAstObject('content', content);
            if (!inverse) {
                ast.program.push(obj);
            } else if (inverse) {
                ast.inverse.push(obj);
            }

            inverse = true;
            content = '';

            /* consume till the end of expression */
            r = this._consumeTillCloseBrace(str, j, len);
            j = r.index;
            obj = this._saveAstObject('branchelse', r.str);
            if (!inverse) {
                ast.program.push(obj);
            } else if (inverse) {
                ast.inverse.push(obj);
            }

        } else if (endExpression !== false) {
            var t = sp.pop();
            if (t === endExpression) {
                obj = this._saveAstObject('content', content);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

                /* consume till the end of expression */
                r = this._consumeTillCloseBrace(str, j, len);
                j = r.index;
                obj = this._saveAstObject('branchend', r.str);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

                break;
            } else {
                /* broken template as the end expression does not match, throw exception before function returns */
                msg = "[ERROR] ContextParserHandlebars: Template expression mismatch (startExpression:"+t+"/endExpression:"+endExpression+")";
                handlebarsUtils.handleError(msg, true);
            }
        } else {
            var expressionType = handlebarsUtils.getExpressionType(str, j, len);
            if (expressionType === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM ||
                expressionType === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
                /* capturing the string till the end of comment */
                r = this._consumeTillCommentCloseBrace(str, j, len, expressionType);
                j = r.index;
                content += r.str;
            } else {
                /* capturing the string */
                content += str[j];    
            }
        }
    }

    if (sp.length > 0) {
        /* throw error on the template */
        msg = "[ERROR] ContextParserHandlebars: Template does not have balanced branching expression.";
        handlebarsUtils.handleError(msg, true);
    }

    ast.index = j;
    return ast;
};

// @function ContextParserHandlebars._getInternalState
ContextParserHandlebars.prototype._getInternalState = function() {
    var stateObj = {};
    // stateObj.bytes = this.bytes;
    stateObj.state = this.state;
    // stateObj.states = this.states;
    // stateObj.contexts = this.contexts;
    // stateObj.buffer = this.buffer;
    // stateObj.symbols = this.symbols;
    stateObj.tagNames = this.tagNames;
    stateObj.tagNameIdx = this.tagNameIdx;
    // stateObj.attributeName = this.attributeName;
    // stateObj.attributeValue = this.attributeValue;
    return stateObj;
};

// @function ContextParserHandlebars._saveAstObject
ContextParserHandlebars.prototype._saveAstObject = function(type, content) {
    var obj = {};
    obj.type = type;
    obj.content = content;
    return obj;
};

// @function ContextParserHandlebars._consumeTillCloseBrace
ContextParserHandlebars.prototype._consumeTillCloseBrace = function(input, i, len) {
    var msg, 
        str = '',
        obj = {};
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+1 < len && input[j+1] === '}') {
            str += '}}';
            j++;
            obj.index = j;
            obj.str = str;
            return obj;
        }
        str += input[j];
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of expression.";
    handlebarsUtils.handleError(msg, true);
};

// @function ContextParserHandlebars._consumeTillCommentCloseBrace
ContextParserHandlebars.prototype._consumeTillCommentCloseBrace = function(input, i, len, type) {
    var msg, 
        str = '',
        obj = {};
    for(var j=i;j<len;++j) {
        if (type === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM) {
            if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                str += '--}}';
                j=j+3;
                obj.index = j;
                obj.str = str;
                return obj;
            }
        } else if (type === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
            if (input[j] === '}' && j+1<len && input[j+1] === '}') {
                str += '}}';
                j++;
                obj.index = j;
                obj.str = str;
                return obj;
            }
        }
        str += input[j];
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' or '--}}' close brace of comment expression.";
    handlebarsUtils.handleError(msg, true);
};

/*
* @function module:ContextParserHandlebars._handleTemplate
*
* @param {char} ch - The current character to be processed.
* @param {integer} i - The index of the current character in the input string.
* @param {string} input - The input string of the HTML5 web page.
* @param {integer} state - The current HTML5 state of the current character before the Handlebars expression.
* @returns {integer} The index right after the last '}' if it is Handlebars expression or return immediately if it is not Handlebars.
*
*/
ContextParserHandlebars.prototype._handleTemplate = function(ch, i, input, state) {

    /* return object */
    var index = i;
    /* the length of the input */
    var len = input.length;

    /* regular expression validation result */
    var re;
    /* error msg */
    var msg;

    /* Handlebars expression type */
    var handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION; 

    /* handling different type of expression */
    if ((ch === '{' && i+3 < len && input[i+1] === '{' && input[i+2] === '{' && input[i+3] === '{') ||
        (ch === '{' && i+4 < len && input[i+1] === '{' && input[i+2] === '{' && input[i+3] === '{' && input[i+4] === '/')
    ) {
        handlebarsExpressionType = handlebarsUtils.RAW_BLOCK;
        // no need to validate the raw block as the content inside are skipped.
        /* _handleRawBlock */
        debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
        return this._handleRawBlock(input, i, len);
    } else if (ch === '{' && i+2 < len && input[i+1] === '{' && input[i+2] === '{') {
        handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
        re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
        if (re.result === false) {
            msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw expression. ["+this._lineNo+":"+this._charNo+"]";
            handlebarsUtils.handleError(msg, true);
        }

        /* for printCharWithState */
        this.bytes[index+1] = ch;
        this.symbols[index+1] = this.lookupChar(ch);
        this.states[index+1] = state;

        /* _handleRawExpression */
        debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
        return this._handleRawExpression(input, i, len, state);
    } else if (ch === '{' && i+1 < len && input[i+1] === '{') {
        // this type may not be 100% correct (the case is BRANCH_EXPRESSION), so it need the isValidExpression call below.
        handlebarsExpressionType = handlebarsUtils.getExpressionType(input, i, len);
        switch (handlebarsExpressionType) {
            case handlebarsUtils.ESCAPE_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid escape expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }

                /* for printCharWithState */
                this.bytes[index+1] = ch;
                this.symbols[index+1] = this.lookupChar(ch);
                this.states[index+1] = state;

                /* _handleEscapeExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleEscapeExpression(input, i, len, state);

            case handlebarsUtils.PARTIAL_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid partial expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }
                /* _handleExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleExpression(input, i, len);

            case handlebarsUtils.DATA_VAR_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid data var expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }
                /* _handleExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleExpression(input, i, len);

            case handlebarsUtils.BRANCH_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid branch expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }
                /* _handleBranchExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleBranchExpression(input, i, state);

            case handlebarsUtils.BRANCH_END_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{/.*}} expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtils.handleError(msg, true);
                break;

            case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                // no need to validate the comment expression as the content inside are skipped.
                /* _handleCommentExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleCommentExpression(input, i, len, handlebarsExpressionType);

            case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                // no need to validate the comment expression as the content inside are skipped.
                /* _handleCommentExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleCommentExpression(input, i, len, handlebarsExpressionType);

            case handlebarsUtils.ELSE_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{else}} or {{^}} expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtils.handleError(msg, true);
                break;

            default:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unknown expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtils.handleError(msg, true);
                break;
        }
    } else {
        /* return immediately for non template start char '{' */
        return index;
    }
};

/**********************************
* HOOK LOGIC
**********************************/

/* overriding the HTML5 Context Parser's beforeWalk for printing out */
ContextParserHandlebars.prototype.beforeWalk = function(i, input) {

    var len = input.length,
        ch = input[i],
        symbol = this.lookupChar(ch);

    while(true) {

        /* 
        * before passing to the _handleTemplate function, 
        * we need to judge the exact state of output expression,
        * querying the new state based on previous state this.state.
        */
        var _s = stateMachine.lookupStateFromSymbol[symbol][this.state];

        /* process the char */
        var j = this._handleTemplate(ch, i, input, _s);

        /* 
        * break immediately as the char is non-template char.
        */
        if (i === j) {
            break;
        }

        /* update the i, it is the index right after the handlebars expression */
        i = j;

        /*
        * break immediately if out of character 
        * (no need to throw error as outer loop will handle it).
        */
        if (j >= len) {
            break;
        }

        /* read the new char to handle, may be template char again! */
        ch = input[i];
        symbol = this.lookupChar(ch);
    }

    return i;
};

/* overriding the HTML5 Context Parser's afterWalk for printing out */
ContextParserHandlebars.prototype.afterWalk = function(ch) {
    this._printChar(ch);
    if (ch === '\n') {
        ++this._lineNo;
        this._charNo = 1;
    }
    ++this._charNo;
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();

}).call(this,require('_process'))
},{"./context-parser-handlebars":8,"./handlebars-utils.js":9,"_process":6,"context-parser":1,"debug":3,"xss-filters":7}],9:[function(require,module,exports){
/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {
"use strict";

/**
* @class HandlebarsUtils
* @static
*/
var HandlebarsUtils = {};

/* type of expression */
HandlebarsUtils.NOT_EXPRESSION = 0;
HandlebarsUtils.RAW_EXPRESSION = 1; // {{{expression}}}

HandlebarsUtils.ESCAPE_EXPRESSION = 2; // {{expression}}
HandlebarsUtils.PARTIAL_EXPRESSION = 3; // {{>.*}}
HandlebarsUtils.DATA_VAR_EXPRESSION = 4; // {{@.*}}
HandlebarsUtils.BRANCH_EXPRESSION = 5; // {{#.*}}, {{^.*}}
HandlebarsUtils.BRANCH_END_EXPRESSION = 6; // {{/.*}}
HandlebarsUtils.ELSE_EXPRESSION = 7; // {{else}}, {{^}}
HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM = 8; // {{!--.*--}}
HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM = 9; // {{!.*}}

HandlebarsUtils.RAW_BLOCK = 10; // {{{{block}}}}

/* reference: http://handlebarsjs.com/expressions.html */
/* '{{{{' '~'? 'not {}~'+ '~'? non-greedy '}}}}' and not follow by '}' */
HandlebarsUtils.rawBlockRegExp = /^\{\{\{\{~?([^\}\{~]+)~??\}\}\}\}(?!})/;
/* '{{{' '~'? 'not {}~'+ '~'? non-greedy '}}}' and not follow by '}' */
HandlebarsUtils.rawExpressionRegExp = /^\{\{\{~?([^\}\{~]+)~??\}\}\}(?!})/;

/* '{{' '~'? 'space'* ('not {}~'+) '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.escapeExpressionRegExp = /^\{\{~?\s*([^\}\{~]+)~??\}\}(?!})/;
/* '{{' '~'? '>' 'space'* ('not {}~'+) 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?>\s*([^\}\{~]+)\s*~??\}\}(?!})/;
/* '{{' '~'? '@' 'space'* ('not {}~'+) 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.dataVarExpressionRegExp = /^\{\{~?@\s*([^\}\{~]+)\s*~??\}\}(?!})/;

// need to capture the first non-whitespace string and capture the rest
/* '{{' '~'? '# or ^' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.branchExpressionRegExp = /^\{\{~?[#|\^]\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? '/' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.branchEndExpressionRegExp = /^\{\{~?\/\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? 'space'* 'else' 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.elseExpressionRegExp = /^\{\{~?\s*else\s*~??\}\}(?!})/;
/* '{{' '~'? 'space'* '^'{1} 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.elseShortFormExpressionRegExp = /^\{\{~?\s*\^{1}\s*~??\}\}(?!})/;

// @function HandlebarsUtils.getExpressionType
HandlebarsUtils.getExpressionType = function(input, i, len) {
    // TODO: can optimize
    if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '>') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '>') 
    ) {
        return HandlebarsUtils.PARTIAL_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '@') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '@') 
    ) {
        return HandlebarsUtils.DATA_VAR_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '#') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '#') 
    ) {
        return HandlebarsUtils.BRANCH_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '^') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '^') 
    ) {
        // this one is not exact, {{~?^}} will pass!
        return HandlebarsUtils.BRANCH_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '/') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '/') 
    ) {
        return HandlebarsUtils.BRANCH_END_EXPRESSION;
    } else if ((input[i] === '{' && i+4<len && input[i+1] === '{' && input[i+2] === '!' && input[i+3] === '-' && input[i+4] === '-') ||
        (input[i] === '{' && i+4<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!' && input[i+4] === '-' && input[i+5] === '-')
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '!') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!') 
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM;
    }
    return HandlebarsUtils.ESCAPE_EXPRESSION;
};

// @function HandlebarsUtils.isValidExpression
HandlebarsUtils.isValidExpression = function(input, i, type) {
    var re = {};
    re.tag = false;
    re.result = false;
    var s = input.slice(i);
    switch(type) {
        case HandlebarsUtils.RAW_BLOCK:
            re = HandlebarsUtils.rawBlock.exec(s);
            break;
        case HandlebarsUtils.RAW_EXPRESSION:
            re = HandlebarsUtils.rawExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.ESCAPE_EXPRESSION:
            re = HandlebarsUtils.escapeExpressionRegExp.exec(s);
            if (re !== null && re[1] !== undefined) {
                if (HandlebarsUtils.isReservedChar(re[1], 0)) {
                    re.result = false;
                    return re;
                }
            }
            break;
        case HandlebarsUtils.PARTIAL_EXPRESSION:
            re = HandlebarsUtils.partialExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.DATA_VAR_EXPRESSION:
            re = HandlebarsUtils.dataVarExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.BRANCH_EXPRESSION:
            re = HandlebarsUtils.branchExpressionRegExp.exec(s);
            if (re !== null) {
                re.tag = re[1];
            }
            break;
        case HandlebarsUtils.BRANCH_END_EXPRESSION:
            re = HandlebarsUtils.branchEndExpressionRegExp.exec(s);
            if (re !== null) {
                re.tag = re[1];
            }
            break;
        case HandlebarsUtils.ELSE_EXPRESSION:
            re = HandlebarsUtils.elseExpressionRegExp.exec(s);
            if (re === null) {
                re = HandlebarsUtils.elseShortFormExpressionRegExp.exec(s);
            }
            break;
        default:
            return re;
    }

    if (re !== null) {
        re.result = true;
    } else {
        re = {};
        re.tag = false;
        re.result = false;
    }
    return re;
};

// @function HandlebarsUtils.isReservedChar
HandlebarsUtils.isReservedChar = function(input, i) {
    var ch = input[i];
    if (ch === '~' && input.length > i+1) {
        ch = input[i+1];
    }

    if (ch === '#' || ch === '/' || ch === '>' || ch === '@' || ch === '^' || ch === '!') {
        return true;
    } else {
        return false;
    }
};

// @function HandlebarsUtils.handleError
HandlebarsUtils.handleError = function(msg, throwErr) {
    if (throwErr) {
        throw msg;
    } else if (typeof console === 'object') {
        if (console.hasOwnProperty('warn') && typeof console.warn === 'function') {
            console.warn(msg);
        } else if (console.hasOwnProperty('log') && typeof console.log === 'function') {
            console.log(msg);
        }
    }
};

/* 
* @function HandlebarsUtils.blacklistProtocol
*
* Reference:
* https://github.com/yahoo/xss-filters/blob/master/src/private-xss-filters.js#L266
*/
HandlebarsUtils._URI_BLACKLIST = null;
HandlebarsUtils._URI_BLACKLIST_REGEXPSTR = "^(?:&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?|&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?|&Tab;|&NewLine;)*(?:(?:j|J|&#[xX]0*(?:6|4)[aA];?|&#0*(?:106|74);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)|(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:b|B|&#[xX]0*(?:6|4)2;?|&#0*(?:98|66);?))(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:s|S|&#[xX]0*(?:7|5)3;?|&#0*(?:115|83);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:c|C|&#[xX]0*(?:6|4)3;?|&#0*(?:99|67);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:r|R|&#[xX]0*(?:7|5)2;?|&#0*(?:114|82);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:i|I|&#[xX]0*(?:6|4)9;?|&#0*(?:105|73);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:p|P|&#[xX]0*(?:7|5)0;?|&#0*(?:112|80);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:t|T|&#[xX]0*(?:7|5)4;?|&#0*(?:116|84);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?::|&#[xX]0*3[aA];?|&#0*58;?)";
HandlebarsUtils.blacklistProtocol = function(s) {
    var URI_FASTLANE = ['&', 'j', 'J', 'v', 'V'];
    if (URI_FASTLANE.indexOf(s[0]) === -1) {
        return false;
    } else {
        if (HandlebarsUtils._URI_BLACKLIST === null) {
            HandlebarsUtils._URI_BLACKLIST = new RegExp(HandlebarsUtils._URI_BLACKLIST_REGEXPSTR);
        }
        if (HandlebarsUtils._URI_BLACKLIST.test(s)) {
            return true;
        } else {
            return false;
        }
    }
    return true;
};

module.exports = HandlebarsUtils;

})();

},{}]},{},[8])(8)
});