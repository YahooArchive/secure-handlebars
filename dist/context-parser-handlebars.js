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

var stateMachine = require('./html5-state-machine.js');

/**
 * @class FastParser
 * @constructor FastParser
 */
function FastParser() {
    this.state = stateMachine.State.STATE_DATA;  /* Save the current status */
    this.tagNames = ['', '']; /* Save the current tag name */
    this.tagNameIdx = '';
    this.attributeName = ''; /* Save the current attribute name */
    this.attributeValue = ''; /* Save the current attribute value */
}

/**
 * @function FastParser#contextualize
 *
 * @param {string} input - The byte stream of the HTML5 web page.
 * @returns {integer} The return code of success or failure of parsing.
 *
 * @description
 * <p>The context analyzing function, it analyzes the output context of each character based on
 * the HTML5 WHATWG - https://html.spec.whatwg.org/multipage/</p>
 *
 */
FastParser.prototype.contextualize = function(input) {
    var len = input.length;

    for(var i = 0; i < len; ++i) {
        i = this.beforeWalk(i, input);
        if ( i >= len ) { break; }
        i = this.walk(i, input);
        if ( i >= len ) { break; }
        this.afterWalk(input[i], i);
    }
};

/*
 * @function FastParser#walk
 *
 * @param {integer} i - the position of the current character in the input stream
 * @param {string} input - the input stream
 * @returns {integer} the new location of the current character.
 *
 */
FastParser.prototype.walk = function(i, input) {

    var ch = input[i],
        symbol = this.lookupChar(ch),
        extraLogic = stateMachine.lookupAltLogicFromSymbol[symbol][this.state],
        reconsume = stateMachine.lookupReconsumeFromSymbol[symbol][this.state];

    /* Set state based on the current head pointer symbol */
    this.state = stateMachine.lookupStateFromSymbol[symbol][this.state];

    /* See if there is any extra logic required for this state transition */
    switch (extraLogic) {
        case 1:  this.createStartTag(ch); break;
        case 2:  this.createEndTag(ch);   break;
        case 3:  this.appendTagName(ch);  break;
        case 4:  this.resetEndTag(ch);    break;
        case 6:                       /* match end tag token with start tag token's tag name */
            if(this.tagNames[0] === this.tagNames[1]) {
                reconsume = 0;  /* see 12.2.4.13 - switch state for the following case, otherwise, reconsume. */
                this.matchEndTagWithStartTag(ch);
            }
            break;
        case 8:  this.matchEscapedScriptTag(ch); break;
        case 11: this.processTagName(ch); break;
        case 12: this.createAttributeNameAndValueTag(ch); break;
        case 13: this.appendAttributeNameTag(ch); break;
        case 14: this.appendAttributeValueTag(ch); break;
    }

    if (reconsume) {                  /* reconsume the character */
        if( this.states) {
            // This is error prone. May need to change the way we walk the stream to avoid this.
            this.states[i] = this.state; 
        }
        return this.walk(i, input);
    }

    return i;
};

FastParser.prototype.createStartTag = function (ch) {
    this.tagNameIdx = 0;
    this.tagNames[0] = ch.toLowerCase();
};

FastParser.prototype.createEndTag = function (ch) {
    this.tagNameIdx = 1;
    this.tagNames[1] = ch.toLowerCase();
};

FastParser.prototype.appendTagName = function (ch) {
    this.tagNames[this.tagNameIdx] += ch.toLowerCase();
};

FastParser.prototype.resetEndTag = function (ch) {
    this.tagNameIdx = 1;
    this.tagNames[1] = '';
};

FastParser.prototype.matchEndTagWithStartTag = function (ch) {
        /* Extra Logic #6 :
        WHITESPACE: If the current end tag token is an appropriate end tag token, then switch to the before attribute name state.
                Otherwise, treat it as per the 'anything else' entry below.
        SOLIDUS (/): If the current end tag token is an appropriate end tag token, then switch to the this.closing start tag state.
                Otherwise, treat it as per the 'anything else' entry below.
        GREATER-THAN SIGN (>): If the current end tag token is an appropriate end tag token, then switch to the data state and emit the current tag token.
                Otherwise, treat it as per the 'anything else' entry below.
        */
        this.tagNames[0] = '';
        this.tagNames[1] = '';
        switch (ch) {
            case ' ': /** Whitespaces */
                this.state = stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME;
                return ;
            case '/': /** [/] */
                this.state = stateMachine.State.STATE_SELF_CLOSING_START_TAG;
                return ;
            case '>': /** [>] */
                this.state = stateMachine.State.STATE_DATA;
                return ; 
        }
};

FastParser.prototype.matchEscapedScriptTag = function (ch) {
    /* switch to the script data double escaped state if we see <script> inside <script><!-- */    
    if ( this.tagNames[1] === 'script') {
        this.state = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
    }
};

FastParser.prototype.processTagName = function (ch) {
    /* context transition when seeing <sometag> and switch to Script / Rawtext / RCdata / ... */
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
};

FastParser.prototype.createAttributeNameAndValueTag = function (ch) {
    /* new attribute name and value token */
    this.attributeValue = '';
    this.attributeName = ch.toLowerCase();
};

FastParser.prototype.appendAttributeNameTag = function (ch) {
    /* append to attribute name token */
    this.attributeName += ch.toLowerCase();
};

FastParser.prototype.appendAttributeValueTag = function(ch) {
    this.attributeValue += ch;   
};

/**
 * @function FastParser#lookupChar
 *
 * @param {char} ch - The character.
 * @returns {integer} The integer to represent the type of input character.
 *
 * @description
 * <p>Map the character to character type.
 * e.g. [A-z] = type 17 (Letter [A-z])</p>
 *
 */



FastParser.prototype.lookupChar = function(ch) {
    var o = ch.charCodeAt(0);
    if ( o > 122 ) { return 12; }
    return stateMachine.lookupSymbolFromChar[o];
};

/**
 * @function FastParser#beforeWalk
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
FastParser.prototype.beforeWalk = function( i, input ) {
    return i;
};

/**
 * @function FastParser#afterWalk
 *
 * @param {string} ch - The character consumed.
 * @param {integer} i - the head pointer location of this character
 *
 * @description
 * Interface function for subclass to implement logics after parsing the character.
 *
 */
FastParser.prototype.afterWalk = function( ch, i ) {
};


function Parser () {
    FastParser.call(this);
    this.bytes = [];  /* Save the processed bytes */
    this.states = [stateMachine.State.STATE_DATA]; /* Save the processed status */
    this.contexts = [];
    this.buffer = []; /* Save the processed character into the internal buffer */
    this.symbols = []; /* Save the processed symbols */

}

// as in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/prototype 
Parser.prototype = Object.create(FastParser.prototype);
Parser.prototype.constructor = FastParser;

Parser.prototype.walk = function(i, input) {
    i = FastParser.prototype.walk.call(this, i, input);
    var ch = input[i];
    this.bytes[i + 1] = ch;
    this.states[i + 1] = this.state;
    this.symbols[i + 1] = this.lookupChar(ch);
    return i;
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
    // * undefined if length = 0 
    return this.states[ this.states.length - 1 ];
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
    FastParser: FastParser,
    StateMachine: stateMachine
};

})();

},{"./html5-state-machine.js":2}],2:[function(require,module,exports){
/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/

var StateMachine = {};

// /* Character ASCII map */
// StateMachine.Char = {};
// StateMachine.Char.TAB = 0x09;
// StateMachine.Char.LF = 0x0A;
// StateMachine.Char.FF = 0x0C;
// StateMachine.Char.SPACE = 0x20;
// StateMachine.Char.EXCLAMATION = 0x21;
// StateMachine.Char.DOUBLE_QUOTE = 0x22;
// StateMachine.Char.AMPERSAND = 0x26;
// StateMachine.Char.SINGLE_QUOTE = 0x27;
// StateMachine.Char.DASH = 0x2D;
// StateMachine.Char.SLASH = 0x2F;
// StateMachine.Char.GREATER = 0x3C;
// StateMachine.Char.EQUAL = 0x3D;
// StateMachine.Char.LESS = 0x3E;
// StateMachine.Char.QUESTION = 0x3F;
// StateMachine.Char.CAPTIAL_A = 0x41;
// StateMachine.Char.CAPTIAL_Z = 0x5A;
// StateMachine.Char.SMALL_A = 0x61;
// StateMachine.Char.SMALL_Z = 0x7A;

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
StateMachine.State.STATE_DUMMY_RESERVED = 52;
StateMachine.State.STATE_NOT_IN_SPEC_BEFORE_COMMENT_START = 53;

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

StateMachine.lookupSymbolFromChar = [
    12,12,12,12,12,12,12,12,12, 0,
     0,12, 0,12,12,12,12,12,12,12,
    12,12,12,12,12,12,12,12,12,12,
    12,12, 0, 1, 2,12,12,12, 3, 4,
    12,12,12,12,12, 5,12, 6,12,12,
    12,12,12,12,12,12,12,12,12,12,
     7, 8, 9,10,12,11,11,11,11,11,
    11,11,11,11,11,11,11,11,11,11,
    11,11,11,11,11,11,11,11,11,11,
    11,12,12,12,12,12,12,11,11,11,
    11,11,11,11,11,11,11,11,11,11,
    11,11,11,11,11,11,11,11,11,11,
    11,11,11,12
];

StateMachine.lookupStateFromSymbol = [
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,34, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,34,36,36,37,38,39,34, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7,45,44,10, 3, 3, 3, 5, 5, 5,20, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,51,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,38,42,39,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,39,38,42,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6,21,24,23,24,24,22,22,22,22,30,31,31,29,29,35,35,35,40,38,39,40, 0,34,34,44,53,47,50,49,50,50,49, 0,46],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 9,44,43,12, 3, 3,15, 5, 5,18, 6, 6, 6, 6,22,22,22,26,22,22,22,29,29,29,33,29,43,43,43,40,38,39,40, 0,43,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 8, 0,11, 0,14,17, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,25,25,25,22,22,22,22,32,32,32,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,37,37,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1, 1, 1, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22, 6,22,22,22,22,29,29, 6,29,29, 1, 1, 1, 1,38,39, 1, 0, 1, 1, 1,44, 1, 1,48,48, 1, 1, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7,44,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7,10,10,10, 3,13,13, 5,16,16, 6,19,19, 6, 6,22,22,22,28,27,27,28,29,29,29,29,33,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44],
 [ 0, 1, 0, 3, 0, 5, 6, 7, 1,44,10, 3, 3, 3, 5, 5, 5, 6, 6, 6, 6, 6,22,22,22,22,22,22,22,29,29,29,29,29,35,35,35,40,38,39,40, 0,34,34,44,44,48,48,48,48,48,48, 0,44]
];
  
StateMachine.lookupAltLogicFromSymbol = [
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 6, 8, 0, 0, 0, 0, 8, 0, 0, 0, 0,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12, 0, 0,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12, 0,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12, 0,14, 0,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 6, 4, 0, 6, 4, 0, 6, 0, 0, 0, 0, 0, 4, 0, 6, 8, 0, 0, 0, 4, 8, 0, 0, 0,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12, 0, 0,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 6, 0, 0, 6, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 6, 8, 0, 0, 0, 0, 8,11,11,11,11,14,14,11, 0,11,11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 0, 0, 0, 0, 2, 2, 3, 3, 0, 0, 0, 0, 3,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,12,13,12,14,14,14,14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

StateMachine.lookupReconsumeFromSymbol = [
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
 [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1]
];

// key is the "previous" state, key in the value object is "next" state and its value indicates what action we should take. For example, the first line indicates previous state is 1, next state is 1 and return value is 1 (and we'd have logic to add the character to output stream when return value is 1)
StateMachine.lookupContext = [
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

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
process.versions = {};

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
        QUOT   = /"/g,
        SQUOT  = /'/g,
        NULL   = /\x00/g,
        SPECIAL_ATTR_VALUE_UNQUOTED_CHARS = /(?:^(?:["'`]|\x00+$|$)|[\x09-\x0D >])/g,
        SPECIAL_HTML_CHARS = /[&<>"'`]/g, 
        SPECIAL_COMMENT_CHARS = /(?:^-*!?>|--!?>|--?!?$|\]>|\]$)/g;

    // Given a full URI, need to support "[" ( IPv6address ) "]" in URI as per RFC3986
    // Reference: https://tools.ietf.org/html/rfc3986
    var URL_IPV6 = /\/\/%5[Bb]([A-Fa-f0-9:]+)%5[Dd]/;


    // Reference: http://shazzer.co.uk/database/All/characters-allowd-in-html-entities
    // Reference: http://shazzer.co.uk/vector/Characters-allowed-after-ampersand-in-named-character-references
    // Reference: http://shazzer.co.uk/database/All/Characters-before-javascript-uri
    // Reference: http://shazzer.co.uk/database/All/Characters-after-javascript-uri
    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
    // Reference for named characters: https://html.spec.whatwg.org/multipage/entities.json
    var URI_BLACKLIST_PROTOCOLS = ['javascript', 'data', 'vbscript', 'mhtml'],
        URI_PROTOCOL_COLON = /(?::|&#[xX]0*3[aA];?|&#0*58;?|&colon;)/,
        URI_PROTOCOL_HTML_ENTITIES = /&(?:#([xX][0-9A-Fa-f]+|\d+);?|Tab;|NewLine;)/g,
        URI_PROTOCOL_WHITESPACES = /(?:^[\x00-\x20]+|[\t\n\r\x00]+)/g,
        codePointConvertor = String.fromCodePoint || String.fromCharCode,
        x;

    return (x = {
        /*
         * @param {string} s - An untrusted uri input
         * @returns {string} s - null if relative url, otherwise the protocol with whitespaces stripped and lower-cased
         */
        yup: function(s) {
            s = s.replace(NULL, '').split(URI_PROTOCOL_COLON, 2);
            return (s.length >= 2 && s[0]) ? s[0].replace(URI_PROTOCOL_HTML_ENTITIES, function (m, p) {
                        return (typeof p === STR_UD) ? '' // &Tab; &NewLine; will be stripped
                            : codePointConvertor((p[0] === 'X' || p[0] === 'x') ? '0' + p : p);
                    })
                    // required for left trim and remove interim whitespaces
                    .replace(URI_PROTOCOL_WHITESPACES, '')
                    .toLowerCase()
                : null;
        },

        /*
         * @param {string} s - An untrusted user input
         * @returns {string} s - The original user input with & < > " ' ` encoded respectively as &amp; &lt; &gt; &quot; &#39; and &#96;.
         *
         * @description
         * <p>This filter is a fallback to use the standard HTML escaping (i.e., encoding &<>"'`)
         * in contexts that are currently not handled by the automatic context-sensitive templating solution.</p>
         *
         * See workaround at https://github.com/yahoo/xss-filters#warnings
         */
        y: function(s) {
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(SPECIAL_HTML_CHARS, function (m) {
                        return m === '&' ? '&amp;'
                            :  m === '<' ? '&lt;'
                            :  m === '>' ? '&gt;'
                            :  m === '"' ? '&quot;'
                            :  m === "'" ? '&#39;'
                            :  /*m === '`'*/ '&#96;';       // in hex: 60
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
        // All NULL characters in s are first replaced with \uFFFD.
        // If s contains -->, --!>, or starts with -*>, insert a space right before > to stop state breaking at <!--{{{yc s}}}-->
        // If s ends with --!, --, or -, append a space to stop collaborative state breaking at {{{yc s}}}>, {{{yc s}}}!>, {{{yc s}}}-!>, {{{yc s}}}->
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#comment-state
        // Reference: http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-3
        // Reference: http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment
        // Reference: http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-0021
        // If s contains ]> or ends with ], append a space after ] is verified in IE to stop IE conditional comments.
        // Reference: http://msdn.microsoft.com/en-us/library/ms537512%28v=vs.85%29.aspx
        // We do not care --\s>, which can possibly be intepreted as a valid close comment tag in very old browsers (e.g., firefox 3.6), as specified in the html4 spec
        // Reference: http://www.w3.org/TR/html401/intro/sgmltut.html#h-3.2.4
        yc: function (s) {
            return typeof s === STR_UD ? STR_UD
                 : s === null          ? STR_NL
                 : s.toString()
                    .replace(NULL, '\uFFFD')
                    .replace(SPECIAL_COMMENT_CHARS, function(m){
                        return m === '--!' || m === '--' || m === '-' || m === ']' ? m + ' '
                            :/*
                            :  m === ']>'   ? '] >'
                            :  m === '-->'  ? '-- >'
                            :  m === '--!>' ? '--! >'
                            : /-*!?>/.test(m) ? */ m.slice(0, -1) + ' >';
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
        // PART A.
        // if s contains any state breaking chars (\t, \n, \v, \f, \r, space, and >),
        // they are escaped and encoded into their equivalent HTML entity representations. 
        // Reference: http://shazzer.co.uk/database/All/Characters-which-break-attributes-without-quotes
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state
        //
        // PART B. 
        // if s starts with ', " or `, encode it resp. as &#39;, &quot;, or &#96; to 
        // enforce the attr value (unquoted) state
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state
        // Reference: http://shazzer.co.uk/vector/Characters-allowed-attribute-quote
        // 
        // PART C.
        // Inject a \uFFFD character if an empty or all null string is encountered in 
        // unquoted attribute value state.
        // 
        // Rationale 1: our belief is that developers wouldn't expect an 
        //   empty string would result in ' name="passwd"' rendered as 
        //   attribute value, even though this is how HTML5 is specified.
        // Rationale 2: an empty or all null string (for IE) can 
        //   effectively alter its immediate subsequent state, we choose
        //   \uFFFD to end the unquoted attr 
        //   state, which therefore will not mess up later contexts.
        // Rationale 3: Since IE 6, it is verified that NULL chars are stripped.
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state
        // 
        // Example:
        // <input value={{{yavu s}}} name="passwd"/>
        yavu: function (s) {
            return typeof s === STR_UD ? STR_UD
                : s === null           ? STR_NL
                : s.toString().replace(SPECIAL_ATTR_VALUE_UNQUOTED_CHARS, function (m) {
                    return m === '\t' ? '&#9;'  // in hex: 09
                        :  m === '\n' ? '&#10;' // in hex: 0A
                        :  m === '\v' ? '&#11;' // in hex: 0B  for IE
                        :  m === '\f' ? '&#12;' // in hex: 0C
                        :  m === '\r' ? '&#13;' // in hex: 0D
                        :  m === ' '  ? '&#32;' // in hex: 20
                        :  m === '>'  ? '&gt;'
                        :  m === '"'  ? '&quot;'
                        :  m === "'"  ? '&#39;'
                        :  m === '`'  ? '&#96;'
                        : /*empty or all null*/ '\uFFFD';
                });
        },

        yu: encodeURI,
        yuc: encodeURIComponent,

        // Notice that yubl MUST BE APPLIED LAST, and will not be used independently (expected output from encodeURI/encodeURIComponent and yavd/yavs/yavu)
        // This is used to disable JS execution capabilities by prefixing x- to ^javascript:, ^vbscript: or ^data: that possibly could trigger script execution in URI attribute context
        yubl: function (s) {
            return URI_BLACKLIST_PROTOCOLS.indexOf(x.yup(s)) === -1 ? s : 'x-' + s;
        },

        // This is NOT a security-critical filter.
        // Reference: https://tools.ietf.org/html/rfc3986
        yufull: function (s) {
            return x.yu(s)
                    .replace(URL_IPV6, function(m, p) {
                        return '//[' + p + ']';
                    });
        }
    });
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
* @returns {string} All NULL characters in s are first replaced with \uFFFD. If s contains -->, --!>, or starts with -*>, insert a space right before > to stop state breaking at <!--{{{yc s}}}-->. If s ends with --!, --, or -, append a space to stop collaborative state breaking at {{{yc s}}}>, {{{yc s}}}!>, {{{yc s}}}-!>, {{{yc s}}}->. If s contains ]> or ends with ], append a space after ] is verified in IE to stop IE conditional comments.
*
* @description
*
* <ul>
* <li><a href="http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-3">Shazzer - Closing comments for -.-></a>
* <li><a href="http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment">Shazzer - Closing comments for --.></a>
* <li><a href="http://shazzer.co.uk/vector/Characters-that-close-a-HTML-comment-0021">Shazzer - Closing comments for .></a>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-start-state">HTML5 Comment Start State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-start-dash-state">HTML5 Comment Start Dash State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-state">HTML5 Comment State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-end-dash-state">HTML5 Comment End Dash State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-end-state">HTML5 Comment End State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#comment-end-bang-state">HTML5 Comment End Bang State</a></li>
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
* @returns {string} If s contains any state breaking chars (\t, \n, \v, \f, \r, space, and >), they are escaped and encoded into their equivalent HTML entity representations. If s starts with ', " or `, they are escaped to enforce the attr value (unquoted) state. If the whole string is empty or all null, inject a \uFFFD character.
*
* @description
* <p class="warning">Warning: This is NOT designed for any onX (e.g., onclick) attributes!</p>
* <p class="warning">Warning: If you're working on URI/components, use the more specific uri___InUnQuotedAttr filter </p>
* <p>Regarding \uFFFD injection,<br/>
*        Rationale 1: our belief is that developers wouldn't expect an 
*          empty string would result in ' name="passwd"' rendered as 
*          attribute value, even though this is how HTML5 is specified.<br/>
*        Rationale 2: an empty or all null string (for IE) can 
*          effectively alter its immediate subsequent state, we choose
*          \uFFFD to end the unquoted attr 
*          state, which therefore will not mess up later contexts.<br/>
*        Rationale 3: Since IE 6, it is verified that NULL chars are stripped.<br/>
*        Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state</p>
* <ul>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(unquoted)-state">HTML5 Attribute Value (Unquoted) State</a></li>
* <li><a href="https://html.spec.whatwg.org/multipage/syntax.html#before-attribute-value-state">HTML5 Before Attribute Value State</a></li>
* <li><a href="http://shazzer.co.uk/database/All/Characters-which-break-attributes-without-quotes">Shazzer - Characters-which-break-attributes-without-quotes</a></li>
* <li><a href="http://shazzer.co.uk/vector/Characters-allowed-attribute-quote">Shazzer - Characters-allowed-attribute-quote</a></li>
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

/* debug facility */
var debug = require('debug')('cph-debug'),
    debugDump = require('debug')('cph-dump'),
    debugBranch = require('debug')('cph-branching');

/* import the html context parser */
var contextParser = require('context-parser'),
    handlebarsUtils = require('./handlebars-utils.js'),
    stateMachine = contextParser.StateMachine;

var filter = require('xss-filters')._privFilters;

filter.FILTER_NOT_HANDLE = "y";
filter.FILTER_DATA = "yd";
filter.FILTER_COMMENT = "yc";
filter.FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED = "yavd";
filter.FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED = "yavs";
filter.FILTER_ATTRIBUTE_VALUE_UNQUOTED = "yavu";
filter.FILTER_ENCODE_URI = "yu";
filter.FILTER_ENCODE_URI_COMPONENT = "yuc";
filter.FILTER_URI_SCHEME_BLACKLIST = "yubl";
filter.FILTER_FULL_URI = "yufull";

// extracted from xss-filters
/*
['^(?:',
    [
        '[\\u0000-\\u0020]',
        '&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?',     // &#x1-20 in hex
        '&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?',   // &#1-32  in dec
        '&Tab;', '&NewLine;'                    // space, newline in char entities
    ].join('|'),
')*'].join('');
*/
var reURIContextStartWhitespaces = /^(?:[\u0000-\u0020]|&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?|&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?|&Tab;|&NewLine;)*/;
var uriAttributeNames = ['href', 'src', 'action', 'formaction', 'background', 'cite', 'longdesc', 'usemap', 'poster', 'xlink:href'];

/** 
* @module ContextParserHandlebars
*/
function ContextParserHandlebars(config) {
    config || (config = {});

    /* super() */
    contextParser.Parser.call(this);

    /* save the processed char */
    this._buffer = [];

    /* the flag is used to print out the char to console */
    this._printCharEnable = config.printCharEnable === undefined ? true : config.printCharEnable;

    /* the flag is used to strict mode of handling un-handled state */
    this._strictMode = config.strictMode === undefined ? false: config.strictMode;

    /* save the line number being processed */
    this._lineNo = 1;
    this._charNo = 1;

    debug("_printChar:"+this._printCharEnable);
    debug("_strictMode:"+this._strictMode);
}

/** 
* @module ContextParserHandlebarsException
*/
function ContextParserHandlebarsException(msg, lineNo, charNo) {
    this.msg = msg;
    this.lineNo = lineNo;
    this.charNo = charNo;
}

// @function ContextParser.getInternalState
contextParser.Parser.prototype.getInternalState = function() {
    var stateObj = {};
    stateObj.state = this.state;
    stateObj.tagNames = this.tagNames;
    stateObj.tagNameIdx = this.tagNameIdx;
    stateObj.attributeName = this.attributeName;
    stateObj.attributeValue = this.attributeValue;
    return stateObj;
};

// @function ContextParser.setInternalState
contextParser.Parser.prototype.setInternalState = function(stateObj) {
    // TODO: these 2 apis need to combine.
    this.setInitState(stateObj.state);
    this.setCurrentState(stateObj.state);

    this.tagNames = stateObj.tagNames.slice(0); // need deep copy
    this.tagNameIdx = stateObj.tagNameIdx;
    this.attributeName = stateObj.attributeName;
    this.attributeValue = stateObj.attributeValue;
};

// @function ContextParser._deepCompareState
contextParser.Parser.prototype._deepCompareState = function(stateObj1, stateObj2) {
    // var r = true;
    return ![
        'state', // test for the HTML5 state.
        // 'tagNameIdx', // test for the close tag in the branching logic, but it is not balanced.
        // 'attributeName', 'attributeValue' // not necessary the same in branching logic.
    ].some(function(key) {
        return (stateObj1[key] !== '' && stateObj2[key] !== '' && stateObj1[key] !== stateObj2[key]);
    });
    /*
    [
      // 'tagNames' // not necessary the same in branching logic.
    ].forEach(function(key) {
        if (!(stateObj1[key] instanceof Array) || !(stateObj2[key] instanceof Array)) {
            r = false;
            return;
        }
        for(var i=0;i<stateObj1[key].length;++i) {
            if (stateObj1[key][i] !== stateObj2[key][i]) {
                r = false;
            }
        }
    });
    */
    // return r;
};

/**********************************
* INHERITANCE & OVERRIDEN
**********************************/

/* inherit the prototype of contextParser.Parser */
ContextParserHandlebars.prototype = Object.create(contextParser.Parser.prototype);

/* overriding the HTML5 Context Parser's beforeWalk for printing out */
ContextParserHandlebars.prototype.beforeWalk = function(i, input) {

    var len = input.length,
        symbol = this.lookupChar(input[i]);

    while(true) {

        /* 
        * before passing to the _handleTemplate function, 
        * we need to judge the exact state of output expression,
        * querying the new state based on previous state this.state.
        */
        var _s = stateMachine.lookupStateFromSymbol[symbol][this.state];

        /* process the char */
        var j = this._handleTemplate(input, i, _s);

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
        symbol = this.lookupChar(input[i]);
    }

    return i;
};

/* overriding the HTML5 Context Parser's afterWalk for printing out */
ContextParserHandlebars.prototype.afterWalk = function(ch) {
    this._printChar(ch);

    /* for reporting ONLY */
    this._lineNo += this._countNewLineChar(ch);
    this._charNo += ch.length;
};

/**********************************
* PUBLIC API
**********************************/

/**
* @function module:ContextParserHandlebars.getOutput
*
* @description
* <p>Get the output of processed chars.</p>
*
*/
ContextParserHandlebars.prototype.getOutput = function() {
    return this._buffer.join('');
};

/**
* @function module:ContextParserHandlebars.printCharWithState
*
* @description
* <p>Print the internal states of the Context Parser when DEBUG=cph-dump.</p>
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

/**
* @function module:ContextParserHandlebars.analyzeContext
*/
ContextParserHandlebars.prototype.analyzeContext = function(input) {
    // the last parameter is the hack till we move to LR parser
    var ast = this.buildAst(input, 0, []);
    var stateObj = this.getInternalState();
    var r = this.analyzeAst(ast, stateObj);
    this._printChar(r.output);
    return r.output;
};

/**********************************
* UTILITY FUNCTIONS
**********************************/

// @function module:ContextParserHandlebars._printChar
ContextParserHandlebars.prototype._printChar = function(ch) {
    if (this._printCharEnable) {
        process.stdout.write(ch);
    }
    this._buffer.push(ch);
};

// @function module:ContextParserHandlebars._countNewLineChar
ContextParserHandlebars.prototype._countNewLineChar = function(ch) {
    var noOfNewLineChar = (ch.match(/\n/g) || []).length;
    return noOfNewLineChar;
};

// @function module:ContextParserHandlebars._analyzeContext
// _analyzeContext cannot handle branching statement
ContextParserHandlebars.prototype._analyzeContext = function(stateObj, obj) {
    var r = {
        output: '',
        stateObj: {}
    };

    /* factory class */
    var parser,
        ContextParserHandlebars = require('./context-parser-handlebars'),
        config = {};

    config.printCharEnable = false;
    parser = new ContextParserHandlebars(config);

    /* set the internal state */
    parser.setInternalState(stateObj);

    /* just for reporting. */
    parser._lineNo = obj.startLineNo;
    parser._charNo = obj.startPos;

    /* analyze */
    parser.contextualize(obj.content);

    /* get the output string */
    r.output = parser.getOutput();

    /* get the internal state */
    r.stateObj = parser.getInternalState();

    return r;
};

/**********************************
* FILTERS LOGIC
**********************************/

// @function module:ContextParserHandlebars._addFilters
ContextParserHandlebars.prototype._addFilters = function(state, stateObj, input) {

    /* transitent var */
    var isFullUri, f, filters, exceptionObj,
        attributeName = stateObj.attributeName,
        attributeValue = stateObj.attributeValue;

    debug("_addFilters:state:"+state);
    debug(stateObj);

    try {
        switch(state) {
            case stateMachine.State.STATE_DATA: // 1
                return [filter.FILTER_DATA];
            case stateMachine.State.STATE_RCDATA: // 3
                return [filter.FILTER_DATA];
            case stateMachine.State.STATE_RAWTEXT:  // 5
                /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                */
                throw 'Unsafe output expression @ STATE_RAWTEXT state';
            case stateMachine.State.STATE_SCRIPT_DATA: // 6
                /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                */
                throw 'Unsafe output expression @ STATE_SCRIPT_DATA state.';
            case stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME: // 34
                /* never fall into state 34 */
                throw 'Unexpected output expression @ STATE_BEFORE_ATTRIBUTE_NAME state';
            case stateMachine.State.STATE_ATTRIBUTE_NAME: // 35
                /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                */
                throw 'Unsafe output expression @ STATE_ATTRIBUTE_NAME state';
            case stateMachine.State.STATE_AFTER_ATTRIBUTE_NAME: // 36
                /* never fall into state 36 */
                throw 'Unexpected output expression @ STATE_AFTER_ATTRIBUTE_NAME state';
            case stateMachine.State.STATE_BEFORE_ATTRIBUTE_VALUE: // 37
                /* never fall into state 37 */
                throw 'Unexpected output expression @ STATE_BEFORE_ATTRIBUTE_VALUE state';
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED: // 38
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED: // 39
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED: // 40
                filters = [];
                // URI scheme
                if (uriAttributeNames.indexOf(attributeName) !== -1) {
                    /* we don't support javascript parsing yet */
                    // TODO: this filtering rule cannot cover all cases.
                    if (handlebarsUtils.blacklistProtocol(attributeValue)) {
                        throw 'Unsafe output expression @ attribute URI Javascript context';
                    }

                    /* add the correct uri filter */
                    if (attributeValue.replace(reURIContextStartWhitespaces, '') === "") {
                        isFullUri = true;
                        f = filter.FILTER_FULL_URI;
                    } else {
                        isFullUri = false;
                        f = (attributeValue.indexOf('=') === -1) ? filter.FILTER_ENCODE_URI : filter.FILTER_ENCODE_URI_COMPONENT;
                    }
                    filters.push(f);

                    /* add the attribute value filter */
                    switch(state) {
                        case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                            f = filter.FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                            break;
                        case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                            f = filter.FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED;
                            break;
                        default: // stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                            f = filter.FILTER_ATTRIBUTE_VALUE_UNQUOTED;
                    }
                    filters.push(f);

                    /* add blacklist filters at the end of filtering chain */
                    if (isFullUri) {
                        /* blacklist the URI scheme for full uri */
                        filters.push(filter.FILTER_URI_SCHEME_BLACKLIST);
                    }
                    return filters;
                } else if (attributeName === "style") {  // CSS
                    /* we don't support css parser yet
                    * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                    * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                    */
                    throw 'Unsafe output expression @ attribute style CSS context';
                } else if (attributeName.match(/^on/i)) { // Javascript
                    /* we don't support js parser yet
                    * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                    * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                    */
                    throw 'Unsafe output expression @ attrubute on* Javascript context';
                } else {
                    /* add the attribute value filter */
                    switch(state) {
                        case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                            return [filter.FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED];
                        case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                            return [filter.FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED];
                        default: // stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                            return [filter.FILTER_ATTRIBUTE_VALUE_UNQUOTED];
                    }
                }
                break;
            case stateMachine.State.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED: // 42
                /* never fall into state 42 */
                throw 'Unsafe output expression @ STATE_AFTER_ATTRIBUTE_VALUE_QUOTED state';
            case stateMachine.State.STATE_COMMENT: // 48
                return [filter.FILTER_COMMENT];
            default:
                throw 'Unsafe output expression @ NOT HANDLE state';
        }
    } catch (stateRelatedMessage) {
        exceptionObj = new ContextParserHandlebarsException(
            '[WARNING] ContextParserHandlebars: ' + stateRelatedMessage, 
            this._lineNo, 
            this._charNo);
        handlebarsUtils.handleError(exceptionObj, this._strictMode);
        return [filter.FILTER_NOT_HANDLE];
    }
};

/**********************************
* HANDLING TEMPLATE LOGIC
**********************************/

// @function module:ContextParserHandlebars._consumeExpression
ContextParserHandlebars.prototype._consumeExpression = function(input, i, type, saveToBuffer) {
    var msg, exceptionObj, 
        len = input.length,
        str = '',
        obj = {};

    obj.str = '';
    for(var j=i;j<len;++j) {
        switch (type) {
            case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                    saveToBuffer === true ? this._printChar('--}}') : obj.str += '--}}';
                    obj.index = j+3;
                    return obj;
                } else if (input[j] === '-' && j+4<len && input[j+1] === '-' && input[j+2] === '~' && input[j+3] === '}' && input[j+4] === '}') {
                    saveToBuffer === true ? this._printChar('--~}}') : obj.str += '--~}}';
                    obj.index = j+4;
                    return obj;
                }
                break;
            case handlebarsUtils.RAW_EXPRESSION:
                if (input[j] === '}' && j+2<len && input[j+1] === '}' && input[j+2] === '}') {
                    saveToBuffer === true ? this._printChar('}}}') : obj.str += '}}}';
                    obj.index = j+2;
                    return obj;
                }
                break;
            case handlebarsUtils.UNHANDLED_EXPRESSION:
            case handlebarsUtils.ESCAPE_EXPRESSION:
            case handlebarsUtils.PARTIAL_EXPRESSION:
            case handlebarsUtils.BRANCH_EXPRESSION:
            case handlebarsUtils.BRANCH_END_EXPRESSION:
            case handlebarsUtils.ELSE_EXPRESSION:
            case handlebarsUtils.REFERENCE_EXPRESSION:
            case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                if (input[j] === '}' && j+1<len && input[j+1] === '}') {
                    saveToBuffer === true ? this._printChar('}}') : obj.str += '}}';
                    obj.index = j+1;
                    return obj;
                }
                break;
        }
        saveToBuffer === true ? this._printChar(input[j]) : obj.str += input[j];
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter close brace of expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

// @function module:ContextParserHandlebars._handleEscapeExpression
ContextParserHandlebars.prototype._handleEscapeExpression = function(input, i, len, nextState, saveToBuffer) {
    var msg, exceptionObj,
        obj = {};

    obj.str = '';

    saveToBuffer === true ? this._printChar('{{') : obj.str += '{{';
    /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
    saveToBuffer === true ? this._printChar('{') : obj.str += '{';

    /* parse expression */
    var re = handlebarsUtils.isValidExpression(input, i, handlebarsUtils.ESCAPE_EXPRESSION),
        filters = [];

    /* get the customized filter based on the current HTML5 state before the Handlebars template expression. */
    var stateObj = this.getInternalState();
    filters = this._addFilters(nextState, stateObj, input);
    for(var k=filters.length-1;k>=0;--k) {
        if (saveToBuffer) {
            (re.isSingleID && k === 0) ? this._printChar(filters[k]+" ") : this._printChar(filters[k]+" (");
        } else {
            (re.isSingleID && k === 0) ? obj.str += filters[k]+" " : obj.str += filters[k]+" (";
        }
    }

    for(var j=i+2;j<len;++j) {
        if (input[j] === '}' && j+1<len && input[j+1] === '}') {
            for(var l=filters.length-1;l>=0;--l) {
                if (saveToBuffer) {
                    (re.isSingleID && l === 0) ? this._printChar('') : this._printChar(')');
                } else {
                    (re.isSingleID && l === 0) ? obj.str += '' : obj.str += ')';
                }
            }

            saveToBuffer === true ? this._printChar('}}') : obj.str += '}}';
            j=j+1;
            /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}}, no need to increase j by 1. */
            saveToBuffer === true ? this._printChar('}') : obj.str += '}';

            obj.index = j;
            return obj;
        } else {
            saveToBuffer === true ? this._printChar(input[j]) : obj.str += input[j];
        }
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of escape expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

// @function module:ContextParserHandlebars._handleRawBlock
ContextParserHandlebars.prototype._handleRawBlock = function(input, i, saveToBuffer) {
    var msg, exceptionObj, 
        obj = {};
    var isStartExpression = true,
        len = input.length,
        re = handlebarsUtils.isValidExpression(input, i, handlebarsUtils.RAW_BLOCK),
        tag = re.tag;

    obj.str = '';
    for(var j=i;j<len;++j) {
        if (isStartExpression && input[j] === '}' && j+3<len && input[j+1] === '}' && input[j+2] === '}' && input[j+3] === '}') {
            saveToBuffer === true ? this._printChar('}}}}') : obj.str += '}}}}';
            j=j+3;
    
            isStartExpression = false;
        } else if (!isStartExpression && input[j] === '{' && j+4<len && input[j+1] === '{' && input[j+2] === '{' && input[j+3] === '{' && input[j+4] === '/') {
            re = handlebarsUtils.isValidExpression(input, j, handlebarsUtils.RAW_END_BLOCK);
            if (re.result === false) {
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw end block expression.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, true);
            }
            if (re.tag !== tag) {
                msg = "[ERROR] ContextParserHandlebars: Parsing error! start/end raw block name mismatch.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, true);
            }
            for(var k=j;k<len;++k) {
                if (input[k] === '}' && k+3<len && input[k+1] === '}' && input[k+2] === '}' && input[k+3] === '}') {
                    saveToBuffer === true ? this._printChar('}}}}') : obj.str += '}}}}';
                    k=k+3;

                    obj.index = k;
                    return obj;
                }
                saveToBuffer === true ? this._printChar(input[k]) : obj.str += input[k];
            }
        } else {
            saveToBuffer === true ? this._printChar(input[j]) : obj.str += input[j];
        }
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}}}' close brace of raw block.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

/*
* @function module:ContextParserHandlebars._handleTemplate
*
* @param {string} input - The input string of the HTML5 web page.
* @param {integer} i - The index of the current character in the input string.
* @param {integer} state - The current HTML5 state of the current character before the Handlebars expression.
* @returns {integer} The index right after the last '}' if it is Handlebars expression or return immediately if it is not Handlebars.
*
*/
ContextParserHandlebars.prototype._handleTemplate = function(input, i, nextState) {

    /* the max length of the input string */
    var len = input.length;
    /* regular expression validation result */
    var re;
    /* error msg */
    var msg, exceptionObj;
    /* _handleXXXX return object */
    var obj;
    /* Handlebars expression type */
    var handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION; 

    try {
        // we don't care about the expression with more than 4 braces, handlebars will handle it.
        /* handling different type of expression */
        if (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '{' && input[i+3] === '{') {
            handlebarsExpressionType = handlebarsUtils.RAW_BLOCK;
            re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
            if (re.result === false) {
                throw "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw block expression.";
            }

            /* _handleRawBlock */
            debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
            obj = this._handleRawBlock(input, i, true);
            /* advance the index pointer by 1 to the char after the last brace of expression. */
            return obj.index+1;

        } else if (input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '{') {
            handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
            re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
            if (re.result === false) {
                throw "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw expression.";
            }

            /* _handleRawExpression */
            debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
            obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
            /* update the Context Parser's state if it is raw expression. */
            this.state = nextState;
            /* advance the index pointer by 1 to the char after the last brace of expression. */
            return obj.index+1;

        } else if (input[i] === '{' && i+1<len && input[i+1] === '{') {
            // this is just for lookAhead, does not guarantee the valid expression.
            handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, i);
            switch (handlebarsExpressionType) {
                case handlebarsUtils.ESCAPE_EXPRESSION:
                    re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                    if (re.result === false) {
                        throw "[ERROR] ContextParserHandlebars: Parsing error! Invalid escape expression.";
                    }

                    /* _handleEscapeExpression */
                    debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                    obj = this._handleEscapeExpression(input, i, len, nextState, true);
                    /* update the Context Parser's state if it is raw expression. */
                    this.state = nextState;
                    /* advance the index pointer by 1 to the char after the last brace of expression. */
                    return obj.index+1;

                case handlebarsUtils.PARTIAL_EXPRESSION:
                case handlebarsUtils.REFERENCE_EXPRESSION:
                    re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                    if (re.result === false) {
                        throw "[ERROR] ContextParserHandlebars: Parsing error! Invalid partial/reference expression.";
                    }

                    /* _consumeExpression */
                    debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                    obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
                    /* advance the index pointer by 1 to the char after the last brace of expression. */
                    return obj.index+1;

                case handlebarsUtils.BRANCH_EXPRESSION:
                    throw "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{[#|^].*}} expression.";
                case handlebarsUtils.BRANCH_END_EXPRESSION:
                    throw "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{/.*}} expression.";
                case handlebarsUtils.ELSE_EXPRESSION:
                    throw "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{else}} or {{^}} expression.";
                case handlebarsUtils.UNHANDLED_EXPRESSION:
                    throw "[ERROR] ContextParserHandlebars: Parsing error! Unexpected expression.";
                case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                    // no need to validate the comment expression as the content inside are skipped.
                    /* _consumeExpression */
                    debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                    obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
                    /* advance the index pointer by 1 to the char after the last brace of expression. */
                    return obj.index+1;

                default:
                    throw "[ERROR] ContextParserHandlebars: Parsing error! Unknown expression.";
            }
        } else {
            /* return immediately for non template start char '{' */
            return i;
        }
    } catch (stateRelatedMessage) {
        exceptionObj = new ContextParserHandlebarsException(
            '[WARNING] ContextParserHandlebars: ' + stateRelatedMessage, 
            this._lineNo, 
            this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
    }
};

/**********************************
* BUILDING AST 
**********************************/

// @function module:ContextParserHandlebars.analyzeAst
ContextParserHandlebars.prototype.analyzeAst = function(ast, stateObj) {
    var obj = {},
        len = ast.program.length;

    var r = {},
        t, msg, exceptionObj;

    r.lastStates = [];
    r.lastStates[0] = stateObj;
    r.lastStates[1] = stateObj;
    r.output = '';

    var programDebugOutput = "", inverseDebugOutput = "";

    var parser = this;
    ast.program.forEach(function(obj, i) {
        if (obj.type === 'content' ||
            obj.type === 'rawblock' ||
            obj.type === 'rawexpression' ||
            obj.type === 'escapeexpression' ||
            obj.type === 'expression') {

            t = parser._analyzeContext(r.lastStates[0], obj);
            r.output += t.output;
            r.lastStates[0] = t.stateObj;
            programDebugOutput += t.output;
        
        } else if (obj.type === 'node') {

            t = parser.analyzeAst(obj.content, r.lastStates[0]);
            r.lastStates[0] = t.lastStates[0]; // index 0 and 1 MUST be equal
            r.output += t.output;
            programDebugOutput += t.output;

        } else if (obj.type === 'branchstart' ||
            obj.type === 'branchelse' ||
            obj.type === 'branchend') {

            r.output += obj.content;
            programDebugOutput += obj.content;
        }
    });
    /* TODO: duplicated code, revise it later */
    ast.inverse.forEach(function(obj, i) {
        if (obj.type === 'content' ||
            obj.type === 'rawblock' ||
            obj.type === 'rawexpression' ||
            obj.type === 'escapeexpression' ||
            obj.type === 'expression') {

            t = parser._analyzeContext(r.lastStates[1], obj);
            r.output += t.output;
            r.lastStates[1] = t.stateObj;
            programDebugOutput += t.output;
        
        } else if (obj.type === 'node') {

            t = parser.analyzeAst(obj.content, r.lastStates[1]);
            r.lastStates[1] = t.lastStates[1]; // index 0 and 1 MUST be equal
            r.output += t.output;
            programDebugOutput += t.output;

        } else if (obj.type === 'branchstart' ||
            obj.type === 'branchelse' ||
            obj.type === 'branchend') {

            r.output += obj.content;
            inverseDebugOutput += obj.content;
        }
    });

    if (ast.program.length > 0 && ast.inverse.length === 0) {
        debugBranch("_analyseBranchAst:["+r.lastStates[0].state+"/"+r.lastStates[0].state+"]");
        r.lastStates[1] = r.lastStates[0];
    } else if (ast.program.length === 0 && ast.inverse.length > 0) {
        debugBranch("_analyseBranchAst:["+r.lastStates[1].state+"/"+r.lastStates[1].state+"]");
        r.lastStates[0] = r.lastStates[1];
    }

    if (!this._deepCompareState(r.lastStates[0], r.lastStates[1])) {
        msg  = "[ERROR] ContextParserHandlebars: Parsing error! Inconsitent HTML5 state OR without close tag after conditional branches. Please fix your template! \n";
        msg += "[ERROR] #if  branch: " + programDebugOutput.slice(0, 50) + "...\n";
        msg += "[ERROR] else branch: " + inverseDebugOutput.slice(0, 50) + "...\n";
        msg += JSON.stringify(r.lastStates[0]) + "\n";
        msg += JSON.stringify(r.lastStates[1]) + "\n";
        exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
    }
    return r;
};

// @function module:ContextParserHandlebars.buildAst
ContextParserHandlebars.prototype.buildAst = function(input, i, sp) {

    /* init the data structure */
    var ast = {};
    ast.program = [];
    ast.inverse = [];

    var j = 0,
        len = input.length,
        re,
        msg, exceptionObj; // msg and exception

    var content = '',
        inverse = false,
        buildNode = false,
        saveObj = {},
        obj = {};

    var startPos = 0,
        endPos = 0, 
        lineNo = 0;

    /* Handlebars expression type */
    var handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION,
        handlebarsExpressionTypeName = '';

    try {
        for(j=i;j<len;++j) {

            handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION; 
            if (input[j] === '{' && j+3<len && input[j+1] === '{' && input[j+2] === '{' && input[j+3] === '{') {
                handlebarsExpressionType = handlebarsUtils.RAW_BLOCK;
                handlebarsExpressionTypeName = 'rawblock';
            } else if (input[j] === '{' && j+2<len && input[j+1] === '{' && input[j+2] === '{') {
                handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
                handlebarsExpressionTypeName = 'rawexpression';
            } else if (input[j] === '{' && j+1<len && input[j+1] === '{') {
                handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, j);
                handlebarsExpressionType === handlebarsUtils.ESCAPE_EXPRESSION ? handlebarsExpressionTypeName = 'escapeexpression' : handlebarsExpressionTypeName = 'expression';
                handlebarsExpressionType === handlebarsUtils.BRANCH_EXPRESSION ? handlebarsExpressionTypeName = 'branchstart' : '';
                handlebarsExpressionType === handlebarsUtils.ELSE_EXPRESSION   ? handlebarsExpressionTypeName = 'branchelse' : '';
                handlebarsExpressionType === handlebarsUtils.BRANCH_END_EXPRESSION ? handlebarsExpressionTypeName = 'branchend' : '';
            }

            if (handlebarsExpressionType !== handlebarsUtils.NOT_EXPRESSION) {

                /* validation */
                re = handlebarsUtils.isValidExpression(input, j, handlebarsExpressionType);
                if (re.result === false) {
                    throw "[ERROR] ContextParserHandlebars: Parsing error! Invalid expression. ("+handlebarsExpressionType+")";
                }

                /* save content */
                if (content !== '') {
                    startPos = endPos+1;
                    endPos = startPos+content.length-1;
                    saveObj = this._getSaveObject('content', content, startPos, lineNo);
                    lineNo += this._countNewLineChar(content);
                    inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                    content = '';
                }

                switch (handlebarsExpressionType) {
                    case handlebarsUtils.RAW_BLOCK:
                        /* _handleRawBlock */
                        startPos = j;
                        obj = this._handleRawBlock(input, j, false);
                        endPos = j = obj.index;
                        saveObj = this._getSaveObject('rawblock', obj.str, startPos, lineNo);
                        lineNo += this._countNewLineChar(obj.str);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                 
                        break;
                    case handlebarsUtils.ELSE_EXPRESSION:
                        /* inverse */
                        inverse = true;

                        /* _consumeExpression */
                        startPos = j;
                        obj = this._consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        saveObj = this._getSaveObject(handlebarsExpressionTypeName, obj.str, startPos, lineNo);
                        lineNo += this._countNewLineChar(obj.str);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);

                        break;
                    case handlebarsUtils.BRANCH_EXPRESSION:

                        if (sp.length === 0 || buildNode) {
                            /* buildAst recursively */
                            startPos = j;
                            obj = this.buildAst(input, j, [re.tag]);
                            endPos = j = obj.index;
                            saveObj = this._getSaveObject('node', obj, startPos, lineNo);
                            lineNo += obj.noOfNewLineChar;
                            inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                        } else {
                            /* _consumeExpression */
                            startPos = j;
                            obj = this._consumeExpression(input, j, handlebarsExpressionType, false);
                            endPos = j = obj.index;
                            saveObj = this._getSaveObject(handlebarsExpressionTypeName, obj.str, startPos, lineNo);
                            lineNo += this._countNewLineChar(obj.str);
                            inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                            buildNode = true;
                        }

                        break;
                    case handlebarsUtils.RAW_EXPRESSION:
                    case handlebarsUtils.ESCAPE_EXPRESSION:
                    case handlebarsUtils.PARTIAL_EXPRESSION:
                    case handlebarsUtils.REFERENCE_EXPRESSION:
                    case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                    case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                    case handlebarsUtils.BRANCH_END_EXPRESSION:
                        if (handlebarsExpressionType === handlebarsUtils.BRANCH_END_EXPRESSION) {
                            var startTag = sp.pop();
                            if (startTag !== re.tag) {
                                // broken template as the end expression does not match, throw exception before function returns 
                                throw "[ERROR] ContextParserHandlebars: Template expression mismatch (startExpression:"+startTag+"/endExpression:"+re.tag+")";
                            }
                        }

                        /* _consumeExpression */
                        startPos = j;
                        obj = this._consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        saveObj = this._getSaveObject(handlebarsExpressionTypeName, obj.str, startPos, lineNo);
                        lineNo += this._countNewLineChar(obj.str);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);

                        break;
                    default:
                        throw "[ERROR] ContextParserHandlebars: Parsing error! Unexcepted error.";
                }

                /* return for handlebarsUtils.BRANCH_END_EXPRESSION */
                if (handlebarsExpressionType === handlebarsUtils.BRANCH_END_EXPRESSION) {
                    ast.tag = re.tag;
                    ast.index = j;
                    ast.noOfNewLineChar = lineNo;
                    return ast;
                }

            } else {
                content += input[j];
            }
        }

        if (sp.length > 0) {
            throw "[ERROR] ContextParserHandlebars: Template does not have branching close expression";
        }
    } catch (stateRelatedMessage) {
        exceptionObj = new ContextParserHandlebarsException(
            '[WARNING] ContextParserHandlebars: ' + stateRelatedMessage, 
            this._lineNo, 
            this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
    }
   
    /* save the last content */
    if (content !== '') {
        startPos = endPos+1;
        endPos = startPos+content.length-1;
        saveObj = this._getSaveObject('content', content, startPos, lineNo);
        lineNo += this._countNewLineChar(content);
        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
    }

    ast.index = j;
    ast.noOfNewLineChar = lineNo;
    return ast;
};

// @function ContextParserHandlebars._getSaveObject
ContextParserHandlebars.prototype._getSaveObject = function(type, content, startPos, lineNo) {
    var obj = {};
    obj.type = type;
    obj.content = content;

    obj.startPos = startPos;
    obj.startLineNo = this._lineNo + lineNo;
    return obj;
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();

}).call(this,require('_process'))
},{"./context-parser-handlebars":8,"./handlebars-utils.js":9,"_process":6,"context-parser":1,"debug":3,"xss-filters":7}],9:[function(require,module,exports){
/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*jshint -W084 */
(function () {
"use strict";

/**
* @class HandlebarsUtils
* @static
*/
var HandlebarsUtils = {};

/* filter */
var filter = require('xss-filters')._privFilters;

/* type of expression */
HandlebarsUtils.UNHANDLED_EXPRESSION = -1;

HandlebarsUtils.NOT_EXPRESSION = 0;

/* '{{{{' '\s'* ('not \s, special-char'+) '\s'* non-greedy '}}}}' and not follow by '}' */
HandlebarsUtils.RAW_BLOCK = 9; // {{{{block}}}}
HandlebarsUtils.rawBlockRegExp = /^\{\{\{\{\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*?\}\}\}\}/;
/* '{{{{' '/' ('not \s, special-char'+) non-greedy '}}}}' and not follow by '}' */
HandlebarsUtils.RAW_END_BLOCK = 10; // {{{{/block}}}}
HandlebarsUtils.rawEndBlockRegExp = /^\{\{\{\{\/([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)?\}\}\}\}(?!})/;

/* '{{{' '~'? 'space'* '@'? 'space'* ('not {}~'+) 'space'* ('not {}~'+) '~'? non-greedy '}}}' and not follow by '}' */
HandlebarsUtils.RAW_EXPRESSION = 1; // {{{expression}}}
// HandlebarsUtils.rawExpressionRegExp = /^\{\{\{\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>\[\\\]\^`\{\|\}\~]+)\s*?\}\}\}(?!})/;
HandlebarsUtils.rawExpressionRegExp = /^\{\{\{~?\s*@?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}\}(?!})/;

/* '{{' '~'? 'space'* '@'? 'space'* ('not {}~'+) 'space'* ('not {}~'+) '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.ESCAPE_EXPRESSION = 2; // {{expression}}
HandlebarsUtils.escapeExpressionRegExp = /^\{\{~?\s*@?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;

/* '{{' '~'? '>' '\s'* ('not \s, special-char'+) '\s'* 'not ~{}'* non-greedy '}}' and not follow by '}' */
HandlebarsUtils.PARTIAL_EXPRESSION = 3; // {{>.*}}
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?>\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^~\}\{]*~??\}\}(?!})/;

/* '{{' '~'? '&' '\s'* ('not \s, special-char'+) '\s'* 'not ~{}'* non-greedy '}}' and not follow by '}' */
HandlebarsUtils.REFERENCE_EXPRESSION = 11; // {{&.*}}
HandlebarsUtils.referenceExpressionRegExp = /^\{\{~?&\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^~\}\{]*~??\}\}(?!})/;

/* '{{' '~'? '# or ^' '\s'* ('not \s, special-char'+) '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.BRANCH_EXPRESSION = 4; // {{#.*}}, {{^.*}}
HandlebarsUtils.branchExpressionRegExp = /^\{\{~?[#|\^]\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^\}\{~]*~??\}\}(?!})/;
/* '{{' '~'? '/' '\s'* ('not \s, special-char'+) '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.BRANCH_END_EXPRESSION = 5; // {{/.*}}
HandlebarsUtils.branchEndExpressionRegExp = /^\{\{~?\/\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^\}\{~]*~??\}\}(?!})/;

/* '{{' '~'? '\s'* 'else' '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.ELSE_EXPRESSION = 6; // {{else}}, {{^}}
HandlebarsUtils.elseExpressionRegExp = /^\{\{~?\s*else\s*[^\}\{~]*~??\}\}(?!})/;
/* '{{' '~'? '^'{1} '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.elseShortFormExpressionRegExp = /^\{\{~?\^{1}~??\}\}(?!})/;

/* '{{' '~'? '!--' */
HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM = 7; // {{!--.*--}}
HandlebarsUtils.commentLongFormExpressionRegExp = /^\{\{~?!--/;
/* '{{' '~'? '!' */
HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM = 8; // {{!.*}}
HandlebarsUtils.commentShortFormExpressionRegExp = /^\{\{~?!/;

// @function HandlebarsUtils.lookAheadTest
HandlebarsUtils.lookAheadTest = function(input, i) {
    var len = input.length,
        j, re;

    /* reserved char must be the immediate char right after brace */
    if (input[i] === '{' && i+2<len && input[i+1] === '{') {
        j = input[i+2] === '~' ? 3 : 2;

        switch(input[i+j]) {
            case '>':
                return HandlebarsUtils.PARTIAL_EXPRESSION;
            case '#':
                return HandlebarsUtils.BRANCH_EXPRESSION;
            case '^':
                /* using i to test */
                re = HandlebarsUtils.isValidExpression(input, i, HandlebarsUtils.ELSE_EXPRESSION);
                return re.result === true ? HandlebarsUtils.ELSE_EXPRESSION : HandlebarsUtils.BRANCH_EXPRESSION;
            case '/':
                return HandlebarsUtils.BRANCH_END_EXPRESSION;
            case '&':
                return HandlebarsUtils.REFERENCE_EXPRESSION;
            case '!':
                if (i+j+2<len && input[i+j+1] === '-' && input[i+j+2] === '-') {
                    return HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM;
                }
                return HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM;
            default: 
                re = HandlebarsUtils.isValidExpression(input, i, HandlebarsUtils.ELSE_EXPRESSION);
                return re.result === true ? HandlebarsUtils.ELSE_EXPRESSION : HandlebarsUtils.ESCAPE_EXPRESSION;
        }
    }
    /* never falls into this and should throw error */
    return HandlebarsUtils.UNHANDLED_EXPRESSION;
};

// @function HandlebarsUtils.isValidExpression
HandlebarsUtils.isValidExpression = function(input, i, type) {
    var re = {};
    var s = input.slice(i);
    switch(type) {
        case HandlebarsUtils.RAW_BLOCK:
            re = HandlebarsUtils.rawBlockRegExp.exec(s);
            break;
        case HandlebarsUtils.RAW_END_BLOCK:
            re = HandlebarsUtils.rawEndBlockRegExp.exec(s);
            break;
        case HandlebarsUtils.RAW_EXPRESSION:
            re = HandlebarsUtils.rawExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.ESCAPE_EXPRESSION:
            re = HandlebarsUtils.escapeExpressionRegExp.exec(s);
            if (re !== null && re[1] !== undefined) {
                if (HandlebarsUtils.isReservedChar(re[1], 0)) {
                    re.tag = false;
                    re.isSingleID = false;
                    re.result = false;
                    return re;
                }
                if (re[2] === '') {
                    re.isSingleID = true;
                } else {
                    re.isSingleID = false;
                }
            }
            break;
        case HandlebarsUtils.PARTIAL_EXPRESSION:
            re = HandlebarsUtils.partialExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.BRANCH_EXPRESSION:
            re = HandlebarsUtils.branchExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.BRANCH_END_EXPRESSION:
            re = HandlebarsUtils.branchEndExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.ELSE_EXPRESSION:
            re = HandlebarsUtils.elseExpressionRegExp.exec(s);
            if (re === null) {
                re = HandlebarsUtils.elseShortFormExpressionRegExp.exec(s);
            }
            break;
        case HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
            re = HandlebarsUtils.commentLongFormExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
            re = HandlebarsUtils.commentShortFormExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.REFERENCE_EXPRESSION:
            re = HandlebarsUtils.referenceExpressionRegExp.exec(s);
            break;
        default:
            return re;
    }

    if (re !== null) {
        re.result = true;
        if (re !== null && re[1]) {
            re.tag = re[1];
        }
    } else {
        re = {};
        re.tag = false;
        re.isSingleID = false;
        re.result = false;
    }
    return re;
};

// @function HandlebarsUtils.isReservedChar
HandlebarsUtils.isReservedChar = function(input, i) {
    var ch = input[i];
    if (ch === '~' && i+1<input.length) {
        ch = input[i+1];
    }

    return (ch === '#' || ch === '/' || ch === '>' || ch === '^' || ch === '!' || ch === '&');
};

// @function HandlebarsUtils.handleError
HandlebarsUtils.handleError = function(exceptionObj, throwErr) {
    if (throwErr) {
        throw exceptionObj;
    } else if (typeof console === 'object') {
        if (console.hasOwnProperty('warn') && typeof console.warn === 'function') {
            console.warn(exceptionObj.msg + " [lineNo:" + exceptionObj.lineNo + ",charNo:" + exceptionObj.charNo + "]");
        } else if (console.hasOwnProperty('log') && typeof console.log === 'function') {
            console.log(exceptionObj.msg + " [lineNo:" + exceptionObj.lineNo + ",charNo:" + exceptionObj.charNo + "]");
        }
    }
};

// @function HandlebarsUtils.blacklistProtocol
HandlebarsUtils.blacklistProtocol = function(s) {
    /* the assumption of the blacklist filter behavior is to modify the input 
       if it is blacklisted
    */
    var es = encodeURI(s),
        ns = filter.yubl(es);
    return (ns[0] !== es[0] || ns[1] !== es[1]);
};

module.exports = HandlebarsUtils;

})();

},{"xss-filters":7}]},{},[8])(8)
});