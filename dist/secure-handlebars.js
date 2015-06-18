(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Handlebars = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*jshint -W030 */
(function() {
"use strict";

var stateMachine = require('./html5-state-machine.js'),
    htmlState = stateMachine.State;

/**
 * @class FastParser
 * @constructor FastParser
 */
function FastParser() {

    this.listeners = {};

    this.state = stateMachine.State.STATE_DATA;  /* Save the current status */
    this.tags = ['', '']; /* Save the current tag name */
    this.tagIdx = 0;
    this.attrName = ''; /* Save the current attribute name */
    this.attributeValue = ''; /* Save the current attribute value */
    this.input = '';
    this.inputLen = 0;
}

/**
 * @function FastParser#on
 *
 * @param {string} eventType - the event type 
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>register the given event listener to the given eventType</p>
 *
 */
FastParser.prototype.on = function (eventType, listener) {
    var l = this.listeners[eventType];
    if (listener) {
        if (l) {
            l.push(listener);
        } else {
            this.listeners[eventType] = [listener];
        }
    }
    return this;
};

/**
 * @function FastParser#once
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>register the given event listener to the given eventType, for which it will be fired only once</p>
 *
 */
FastParser.prototype.once = function(eventType, listener) {
    var self = this, onceListener;
    if (listener) {
        onceListener = function () {
            self.off(eventType, onceListener);
            listener.apply(self, arguments);
        };
        return this.on(eventType, onceListener);
    }
    return this;
};

/**
 * @function FastParser#off
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>remove the listener from being fired when the eventType happen</p>
 *
 */
FastParser.prototype.off = function (eventType, listener) {
    if (listener) {
        var i, len, listeners = this.listeners[eventType];
        if (listeners) {
            for (i = 0; listeners[i]; i++) {
                if (listeners[i] === listener) {
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    }
    return this;
};

/**
 * @function FastParser#emit
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @returns this
 *
 * @description
 * <p>fire those listeners correspoding to the given eventType</p>
 *
 */
FastParser.prototype.emit = function (listeners, args) {
    if (listeners) {
        var i = -1, len;
        if ((len = listeners.length)) {
            while (++i < len) {
                listeners[i].apply(this, args || []);
            }
        }
    }
    return this;
};

/*
 * @function FastParser#walk
 *
 * @param {integer} i - the position of the current character in the input stream
 * @param {string} input - the input stream
 * @returns {integer} the new location of the current character.
 *
 */
FastParser.prototype.walk = function(i, input, endsWithEOF) {

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
            if(this.tags[0].toLowerCase() === this.tags[1].toLowerCase()) {
                reconsume = 0;  /* see 12.2.4.13 - switch state for the following case, otherwise, reconsume. */
                this.matchEndTagWithStartTag(symbol);
            }
            break;
        case 8:  this.matchEscapedScriptTag(ch); break;
        case 11: this.processTagName(ch); break;
        case 12: this.createAttributeNameAndValueTag(ch); break;
        case 13: this.appendAttributeNameTag(ch); break;
        case 14: this.appendAttributeValueTag(ch); break;
    }

    if (reconsume) {                  /* reconsume the character */
        this.listeners.reWalk && this.emit(this.listeners.reWalk, [this.state, i, endsWithEOF]);
        return this.walk(i, input);
    }

    return i;
};

FastParser.prototype.createStartTag = function (ch) {
    this.tagIdx = 0;
    this.tags[0] = ch;
};

FastParser.prototype.createEndTag = function (ch) {
    this.tagIdx = 1;
    this.tags[1] = ch;
};

FastParser.prototype.appendTagName = function (ch) {
    this.tags[this.tagIdx] += ch;
};

FastParser.prototype.resetEndTag = function (ch) {
    this.tagIdx = 1;
    this.tags[1] = '';
};

FastParser.prototype.matchEndTagWithStartTag = function (symbol) {
        /* Extra Logic #6 :
        WHITESPACE: If the current end tag token is an appropriate end tag token, then switch to the before attribute name state.
                Otherwise, treat it as per the 'anything else' entry below.
        SOLIDUS (/): If the current end tag token is an appropriate end tag token, then switch to the this.closing start tag state.
                Otherwise, treat it as per the 'anything else' entry below.
        GREATER-THAN SIGN (>): If the current end tag token is an appropriate end tag token, then switch to the data state and emit the current tag token.
                Otherwise, treat it as per the 'anything else' entry below.
        */
        this.tags[0] = '';
        this.tags[1] = '';

        switch (symbol) {
            case stateMachine.Symbol.SPACE: /** Whitespaces */
                this.state = stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME;
                return ;
            case stateMachine.Symbol.SOLIDUS: /** [/] */
                this.state = stateMachine.State.STATE_SELF_CLOSING_START_TAG;
                return ;
            case stateMachine.Symbol.GREATER: /** [>] */
                this.state = stateMachine.State.STATE_DATA;
                return ; 
        }
};

FastParser.prototype.matchEscapedScriptTag = function (ch) {
    /* switch to the script data double escaped state if we see <script> inside <script><!-- */    
    if ( this.tags[1].toLowerCase() === 'script') {
        this.state = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPED;
    }
};

FastParser.prototype.processTagName = function (ch) {
    /* context transition when seeing <sometag> and switch to Script / Rawtext / RCdata / ... */
    switch (this.tags[0].toLowerCase()) {
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
    this.attrName = ch;
};

FastParser.prototype.appendAttributeNameTag = function (ch) {
    /* append to attribute name token */
    this.attrName += ch;
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
 * @function FastParser#contextualize
 */
FastParser.prototype.contextualize = function(input, endsWithEOF) {
    var self = this, listeners = self.listeners, i = -1, lastState;

    self.input = input;
    self.inputLen = input.length;

    while (++i < self.inputLen) {
        lastState = self.state;

        // TODO: endsWithEOF handling
        listeners.preWalk && this.emit(listeners.preWalk, [lastState, i, endsWithEOF]);

        // these functions are not supposed to alter the input
        self.beforeWalk(i, this.input);
        self.walk(i, this.input, endsWithEOF);
        self.afterWalk(i, this.input);

        // TODO: endsWithEOF handling
        listeners.postWalk && this.emit(listeners.postWalk, [lastState, self.state, i, endsWithEOF]);
    }
};

/**
 * @function FastParser#beforeWalk
 *
 * @param {integer} i - the location of the head pointer.
 * @param {string} input - the input stream
 *
 * @description
 * Interface function for subclass to implement logics before parsing the character.
 *
 */
FastParser.prototype.beforeWalk = function (i, input) {};

/**
 * @function FastParser#afterWalk
 *
 * @param {integer} i - the location of the head pointer.
 * @param {string} input - the input stream
 *
 * @description
 * Interface function for subclass to implement logics after parsing the character.
 *
 */
FastParser.prototype.afterWalk = function (i, input) {};

/**
 * @function FastParser#getStartTagName
 * @depreciated Replace it by getCurrentTagIndex and getCurrentTag
 *
 * @returns {string} The current handling start tag name
 *
 */
FastParser.prototype.getStartTagName = function() {
    return this.tags[0] !== undefined? this.tags[0].toLowerCase() : undefined;
};

/**
 * @function FastParser#getCurrentTagIndex
 *
 * @returns {integer} The current handling tag Idx
 *
 */
FastParser.prototype.getCurrentTagIndex = function() {
    return this.tagIdx;
};

/**
 * @function FastParser#getCurrentTag
 *
 * @params {integer} The tag Idx
 *
 * @returns {string} The current tag name indexed by tag Idx
 *
 */
FastParser.prototype.getCurrentTag = function(tagIdx) {
    return tagIdx === 0 || tagIdx === 1? (this.tags[tagIdx] !== undefined? this.tags[tagIdx].toLowerCase():undefined) : undefined;
};

/**
 * @function FastParser#getAttributeName
 *
 * @returns {string} The current handling attribute name.
 *
 * @description
 * Get the current handling attribute name of HTML tag.
 *
 */
FastParser.prototype.getAttributeName = function() {
    return this.attrName.toLowerCase();
};

/**
 * @function FastParser#getAttributeValue
 *
 * @returns {string} The current handling attribute name's value.
 *
 * @description
 * Get the current handling attribute name's value of HTML tag.
 *
 */
FastParser.prototype.getAttributeValue = function(htmlDecoded) {
    // TODO: html decode the attribute value
    return this.attributeValue;
};

/**
* @module Parser
*/
function Parser (config, listeners) {
    var self = this, k;

    // super constructor
    FastParser.call(self);


    // deep copy config to this.config
    self.config = {};
    if (config) {
        for (k in config) {
            self.config[k] = config[k];
        }
    }
    config = self.config;    

    // config defaulted to false
    config.enableInputPreProcessing = (config.enableInputPreProcessing === true);
    config.enableCanonicalization = (config.enableCanonicalization === true);
    config.enableVoidingIEConditionalComments = (config.enableVoidingIEConditionalComments === true);

    // config defaulted to true
    config.enableStateTracking = (config.enableStateTracking !== false);


    // deep copy the provided listeners, if any
    if (typeof listeners === 'object') {
        for (k in listeners) {
            self.listeners[k] = listeners[k].slice();
        }
        return;
    }

    // ### DO NOT CHANGE THE ORDER OF THE FOLLOWING COMPONENTS ###
    // run through the input stream with input pre-processing
    config.enableInputPreProcessing && this.on('preWalk', InputPreProcessing);
    // fix parse errors before they're encountered in walk()
    config.enableCanonicalization && this.on('preWalk', Canonicalize).on('reWalk', Canonicalize);
    // enable IE conditional comments
    config.enableVoidingIEConditionalComments && this.on('preWalk', DisableIEConditionalComments);
    // TODO: rewrite IE <comment> tags
    // TODO: When a start tag token is emitted with its self-closing flag set, if the flag is not acknowledged when it is processed by the tree construction stage, that is a parse error.
    // TODO: When an end tag token is emitted with attributes, that is a parse error.
    // TODO: When an end tag token is emitted with its self-closing flag set, that is a parse error.

    // for bookkeeping the processed inputs and states
    if (config.enableStateTracking) {
        this.states = [this.state];
        this.buffer = [];
        this.symbol = [];
        this.on('postWalk', function (lastState, state, i, endsWithEOF) {
            this.buffer.push(this.input[i]);
            this.states.push(state);
            this.symbol.push(this._getSymbol(i));
        }).on('reWalk', this.setCurrentState);
    }
}

// as in https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/prototype 
Parser.prototype = Object.create(FastParser.prototype);
Parser.prototype.constructor = Parser;

/**
* @function Parser._getSymbol
* @param {integer} i - the index of input stream
*
* @description
* Get the html symbol mapping for the character located in the given index of input stream
*/
Parser.prototype._getSymbol = function (i) {
    return i < this.inputLen ? this.lookupChar(this.input[i]) : -1;
};

/**
* @function Parser._getNextState
* @param {integer} state - the current state
* @param {integer} i - the index of input stream
* @returns {integer} the potential state about to transition into, given the current state and an index of input stream
*
* @description
* Get the potential html state about to transition into
*/
Parser.prototype._getNextState = function (state, i, endsWithEOF) {
    return i < this.inputLen ? stateMachine.lookupStateFromSymbol[this._getSymbol(i)][state] : -1;
};

/**
* @function Parser._convertString2Array
*
* @description
* Convert the immutable this.input to array type for Strict Context Parser processing (lazy conversion).
*
*/
Parser.prototype._convertString2Array = function () {
    if (typeof this.input === "string") this.input = this.input.split('');
};

/**
* @function Parser.fork
* @returns {object} a new parser with all internal states inherited
*
* @description
* create a new parser with all internal states inherited
*/
Parser.prototype.fork = function() {
    var parser = new this.constructor(this.config, this.listeners);

    parser.state = this.state;
    parser.tags = this.tags.slice();
    parser.tagIdx = this.tagIdx;
    parser.attrName = this.attrName;
    parser.attributeValue = this.attributeValue;

    if (this.config.enableStateTracking) {
        parser.buffer = this.buffer.slice();
        parser.states = this.states.slice();
        parser.symbol = this.symbol.slice();
    }
    return parser;
};

/**
 * @function Parser#contextualize
 * @param {string} input - the input stream
 *
 * @description
 * It is the same as the original contextualize() except that this method returns the internal input stream.
 */
Parser.prototype.contextualize = function (input, endsWithEOF) {
    FastParser.prototype.contextualize.call(this, input, endsWithEOF);
    return this.getModifiedInput();
};

/**
 * @function Parser#getModifiedInput
 *
 * @description
 * Get the modified input due to Strict Context Parser processing.
 *
 */
Parser.prototype.getModifiedInput = function() {
    // TODO: it is not defensive enough, should use Array.isArray, but need polyfill
    return (typeof this.input === "string")? this.input:this.input.join('');
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
    this.states.pop();
    this.states.push(this.state = state);
    return this;
};

/**
 * @function Parser#getCurrentState
 *
 * @returns {integer} The last state of the HTML5 Context Parser.
 *
 * @description
 * Get the last state of HTML5 Context Parser.
 *
 */
Parser.prototype.getCurrentState = function() {
    return this.state;
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
    return this.states.slice();
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
    this.states = [state];
    return this;
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
* The implementation of Strict Context Parser functions
* 
* - InputPreProcessing
* - ConvertBogusCommentToComment
* - PreCanonicalizeConvertBogusCommentEndTag
* - Canonicalize
* - DisableIEConditionalComments
*
*/

// Perform input stream preprocessing
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#preprocessing-the-input-stream
function InputPreProcessing (state, i) {
    var chr = this.input[i],
        nextChr = this.input[i+1];

    // equivalent to inputStr.replace(/\r\n?/g, '\n')
    if (chr === '\r') {
        // for lazy conversion
        this._convertString2Array();
        if (nextChr === '\n') {
            this.input.splice(i, 1);
            this.inputLen--;
        } else {
            this.input[i] = '\n';
        }
    }
    // the following are control characters or permanently undefined Unicode characters (noncharacters), resulting in parse errors
    // \uFFFD replacement is not required by the specification, we consider \uFFFD character as an inert character
    else if ((chr >= '\x01'   && chr <= '\x08') ||
             (chr >= '\x0E'   && chr <= '\x1F') ||
             (chr >= '\x7F'   && chr <= '\x9F') ||
             (chr >= '\uFDD0' && chr <= '\uFDEF') ||
             chr === '\x0B' || chr === '\uFFFE' || chr === '\uFFFF') {
        // for lazy conversion
        this._convertString2Array();
        this.input[i] = '\uFFFD';
    }
    // U+1FFFE, U+1FFFF, U+2FFFE, U+2FFFF, U+3FFFE, U+3FFFF,
    // U+4FFFE, U+4FFFF, U+5FFFE, U+5FFFF, U+6FFFE, U+6FFFF,
    // U+7FFFE, U+7FFFF, U+8FFFE, U+8FFFF, U+9FFFE, U+9FFFF,
    // U+AFFFE, U+AFFFF, U+BFFFE, U+BFFFF, U+CFFFE, U+CFFFF,
    // U+DFFFE, U+DFFFF, U+EFFFE, U+EFFFF, U+FFFFE, U+FFFFF,
    // U+10FFFE, and U+10FFFF
    else if ((nextChr === '\uDFFE' || nextChr === '\uDFFF') &&
             (  chr === '\uD83F' || chr === '\uD87F' || chr === '\uD8BF' || chr === '\uD8FF' ||
                chr === '\uD93F' || chr === '\uD97F' || chr === '\uD9BF' || chr === '\uD9FF' ||
                chr === '\uDA3F' || chr === '\uDA7F' || chr === '\uDABF' || chr === '\uDAFF' ||
                chr === '\uDB3F' || chr === '\uDB7F' || chr === '\uDBBF' || chr === '\uDBFF')) {
        // for lazy conversion
        this._convertString2Array();
        this.input[i] = this.input[i+1] = '\uFFFD';
    }
}

function ConvertBogusCommentToComment(i) {
    // for lazy conversion
    this._convertString2Array();

    // convert !--. i.e., from <* to <!--*
    this.input.splice(i, 0, '!', '-', '-');
    this.inputLen += 3;

    // convert the next > to -->
    this.on('preCanonicalize', PreCanonicalizeConvertBogusCommentEndTag);
}

function PreCanonicalizeConvertBogusCommentEndTag(state, i, endsWithEOF) {
    if (this.input[i] === '>') {
        // remove itself from the listener list
        this.off('preCanonicalize', PreCanonicalizeConvertBogusCommentEndTag);

        // for lazy conversion
        this._convertString2Array();

        // convert [>] to [-]->
        this.input.splice(i, 0, '-', '-');
        this.inputLen += 2;

        this.emit(this.listeners.bogusCommentCoverted, [state, i, endsWithEOF]);
    }
}

// those doctype states (52-67) are initially treated as bogus comment state, but they are further converted to comment state
// Canonicalize() will create no more bogus comment state except the fake (context-parser treats <!doctype as bogus) one hardcoded as <!doctype html> that has no NULL inside
var statesRequiringNullReplacement = [
//    0, 1, 2, 3, 4, 5, 6, 7, 8, 9
/*0*/ 0, 0, 0, 1, 0, 1, 1, 1, 0, 0,
/*1*/ 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
/*2*/ 0, 0, 1, 1, 1, 0, 0, 0, 0, 1,
/*3*/ 1, 1, 0, 0, 1, 1, 1, 1, 1, 1,
/*4*/ 1, 0, 0, 0, 1, 0, 1, 1, 1, 1,
/*5*/ 1, 1
];
// \uFFFD replacement is not required by the spec for DATA state
statesRequiringNullReplacement[htmlState.STATE_DATA] = 1;

function Canonicalize(state, i, endsWithEOF) {

    this.emit(this.listeners.preCanonicalize, [state, i, endsWithEOF]);

    var reCanonicalizeNeeded = true,
        chr = this.input[i], nextChr = this.input[i+1],
        potentialState = this._getNextState(state, i, endsWithEOF),
        nextPotentialState = this._getNextState(potentialState, i + 1, endsWithEOF);

    // console.log(i, state, potentialState, nextPotentialState, this.input.slice(i).join(''));

    // batch replacement of NULL with \uFFFD would violate the spec
    //  - for example, NULL is untouched in CDATA section state
    if (chr === '\x00' && statesRequiringNullReplacement[state]) {
        // for lazy conversion
        this._convertString2Array();
        this.input[i] = '\uFFFD';
    }
    // encode < into &lt; for [<]* (* is non-alpha) in STATE_DATA, [<]% and [<]! in STATE_RCDATA and STATE_RAWTEXT
    else if ((potentialState === htmlState.STATE_TAG_OPEN && nextPotentialState === htmlState.STATE_DATA) ||  // [<]*, where * is non-alpha
             ((state === htmlState.STATE_RCDATA || state === htmlState.STATE_RAWTEXT) &&                            // in STATE_RCDATA and STATE_RAWTEXT
            chr === '<' && (nextChr === '%' || nextChr === '!'))) {   // [<]% or [<]!
        // for lazy conversion
        this._convertString2Array();

        // [<]*, [<]%, [<]!
        this.input.splice(i, 1, '&', 'l', 't', ';');
        this.inputLen += 3;
    }
    // enforce <!doctype html>
    // + convert bogus comment or unknown doctype to the standard html comment
    else if (potentialState === htmlState.STATE_MARKUP_DECLARATION_OPEN) {            // <[!]***
        reCanonicalizeNeeded = false;

        // for lazy conversion
        this._convertString2Array();

        // context-parser treats the doctype and [CDATA[ as resulting into STATE_BOGUS_COMMENT
        // so, we need our algorithm here to extract and check the next 7 characters
        var commentKey = this.input.slice(i + 1, i + 8).join('');

        // enforce <!doctype html>
        if (commentKey.toLowerCase() === 'doctype') {               // <![d]octype
            // extract 6 chars immediately after <![d]octype and check if it's equal to ' html>'
            if (this.input.slice(i + 8, i + 14).join('').toLowerCase() !== ' html>') {

                // replace <[!]doctype xxxx> with <[!]--!doctype xxxx--><doctype html>
                ConvertBogusCommentToComment.call(this, i);

                this.once('bogusCommentCoverted', function (state, i) {
                    [].splice.apply(this.input, [i + 3, 0].concat('<!doctype html>'.split('')));
                    this.inputLen += 15;
                });

                reCanonicalizeNeeded = true;
            }
        }
        // do not touch <![CDATA[ and <[!]--
        else if (commentKey === '[CDATA[' ||
                    (nextChr === '-' && this.input[i+2] === '-')) {
            // noop
        }
        // ends up in bogus comment
        else {
            // replace <[!]*** with <[!]--***
            // will replace the next > to -->
            ConvertBogusCommentToComment.call(this, i);
            reCanonicalizeNeeded = true;
        }
    }
    // convert bogus comment to the standard html comment
    else if ((state === htmlState.STATE_TAG_OPEN &&
             potentialState === htmlState.STATE_BOGUS_COMMENT) ||           // <[?] only from STATE_TAG_OPEN
            (potentialState === htmlState.STATE_END_TAG_OPEN &&             // <[/]* or <[/]> from STATE_END_TAG_OPEN
             nextPotentialState !== htmlState.STATE_TAG_NAME &&
             nextPotentialState !== -1)) {                                  // TODO: double check if there're any other cases requiring -1 check
        // replace <? and </* respectively with <!--? and <!--/*
        // will replace the next > to -->
        ConvertBogusCommentToComment.call(this, i);
    }
    // remove the unnecessary SOLIDUS
    else if (potentialState === htmlState.STATE_SELF_CLOSING_START_TAG &&             // <***[/]*
            nextPotentialState === htmlState.STATE_BEFORE_ATTRIBUTE_NAME) {           // this.input[i+1] is ANYTHING_ELSE (i.e., not EOF nor >)
        // if ([htmlState.STATE_TAG_NAME,                                             // <a[/]* replaced with <a[ ]*
        //     /* following is unknown to CP
        //     htmlState.STATE_RCDATA_END_TAG_NAME,
        //     htmlState.STATE_RAWTEXT_END_TAG_NAME,
        //     htmlState.STATE_SCRIPT_DATA_END_TAG_NAME,
        //     htmlState.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME,
        //     */
        //     htmlState.STATE_BEFORE_ATTRIBUTE_NAME,                                 // <a [/]* replaced with <a [ ]*
        //     htmlState.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED].indexOf(state) !== -1)   // <a abc=""[/]* replaced with <a abc=""[ ]*
   
        // for lazy conversion
        this._convertString2Array();

        this.input[i] = ' ';

        // given this.input[i] was    '/', nextPotentialState was htmlState.STATE_BEFORE_ATTRIBUTE_NAME
        // given this.input[i] is now ' ', nextPotentialState becomes STATE_BEFORE_ATTRIBUTE_NAME if current state is STATE_ATTRIBUTE_NAME or STATE_AFTER_ATTRIBUTE_NAME
        // to preserve state, remove future EQUAL SIGNs (=)s to force STATE_AFTER_ATTRIBUTE_NAME behave as if it is STATE_BEFORE_ATTRIBUTE_NAME
        // this is okay since EQUAL SIGNs (=)s will be stripped anyway in the STATE_BEFORE_ATTRIBUTE_NAME cleanup handling
        if (state === htmlState.STATE_ATTRIBUTE_NAME ||                               // <a abc[/]=abc  replaced with <a abc[ ]*
                state === htmlState.STATE_AFTER_ATTRIBUTE_NAME) {                     // <a abc [/]=abc replaced with <a abc [ ]*
            for (var j = i + 1; j < this.inputLen && this.input[j] === '='; j++) {
                this.input.splice(j, 1);
                this.inputLen--;
            }
        }
    }
    // remove unnecessary equal signs, hence <input checked[=]> become <input checked[>], or <input checked [=]> become <input checked [>]
    else if (potentialState === htmlState.STATE_BEFORE_ATTRIBUTE_VALUE &&   // only from STATE_ATTRIBUTE_NAME or STATE_AFTER_ATTRIBUTE_NAME
            nextPotentialState === htmlState.STATE_DATA) {                  // <a abc[=]> or <a abc [=]>
        // for lazy conversion
        this._convertString2Array();

        this.input.splice(i, 1);
        this.inputLen--;
    }
    // insert a space for <a abc="***["]* or <a abc='***[']* after quoted attribute value (i.e., <a abc="***["] * or <a abc='***['] *)
    else if (potentialState === htmlState.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED &&        // <a abc=""[*] where * is not SPACE (\t,\n,\f,' ')
            nextPotentialState === htmlState.STATE_BEFORE_ATTRIBUTE_NAME &&
            this._getSymbol(i + 1) !== stateMachine.Symbol.SPACE) {
        // for lazy conversion
        this._convertString2Array();

        this.input.splice(i + 1, 0, ' ');
        this.inputLen++;
    }
    // else here means no special pattern was found requiring rewriting
    else {
        reCanonicalizeNeeded = false;
    }

    // remove " ' < = from being treated as part of attribute name (not as the spec recommends though)
    switch (potentialState) {
        case htmlState.STATE_BEFORE_ATTRIBUTE_NAME:     // remove ambigious symbols in <a [*]href where * is ", ', <, or =
            if (nextChr === "=") {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i + 1, 1);
                this.inputLen--;
                reCanonicalizeNeeded = true;
                break;
            }
            /* falls through */
        case htmlState.STATE_ATTRIBUTE_NAME:            // remove ambigious symbols in <a href[*] where * is ", ', or <
        case htmlState.STATE_AFTER_ATTRIBUTE_NAME:      // remove ambigious symbols in <a href [*] where * is ", ', or <
            if (nextChr === '"' || nextChr === "'" || nextChr === '<') {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i + 1, 1);
                this.inputLen--;
                reCanonicalizeNeeded = true;
            }
            break;
    }

    if (reCanonicalizeNeeded) {
        return Canonicalize.call(this, state, i, endsWithEOF);
    }

    switch (state) {
    // escape " ' < = ` to avoid raising parse errors for unquoted value
        case htmlState.STATE_ATTRIBUTE_VALUE_UNQUOTED:
            if (chr === '"') {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 1, '&', 'q', 'u', 'o', 't', ';');
                this.inputLen += 5;
                break;
            } else if (chr === "'") {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 1, '&', '#', '3', '9', ';');
                this.inputLen += 4;
                break;
            }
            /* falls through */
        case htmlState.STATE_BEFORE_ATTRIBUTE_VALUE:     // treat < = ` as if they are in STATE_ATTRIBUTE_VALUE_UNQUOTED
            if (chr === '<') {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 1, '&', 'l', 't', ';');
                this.inputLen += 3;
            } else if (chr === '=') {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 1, '&', '#', '6', '1', ';');
                this.inputLen += 4;
            } else if (chr === '`') {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 1, '&', '#', '9', '6', ';');
                this.inputLen += 4;
            }
            break;

    // add hyphens to complete <!----> to avoid raising parsing errors
        // replace <!--[>] with <!--[-]->
        case htmlState.STATE_COMMENT_START:
            if (chr === '>') {                          // <!--[>]
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 0, '-', '-');
                this.inputLen += 2;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            break;
        // replace <!---[>] with <!---[-]>
        case htmlState.STATE_COMMENT_START_DASH:
            if (chr === '>') {                          // <!---[>]
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 0, '-');
                this.inputLen++;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            break;
    // replace --[!]> with --[>]
        case htmlState.STATE_COMMENT_END:
            if (chr === '!' && nextChr === '>') {
                // for lazy conversion
                this._convertString2Array();

                this.input.splice(i, 1);
                this.inputLen--;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            // if (chr === '-'), ignored this parse error. TODO: consider stripping n-2 hyphens for ------>
            break;
    }

    if (reCanonicalizeNeeded) {
        return Canonicalize.call(this, state, i, endsWithEOF);
    }
}

// remove IE conditional comments
function DisableIEConditionalComments(state, i){
    if (state === htmlState.STATE_COMMENT && this.input[i] === ']' && this.input[i+1] === '>') {
        // for lazy conversion
        this._convertString2Array();

        this.input.splice(i + 1, 0, ' ');
        this.inputLen++;
    }
}

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

},{}],4:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":5}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
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

},{}],6:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _runtime = require('./handlebars.runtime');

var _runtime2 = _interopRequireWildcard(_runtime);

// Compiler imports

var _AST = require('./handlebars/compiler/ast');

var _AST2 = _interopRequireWildcard(_AST);

var _Parser$parse = require('./handlebars/compiler/base');

var _Compiler$compile$precompile = require('./handlebars/compiler/compiler');

var _JavaScriptCompiler = require('./handlebars/compiler/javascript-compiler');

var _JavaScriptCompiler2 = _interopRequireWildcard(_JavaScriptCompiler);

var _Visitor = require('./handlebars/compiler/visitor');

var _Visitor2 = _interopRequireWildcard(_Visitor);

var _noConflict = require('./handlebars/no-conflict');

var _noConflict2 = _interopRequireWildcard(_noConflict);

var _create = _runtime2['default'].create;
function create() {
  var hb = _create();

  hb.compile = function (input, options) {
    return _Compiler$compile$precompile.compile(input, options, hb);
  };
  hb.precompile = function (input, options) {
    return _Compiler$compile$precompile.precompile(input, options, hb);
  };

  hb.AST = _AST2['default'];
  hb.Compiler = _Compiler$compile$precompile.Compiler;
  hb.JavaScriptCompiler = _JavaScriptCompiler2['default'];
  hb.Parser = _Parser$parse.parser;
  hb.parse = _Parser$parse.parse;

  return hb;
}

var inst = create();
inst.create = create;

_noConflict2['default'](inst);

inst.Visitor = _Visitor2['default'];

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];
},{"./handlebars.runtime":7,"./handlebars/compiler/ast":9,"./handlebars/compiler/base":10,"./handlebars/compiler/compiler":12,"./handlebars/compiler/javascript-compiler":14,"./handlebars/compiler/visitor":17,"./handlebars/no-conflict":20}],7:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _import = require('./handlebars/base');

var base = _interopRequireWildcard(_import);

// Each of these augment the Handlebars object. No need to setup here.
// (This is done to easily share code between commonjs and browse envs)

var _SafeString = require('./handlebars/safe-string');

var _SafeString2 = _interopRequireWildcard(_SafeString);

var _Exception = require('./handlebars/exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _import2 = require('./handlebars/utils');

var Utils = _interopRequireWildcard(_import2);

var _import3 = require('./handlebars/runtime');

var runtime = _interopRequireWildcard(_import3);

var _noConflict = require('./handlebars/no-conflict');

var _noConflict2 = _interopRequireWildcard(_noConflict);

// For compatibility and usage outside of module systems, make the Handlebars object a namespace
function create() {
  var hb = new base.HandlebarsEnvironment();

  Utils.extend(hb, base);
  hb.SafeString = _SafeString2['default'];
  hb.Exception = _Exception2['default'];
  hb.Utils = Utils;
  hb.escapeExpression = Utils.escapeExpression;

  hb.VM = runtime;
  hb.template = function (spec) {
    return runtime.template(spec, hb);
  };

  return hb;
}

var inst = create();
inst.create = create;

_noConflict2['default'](inst);

inst['default'] = inst;

exports['default'] = inst;
module.exports = exports['default'];
},{"./handlebars/base":8,"./handlebars/exception":19,"./handlebars/no-conflict":20,"./handlebars/runtime":21,"./handlebars/safe-string":22,"./handlebars/utils":23}],8:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.HandlebarsEnvironment = HandlebarsEnvironment;
exports.createFrame = createFrame;

var _import = require('./utils');

var Utils = _interopRequireWildcard(_import);

var _Exception = require('./exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var VERSION = '3.0.1';
exports.VERSION = VERSION;
var COMPILER_REVISION = 6;

exports.COMPILER_REVISION = COMPILER_REVISION;
var REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '== 1.x.x',
  5: '== 2.0.0-alpha.x',
  6: '>= 2.0.0-beta.1'
};

exports.REVISION_CHANGES = REVISION_CHANGES;
var isArray = Utils.isArray,
    isFunction = Utils.isFunction,
    toString = Utils.toString,
    objectType = '[object Object]';

function HandlebarsEnvironment(helpers, partials) {
  this.helpers = helpers || {};
  this.partials = partials || {};

  registerDefaultHelpers(this);
}

HandlebarsEnvironment.prototype = {
  constructor: HandlebarsEnvironment,

  logger: logger,
  log: log,

  registerHelper: function registerHelper(name, fn) {
    if (toString.call(name) === objectType) {
      if (fn) {
        throw new _Exception2['default']('Arg not supported with multiple helpers');
      }
      Utils.extend(this.helpers, name);
    } else {
      this.helpers[name] = fn;
    }
  },
  unregisterHelper: function unregisterHelper(name) {
    delete this.helpers[name];
  },

  registerPartial: function registerPartial(name, partial) {
    if (toString.call(name) === objectType) {
      Utils.extend(this.partials, name);
    } else {
      if (typeof partial === 'undefined') {
        throw new _Exception2['default']('Attempting to register a partial as undefined');
      }
      this.partials[name] = partial;
    }
  },
  unregisterPartial: function unregisterPartial(name) {
    delete this.partials[name];
  }
};

function registerDefaultHelpers(instance) {
  instance.registerHelper('helperMissing', function () {
    if (arguments.length === 1) {
      // A missing field in a {{foo}} constuct.
      return undefined;
    } else {
      // Someone is actually trying to call something, blow up.
      throw new _Exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
    }
  });

  instance.registerHelper('blockHelperMissing', function (context, options) {
    var inverse = options.inverse,
        fn = options.fn;

    if (context === true) {
      return fn(this);
    } else if (context === false || context == null) {
      return inverse(this);
    } else if (isArray(context)) {
      if (context.length > 0) {
        if (options.ids) {
          options.ids = [options.name];
        }

        return instance.helpers.each(context, options);
      } else {
        return inverse(this);
      }
    } else {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
        options = { data: data };
      }

      return fn(context, options);
    }
  });

  instance.registerHelper('each', function (context, options) {
    if (!options) {
      throw new _Exception2['default']('Must pass iterator to #each');
    }

    var fn = options.fn,
        inverse = options.inverse,
        i = 0,
        ret = '',
        data = undefined,
        contextPath = undefined;

    if (options.data && options.ids) {
      contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
    }

    if (isFunction(context)) {
      context = context.call(this);
    }

    if (options.data) {
      data = createFrame(options.data);
    }

    function execIteration(field, index, last) {
      if (data) {
        data.key = field;
        data.index = index;
        data.first = index === 0;
        data.last = !!last;

        if (contextPath) {
          data.contextPath = contextPath + field;
        }
      }

      ret = ret + fn(context[field], {
        data: data,
        blockParams: Utils.blockParams([context[field], field], [contextPath + field, null])
      });
    }

    if (context && typeof context === 'object') {
      if (isArray(context)) {
        for (var j = context.length; i < j; i++) {
          execIteration(i, i, i === context.length - 1);
        }
      } else {
        var priorKey = undefined;

        for (var key in context) {
          if (context.hasOwnProperty(key)) {
            // We're running the iterations one step out of sync so we can detect
            // the last iteration without have to scan the object twice and create
            // an itermediate keys array.
            if (priorKey) {
              execIteration(priorKey, i - 1);
            }
            priorKey = key;
            i++;
          }
        }
        if (priorKey) {
          execIteration(priorKey, i - 1, true);
        }
      }
    }

    if (i === 0) {
      ret = inverse(this);
    }

    return ret;
  });

  instance.registerHelper('if', function (conditional, options) {
    if (isFunction(conditional)) {
      conditional = conditional.call(this);
    }

    // Default behavior is to render the positive path if the value is truthy and not empty.
    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
    if (!options.hash.includeZero && !conditional || Utils.isEmpty(conditional)) {
      return options.inverse(this);
    } else {
      return options.fn(this);
    }
  });

  instance.registerHelper('unless', function (conditional, options) {
    return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
  });

  instance.registerHelper('with', function (context, options) {
    if (isFunction(context)) {
      context = context.call(this);
    }

    var fn = options.fn;

    if (!Utils.isEmpty(context)) {
      if (options.data && options.ids) {
        var data = createFrame(options.data);
        data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
        options = { data: data };
      }

      return fn(context, options);
    } else {
      return options.inverse(this);
    }
  });

  instance.registerHelper('log', function (message, options) {
    var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
    instance.log(level, message);
  });

  instance.registerHelper('lookup', function (obj, field) {
    return obj && obj[field];
  });
}

var logger = {
  methodMap: { 0: 'debug', 1: 'info', 2: 'warn', 3: 'error' },

  // State enum
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  level: 1,

  // Can be overridden in the host environment
  log: function log(level, message) {
    if (typeof console !== 'undefined' && logger.level <= level) {
      var method = logger.methodMap[level];
      (console[method] || console.log).call(console, message); // eslint-disable-line no-console
    }
  }
};

exports.logger = logger;
var log = logger.log;

exports.log = log;

function createFrame(object) {
  var frame = Utils.extend({}, object);
  frame._parent = object;
  return frame;
}

/* [args, ]options */
},{"./exception":19,"./utils":23}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var AST = {
  Program: function Program(statements, blockParams, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'Program';
    this.body = statements;

    this.blockParams = blockParams;
    this.strip = strip;
  },

  MustacheStatement: function MustacheStatement(path, params, hash, escaped, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'MustacheStatement';

    this.path = path;
    this.params = params || [];
    this.hash = hash;
    this.escaped = escaped;

    this.strip = strip;
  },

  BlockStatement: function BlockStatement(path, params, hash, program, inverse, openStrip, inverseStrip, closeStrip, locInfo) {
    this.loc = locInfo;
    this.type = 'BlockStatement';

    this.path = path;
    this.params = params || [];
    this.hash = hash;
    this.program = program;
    this.inverse = inverse;

    this.openStrip = openStrip;
    this.inverseStrip = inverseStrip;
    this.closeStrip = closeStrip;
  },

  PartialStatement: function PartialStatement(name, params, hash, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'PartialStatement';

    this.name = name;
    this.params = params || [];
    this.hash = hash;

    this.indent = '';
    this.strip = strip;
  },

  ContentStatement: function ContentStatement(string, locInfo) {
    this.loc = locInfo;
    this.type = 'ContentStatement';
    this.original = this.value = string;
  },

  CommentStatement: function CommentStatement(comment, strip, locInfo) {
    this.loc = locInfo;
    this.type = 'CommentStatement';
    this.value = comment;

    this.strip = strip;
  },

  SubExpression: function SubExpression(path, params, hash, locInfo) {
    this.loc = locInfo;

    this.type = 'SubExpression';
    this.path = path;
    this.params = params || [];
    this.hash = hash;
  },

  PathExpression: function PathExpression(data, depth, parts, original, locInfo) {
    this.loc = locInfo;
    this.type = 'PathExpression';

    this.data = data;
    this.original = original;
    this.parts = parts;
    this.depth = depth;
  },

  StringLiteral: function StringLiteral(string, locInfo) {
    this.loc = locInfo;
    this.type = 'StringLiteral';
    this.original = this.value = string;
  },

  NumberLiteral: function NumberLiteral(number, locInfo) {
    this.loc = locInfo;
    this.type = 'NumberLiteral';
    this.original = this.value = Number(number);
  },

  BooleanLiteral: function BooleanLiteral(bool, locInfo) {
    this.loc = locInfo;
    this.type = 'BooleanLiteral';
    this.original = this.value = bool === 'true';
  },

  UndefinedLiteral: function UndefinedLiteral(locInfo) {
    this.loc = locInfo;
    this.type = 'UndefinedLiteral';
    this.original = this.value = undefined;
  },

  NullLiteral: function NullLiteral(locInfo) {
    this.loc = locInfo;
    this.type = 'NullLiteral';
    this.original = this.value = null;
  },

  Hash: function Hash(pairs, locInfo) {
    this.loc = locInfo;
    this.type = 'Hash';
    this.pairs = pairs;
  },
  HashPair: function HashPair(key, value, locInfo) {
    this.loc = locInfo;
    this.type = 'HashPair';
    this.key = key;
    this.value = value;
  },

  // Public API used to evaluate derived attributes regarding AST nodes
  helpers: {
    // a mustache is definitely a helper if:
    // * it is an eligible helper, and
    // * it has at least one parameter or hash segment
    helperExpression: function helperExpression(node) {
      return !!(node.type === 'SubExpression' || node.params.length || node.hash);
    },

    scopedId: function scopedId(path) {
      return /^\.|this\b/.test(path.original);
    },

    // an ID is simple if it only has one part, and that part is not
    // `..` or `this`.
    simpleId: function simpleId(path) {
      return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
    }
  }
};

// Must be exported as an object rather than the root of the module as the jison lexer
// must modify the object to operate properly.
exports['default'] = AST;
module.exports = exports['default'];
},{}],10:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.parse = parse;

var _parser = require('./parser');

var _parser2 = _interopRequireWildcard(_parser);

var _AST = require('./ast');

var _AST2 = _interopRequireWildcard(_AST);

var _WhitespaceControl = require('./whitespace-control');

var _WhitespaceControl2 = _interopRequireWildcard(_WhitespaceControl);

var _import = require('./helpers');

var Helpers = _interopRequireWildcard(_import);

var _extend = require('../utils');

exports.parser = _parser2['default'];

var yy = {};
_extend.extend(yy, Helpers, _AST2['default']);

function parse(input, options) {
  // Just return if an already-compiled AST was passed in.
  if (input.type === 'Program') {
    return input;
  }

  _parser2['default'].yy = yy;

  // Altering the shared object here, but this is ok as parser is a sync operation
  yy.locInfo = function (locInfo) {
    return new yy.SourceLocation(options && options.srcName, locInfo);
  };

  var strip = new _WhitespaceControl2['default']();
  return strip.accept(_parser2['default'].parse(input));
}
},{"../utils":23,"./ast":9,"./helpers":13,"./parser":15,"./whitespace-control":18}],11:[function(require,module,exports){
'use strict';

exports.__esModule = true;
/*global define */

var _isArray = require('../utils');

var SourceNode = undefined;

try {
  /* istanbul ignore next */
  if (typeof define !== 'function' || !define.amd) {
    // We don't support this in AMD environments. For these environments, we asusme that
    // they are running on the browser and thus have no need for the source-map library.
    var SourceMap = require('source-map');
    SourceNode = SourceMap.SourceNode;
  }
} catch (err) {}

/* istanbul ignore if: tested but not covered in istanbul due to dist build  */
if (!SourceNode) {
  SourceNode = function (line, column, srcFile, chunks) {
    this.src = '';
    if (chunks) {
      this.add(chunks);
    }
  };
  /* istanbul ignore next */
  SourceNode.prototype = {
    add: function add(chunks) {
      if (_isArray.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src += chunks;
    },
    prepend: function prepend(chunks) {
      if (_isArray.isArray(chunks)) {
        chunks = chunks.join('');
      }
      this.src = chunks + this.src;
    },
    toStringWithSourceMap: function toStringWithSourceMap() {
      return { code: this.toString() };
    },
    toString: function toString() {
      return this.src;
    }
  };
}

function castChunk(chunk, codeGen, loc) {
  if (_isArray.isArray(chunk)) {
    var ret = [];

    for (var i = 0, len = chunk.length; i < len; i++) {
      ret.push(codeGen.wrap(chunk[i], loc));
    }
    return ret;
  } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
    // Handle primitives that the SourceNode will throw up on
    return chunk + '';
  }
  return chunk;
}

function CodeGen(srcFile) {
  this.srcFile = srcFile;
  this.source = [];
}

CodeGen.prototype = {
  prepend: function prepend(source, loc) {
    this.source.unshift(this.wrap(source, loc));
  },
  push: function push(source, loc) {
    this.source.push(this.wrap(source, loc));
  },

  merge: function merge() {
    var source = this.empty();
    this.each(function (line) {
      source.add(['  ', line, '\n']);
    });
    return source;
  },

  each: function each(iter) {
    for (var i = 0, len = this.source.length; i < len; i++) {
      iter(this.source[i]);
    }
  },

  empty: function empty() {
    var loc = arguments[0] === undefined ? this.currentLocation || { start: {} } : arguments[0];

    return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
  },
  wrap: function wrap(chunk) {
    var loc = arguments[1] === undefined ? this.currentLocation || { start: {} } : arguments[1];

    if (chunk instanceof SourceNode) {
      return chunk;
    }

    chunk = castChunk(chunk, this, loc);

    return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
  },

  functionCall: function functionCall(fn, type, params) {
    params = this.generateList(params);
    return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
  },

  quotedString: function quotedString(str) {
    return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028') // Per Ecma-262 7.3 + 7.8.4
    .replace(/\u2029/g, '\\u2029') + '"';
  },

  objectLiteral: function objectLiteral(obj) {
    var pairs = [];

    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var value = castChunk(obj[key], this);
        if (value !== 'undefined') {
          pairs.push([this.quotedString(key), ':', value]);
        }
      }
    }

    var ret = this.generateList(pairs);
    ret.prepend('{');
    ret.add('}');
    return ret;
  },

  generateList: function generateList(entries, loc) {
    var ret = this.empty(loc);

    for (var i = 0, len = entries.length; i < len; i++) {
      if (i) {
        ret.add(',');
      }

      ret.add(castChunk(entries[i], this, loc));
    }

    return ret;
  },

  generateArray: function generateArray(entries, loc) {
    var ret = this.generateList(entries, loc);
    ret.prepend('[');
    ret.add(']');

    return ret;
  }
};

exports['default'] = CodeGen;
module.exports = exports['default'];

/* NOP */
},{"../utils":23,"source-map":25}],12:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.Compiler = Compiler;
exports.precompile = precompile;
exports.compile = compile;

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _isArray$indexOf = require('../utils');

var _AST = require('./ast');

var _AST2 = _interopRequireWildcard(_AST);

var slice = [].slice;

function Compiler() {}

// the foundHelper register will disambiguate helper lookup from finding a
// function in a context. This is necessary for mustache compatibility, which
// requires that context functions in blocks are evaluated by blockHelperMissing,
// and then proceed as if the resulting value was provided to blockHelperMissing.

Compiler.prototype = {
  compiler: Compiler,

  equals: function equals(other) {
    var len = this.opcodes.length;
    if (other.opcodes.length !== len) {
      return false;
    }

    for (var i = 0; i < len; i++) {
      var opcode = this.opcodes[i],
          otherOpcode = other.opcodes[i];
      if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
        return false;
      }
    }

    // We know that length is the same between the two arrays because they are directly tied
    // to the opcode behavior above.
    len = this.children.length;
    for (var i = 0; i < len; i++) {
      if (!this.children[i].equals(other.children[i])) {
        return false;
      }
    }

    return true;
  },

  guid: 0,

  compile: function compile(program, options) {
    this.sourceNode = [];
    this.opcodes = [];
    this.children = [];
    this.options = options;
    this.stringParams = options.stringParams;
    this.trackIds = options.trackIds;

    options.blockParams = options.blockParams || [];

    // These changes will propagate to the other compiler components
    var knownHelpers = options.knownHelpers;
    options.knownHelpers = {
      helperMissing: true,
      blockHelperMissing: true,
      each: true,
      'if': true,
      unless: true,
      'with': true,
      log: true,
      lookup: true
    };
    if (knownHelpers) {
      for (var _name in knownHelpers) {
        if (_name in knownHelpers) {
          options.knownHelpers[_name] = knownHelpers[_name];
        }
      }
    }

    return this.accept(program);
  },

  compileProgram: function compileProgram(program) {
    var childCompiler = new this.compiler(),
        // eslint-disable-line new-cap
    result = childCompiler.compile(program, this.options),
        guid = this.guid++;

    this.usePartial = this.usePartial || result.usePartial;

    this.children[guid] = result;
    this.useDepths = this.useDepths || result.useDepths;

    return guid;
  },

  accept: function accept(node) {
    this.sourceNode.unshift(node);
    var ret = this[node.type](node);
    this.sourceNode.shift();
    return ret;
  },

  Program: function Program(program) {
    this.options.blockParams.unshift(program.blockParams);

    var body = program.body,
        bodyLength = body.length;
    for (var i = 0; i < bodyLength; i++) {
      this.accept(body[i]);
    }

    this.options.blockParams.shift();

    this.isSimple = bodyLength === 1;
    this.blockParams = program.blockParams ? program.blockParams.length : 0;

    return this;
  },

  BlockStatement: function BlockStatement(block) {
    transformLiteralToPath(block);

    var program = block.program,
        inverse = block.inverse;

    program = program && this.compileProgram(program);
    inverse = inverse && this.compileProgram(inverse);

    var type = this.classifySexpr(block);

    if (type === 'helper') {
      this.helperSexpr(block, program, inverse);
    } else if (type === 'simple') {
      this.simpleSexpr(block);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('blockValue', block.path.original);
    } else {
      this.ambiguousSexpr(block, program, inverse);

      // now that the simple mustache is resolved, we need to
      // evaluate it by executing `blockHelperMissing`
      this.opcode('pushProgram', program);
      this.opcode('pushProgram', inverse);
      this.opcode('emptyHash');
      this.opcode('ambiguousBlockValue');
    }

    this.opcode('append');
  },

  PartialStatement: function PartialStatement(partial) {
    this.usePartial = true;

    var params = partial.params;
    if (params.length > 1) {
      throw new _Exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
    } else if (!params.length) {
      params.push({ type: 'PathExpression', parts: [], depth: 0 });
    }

    var partialName = partial.name.original,
        isDynamic = partial.name.type === 'SubExpression';
    if (isDynamic) {
      this.accept(partial.name);
    }

    this.setupFullMustacheParams(partial, undefined, undefined, true);

    var indent = partial.indent || '';
    if (this.options.preventIndent && indent) {
      this.opcode('appendContent', indent);
      indent = '';
    }

    this.opcode('invokePartial', isDynamic, partialName, indent);
    this.opcode('append');
  },

  MustacheStatement: function MustacheStatement(mustache) {
    this.SubExpression(mustache); // eslint-disable-line new-cap

    if (mustache.escaped && !this.options.noEscape) {
      this.opcode('appendEscaped');
    } else {
      this.opcode('append');
    }
  },

  ContentStatement: function ContentStatement(content) {
    if (content.value) {
      this.opcode('appendContent', content.value);
    }
  },

  CommentStatement: function CommentStatement() {},

  SubExpression: function SubExpression(sexpr) {
    transformLiteralToPath(sexpr);
    var type = this.classifySexpr(sexpr);

    if (type === 'simple') {
      this.simpleSexpr(sexpr);
    } else if (type === 'helper') {
      this.helperSexpr(sexpr);
    } else {
      this.ambiguousSexpr(sexpr);
    }
  },
  ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
    var path = sexpr.path,
        name = path.parts[0],
        isBlock = program != null || inverse != null;

    this.opcode('getContext', path.depth);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    this.accept(path);

    this.opcode('invokeAmbiguous', name, isBlock);
  },

  simpleSexpr: function simpleSexpr(sexpr) {
    this.accept(sexpr.path);
    this.opcode('resolvePossibleLambda');
  },

  helperSexpr: function helperSexpr(sexpr, program, inverse) {
    var params = this.setupFullMustacheParams(sexpr, program, inverse),
        path = sexpr.path,
        name = path.parts[0];

    if (this.options.knownHelpers[name]) {
      this.opcode('invokeKnownHelper', params.length, name);
    } else if (this.options.knownHelpersOnly) {
      throw new _Exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
    } else {
      path.falsy = true;

      this.accept(path);
      this.opcode('invokeHelper', params.length, path.original, _AST2['default'].helpers.simpleId(path));
    }
  },

  PathExpression: function PathExpression(path) {
    this.addDepth(path.depth);
    this.opcode('getContext', path.depth);

    var name = path.parts[0],
        scoped = _AST2['default'].helpers.scopedId(path),
        blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

    if (blockParamId) {
      this.opcode('lookupBlockParam', blockParamId, path.parts);
    } else if (!name) {
      // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
      this.opcode('pushContext');
    } else if (path.data) {
      this.options.data = true;
      this.opcode('lookupData', path.depth, path.parts);
    } else {
      this.opcode('lookupOnContext', path.parts, path.falsy, scoped);
    }
  },

  StringLiteral: function StringLiteral(string) {
    this.opcode('pushString', string.value);
  },

  NumberLiteral: function NumberLiteral(number) {
    this.opcode('pushLiteral', number.value);
  },

  BooleanLiteral: function BooleanLiteral(bool) {
    this.opcode('pushLiteral', bool.value);
  },

  UndefinedLiteral: function UndefinedLiteral() {
    this.opcode('pushLiteral', 'undefined');
  },

  NullLiteral: function NullLiteral() {
    this.opcode('pushLiteral', 'null');
  },

  Hash: function Hash(hash) {
    var pairs = hash.pairs,
        i = 0,
        l = pairs.length;

    this.opcode('pushHash');

    for (; i < l; i++) {
      this.pushParam(pairs[i].value);
    }
    while (i--) {
      this.opcode('assignToHash', pairs[i].key);
    }
    this.opcode('popHash');
  },

  // HELPERS
  opcode: function opcode(name) {
    this.opcodes.push({ opcode: name, args: slice.call(arguments, 1), loc: this.sourceNode[0].loc });
  },

  addDepth: function addDepth(depth) {
    if (!depth) {
      return;
    }

    this.useDepths = true;
  },

  classifySexpr: function classifySexpr(sexpr) {
    var isSimple = _AST2['default'].helpers.simpleId(sexpr.path);

    var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

    // a mustache is an eligible helper if:
    // * its id is simple (a single part, not `this` or `..`)
    var isHelper = !isBlockParam && _AST2['default'].helpers.helperExpression(sexpr);

    // if a mustache is an eligible helper but not a definite
    // helper, it is ambiguous, and will be resolved in a later
    // pass or at runtime.
    var isEligible = !isBlockParam && (isHelper || isSimple);

    // if ambiguous, we can possibly resolve the ambiguity now
    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
    if (isEligible && !isHelper) {
      var _name2 = sexpr.path.parts[0],
          options = this.options;

      if (options.knownHelpers[_name2]) {
        isHelper = true;
      } else if (options.knownHelpersOnly) {
        isEligible = false;
      }
    }

    if (isHelper) {
      return 'helper';
    } else if (isEligible) {
      return 'ambiguous';
    } else {
      return 'simple';
    }
  },

  pushParams: function pushParams(params) {
    for (var i = 0, l = params.length; i < l; i++) {
      this.pushParam(params[i]);
    }
  },

  pushParam: function pushParam(val) {
    var value = val.value != null ? val.value : val.original || '';

    if (this.stringParams) {
      if (value.replace) {
        value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
      }

      if (val.depth) {
        this.addDepth(val.depth);
      }
      this.opcode('getContext', val.depth || 0);
      this.opcode('pushStringParam', value, val.type);

      if (val.type === 'SubExpression') {
        // SubExpressions get evaluated and passed in
        // in string params mode.
        this.accept(val);
      }
    } else {
      if (this.trackIds) {
        var blockParamIndex = undefined;
        if (val.parts && !_AST2['default'].helpers.scopedId(val) && !val.depth) {
          blockParamIndex = this.blockParamIndex(val.parts[0]);
        }
        if (blockParamIndex) {
          var blockParamChild = val.parts.slice(1).join('.');
          this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
        } else {
          value = val.original || value;
          if (value.replace) {
            value = value.replace(/^\.\//g, '').replace(/^\.$/g, '');
          }

          this.opcode('pushId', val.type, value);
        }
      }
      this.accept(val);
    }
  },

  setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
    var params = sexpr.params;
    this.pushParams(params);

    this.opcode('pushProgram', program);
    this.opcode('pushProgram', inverse);

    if (sexpr.hash) {
      this.accept(sexpr.hash);
    } else {
      this.opcode('emptyHash', omitEmpty);
    }

    return params;
  },

  blockParamIndex: function blockParamIndex(name) {
    for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
      var blockParams = this.options.blockParams[depth],
          param = blockParams && _isArray$indexOf.indexOf(blockParams, name);
      if (blockParams && param >= 0) {
        return [depth, param];
      }
    }
  }
};

function precompile(input, options, env) {
  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
  }

  options = options || {};
  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var ast = env.parse(input, options),
      environment = new env.Compiler().compile(ast, options);
  return new env.JavaScriptCompiler().compile(environment, options);
}

function compile(input, _x, env) {
  var options = arguments[1] === undefined ? {} : arguments[1];

  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
    throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
  }

  if (!('data' in options)) {
    options.data = true;
  }
  if (options.compat) {
    options.useDepths = true;
  }

  var compiled = undefined;

  function compileInput() {
    var ast = env.parse(input, options),
        environment = new env.Compiler().compile(ast, options),
        templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
    return env.template(templateSpec);
  }

  // Template is only compiled on first use and cached after that point.
  function ret(context, execOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled.call(this, context, execOptions);
  }
  ret._setup = function (setupOptions) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._setup(setupOptions);
  };
  ret._child = function (i, data, blockParams, depths) {
    if (!compiled) {
      compiled = compileInput();
    }
    return compiled._child(i, data, blockParams, depths);
  };
  return ret;
}

function argEquals(a, b) {
  if (a === b) {
    return true;
  }

  if (_isArray$indexOf.isArray(a) && _isArray$indexOf.isArray(b) && a.length === b.length) {
    for (var i = 0; i < a.length; i++) {
      if (!argEquals(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
}

function transformLiteralToPath(sexpr) {
  if (!sexpr.path.parts) {
    var literal = sexpr.path;
    // Casting to string here to make false and 0 literal values play nicely with the rest
    // of the system.
    sexpr.path = new _AST2['default'].PathExpression(false, 0, [literal.original + ''], literal.original + '', literal.loc);
  }
}
},{"../exception":19,"../utils":23,"./ast":9}],13:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.SourceLocation = SourceLocation;
exports.id = id;
exports.stripFlags = stripFlags;
exports.stripComment = stripComment;
exports.preparePath = preparePath;
exports.prepareMustache = prepareMustache;
exports.prepareRawBlock = prepareRawBlock;
exports.prepareBlock = prepareBlock;

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

function SourceLocation(source, locInfo) {
  this.source = source;
  this.start = {
    line: locInfo.first_line,
    column: locInfo.first_column
  };
  this.end = {
    line: locInfo.last_line,
    column: locInfo.last_column
  };
}

function id(token) {
  if (/^\[.*\]$/.test(token)) {
    return token.substr(1, token.length - 2);
  } else {
    return token;
  }
}

function stripFlags(open, close) {
  return {
    open: open.charAt(2) === '~',
    close: close.charAt(close.length - 3) === '~'
  };
}

function stripComment(comment) {
  return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
}

function preparePath(data, parts, locInfo) {
  locInfo = this.locInfo(locInfo);

  var original = data ? '@' : '',
      dig = [],
      depth = 0,
      depthString = '';

  for (var i = 0, l = parts.length; i < l; i++) {
    var part = parts[i].part,

    // If we have [] syntax then we do not treat path references as operators,
    // i.e. foo.[this] resolves to approximately context.foo['this']
    isLiteral = parts[i].original !== part;
    original += (parts[i].separator || '') + part;

    if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
      if (dig.length > 0) {
        throw new _Exception2['default']('Invalid path: ' + original, { loc: locInfo });
      } else if (part === '..') {
        depth++;
        depthString += '../';
      }
    } else {
      dig.push(part);
    }
  }

  return new this.PathExpression(data, depth, dig, original, locInfo);
}

function prepareMustache(path, params, hash, open, strip, locInfo) {
  // Must use charAt to support IE pre-10
  var escapeFlag = open.charAt(3) || open.charAt(2),
      escaped = escapeFlag !== '{' && escapeFlag !== '&';

  return new this.MustacheStatement(path, params, hash, escaped, strip, this.locInfo(locInfo));
}

function prepareRawBlock(openRawBlock, content, close, locInfo) {
  if (openRawBlock.path.original !== close) {
    var errorNode = { loc: openRawBlock.path.loc };

    throw new _Exception2['default'](openRawBlock.path.original + ' doesn\'t match ' + close, errorNode);
  }

  locInfo = this.locInfo(locInfo);
  var program = new this.Program([content], null, {}, locInfo);

  return new this.BlockStatement(openRawBlock.path, openRawBlock.params, openRawBlock.hash, program, undefined, {}, {}, {}, locInfo);
}

function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
  // When we are chaining inverse calls, we will not have a close path
  if (close && close.path && openBlock.path.original !== close.path.original) {
    var errorNode = { loc: openBlock.path.loc };

    throw new _Exception2['default'](openBlock.path.original + ' doesn\'t match ' + close.path.original, errorNode);
  }

  program.blockParams = openBlock.blockParams;

  var inverse = undefined,
      inverseStrip = undefined;

  if (inverseAndProgram) {
    if (inverseAndProgram.chain) {
      inverseAndProgram.program.body[0].closeStrip = close.strip;
    }

    inverseStrip = inverseAndProgram.strip;
    inverse = inverseAndProgram.program;
  }

  if (inverted) {
    inverted = inverse;
    inverse = program;
    program = inverted;
  }

  return new this.BlockStatement(openBlock.path, openBlock.params, openBlock.hash, program, inverse, openBlock.strip, inverseStrip, close && close.strip, this.locInfo(locInfo));
}
},{"../exception":19}],14:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _COMPILER_REVISION$REVISION_CHANGES = require('../base');

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _isArray = require('../utils');

var _CodeGen = require('./code-gen');

var _CodeGen2 = _interopRequireWildcard(_CodeGen);

function Literal(value) {
  this.value = value;
}

function JavaScriptCompiler() {}

JavaScriptCompiler.prototype = {
  // PUBLIC API: You can override these methods in a subclass to provide
  // alternative compiled forms for name lookup and buffering semantics
  nameLookup: function nameLookup(parent, name /* , type*/) {
    if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
      return [parent, '.', name];
    } else {
      return [parent, '[\'', name, '\']'];
    }
  },
  depthedLookup: function depthedLookup(name) {
    return [this.aliasable('this.lookup'), '(depths, "', name, '")'];
  },

  compilerInfo: function compilerInfo() {
    var revision = _COMPILER_REVISION$REVISION_CHANGES.COMPILER_REVISION,
        versions = _COMPILER_REVISION$REVISION_CHANGES.REVISION_CHANGES[revision];
    return [revision, versions];
  },

  appendToBuffer: function appendToBuffer(source, location, explicit) {
    // Force a source as this simplifies the merge logic.
    if (!_isArray.isArray(source)) {
      source = [source];
    }
    source = this.source.wrap(source, location);

    if (this.environment.isSimple) {
      return ['return ', source, ';'];
    } else if (explicit) {
      // This is a case where the buffer operation occurs as a child of another
      // construct, generally braces. We have to explicitly output these buffer
      // operations to ensure that the emitted code goes in the correct location.
      return ['buffer += ', source, ';'];
    } else {
      source.appendToBuffer = true;
      return source;
    }
  },

  initializeBuffer: function initializeBuffer() {
    return this.quotedString('');
  },
  // END PUBLIC API

  compile: function compile(environment, options, context, asObject) {
    this.environment = environment;
    this.options = options;
    this.stringParams = this.options.stringParams;
    this.trackIds = this.options.trackIds;
    this.precompile = !asObject;

    this.name = this.environment.name;
    this.isChild = !!context;
    this.context = context || {
      programs: [],
      environments: []
    };

    this.preamble();

    this.stackSlot = 0;
    this.stackVars = [];
    this.aliases = {};
    this.registers = { list: [] };
    this.hashes = [];
    this.compileStack = [];
    this.inlineStack = [];
    this.blockParams = [];

    this.compileChildren(environment, options);

    this.useDepths = this.useDepths || environment.useDepths || this.options.compat;
    this.useBlockParams = this.useBlockParams || environment.useBlockParams;

    var opcodes = environment.opcodes,
        opcode = undefined,
        firstLoc = undefined,
        i = undefined,
        l = undefined;

    for (i = 0, l = opcodes.length; i < l; i++) {
      opcode = opcodes[i];

      this.source.currentLocation = opcode.loc;
      firstLoc = firstLoc || opcode.loc;
      this[opcode.opcode].apply(this, opcode.args);
    }

    // Flush any trailing content that might be pending.
    this.source.currentLocation = firstLoc;
    this.pushSource('');

    /* istanbul ignore next */
    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
      throw new _Exception2['default']('Compile completed with content left on stack');
    }

    var fn = this.createFunctionContext(asObject);
    if (!this.isChild) {
      var ret = {
        compiler: this.compilerInfo(),
        main: fn
      };
      var programs = this.context.programs;
      for (i = 0, l = programs.length; i < l; i++) {
        if (programs[i]) {
          ret[i] = programs[i];
        }
      }

      if (this.environment.usePartial) {
        ret.usePartial = true;
      }
      if (this.options.data) {
        ret.useData = true;
      }
      if (this.useDepths) {
        ret.useDepths = true;
      }
      if (this.useBlockParams) {
        ret.useBlockParams = true;
      }
      if (this.options.compat) {
        ret.compat = true;
      }

      if (!asObject) {
        ret.compiler = JSON.stringify(ret.compiler);

        this.source.currentLocation = { start: { line: 1, column: 0 } };
        ret = this.objectLiteral(ret);

        if (options.srcName) {
          ret = ret.toStringWithSourceMap({ file: options.destName });
          ret.map = ret.map && ret.map.toString();
        } else {
          ret = ret.toString();
        }
      } else {
        ret.compilerOptions = this.options;
      }

      return ret;
    } else {
      return fn;
    }
  },

  preamble: function preamble() {
    // track the last context pushed into place to allow skipping the
    // getContext opcode when it would be a noop
    this.lastContext = 0;
    this.source = new _CodeGen2['default'](this.options.srcName);
  },

  createFunctionContext: function createFunctionContext(asObject) {
    var varDeclarations = '';

    var locals = this.stackVars.concat(this.registers.list);
    if (locals.length > 0) {
      varDeclarations += ', ' + locals.join(', ');
    }

    // Generate minimizer alias mappings
    //
    // When using true SourceNodes, this will update all references to the given alias
    // as the source nodes are reused in situ. For the non-source node compilation mode,
    // aliases will not be used, but this case is already being run on the client and
    // we aren't concern about minimizing the template size.
    var aliasCount = 0;
    for (var alias in this.aliases) {
      // eslint-disable-line guard-for-in
      var node = this.aliases[alias];

      if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
        varDeclarations += ', alias' + ++aliasCount + '=' + alias;
        node.children[0] = 'alias' + aliasCount;
      }
    }

    var params = ['depth0', 'helpers', 'partials', 'data'];

    if (this.useBlockParams || this.useDepths) {
      params.push('blockParams');
    }
    if (this.useDepths) {
      params.push('depths');
    }

    // Perform a second pass over the output to merge content when possible
    var source = this.mergeSource(varDeclarations);

    if (asObject) {
      params.push(source);

      return Function.apply(this, params);
    } else {
      return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
    }
  },
  mergeSource: function mergeSource(varDeclarations) {
    var isSimple = this.environment.isSimple,
        appendOnly = !this.forceBuffer,
        appendFirst = undefined,
        sourceSeen = undefined,
        bufferStart = undefined,
        bufferEnd = undefined;
    this.source.each(function (line) {
      if (line.appendToBuffer) {
        if (bufferStart) {
          line.prepend('  + ');
        } else {
          bufferStart = line;
        }
        bufferEnd = line;
      } else {
        if (bufferStart) {
          if (!sourceSeen) {
            appendFirst = true;
          } else {
            bufferStart.prepend('buffer += ');
          }
          bufferEnd.add(';');
          bufferStart = bufferEnd = undefined;
        }

        sourceSeen = true;
        if (!isSimple) {
          appendOnly = false;
        }
      }
    });

    if (appendOnly) {
      if (bufferStart) {
        bufferStart.prepend('return ');
        bufferEnd.add(';');
      } else if (!sourceSeen) {
        this.source.push('return "";');
      }
    } else {
      varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());

      if (bufferStart) {
        bufferStart.prepend('return buffer + ');
        bufferEnd.add(';');
      } else {
        this.source.push('return buffer;');
      }
    }

    if (varDeclarations) {
      this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
    }

    return this.source.merge();
  },

  // [blockValue]
  //
  // On stack, before: hash, inverse, program, value
  // On stack, after: return value of blockHelperMissing
  //
  // The purpose of this opcode is to take a block of the form
  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
  // replace it on the stack with the result of properly
  // invoking blockHelperMissing.
  blockValue: function blockValue(name) {
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs(name, 0, params);

    var blockName = this.popStack();
    params.splice(1, 0, blockName);

    this.push(this.source.functionCall(blockHelperMissing, 'call', params));
  },

  // [ambiguousBlockValue]
  //
  // On stack, before: hash, inverse, program, value
  // Compiler value, before: lastHelper=value of last found helper, if any
  // On stack, after, if no lastHelper: same as [blockValue]
  // On stack, after, if lastHelper: value
  ambiguousBlockValue: function ambiguousBlockValue() {
    // We're being a bit cheeky and reusing the options value from the prior exec
    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
        params = [this.contextName(0)];
    this.setupHelperArgs('', 0, params, true);

    this.flushInline();

    var current = this.topStack();
    params.splice(1, 0, current);

    this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
  },

  // [appendContent]
  //
  // On stack, before: ...
  // On stack, after: ...
  //
  // Appends the string value of `content` to the current buffer
  appendContent: function appendContent(content) {
    if (this.pendingContent) {
      content = this.pendingContent + content;
    } else {
      this.pendingLocation = this.source.currentLocation;
    }

    this.pendingContent = content;
  },

  // [append]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Coerces `value` to a String and appends it to the current buffer.
  //
  // If `value` is truthy, or 0, it is coerced into a string and appended
  // Otherwise, the empty string is appended
  append: function append() {
    if (this.isInline()) {
      this.replaceStack(function (current) {
        return [' != null ? ', current, ' : ""'];
      });

      this.pushSource(this.appendToBuffer(this.popStack()));
    } else {
      var local = this.popStack();
      this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
      if (this.environment.isSimple) {
        this.pushSource(['else { ', this.appendToBuffer('\'\'', undefined, true), ' }']);
      }
    }
  },

  // [appendEscaped]
  //
  // On stack, before: value, ...
  // On stack, after: ...
  //
  // Escape `value` and append it to the buffer
  appendEscaped: function appendEscaped() {
    this.pushSource(this.appendToBuffer([this.aliasable('this.escapeExpression'), '(', this.popStack(), ')']));
  },

  // [getContext]
  //
  // On stack, before: ...
  // On stack, after: ...
  // Compiler value, after: lastContext=depth
  //
  // Set the value of the `lastContext` compiler value to the depth
  getContext: function getContext(depth) {
    this.lastContext = depth;
  },

  // [pushContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext, ...
  //
  // Pushes the value of the current context onto the stack.
  pushContext: function pushContext() {
    this.pushStackLiteral(this.contextName(this.lastContext));
  },

  // [lookupOnContext]
  //
  // On stack, before: ...
  // On stack, after: currentContext[name], ...
  //
  // Looks up the value of `name` on the current context and pushes
  // it onto the stack.
  lookupOnContext: function lookupOnContext(parts, falsy, scoped) {
    var i = 0;

    if (!scoped && this.options.compat && !this.lastContext) {
      // The depthed query is expected to handle the undefined logic for the root level that
      // is implemented below, so we evaluate that directly in compat mode
      this.push(this.depthedLookup(parts[i++]));
    } else {
      this.pushContext();
    }

    this.resolvePath('context', parts, i, falsy);
  },

  // [lookupBlockParam]
  //
  // On stack, before: ...
  // On stack, after: blockParam[name], ...
  //
  // Looks up the value of `parts` on the given block param and pushes
  // it onto the stack.
  lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
    this.useBlockParams = true;

    this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
    this.resolvePath('context', parts, 1);
  },

  // [lookupData]
  //
  // On stack, before: ...
  // On stack, after: data, ...
  //
  // Push the data lookup operator
  lookupData: function lookupData(depth, parts) {
    if (!depth) {
      this.pushStackLiteral('data');
    } else {
      this.pushStackLiteral('this.data(data, ' + depth + ')');
    }

    this.resolvePath('data', parts, 0, true);
  },

  resolvePath: function resolvePath(type, parts, i, falsy) {
    var _this = this;

    if (this.options.strict || this.options.assumeObjects) {
      this.push(strictLookup(this.options.strict, this, parts, type));
      return;
    }

    var len = parts.length;
    for (; i < len; i++) {
      /*eslint-disable no-loop-func */
      this.replaceStack(function (current) {
        var lookup = _this.nameLookup(current, parts[i], type);
        // We want to ensure that zero and false are handled properly if the context (falsy flag)
        // needs to have the special handling for these values.
        if (!falsy) {
          return [' != null ? ', lookup, ' : ', current];
        } else {
          // Otherwise we can use generic falsy handling
          return [' && ', lookup];
        }
      });
      /*eslint-enable no-loop-func */
    }
  },

  // [resolvePossibleLambda]
  //
  // On stack, before: value, ...
  // On stack, after: resolved value, ...
  //
  // If the `value` is a lambda, replace it on the stack by
  // the return value of the lambda
  resolvePossibleLambda: function resolvePossibleLambda() {
    this.push([this.aliasable('this.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
  },

  // [pushStringParam]
  //
  // On stack, before: ...
  // On stack, after: string, currentContext, ...
  //
  // This opcode is designed for use in string mode, which
  // provides the string value of a parameter along with its
  // depth rather than resolving it immediately.
  pushStringParam: function pushStringParam(string, type) {
    this.pushContext();
    this.pushString(type);

    // If it's a subexpression, the string result
    // will be pushed after this opcode.
    if (type !== 'SubExpression') {
      if (typeof string === 'string') {
        this.pushString(string);
      } else {
        this.pushStackLiteral(string);
      }
    }
  },

  emptyHash: function emptyHash(omitEmpty) {
    if (this.trackIds) {
      this.push('{}'); // hashIds
    }
    if (this.stringParams) {
      this.push('{}'); // hashContexts
      this.push('{}'); // hashTypes
    }
    this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
  },
  pushHash: function pushHash() {
    if (this.hash) {
      this.hashes.push(this.hash);
    }
    this.hash = { values: [], types: [], contexts: [], ids: [] };
  },
  popHash: function popHash() {
    var hash = this.hash;
    this.hash = this.hashes.pop();

    if (this.trackIds) {
      this.push(this.objectLiteral(hash.ids));
    }
    if (this.stringParams) {
      this.push(this.objectLiteral(hash.contexts));
      this.push(this.objectLiteral(hash.types));
    }

    this.push(this.objectLiteral(hash.values));
  },

  // [pushString]
  //
  // On stack, before: ...
  // On stack, after: quotedString(string), ...
  //
  // Push a quoted version of `string` onto the stack
  pushString: function pushString(string) {
    this.pushStackLiteral(this.quotedString(string));
  },

  // [pushLiteral]
  //
  // On stack, before: ...
  // On stack, after: value, ...
  //
  // Pushes a value onto the stack. This operation prevents
  // the compiler from creating a temporary variable to hold
  // it.
  pushLiteral: function pushLiteral(value) {
    this.pushStackLiteral(value);
  },

  // [pushProgram]
  //
  // On stack, before: ...
  // On stack, after: program(guid), ...
  //
  // Push a program expression onto the stack. This takes
  // a compile-time guid and converts it into a runtime-accessible
  // expression.
  pushProgram: function pushProgram(guid) {
    if (guid != null) {
      this.pushStackLiteral(this.programExpression(guid));
    } else {
      this.pushStackLiteral(null);
    }
  },

  // [invokeHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // Pops off the helper's parameters, invokes the helper,
  // and pushes the helper's return value onto the stack.
  //
  // If the helper is not found, `helperMissing` is called.
  invokeHelper: function invokeHelper(paramSize, name, isSimple) {
    var nonHelper = this.popStack(),
        helper = this.setupHelper(paramSize, name),
        simple = isSimple ? [helper.name, ' || '] : '';

    var lookup = ['('].concat(simple, nonHelper);
    if (!this.options.strict) {
      lookup.push(' || ', this.aliasable('helpers.helperMissing'));
    }
    lookup.push(')');

    this.push(this.source.functionCall(lookup, 'call', helper.callParams));
  },

  // [invokeKnownHelper]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of helper invocation
  //
  // This operation is used when the helper is known to exist,
  // so a `helperMissing` fallback is not required.
  invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
    var helper = this.setupHelper(paramSize, name);
    this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
  },

  // [invokeAmbiguous]
  //
  // On stack, before: hash, inverse, program, params..., ...
  // On stack, after: result of disambiguation
  //
  // This operation is used when an expression like `{{foo}}`
  // is provided, but we don't know at compile-time whether it
  // is a helper or a path.
  //
  // This operation emits more code than the other options,
  // and can be avoided by passing the `knownHelpers` and
  // `knownHelpersOnly` flags at compile-time.
  invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
    this.useRegister('helper');

    var nonHelper = this.popStack();

    this.emptyHash();
    var helper = this.setupHelper(0, name, helperCall);

    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

    var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
    if (!this.options.strict) {
      lookup[0] = '(helper = ';
      lookup.push(' != null ? helper : ', this.aliasable('helpers.helperMissing'));
    }

    this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
  },

  // [invokePartial]
  //
  // On stack, before: context, ...
  // On stack after: result of partial invocation
  //
  // This operation pops off a context, invokes a partial with that context,
  // and pushes the result of the invocation back.
  invokePartial: function invokePartial(isDynamic, name, indent) {
    var params = [],
        options = this.setupParams(name, 1, params, false);

    if (isDynamic) {
      name = this.popStack();
      delete options.name;
    }

    if (indent) {
      options.indent = JSON.stringify(indent);
    }
    options.helpers = 'helpers';
    options.partials = 'partials';

    if (!isDynamic) {
      params.unshift(this.nameLookup('partials', name, 'partial'));
    } else {
      params.unshift(name);
    }

    if (this.options.compat) {
      options.depths = 'depths';
    }
    options = this.objectLiteral(options);
    params.push(options);

    this.push(this.source.functionCall('this.invokePartial', '', params));
  },

  // [assignToHash]
  //
  // On stack, before: value, ..., hash, ...
  // On stack, after: ..., hash, ...
  //
  // Pops a value off the stack and assigns it to the current hash
  assignToHash: function assignToHash(key) {
    var value = this.popStack(),
        context = undefined,
        type = undefined,
        id = undefined;

    if (this.trackIds) {
      id = this.popStack();
    }
    if (this.stringParams) {
      type = this.popStack();
      context = this.popStack();
    }

    var hash = this.hash;
    if (context) {
      hash.contexts[key] = context;
    }
    if (type) {
      hash.types[key] = type;
    }
    if (id) {
      hash.ids[key] = id;
    }
    hash.values[key] = value;
  },

  pushId: function pushId(type, name, child) {
    if (type === 'BlockParam') {
      this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
    } else if (type === 'PathExpression') {
      this.pushString(name);
    } else if (type === 'SubExpression') {
      this.pushStackLiteral('true');
    } else {
      this.pushStackLiteral('null');
    }
  },

  // HELPERS

  compiler: JavaScriptCompiler,

  compileChildren: function compileChildren(environment, options) {
    var children = environment.children,
        child = undefined,
        compiler = undefined;

    for (var i = 0, l = children.length; i < l; i++) {
      child = children[i];
      compiler = new this.compiler(); // eslint-disable-line new-cap

      var index = this.matchExistingProgram(child);

      if (index == null) {
        this.context.programs.push(''); // Placeholder to prevent name conflicts for nested children
        index = this.context.programs.length;
        child.index = index;
        child.name = 'program' + index;
        this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
        this.context.environments[index] = child;

        this.useDepths = this.useDepths || compiler.useDepths;
        this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
      } else {
        child.index = index;
        child.name = 'program' + index;

        this.useDepths = this.useDepths || child.useDepths;
        this.useBlockParams = this.useBlockParams || child.useBlockParams;
      }
    }
  },
  matchExistingProgram: function matchExistingProgram(child) {
    for (var i = 0, len = this.context.environments.length; i < len; i++) {
      var environment = this.context.environments[i];
      if (environment && environment.equals(child)) {
        return i;
      }
    }
  },

  programExpression: function programExpression(guid) {
    var child = this.environment.children[guid],
        programParams = [child.index, 'data', child.blockParams];

    if (this.useBlockParams || this.useDepths) {
      programParams.push('blockParams');
    }
    if (this.useDepths) {
      programParams.push('depths');
    }

    return 'this.program(' + programParams.join(', ') + ')';
  },

  useRegister: function useRegister(name) {
    if (!this.registers[name]) {
      this.registers[name] = true;
      this.registers.list.push(name);
    }
  },

  push: function push(expr) {
    if (!(expr instanceof Literal)) {
      expr = this.source.wrap(expr);
    }

    this.inlineStack.push(expr);
    return expr;
  },

  pushStackLiteral: function pushStackLiteral(item) {
    this.push(new Literal(item));
  },

  pushSource: function pushSource(source) {
    if (this.pendingContent) {
      this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
      this.pendingContent = undefined;
    }

    if (source) {
      this.source.push(source);
    }
  },

  replaceStack: function replaceStack(callback) {
    var prefix = ['('],
        stack = undefined,
        createdStack = undefined,
        usedLiteral = undefined;

    /* istanbul ignore next */
    if (!this.isInline()) {
      throw new _Exception2['default']('replaceStack on non-inline');
    }

    // We want to merge the inline statement into the replacement statement via ','
    var top = this.popStack(true);

    if (top instanceof Literal) {
      // Literals do not need to be inlined
      stack = [top.value];
      prefix = ['(', stack];
      usedLiteral = true;
    } else {
      // Get or create the current stack name for use by the inline
      createdStack = true;
      var _name = this.incrStack();

      prefix = ['((', this.push(_name), ' = ', top, ')'];
      stack = this.topStack();
    }

    var item = callback.call(this, stack);

    if (!usedLiteral) {
      this.popStack();
    }
    if (createdStack) {
      this.stackSlot--;
    }
    this.push(prefix.concat(item, ')'));
  },

  incrStack: function incrStack() {
    this.stackSlot++;
    if (this.stackSlot > this.stackVars.length) {
      this.stackVars.push('stack' + this.stackSlot);
    }
    return this.topStackName();
  },
  topStackName: function topStackName() {
    return 'stack' + this.stackSlot;
  },
  flushInline: function flushInline() {
    var inlineStack = this.inlineStack;
    this.inlineStack = [];
    for (var i = 0, len = inlineStack.length; i < len; i++) {
      var entry = inlineStack[i];
      /* istanbul ignore if */
      if (entry instanceof Literal) {
        this.compileStack.push(entry);
      } else {
        var stack = this.incrStack();
        this.pushSource([stack, ' = ', entry, ';']);
        this.compileStack.push(stack);
      }
    }
  },
  isInline: function isInline() {
    return this.inlineStack.length;
  },

  popStack: function popStack(wrapped) {
    var inline = this.isInline(),
        item = (inline ? this.inlineStack : this.compileStack).pop();

    if (!wrapped && item instanceof Literal) {
      return item.value;
    } else {
      if (!inline) {
        /* istanbul ignore next */
        if (!this.stackSlot) {
          throw new _Exception2['default']('Invalid stack pop');
        }
        this.stackSlot--;
      }
      return item;
    }
  },

  topStack: function topStack() {
    var stack = this.isInline() ? this.inlineStack : this.compileStack,
        item = stack[stack.length - 1];

    /* istanbul ignore if */
    if (item instanceof Literal) {
      return item.value;
    } else {
      return item;
    }
  },

  contextName: function contextName(context) {
    if (this.useDepths && context) {
      return 'depths[' + context + ']';
    } else {
      return 'depth' + context;
    }
  },

  quotedString: function quotedString(str) {
    return this.source.quotedString(str);
  },

  objectLiteral: function objectLiteral(obj) {
    return this.source.objectLiteral(obj);
  },

  aliasable: function aliasable(name) {
    var ret = this.aliases[name];
    if (ret) {
      ret.referenceCount++;
      return ret;
    }

    ret = this.aliases[name] = this.source.wrap(name);
    ret.aliasable = true;
    ret.referenceCount = 1;

    return ret;
  },

  setupHelper: function setupHelper(paramSize, name, blockHelper) {
    var params = [],
        paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
    var foundHelper = this.nameLookup('helpers', name, 'helper');

    return {
      params: params,
      paramsInit: paramsInit,
      name: foundHelper,
      callParams: [this.contextName(0)].concat(params)
    };
  },

  setupParams: function setupParams(helper, paramSize, params) {
    var options = {},
        contexts = [],
        types = [],
        ids = [],
        param = undefined;

    options.name = this.quotedString(helper);
    options.hash = this.popStack();

    if (this.trackIds) {
      options.hashIds = this.popStack();
    }
    if (this.stringParams) {
      options.hashTypes = this.popStack();
      options.hashContexts = this.popStack();
    }

    var inverse = this.popStack(),
        program = this.popStack();

    // Avoid setting fn and inverse if neither are set. This allows
    // helpers to do a check for `if (options.fn)`
    if (program || inverse) {
      options.fn = program || 'this.noop';
      options.inverse = inverse || 'this.noop';
    }

    // The parameters go on to the stack in order (making sure that they are evaluated in order)
    // so we need to pop them off the stack in reverse order
    var i = paramSize;
    while (i--) {
      param = this.popStack();
      params[i] = param;

      if (this.trackIds) {
        ids[i] = this.popStack();
      }
      if (this.stringParams) {
        types[i] = this.popStack();
        contexts[i] = this.popStack();
      }
    }

    if (this.trackIds) {
      options.ids = this.source.generateArray(ids);
    }
    if (this.stringParams) {
      options.types = this.source.generateArray(types);
      options.contexts = this.source.generateArray(contexts);
    }

    if (this.options.data) {
      options.data = 'data';
    }
    if (this.useBlockParams) {
      options.blockParams = 'blockParams';
    }
    return options;
  },

  setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
    var options = this.setupParams(helper, paramSize, params, true);
    options = this.objectLiteral(options);
    if (useRegister) {
      this.useRegister('options');
      params.push('options');
      return ['options=', options];
    } else {
      params.push(options);
      return '';
    }
  }
};

(function () {
  var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');

  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

  for (var i = 0, l = reservedWords.length; i < l; i++) {
    compilerWords[reservedWords[i]] = true;
  }
})();

JavaScriptCompiler.isValidJavaScriptVariableName = function (name) {
  return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
};

function strictLookup(requireTerminal, compiler, parts, type) {
  var stack = compiler.popStack(),
      i = 0,
      len = parts.length;
  if (requireTerminal) {
    len--;
  }

  for (; i < len; i++) {
    stack = compiler.nameLookup(stack, parts[i], type);
  }

  if (requireTerminal) {
    return [compiler.aliasable('this.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
  } else {
    return stack;
  }
}

exports['default'] = JavaScriptCompiler;
module.exports = exports['default'];
},{"../base":8,"../exception":19,"../utils":23,"./code-gen":11}],15:[function(require,module,exports){
"use strict";

exports.__esModule = true;
/* istanbul ignore next */
/* Jison generated parser */
var handlebars = (function () {
    var parser = { trace: function trace() {},
        yy: {},
        symbols_: { error: 2, root: 3, program: 4, EOF: 5, program_repetition0: 6, statement: 7, mustache: 8, block: 9, rawBlock: 10, partial: 11, content: 12, COMMENT: 13, CONTENT: 14, openRawBlock: 15, END_RAW_BLOCK: 16, OPEN_RAW_BLOCK: 17, helperName: 18, openRawBlock_repetition0: 19, openRawBlock_option0: 20, CLOSE_RAW_BLOCK: 21, openBlock: 22, block_option0: 23, closeBlock: 24, openInverse: 25, block_option1: 26, OPEN_BLOCK: 27, openBlock_repetition0: 28, openBlock_option0: 29, openBlock_option1: 30, CLOSE: 31, OPEN_INVERSE: 32, openInverse_repetition0: 33, openInverse_option0: 34, openInverse_option1: 35, openInverseChain: 36, OPEN_INVERSE_CHAIN: 37, openInverseChain_repetition0: 38, openInverseChain_option0: 39, openInverseChain_option1: 40, inverseAndProgram: 41, INVERSE: 42, inverseChain: 43, inverseChain_option0: 44, OPEN_ENDBLOCK: 45, OPEN: 46, mustache_repetition0: 47, mustache_option0: 48, OPEN_UNESCAPED: 49, mustache_repetition1: 50, mustache_option1: 51, CLOSE_UNESCAPED: 52, OPEN_PARTIAL: 53, partialName: 54, partial_repetition0: 55, partial_option0: 56, param: 57, sexpr: 58, OPEN_SEXPR: 59, sexpr_repetition0: 60, sexpr_option0: 61, CLOSE_SEXPR: 62, hash: 63, hash_repetition_plus0: 64, hashSegment: 65, ID: 66, EQUALS: 67, blockParams: 68, OPEN_BLOCK_PARAMS: 69, blockParams_repetition_plus0: 70, CLOSE_BLOCK_PARAMS: 71, path: 72, dataName: 73, STRING: 74, NUMBER: 75, BOOLEAN: 76, UNDEFINED: 77, NULL: 78, DATA: 79, pathSegments: 80, SEP: 81, $accept: 0, $end: 1 },
        terminals_: { 2: "error", 5: "EOF", 13: "COMMENT", 14: "CONTENT", 16: "END_RAW_BLOCK", 17: "OPEN_RAW_BLOCK", 21: "CLOSE_RAW_BLOCK", 27: "OPEN_BLOCK", 31: "CLOSE", 32: "OPEN_INVERSE", 37: "OPEN_INVERSE_CHAIN", 42: "INVERSE", 45: "OPEN_ENDBLOCK", 46: "OPEN", 49: "OPEN_UNESCAPED", 52: "CLOSE_UNESCAPED", 53: "OPEN_PARTIAL", 59: "OPEN_SEXPR", 62: "CLOSE_SEXPR", 66: "ID", 67: "EQUALS", 69: "OPEN_BLOCK_PARAMS", 71: "CLOSE_BLOCK_PARAMS", 74: "STRING", 75: "NUMBER", 76: "BOOLEAN", 77: "UNDEFINED", 78: "NULL", 79: "DATA", 81: "SEP" },
        productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [12, 1], [10, 3], [15, 5], [9, 4], [9, 4], [22, 6], [25, 6], [36, 6], [41, 2], [43, 3], [43, 1], [24, 3], [8, 5], [8, 5], [11, 5], [57, 1], [57, 1], [58, 5], [63, 1], [65, 3], [68, 3], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [54, 1], [54, 1], [73, 2], [72, 1], [80, 3], [80, 1], [6, 0], [6, 2], [19, 0], [19, 2], [20, 0], [20, 1], [23, 0], [23, 1], [26, 0], [26, 1], [28, 0], [28, 2], [29, 0], [29, 1], [30, 0], [30, 1], [33, 0], [33, 2], [34, 0], [34, 1], [35, 0], [35, 1], [38, 0], [38, 2], [39, 0], [39, 1], [40, 0], [40, 1], [44, 0], [44, 1], [47, 0], [47, 2], [48, 0], [48, 1], [50, 0], [50, 2], [51, 0], [51, 1], [55, 0], [55, 2], [56, 0], [56, 1], [60, 0], [60, 2], [61, 0], [61, 1], [64, 1], [64, 2], [70, 1], [70, 2]],
        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {

            var $0 = $$.length - 1;
            switch (yystate) {
                case 1:
                    return $$[$0 - 1];
                    break;
                case 2:
                    this.$ = new yy.Program($$[$0], null, {}, yy.locInfo(this._$));
                    break;
                case 3:
                    this.$ = $$[$0];
                    break;
                case 4:
                    this.$ = $$[$0];
                    break;
                case 5:
                    this.$ = $$[$0];
                    break;
                case 6:
                    this.$ = $$[$0];
                    break;
                case 7:
                    this.$ = $$[$0];
                    break;
                case 8:
                    this.$ = new yy.CommentStatement(yy.stripComment($$[$0]), yy.stripFlags($$[$0], $$[$0]), yy.locInfo(this._$));
                    break;
                case 9:
                    this.$ = new yy.ContentStatement($$[$0], yy.locInfo(this._$));
                    break;
                case 10:
                    this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                    break;
                case 11:
                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
                    break;
                case 12:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
                    break;
                case 13:
                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
                    break;
                case 14:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 15:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 16:
                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
                    break;
                case 17:
                    this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
                    break;
                case 18:
                    var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
                        program = new yy.Program([inverse], null, {}, yy.locInfo(this._$));
                    program.chained = true;

                    this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

                    break;
                case 19:
                    this.$ = $$[$0];
                    break;
                case 20:
                    this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
                    break;
                case 21:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 22:
                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                    break;
                case 23:
                    this.$ = new yy.PartialStatement($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.stripFlags($$[$0 - 4], $$[$0]), yy.locInfo(this._$));
                    break;
                case 24:
                    this.$ = $$[$0];
                    break;
                case 25:
                    this.$ = $$[$0];
                    break;
                case 26:
                    this.$ = new yy.SubExpression($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.locInfo(this._$));
                    break;
                case 27:
                    this.$ = new yy.Hash($$[$0], yy.locInfo(this._$));
                    break;
                case 28:
                    this.$ = new yy.HashPair(yy.id($$[$0 - 2]), $$[$0], yy.locInfo(this._$));
                    break;
                case 29:
                    this.$ = yy.id($$[$0 - 1]);
                    break;
                case 30:
                    this.$ = $$[$0];
                    break;
                case 31:
                    this.$ = $$[$0];
                    break;
                case 32:
                    this.$ = new yy.StringLiteral($$[$0], yy.locInfo(this._$));
                    break;
                case 33:
                    this.$ = new yy.NumberLiteral($$[$0], yy.locInfo(this._$));
                    break;
                case 34:
                    this.$ = new yy.BooleanLiteral($$[$0], yy.locInfo(this._$));
                    break;
                case 35:
                    this.$ = new yy.UndefinedLiteral(yy.locInfo(this._$));
                    break;
                case 36:
                    this.$ = new yy.NullLiteral(yy.locInfo(this._$));
                    break;
                case 37:
                    this.$ = $$[$0];
                    break;
                case 38:
                    this.$ = $$[$0];
                    break;
                case 39:
                    this.$ = yy.preparePath(true, $$[$0], this._$);
                    break;
                case 40:
                    this.$ = yy.preparePath(false, $$[$0], this._$);
                    break;
                case 41:
                    $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
                    break;
                case 42:
                    this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
                    break;
                case 43:
                    this.$ = [];
                    break;
                case 44:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 45:
                    this.$ = [];
                    break;
                case 46:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 53:
                    this.$ = [];
                    break;
                case 54:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 59:
                    this.$ = [];
                    break;
                case 60:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 65:
                    this.$ = [];
                    break;
                case 66:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 73:
                    this.$ = [];
                    break;
                case 74:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 77:
                    this.$ = [];
                    break;
                case 78:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 81:
                    this.$ = [];
                    break;
                case 82:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 85:
                    this.$ = [];
                    break;
                case 86:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 89:
                    this.$ = [$$[$0]];
                    break;
                case 90:
                    $$[$0 - 1].push($$[$0]);
                    break;
                case 91:
                    this.$ = [$$[$0]];
                    break;
                case 92:
                    $$[$0 - 1].push($$[$0]);
                    break;
            }
        },
        table: [{ 3: 1, 4: 2, 5: [2, 43], 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: [1, 11], 14: [1, 18], 15: 16, 17: [1, 21], 22: 14, 25: 15, 27: [1, 19], 32: [1, 20], 37: [2, 2], 42: [2, 2], 45: [2, 2], 46: [1, 12], 49: [1, 13], 53: [1, 17] }, { 1: [2, 1] }, { 5: [2, 44], 13: [2, 44], 14: [2, 44], 17: [2, 44], 27: [2, 44], 32: [2, 44], 37: [2, 44], 42: [2, 44], 45: [2, 44], 46: [2, 44], 49: [2, 44], 53: [2, 44] }, { 5: [2, 3], 13: [2, 3], 14: [2, 3], 17: [2, 3], 27: [2, 3], 32: [2, 3], 37: [2, 3], 42: [2, 3], 45: [2, 3], 46: [2, 3], 49: [2, 3], 53: [2, 3] }, { 5: [2, 4], 13: [2, 4], 14: [2, 4], 17: [2, 4], 27: [2, 4], 32: [2, 4], 37: [2, 4], 42: [2, 4], 45: [2, 4], 46: [2, 4], 49: [2, 4], 53: [2, 4] }, { 5: [2, 5], 13: [2, 5], 14: [2, 5], 17: [2, 5], 27: [2, 5], 32: [2, 5], 37: [2, 5], 42: [2, 5], 45: [2, 5], 46: [2, 5], 49: [2, 5], 53: [2, 5] }, { 5: [2, 6], 13: [2, 6], 14: [2, 6], 17: [2, 6], 27: [2, 6], 32: [2, 6], 37: [2, 6], 42: [2, 6], 45: [2, 6], 46: [2, 6], 49: [2, 6], 53: [2, 6] }, { 5: [2, 7], 13: [2, 7], 14: [2, 7], 17: [2, 7], 27: [2, 7], 32: [2, 7], 37: [2, 7], 42: [2, 7], 45: [2, 7], 46: [2, 7], 49: [2, 7], 53: [2, 7] }, { 5: [2, 8], 13: [2, 8], 14: [2, 8], 17: [2, 8], 27: [2, 8], 32: [2, 8], 37: [2, 8], 42: [2, 8], 45: [2, 8], 46: [2, 8], 49: [2, 8], 53: [2, 8] }, { 18: 22, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 33, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 4: 34, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 37: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 4: 35, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 12: 36, 14: [1, 18] }, { 18: 38, 54: 37, 58: 39, 59: [1, 40], 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 9], 13: [2, 9], 14: [2, 9], 16: [2, 9], 17: [2, 9], 27: [2, 9], 32: [2, 9], 37: [2, 9], 42: [2, 9], 45: [2, 9], 46: [2, 9], 49: [2, 9], 53: [2, 9] }, { 18: 41, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 42, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 43, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 31: [2, 73], 47: 44, 59: [2, 73], 66: [2, 73], 74: [2, 73], 75: [2, 73], 76: [2, 73], 77: [2, 73], 78: [2, 73], 79: [2, 73] }, { 21: [2, 30], 31: [2, 30], 52: [2, 30], 59: [2, 30], 62: [2, 30], 66: [2, 30], 69: [2, 30], 74: [2, 30], 75: [2, 30], 76: [2, 30], 77: [2, 30], 78: [2, 30], 79: [2, 30] }, { 21: [2, 31], 31: [2, 31], 52: [2, 31], 59: [2, 31], 62: [2, 31], 66: [2, 31], 69: [2, 31], 74: [2, 31], 75: [2, 31], 76: [2, 31], 77: [2, 31], 78: [2, 31], 79: [2, 31] }, { 21: [2, 32], 31: [2, 32], 52: [2, 32], 59: [2, 32], 62: [2, 32], 66: [2, 32], 69: [2, 32], 74: [2, 32], 75: [2, 32], 76: [2, 32], 77: [2, 32], 78: [2, 32], 79: [2, 32] }, { 21: [2, 33], 31: [2, 33], 52: [2, 33], 59: [2, 33], 62: [2, 33], 66: [2, 33], 69: [2, 33], 74: [2, 33], 75: [2, 33], 76: [2, 33], 77: [2, 33], 78: [2, 33], 79: [2, 33] }, { 21: [2, 34], 31: [2, 34], 52: [2, 34], 59: [2, 34], 62: [2, 34], 66: [2, 34], 69: [2, 34], 74: [2, 34], 75: [2, 34], 76: [2, 34], 77: [2, 34], 78: [2, 34], 79: [2, 34] }, { 21: [2, 35], 31: [2, 35], 52: [2, 35], 59: [2, 35], 62: [2, 35], 66: [2, 35], 69: [2, 35], 74: [2, 35], 75: [2, 35], 76: [2, 35], 77: [2, 35], 78: [2, 35], 79: [2, 35] }, { 21: [2, 36], 31: [2, 36], 52: [2, 36], 59: [2, 36], 62: [2, 36], 66: [2, 36], 69: [2, 36], 74: [2, 36], 75: [2, 36], 76: [2, 36], 77: [2, 36], 78: [2, 36], 79: [2, 36] }, { 21: [2, 40], 31: [2, 40], 52: [2, 40], 59: [2, 40], 62: [2, 40], 66: [2, 40], 69: [2, 40], 74: [2, 40], 75: [2, 40], 76: [2, 40], 77: [2, 40], 78: [2, 40], 79: [2, 40], 81: [1, 45] }, { 66: [1, 32], 80: 46 }, { 21: [2, 42], 31: [2, 42], 52: [2, 42], 59: [2, 42], 62: [2, 42], 66: [2, 42], 69: [2, 42], 74: [2, 42], 75: [2, 42], 76: [2, 42], 77: [2, 42], 78: [2, 42], 79: [2, 42], 81: [2, 42] }, { 50: 47, 52: [2, 77], 59: [2, 77], 66: [2, 77], 74: [2, 77], 75: [2, 77], 76: [2, 77], 77: [2, 77], 78: [2, 77], 79: [2, 77] }, { 23: 48, 36: 50, 37: [1, 52], 41: 51, 42: [1, 53], 43: 49, 45: [2, 49] }, { 26: 54, 41: 55, 42: [1, 53], 45: [2, 51] }, { 16: [1, 56] }, { 31: [2, 81], 55: 57, 59: [2, 81], 66: [2, 81], 74: [2, 81], 75: [2, 81], 76: [2, 81], 77: [2, 81], 78: [2, 81], 79: [2, 81] }, { 31: [2, 37], 59: [2, 37], 66: [2, 37], 74: [2, 37], 75: [2, 37], 76: [2, 37], 77: [2, 37], 78: [2, 37], 79: [2, 37] }, { 31: [2, 38], 59: [2, 38], 66: [2, 38], 74: [2, 38], 75: [2, 38], 76: [2, 38], 77: [2, 38], 78: [2, 38], 79: [2, 38] }, { 18: 58, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 28: 59, 31: [2, 53], 59: [2, 53], 66: [2, 53], 69: [2, 53], 74: [2, 53], 75: [2, 53], 76: [2, 53], 77: [2, 53], 78: [2, 53], 79: [2, 53] }, { 31: [2, 59], 33: 60, 59: [2, 59], 66: [2, 59], 69: [2, 59], 74: [2, 59], 75: [2, 59], 76: [2, 59], 77: [2, 59], 78: [2, 59], 79: [2, 59] }, { 19: 61, 21: [2, 45], 59: [2, 45], 66: [2, 45], 74: [2, 45], 75: [2, 45], 76: [2, 45], 77: [2, 45], 78: [2, 45], 79: [2, 45] }, { 18: 65, 31: [2, 75], 48: 62, 57: 63, 58: 66, 59: [1, 40], 63: 64, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 66: [1, 70] }, { 21: [2, 39], 31: [2, 39], 52: [2, 39], 59: [2, 39], 62: [2, 39], 66: [2, 39], 69: [2, 39], 74: [2, 39], 75: [2, 39], 76: [2, 39], 77: [2, 39], 78: [2, 39], 79: [2, 39], 81: [1, 45] }, { 18: 65, 51: 71, 52: [2, 79], 57: 72, 58: 66, 59: [1, 40], 63: 73, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 24: 74, 45: [1, 75] }, { 45: [2, 50] }, { 4: 76, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 37: [2, 43], 42: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 45: [2, 19] }, { 18: 77, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 4: 78, 6: 3, 13: [2, 43], 14: [2, 43], 17: [2, 43], 27: [2, 43], 32: [2, 43], 45: [2, 43], 46: [2, 43], 49: [2, 43], 53: [2, 43] }, { 24: 79, 45: [1, 75] }, { 45: [2, 52] }, { 5: [2, 10], 13: [2, 10], 14: [2, 10], 17: [2, 10], 27: [2, 10], 32: [2, 10], 37: [2, 10], 42: [2, 10], 45: [2, 10], 46: [2, 10], 49: [2, 10], 53: [2, 10] }, { 18: 65, 31: [2, 83], 56: 80, 57: 81, 58: 66, 59: [1, 40], 63: 82, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 59: [2, 85], 60: 83, 62: [2, 85], 66: [2, 85], 74: [2, 85], 75: [2, 85], 76: [2, 85], 77: [2, 85], 78: [2, 85], 79: [2, 85] }, { 18: 65, 29: 84, 31: [2, 55], 57: 85, 58: 66, 59: [1, 40], 63: 86, 64: 67, 65: 68, 66: [1, 69], 69: [2, 55], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 65, 31: [2, 61], 34: 87, 57: 88, 58: 66, 59: [1, 40], 63: 89, 64: 67, 65: 68, 66: [1, 69], 69: [2, 61], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 18: 65, 20: 90, 21: [2, 47], 57: 91, 58: 66, 59: [1, 40], 63: 92, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 31: [1, 93] }, { 31: [2, 74], 59: [2, 74], 66: [2, 74], 74: [2, 74], 75: [2, 74], 76: [2, 74], 77: [2, 74], 78: [2, 74], 79: [2, 74] }, { 31: [2, 76] }, { 21: [2, 24], 31: [2, 24], 52: [2, 24], 59: [2, 24], 62: [2, 24], 66: [2, 24], 69: [2, 24], 74: [2, 24], 75: [2, 24], 76: [2, 24], 77: [2, 24], 78: [2, 24], 79: [2, 24] }, { 21: [2, 25], 31: [2, 25], 52: [2, 25], 59: [2, 25], 62: [2, 25], 66: [2, 25], 69: [2, 25], 74: [2, 25], 75: [2, 25], 76: [2, 25], 77: [2, 25], 78: [2, 25], 79: [2, 25] }, { 21: [2, 27], 31: [2, 27], 52: [2, 27], 62: [2, 27], 65: 94, 66: [1, 95], 69: [2, 27] }, { 21: [2, 89], 31: [2, 89], 52: [2, 89], 62: [2, 89], 66: [2, 89], 69: [2, 89] }, { 21: [2, 42], 31: [2, 42], 52: [2, 42], 59: [2, 42], 62: [2, 42], 66: [2, 42], 67: [1, 96], 69: [2, 42], 74: [2, 42], 75: [2, 42], 76: [2, 42], 77: [2, 42], 78: [2, 42], 79: [2, 42], 81: [2, 42] }, { 21: [2, 41], 31: [2, 41], 52: [2, 41], 59: [2, 41], 62: [2, 41], 66: [2, 41], 69: [2, 41], 74: [2, 41], 75: [2, 41], 76: [2, 41], 77: [2, 41], 78: [2, 41], 79: [2, 41], 81: [2, 41] }, { 52: [1, 97] }, { 52: [2, 78], 59: [2, 78], 66: [2, 78], 74: [2, 78], 75: [2, 78], 76: [2, 78], 77: [2, 78], 78: [2, 78], 79: [2, 78] }, { 52: [2, 80] }, { 5: [2, 12], 13: [2, 12], 14: [2, 12], 17: [2, 12], 27: [2, 12], 32: [2, 12], 37: [2, 12], 42: [2, 12], 45: [2, 12], 46: [2, 12], 49: [2, 12], 53: [2, 12] }, { 18: 98, 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 36: 50, 37: [1, 52], 41: 51, 42: [1, 53], 43: 100, 44: 99, 45: [2, 71] }, { 31: [2, 65], 38: 101, 59: [2, 65], 66: [2, 65], 69: [2, 65], 74: [2, 65], 75: [2, 65], 76: [2, 65], 77: [2, 65], 78: [2, 65], 79: [2, 65] }, { 45: [2, 17] }, { 5: [2, 13], 13: [2, 13], 14: [2, 13], 17: [2, 13], 27: [2, 13], 32: [2, 13], 37: [2, 13], 42: [2, 13], 45: [2, 13], 46: [2, 13], 49: [2, 13], 53: [2, 13] }, { 31: [1, 102] }, { 31: [2, 82], 59: [2, 82], 66: [2, 82], 74: [2, 82], 75: [2, 82], 76: [2, 82], 77: [2, 82], 78: [2, 82], 79: [2, 82] }, { 31: [2, 84] }, { 18: 65, 57: 104, 58: 66, 59: [1, 40], 61: 103, 62: [2, 87], 63: 105, 64: 67, 65: 68, 66: [1, 69], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 30: 106, 31: [2, 57], 68: 107, 69: [1, 108] }, { 31: [2, 54], 59: [2, 54], 66: [2, 54], 69: [2, 54], 74: [2, 54], 75: [2, 54], 76: [2, 54], 77: [2, 54], 78: [2, 54], 79: [2, 54] }, { 31: [2, 56], 69: [2, 56] }, { 31: [2, 63], 35: 109, 68: 110, 69: [1, 108] }, { 31: [2, 60], 59: [2, 60], 66: [2, 60], 69: [2, 60], 74: [2, 60], 75: [2, 60], 76: [2, 60], 77: [2, 60], 78: [2, 60], 79: [2, 60] }, { 31: [2, 62], 69: [2, 62] }, { 21: [1, 111] }, { 21: [2, 46], 59: [2, 46], 66: [2, 46], 74: [2, 46], 75: [2, 46], 76: [2, 46], 77: [2, 46], 78: [2, 46], 79: [2, 46] }, { 21: [2, 48] }, { 5: [2, 21], 13: [2, 21], 14: [2, 21], 17: [2, 21], 27: [2, 21], 32: [2, 21], 37: [2, 21], 42: [2, 21], 45: [2, 21], 46: [2, 21], 49: [2, 21], 53: [2, 21] }, { 21: [2, 90], 31: [2, 90], 52: [2, 90], 62: [2, 90], 66: [2, 90], 69: [2, 90] }, { 67: [1, 96] }, { 18: 65, 57: 112, 58: 66, 59: [1, 40], 66: [1, 32], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 22], 13: [2, 22], 14: [2, 22], 17: [2, 22], 27: [2, 22], 32: [2, 22], 37: [2, 22], 42: [2, 22], 45: [2, 22], 46: [2, 22], 49: [2, 22], 53: [2, 22] }, { 31: [1, 113] }, { 45: [2, 18] }, { 45: [2, 72] }, { 18: 65, 31: [2, 67], 39: 114, 57: 115, 58: 66, 59: [1, 40], 63: 116, 64: 67, 65: 68, 66: [1, 69], 69: [2, 67], 72: 23, 73: 24, 74: [1, 25], 75: [1, 26], 76: [1, 27], 77: [1, 28], 78: [1, 29], 79: [1, 31], 80: 30 }, { 5: [2, 23], 13: [2, 23], 14: [2, 23], 17: [2, 23], 27: [2, 23], 32: [2, 23], 37: [2, 23], 42: [2, 23], 45: [2, 23], 46: [2, 23], 49: [2, 23], 53: [2, 23] }, { 62: [1, 117] }, { 59: [2, 86], 62: [2, 86], 66: [2, 86], 74: [2, 86], 75: [2, 86], 76: [2, 86], 77: [2, 86], 78: [2, 86], 79: [2, 86] }, { 62: [2, 88] }, { 31: [1, 118] }, { 31: [2, 58] }, { 66: [1, 120], 70: 119 }, { 31: [1, 121] }, { 31: [2, 64] }, { 14: [2, 11] }, { 21: [2, 28], 31: [2, 28], 52: [2, 28], 62: [2, 28], 66: [2, 28], 69: [2, 28] }, { 5: [2, 20], 13: [2, 20], 14: [2, 20], 17: [2, 20], 27: [2, 20], 32: [2, 20], 37: [2, 20], 42: [2, 20], 45: [2, 20], 46: [2, 20], 49: [2, 20], 53: [2, 20] }, { 31: [2, 69], 40: 122, 68: 123, 69: [1, 108] }, { 31: [2, 66], 59: [2, 66], 66: [2, 66], 69: [2, 66], 74: [2, 66], 75: [2, 66], 76: [2, 66], 77: [2, 66], 78: [2, 66], 79: [2, 66] }, { 31: [2, 68], 69: [2, 68] }, { 21: [2, 26], 31: [2, 26], 52: [2, 26], 59: [2, 26], 62: [2, 26], 66: [2, 26], 69: [2, 26], 74: [2, 26], 75: [2, 26], 76: [2, 26], 77: [2, 26], 78: [2, 26], 79: [2, 26] }, { 13: [2, 14], 14: [2, 14], 17: [2, 14], 27: [2, 14], 32: [2, 14], 37: [2, 14], 42: [2, 14], 45: [2, 14], 46: [2, 14], 49: [2, 14], 53: [2, 14] }, { 66: [1, 125], 71: [1, 124] }, { 66: [2, 91], 71: [2, 91] }, { 13: [2, 15], 14: [2, 15], 17: [2, 15], 27: [2, 15], 32: [2, 15], 42: [2, 15], 45: [2, 15], 46: [2, 15], 49: [2, 15], 53: [2, 15] }, { 31: [1, 126] }, { 31: [2, 70] }, { 31: [2, 29] }, { 66: [2, 92], 71: [2, 92] }, { 13: [2, 16], 14: [2, 16], 17: [2, 16], 27: [2, 16], 32: [2, 16], 37: [2, 16], 42: [2, 16], 45: [2, 16], 46: [2, 16], 49: [2, 16], 53: [2, 16] }],
        defaultActions: { 4: [2, 1], 49: [2, 50], 51: [2, 19], 55: [2, 52], 64: [2, 76], 73: [2, 80], 78: [2, 17], 82: [2, 84], 92: [2, 48], 99: [2, 18], 100: [2, 72], 105: [2, 88], 107: [2, 58], 110: [2, 64], 111: [2, 11], 123: [2, 70], 124: [2, 29] },
        parseError: function parseError(str, hash) {
            throw new Error(str);
        },
        parse: function parse(input) {
            var self = this,
                stack = [0],
                vstack = [null],
                lstack = [],
                table = this.table,
                yytext = "",
                yylineno = 0,
                yyleng = 0,
                recovering = 0,
                TERROR = 2,
                EOF = 1;
            this.lexer.setInput(input);
            this.lexer.yy = this.yy;
            this.yy.lexer = this.lexer;
            this.yy.parser = this;
            if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
            var yyloc = this.lexer.yylloc;
            lstack.push(yyloc);
            var ranges = this.lexer.options && this.lexer.options.ranges;
            if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
            function popStack(n) {
                stack.length = stack.length - 2 * n;
                vstack.length = vstack.length - n;
                lstack.length = lstack.length - n;
            }
            function lex() {
                var token;
                token = self.lexer.lex() || 1;
                if (typeof token !== "number") {
                    token = self.symbols_[token] || token;
                }
                return token;
            }
            var symbol,
                preErrorSymbol,
                state,
                action,
                a,
                r,
                yyval = {},
                p,
                len,
                newState,
                expected;
            while (true) {
                state = stack[stack.length - 1];
                if (this.defaultActions[state]) {
                    action = this.defaultActions[state];
                } else {
                    if (symbol === null || typeof symbol == "undefined") {
                        symbol = lex();
                    }
                    action = table[state] && table[state][symbol];
                }
                if (typeof action === "undefined" || !action.length || !action[0]) {
                    var errStr = "";
                    if (!recovering) {
                        expected = [];
                        for (p in table[state]) if (this.terminals_[p] && p > 2) {
                            expected.push("'" + this.terminals_[p] + "'");
                        }
                        if (this.lexer.showPosition) {
                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                        } else {
                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                        }
                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                    }
                }
                if (action[0] instanceof Array && action.length > 1) {
                    throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                }
                switch (action[0]) {
                    case 1:
                        stack.push(symbol);
                        vstack.push(this.lexer.yytext);
                        lstack.push(this.lexer.yylloc);
                        stack.push(action[1]);
                        symbol = null;
                        if (!preErrorSymbol) {
                            yyleng = this.lexer.yyleng;
                            yytext = this.lexer.yytext;
                            yylineno = this.lexer.yylineno;
                            yyloc = this.lexer.yylloc;
                            if (recovering > 0) recovering--;
                        } else {
                            symbol = preErrorSymbol;
                            preErrorSymbol = null;
                        }
                        break;
                    case 2:
                        len = this.productions_[action[1]][1];
                        yyval.$ = vstack[vstack.length - len];
                        yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
                        if (ranges) {
                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                        }
                        r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                        if (typeof r !== "undefined") {
                            return r;
                        }
                        if (len) {
                            stack = stack.slice(0, -1 * len * 2);
                            vstack = vstack.slice(0, -1 * len);
                            lstack = lstack.slice(0, -1 * len);
                        }
                        stack.push(this.productions_[action[1]][0]);
                        vstack.push(yyval.$);
                        lstack.push(yyval._$);
                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                        stack.push(newState);
                        break;
                    case 3:
                        return true;
                }
            }
            return true;
        }
    };
    /* Jison generated lexer */
    var lexer = (function () {
        var lexer = { EOF: 1,
            parseError: function parseError(str, hash) {
                if (this.yy.parser) {
                    this.yy.parser.parseError(str, hash);
                } else {
                    throw new Error(str);
                }
            },
            setInput: function setInput(input) {
                this._input = input;
                this._more = this._less = this.done = false;
                this.yylineno = this.yyleng = 0;
                this.yytext = this.matched = this.match = "";
                this.conditionStack = ["INITIAL"];
                this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                if (this.options.ranges) this.yylloc.range = [0, 0];
                this.offset = 0;
                return this;
            },
            input: function input() {
                var ch = this._input[0];
                this.yytext += ch;
                this.yyleng++;
                this.offset++;
                this.match += ch;
                this.matched += ch;
                var lines = ch.match(/(?:\r\n?|\n).*/g);
                if (lines) {
                    this.yylineno++;
                    this.yylloc.last_line++;
                } else {
                    this.yylloc.last_column++;
                }
                if (this.options.ranges) this.yylloc.range[1]++;

                this._input = this._input.slice(1);
                return ch;
            },
            unput: function unput(ch) {
                var len = ch.length;
                var lines = ch.split(/(?:\r\n?|\n)/g);

                this._input = ch + this._input;
                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                //this.yyleng -= len;
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1);
                this.matched = this.matched.substr(0, this.matched.length - 1);

                if (lines.length - 1) this.yylineno -= lines.length - 1;
                var r = this.yylloc.range;

                this.yylloc = { first_line: this.yylloc.first_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.first_column,
                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                };

                if (this.options.ranges) {
                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                }
                return this;
            },
            more: function more() {
                this._more = true;
                return this;
            },
            less: function less(n) {
                this.unput(this.match.slice(n));
            },
            pastInput: function pastInput() {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
            },
            upcomingInput: function upcomingInput() {
                var next = this.match;
                if (next.length < 20) {
                    next += this._input.substr(0, 20 - next.length);
                }
                return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
            },
            showPosition: function showPosition() {
                var pre = this.pastInput();
                var c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
            },
            next: function next() {
                if (this.done) {
                    return this.EOF;
                }
                if (!this._input) this.done = true;

                var token, match, tempMatch, index, col, lines;
                if (!this._more) {
                    this.yytext = "";
                    this.match = "";
                }
                var rules = this._currentRules();
                for (var i = 0; i < rules.length; i++) {
                    tempMatch = this._input.match(this.rules[rules[i]]);
                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                        match = tempMatch;
                        index = i;
                        if (!this.options.flex) break;
                    }
                }
                if (match) {
                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                    if (lines) this.yylineno += lines.length;
                    this.yylloc = { first_line: this.yylloc.last_line,
                        last_line: this.yylineno + 1,
                        first_column: this.yylloc.last_column,
                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
                    this.yytext += match[0];
                    this.match += match[0];
                    this.matches = match;
                    this.yyleng = this.yytext.length;
                    if (this.options.ranges) {
                        this.yylloc.range = [this.offset, this.offset += this.yyleng];
                    }
                    this._more = false;
                    this._input = this._input.slice(match[0].length);
                    this.matched += match[0];
                    token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
                    if (this.done && this._input) this.done = false;
                    if (token) {
                        return token;
                    } else {
                        return;
                    }
                }
                if (this._input === "") {
                    return this.EOF;
                } else {
                    return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
                }
            },
            lex: function lex() {
                var r = this.next();
                if (typeof r !== "undefined") {
                    return r;
                } else {
                    return this.lex();
                }
            },
            begin: function begin(condition) {
                this.conditionStack.push(condition);
            },
            popState: function popState() {
                return this.conditionStack.pop();
            },
            _currentRules: function _currentRules() {
                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
            },
            topState: function topState() {
                return this.conditionStack[this.conditionStack.length - 2];
            },
            pushState: function begin(condition) {
                this.begin(condition);
            } };
        lexer.options = {};
        lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {

            function strip(start, end) {
                return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
            }

            var YYSTATE = YY_START;
            switch ($avoiding_name_collisions) {
                case 0:
                    if (yy_.yytext.slice(-2) === "\\\\") {
                        strip(0, 1);
                        this.begin("mu");
                    } else if (yy_.yytext.slice(-1) === "\\") {
                        strip(0, 1);
                        this.begin("emu");
                    } else {
                        this.begin("mu");
                    }
                    if (yy_.yytext) {
                        return 14;
                    }break;
                case 1:
                    return 14;
                    break;
                case 2:
                    this.popState();
                    return 14;

                    break;
                case 3:
                    yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
                    this.popState();
                    return 16;

                    break;
                case 4:
                    return 14;
                    break;
                case 5:
                    this.popState();
                    return 13;

                    break;
                case 6:
                    return 59;
                    break;
                case 7:
                    return 62;
                    break;
                case 8:
                    return 17;
                    break;
                case 9:
                    this.popState();
                    this.begin("raw");
                    return 21;

                    break;
                case 10:
                    return 53;
                    break;
                case 11:
                    return 27;
                    break;
                case 12:
                    return 45;
                    break;
                case 13:
                    this.popState();return 42;
                    break;
                case 14:
                    this.popState();return 42;
                    break;
                case 15:
                    return 32;
                    break;
                case 16:
                    return 37;
                    break;
                case 17:
                    return 49;
                    break;
                case 18:
                    return 46;
                    break;
                case 19:
                    this.unput(yy_.yytext);
                    this.popState();
                    this.begin("com");

                    break;
                case 20:
                    this.popState();
                    return 13;

                    break;
                case 21:
                    return 46;
                    break;
                case 22:
                    return 67;
                    break;
                case 23:
                    return 66;
                    break;
                case 24:
                    return 66;
                    break;
                case 25:
                    return 81;
                    break;
                case 26:
                    // ignore whitespace
                    break;
                case 27:
                    this.popState();return 52;
                    break;
                case 28:
                    this.popState();return 31;
                    break;
                case 29:
                    yy_.yytext = strip(1, 2).replace(/\\"/g, "\"");return 74;
                    break;
                case 30:
                    yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 74;
                    break;
                case 31:
                    return 79;
                    break;
                case 32:
                    return 76;
                    break;
                case 33:
                    return 76;
                    break;
                case 34:
                    return 77;
                    break;
                case 35:
                    return 78;
                    break;
                case 36:
                    return 75;
                    break;
                case 37:
                    return 69;
                    break;
                case 38:
                    return 71;
                    break;
                case 39:
                    return 66;
                    break;
                case 40:
                    return 66;
                    break;
                case 41:
                    return "INVALID";
                    break;
                case 42:
                    return 5;
                    break;
            }
        };
        lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{\/)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[[^\]]*\])/, /^(?:.)/, /^(?:$)/];
        lexer.conditions = { mu: { rules: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42], inclusive: false }, emu: { rules: [2], inclusive: false }, com: { rules: [5], inclusive: false }, raw: { rules: [3, 4], inclusive: false }, INITIAL: { rules: [0, 1, 42], inclusive: true } };
        return lexer;
    })();
    parser.lexer = lexer;
    function Parser() {
        this.yy = {};
    }Parser.prototype = parser;parser.Parser = Parser;
    return new Parser();
})();exports["default"] = handlebars;
module.exports = exports["default"];
},{}],16:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.print = print;
exports.PrintVisitor = PrintVisitor;
/*eslint-disable new-cap */

var _Visitor = require('./visitor');

var _Visitor2 = _interopRequireWildcard(_Visitor);

function print(ast) {
  return new PrintVisitor().accept(ast);
}

function PrintVisitor() {
  this.padding = 0;
}

PrintVisitor.prototype = new _Visitor2['default']();

PrintVisitor.prototype.pad = function (string) {
  var out = '';

  for (var i = 0, l = this.padding; i < l; i++) {
    out = out + '  ';
  }

  out = out + string + '\n';
  return out;
};

PrintVisitor.prototype.Program = function (program) {
  var out = '',
      body = program.body,
      i = undefined,
      l = undefined;

  if (program.blockParams) {
    var blockParams = 'BLOCK PARAMS: [';
    for (i = 0, l = program.blockParams.length; i < l; i++) {
      blockParams += ' ' + program.blockParams[i];
    }
    blockParams += ' ]';
    out += this.pad(blockParams);
  }

  for (i = 0, l = body.length; i < l; i++) {
    out = out + this.accept(body[i]);
  }

  this.padding--;

  return out;
};

PrintVisitor.prototype.MustacheStatement = function (mustache) {
  return this.pad('{{ ' + this.SubExpression(mustache) + ' }}');
};

PrintVisitor.prototype.BlockStatement = function (block) {
  var out = '';

  out = out + this.pad('BLOCK:');
  this.padding++;
  out = out + this.pad(this.SubExpression(block));
  if (block.program) {
    out = out + this.pad('PROGRAM:');
    this.padding++;
    out = out + this.accept(block.program);
    this.padding--;
  }
  if (block.inverse) {
    if (block.program) {
      this.padding++;
    }
    out = out + this.pad('{{^}}');
    this.padding++;
    out = out + this.accept(block.inverse);
    this.padding--;
    if (block.program) {
      this.padding--;
    }
  }
  this.padding--;

  return out;
};

PrintVisitor.prototype.PartialStatement = function (partial) {
  var content = 'PARTIAL:' + partial.name.original;
  if (partial.params[0]) {
    content += ' ' + this.accept(partial.params[0]);
  }
  if (partial.hash) {
    content += ' ' + this.accept(partial.hash);
  }
  return this.pad('{{> ' + content + ' }}');
};

PrintVisitor.prototype.ContentStatement = function (content) {
  return this.pad('CONTENT[ \'' + content.value + '\' ]');
};

PrintVisitor.prototype.CommentStatement = function (comment) {
  return this.pad('{{! \'' + comment.value + '\' }}');
};

PrintVisitor.prototype.SubExpression = function (sexpr) {
  var params = sexpr.params,
      paramStrings = [],
      hash = undefined;

  for (var i = 0, l = params.length; i < l; i++) {
    paramStrings.push(this.accept(params[i]));
  }

  params = '[' + paramStrings.join(', ') + ']';

  hash = sexpr.hash ? ' ' + this.accept(sexpr.hash) : '';

  return this.accept(sexpr.path) + ' ' + params + hash;
};

PrintVisitor.prototype.PathExpression = function (id) {
  var path = id.parts.join('/');
  return (id.data ? '@' : '') + 'PATH:' + path;
};

PrintVisitor.prototype.StringLiteral = function (string) {
  return '"' + string.value + '"';
};

PrintVisitor.prototype.NumberLiteral = function (number) {
  return 'NUMBER{' + number.value + '}';
};

PrintVisitor.prototype.BooleanLiteral = function (bool) {
  return 'BOOLEAN{' + bool.value + '}';
};

PrintVisitor.prototype.UndefinedLiteral = function () {
  return 'UNDEFINED';
};

PrintVisitor.prototype.NullLiteral = function () {
  return 'NULL';
};

PrintVisitor.prototype.Hash = function (hash) {
  var pairs = hash.pairs,
      joinedPairs = [];

  for (var i = 0, l = pairs.length; i < l; i++) {
    joinedPairs.push(this.accept(pairs[i]));
  }

  return 'HASH{' + joinedPairs.join(', ') + '}';
};
PrintVisitor.prototype.HashPair = function (pair) {
  return pair.key + '=' + this.accept(pair.value);
};
/*eslint-enable new-cap */
},{"./visitor":17}],17:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _Exception = require('../exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _AST = require('./ast');

var _AST2 = _interopRequireWildcard(_AST);

function Visitor() {
  this.parents = [];
}

Visitor.prototype = {
  constructor: Visitor,
  mutating: false,

  // Visits a given value. If mutating, will replace the value if necessary.
  acceptKey: function acceptKey(node, name) {
    var value = this.accept(node[name]);
    if (this.mutating) {
      // Hacky sanity check:
      if (value && (!value.type || !_AST2['default'][value.type])) {
        throw new _Exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
      }
      node[name] = value;
    }
  },

  // Performs an accept operation with added sanity check to ensure
  // required keys are not removed.
  acceptRequired: function acceptRequired(node, name) {
    this.acceptKey(node, name);

    if (!node[name]) {
      throw new _Exception2['default'](node.type + ' requires ' + name);
    }
  },

  // Traverses a given array. If mutating, empty respnses will be removed
  // for child elements.
  acceptArray: function acceptArray(array) {
    for (var i = 0, l = array.length; i < l; i++) {
      this.acceptKey(array, i);

      if (!array[i]) {
        array.splice(i, 1);
        i--;
        l--;
      }
    }
  },

  accept: function accept(object) {
    if (!object) {
      return;
    }

    if (this.current) {
      this.parents.unshift(this.current);
    }
    this.current = object;

    var ret = this[object.type](object);

    this.current = this.parents.shift();

    if (!this.mutating || ret) {
      return ret;
    } else if (ret !== false) {
      return object;
    }
  },

  Program: function Program(program) {
    this.acceptArray(program.body);
  },

  MustacheStatement: function MustacheStatement(mustache) {
    this.acceptRequired(mustache, 'path');
    this.acceptArray(mustache.params);
    this.acceptKey(mustache, 'hash');
  },

  BlockStatement: function BlockStatement(block) {
    this.acceptRequired(block, 'path');
    this.acceptArray(block.params);
    this.acceptKey(block, 'hash');

    this.acceptKey(block, 'program');
    this.acceptKey(block, 'inverse');
  },

  PartialStatement: function PartialStatement(partial) {
    this.acceptRequired(partial, 'name');
    this.acceptArray(partial.params);
    this.acceptKey(partial, 'hash');
  },

  ContentStatement: function ContentStatement() {},
  CommentStatement: function CommentStatement() {},

  SubExpression: function SubExpression(sexpr) {
    this.acceptRequired(sexpr, 'path');
    this.acceptArray(sexpr.params);
    this.acceptKey(sexpr, 'hash');
  },

  PathExpression: function PathExpression() {},

  StringLiteral: function StringLiteral() {},
  NumberLiteral: function NumberLiteral() {},
  BooleanLiteral: function BooleanLiteral() {},
  UndefinedLiteral: function UndefinedLiteral() {},
  NullLiteral: function NullLiteral() {},

  Hash: function Hash(hash) {
    this.acceptArray(hash.pairs);
  },
  HashPair: function HashPair(pair) {
    this.acceptRequired(pair, 'value');
  }
};

exports['default'] = Visitor;
module.exports = exports['default'];
/* content */ /* comment */ /* path */ /* string */ /* number */ /* bool */ /* literal */ /* literal */
},{"../exception":19,"./ast":9}],18:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;

var _Visitor = require('./visitor');

var _Visitor2 = _interopRequireWildcard(_Visitor);

function WhitespaceControl() {}
WhitespaceControl.prototype = new _Visitor2['default']();

WhitespaceControl.prototype.Program = function (program) {
  var isRoot = !this.isRootSeen;
  this.isRootSeen = true;

  var body = program.body;
  for (var i = 0, l = body.length; i < l; i++) {
    var current = body[i],
        strip = this.accept(current);

    if (!strip) {
      continue;
    }

    var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
        _isNextWhitespace = isNextWhitespace(body, i, isRoot),
        openStandalone = strip.openStandalone && _isPrevWhitespace,
        closeStandalone = strip.closeStandalone && _isNextWhitespace,
        inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

    if (strip.close) {
      omitRight(body, i, true);
    }
    if (strip.open) {
      omitLeft(body, i, true);
    }

    if (inlineStandalone) {
      omitRight(body, i);

      if (omitLeft(body, i)) {
        // If we are on a standalone node, save the indent info for partials
        if (current.type === 'PartialStatement') {
          // Pull out the whitespace from the final line
          current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
        }
      }
    }
    if (openStandalone) {
      omitRight((current.program || current.inverse).body);

      // Strip out the previous content node if it's whitespace only
      omitLeft(body, i);
    }
    if (closeStandalone) {
      // Always strip the next node
      omitRight(body, i);

      omitLeft((current.inverse || current.program).body);
    }
  }

  return program;
};
WhitespaceControl.prototype.BlockStatement = function (block) {
  this.accept(block.program);
  this.accept(block.inverse);

  // Find the inverse program that is involed with whitespace stripping.
  var program = block.program || block.inverse,
      inverse = block.program && block.inverse,
      firstInverse = inverse,
      lastInverse = inverse;

  if (inverse && inverse.chained) {
    firstInverse = inverse.body[0].program;

    // Walk the inverse chain to find the last inverse that is actually in the chain.
    while (lastInverse.chained) {
      lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
    }
  }

  var strip = {
    open: block.openStrip.open,
    close: block.closeStrip.close,

    // Determine the standalone candiacy. Basically flag our content as being possibly standalone
    // so our parent can determine if we actually are standalone
    openStandalone: isNextWhitespace(program.body),
    closeStandalone: isPrevWhitespace((firstInverse || program).body)
  };

  if (block.openStrip.close) {
    omitRight(program.body, null, true);
  }

  if (inverse) {
    var inverseStrip = block.inverseStrip;

    if (inverseStrip.open) {
      omitLeft(program.body, null, true);
    }

    if (inverseStrip.close) {
      omitRight(firstInverse.body, null, true);
    }
    if (block.closeStrip.open) {
      omitLeft(lastInverse.body, null, true);
    }

    // Find standalone else statments
    if (isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
      omitLeft(program.body);
      omitRight(firstInverse.body);
    }
  } else if (block.closeStrip.open) {
    omitLeft(program.body, null, true);
  }

  return strip;
};

WhitespaceControl.prototype.MustacheStatement = function (mustache) {
  return mustache.strip;
};

WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
  /* istanbul ignore next */
  var strip = node.strip || {};
  return {
    inlineStandalone: true,
    open: strip.open,
    close: strip.close
  };
};

function isPrevWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = body.length;
  }

  // Nodes that end with newlines are considered whitespace (but are special
  // cased for strip operations)
  var prev = body[i - 1],
      sibling = body[i - 2];
  if (!prev) {
    return isRoot;
  }

  if (prev.type === 'ContentStatement') {
    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
  }
}
function isNextWhitespace(body, i, isRoot) {
  if (i === undefined) {
    i = -1;
  }

  var next = body[i + 1],
      sibling = body[i + 2];
  if (!next) {
    return isRoot;
  }

  if (next.type === 'ContentStatement') {
    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
  }
}

// Marks the node to the right of the position as omitted.
// I.e. {{foo}}' ' will mark the ' ' node as omitted.
//
// If i is undefined, then the first child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitRight(body, i, multiple) {
  var current = body[i == null ? 0 : i + 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
    return;
  }

  var original = current.value;
  current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
  current.rightStripped = current.value !== original;
}

// Marks the node to the left of the position as omitted.
// I.e. ' '{{foo}} will mark the ' ' node as omitted.
//
// If i is undefined then the last child will be marked as such.
//
// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
// content is met.
function omitLeft(body, i, multiple) {
  var current = body[i == null ? body.length - 1 : i - 1];
  if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
    return;
  }

  // We omit the last node if it's whitespace only and not preceeded by a non-content node.
  var original = current.value;
  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
  current.leftStripped = current.value !== original;
  return current.leftStripped;
}

exports['default'] = WhitespaceControl;
module.exports = exports['default'];
},{"./visitor":17}],19:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

function Exception(message, node) {
  var loc = node && node.loc,
      line = undefined,
      column = undefined;
  if (loc) {
    line = loc.start.line;
    column = loc.start.column;

    message += ' - ' + line + ':' + column;
  }

  var tmp = Error.prototype.constructor.call(this, message);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Exception);
  }

  if (loc) {
    this.lineNumber = line;
    this.column = column;
  }
}

Exception.prototype = new Error();

exports['default'] = Exception;
module.exports = exports['default'];
},{}],20:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;
/*global window */

exports['default'] = function (Handlebars) {
  /* istanbul ignore next */
  var root = typeof global !== 'undefined' ? global : window,
      $Handlebars = root.Handlebars;
  /* istanbul ignore next */
  Handlebars.noConflict = function () {
    if (root.Handlebars === Handlebars) {
      root.Handlebars = $Handlebars;
    }
  };
};

module.exports = exports['default'];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],21:[function(require,module,exports){
'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

exports.__esModule = true;
exports.checkRevision = checkRevision;

// TODO: Remove this line and break up compilePartial

exports.template = template;
exports.wrapProgram = wrapProgram;
exports.resolvePartial = resolvePartial;
exports.invokePartial = invokePartial;
exports.noop = noop;

var _import = require('./utils');

var Utils = _interopRequireWildcard(_import);

var _Exception = require('./exception');

var _Exception2 = _interopRequireWildcard(_Exception);

var _COMPILER_REVISION$REVISION_CHANGES$createFrame = require('./base');

function checkRevision(compilerInfo) {
  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
      currentRevision = _COMPILER_REVISION$REVISION_CHANGES$createFrame.COMPILER_REVISION;

  if (compilerRevision !== currentRevision) {
    if (compilerRevision < currentRevision) {
      var runtimeVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[currentRevision],
          compilerVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[compilerRevision];
      throw new _Exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
    } else {
      // Use the embedded version info since the runtime doesn't know about this revision yet
      throw new _Exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
    }
  }
}

function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new _Exception2['default']('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new _Exception2['default']('Unknown template object: ' + typeof templateSpec);
  }

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as psuedo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
    }

    partial = env.VM.resolvePartial.call(this, partial, context, options);
    var result = env.VM.invokePartial.call(this, partial, context, options);

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
      result = options.partials[options.name](context, options);
    }
    if (result != null) {
      if (options.indent) {
        var lines = result.split('\n');
        for (var i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new _Exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
    }
  }

  // Just add water
  var container = {
    strict: function strict(obj, name) {
      if (!(name in obj)) {
        throw new _Exception2['default']('"' + name + '" not defined in ' + obj);
      }
      return obj[name];
    },
    lookup: function lookup(depths, name) {
      var len = depths.length;
      for (var i = 0; i < len; i++) {
        if (depths[i] && depths[i][name] != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function lambda(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function fn(i) {
      return templateSpec[i];
    },

    programs: [],
    program: function program(i, data, declaredBlockParams, blockParams, depths) {
      var programWrapper = this.programs[i],
          fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function data(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    merge: function merge(param, common) {
      var obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context) {
    var options = arguments[1] === undefined ? {} : arguments[1];

    var data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    var depths = undefined,
        blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      depths = options.depths ? [context].concat(options.depths) : [context];
    }

    return templateSpec.main.call(container, context, container.helpers, container.partials, data, blockParams, depths);
  }
  ret.isTop = true;

  ret._setup = function (options) {
    if (!options.partial) {
      container.helpers = container.merge(options.helpers, env.helpers);

      if (templateSpec.usePartial) {
        container.partials = container.merge(options.partials, env.partials);
      }
    } else {
      container.helpers = options.helpers;
      container.partials = options.partials;
    }
  };

  ret._child = function (i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new _Exception2['default']('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new _Exception2['default']('must pass parent depths');
    }

    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
  };
  return ret;
}

function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
  function prog(context) {
    var options = arguments[1] === undefined ? {} : arguments[1];

    return fn.call(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), depths && [context].concat(depths));
  }
  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

function resolvePartial(partial, context, options) {
  if (!partial) {
    partial = options.partials[options.name];
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

function invokePartial(partial, context, options) {
  options.partial = true;

  if (partial === undefined) {
    throw new _Exception2['default']('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? _COMPILER_REVISION$REVISION_CHANGES$createFrame.createFrame(data) : {};
    data.root = context;
  }
  return data;
}
},{"./base":8,"./exception":19,"./utils":23}],22:[function(require,module,exports){
'use strict';

exports.__esModule = true;
// Build out our basic SafeString type
function SafeString(string) {
  this.string = string;
}

SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
  return '' + this.string;
};

exports['default'] = SafeString;
module.exports = exports['default'];
},{}],23:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.extend = extend;

// Older IE versions do not directly support indexOf so we must implement our own, sadly.
exports.indexOf = indexOf;
exports.escapeExpression = escapeExpression;
exports.isEmpty = isEmpty;
exports.blockParams = blockParams;
exports.appendContextPath = appendContextPath;
var escape = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#x27;',
  '`': '&#x60;'
};

var badChars = /[&<>"'`]/g,
    possible = /[&<>"'`]/;

function escapeChar(chr) {
  return escape[chr];
}

function extend(obj /* , ...source */) {
  for (var i = 1; i < arguments.length; i++) {
    for (var key in arguments[i]) {
      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
        obj[key] = arguments[i][key];
      }
    }
  }

  return obj;
}

var toString = Object.prototype.toString;

exports.toString = toString;
// Sourced from lodash
// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
/*eslint-disable func-style, no-var */
var isFunction = function isFunction(value) {
  return typeof value === 'function';
};
// fallback for older versions of Chrome and Safari
/* istanbul ignore next */
if (isFunction(/x/)) {
  exports.isFunction = isFunction = function (value) {
    return typeof value === 'function' && toString.call(value) === '[object Function]';
  };
}
var isFunction;
exports.isFunction = isFunction;
/*eslint-enable func-style, no-var */

/* istanbul ignore next */
var isArray = Array.isArray || function (value) {
  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
};exports.isArray = isArray;

function indexOf(array, value) {
  for (var i = 0, len = array.length; i < len; i++) {
    if (array[i] === value) {
      return i;
    }
  }
  return -1;
}

function escapeExpression(string) {
  if (typeof string !== 'string') {
    // don't escape SafeStrings, since they're already safe
    if (string && string.toHTML) {
      return string.toHTML();
    } else if (string == null) {
      return '';
    } else if (!string) {
      return string + '';
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = '' + string;
  }

  if (!possible.test(string)) {
    return string;
  }
  return string.replace(badChars, escapeChar);
}

function isEmpty(value) {
  if (!value && value !== 0) {
    return true;
  } else if (isArray(value) && value.length === 0) {
    return true;
  } else {
    return false;
  }
}

function blockParams(params, ids) {
  params.path = ids;
  return params;
}

function appendContextPath(contextPath, id) {
  return (contextPath ? contextPath + '.' : '') + id;
}
},{}],24:[function(require,module,exports){
// USAGE:
// var handlebars = require('handlebars');
/* eslint-disable no-var */

// var local = handlebars.create();

var handlebars = require('../dist/cjs/handlebars')['default'];

var printer = require('../dist/cjs/handlebars/compiler/printer');
handlebars.PrintVisitor = printer.PrintVisitor;
handlebars.print = printer.print;

module.exports = handlebars;

// Publish a Node.js require() handler for .handlebars and .hbs files
function extension(module, filename) {
  var fs = require('fs');
  var templateString = fs.readFileSync(filename, 'utf8');
  module.exports = handlebars.compile(templateString);
}
/* istanbul ignore else */
if (typeof require !== 'undefined' && require.extensions) {
  require.extensions['.handlebars'] = extension;
  require.extensions['.hbs'] = extension;
}

},{"../dist/cjs/handlebars":6,"../dist/cjs/handlebars/compiler/printer":16,"fs":3}],25:[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./source-map/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./source-map/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./source-map/source-node').SourceNode;

},{"./source-map/source-map-consumer":31,"./source-map/source-map-generator":32,"./source-map/source-node":33}],26:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * A data structure which is a combination of an array and a set. Adding a new
   * member is O(1), testing for membership is O(1), and finding the index of an
   * element is O(1). Removing elements from the set is not supported. Only
   * strings are supported for membership.
   */
  function ArraySet() {
    this._array = [];
    this._set = {};
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var isDuplicate = this.has(aStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set[util.toSetString(aStr)] = idx;
    }
  };

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    return Object.prototype.hasOwnProperty.call(this._set,
                                                util.toSetString(aStr));
  };

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (this.has(aStr)) {
      return this._set[util.toSetString(aStr)];
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error('No element indexed by ' + aIdx);
  };

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };

  exports.ArraySet = ArraySet;

});

},{"./util":34,"amdefine":35}],27:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64 = require('./base64');

  // A single base 64 digit can contain 6 bits of data. For the base 64 variable
  // length quantities we use in the source map spec, the first bit is the sign,
  // the next four bits are the actual value, and the 6th bit is the
  // continuation bit. The continuation bit tells us whether there are more
  // digits in this value following this digit.
  //
  //   Continuation
  //   |    Sign
  //   |    |
  //   V    V
  //   101011

  var VLQ_BASE_SHIFT = 5;

  // binary: 100000
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

  // binary: 011111
  var VLQ_BASE_MASK = VLQ_BASE - 1;

  // binary: 100000
  var VLQ_CONTINUATION_BIT = VLQ_BASE;

  /**
   * Converts from a two-complement value to a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
   *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
   */
  function toVLQSigned(aValue) {
    return aValue < 0
      ? ((-aValue) << 1) + 1
      : (aValue << 1) + 0;
  }

  /**
   * Converts to a two-complement value from a value where the sign bit is
   * placed in the least significant bit.  For example, as decimals:
   *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
   *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
   */
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative
      ? -shifted
      : shifted;
  }

  /**
   * Returns the base 64 VLQ encoded value.
   */
  exports.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;

    var vlq = toVLQSigned(aValue);

    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        // There are still more digits in this value, so we must make sure the
        // continuation bit is marked.
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);

    return encoded;
  };

  /**
   * Decodes the next base 64 VLQ value from the given string and returns the
   * value and the rest of the string via the out parameter.
   */
  exports.decode = function base64VLQ_decode(aStr, aOutParam) {
    var i = 0;
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;

    do {
      if (i >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }
      digit = base64.decode(aStr.charAt(i++));
      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);

    aOutParam.value = fromVLQSigned(result);
    aOutParam.rest = aStr.slice(i);
  };

});

},{"./base64":28,"amdefine":35}],28:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var charToIntMap = {};
  var intToCharMap = {};

  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .forEach(function (ch, index) {
      charToIntMap[ch] = index;
      intToCharMap[index] = ch;
    });

  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  exports.encode = function base64_encode(aNumber) {
    if (aNumber in intToCharMap) {
      return intToCharMap[aNumber];
    }
    throw new TypeError("Must be between 0 and 63: " + aNumber);
  };

  /**
   * Decode a single base 64 digit to an integer.
   */
  exports.decode = function base64_decode(aChar) {
    if (aChar in charToIntMap) {
      return charToIntMap[aChar];
    }
    throw new TypeError("Not a valid base 64 digit: " + aChar);
  };

});

},{"amdefine":35}],29:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   */
  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the index of
    //      the next closest element that is less than that element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element which is less than the one we are searching for, so we
    //      return -1.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
      // Found the element we are looking for.
      return mid;
    }
    else if (cmp > 0) {
      // aHaystack[mid] is greater than our needle.
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
      }
      // We did not find an exact match, return the next closest one
      // (termination case 2).
      return mid;
    }
    else {
      // aHaystack[mid] is less than our needle.
      if (mid - aLow > 1) {
        // The element is in the lower half.
        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
      }
      // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (2) or (3) and return the appropriate thing.
      return aLow < 0 ? -1 : aLow;
    }
  }

  /**
   * This is an implementation of binary search which will always try and return
   * the index of next lowest value checked if there is no exact hit. This is
   * because mappings between original and generated line/col pairs are single
   * points, and there is an implicit region between each of them, so a miss
   * just means that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   */
  exports.search = function search(aNeedle, aHaystack, aCompare) {
    if (aHaystack.length === 0) {
      return -1;
    }
    return recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare)
  };

});

},{"amdefine":35}],30:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2014 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * Determine whether mappingB is after mappingA with respect to generated
   * position.
   */
  function generatedPositionAfter(mappingA, mappingB) {
    // Optimized for most common case
    var lineA = mappingA.generatedLine;
    var lineB = mappingB.generatedLine;
    var columnA = mappingA.generatedColumn;
    var columnB = mappingB.generatedColumn;
    return lineB > lineA || lineB == lineA && columnB >= columnA ||
           util.compareByGeneratedPositions(mappingA, mappingB) <= 0;
  }

  /**
   * A data structure to provide a sorted view of accumulated mappings in a
   * performance conscious manner. It trades a neglibable overhead in general
   * case for a large speedup in case of mappings being added in order.
   */
  function MappingList() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = {generatedLine: -1, generatedColumn: 0};
  }

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  MappingList.prototype.unsortedForEach =
    function MappingList_forEach(aCallback, aThisArg) {
      this._array.forEach(aCallback, aThisArg);
    };

  /**
   * Add the given source mapping.
   *
   * @param Object aMapping
   */
  MappingList.prototype.add = function MappingList_add(aMapping) {
    var mapping;
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  };

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  MappingList.prototype.toArray = function MappingList_toArray() {
    if (!this._sorted) {
      this._array.sort(util.compareByGeneratedPositions);
      this._sorted = true;
    }
    return this._array;
  };

  exports.MappingList = MappingList;

});

},{"./util":34,"amdefine":35}],31:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');
  var binarySearch = require('./binary-search');
  var ArraySet = require('./array-set').ArraySet;
  var base64VLQ = require('./base64-vlq');

  /**
   * A SourceMapConsumer instance represents a parsed source map which we can
   * query for information about the original file positions by giving it a file
   * position in the generated source.
   *
   * The only parameter is the raw source map (either as a JSON string, or
   * already parsed to an object). According to the spec, source maps have the
   * following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - sources: An array of URLs to the original source files.
   *   - names: An array of identifiers which can be referrenced by individual mappings.
   *   - sourceRoot: Optional. The URL root from which all sources are relative.
   *   - sourcesContent: Optional. An array of contents of the original source files.
   *   - mappings: A string of base64 VLQs which contain the actual mappings.
   *   - file: Optional. The generated file this source map is associated with.
   *
   * Here is an example source map, taken from the source map spec[0]:
   *
   *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
   */
  function SourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sources = util.getArg(sourceMap, 'sources');
    // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
    // requires the array) to play nice here.
    var names = util.getArg(sourceMap, 'names', []);
    var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
    var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
    var mappings = util.getArg(sourceMap, 'mappings');
    var file = util.getArg(sourceMap, 'file', null);

    // Once again, Sass deviates from the spec and supplies the version as a
    // string rather than a number, so we use loose equality checking here.
    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    // Some source maps produce relative source paths like "./foo.js" instead of
    // "foo.js".  Normalize these first so that future comparisons will succeed.
    // See bugzil.la/1090768.
    sources = sources.map(util.normalize);

    // Pass `true` below to allow duplicate names and sources. While source maps
    // are intended to be compressed and deduplicated, the TypeScript compiler
    // sometimes generates source maps with duplicates in them. See Github issue
    // #72 and bugzil.la/889492.
    this._names = ArraySet.fromArray(names, true);
    this._sources = ArraySet.fromArray(sources, true);

    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this.file = file;
  }

  /**
   * Create a SourceMapConsumer from a SourceMapGenerator.
   *
   * @param SourceMapGenerator aSourceMap
   *        The source map that will be consumed.
   * @returns SourceMapConsumer
   */
  SourceMapConsumer.fromSourceMap =
    function SourceMapConsumer_fromSourceMap(aSourceMap) {
      var smc = Object.create(SourceMapConsumer.prototype);

      smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                              smc.sourceRoot);
      smc.file = aSourceMap._file;

      smc.__generatedMappings = aSourceMap._mappings.toArray().slice();
      smc.__originalMappings = aSourceMap._mappings.toArray().slice()
        .sort(util.compareByOriginalPositions);

      return smc;
    };

  /**
   * The version of the source mapping spec that we are consuming.
   */
  SourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
    get: function () {
      return this._sources.toArray().map(function (s) {
        return this.sourceRoot != null ? util.join(this.sourceRoot, s) : s;
      }, this);
    }
  });

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.

  SourceMapConsumer.prototype.__generatedMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
    get: function () {
      if (!this.__generatedMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__generatedMappings;
    }
  });

  SourceMapConsumer.prototype.__originalMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
    get: function () {
      if (!this.__originalMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__originalMappings;
    }
  });

  SourceMapConsumer.prototype._nextCharIsMappingSeparator =
    function SourceMapConsumer_nextCharIsMappingSeparator(aStr) {
      var c = aStr.charAt(0);
      return c === ";" || c === ",";
    };

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  SourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var str = aStr;
      var temp = {};
      var mapping;

      while (str.length > 0) {
        if (str.charAt(0) === ';') {
          generatedLine++;
          str = str.slice(1);
          previousGeneratedColumn = 0;
        }
        else if (str.charAt(0) === ',') {
          str = str.slice(1);
        }
        else {
          mapping = {};
          mapping.generatedLine = generatedLine;

          // Generated column.
          base64VLQ.decode(str, temp);
          mapping.generatedColumn = previousGeneratedColumn + temp.value;
          previousGeneratedColumn = mapping.generatedColumn;
          str = temp.rest;

          if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
            // Original source.
            base64VLQ.decode(str, temp);
            mapping.source = this._sources.at(previousSource + temp.value);
            previousSource += temp.value;
            str = temp.rest;
            if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
              throw new Error('Found a source, but no line and column');
            }

            // Original line.
            base64VLQ.decode(str, temp);
            mapping.originalLine = previousOriginalLine + temp.value;
            previousOriginalLine = mapping.originalLine;
            // Lines are stored 0-based
            mapping.originalLine += 1;
            str = temp.rest;
            if (str.length === 0 || this._nextCharIsMappingSeparator(str)) {
              throw new Error('Found a source and line, but no column');
            }

            // Original column.
            base64VLQ.decode(str, temp);
            mapping.originalColumn = previousOriginalColumn + temp.value;
            previousOriginalColumn = mapping.originalColumn;
            str = temp.rest;

            if (str.length > 0 && !this._nextCharIsMappingSeparator(str)) {
              // Original name.
              base64VLQ.decode(str, temp);
              mapping.name = this._names.at(previousName + temp.value);
              previousName += temp.value;
              str = temp.rest;
            }
          }

          this.__generatedMappings.push(mapping);
          if (typeof mapping.originalLine === 'number') {
            this.__originalMappings.push(mapping);
          }
        }
      }

      this.__generatedMappings.sort(util.compareByGeneratedPositions);
      this.__originalMappings.sort(util.compareByOriginalPositions);
    };

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  SourceMapConsumer.prototype._findMapping =
    function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                           aColumnName, aComparator) {
      // To return the position we are searching for, we must first find the
      // mapping for the given position and then return the opposite position it
      // points to. Because the mappings are sorted, we can use binary search to
      // find the best mapping.

      if (aNeedle[aLineName] <= 0) {
        throw new TypeError('Line must be greater than or equal to 1, got '
                            + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError('Column must be greater than or equal to 0, got '
                            + aNeedle[aColumnName]);
      }

      return binarySearch.search(aNeedle, aMappings, aComparator);
    };

  /**
   * Compute the last column for each generated mapping. The last column is
   * inclusive.
   */
  SourceMapConsumer.prototype.computeColumnSpans =
    function SourceMapConsumer_computeColumnSpans() {
      for (var index = 0; index < this._generatedMappings.length; ++index) {
        var mapping = this._generatedMappings[index];

        // Mappings do not contain a field for the last generated columnt. We
        // can come up with an optimistic estimate, however, by assuming that
        // mappings are contiguous (i.e. given two consecutive mappings, the
        // first mapping ends where the second one starts).
        if (index + 1 < this._generatedMappings.length) {
          var nextMapping = this._generatedMappings[index + 1];

          if (mapping.generatedLine === nextMapping.generatedLine) {
            mapping.lastGeneratedColumn = nextMapping.generatedColumn - 1;
            continue;
          }
        }

        // The last mapping for each line spans the entire line.
        mapping.lastGeneratedColumn = Infinity;
      }
    };

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  SourceMapConsumer.prototype.originalPositionFor =
    function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      var index = this._findMapping(needle,
                                    this._generatedMappings,
                                    "generatedLine",
                                    "generatedColumn",
                                    util.compareByGeneratedPositions);

      if (index >= 0) {
        var mapping = this._generatedMappings[index];

        if (mapping.generatedLine === needle.generatedLine) {
          var source = util.getArg(mapping, 'source', null);
          if (source != null && this.sourceRoot != null) {
            source = util.join(this.sourceRoot, source);
          }
          return {
            source: source,
            line: util.getArg(mapping, 'originalLine', null),
            column: util.getArg(mapping, 'originalColumn', null),
            name: util.getArg(mapping, 'name', null)
          };
        }
      }

      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * availible.
   */
  SourceMapConsumer.prototype.sourceContentFor =
    function SourceMapConsumer_sourceContentFor(aSource) {
      if (!this.sourcesContent) {
        return null;
      }

      if (this.sourceRoot != null) {
        aSource = util.relative(this.sourceRoot, aSource);
      }

      if (this._sources.has(aSource)) {
        return this.sourcesContent[this._sources.indexOf(aSource)];
      }

      var url;
      if (this.sourceRoot != null
          && (url = util.urlParse(this.sourceRoot))) {
        // XXX: file:// URIs and absolute paths lead to unexpected behavior for
        // many users. We can help them out when they expect file:// URIs to
        // behave like it would if they were running a local HTTP server. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
        var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
        if (url.scheme == "file"
            && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
        }

        if ((!url.path || url.path == "/")
            && this._sources.has("/" + aSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + aSource)];
        }
      }

      throw new Error('"' + aSource + '" is not in the SourceMap.');
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.generatedPositionFor =
    function SourceMapConsumer_generatedPositionFor(aArgs) {
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: util.getArg(aArgs, 'column')
      };

      if (this.sourceRoot != null) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }

      var index = this._findMapping(needle,
                                    this._originalMappings,
                                    "originalLine",
                                    "originalColumn",
                                    util.compareByOriginalPositions);

      if (index >= 0) {
        var mapping = this._originalMappings[index];

        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null),
          lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
        };
      }

      return {
        line: null,
        column: null,
        lastColumn: null
      };
    };

  /**
   * Returns all generated line and column information for the original source
   * and line provided. The only argument is an object with the following
   * properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *
   * and an array of objects is returned, each with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.allGeneratedPositionsFor =
    function SourceMapConsumer_allGeneratedPositionsFor(aArgs) {
      // When there is no exact match, SourceMapConsumer.prototype._findMapping
      // returns the index of the closest mapping less than the needle. By
      // setting needle.originalColumn to Infinity, we thus find the last
      // mapping for the given line, provided such a mapping exists.
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: Infinity
      };

      if (this.sourceRoot != null) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }

      var mappings = [];

      var index = this._findMapping(needle,
                                    this._originalMappings,
                                    "originalLine",
                                    "originalColumn",
                                    util.compareByOriginalPositions);
      if (index >= 0) {
        var mapping = this._originalMappings[index];

        while (mapping && mapping.originalLine === needle.originalLine) {
          mappings.push({
            line: util.getArg(mapping, 'generatedLine', null),
            column: util.getArg(mapping, 'generatedColumn', null),
            lastColumn: util.getArg(mapping, 'lastGeneratedColumn', null)
          });

          mapping = this._originalMappings[--index];
        }
      }

      return mappings.reverse();
    };

  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *        The function that is called with each mapping.
   * @param Object aContext
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `aCallback` is called.
   * @param aOrder
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  SourceMapConsumer.prototype.eachMapping =
    function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

      var mappings;
      switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
      }

      var sourceRoot = this.sourceRoot;
      mappings.map(function (mapping) {
        var source = mapping.source;
        if (source != null && sourceRoot != null) {
          source = util.join(sourceRoot, source);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name
        };
      }).forEach(aCallback, context);
    };

  exports.SourceMapConsumer = SourceMapConsumer;

});

},{"./array-set":26,"./base64-vlq":27,"./binary-search":29,"./util":34,"amdefine":35}],32:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64VLQ = require('./base64-vlq');
  var util = require('./util');
  var ArraySet = require('./array-set').ArraySet;
  var MappingList = require('./mapping-list').MappingList;

  /**
   * An instance of the SourceMapGenerator represents a source map which is
   * being built incrementally. You may pass an object with the following
   * properties:
   *
   *   - file: The filename of the generated source.
   *   - sourceRoot: A root for all relative URLs in this source map.
   */
  function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util.getArg(aArgs, 'file', null);
    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
    this._skipValidation = util.getArg(aArgs, 'skipValidation', false);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = new MappingList();
    this._sourcesContents = null;
  }

  SourceMapGenerator.prototype._version = 3;

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  SourceMapGenerator.fromSourceMap =
    function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator({
        file: aSourceMapConsumer.file,
        sourceRoot: sourceRoot
      });
      aSourceMapConsumer.eachMapping(function (mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };

        if (mapping.source != null) {
          newMapping.source = mapping.source;
          if (sourceRoot != null) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }

          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };

          if (mapping.name != null) {
            newMapping.name = mapping.name;
          }
        }

        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  SourceMapGenerator.prototype.addMapping =
    function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, 'generated');
      var original = util.getArg(aArgs, 'original', null);
      var source = util.getArg(aArgs, 'source', null);
      var name = util.getArg(aArgs, 'name', null);

      if (!this._skipValidation) {
        this._validateMapping(generated, original, source, name);
      }

      if (source != null && !this._sources.has(source)) {
        this._sources.add(source);
      }

      if (name != null && !this._names.has(name)) {
        this._names.add(name);
      }

      this._mappings.add({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source: source,
        name: name
      });
    };

  /**
   * Set the source content for a source file.
   */
  SourceMapGenerator.prototype.setSourceContent =
    function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot != null) {
        source = util.relative(this._sourceRoot, source);
      }

      if (aSourceContent != null) {
        // Add the source content to the _sourcesContents map.
        // Create a new _sourcesContents map if the property is null.
        if (!this._sourcesContents) {
          this._sourcesContents = {};
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else if (this._sourcesContents) {
        // Remove the source file from the _sourcesContents map.
        // If the _sourcesContents map is empty, set the property to null.
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  SourceMapGenerator.prototype.applySourceMap =
    function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      var sourceFile = aSourceFile;
      // If aSourceFile is omitted, we will use the file property of the SourceMap
      if (aSourceFile == null) {
        if (aSourceMapConsumer.file == null) {
          throw new Error(
            'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
            'or the source map\'s "file" property. Both were omitted.'
          );
        }
        sourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      // Make "sourceFile" relative if an absolute Url is passed.
      if (sourceRoot != null) {
        sourceFile = util.relative(sourceRoot, sourceFile);
      }
      // Applying the SourceMap can add and remove items from the sources and
      // the names array.
      var newSources = new ArraySet();
      var newNames = new ArraySet();

      // Find mappings for the "sourceFile"
      this._mappings.unsortedForEach(function (mapping) {
        if (mapping.source === sourceFile && mapping.originalLine != null) {
          // Check if it can be mapped by the source map, then update the mapping.
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source != null) {
            // Copy mapping
            mapping.source = original.source;
            if (aSourceMapPath != null) {
              mapping.source = util.join(aSourceMapPath, mapping.source)
            }
            if (sourceRoot != null) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name != null) {
              mapping.name = original.name;
            }
          }
        }

        var source = mapping.source;
        if (source != null && !newSources.has(source)) {
          newSources.add(source);
        }

        var name = mapping.name;
        if (name != null && !newNames.has(name)) {
          newNames.add(name);
        }

      }, this);
      this._sources = newSources;
      this._names = newNames;

      // Copy sourcesContents of applied map.
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aSourceMapPath != null) {
            sourceFile = util.join(aSourceMapPath, sourceFile);
          }
          if (sourceRoot != null) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          this.setSourceContent(sourceFile, content);
        }
      }, this);
    };

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  SourceMapGenerator.prototype._validateMapping =
    function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                                aName) {
      if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
          && aGenerated.line > 0 && aGenerated.column >= 0
          && !aOriginal && !aSource && !aName) {
        // Case 1.
        return;
      }
      else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
               && aOriginal && 'line' in aOriginal && 'column' in aOriginal
               && aGenerated.line > 0 && aGenerated.column >= 0
               && aOriginal.line > 0 && aOriginal.column >= 0
               && aSource) {
        // Cases 2 and 3.
        return;
      }
      else {
        throw new Error('Invalid mapping: ' + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        }));
      }
    };

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  SourceMapGenerator.prototype._serializeMappings =
    function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = '';
      var mapping;

      var mappings = this._mappings.toArray();

      for (var i = 0, len = mappings.length; i < len; i++) {
        mapping = mappings[i];

        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            result += ';';
            previousGeneratedLine++;
          }
        }
        else {
          if (i > 0) {
            if (!util.compareByGeneratedPositions(mapping, mappings[i - 1])) {
              continue;
            }
            result += ',';
          }
        }

        result += base64VLQ.encode(mapping.generatedColumn
                                   - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;

        if (mapping.source != null) {
          result += base64VLQ.encode(this._sources.indexOf(mapping.source)
                                     - previousSource);
          previousSource = this._sources.indexOf(mapping.source);

          // lines are stored 0-based in SourceMap spec version 3
          result += base64VLQ.encode(mapping.originalLine - 1
                                     - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;

          result += base64VLQ.encode(mapping.originalColumn
                                     - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;

          if (mapping.name != null) {
            result += base64VLQ.encode(this._names.indexOf(mapping.name)
                                       - previousName);
            previousName = this._names.indexOf(mapping.name);
          }
        }
      }

      return result;
    };

  SourceMapGenerator.prototype._generateSourcesContent =
    function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function (source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot != null) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents,
                                                    key)
          ? this._sourcesContents[key]
          : null;
      }, this);
    };

  /**
   * Externalize the source map.
   */
  SourceMapGenerator.prototype.toJSON =
    function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._file != null) {
        map.file = this._file;
      }
      if (this._sourceRoot != null) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }

      return map;
    };

  /**
   * Render the source map being generated to a string.
   */
  SourceMapGenerator.prototype.toString =
    function SourceMapGenerator_toString() {
      return JSON.stringify(this);
    };

  exports.SourceMapGenerator = SourceMapGenerator;

});

},{"./array-set":26,"./base64-vlq":27,"./mapping-list":30,"./util":34,"amdefine":35}],33:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
  var util = require('./util');

  // Matches a Windows-style `\r\n` newline or a `\n` newline used by all other
  // operating systems these days (capturing the result).
  var REGEX_NEWLINE = /(\r?\n)/;

  // Newline character code for charCodeAt() comparisons
  var NEWLINE_CODE = 10;

  // Private symbol for identifying `SourceNode`s when multiple versions of
  // the source-map library are loaded. This MUST NOT CHANGE across
  // versions!
  var isSourceNode = "$$$isSourceNode$$$";

  /**
   * SourceNodes provide a way to abstract over interpolating/concatenating
   * snippets of generated JavaScript source code while maintaining the line and
   * column information associated with the original source code.
   *
   * @param aLine The original line number.
   * @param aColumn The original column number.
   * @param aSource The original source's filename.
   * @param aChunks Optional. An array of strings which are snippets of
   *        generated JS, or other SourceNodes.
   * @param aName The original identifier.
   */
  function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine == null ? null : aLine;
    this.column = aColumn == null ? null : aColumn;
    this.source = aSource == null ? null : aSource;
    this.name = aName == null ? null : aName;
    this[isSourceNode] = true;
    if (aChunks != null) this.add(aChunks);
  }

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   * @param aRelativePath Optional. The path that relative sources in the
   *        SourceMapConsumer should be relative to.
   */
  SourceNode.fromStringWithSourceMap =
    function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer, aRelativePath) {
      // The SourceNode we want to fill with the generated code
      // and the SourceMap
      var node = new SourceNode();

      // All even indices of this array are one line of the generated code,
      // while all odd indices are the newlines between two adjacent lines
      // (since `REGEX_NEWLINE` captures its match).
      // Processed fragments are removed from this array, by calling `shiftNextLine`.
      var remainingLines = aGeneratedCode.split(REGEX_NEWLINE);
      var shiftNextLine = function() {
        var lineContents = remainingLines.shift();
        // The last line of a file might not have a newline.
        var newLine = remainingLines.shift() || "";
        return lineContents + newLine;
      };

      // We need to remember the position of "remainingLines"
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;

      // The generate SourceNodes we need a code range.
      // To extract it current and last mapping is used.
      // Here we store the last mapping.
      var lastMapping = null;

      aSourceMapConsumer.eachMapping(function (mapping) {
        if (lastMapping !== null) {
          // We add the code from "lastMapping" to "mapping":
          // First check if there is a new line in between.
          if (lastGeneratedLine < mapping.generatedLine) {
            var code = "";
            // Associate first line with "lastMapping"
            addMappingWithCode(lastMapping, shiftNextLine());
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
            // The remaining code is added without mapping
          } else {
            // There is no new line in between.
            // Associate the code between "lastGeneratedColumn" and
            // "mapping.generatedColumn" with "lastMapping"
            var nextLine = remainingLines[0];
            var code = nextLine.substr(0, mapping.generatedColumn -
                                          lastGeneratedColumn);
            remainingLines[0] = nextLine.substr(mapping.generatedColumn -
                                                lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            // No more remaining code, continue
            lastMapping = mapping;
            return;
          }
        }
        // We add the generated code until the first mapping
        // to the SourceNode without any mapping.
        // Each line is added as separate string.
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(shiftNextLine());
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[0];
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[0] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      // We have processed all mappings.
      if (remainingLines.length > 0) {
        if (lastMapping) {
          // Associate the remaining code in the current line with "lastMapping"
          addMappingWithCode(lastMapping, shiftNextLine());
        }
        // and add the remaining lines without any mapping
        node.add(remainingLines.join(""));
      }

      // Copy sourcesContent into SourceNode
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content != null) {
          if (aRelativePath != null) {
            sourceFile = util.join(aRelativePath, sourceFile);
          }
          node.setSourceContent(sourceFile, content);
        }
      });

      return node;

      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === undefined) {
          node.add(code);
        } else {
          var source = aRelativePath
            ? util.join(aRelativePath, mapping.source)
            : mapping.source;
          node.add(new SourceNode(mapping.originalLine,
                                  mapping.originalColumn,
                                  source,
                                  code,
                                  mapping.name));
        }
      }
    };

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.add = function SourceNode_add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function (chunk) {
        this.add(chunk);
      }, this);
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length-1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    }
    else if (aChunk[isSourceNode] || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk[isSourceNode]) {
        chunk.walk(aFn);
      }
      else {
        if (chunk !== '') {
          aFn(chunk, { source: this.source,
                       line: this.line,
                       column: this.column,
                       name: this.name });
        }
      }
    }
  };

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  SourceNode.prototype.join = function SourceNode_join(aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len-1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild[isSourceNode]) {
      lastChild.replaceRight(aPattern, aReplacement);
    }
    else if (typeof lastChild === 'string') {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    }
    else {
      this.children.push(''.replace(aPattern, aReplacement));
    }
    return this;
  };

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  SourceNode.prototype.setSourceContent =
    function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walkSourceContents =
    function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i][isSourceNode]) {
          this.children[i].walkSourceContents(aFn);
        }
      }

      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  SourceNode.prototype.toString = function SourceNode_toString() {
    var str = "";
    this.walk(function (chunk) {
      str += chunk;
    });
    return str;
  };

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function (chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if(lastOriginalSource !== original.source
           || lastOriginalLine !== original.line
           || lastOriginalColumn !== original.column
           || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      for (var idx = 0, length = chunk.length; idx < length; idx++) {
        if (chunk.charCodeAt(idx) === NEWLINE_CODE) {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      }
    });
    this.walkSourceContents(function (sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map: map };
  };

  exports.SourceNode = SourceNode;

});

},{"./source-map-generator":32,"./util":34,"amdefine":35}],34:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }
  exports.getArg = getArg;

  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = '';
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ':';
    }
    url += '//';
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + '@';
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;

  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consequtive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */
  function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = (path.charAt(0) === '/');

    var parts = path.split(/\/+/);
    for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
      part = parts[i];
      if (part === '.') {
        parts.splice(i, 1);
      } else if (part === '..') {
        up++;
      } else if (up > 0) {
        if (part === '') {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join('/');

    if (path === '') {
      path = isAbsolute ? '/' : '.';
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  }
  exports.normalize = normalize;

  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */
  function join(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }
    if (aPath === "") {
      aPath = ".";
    }
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || '/';
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === '/'
      ? aPath
      : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;

  /**
   * Make a path relative to a URL or another path.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be made relative to aRoot.
   */
  function relative(aRoot, aPath) {
    if (aRoot === "") {
      aRoot = ".";
    }

    aRoot = aRoot.replace(/\/$/, '');

    // XXX: It is possible to remove this block, and the tests still pass!
    var url = urlParse(aRoot);
    if (aPath.charAt(0) == "/" && url && url.path == "/") {
      return aPath.slice(1);
    }

    return aPath.indexOf(aRoot + '/') === 0
      ? aPath.substr(aRoot.length + 1)
      : aPath;
  }
  exports.relative = relative;

  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */
  function toSetString(aStr) {
    return '$' + aStr;
  }
  exports.toSetString = toSetString;

  function fromSetString(aStr) {
    return aStr.substr(1);
  }
  exports.fromSetString = fromSetString;

  function strcmp(aStr1, aStr2) {
    var s1 = aStr1 || "";
    var s2 = aStr2 || "";
    return (s1 > s2) - (s1 < s2);
  }

  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp;

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp || onlyCompareOriginal) {
      return cmp;
    }

    cmp = strcmp(mappingA.name, mappingB.name);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    return mappingA.generatedColumn - mappingB.generatedColumn;
  };
  exports.compareByOriginalPositions = compareByOriginalPositions;

  /**
   * Comparator between two mappings where the generated positions are
   * compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */
  function compareByGeneratedPositions(mappingA, mappingB, onlyCompareGenerated) {
    var cmp;

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp || onlyCompareGenerated) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  };
  exports.compareByGeneratedPositions = compareByGeneratedPositions;

});

},{"amdefine":35}],35:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 0.1.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                if (callback) {
                    process.nextTick(function () {
                        callback.apply(null, deps);
                    });
                }
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require('_process'),"/node_modules/handlebars/node_modules/source-map/node_modules/amdefine/amdefine.js")
},{"_process":5,"path":4}],36:[function(require,module,exports){
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

    var LT     = /</g,
        QUOT   = /"/g,
        SQUOT  = /'/g,
        NULL   = /\x00/g,
        SPECIAL_ATTR_VALUE_UNQUOTED_CHARS = /(?:^(?:["'`]|\x00+$|$)|[\x09-\x0D >])/g,
        SPECIAL_HTML_CHARS = /[&<>"'`]/g, 
        SPECIAL_COMMENT_CHARS = /(?:\x00|^-*!?>|--!?>|--?!?$|\]>|\]$)/g;

    // CSS sensitive chars: ()"'/,!*@{}:;
    // By CSS: (Tab|NewLine|colon|semi|lpar|rpar|apos|sol|comma|excl|ast|midast);|(quot|QUOT)
    // By URI_PROTOCOL: (Tab|NewLine);
    var SENSITIVE_HTML_ENTITIES = /&(?:#([xX][0-9A-Fa-f]+|\d+);?|(Tab|NewLine|colon|semi|lpar|rpar|apos|sol|comma|excl|ast|midast|ensp|emsp|thinsp);|(nbsp|amp|AMP|lt|LT|gt|GT|quot|QUOT);?)/g,
        SENSITIVE_NAMED_REF_MAP = {Tab: '\t', NewLine: '\n', colon: ':', semi: ';', lpar: '(', rpar: ')', apos: '\'', sol: '/', comma: ',', excl: '!', ast: '*', midast: '*', ensp: '\u2002', emsp: '\u2003', thinsp: '\u2009', nbsp: '\xA0', amp: '&', lt: '<', gt: '>', quot: '"', QUOT: '"'};

    // TODO: CSS_DANGEROUS_FUNCTION_NAME = /(url\(|expression\()/ig;
    var CSS_UNQUOTED_CHARS = /[^%#+\-\w\.]/g,
        // \x7F and \x01-\x1F less \x09 are for Safari 5.0
        CSS_DOUBLE_QUOTED_CHARS = /[\x01-\x1F\x7F\\"]/g,
        CSS_SINGLE_QUOTED_CHARS = /[\x01-\x1F\x7F\\']/g,
        // this assumes encodeURI() and encodeURIComponent() has escaped 1-32, 41, 127 for IE8
        CSS_UNQUOTED_URL = /['\(\)]/g; // " \ treated by encodeURI()   

    // Given a full URI, need to support "[" ( IPv6address ) "]" in URI as per RFC3986
    // Reference: https://tools.ietf.org/html/rfc3986
    var URL_IPV6 = /\/\/%5[Bb]([A-Fa-f0-9:]+)%5[Dd]/;


    // Reference: http://shazzer.co.uk/database/All/characters-allowd-in-html-entities
    // Reference: http://shazzer.co.uk/vector/Characters-allowed-after-ampersand-in-named-character-references
    // Reference: http://shazzer.co.uk/database/All/Characters-before-javascript-uri
    // Reference: http://shazzer.co.uk/database/All/Characters-after-javascript-uri
    // Reference: https://html.spec.whatwg.org/multipage/syntax.html#consume-a-character-reference
    // Reference for named characters: https://html.spec.whatwg.org/multipage/entities.json
    var URI_BLACKLIST_PROTOCOLS = {'javascript':1, 'data':1, 'vbscript':1, 'mhtml':1},
        URI_PROTOCOL_COLON = /(?::|&#[xX]0*3[aA];?|&#0*58;?|&colon;)/,
        URI_PROTOCOL_WHITESPACES = /(?:^[\x00-\x20]+|[\t\n\r\x00]+)/g,
        URI_PROTOCOL_NAMED_REF_MAP = {Tab: '\t', NewLine: '\n'};

    var x, 
        strReplace = String.prototype.replace, 
        fromCodePoint = String.fromCodePoint || function(codePoint) {
            if (arguments.length === 0) {
                return '';
            }
            if (codePoint <= 0xFFFF) { // BMP code point
                return String.fromCharCode(codePoint);
            }

            // Astral code point; split in surrogate halves
            // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            codePoint -= 0x10000;
            return String.fromCharCode((codePoint >> 10) + 0xD800, (codePoint % 0x400) + 0xDC00);
        };


    function getProtocol(s) {
        s = s.split(URI_PROTOCOL_COLON, 2);
        return (s.length === 2 && s[0]) ? s[0] : null;
    }

    function stringify(s, callback) {
        return typeof s === 'undefined' ? 'undefined'
             : s === null               ? 'null'
             : callback.apply(s.toString(), [].splice.call(arguments, 2));
    }


    function htmlDecode(s, namedRefMap, reNamedRef, callback) {
        namedRefMap = namedRefMap || SENSITIVE_NAMED_REF_MAP;
        reNamedRef = reNamedRef || SENSITIVE_HTML_ENTITIES;

        var decodedStr, args = [].splice.call(arguments, 4);

        return stringify(s, function() {
            decodedStr = this.replace(NULL, '\uFFFD').replace(reNamedRef, function(m, num, named, named1) {
                if (num) {
                    num = Number(num[0] <= '9' ? num : '0' + num);
                    // switch(num) {
                    //     case 0x80: return '\u20AC';  // EURO SIGN (€)
                    //     case 0x82: return '\u201A';  // SINGLE LOW-9 QUOTATION MARK (‚)
                    //     case 0x83: return '\u0192';  // LATIN SMALL LETTER F WITH HOOK (ƒ)
                    //     case 0x84: return '\u201E';  // DOUBLE LOW-9 QUOTATION MARK („)
                    //     case 0x85: return '\u2026';  // HORIZONTAL ELLIPSIS (…)
                    //     case 0x86: return '\u2020';  // DAGGER (†)
                    //     case 0x87: return '\u2021';  // DOUBLE DAGGER (‡)
                    //     case 0x88: return '\u02C6';  // MODIFIER LETTER CIRCUMFLEX ACCENT (ˆ)
                    //     case 0x89: return '\u2030';  // PER MILLE SIGN (‰)
                    //     case 0x8A: return '\u0160';  // LATIN CAPITAL LETTER S WITH CARON (Š)
                    //     case 0x8B: return '\u2039';  // SINGLE LEFT-POINTING ANGLE QUOTATION MARK (‹)
                    //     case 0x8C: return '\u0152';  // LATIN CAPITAL LIGATURE OE (Œ)
                    //     case 0x8E: return '\u017D';  // LATIN CAPITAL LETTER Z WITH CARON (Ž)
                    //     case 0x91: return '\u2018';  // LEFT SINGLE QUOTATION MARK (‘)
                    //     case 0x92: return '\u2019';  // RIGHT SINGLE QUOTATION MARK (’)
                    //     case 0x93: return '\u201C';  // LEFT DOUBLE QUOTATION MARK (“)
                    //     case 0x94: return '\u201D';  // RIGHT DOUBLE QUOTATION MARK (”)
                    //     case 0x95: return '\u2022';  // BULLET (•)
                    //     case 0x96: return '\u2013';  // EN DASH (–)
                    //     case 0x97: return '\u2014';  // EM DASH (—)
                    //     case 0x98: return '\u02DC';  // SMALL TILDE (˜)
                    //     case 0x99: return '\u2122';  // TRADE MARK SIGN (™)
                    //     case 0x9A: return '\u0161';  // LATIN SMALL LETTER S WITH CARON (š)
                    //     case 0x9B: return '\u203A';  // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
                    //     case 0x9C: return '\u0153';  // LATIN SMALL LIGATURE OE (œ)
                    //     case 0x9E: return '\u017E';  // LATIN SMALL LETTER Z WITH CARON (ž)
                    //     case 0x9F: return '\u0178';  // LATIN CAPITAL LETTER Y WITH DIAERESIS (Ÿ)
                    // }
                    // // num >= 0xD800 && num <= 0xDFFF, and 0x0D is separately handled, as it doesn't fall into the range of x.pec()
                    // return (num >= 0xD800 && num <= 0xDFFF) || num === 0x0D ? '\uFFFD' : x.frCoPt(num);

                    return num === 0x80 ? '\u20AC'  // EURO SIGN (€)
                            : num === 0x82 ? '\u201A'  // SINGLE LOW-9 QUOTATION MARK (‚)
                            : num === 0x83 ? '\u0192'  // LATIN SMALL LETTER F WITH HOOK (ƒ)
                            : num === 0x84 ? '\u201E'  // DOUBLE LOW-9 QUOTATION MARK („)
                            : num === 0x85 ? '\u2026'  // HORIZONTAL ELLIPSIS (…)
                            : num === 0x86 ? '\u2020'  // DAGGER (†)
                            : num === 0x87 ? '\u2021'  // DOUBLE DAGGER (‡)
                            : num === 0x88 ? '\u02C6'  // MODIFIER LETTER CIRCUMFLEX ACCENT (ˆ)
                            : num === 0x89 ? '\u2030'  // PER MILLE SIGN (‰)
                            : num === 0x8A ? '\u0160'  // LATIN CAPITAL LETTER S WITH CARON (Š)
                            : num === 0x8B ? '\u2039'  // SINGLE LEFT-POINTING ANGLE QUOTATION MARK (‹)
                            : num === 0x8C ? '\u0152'  // LATIN CAPITAL LIGATURE OE (Œ)
                            : num === 0x8E ? '\u017D'  // LATIN CAPITAL LETTER Z WITH CARON (Ž)
                            : num === 0x91 ? '\u2018'  // LEFT SINGLE QUOTATION MARK (‘)
                            : num === 0x92 ? '\u2019'  // RIGHT SINGLE QUOTATION MARK (’)
                            : num === 0x93 ? '\u201C'  // LEFT DOUBLE QUOTATION MARK (“)
                            : num === 0x94 ? '\u201D'  // RIGHT DOUBLE QUOTATION MARK (”)
                            : num === 0x95 ? '\u2022'  // BULLET (•)
                            : num === 0x96 ? '\u2013'  // EN DASH (–)
                            : num === 0x97 ? '\u2014'  // EM DASH (—)
                            : num === 0x98 ? '\u02DC'  // SMALL TILDE (˜)
                            : num === 0x99 ? '\u2122'  // TRADE MARK SIGN (™)
                            : num === 0x9A ? '\u0161'  // LATIN SMALL LETTER S WITH CARON (š)
                            : num === 0x9B ? '\u203A'  // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
                            : num === 0x9C ? '\u0153'  // LATIN SMALL LIGATURE OE (œ)
                            : num === 0x9E ? '\u017E'  // LATIN SMALL LETTER Z WITH CARON (ž)
                            : num === 0x9F ? '\u0178'  // LATIN CAPITAL LETTER Y WITH DIAERESIS (Ÿ)
                            : (num >= 0xD800 && num <= 0xDFFF) || num === 0x0D ? '\uFFFD'
                            : x.frCoPt(num);
                }
                return namedRefMap[named || named1] || m;
            });
            return callback ? callback.apply(decodedStr, args) : decodedStr;
        });
    }

    function cssEncode(chr) {
        // space after \\HEX is needed by spec
        return '\\' + chr.charCodeAt(0).toString(16).toLowerCase() + ' ';
    }
    function css(s, reSensitiveChars) {
        return htmlDecode(s, null, null, function() {
            return this.replace(reSensitiveChars, cssEncode);
        });
    }
    function cssUrl(s, reSensitiveChars) {
        return htmlDecode(s, null, null, function() {
            // encodeURI() will throw error for use of the CSS_UNSUPPORTED_CODE_POINT (i.e., [\uD800-\uDFFF])
            var s = x.yufull(this), protocol = getProtocol(s);
            // prefix ## for blacklisted protocols
            s = protocol && URI_BLACKLIST_PROTOCOLS[protocol.toLowerCase()] ? '##' + s : s;

            return reSensitiveChars ? s.replace(reSensitiveChars, cssEncode) : s;
        });
    }

    return (x = {
        // turn invalid codePoints and that of non-characters to \uFFFD, and then fromCodePoint()
        frCoPt: function(num) {
            return !isFinite(num) ||            // `NaN`, `+Infinity`, or `-Infinity`
                num <= 0 ||                     // NULL or not a valid Unicode code point
                num > 0x10FFFF ||               // not a valid Unicode code point
                // Math.floor(num) != num || 

                (num >= 0x01 && num <= 0x08) ||
                (num >= 0x0E && num <= 0x1F) ||
                (num >= 0x7F && num <= 0x9F) ||
                (num >= 0xFDD0 && num <= 0xFDEF) ||
                
                 num === 0x0B || 
                (num & 0xFFFF) === 0xFFFF || 
                (num & 0xFFFF) === 0xFFFE ? '\uFFFD' : fromCodePoint(num);
        },
        d: htmlDecode,
        /*
         * @param {string} s - An untrusted uri input
         * @returns {string} s - null if relative url, otherwise the protocol with whitespaces stripped and lower-cased
         */
        yup: function(s) {
            s = getProtocol(s.replace(NULL, ''));
            // URI_PROTOCOL_WHITESPACES is required for left trim and remove interim whitespaces
            return s ? htmlDecode(s, URI_PROTOCOL_NAMED_REF_MAP, null, function() {
                return this.replace(URI_PROTOCOL_WHITESPACES, '').toLowerCase();
            }): null;
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
            return stringify(s, strReplace, SPECIAL_HTML_CHARS, function (m) {
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
            return stringify(s, strReplace, LT, '&lt;');
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
            return stringify(s, strReplace, SPECIAL_COMMENT_CHARS, function(m){
                return m === '\x00' ? '\uFFFD'
                    : m === '--!' || m === '--' || m === '-' || m === ']' ? m + ' '
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
            return stringify(s, strReplace, QUOT, '&quot;');
        },

        // FOR DETAILS, refer to inSingleQuotedAttr()
        // Reference: https://html.spec.whatwg.org/multipage/syntax.html#attribute-value-(single-quoted)-state
        yavs: function (s) {
            return stringify(s, strReplace, SQUOT, '&#39;');
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
            return stringify(s, strReplace, SPECIAL_ATTR_VALUE_UNQUOTED_CHARS, function (m) {
                return m === '\t'   ? '&#9;'  // in hex: 09
                    :  m === '\n'   ? '&#10;' // in hex: 0A
                    :  m === '\x0B' ? '&#11;' // in hex: 0B  for IE. IE<9 \v equals v, so use \x0B instead
                    :  m === '\f'   ? '&#12;' // in hex: 0C
                    :  m === '\r'   ? '&#13;' // in hex: 0D
                    :  m === ' '    ? '&#32;' // in hex: 20
                    :  m === '>'    ? '&gt;'
                    :  m === '"'    ? '&quot;'
                    :  m === "'"    ? '&#39;'
                    :  m === '`'    ? '&#96;'
                    : /*empty or all null*/ '\uFFFD';
            });
        },

        yu: encodeURI,
        yuc: encodeURIComponent,

        // Notice that yubl MUST BE APPLIED LAST, and will not be used independently (expected output from encodeURI/encodeURIComponent and yavd/yavs/yavu)
        // This is used to disable JS execution capabilities by prefixing x- to ^javascript:, ^vbscript: or ^data: that possibly could trigger script execution in URI attribute context
        yubl: function (s) {
            return URI_BLACKLIST_PROTOCOLS[x.yup(s)] ? 'x-' + s : s;
        },

        // This is NOT a security-critical filter.
        // Reference: https://tools.ietf.org/html/rfc3986
        yufull: function (s) {
            return x.yu(s)
                    .replace(URL_IPV6, function(m, p) {
                        return '//[' + p + ']';
                    });
        },



        // The design principle of the CSS filter MUST meet the following goal(s).
        // (1) The input cannot break out of the context (expr) and this is to fulfill the just sufficient encoding principle.
        // (2) The input cannot introduce CSS parsing error and this is to address the concern of UI redressing.
        //
        // term
        //   : unary_operator?
        //     [ NUMBER S* | PERCENTAGE S* | LENGTH S* | EMS S* | EXS S* | ANGLE S* |
        //     TIME S* | FREQ S* ]
        //   | STRING S* | IDENT S* | URI S* | hexcolor | function
        // 
        // Reference:
        // * http://www.w3.org/TR/CSS21/grammar.html 
        // * http://www.w3.org/TR/css-syntax-3/
        // 
        // PART 1. The first rule is to filter out the html encoded string, however this rule can be removed as rule (3) IF '&' is being encoded.
        // PART 2. The second rule remove unsupported code point [\uD800-\uDFFF], it is safe to be empty string.
        // PART 3. The third rule is CSS escaping and depends on 
        // 
        // NOTE: delimitar in CSS - \ _ : ; ( ) " ' / , % # ! * @ . { }
        //
        // PART 4. The forth rule is to blacklist the dangerous function in CSS, however this rule can be removed as rule (3) will encode '()' to '\\3b \\28 ' in UNQUOTED filter,
        // while there is no need to encode it in STRING filter.


        // CSS_UNQUOTED_CHARS = /([^%#\-+_a-z0-9\.])/ig,
        // we allow NUMBER, PERCENTAGE, LENGTH, EMS, EXS, ANGLE, TIME, FREQ, IDENT and hexcolor in UNQUOTED filter without escaping chars [%#\-+_a-z0-9\.].
        yceu: function(s) {
            return css(s, CSS_UNQUOTED_CHARS);
        },

        // string1 = \"([^\n\r\f\\"]|\\{nl}|\\[^\n\r\f0-9a-f]|\\[0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?)*\"
        // CSS_DOUBLE_QUOTED_CHARS = /([\u0000\n\r\f\v\\"])/ig,
        // we allow STRING in QUOTED filter and only escape [\u0000\n\r\f\v\\"] only. (\v is added for IE)
        yced: function(s) {
            return css(s, CSS_DOUBLE_QUOTED_CHARS);
        },

        // string2 = \'([^\n\r\f\\']|\\{nl}|\\[^\n\r\f0-9a-f]|\\[0-9a-f]{1,6}(\r\n|[ \n\r\t\f])?)*\'
        // CSS_SINGLE_QUOTED_CHARS = /([\u0000\n\r\f\v\\'])/ig,
        // we allow STRING in QUOTED filter and only escape [\u0000\n\r\f\v\\'] only. (\v is added for IE)
        yces: function(s) {
            return css(s, CSS_SINGLE_QUOTED_CHARS);
        },


        // for url({{{yceuu url}}}
        // unquoted_url = ([!#$%&*-~]|\\{h}{1,6}(\r\n|[ \t\r\n\f])?|\\[^\r\n\f0-9a-f])* (CSS 2.1 definition)
        // unquoted_url = ([^"'()\\ \t\n\r\f\v\u0000\u0008\u000b\u000e-\u001f\u007f]|\\{h}{1,6}(\r\n|[ \t\r\n\f])?|\\[^\r\n\f0-9a-f])* (CSS 3.0 definition)
        // The state machine in CSS 3.0 is more well defined - http://www.w3.org/TR/css-syntax-3/#consume-a-url-token0
        // CSS_UNQUOTED_URL = /(["'\(\)\\ \t\n\r\f\v\u0000\u0008\u000b\u007f\u000e-\u001f])/ig; (\v is added for IE)
        // CSS_UNQUOTED_URL = /(["'\(\)])/ig; (optimized version by chaining with yufull)
        yceuu: function(s) {
            return cssUrl(s, CSS_UNQUOTED_URL);
        },

        // for url("{{{yceud url}}}
        // CSS_DOUBLE_QUOTED_URL = CSS_DOUBLE_QUOTED_CHARS;
        // CSS_DOUBLE_QUOTED_URL has nothing else to escape (optimized version by chaining with yufull)
        yceud: function(s) { 
            return cssUrl(s);
        },

        // for url('{{{yceus url}}}
        // CSS_SINGLE_QUOTED_URL = CSS_SINGLE_QUOTED_CHARS;
        // CSS_SINGLE_QUOTED_URL = /'/g; (optimized version by chaining with yufull)
        yceus: function(s) { 
            return cssUrl(s, SQUOT);
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
* <div>{{{inHTMLData htmlData}}}</div>
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
* This filter is to be placed in HTML Comment context
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
* <p>Regarding \uFFFD injection, given <a id={{{id}}} name="passwd">,<br/>
*        Rationale 1: our belief is that developers wouldn't expect when id equals an
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

},{}],37:[function(require,module,exports){
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

/* import the required package */
var handlebarsUtils = require('./handlebars-utils.js'),
    parserUtils = require('./parser-utils.js'),
    cssParserUtils = require('./css-utils.js');

var stateMachine = parserUtils.StateMachine,
    ContextParser = parserUtils.Parser;

var HtmlEntitiesDecoder = require("./html-decoder/html-decoder.js"),
    htmlDecoder = new HtmlEntitiesDecoder();

/////////////////////////////////////////////////////
//
// TODO: need to move this code back to filter module
// the main concern is the update of the xss-filters 
// does not reflect the change below.
// 
/////////////////////////////////////////////////////
var filter = {
    FILTER_NOT_HANDLE: 'y',
    FILTER_DATA: 'yd',
    FILTER_COMMENT: 'yc',
    FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED: 'yavd',
    FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED: 'yavs',
    FILTER_ATTRIBUTE_VALUE_UNQUOTED: 'yavu',
    FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_DOUBLE_QUOTED: 'yced',
    FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_SINGLE_QUOTED: 'yces',
    FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_UNQUOTED: 'yceu',
    FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_URL_UNQUOTED: 'yceuu',
    FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_URL_DOUBLE_QUOTED: 'yceud',
    FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_URL_SINGLE_QUOTED: 'yceus',
    FILTER_ENCODE_URI: 'yu',
    FILTER_ENCODE_URI_COMPONENT: 'yuc',
    FILTER_URI_SCHEME_BLACKLIST: 'yubl',
    FILTER_FULL_URI: 'yufull'
};

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
var reEqualSign = /(?:=|&#0*61;?|&#[xX]0*3[dD];?|&equals;)/;

/////////////////////////////////////////////////////
//
// @module ContextParserHandlebarsException
// 
/////////////////////////////////////////////////////

/** 
* @module ContextParserHandlebarsException
*/
function ContextParserHandlebarsException(msg, lineNo, charNo) {
    this.msg = msg;
    this.lineNo = lineNo;
    this.charNo = charNo;
}

/////////////////////////////////////////////////////
//
// @module ContextParserHandlebars
// 
/////////////////////////////////////////////////////

/** 
* @module ContextParserHandlebars
*/
function ContextParserHandlebars(config) {
    config || (config = {});

    /* save the processed char */
    this._buffer = [];

    /* the configuration of ContextParserHandlebars */
    this._config = {};

    /* the flag is used to print out the char to console, defaulted to true */
    this._config._printCharEnable = (config.printCharEnable !== false);

    /* the flag is used to strict mode of handling un-handled state, defaulted to false */
    this._config._strictMode = (config.strictMode === true);

    /* save the char/line no being processed */
    this._charNo = 0;
    this._lineNo = 1;

    /* context parser for HTML5 parsing */
    this.contextParser = parserUtils.getParser();
}

/**
* @constant ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar
*
* @description
* The Lookup table for Handlebars open brace chars state transition.
* https://github.com/yahoo/context-parser/blob/master/src/html5-state-machine.js#L36
*
* stateMachine.Symbol.ELSE is the symbol returns by Parser.lookupChar('{');
*/
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar = stateMachine.lookupStateFromSymbol[stateMachine.Symbol.ELSE].slice(0); // deep copy the array
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_TAG_OPEN] = stateMachine.State.STATE_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_END_TAG_OPEN]  = stateMachine.State.STATE_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_RCDATA_END_TAG_OPEN] = stateMachine.State.STATE_RCDATA_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_RCDATA_END_TAG_NAME] = stateMachine.State.STATE_RCDATA_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_RAWTEXT_END_TAG_OPEN] = stateMachine.State.STATE_RAWTEXT_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_RAWTEXT_END_TAG_NAME] = stateMachine.State.STATE_RAWTEXT_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_SCRIPT_DATA_END_TAG_OPEN] = stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME] = stateMachine.State.STATE_SCRIPT_DATA_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN] = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_OPEN] = stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME] = stateMachine.State.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START] = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_START;
ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END] = stateMachine.State.STATE_SCRIPT_DATA_DOUBLE_ESCAPE_END;

/* The states that we will check for attribute name type for state consistency */
ContextParserHandlebars.statesToCheckForStateConsistency = {
    '38':1, // stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED
    '39':1, // stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED
    '40':1, // stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED
};

/**
* @function ContextParserHandlebars.clearBuffer
*
* @description
* Clear the buffer.
*/
ContextParserHandlebars.prototype.clearBuffer = function() {
    // http://jsperf.com/array-destroy
    this._buffer = [];
};

/**
* @function ContextParserHandlebars.getOutput
*
* @description
* Get the output of processed chars.
*/
ContextParserHandlebars.prototype.getOutput = function() {
    return this._buffer.join('');
};

/**
* @function ContextParserHandlebars.saveToBuffer
*
* @description
* Save the processed char to the buffer array and return
* it through getOutput()
*/
ContextParserHandlebars.prototype.saveToBuffer = function(str) {
    this._buffer.push(str);
};

/**
* @function module:ContextParserHandlebars.analyzeContext
*
* @description
* Analyze the context of the Handlebars template input string.
*/
ContextParserHandlebars.prototype.analyzeContext = function(input) {
    // the last parameter is the hack till we move to LR parser
    var ast = this.buildAst(input, 0, []);
    var r = this.analyzeAst(ast, this.contextParser, 0);
    (this._config._printCharEnable && typeof process === 'object')? process.stdout.write(r.output) : '';
    return r.output;
};

/**
* @function ContextParserHandlebars.buildAst
*
* @description
* Build the AST tree of the Handlebars template language.
*/
// TODO: using flex syntax to build the AST.
ContextParserHandlebars.prototype.buildAst = function(input, i, sp) {

    /* init the data structure */
    var ast = {};
    ast.left = [];
    ast.right = [];

    var j = 0,
        len = input.length,
        re,
        msg, exceptionObj; // msg and exception

    var content = '',
        inverse = false,
        buildNode = false,
        nodeObj = {},
        obj = {};

    var startPos = 0,
        endPos = 0;

    /* Handlebars expression type */
    var handlebarsExpressionType, handlebarsExpressionTypeName = '';

    try {
        for(j=i;j<len;++j) {

            /* distinguish the type */
            handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION; 
            

            if (input[j] === '{' && input[j+1] === '{') {
                if (input[j+2] === '{') { 
                    // 4 braces are encountered
                    if (input[j+3] === '{') {
                        handlebarsExpressionType = handlebarsUtils.RAW_BLOCK;
                        handlebarsExpressionTypeName = 'rawblock';
                    } 
                    // 3 braces are encountered
                    else {
                        handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
                        handlebarsExpressionTypeName = 'rawexpression';
                    }
                }
                // 2 braces are encountered
                else {
                    var escapedMustache = handlebarsUtils.lookBackTest(input, j);
                    if (escapedMustache === handlebarsUtils.NOT_ESCAPED_MUSTACHE ||
                        escapedMustache === handlebarsUtils.DOUBLE_ESCAPED_MUSTACHE
                        ) {
                        handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, j);
                        // 'expression' is the default handlebarsExpressionTypeName
                        handlebarsExpressionTypeName = handlebarsExpressionType === handlebarsUtils.ESCAPE_EXPRESSION ? 'escapeexpression'
                            : handlebarsExpressionType === handlebarsUtils.BRANCH_EXPRESSION ? 'branchstart' 
                            : handlebarsExpressionType === handlebarsUtils.ELSE_EXPRESSION ? 'branchelse' 
                            : handlebarsExpressionType === handlebarsUtils.BRANCH_END_EXPRESSION ? 'branchend' 
                            : 'expression';
                    } else if (escapedMustache === handlebarsUtils.SINGLE_ESCAPED_MUSTACHE) {
                        // mark it as non-expression and untouch it
                        handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION;
                    }
                }
            }

            if (handlebarsExpressionType !== handlebarsUtils.NOT_EXPRESSION) {

                /* validation */
                re = handlebarsUtils.isValidExpression(input, j, handlebarsExpressionType);
                if (re.result === false) {
                    throw "Parsing error! Invalid expression. (type:"+handlebarsExpressionType+")";
                }

                /* save content */
                if (content !== '') {
                    startPos = endPos+1;
                    endPos = startPos+content.length-1;
                    nodeObj = this.generateNodeObject('html', content, startPos);
                    inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
                    content = '';
                }

                switch (handlebarsExpressionType) {
                    case handlebarsUtils.RAW_BLOCK:
                        /* handleRawBlock */
                        startPos = j;
                        obj = this.handleRawBlock(input, j, false);
                        endPos = j = obj.index;
                        nodeObj = this.generateNodeObject('rawblock', obj.str, startPos);
                        inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
                 
                        break;
                    case handlebarsUtils.ELSE_EXPRESSION:
                        /* inverse */
                        inverse = true;

                        /* consumeExpression */
                        startPos = j;
                        obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        nodeObj = this.generateNodeObject(handlebarsExpressionTypeName, obj.str, startPos);
                        inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);

                        break;
                    case handlebarsUtils.BRANCH_EXPRESSION:

                        if (sp.length === 0 || buildNode) {
                            /* buildAst recursively */
                            startPos = j;
                            obj = this.buildAst(input, j, [re.tag]);
                            endPos = j = obj.index;
                            nodeObj = this.generateNodeObject('node', obj, startPos);
                            inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
                        } else {
                            /* consumeExpression */
                            startPos = j;
                            obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                            endPos = j = obj.index;
                            nodeObj = this.generateNodeObject(handlebarsExpressionTypeName, obj.str, startPos);
                            inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
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
                                throw "Template expression mismatch (startExpression:"+startTag+"/endExpression:"+re.tag+")";
                            }
                        }

                        /* consumeExpression */
                        startPos = j;
                        obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        nodeObj = this.generateNodeObject(handlebarsExpressionTypeName, obj.str, startPos);
                        inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);

                        break;
                    default:
                        throw "Parsing error! Unexcepted error.";
                }

                /* return for handlebarsUtils.BRANCH_END_EXPRESSION */
                if (handlebarsExpressionType === handlebarsUtils.BRANCH_END_EXPRESSION) {
                    ast.tag = re.tag;
                    ast.index = j;
                    return ast;
                }

            } else {
                content += input[j];
            }
        }

        if (sp.length > 0) {
            throw "Template does not have branching close expression";
        }
    } catch (exception) {
        if (typeof exception === 'string') {
            exceptionObj = new ContextParserHandlebarsException(
                '[ERROR] SecureHandlebars: ' + exception,
                this.countNewLineChar(input.slice(0, j)), j);
            handlebarsUtils.handleError(exceptionObj, true);
        } else {
            handlebarsUtils.handleError(exception, true);
        }
    }
   
    /* save the last content */
    if (content !== '') {
        startPos = endPos+1;
        endPos = startPos+content.length-1;
        nodeObj = this.generateNodeObject('html', content, startPos);
        inverse === true? ast.right.push(nodeObj) : ast.left.push(nodeObj);
    }

    ast.index = j;
    return ast;
};

/**
* @function ContextParserHandlebars.generateNodeObject
*
* @description
* Handy function to create the node object.
*/
ContextParserHandlebars.prototype.generateNodeObject = function(type, content, startPos) {
    var obj = {};
    obj.type = type;
    obj.content = content;

    obj.startPos = startPos;
    return obj;
};

/**
* @function ContextParserHandlebars.analyzeAst
*
* @description
* Analyze the execution context of the AST node.
*/
ContextParserHandlebars.prototype.analyzeAst = function(ast, contextParser, charNo) {

    var output = '', leftParser, rightParser,
        t, msg, exceptionObj;

    this._charNo = charNo;

    function consumeAstNode (tree, parser) {
        /*jshint validthis: true */

        for (var j = 0, len = tree.length, node; j < len; j++) {
            node = tree[j];

            if (node.type === 'html') {
                
                output += parser.contextualize(node.content);

            } else if (node.type === 'escapeexpression' ||
                node.type === 'rawexpression') {

                // lookupStateForHandlebarsOpenBraceChar from current state before handle it
                parser.setCurrentState(ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[parser.state]);
                this.clearBuffer();
                this.handleTemplate(node.content, 0, parser);
                output += this.getOutput();

            } else if (node.type === 'node') {
                
                t = this.analyzeAst(node.content, parser, node.startPos);
                parser.cloneStates(t.parser);

                output += t.output;

            } else if (node.type === 'rawblock' ||
                node.type === 'expression' || 
                node.type === 'branchstart' ||
                node.type === 'branchelse' ||
                node.type === 'branchend') {

                output += node.content;
            }

            /* calculate the char/line have been processed */
            if (typeof node.content === "string") {
                this._charNo += node.content.length;
                this._lineNo += this.countNewLineChar(node.content);
            } else {
                this._charNo = node.content.index+1;
            }
        }

        return parser;
    }

    // consumeAstNode() for both ast.left and ast.right if they are non-empty
    leftParser  = ast.left.length  && consumeAstNode.call(this, ast.left,  contextParser.fork());
    rightParser = ast.right.length && consumeAstNode.call(this, ast.right, contextParser.fork());

    // if the two non-empty branches result in different states
    if (leftParser && rightParser &&
            ( 
            leftParser.state !== rightParser.state ||
            // note: we compare the AttributeNameType while we are in the following states only.
            (ContextParserHandlebars.statesToCheckForStateConsistency[leftParser.state] !== undefined &&
             leftParser.getAttributeNameType() !== rightParser.getAttributeNameType())
            )
            ) {
        msg = "[ERROR] SecureHandlebars: Inconsistent HTML5 state after conditional branches. Please fix your template! ";
        msg += "state:("+leftParser.state+"/"+rightParser.state+"),";
        msg += "attributeNameType:("+leftParser.getAttributeNameType()+"/"+rightParser.getAttributeNameType()+")";
        exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
    }

    // returning either leftParser or rightParser makes no difference as they're assured to be in consistent state
    return {output: output, parser: leftParser || rightParser};
};

/**
* @function ContextParserHandlebars.countNewLineChar
*
* @description
* Count the new line in the string.
*/
ContextParserHandlebars.prototype.countNewLineChar = function(str) {
    return str.split('\n').length - 1;
};

/**
* @function ContextParserHandlebars.addFilters
*
* @description
* Add the filters to the escape expression based on the state.
*/
ContextParserHandlebars.prototype.addFilters = function(parser, input) {

    /* transitent var */
    var isFullUri = false, filters = [], f, exceptionObj, errorMessage,
        state = parser.state,
        tagName = parser.getStartTagName(),
        attributeName = parser.getAttributeName(),
        attributeValue = parser.getAttributeValue();

    try {

        switch(state) {
            case stateMachine.State.STATE_DATA: // 1
            case stateMachine.State.STATE_RCDATA: // 3
                return [filter.FILTER_DATA];

            case stateMachine.State.STATE_RAWTEXT:  // 5
                // inside raw text state, HTML parser ignores any state change that looks like tag/attribute
                // hence we apply the context-insensitive NOT_HANDLE filter that escapes '"`&<> without a warning/error
                if (tagName === 'xmp' || tagName === 'noembed' || tagName === 'noframes') {
                    return [filter.FILTER_NOT_HANDLE];
                }
                
                // style, iframe, or other unknown/future ones are considered scriptable
                throw 'scriptable tag';

            case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED: // 38
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED: // 39
            case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED: // 40

                if (parser.getAttributeNameType() === ContextParser.ATTRTYPE_URI) {
                    /* we don't support javascript parsing yet */
                    // TODO: should use yup() instead
                    if (handlebarsUtils.blacklistProtocol(attributeValue)) {
                        throw 'scriptable URI attribute (e.g., after <a href="javascript: )';
                    }

                    /* add the correct uri filter */
                    if (attributeValue.replace(reURIContextStartWhitespaces, '') === "") {
                        isFullUri = true;
                        f = filter.FILTER_FULL_URI;
                    } else {
                        f = reEqualSign.test(attributeValue) ? filter.FILTER_ENCODE_URI_COMPONENT : filter.FILTER_ENCODE_URI;
                    }
                    filters.push(f);                    
                    
                } else if (parser.getAttributeNameType() === ContextParser.ATTRTYPE_CSS) { // CSS
                    var r;
                    try {
                        attributeValue = htmlDecoder.decode(attributeValue);
                        r = cssParserUtils.parseStyleAttributeValue(attributeValue);
                    } catch (e) {
                        throw 'Unsafe output expression @ attribute style CSS context (Parsing error OR expression position not supported!)';
                    }
                    switch(r.code) {
                        case cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED:
                            filters.push(filter.FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_URL_UNQUOTED);
                            isFullUri = true;
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED:
                            filters.push(filter.FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_URL_SINGLE_QUOTED);
                            isFullUri = true;
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED:
                            filters.push(filter.FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_URL_DOUBLE_QUOTED);
                            isFullUri = true;
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED:
                            filters.push(filter.FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_UNQUOTED);
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED:
                            filters.push(filter.FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_SINGLE_QUOTED);
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED:
                            filters.push(filter.FILTER_ATTRIBUTE_VALUE_STYLE_EXPR_DOUBLE_QUOTED);
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_ERROR:
                            throw 'Unsafe output expression @ attribute style CSS context (Parsing error OR expression position not supported!)';
                    }

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
                            break;
                    }
                    filters.push(f);

                    /* add blacklist filters at the end of filtering chain */
                    if (isFullUri) {
                        /* blacklist the URI scheme for full uri */
                        filters.push(filter.FILTER_URI_SCHEME_BLACKLIST);
                    }
                    return filters;

                } else if (parser.getAttributeNameType() === ContextParser.ATTRTYPE_SCRIPTABLE) { // JS
                    /* we don't support js parser yet
                    * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                    * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                    */
                    throw attributeName + ' JavaScript event attribute';
                }


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
            

            case stateMachine.State.STATE_COMMENT: // 48
                return [filter.FILTER_COMMENT];


            /* the following are those unsafe contexts that we have no plans to support (yet?)
             * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
             * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
             */
            case stateMachine.State.STATE_TAG_NAME: // 10
                throw 'being an tag name (i.e., TAG_NAME state)';
            case stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME: // 34
            case stateMachine.State.STATE_ATTRIBUTE_NAME: // 35
            case stateMachine.State.STATE_AFTER_ATTRIBUTE_NAME: // 36
            case stateMachine.State.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED: // 42
                throw 'being an attribute name (state #: ' + state + ')';


            // TODO: need tagname tracing in Context Parser such that we can have 
            // ability to capture the case of putting output expression within dangerous tag.
            // like svg etc.
            // the following will be caught by handlebarsUtils.isScriptableTag(tagName) anyway
            case stateMachine.State.STATE_SCRIPT_DATA: // 6
                throw 'inside <script> tag (i.e., SCRIPT_DATA state)';
            
            // should not fall into the following states
            case stateMachine.State.STATE_BEFORE_ATTRIBUTE_VALUE: // 37
                throw 'unexpectedly BEFORE_ATTRIBUTE_VALUE state';

            default:
                throw 'unsupported position (i.e., state #: ' + state + ')';
        }
    } catch (exception) {

        if (typeof exception === 'string') {

            errorMessage = (this._config._strictMode? '[ERROR]' : '[WARNING]') + ' SecureHandlebars: Unsafe output expression found at ';

            // To be secure, scriptable tags when encountered will anyway throw an error/warning
            // they require either special parsers of their own context (e.g., CSS/script parsers) 
            //    or an application-specific whitelisted url check (e.g., <script src=""> with yubl-yavu-yufull is not enough)
            errorMessage += handlebarsUtils.isScriptableTag(tagName) ? 'scriptable <' + tagName + '> tag' : exception;

            exceptionObj = new ContextParserHandlebarsException(errorMessage, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._config._strictMode);
        } else {
            handlebarsUtils.handleError(exception, this._config._strictMode);
        }
        return [filter.FILTER_NOT_HANDLE];
    }
};

/**
* @function ContextParserHandlebars.consumeExpression
*
* @description
* Consume the expression till encounter the close brace.
*/
ContextParserHandlebars.prototype.consumeExpression = function(input, i, type, saveToBuffer) {
    var len = input.length,
        str = '',
        obj = {};

    obj.str = '';
    for(var j=i;j<len;++j) {
        switch (type) {
            case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                    saveToBuffer ? this.saveToBuffer('--}}') : obj.str += '--}}';
                    obj.index = j+3;
                    return obj;
                } else if (input[j] === '-' && j+4<len && input[j+1] === '-' && input[j+2] === '~' && input[j+3] === '}' && input[j+4] === '}') {
                    saveToBuffer ? this.saveToBuffer('--~}}') : obj.str += '--~}}';
                    obj.index = j+4;
                    return obj;
                }
                break;
            case handlebarsUtils.RAW_EXPRESSION:
                if (input[j] === '}' && j+2<len && input[j+1] === '}' && input[j+2] === '}') {
                    saveToBuffer ? this.saveToBuffer('}}}') : obj.str += '}}}';
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
                    saveToBuffer ? this.saveToBuffer('}}') : obj.str += '}}';
                    obj.index = j+1;
                    return obj;
                }
                break;
        }
        saveToBuffer ? this.saveToBuffer(input[j]) : obj.str += input[j];
    }
    throw "[ERROR] SecureHandlebars: Parsing error! Cannot encounter close brace of expression.";
};

/**
* @function ContextParserHandlebars.handleTemplate
*
* @description
* Handle the Handlebars template. (Handlebars Template Context)
*/
ContextParserHandlebars.prototype.handleTemplate = function(input, i, stateObj) {

    /* the max length of the input string */
    var len = input.length;
    /* error msg */
    var exceptionObj;
    /* _handleXXXX return object */
    var obj;
    /* Handlebars expression type */
    var handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION; 

    try {
        if (input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '{') {
            handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
            /* _handleRawExpression and no validation need, it is safe guard in buildAst function */
            obj = this.consumeExpression(input, i, handlebarsExpressionType, true);
            return;
        } else if (input[i] === '{' && i+1<len && input[i+1] === '{') {
            // this is just for lookAhead, does not guarantee the valid expression.
            handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, i);
            switch (handlebarsExpressionType) {
                case handlebarsUtils.ESCAPE_EXPRESSION:
                    /* handleEscapeExpression and no validation need, it is safe guard in buildAst function */
                    obj = this.handleEscapeExpression(input, i, len, stateObj, true);
                    return;
                default:
                    throw "Parsing error! unexpected Handlebars markup.";
            }
        } else {
            throw "Parsing error! unexpected Handlebars markup.";
        }
    } catch (exception) {
        if (typeof exception === 'string') {
            exceptionObj = new ContextParserHandlebarsException(
                '[ERROR] SecureHandlebars: ' + exception,
                this._lineNo, 
                this._charNo);
            handlebarsUtils.handleError(exceptionObj, true);
        } else {
            handlebarsUtils.handleError(exception, true);
        }
    }
};

/**
* @function ContextParserHandlebars.handleEscapeExpression
*
* @description
* Handle the escape expression.
*/
ContextParserHandlebars.prototype.handleEscapeExpression = function(input, i, len, stateObj, saveToBuffer) {
    var msg, exceptionObj,
        obj = {};

    obj.str = '';

    saveToBuffer ? this.saveToBuffer('{{') : obj.str += '{{';
    /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
    saveToBuffer ? this.saveToBuffer('{') : obj.str += '{';

    /* parse expression */
    var re = handlebarsUtils.isValidExpression(input, i, handlebarsUtils.ESCAPE_EXPRESSION),
        filters = [];

    /* get the customized filter based on the current HTML5 state before the Handlebars template expression. */
    filters = this.addFilters(stateObj, input);
    for(var k=filters.length-1;k>=0;--k) {
        //
        // NOTE: the isSingleID is being used for making the following judgement.
        //
        // 1. if the parser encounters single helperName in the expression, we will simply add 
        //    the customized filter with space as a separator (example: filterName helperName).
        //    it is noted that filterName (helperName) is an invalid format
        // 2. if the parser encounters multiple helperName/subExpression, we will add 
        //    the customized filter as subExpression format (example: filterName (helperName* subExpression*)).
        //
        // Reference: 
        // https://github.com/wycats/handlebars.js/blob/master/src/handlebars.yy
        //
        if (saveToBuffer) {
            (re.isSingleID && k === 0) ? this.saveToBuffer(filters[k]+" ") : this.saveToBuffer(filters[k]+" (");
        } else {
            (re.isSingleID && k === 0) ? obj.str += filters[k]+" " : obj.str += filters[k]+" (";
        }
    }

    for(var j=i+2;j<len;++j) {
        if (input[j] === '}' && j+1<len && input[j+1] === '}') {
            for(var l=filters.length-1;l>=0;--l) {
                if (saveToBuffer) {
                    (re.isSingleID && l === 0) ? this.saveToBuffer('') : this.saveToBuffer(')');
                } else {
                    (re.isSingleID && l === 0) ? obj.str += '' : obj.str += ')';
                }
            }

            saveToBuffer ? this.saveToBuffer('}}') : obj.str += '}}';
            j=j+1;
            /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}}, no need to increase j by 1. */
            saveToBuffer ? this.saveToBuffer('}') : obj.str += '}';

            obj.index = j;
            return obj;
        } else {
            saveToBuffer ? this.saveToBuffer(input[j]) : obj.str += input[j];
        }
    }
    msg = "[ERROR] SecureHandlebars: Parsing error! Cannot encounter '}}' close brace of escape expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

/**
* @function ContextParserHandlebars.handleRawBlock
*
* @description
* Handle the raw block expression.
*/
ContextParserHandlebars.prototype.handleRawBlock = function(input, i, saveToBuffer) {
    var obj = {};
    var isStartExpression = true,
        len = input.length,
        re = handlebarsUtils.isValidExpression(input, i, handlebarsUtils.RAW_BLOCK),
        tag = re.tag;

    obj.str = '';
    for(var j=i;j<len;++j) {
        if (isStartExpression && input[j] === '}' && j+3<len && input[j+1] === '}' && input[j+2] === '}' && input[j+3] === '}') {
            saveToBuffer ? this.saveToBuffer('}}}}') : obj.str += '}}}}';
            j=j+3;
    
            isStartExpression = false;
        } else if (!isStartExpression && input[j] === '{' && j+4<len && input[j+1] === '{' && input[j+2] === '{' && input[j+3] === '{' && input[j+4] === '/') {
            re = handlebarsUtils.isValidExpression(input, j, handlebarsUtils.RAW_END_BLOCK);
            if (re.result === false) {
                throw "[ERROR] SecureHandlebars: Parsing error! Invalid raw end block expression.";
            }
            if (re.tag !== tag) {
                throw "[ERROR] SecureHandlebars: Parsing error! start/end raw block name mismatch.";
            }
            for(var k=j;k<len;++k) {
                if (input[k] === '}' && k+3<len && input[k+1] === '}' && input[k+2] === '}' && input[k+3] === '}') {
                    saveToBuffer ? this.saveToBuffer('}}}}') : obj.str += '}}}}';
                    k=k+3;

                    obj.index = k;
                    return obj;
                }
                saveToBuffer ? this.saveToBuffer(input[k]) : obj.str += input[k];
            }
        } else {
            saveToBuffer ? this.saveToBuffer(input[j]) : obj.str += input[j];
        }
    }
    throw "[ERROR] SecureHandlebars: Parsing error! Cannot encounter '}}}}' close brace of raw block.";
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();

}).call(this,require('_process'))
},{"./css-utils.js":39,"./handlebars-utils.js":40,"./html-decoder/html-decoder.js":42,"./parser-utils.js":44,"_process":5}],38:[function(require,module,exports){
(function (process){
/* parser generated by jison 0.4.15 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,11,12],$V1=[2,41],$V2=[1,4],$V3=[1,11],$V4=[2,3],$V5=[1,7],$V6=[1,8,11,12,20,21,22,23,24,25,26,27,28,29,32,33,34,35,36,37,39,40,41,42,43],$V7=[1,35],$V8=[1,24],$V9=[1,25],$Va=[1,26],$Vb=[1,27],$Vc=[1,28],$Vd=[1,29],$Ve=[1,30],$Vf=[1,31],$Vg=[1,34],$Vh=[1,36],$Vi=[1,39],$Vj=[1,40],$Vk=[1,43],$Vl=[1,42],$Vm=[1,32],$Vn=[1,33],$Vo=[1,11,34,36],$Vp=[1,50],$Vq=[1,51],$Vr=[1,11,12,20,21,22,23,24,25,26,27,28,29,32,33,34,35,36,37,39,40,41,42,43],$Vs=[1,11,12,20,21,22,23,24,25,26,27,28,29,32,33,34,35,36,37,40,41,42,43],$Vt=[20,21,22,23,24,25,26,27],$Vu=[1,11,34,36,42,43];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"style_attribute":3,"space_or_empty":4,"declarations":5,"declaration_list":6,"property":7,":":8,"expr":9,"prio":10,";":11,"IDENT":12,"term":13,"term_list":14,"operator":15,"numeric_term":16,"unary_operator":17,"string_term":18,"bad_term":19,"NUMBER":20,"PERCENTAGE":21,"LENGTH":22,"EMS":23,"EXS":24,"ANGLE":25,"TIME":26,"FREQ":27,"STRING":28,"URI":29,"hexcolor":30,"function":31,"BAD_STRING":32,"BAD_URI":33,"IMPORTANT_SYM":34,"FUNCTION":35,")":36,"HASH":37,"at_least_one_space":38,"S":39,"+":40,"-":41,"/":42,",":43,"$accept":0,"$end":1},
terminals_: {2:"error",8:":",11:";",12:"IDENT",20:"NUMBER",21:"PERCENTAGE",22:"LENGTH",23:"EMS",24:"EXS",25:"ANGLE",26:"TIME",27:"FREQ",28:"STRING",29:"URI",32:"BAD_STRING",33:"BAD_URI",34:"IMPORTANT_SYM",35:"FUNCTION",36:")",37:"HASH",39:"S",40:"+",41:"-",42:"/",43:","},
productions_: [0,[3,3],[5,5],[5,0],[6,3],[6,4],[6,0],[7,2],[9,2],[14,1],[14,2],[14,2],[14,3],[14,0],[13,1],[13,2],[13,1],[13,1],[16,2],[16,2],[16,2],[16,2],[16,2],[16,2],[16,2],[16,2],[18,2],[18,2],[18,2],[18,2],[18,2],[19,2],[19,2],[19,1],[10,2],[10,0],[31,5],[30,2],[38,1],[38,2],[4,1],[4,0],[17,1],[17,1],[15,2],[15,2]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:

      this.$ = [];
      var r = this.$;
      $$[$0-1] !== null? this.$.push($$[$0-1]) : '';
      $$[$0] !== null? $$[$0].forEach(function(e) { r.push(e); }) : ''

      /* this is used for capturing the empty declaration */
      if (this.$.length === 0) this.$.push({ type: -1, key: '', value: '' });
      return this.$;
    
break;
case 2:

      this.$ = {};
      this.$.key = $$[$0-4];

      this.$.type = -1;
      var l = $$[$0-1].length;
      l>0? this.$.value = $$[$0-1][l-1].value : '';

      /* TODO: we can refine the following logic by revising the grammar with 
         START_STRING and START_URI pattern (either unquoted,single or double quoted),
         however, I prefer of not having too much change in the grammar with the 
         original one to save the effort of maintenance
      */

      /* if the last expr is BAD_URI, then we test for the following pattern */
      if ($$[$0-1][l-1].type !== undefined && $$[$0-1][l-1].type === 'BAD_URI') {
        $$[$0-1][l-1].value.match(/^(url\([\s]*)$/i)? this.$.type = 1 : '';

      /* if the last expr is BAD_STRING pattern, then we test
         (1) the string is ended with single/double quote, then it is 5/6.
         (2) the second last expr is BAD_URI, then if it is ended with single/double quote, then it is 2/3.
         if the last expr is SPACE_EMPTY pattern, then it is 4
      */
      } else if ($$[$0-1][l-1].type !== undefined && ($$[$0-1][l-1].type === 'BAD_STRING' || $$[$0-1][l-1].type === 'SPACE_EMPTY')) {
        $$[$0-1][l-1].value === ''? this.$.type = 4 : '';
        $$[$0-1][l-1].value.match(/^'[\s]*$/)? this.$.type = 5 : '';
        $$[$0-1][l-1].value.match(/^"[\s]*$/)? this.$.type = 6 : '';

        if ($$[$0-1][l-2] !== undefined && $$[$0-1][l-2].type !== undefined && $$[$0-1][l-2].type === 'BAD_URI') {
          $$[$0-1][l-1].value.match(/^'[\s]*$/)? this.$.type = 2 : '';
          $$[$0-1][l-1].value.match(/^"[\s]*$/)? this.$.type = 3 : '';
          this.$.value = $$[$0-1][l-2].value + this.$.value;
        }

      /* if it is end with semicolon, keep it intact */
      } else if ($$[$0-1][l-1].type !== undefined && $$[$0-1][l-1].type === -2) {

      /* if the last expr is VALID pattern, then we test
         (1) the string is ended with at least one space.
         (2) look ahead one expr and see whether it is BAD_URI, if yes, it is ERROR.
      */
      } else {
        $$[$0-1][l-1].value.match(/[\s]+$/)?  this.$.type = 4 : '';

        if ($$[$0-1][l-2] !== undefined && $$[$0-1][l-2].type !== undefined && $$[$0-1][l-2].type === 'BAD_URI') {
          this.$.type = -1; /* always bad */
          this.$.value = $$[$0-1][l-2].value + this.$.value;
        }
      }

      $$[$0] !== null? this.$.value += ' ' + $$[$0] : '';
    
break;
case 3: case 6: case 13: case 35:
this.$ = null;
break;
case 4:

      this.$ = [];
      /* capture the semicolon */
      this.$.push({ type: -2, key: '', value: ';' });
      if ($$[$0] !== null) this.$.push($$[$0]);
    
break;
case 5:

      this.$ = [];
      this.$ = $$[$0-3];
      /* capture the semicolon */
      this.$.push({ type: -2, key: '', value: ';' });
      if ($$[$0] !== null) this.$.push($$[$0]);
    
break;
case 7: case 37: case 44: case 45:
this.$ = $$[$0-1];
break;
case 8:

      this.$ = [];
      this.$.push($$[$0-1]);
      var r = this.$;
      $$[$0] !== null? $$[$0].forEach(function(e) { r.push(e) }) : '';
    
break;
case 9: case 10:

      this.$ = [];
      this.$.push($$[$0]);
    
break;
case 11:

      this.$ = [];
      $$[$0-1] !== null? this.$ = $$[$0-1] : '';
      this.$.push($$[$0]);
    
break;
case 12:

      this.$ = [];
      $$[$0-2] !== null? this.$ = $$[$0-2] : '';
      this.$.push($$[$0]);
    
break;
case 14: case 16: case 17: case 40: case 42: case 43:
this.$ = $$[$0];
break;
case 15:

      this.$ = $$[$0];
      this.$.value = $$[$0-1] + $$[$0].value;
    
break;
case 18: case 19: case 20: case 21: case 22: case 23: case 24: case 25: case 26: case 27: case 28: case 29: case 30:
this.$ = { value: $$[$0-1] + $$[$0] };
break;
case 31:
this.$ = { value: $$[$0-1] + $$[$0], type: 'BAD_STRING' };
break;
case 32:
this.$ = { value: $$[$0-1] + $$[$0], type: 'BAD_URI'    };
break;
case 33:
this.$ = { value: $$[$0], type: 'SPACE_EMPTY' };
break;
case 34:
this.$ = $$[$0-1] + $$[$0];
break;
case 36:
this.$ = { value: $$[$0-4] + $$[$0-3] + $$[$0-2] + $$[$0-1] + $$[$0] };
break;
case 38: case 39:
this.$ = " ";
break;
case 41:
this.$ = "";
break;
}
},
table: [o($V0,$V1,{3:1,4:2,38:3,39:$V2}),{1:[3]},o($V3,$V4,{5:5,7:6,12:$V5}),o([1,8,11,12,20,21,22,23,24,25,26,27,28,29,32,33,34,35,36,37,40,41,42,43],[2,40],{39:[1,8]}),o($V6,[2,38]),{1:[2,6],6:9,11:[1,10]},{8:$V3},{4:12,8:$V1,38:3,39:$V2},o($V6,[2,39]),{1:[2,1],11:[1,13]},o($V0,$V1,{38:3,4:14,39:$V2}),o([1,11,12,20,21,22,23,24,25,26,27,28,29,32,33,34,35,37,40,41,42,43],$V1,{38:3,4:15,39:$V2}),{8:[2,7]},o($V0,$V1,{38:3,4:16,39:$V2}),o($V3,$V4,{7:6,5:17,12:$V5}),o([1,11,34,42,43],$V1,{38:3,9:18,13:19,16:20,17:21,18:22,19:23,30:37,31:38,4:41,12:$V7,20:$V8,21:$V9,22:$Va,23:$Vb,24:$Vc,25:$Vd,26:$Ve,27:$Vf,28:$Vg,29:$Vh,32:$Vi,33:$Vj,35:$Vk,37:$Vl,39:$V2,40:$Vm,41:$Vn}),o($V3,$V4,{7:6,5:44,12:$V5}),o($V3,[2,4]),o($V3,[2,35],{10:45,34:[1,46]}),o($Vo,[2,13],{38:3,16:20,17:21,18:22,19:23,30:37,31:38,4:41,14:47,13:48,15:49,12:$V7,20:$V8,21:$V9,22:$Va,23:$Vb,24:$Vc,25:$Vd,26:$Ve,27:$Vf,28:$Vg,29:$Vh,32:$Vi,33:$Vj,35:$Vk,37:$Vl,39:$V2,40:$Vm,41:$Vn,42:$Vp,43:$Vq}),o($Vr,[2,14]),{16:52,20:$V8,21:$V9,22:$Va,23:$Vb,24:$Vc,25:$Vd,26:$Ve,27:$Vf},o($Vr,[2,16]),o($Vr,[2,17]),o($Vs,$V1,{38:3,4:53,39:$V2}),o($Vs,$V1,{38:3,4:54,39:$V2}),o($Vs,$V1,{38:3,4:55,39:$V2}),o($Vs,$V1,{38:3,4:56,39:$V2}),o($Vs,$V1,{38:3,4:57,39:$V2}),o($Vs,$V1,{38:3,4:58,39:$V2}),o($Vs,$V1,{38:3,4:59,39:$V2}),o($Vs,$V1,{38:3,4:60,39:$V2}),o($Vt,[2,42]),o($Vt,[2,43]),o($Vs,$V1,{38:3,4:61,39:$V2}),o($Vs,$V1,{38:3,4:62,39:$V2}),o($Vs,$V1,{38:3,4:63,39:$V2}),o($Vs,$V1,{38:3,4:64,39:$V2}),o($Vs,$V1,{38:3,4:65,39:$V2}),o($Vs,$V1,{38:3,4:66,39:$V2}),o($Vs,$V1,{38:3,4:67,39:$V2}),o($Vr,[2,33]),o($Vs,$V1,{38:3,4:68,39:$V2}),o([12,20,21,22,23,24,25,26,27,28,29,32,33,35,36,37,40,41,42,43],$V1,{38:3,4:69,39:$V2}),o($V3,[2,5]),o($V3,[2,2]),o($V3,$V1,{38:3,4:70,39:$V2}),o($Vo,[2,8],{38:3,16:20,17:21,18:22,19:23,30:37,31:38,4:41,13:71,15:72,12:$V7,20:$V8,21:$V9,22:$Va,23:$Vb,24:$Vc,25:$Vd,26:$Ve,27:$Vf,28:$Vg,29:$Vh,32:$Vi,33:$Vj,35:$Vk,37:$Vl,39:$V2,40:$Vm,41:$Vn,42:$Vp,43:$Vq}),o($Vr,[2,9]),o($Vu,$V1,{38:3,16:20,17:21,18:22,19:23,30:37,31:38,4:41,13:73,12:$V7,20:$V8,21:$V9,22:$Va,23:$Vb,24:$Vc,25:$Vd,26:$Ve,27:$Vf,28:$Vg,29:$Vh,32:$Vi,33:$Vj,35:$Vk,37:$Vl,39:$V2,40:$Vm,41:$Vn}),o($Vs,$V1,{38:3,4:74,39:$V2}),o($Vs,$V1,{38:3,4:75,39:$V2}),o($Vr,[2,15]),o($Vr,[2,18]),o($Vr,[2,19]),o($Vr,[2,20]),o($Vr,[2,21]),o($Vr,[2,22]),o($Vr,[2,23]),o($Vr,[2,24]),o($Vr,[2,25]),o($Vr,[2,26]),o($Vr,[2,27]),o($Vr,[2,28]),o($Vr,[2,29]),o($Vr,[2,30]),o($Vr,[2,31]),o($Vr,[2,32]),o($Vr,[2,37]),o([36,42,43],$V1,{38:3,13:19,16:20,17:21,18:22,19:23,30:37,31:38,4:41,9:76,12:$V7,20:$V8,21:$V9,22:$Va,23:$Vb,24:$Vc,25:$Vd,26:$Ve,27:$Vf,28:$Vg,29:$Vh,32:$Vi,33:$Vj,35:$Vk,37:$Vl,39:$V2,40:$Vm,41:$Vn}),o($V3,[2,34]),o($Vr,[2,11]),o($Vu,$V1,{38:3,16:20,17:21,18:22,19:23,30:37,31:38,4:41,13:77,12:$V7,20:$V8,21:$V9,22:$Va,23:$Vb,24:$Vc,25:$Vd,26:$Ve,27:$Vf,28:$Vg,29:$Vh,32:$Vi,33:$Vj,35:$Vk,37:$Vl,39:$V2,40:$Vm,41:$Vn}),o($Vr,[2,10]),o($Vr,[2,44]),o($Vr,[2,45]),{36:[1,78]},o($Vr,[2,12]),o($Vs,$V1,{38:3,4:79,39:$V2}),o($Vr,[2,36])],
defaultActions: {12:[2,7]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        function lex() {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:return 39;
break;
case 1:
break;
case 2:
break;
case 3:return 'CDO';
break;
case 4:return 'CDC';
break;
case 5:return 'INCLUDES';
break;
case 6:return 'DASHMATCH';
break;
case 7:return 'PREFIXMATCH';
break;
case 8:return 'SUFFIXMATCH';
break;
case 9:return 'SUBSTRINGMATCH';
break;
case 10:return 'COLUMN';
break;
case 11:return 28;
break;
case 12:return 32;
break;
case 13:return 29;
break;
case 14:return 29;
break;
case 15:return 33;
break;
case 16:return 34;
break;
case 17:return 'IMPORT_SYM';
break;
case 18:return 'PAGE_SYM';
break;
case 19:return 'MEDIA_SYM';
break;
case 20:return 'CHARSET_SYM';
break;
case 21:return 'UNICODERANGE';
break;
case 22:return 'MEDIA_TYPE_PREFIX';
break;
case 23:return 'MEDIA_TYPE_PREFIX';
break;
case 24:return 'MEDIA_TYPE_AND';
break;
case 25:return 35;
break;
case 26:return 12;
break;
case 27:return 'VENDOR';
break;
case 28:return 'ATKEYWORD';
break;
case 29:return 37;
break;
case 30:return 23;
break;
case 31:return 24;
break;
case 32:return 22;
break;
case 33:return 22;
break;
case 34:return 22;
break;
case 35:return 22;
break;
case 36:return 22;
break;
case 37:return 22;
break;
case 38:return 25;
break;
case 39:return 25;
break;
case 40:return 25;
break;
case 41:return 26;
break;
case 42:return 26;
break;
case 43:return 27;
break;
case 44:return 27;
break;
case 45:return 21;
break;
case 46:return 20;
break;
case 47:return 'DIMENSION';
break;
case 48:return yy_.yytext; /* 'DELIM'; */
break;
}
},
rules: [/^(?:([ \t\r\n\f]+))/,/^(?:\/\*[^*]*\*+([^/*][^*]*\*+)*\/)/,/^(?:((\/\*[^*]*\*+([^/*][^*]*\*+)*)|(\/\*[^*]*(\*+[^/*][^*]*)*)))/,/^(?:<!--)/,/^(?:-->)/,/^(?:~=)/,/^(?:\|=)/,/^(?:\^=)/,/^(?:\$=)/,/^(?:\*=)/,/^(?:\|\|)/,/^(?:(("([ !#$%&'\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*")|('([ !#$%&"\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*')))/,/^(?:(("([^\n\r\f\\"]|\\(\n|\r\n|\r|\f)|((\\([0-9a-fA-F]){1,6}(\r\n|[ \t\r\n\f])?)|\\[^\r\n\f0-9a-fA-F]))*\\?)|('([^\n\r\f\\']|\\(\n|\r\n|\r|\f)|((\\([0-9a-fA-F]){1,6}(\r\n|[ \t\r\n\f])?)|\\[^\r\n\f0-9a-fA-F]))*\\?)))/,/^(?:[uU][rR][lL]\((([ \t\r\n\f]+)?)(("([ !#$%&'\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*")|('([ !#$%&"\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*'))(([ \t\r\n\f]+)?)\))/,/^(?:[uU][rR][lL]\((([ \t\r\n\f]+)?)(([a-zA-Z0-9]|[:\/\?#\[\]@]|[!$&'\*+,;=]|[%]|[\-\._~])*)(([ \t\r\n\f]+)?)\))/,/^(?:(([uU][rR][lL]\((([ \t\r\n\f]+)?)([!#$%&*-\[\]-~]|([\240-\377])|((\\([0-9a-fA-F]){1,6}(\r\n|[ \t\r\n\f])?)|\\[^\r\n\f0-9a-fA-F]))*(([ \t\r\n\f]+)?))|([uU][rR][lL]\((([ \t\r\n\f]+)?)(("([ !#$%&'\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*")|('([ !#$%&"\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*'))(([ \t\r\n\f]+)?))|([uU][rR][lL]\((([ \t\r\n\f]+)?)(("([^\n\r\f\\"]|\\(\n|\r\n|\r|\f)|((\\([0-9a-fA-F]){1,6}(\r\n|[ \t\r\n\f])?)|\\[^\r\n\f0-9a-fA-F]))*\\?)|('([^\n\r\f\\']|\\(\n|\r\n|\r|\f)|((\\([0-9a-fA-F]){1,6}(\r\n|[ \t\r\n\f])?)|\\[^\r\n\f0-9a-fA-F]))*\\?)))))/,/^(?:!((([ \t\r\n\f]+)?)|(\/\*[^*]*\*+([^/*][^*]*\*+)*\/))*(I|i|\\0{0,4}(49|69)(\r\n|[ \t\r\n\f])?|\\[i])(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m])(P|p|\\0{0,4}(50|70)(\r\n|[ \t\r\n\f])?|\\[p])(O|o|\\0{0,4}(4f|6f)(\r\n|[ \t\r\n\f])?|\\[o])(R|r|\\0{0,4}(52|72)(\r\n|[ \t\r\n\f])?|\\[r])(T|t|\\0{0,4}(54|74)(\r\n|[ \t\r\n\f])?|\\[t])(A|a|\\0{0,4}(41|61)(\r\n|[ \t\r\n\f])?)(N|n|\\0{0,4}(4e|6e)(\r\n|[ \t\r\n\f])?|\\[n])(T|t|\\0{0,4}(54|74)(\r\n|[ \t\r\n\f])?|\\[t]))/,/^(?:@(I|i|\\0{0,4}(49|69)(\r\n|[ \t\r\n\f])?|\\[i])(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m])(P|p|\\0{0,4}(50|70)(\r\n|[ \t\r\n\f])?|\\[p])(O|o|\\0{0,4}(4f|6f)(\r\n|[ \t\r\n\f])?|\\[o])(R|r|\\0{0,4}(52|72)(\r\n|[ \t\r\n\f])?|\\[r])(T|t|\\0{0,4}(54|74)(\r\n|[ \t\r\n\f])?|\\[t]))/,/^(?:@(P|p|\\0{0,4}(50|70)(\r\n|[ \t\r\n\f])?|\\[p])(A|a|\\0{0,4}(41|61)(\r\n|[ \t\r\n\f])?)(G|g|\\0{0,4}(47|67)(\r\n|[ \t\r\n\f])?|\\[g])(E|e|\\0{0,4}(45|65)(\r\n|[ \t\r\n\f])?))/,/^(?:@(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m])(E|e|\\0{0,4}(45|65)(\r\n|[ \t\r\n\f])?)(D|d|\\0{0,4}(44|64)(\r\n|[ \t\r\n\f])?)(I|i|\\0{0,4}(49|69)(\r\n|[ \t\r\n\f])?|\\[i])(A|a|\\0{0,4}(41|61)(\r\n|[ \t\r\n\f])?))/,/^(?:@charset )/,/^(?:(U|u|\\0{0,4}(55|75)(\r\n|[ \t\r\n\f])?|\\[u])\+([0-9a-fA-F?]{1,6}(-[0-9a-fA-F]{1,6})?))/,/^(?:only\b)/,/^(?:not\b)/,/^(?:and\b)/,/^(?:([\-]?([_a-zA-Z])([_a-zA-Z0-9\-])*)\()/,/^(?:([\-]?([_a-zA-Z])([_a-zA-Z0-9\-])*))/,/^(?:([\-_]([0-9a-fA-F])-([0-9a-fA-F])))/,/^(?:@([\-]?([_a-zA-Z])([_a-zA-Z0-9\-])*))/,/^(?:#(([_a-zA-Z0-9\-])+))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(E|e|\\0{0,4}(45|65)(\r\n|[ \t\r\n\f])?)(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(E|e|\\0{0,4}(45|65)(\r\n|[ \t\r\n\f])?)(X|x|\\0{0,4}(58|78)(\r\n|[ \t\r\n\f])?|\\[x]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(P|p|\\0{0,4}(50|70)(\r\n|[ \t\r\n\f])?|\\[p])(X|x|\\0{0,4}(58|78)(\r\n|[ \t\r\n\f])?|\\[x]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(C|c|\\0{0,4}(43|63)(\r\n|[ \t\r\n\f])?)(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m])(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(I|i|\\0{0,4}(49|69)(\r\n|[ \t\r\n\f])?|\\[i])(N|n|\\0{0,4}(4e|6e)(\r\n|[ \t\r\n\f])?|\\[n]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(P|p|\\0{0,4}(50|70)(\r\n|[ \t\r\n\f])?|\\[p])(T|t|\\0{0,4}(54|74)(\r\n|[ \t\r\n\f])?|\\[t]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(P|p|\\0{0,4}(50|70)(\r\n|[ \t\r\n\f])?|\\[p])(C|c|\\0{0,4}(43|63)(\r\n|[ \t\r\n\f])?))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(D|d|\\0{0,4}(44|64)(\r\n|[ \t\r\n\f])?)(E|e|\\0{0,4}(45|65)(\r\n|[ \t\r\n\f])?)(G|g|\\0{0,4}(47|67)(\r\n|[ \t\r\n\f])?|\\[g]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(R|r|\\0{0,4}(52|72)(\r\n|[ \t\r\n\f])?|\\[r])(A|a|\\0{0,4}(41|61)(\r\n|[ \t\r\n\f])?)(D|d|\\0{0,4}(44|64)(\r\n|[ \t\r\n\f])?))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(G|g|\\0{0,4}(47|67)(\r\n|[ \t\r\n\f])?|\\[g])(R|r|\\0{0,4}(52|72)(\r\n|[ \t\r\n\f])?|\\[r])(A|a|\\0{0,4}(41|61)(\r\n|[ \t\r\n\f])?)(D|d|\\0{0,4}(44|64)(\r\n|[ \t\r\n\f])?))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(M|m|\\0{0,4}(4d|6d)(\r\n|[ \t\r\n\f])?|\\[m])(S|s|\\0{0,4}(53|73)(\r\n|[ \t\r\n\f])?|\\[s]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(S|s|\\0{0,4}(53|73)(\r\n|[ \t\r\n\f])?|\\[s]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(H|h|\\0{0,4}(48|68)(\r\n|[ \t\r\n\f])?|\\[h])(Z|z|\\0{0,4}(5a|7a)(\r\n|[ \t\r\n\f])?|\\[z]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)(K|k|\\0{0,4}(4b|6b)(\r\n|[ \t\r\n\f])?|\\[k])(H|h|\\0{0,4}(48|68)(\r\n|[ \t\r\n\f])?|\\[h])(Z|z|\\0{0,4}(5a|7a)(\r\n|[ \t\r\n\f])?|\\[z]))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)%)/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?))/,/^(?:([0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|\.[0-9]+([eE][+\-][0-9])?)([\-]?([_a-zA-Z])([_a-zA-Z0-9\-])*))/,/^(?:.)/],
conditions: {"INITIAL":{"rules":[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48],"inclusive":true}}
});
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"_process":5,"fs":3,"path":4}],39:[function(require,module,exports){
/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {
"use strict";

require('../src/polyfills/minimal.js');
var cssParser = require("./css-parser/css-parser.js");

var HtmlEntitiesDecoder = require("./html-decoder/html-decoder.js"),
    htmlDecoder = new HtmlEntitiesDecoder(); 

/////////////////////////////////////////////////////
//
// @module CSSParserUtils
// 
/////////////////////////////////////////////////////
var CSSParserUtils = {};

/* emum type of parseStyleAttributeValue */
CSSParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED      = 1;
CSSParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED = 2;
CSSParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED = 3;
CSSParserUtils.STYLE_ATTRIBUTE_UNQUOTED          = 4;
CSSParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED     = 5;
CSSParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED     = 6;

CSSParserUtils.STYLE_ATTRIBUTE_ERROR                     = -1;
CSSParserUtils.SEMICOLON                                 = -2;

/**
* @function CSSParserUtils.parseStyleAttributeValue
*/
CSSParserUtils.parseStyleAttributeValue = function(str) {

    var r = { prop: '', code: CSSParserUtils.STYLE_ATTRIBUTE_ERROR },
        p = cssParser.parse(str),
        l = p.length-1;

    if (l >= 0) {
        r.prop = p[l].key;
        r.code = p[l].type;
    }

    return r;
};

/* exposing it */
module.exports = CSSParserUtils;

})();

},{"../src/polyfills/minimal.js":45,"./css-parser/css-parser.js":38,"./html-decoder/html-decoder.js":42}],40:[function(require,module,exports){
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
HandlebarsUtils.rawExpressionRegExp = /^\{\{\{~?\s*@?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~?\}\}\}(?!})/;

/* '{{' '~'? 'space'* '@'? 'space'* ('not {}~'+) '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.ESCAPE_EXPRESSION = 2; // {{expression}}
HandlebarsUtils.escapeExpressionRegExp = /^\{\{~?\s*@?\s*([^\}\{~]+)~?\}\}(?!})/;

/* '{{' '~'? '>' '\s'* ('not \s, special-char'+) '\s'* 'not ~{}'* non-greedy '}}' and not follow by '}' */
HandlebarsUtils.PARTIAL_EXPRESSION = 3; // {{>.*}}
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?>\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^~\}\{]*~?\}\}(?!})/;

/* '{{' '~'? '&' '\s'* ('not \s, special-char'+) '\s'* 'not ~{}'* non-greedy '}}' and not follow by '}' */
HandlebarsUtils.REFERENCE_EXPRESSION = 11; // {{&.*}}
HandlebarsUtils.referenceExpressionRegExp = /^\{\{~?&\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^~\}\{]*~?\}\}(?!})/;

/* '{{' '~'? '# or ^' '\s'* ('not \s, special-char'+) '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.BRANCH_EXPRESSION = 4; // {{#.*}}, {{^.*}}
HandlebarsUtils.branchExpressionRegExp = /^\{\{~?[#|\^]\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^\}\{~]*~?\}\}(?!})/;
/* '{{' '~'? '/' '\s'* ('not \s, special-char'+) '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.BRANCH_END_EXPRESSION = 5; // {{/.*}}
HandlebarsUtils.branchEndExpressionRegExp = /^\{\{~?\/\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^\}\{~]*~?\}\}(?!})/;

/* '{{' '~'? '\s'* 'else' '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.ELSE_EXPRESSION = 6; // {{else}}, {{^}}
HandlebarsUtils.elseExpressionRegExp = /^\{\{~?\s*else\s*[^\}\{~]*~?\}\}(?!})/;
/* '{{' '~'? '^'{1} '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.elseShortFormExpressionRegExp = /^\{\{~?\^{1}~?\}\}(?!})/;

/* '{{' '~'? '!--' */
HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM = 7; // {{!--.*--}}
HandlebarsUtils.commentLongFormExpressionRegExp = /^\{\{~?!--/;
/* '{{' '~'? '!' */
HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM = 8; // {{!.*}}
HandlebarsUtils.commentShortFormExpressionRegExp = /^\{\{~?!/;

HandlebarsUtils.SINGLE_ESCAPED_MUSTACHE = 9;
HandlebarsUtils.DOUBLE_ESCAPED_MUSTACHE = 10;
HandlebarsUtils.NOT_ESCAPED_MUSTACHE = 11;

// @function HandlebarsUtils.lookBackTest
HandlebarsUtils.lookBackTest = function(input, i) {
    var len = input.length;

    if (input[i] === '{' && i+1<len && input[i+1] === '{') {
        if (i-2 >= 0 && input[i-1] === '\\' && input[i-2] === '\\') {
            return HandlebarsUtils.DOUBLE_ESCAPED_MUSTACHE;
        } else if (i-1 >= 0 && input[i-1] === '\\') {
            return HandlebarsUtils.SINGLE_ESCAPED_MUSTACHE;
        } else {
            return HandlebarsUtils.NOT_ESCAPED_MUSTACHE;
        } 
    }
    /* never falls into this and should throw error */
    return HandlebarsUtils.UNHANDLED_EXPRESSION;
};

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
            if (re) {
                // NOTE: the re.index field is never been used.
                var r = HandlebarsUtils.parseEscapeExpression(re[1]);
                re[1] = r[1];
                re[2] = r[2];

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

// @function HandlebarsUtils.parseEscapeExpression
HandlebarsUtils.parseEscapeExpression = function(str) {
  var j=0, inSquareBracket = false,
      fstr = '', re = [];

  // the new regexp will capture the tailing space.
  str = str.replace(/\s+$/, '');
  while(j<str.length) {
      // space is defined as \s in the handlebars lex
      if (str[j].match(/\s/) && !inSquareBracket) {
          break;
      } else if (str[j] === '[') {
          inSquareBracket = true;
      } else if (str[j] === ']') {
          inSquareBracket = false;
      }
      fstr += str[j];
      ++j;
  }

  re[1] = fstr;
  re[2] = str.substring(j).replace(/^\s+/, '').replace(/\s+$/, '');
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

HandlebarsUtils.warn = (function(){
    if (typeof console === 'object') {
        if (console.hasOwnProperty('warn') && typeof console.warn === 'function') {
            return console.warn;
        } else if (console.hasOwnProperty('log') && typeof console.log === 'function') {
            return console.log;
        }
    }
    return function(){};
})();


// @function HandlebarsUtils.handleError
HandlebarsUtils.handleError = function(exceptionObj, throwErr) {
    HandlebarsUtils.warn(exceptionObj.msg + " [lineNo:" + exceptionObj.lineNo + ",charNo:" + exceptionObj.charNo + "]");
    if (throwErr) {
        throw exceptionObj;
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

// <iframe srcdoc=""> is a scriptable attribute too
// Reference: https://html.spec.whatwg.org/multipage/embedded-content.html#attr-iframe-srcdoc
HandlebarsUtils.scriptableTags = {
    script:1,style:1,
    svg:1,xml:1,math:1,
    applet:1,object:1,embed:1,link:1,
    scriptlet:1                  // IE-specific
};

/**
 * @function HandlebarsUtils#isScriptableTag
 *
 * @returns {boolean} true if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
HandlebarsUtils.isScriptableTag = function(tag) {
    return HandlebarsUtils.scriptableTags[tag] === 1;
};

module.exports = HandlebarsUtils;

})();

},{"xss-filters":36}],41:[function(require,module,exports){
(function() {
"use strict";
var HTMLNamedCharReferenceTrie = {"A":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[193],"characters":"Á"},";":{"0":{"codepoints":[193],"characters":"Á"}}}}}}},"b":{"r":{"e":{"v":{"e":{";":{"0":{"codepoints":[258],"characters":"Ă"}}}}}}},"c":{"i":{"r":{"c":{"0":{"codepoints":[194],"characters":"Â"},";":{"0":{"codepoints":[194],"characters":"Â"}}}}},"y":{";":{"0":{"codepoints":[1040],"characters":"А"}}}},"E":{"l":{"i":{"g":{"0":{"codepoints":[198],"characters":"Æ"},";":{"0":{"codepoints":[198],"characters":"Æ"}}}}}},"f":{"r":{";":{"0":{"codepoints":[120068],"characters":"𝔄"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[192],"characters":"À"},";":{"0":{"codepoints":[192],"characters":"À"}}}}}}},"l":{"p":{"h":{"a":{";":{"0":{"codepoints":[913],"characters":"Α"}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[256],"characters":"Ā"}}}}}},"M":{"P":{"0":{"codepoints":[38],"characters":"&"},";":{"0":{"codepoints":[38],"characters":"&"}}}},"n":{"d":{";":{"0":{"codepoints":[10835],"characters":"⩓"}}}},"o":{"g":{"o":{"n":{";":{"0":{"codepoints":[260],"characters":"Ą"}}}}},"p":{"f":{";":{"0":{"codepoints":[120120],"characters":"𝔸"}}}}},"p":{"p":{"l":{"y":{"F":{"u":{"n":{"c":{"t":{"i":{"o":{"n":{";":{"0":{"codepoints":[8289],"characters":"⁡"}}}}}}}}}}}}}},"r":{"i":{"n":{"g":{"0":{"codepoints":[197],"characters":"Å"},";":{"0":{"codepoints":[197],"characters":"Å"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119964],"characters":"𝒜"}}}},"s":{"i":{"g":{"n":{";":{"0":{"codepoints":[8788],"characters":"≔"}}}}}}},"t":{"i":{"l":{"d":{"e":{"0":{"codepoints":[195],"characters":"Ã"},";":{"0":{"codepoints":[195],"characters":"Ã"}}}}}}},"u":{"m":{"l":{"0":{"codepoints":[196],"characters":"Ä"},";":{"0":{"codepoints":[196],"characters":"Ä"}}}}}},"a":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[225],"characters":"á"},";":{"0":{"codepoints":[225],"characters":"á"}}}}}}},"b":{"r":{"e":{"v":{"e":{";":{"0":{"codepoints":[259],"characters":"ă"}}}}}}},"c":{";":{"0":{"codepoints":[8766],"characters":"∾"}},"d":{";":{"0":{"codepoints":[8767],"characters":"∿"}}},"E":{";":{"0":{"codepoints":[8766,819],"characters":"∾̳"}}},"i":{"r":{"c":{"0":{"codepoints":[226],"characters":"â"},";":{"0":{"codepoints":[226],"characters":"â"}}}}},"u":{"t":{"e":{"0":{"codepoints":[180],"characters":"´"},";":{"0":{"codepoints":[180],"characters":"´"}}}}},"y":{";":{"0":{"codepoints":[1072],"characters":"а"}}}},"e":{"l":{"i":{"g":{"0":{"codepoints":[230],"characters":"æ"},";":{"0":{"codepoints":[230],"characters":"æ"}}}}}},"f":{";":{"0":{"codepoints":[8289],"characters":"⁡"}},"r":{";":{"0":{"codepoints":[120094],"characters":"𝔞"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[224],"characters":"à"},";":{"0":{"codepoints":[224],"characters":"à"}}}}}}},"l":{"e":{"f":{"s":{"y":{"m":{";":{"0":{"codepoints":[8501],"characters":"ℵ"}}}}}},"p":{"h":{";":{"0":{"codepoints":[8501],"characters":"ℵ"}}}}},"p":{"h":{"a":{";":{"0":{"codepoints":[945],"characters":"α"}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[257],"characters":"ā"}}}},"l":{"g":{";":{"0":{"codepoints":[10815],"characters":"⨿"}}}}},"p":{"0":{"codepoints":[38],"characters":"&"},";":{"0":{"codepoints":[38],"characters":"&"}}}},"n":{"d":{"a":{"n":{"d":{";":{"0":{"codepoints":[10837],"characters":"⩕"}}}}},";":{"0":{"codepoints":[8743],"characters":"∧"}},"d":{";":{"0":{"codepoints":[10844],"characters":"⩜"}}},"s":{"l":{"o":{"p":{"e":{";":{"0":{"codepoints":[10840],"characters":"⩘"}}}}}}},"v":{";":{"0":{"codepoints":[10842],"characters":"⩚"}}}},"g":{";":{"0":{"codepoints":[8736],"characters":"∠"}},"e":{";":{"0":{"codepoints":[10660],"characters":"⦤"}}},"l":{"e":{";":{"0":{"codepoints":[8736],"characters":"∠"}}}},"m":{"s":{"d":{"a":{"a":{";":{"0":{"codepoints":[10664],"characters":"⦨"}}},"b":{";":{"0":{"codepoints":[10665],"characters":"⦩"}}},"c":{";":{"0":{"codepoints":[10666],"characters":"⦪"}}},"d":{";":{"0":{"codepoints":[10667],"characters":"⦫"}}},"e":{";":{"0":{"codepoints":[10668],"characters":"⦬"}}},"f":{";":{"0":{"codepoints":[10669],"characters":"⦭"}}},"g":{";":{"0":{"codepoints":[10670],"characters":"⦮"}}},"h":{";":{"0":{"codepoints":[10671],"characters":"⦯"}}}},";":{"0":{"codepoints":[8737],"characters":"∡"}}}}},"r":{"t":{";":{"0":{"codepoints":[8735],"characters":"∟"}},"v":{"b":{";":{"0":{"codepoints":[8894],"characters":"⊾"}},"d":{";":{"0":{"codepoints":[10653],"characters":"⦝"}}}}}}},"s":{"p":{"h":{";":{"0":{"codepoints":[8738],"characters":"∢"}}}},"t":{";":{"0":{"codepoints":[197],"characters":"Å"}}}},"z":{"a":{"r":{"r":{";":{"0":{"codepoints":[9084],"characters":"⍼"}}}}}}}},"o":{"g":{"o":{"n":{";":{"0":{"codepoints":[261],"characters":"ą"}}}}},"p":{"f":{";":{"0":{"codepoints":[120146],"characters":"𝕒"}}}}},"p":{"a":{"c":{"i":{"r":{";":{"0":{"codepoints":[10863],"characters":"⩯"}}}}}},";":{"0":{"codepoints":[8776],"characters":"≈"}},"E":{";":{"0":{"codepoints":[10864],"characters":"⩰"}}},"e":{";":{"0":{"codepoints":[8778],"characters":"≊"}}},"i":{"d":{";":{"0":{"codepoints":[8779],"characters":"≋"}}}},"o":{"s":{";":{"0":{"codepoints":[39],"characters":"'"}}}},"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[8776],"characters":"≈"}},"e":{"q":{";":{"0":{"codepoints":[8778],"characters":"≊"}}}}}}}}},"r":{"i":{"n":{"g":{"0":{"codepoints":[229],"characters":"å"},";":{"0":{"codepoints":[229],"characters":"å"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119990],"characters":"𝒶"}}}},"t":{";":{"0":{"codepoints":[42],"characters":"*"}}},"y":{"m":{"p":{";":{"0":{"codepoints":[8776],"characters":"≈"}},"e":{"q":{";":{"0":{"codepoints":[8781],"characters":"≍"}}}}}}}},"t":{"i":{"l":{"d":{"e":{"0":{"codepoints":[227],"characters":"ã"},";":{"0":{"codepoints":[227],"characters":"ã"}}}}}}},"u":{"m":{"l":{"0":{"codepoints":[228],"characters":"ä"},";":{"0":{"codepoints":[228],"characters":"ä"}}}}},"w":{"c":{"o":{"n":{"i":{"n":{"t":{";":{"0":{"codepoints":[8755],"characters":"∳"}}}}}}}},"i":{"n":{"t":{";":{"0":{"codepoints":[10769],"characters":"⨑"}}}}}}},"b":{"a":{"c":{"k":{"c":{"o":{"n":{"g":{";":{"0":{"codepoints":[8780],"characters":"≌"}}}}}},"e":{"p":{"s":{"i":{"l":{"o":{"n":{";":{"0":{"codepoints":[1014],"characters":"϶"}}}}}}}}},"p":{"r":{"i":{"m":{"e":{";":{"0":{"codepoints":[8245],"characters":"‵"}}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8765],"characters":"∽"}},"e":{"q":{";":{"0":{"codepoints":[8909],"characters":"⋍"}}}}}}}}},"r":{"v":{"e":{"e":{";":{"0":{"codepoints":[8893],"characters":"⊽"}}}}},"w":{"e":{"d":{";":{"0":{"codepoints":[8965],"characters":"⌅"}},"g":{"e":{";":{"0":{"codepoints":[8965],"characters":"⌅"}}}}}}}}},"b":{"r":{"k":{";":{"0":{"codepoints":[9141],"characters":"⎵"}},"t":{"b":{"r":{"k":{";":{"0":{"codepoints":[9142],"characters":"⎶"}}}}}}}}},"c":{"o":{"n":{"g":{";":{"0":{"codepoints":[8780],"characters":"≌"}}}}},"y":{";":{"0":{"codepoints":[1073],"characters":"б"}}}},"d":{"q":{"u":{"o":{";":{"0":{"codepoints":[8222],"characters":"„"}}}}}},"e":{"c":{"a":{"u":{"s":{";":{"0":{"codepoints":[8757],"characters":"∵"}},"e":{";":{"0":{"codepoints":[8757],"characters":"∵"}}}}}}},"m":{"p":{"t":{"y":{"v":{";":{"0":{"codepoints":[10672],"characters":"⦰"}}}}}}},"p":{"s":{"i":{";":{"0":{"codepoints":[1014],"characters":"϶"}}}}},"r":{"n":{"o":{"u":{";":{"0":{"codepoints":[8492],"characters":"ℬ"}}}}}},"t":{"a":{";":{"0":{"codepoints":[946],"characters":"β"}}},"h":{";":{"0":{"codepoints":[8502],"characters":"ℶ"}}},"w":{"e":{"e":{"n":{";":{"0":{"codepoints":[8812],"characters":"≬"}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120095],"characters":"𝔟"}}}},"i":{"g":{"c":{"a":{"p":{";":{"0":{"codepoints":[8898],"characters":"⋂"}}}},"i":{"r":{"c":{";":{"0":{"codepoints":[9711],"characters":"◯"}}}}},"u":{"p":{";":{"0":{"codepoints":[8899],"characters":"⋃"}}}}},"o":{"d":{"o":{"t":{";":{"0":{"codepoints":[10752],"characters":"⨀"}}}}},"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[10753],"characters":"⨁"}}}}}},"t":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[10754],"characters":"⨂"}}}}}}}},"s":{"q":{"c":{"u":{"p":{";":{"0":{"codepoints":[10758],"characters":"⨆"}}}}}},"t":{"a":{"r":{";":{"0":{"codepoints":[9733],"characters":"★"}}}}}},"t":{"r":{"i":{"a":{"n":{"g":{"l":{"e":{"d":{"o":{"w":{"n":{";":{"0":{"codepoints":[9661],"characters":"▽"}}}}}},"u":{"p":{";":{"0":{"codepoints":[9651],"characters":"△"}}}}}}}}}}}},"u":{"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[10756],"characters":"⨄"}}}}}}},"v":{"e":{"e":{";":{"0":{"codepoints":[8897],"characters":"⋁"}}}}},"w":{"e":{"d":{"g":{"e":{";":{"0":{"codepoints":[8896],"characters":"⋀"}}}}}}}}},"k":{"a":{"r":{"o":{"w":{";":{"0":{"codepoints":[10509],"characters":"⤍"}}}}}}},"l":{"a":{"c":{"k":{"l":{"o":{"z":{"e":{"n":{"g":{"e":{";":{"0":{"codepoints":[10731],"characters":"⧫"}}}}}}}}},"s":{"q":{"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[9642],"characters":"▪"}}}}}}}},"t":{"r":{"i":{"a":{"n":{"g":{"l":{"e":{";":{"0":{"codepoints":[9652],"characters":"▴"}},"d":{"o":{"w":{"n":{";":{"0":{"codepoints":[9662],"characters":"▾"}}}}}},"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[9666],"characters":"◂"}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[9656],"characters":"▸"}}}}}}}}}}}}}}}}},"n":{"k":{";":{"0":{"codepoints":[9251],"characters":"␣"}}}}},"k":{"1":{"2":{";":{"0":{"codepoints":[9618],"characters":"▒"}}},"4":{";":{"0":{"codepoints":[9617],"characters":"░"}}}},"3":{"4":{";":{"0":{"codepoints":[9619],"characters":"▓"}}}}},"o":{"c":{"k":{";":{"0":{"codepoints":[9608],"characters":"█"}}}}}},"n":{"e":{";":{"0":{"codepoints":[61,8421],"characters":"=⃥"}},"q":{"u":{"i":{"v":{";":{"0":{"codepoints":[8801,8421],"characters":"≡⃥"}}}}}}},"o":{"t":{";":{"0":{"codepoints":[8976],"characters":"⌐"}}}}},"N":{"o":{"t":{";":{"0":{"codepoints":[10989],"characters":"⫭"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120147],"characters":"𝕓"}}}},"t":{";":{"0":{"codepoints":[8869],"characters":"⊥"}},"t":{"o":{"m":{";":{"0":{"codepoints":[8869],"characters":"⊥"}}}}}},"w":{"t":{"i":{"e":{";":{"0":{"codepoints":[8904],"characters":"⋈"}}}}}},"x":{"b":{"o":{"x":{";":{"0":{"codepoints":[10697],"characters":"⧉"}}}}},"d":{"l":{";":{"0":{"codepoints":[9488],"characters":"┐"}}},"L":{";":{"0":{"codepoints":[9557],"characters":"╕"}}},"r":{";":{"0":{"codepoints":[9484],"characters":"┌"}}},"R":{";":{"0":{"codepoints":[9554],"characters":"╒"}}}},"D":{"l":{";":{"0":{"codepoints":[9558],"characters":"╖"}}},"L":{";":{"0":{"codepoints":[9559],"characters":"╗"}}},"r":{";":{"0":{"codepoints":[9555],"characters":"╓"}}},"R":{";":{"0":{"codepoints":[9556],"characters":"╔"}}}},"h":{";":{"0":{"codepoints":[9472],"characters":"─"}},"d":{";":{"0":{"codepoints":[9516],"characters":"┬"}}},"D":{";":{"0":{"codepoints":[9573],"characters":"╥"}}},"u":{";":{"0":{"codepoints":[9524],"characters":"┴"}}},"U":{";":{"0":{"codepoints":[9576],"characters":"╨"}}}},"H":{";":{"0":{"codepoints":[9552],"characters":"═"}},"d":{";":{"0":{"codepoints":[9572],"characters":"╤"}}},"D":{";":{"0":{"codepoints":[9574],"characters":"╦"}}},"u":{";":{"0":{"codepoints":[9575],"characters":"╧"}}},"U":{";":{"0":{"codepoints":[9577],"characters":"╩"}}}},"m":{"i":{"n":{"u":{"s":{";":{"0":{"codepoints":[8863],"characters":"⊟"}}}}}}},"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[8862],"characters":"⊞"}}}}}},"t":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8864],"characters":"⊠"}}}}}}},"u":{"l":{";":{"0":{"codepoints":[9496],"characters":"┘"}}},"L":{";":{"0":{"codepoints":[9563],"characters":"╛"}}},"r":{";":{"0":{"codepoints":[9492],"characters":"└"}}},"R":{";":{"0":{"codepoints":[9560],"characters":"╘"}}}},"U":{"l":{";":{"0":{"codepoints":[9564],"characters":"╜"}}},"L":{";":{"0":{"codepoints":[9565],"characters":"╝"}}},"r":{";":{"0":{"codepoints":[9561],"characters":"╙"}}},"R":{";":{"0":{"codepoints":[9562],"characters":"╚"}}}},"v":{";":{"0":{"codepoints":[9474],"characters":"│"}},"h":{";":{"0":{"codepoints":[9532],"characters":"┼"}}},"H":{";":{"0":{"codepoints":[9578],"characters":"╪"}}},"l":{";":{"0":{"codepoints":[9508],"characters":"┤"}}},"L":{";":{"0":{"codepoints":[9569],"characters":"╡"}}},"r":{";":{"0":{"codepoints":[9500],"characters":"├"}}},"R":{";":{"0":{"codepoints":[9566],"characters":"╞"}}}},"V":{";":{"0":{"codepoints":[9553],"characters":"║"}},"h":{";":{"0":{"codepoints":[9579],"characters":"╫"}}},"H":{";":{"0":{"codepoints":[9580],"characters":"╬"}}},"l":{";":{"0":{"codepoints":[9570],"characters":"╢"}}},"L":{";":{"0":{"codepoints":[9571],"characters":"╣"}}},"r":{";":{"0":{"codepoints":[9567],"characters":"╟"}}},"R":{";":{"0":{"codepoints":[9568],"characters":"╠"}}}}}},"p":{"r":{"i":{"m":{"e":{";":{"0":{"codepoints":[8245],"characters":"‵"}}}}}}},"r":{"e":{"v":{"e":{";":{"0":{"codepoints":[728],"characters":"˘"}}}}},"v":{"b":{"a":{"r":{"0":{"codepoints":[166],"characters":"¦"},";":{"0":{"codepoints":[166],"characters":"¦"}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119991],"characters":"𝒷"}}}},"e":{"m":{"i":{";":{"0":{"codepoints":[8271],"characters":"⁏"}}}}},"i":{"m":{";":{"0":{"codepoints":[8765],"characters":"∽"}},"e":{";":{"0":{"codepoints":[8909],"characters":"⋍"}}}}},"o":{"l":{"b":{";":{"0":{"codepoints":[10693],"characters":"⧅"}}},";":{"0":{"codepoints":[92],"characters":"\\"}},"h":{"s":{"u":{"b":{";":{"0":{"codepoints":[10184],"characters":"⟈"}}}}}}}}},"u":{"l":{"l":{";":{"0":{"codepoints":[8226],"characters":"•"}},"e":{"t":{";":{"0":{"codepoints":[8226],"characters":"•"}}}}}},"m":{"p":{";":{"0":{"codepoints":[8782],"characters":"≎"}},"E":{";":{"0":{"codepoints":[10926],"characters":"⪮"}}},"e":{";":{"0":{"codepoints":[8783],"characters":"≏"}},"q":{";":{"0":{"codepoints":[8783],"characters":"≏"}}}}}}}},"B":{"a":{"c":{"k":{"s":{"l":{"a":{"s":{"h":{";":{"0":{"codepoints":[8726],"characters":"∖"}}}}}}}}},"r":{"v":{";":{"0":{"codepoints":[10983],"characters":"⫧"}}},"w":{"e":{"d":{";":{"0":{"codepoints":[8966],"characters":"⌆"}}}}}}},"c":{"y":{";":{"0":{"codepoints":[1041],"characters":"Б"}}}},"e":{"c":{"a":{"u":{"s":{"e":{";":{"0":{"codepoints":[8757],"characters":"∵"}}}}}}},"r":{"n":{"o":{"u":{"l":{"l":{"i":{"s":{";":{"0":{"codepoints":[8492],"characters":"ℬ"}}}}}}}}}},"t":{"a":{";":{"0":{"codepoints":[914],"characters":"Β"}}}}},"f":{"r":{";":{"0":{"codepoints":[120069],"characters":"𝔅"}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120121],"characters":"𝔹"}}}}},"r":{"e":{"v":{"e":{";":{"0":{"codepoints":[728],"characters":"˘"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8492],"characters":"ℬ"}}}}},"u":{"m":{"p":{"e":{"q":{";":{"0":{"codepoints":[8782],"characters":"≎"}}}}}}}},"C":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[262],"characters":"Ć"}}}}}},"p":{";":{"0":{"codepoints":[8914],"characters":"⋒"}},"i":{"t":{"a":{"l":{"D":{"i":{"f":{"f":{"e":{"r":{"e":{"n":{"t":{"i":{"a":{"l":{"D":{";":{"0":{"codepoints":[8517],"characters":"ⅅ"}}}}}}}}}}}}}}}}}}}},"y":{"l":{"e":{"y":{"s":{";":{"0":{"codepoints":[8493],"characters":"ℭ"}}}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[268],"characters":"Č"}}}}}},"e":{"d":{"i":{"l":{"0":{"codepoints":[199],"characters":"Ç"},";":{"0":{"codepoints":[199],"characters":"Ç"}}}}}},"i":{"r":{"c":{";":{"0":{"codepoints":[264],"characters":"Ĉ"}}}}},"o":{"n":{"i":{"n":{"t":{";":{"0":{"codepoints":[8752],"characters":"∰"}}}}}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[266],"characters":"Ċ"}}}}},"e":{"d":{"i":{"l":{"l":{"a":{";":{"0":{"codepoints":[184],"characters":"¸"}}}}}}},"n":{"t":{"e":{"r":{"D":{"o":{"t":{";":{"0":{"codepoints":[183],"characters":"·"}}}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[8493],"characters":"ℭ"}}}},"H":{"c":{"y":{";":{"0":{"codepoints":[1063],"characters":"Ч"}}}}},"h":{"i":{";":{"0":{"codepoints":[935],"characters":"Χ"}}}},"i":{"r":{"c":{"l":{"e":{"D":{"o":{"t":{";":{"0":{"codepoints":[8857],"characters":"⊙"}}}}},"M":{"i":{"n":{"u":{"s":{";":{"0":{"codepoints":[8854],"characters":"⊖"}}}}}}},"P":{"l":{"u":{"s":{";":{"0":{"codepoints":[8853],"characters":"⊕"}}}}}},"T":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8855],"characters":"⊗"}}}}}}}}}}}},"l":{"o":{"c":{"k":{"w":{"i":{"s":{"e":{"C":{"o":{"n":{"t":{"o":{"u":{"r":{"I":{"n":{"t":{"e":{"g":{"r":{"a":{"l":{";":{"0":{"codepoints":[8754],"characters":"∲"}}}}}}}}}}}}}}}}}}}}}}},"s":{"e":{"C":{"u":{"r":{"l":{"y":{"D":{"o":{"u":{"b":{"l":{"e":{"Q":{"u":{"o":{"t":{"e":{";":{"0":{"codepoints":[8221],"characters":"”"}}}}}}}}}}}}},"Q":{"u":{"o":{"t":{"e":{";":{"0":{"codepoints":[8217],"characters":"’"}}}}}}}}}}}}}}}},"o":{"l":{"o":{"n":{";":{"0":{"codepoints":[8759],"characters":"∷"}},"e":{";":{"0":{"codepoints":[10868],"characters":"⩴"}}}}}},"n":{"g":{"r":{"u":{"e":{"n":{"t":{";":{"0":{"codepoints":[8801],"characters":"≡"}}}}}}}},"i":{"n":{"t":{";":{"0":{"codepoints":[8751],"characters":"∯"}}}}},"t":{"o":{"u":{"r":{"I":{"n":{"t":{"e":{"g":{"r":{"a":{"l":{";":{"0":{"codepoints":[8750],"characters":"∮"}}}}}}}}}}}}}}},"p":{"f":{";":{"0":{"codepoints":[8450],"characters":"ℂ"}}},"r":{"o":{"d":{"u":{"c":{"t":{";":{"0":{"codepoints":[8720],"characters":"∐"}}}}}}}}},"u":{"n":{"t":{"e":{"r":{"C":{"l":{"o":{"c":{"k":{"w":{"i":{"s":{"e":{"C":{"o":{"n":{"t":{"o":{"u":{"r":{"I":{"n":{"t":{"e":{"g":{"r":{"a":{"l":{";":{"0":{"codepoints":[8755],"characters":"∳"}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}}},"O":{"P":{"Y":{"0":{"codepoints":[169],"characters":"©"},";":{"0":{"codepoints":[169],"characters":"©"}}}}},"r":{"o":{"s":{"s":{";":{"0":{"codepoints":[10799],"characters":"⨯"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119966],"characters":"𝒞"}}}}},"u":{"p":{"C":{"a":{"p":{";":{"0":{"codepoints":[8781],"characters":"≍"}}}}},";":{"0":{"codepoints":[8915],"characters":"⋓"}}}}},"c":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[263],"characters":"ć"}}}}}},"p":{"a":{"n":{"d":{";":{"0":{"codepoints":[10820],"characters":"⩄"}}}}},"b":{"r":{"c":{"u":{"p":{";":{"0":{"codepoints":[10825],"characters":"⩉"}}}}}}},"c":{"a":{"p":{";":{"0":{"codepoints":[10827],"characters":"⩋"}}}},"u":{"p":{";":{"0":{"codepoints":[10823],"characters":"⩇"}}}}},";":{"0":{"codepoints":[8745],"characters":"∩"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10816],"characters":"⩀"}}}}},"s":{";":{"0":{"codepoints":[8745,65024],"characters":"∩︀"}}}},"r":{"e":{"t":{";":{"0":{"codepoints":[8257],"characters":"⁁"}}}},"o":{"n":{";":{"0":{"codepoints":[711],"characters":"ˇ"}}}}}},"c":{"a":{"p":{"s":{";":{"0":{"codepoints":[10829],"characters":"⩍"}}}},"r":{"o":{"n":{";":{"0":{"codepoints":[269],"characters":"č"}}}}}},"e":{"d":{"i":{"l":{"0":{"codepoints":[231],"characters":"ç"},";":{"0":{"codepoints":[231],"characters":"ç"}}}}}},"i":{"r":{"c":{";":{"0":{"codepoints":[265],"characters":"ĉ"}}}}},"u":{"p":{"s":{";":{"0":{"codepoints":[10828],"characters":"⩌"}},"s":{"m":{";":{"0":{"codepoints":[10832],"characters":"⩐"}}}}}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[267],"characters":"ċ"}}}}},"e":{"d":{"i":{"l":{"0":{"codepoints":[184],"characters":"¸"},";":{"0":{"codepoints":[184],"characters":"¸"}}}}},"m":{"p":{"t":{"y":{"v":{";":{"0":{"codepoints":[10674],"characters":"⦲"}}}}}}},"n":{"t":{"0":{"codepoints":[162],"characters":"¢"},";":{"0":{"codepoints":[162],"characters":"¢"}},"e":{"r":{"d":{"o":{"t":{";":{"0":{"codepoints":[183],"characters":"·"}}}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120096],"characters":"𝔠"}}}},"h":{"c":{"y":{";":{"0":{"codepoints":[1095],"characters":"ч"}}}},"e":{"c":{"k":{";":{"0":{"codepoints":[10003],"characters":"✓"}},"m":{"a":{"r":{"k":{";":{"0":{"codepoints":[10003],"characters":"✓"}}}}}}}}},"i":{";":{"0":{"codepoints":[967],"characters":"χ"}}}},"i":{"r":{"c":{";":{"0":{"codepoints":[710],"characters":"ˆ"}},"e":{"q":{";":{"0":{"codepoints":[8791],"characters":"≗"}}}},"l":{"e":{"a":{"r":{"r":{"o":{"w":{"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8634],"characters":"↺"}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[8635],"characters":"↻"}}}}}}}}}}}},"d":{"a":{"s":{"t":{";":{"0":{"codepoints":[8859],"characters":"⊛"}}}}},"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[8858],"characters":"⊚"}}}}}},"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8861],"characters":"⊝"}}}}}},"R":{";":{"0":{"codepoints":[174],"characters":"®"}}},"S":{";":{"0":{"codepoints":[9416],"characters":"Ⓢ"}}}}}}},";":{"0":{"codepoints":[9675],"characters":"○"}},"E":{";":{"0":{"codepoints":[10691],"characters":"⧃"}}},"e":{";":{"0":{"codepoints":[8791],"characters":"≗"}}},"f":{"n":{"i":{"n":{"t":{";":{"0":{"codepoints":[10768],"characters":"⨐"}}}}}}},"m":{"i":{"d":{";":{"0":{"codepoints":[10991],"characters":"⫯"}}}}},"s":{"c":{"i":{"r":{";":{"0":{"codepoints":[10690],"characters":"⧂"}}}}}}}},"l":{"u":{"b":{"s":{";":{"0":{"codepoints":[9827],"characters":"♣"}},"u":{"i":{"t":{";":{"0":{"codepoints":[9827],"characters":"♣"}}}}}}}}},"o":{"l":{"o":{"n":{";":{"0":{"codepoints":[58],"characters":":"}},"e":{";":{"0":{"codepoints":[8788],"characters":"≔"}},"q":{";":{"0":{"codepoints":[8788],"characters":"≔"}}}}}}},"m":{"m":{"a":{";":{"0":{"codepoints":[44],"characters":","}},"t":{";":{"0":{"codepoints":[64],"characters":"@"}}}}},"p":{";":{"0":{"codepoints":[8705],"characters":"∁"}},"f":{"n":{";":{"0":{"codepoints":[8728],"characters":"∘"}}}},"l":{"e":{"m":{"e":{"n":{"t":{";":{"0":{"codepoints":[8705],"characters":"∁"}}}}}},"x":{"e":{"s":{";":{"0":{"codepoints":[8450],"characters":"ℂ"}}}}}}}}},"n":{"g":{";":{"0":{"codepoints":[8773],"characters":"≅"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10861],"characters":"⩭"}}}}}},"i":{"n":{"t":{";":{"0":{"codepoints":[8750],"characters":"∮"}}}}}},"p":{"f":{";":{"0":{"codepoints":[120148],"characters":"𝕔"}}},"r":{"o":{"d":{";":{"0":{"codepoints":[8720],"characters":"∐"}}}}},"y":{"0":{"codepoints":[169],"characters":"©"},";":{"0":{"codepoints":[169],"characters":"©"}},"s":{"r":{";":{"0":{"codepoints":[8471],"characters":"℗"}}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[8629],"characters":"↵"}}}}},"o":{"s":{"s":{";":{"0":{"codepoints":[10007],"characters":"✗"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119992],"characters":"𝒸"}}}},"u":{"b":{";":{"0":{"codepoints":[10959],"characters":"⫏"}},"e":{";":{"0":{"codepoints":[10961],"characters":"⫑"}}}},"p":{";":{"0":{"codepoints":[10960],"characters":"⫐"}},"e":{";":{"0":{"codepoints":[10962],"characters":"⫒"}}}}}},"t":{"d":{"o":{"t":{";":{"0":{"codepoints":[8943],"characters":"⋯"}}}}}},"u":{"d":{"a":{"r":{"r":{"l":{";":{"0":{"codepoints":[10552],"characters":"⤸"}}},"r":{";":{"0":{"codepoints":[10549],"characters":"⤵"}}}}}}},"e":{"p":{"r":{";":{"0":{"codepoints":[8926],"characters":"⋞"}}}},"s":{"c":{";":{"0":{"codepoints":[8927],"characters":"⋟"}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[8630],"characters":"↶"}},"p":{";":{"0":{"codepoints":[10557],"characters":"⤽"}}}}}}},"p":{"b":{"r":{"c":{"a":{"p":{";":{"0":{"codepoints":[10824],"characters":"⩈"}}}}}}},"c":{"a":{"p":{";":{"0":{"codepoints":[10822],"characters":"⩆"}}}},"u":{"p":{";":{"0":{"codepoints":[10826],"characters":"⩊"}}}}},";":{"0":{"codepoints":[8746],"characters":"∪"}},"d":{"o":{"t":{";":{"0":{"codepoints":[8845],"characters":"⊍"}}}}},"o":{"r":{";":{"0":{"codepoints":[10821],"characters":"⩅"}}}},"s":{";":{"0":{"codepoints":[8746,65024],"characters":"∪︀"}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[8631],"characters":"↷"}},"m":{";":{"0":{"codepoints":[10556],"characters":"⤼"}}}}}},"l":{"y":{"e":{"q":{"p":{"r":{"e":{"c":{";":{"0":{"codepoints":[8926],"characters":"⋞"}}}}}},"s":{"u":{"c":{"c":{";":{"0":{"codepoints":[8927],"characters":"⋟"}}}}}}}},"v":{"e":{"e":{";":{"0":{"codepoints":[8910],"characters":"⋎"}}}}},"w":{"e":{"d":{"g":{"e":{";":{"0":{"codepoints":[8911],"characters":"⋏"}}}}}}}}},"r":{"e":{"n":{"0":{"codepoints":[164],"characters":"¤"},";":{"0":{"codepoints":[164],"characters":"¤"}}}}},"v":{"e":{"a":{"r":{"r":{"o":{"w":{"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8630],"characters":"↶"}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[8631],"characters":"↷"}}}}}}}}}}}}}}},"v":{"e":{"e":{";":{"0":{"codepoints":[8910],"characters":"⋎"}}}}},"w":{"e":{"d":{";":{"0":{"codepoints":[8911],"characters":"⋏"}}}}}},"w":{"c":{"o":{"n":{"i":{"n":{"t":{";":{"0":{"codepoints":[8754],"characters":"∲"}}}}}}}},"i":{"n":{"t":{";":{"0":{"codepoints":[8753],"characters":"∱"}}}}}},"y":{"l":{"c":{"t":{"y":{";":{"0":{"codepoints":[9005],"characters":"⌭"}}}}}}}},"d":{"a":{"g":{"g":{"e":{"r":{";":{"0":{"codepoints":[8224],"characters":"†"}}}}}},"l":{"e":{"t":{"h":{";":{"0":{"codepoints":[8504],"characters":"ℸ"}}}}}},"r":{"r":{";":{"0":{"codepoints":[8595],"characters":"↓"}}}},"s":{"h":{";":{"0":{"codepoints":[8208],"characters":"‐"}},"v":{";":{"0":{"codepoints":[8867],"characters":"⊣"}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8659],"characters":"⇓"}}}}},"b":{"k":{"a":{"r":{"o":{"w":{";":{"0":{"codepoints":[10511],"characters":"⤏"}}}}}}},"l":{"a":{"c":{";":{"0":{"codepoints":[733],"characters":"˝"}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[271],"characters":"ď"}}}}}},"y":{";":{"0":{"codepoints":[1076],"characters":"д"}}}},"d":{"a":{"g":{"g":{"e":{"r":{";":{"0":{"codepoints":[8225],"characters":"‡"}}}}}},"r":{"r":{";":{"0":{"codepoints":[8650],"characters":"⇊"}}}}},";":{"0":{"codepoints":[8518],"characters":"ⅆ"}},"o":{"t":{"s":{"e":{"q":{";":{"0":{"codepoints":[10871],"characters":"⩷"}}}}}}}},"e":{"g":{"0":{"codepoints":[176],"characters":"°"},";":{"0":{"codepoints":[176],"characters":"°"}}},"l":{"t":{"a":{";":{"0":{"codepoints":[948],"characters":"δ"}}}}},"m":{"p":{"t":{"y":{"v":{";":{"0":{"codepoints":[10673],"characters":"⦱"}}}}}}}},"f":{"i":{"s":{"h":{"t":{";":{"0":{"codepoints":[10623],"characters":"⥿"}}}}}},"r":{";":{"0":{"codepoints":[120097],"characters":"𝔡"}}}},"H":{"a":{"r":{";":{"0":{"codepoints":[10597],"characters":"⥥"}}}}},"h":{"a":{"r":{"l":{";":{"0":{"codepoints":[8643],"characters":"⇃"}}},"r":{";":{"0":{"codepoints":[8642],"characters":"⇂"}}}}}},"i":{"a":{"m":{";":{"0":{"codepoints":[8900],"characters":"⋄"}},"o":{"n":{"d":{";":{"0":{"codepoints":[8900],"characters":"⋄"}},"s":{"u":{"i":{"t":{";":{"0":{"codepoints":[9830],"characters":"♦"}}}}}}}}},"s":{";":{"0":{"codepoints":[9830],"characters":"♦"}}}}},"e":{";":{"0":{"codepoints":[168],"characters":"¨"}}},"g":{"a":{"m":{"m":{"a":{";":{"0":{"codepoints":[989],"characters":"ϝ"}}}}}}},"s":{"i":{"n":{";":{"0":{"codepoints":[8946],"characters":"⋲"}}}}},"v":{";":{"0":{"codepoints":[247],"characters":"÷"}},"i":{"d":{"e":{"0":{"codepoints":[247],"characters":"÷"},";":{"0":{"codepoints":[247],"characters":"÷"}},"o":{"n":{"t":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8903],"characters":"⋇"}}}}}}}}}}}},"o":{"n":{"x":{";":{"0":{"codepoints":[8903],"characters":"⋇"}}}}}}},"j":{"c":{"y":{";":{"0":{"codepoints":[1106],"characters":"ђ"}}}}},"l":{"c":{"o":{"r":{"n":{";":{"0":{"codepoints":[8990],"characters":"⌞"}}}}},"r":{"o":{"p":{";":{"0":{"codepoints":[8973],"characters":"⌍"}}}}}}},"o":{"l":{"l":{"a":{"r":{";":{"0":{"codepoints":[36],"characters":"$"}}}}}},"p":{"f":{";":{"0":{"codepoints":[120149],"characters":"𝕕"}}}},"t":{";":{"0":{"codepoints":[729],"characters":"˙"}},"e":{"q":{";":{"0":{"codepoints":[8784],"characters":"≐"}},"d":{"o":{"t":{";":{"0":{"codepoints":[8785],"characters":"≑"}}}}}}},"m":{"i":{"n":{"u":{"s":{";":{"0":{"codepoints":[8760],"characters":"∸"}}}}}}},"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[8724],"characters":"∔"}}}}}},"s":{"q":{"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[8865],"characters":"⊡"}}}}}}}}},"u":{"b":{"l":{"e":{"b":{"a":{"r":{"w":{"e":{"d":{"g":{"e":{";":{"0":{"codepoints":[8966],"characters":"⌆"}}}}}}}}}}}}}},"w":{"n":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8595],"characters":"↓"}}}}}}},"d":{"o":{"w":{"n":{"a":{"r":{"r":{"o":{"w":{"s":{";":{"0":{"codepoints":[8650],"characters":"⇊"}}}}}}}}}}}},"h":{"a":{"r":{"p":{"o":{"o":{"n":{"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8643],"characters":"⇃"}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[8642],"characters":"⇂"}}}}}}}}}}}}}}}}},"r":{"b":{"k":{"a":{"r":{"o":{"w":{";":{"0":{"codepoints":[10512],"characters":"⤐"}}}}}}}},"c":{"o":{"r":{"n":{";":{"0":{"codepoints":[8991],"characters":"⌟"}}}}},"r":{"o":{"p":{";":{"0":{"codepoints":[8972],"characters":"⌌"}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119993],"characters":"𝒹"}}},"y":{";":{"0":{"codepoints":[1109],"characters":"ѕ"}}}},"o":{"l":{";":{"0":{"codepoints":[10742],"characters":"⧶"}}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[273],"characters":"đ"}}}}}}},"t":{"d":{"o":{"t":{";":{"0":{"codepoints":[8945],"characters":"⋱"}}}}},"r":{"i":{";":{"0":{"codepoints":[9663],"characters":"▿"}},"f":{";":{"0":{"codepoints":[9662],"characters":"▾"}}}}}},"u":{"a":{"r":{"r":{";":{"0":{"codepoints":[8693],"characters":"⇵"}}}}},"h":{"a":{"r":{";":{"0":{"codepoints":[10607],"characters":"⥯"}}}}}},"w":{"a":{"n":{"g":{"l":{"e":{";":{"0":{"codepoints":[10662],"characters":"⦦"}}}}}}}},"z":{"c":{"y":{";":{"0":{"codepoints":[1119],"characters":"џ"}}}},"i":{"g":{"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[10239],"characters":"⟿"}}}}}}}}}},"D":{"a":{"g":{"g":{"e":{"r":{";":{"0":{"codepoints":[8225],"characters":"‡"}}}}}},"r":{"r":{";":{"0":{"codepoints":[8609],"characters":"↡"}}}},"s":{"h":{"v":{";":{"0":{"codepoints":[10980],"characters":"⫤"}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[270],"characters":"Ď"}}}}}},"y":{";":{"0":{"codepoints":[1044],"characters":"Д"}}}},"D":{";":{"0":{"codepoints":[8517],"characters":"ⅅ"}},"o":{"t":{"r":{"a":{"h":{"d":{";":{"0":{"codepoints":[10513],"characters":"⤑"}}}}}}}}},"e":{"l":{";":{"0":{"codepoints":[8711],"characters":"∇"}},"t":{"a":{";":{"0":{"codepoints":[916],"characters":"Δ"}}}}}},"f":{"r":{";":{"0":{"codepoints":[120071],"characters":"𝔇"}}}},"i":{"a":{"c":{"r":{"i":{"t":{"i":{"c":{"a":{"l":{"A":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[180],"characters":"´"}}}}}}},"D":{"o":{"t":{";":{"0":{"codepoints":[729],"characters":"˙"}}},"u":{"b":{"l":{"e":{"A":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[733],"characters":"˝"}}}}}}}}}}}}},"G":{"r":{"a":{"v":{"e":{";":{"0":{"codepoints":[96],"characters":"`"}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[732],"characters":"˜"}}}}}}}}}}}}}}},"m":{"o":{"n":{"d":{";":{"0":{"codepoints":[8900],"characters":"⋄"}}}}}}},"f":{"f":{"e":{"r":{"e":{"n":{"t":{"i":{"a":{"l":{"D":{";":{"0":{"codepoints":[8518],"characters":"ⅆ"}}}}}}}}}}}}}},"J":{"c":{"y":{";":{"0":{"codepoints":[1026],"characters":"Ђ"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120123],"characters":"𝔻"}}}},"t":{";":{"0":{"codepoints":[168],"characters":"¨"}},"D":{"o":{"t":{";":{"0":{"codepoints":[8412],"characters":"⃜"}}}}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8784],"characters":"≐"}}}}}}}},"u":{"b":{"l":{"e":{"C":{"o":{"n":{"t":{"o":{"u":{"r":{"I":{"n":{"t":{"e":{"g":{"r":{"a":{"l":{";":{"0":{"codepoints":[8751],"characters":"∯"}}}}}}}}}}}}}}}}},"D":{"o":{"t":{";":{"0":{"codepoints":[168],"characters":"¨"}}},"w":{"n":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8659],"characters":"⇓"}}}}}}}}}}},"L":{"e":{"f":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8656],"characters":"⇐"}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8660],"characters":"⇔"}}}}}}}}}}}},"T":{"e":{"e":{";":{"0":{"codepoints":[10980],"characters":"⫤"}}}}}}}},"o":{"n":{"g":{"L":{"e":{"f":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10232],"characters":"⟸"}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10234],"characters":"⟺"}}}}}}}}}}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10233],"characters":"⟹"}}}}}}}}}}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8658],"characters":"⇒"}}}}}}},"T":{"e":{"e":{";":{"0":{"codepoints":[8872],"characters":"⊨"}}}}}}}}}},"U":{"p":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8657],"characters":"⇑"}}}}}}},"D":{"o":{"w":{"n":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8661],"characters":"⇕"}}}}}}}}}}}}},"V":{"e":{"r":{"t":{"i":{"c":{"a":{"l":{"B":{"a":{"r":{";":{"0":{"codepoints":[8741],"characters":"∥"}}}}}}}}}}}}}}}}},"w":{"n":{"A":{"r":{"r":{"o":{"w":{"B":{"a":{"r":{";":{"0":{"codepoints":[10515],"characters":"⤓"}}}}},";":{"0":{"codepoints":[8595],"characters":"↓"}},"U":{"p":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8693],"characters":"⇵"}}}}}}}}}}}}}},"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8659],"characters":"⇓"}}}}}}},"B":{"r":{"e":{"v":{"e":{";":{"0":{"codepoints":[785],"characters":"̑"}}}}}}},"L":{"e":{"f":{"t":{"R":{"i":{"g":{"h":{"t":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10576],"characters":"⥐"}}}}}}}}}}}}},"T":{"e":{"e":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10590],"characters":"⥞"}}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10582],"characters":"⥖"}}}}},";":{"0":{"codepoints":[8637],"characters":"↽"}}}}}}}}}}}},"R":{"i":{"g":{"h":{"t":{"T":{"e":{"e":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10591],"characters":"⥟"}}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10583],"characters":"⥗"}}}}},";":{"0":{"codepoints":[8641],"characters":"⇁"}}}}}}}}}}}}},"T":{"e":{"e":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8615],"characters":"↧"}}}}}}},";":{"0":{"codepoints":[8868],"characters":"⊤"}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119967],"characters":"𝒟"}}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[272],"characters":"Đ"}}}}}}},"S":{"c":{"y":{";":{"0":{"codepoints":[1029],"characters":"Ѕ"}}}}},"Z":{"c":{"y":{";":{"0":{"codepoints":[1039],"characters":"Џ"}}}}}},"E":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[201],"characters":"É"},";":{"0":{"codepoints":[201],"characters":"É"}}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[282],"characters":"Ě"}}}}}},"i":{"r":{"c":{"0":{"codepoints":[202],"characters":"Ê"},";":{"0":{"codepoints":[202],"characters":"Ê"}}}}},"y":{";":{"0":{"codepoints":[1069],"characters":"Э"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[278],"characters":"Ė"}}}}},"f":{"r":{";":{"0":{"codepoints":[120072],"characters":"𝔈"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[200],"characters":"È"},";":{"0":{"codepoints":[200],"characters":"È"}}}}}}},"l":{"e":{"m":{"e":{"n":{"t":{";":{"0":{"codepoints":[8712],"characters":"∈"}}}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[274],"characters":"Ē"}}}}},"p":{"t":{"y":{"S":{"m":{"a":{"l":{"l":{"S":{"q":{"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[9723],"characters":"◻"}}}}}}}}}}}}},"V":{"e":{"r":{"y":{"S":{"m":{"a":{"l":{"l":{"S":{"q":{"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[9643],"characters":"▫"}}}}}}}}}}}}}}}}}}}}},"N":{"G":{";":{"0":{"codepoints":[330],"characters":"Ŋ"}}}},"o":{"g":{"o":{"n":{";":{"0":{"codepoints":[280],"characters":"Ę"}}}}},"p":{"f":{";":{"0":{"codepoints":[120124],"characters":"𝔼"}}}}},"p":{"s":{"i":{"l":{"o":{"n":{";":{"0":{"codepoints":[917],"characters":"Ε"}}}}}}}},"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10869],"characters":"⩵"}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8770],"characters":"≂"}}}}}}}}},"i":{"l":{"i":{"b":{"r":{"i":{"u":{"m":{";":{"0":{"codepoints":[8652],"characters":"⇌"}}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8496],"characters":"ℰ"}}}},"i":{"m":{";":{"0":{"codepoints":[10867],"characters":"⩳"}}}}},"t":{"a":{";":{"0":{"codepoints":[919],"characters":"Η"}}}},"T":{"H":{"0":{"codepoints":[208],"characters":"Ð"},";":{"0":{"codepoints":[208],"characters":"Ð"}}}},"u":{"m":{"l":{"0":{"codepoints":[203],"characters":"Ë"},";":{"0":{"codepoints":[203],"characters":"Ë"}}}}},"x":{"i":{"s":{"t":{"s":{";":{"0":{"codepoints":[8707],"characters":"∃"}}}}}},"p":{"o":{"n":{"e":{"n":{"t":{"i":{"a":{"l":{"E":{";":{"0":{"codepoints":[8519],"characters":"ⅇ"}}}}}}}}}}}}}},"e":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[233],"characters":"é"},";":{"0":{"codepoints":[233],"characters":"é"}}}}}},"s":{"t":{"e":{"r":{";":{"0":{"codepoints":[10862],"characters":"⩮"}}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[283],"characters":"ě"}}}}}},"i":{"r":{"c":{"0":{"codepoints":[234],"characters":"ê"},";":{"0":{"codepoints":[234],"characters":"ê"}}},";":{"0":{"codepoints":[8790],"characters":"≖"}}}},"o":{"l":{"o":{"n":{";":{"0":{"codepoints":[8789],"characters":"≕"}}}}}},"y":{";":{"0":{"codepoints":[1101],"characters":"э"}}}},"D":{"D":{"o":{"t":{";":{"0":{"codepoints":[10871],"characters":"⩷"}}}}},"o":{"t":{";":{"0":{"codepoints":[8785],"characters":"≑"}}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[279],"characters":"ė"}}}}},"e":{";":{"0":{"codepoints":[8519],"characters":"ⅇ"}}},"f":{"D":{"o":{"t":{";":{"0":{"codepoints":[8786],"characters":"≒"}}}}},"r":{";":{"0":{"codepoints":[120098],"characters":"𝔢"}}}},"g":{";":{"0":{"codepoints":[10906],"characters":"⪚"}},"r":{"a":{"v":{"e":{"0":{"codepoints":[232],"characters":"è"},";":{"0":{"codepoints":[232],"characters":"è"}}}}}},"s":{";":{"0":{"codepoints":[10902],"characters":"⪖"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10904],"characters":"⪘"}}}}}}},"l":{";":{"0":{"codepoints":[10905],"characters":"⪙"}},"i":{"n":{"t":{"e":{"r":{"s":{";":{"0":{"codepoints":[9191],"characters":"⏧"}}}}}}}},"l":{";":{"0":{"codepoints":[8467],"characters":"ℓ"}}},"s":{";":{"0":{"codepoints":[10901],"characters":"⪕"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10903],"characters":"⪗"}}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[275],"characters":"ē"}}}}},"p":{"t":{"y":{";":{"0":{"codepoints":[8709],"characters":"∅"}},"s":{"e":{"t":{";":{"0":{"codepoints":[8709],"characters":"∅"}}}}},"v":{";":{"0":{"codepoints":[8709],"characters":"∅"}}}}}},"s":{"p":{"1":{"3":{";":{"0":{"codepoints":[8196],"characters":" "}}},"4":{";":{"0":{"codepoints":[8197],"characters":" "}}}},";":{"0":{"codepoints":[8195],"characters":" "}}}}},"n":{"g":{";":{"0":{"codepoints":[331],"characters":"ŋ"}}},"s":{"p":{";":{"0":{"codepoints":[8194],"characters":" "}}}}},"o":{"g":{"o":{"n":{";":{"0":{"codepoints":[281],"characters":"ę"}}}}},"p":{"f":{";":{"0":{"codepoints":[120150],"characters":"𝕖"}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[8917],"characters":"⋕"}},"s":{"l":{";":{"0":{"codepoints":[10723],"characters":"⧣"}}}}}},"l":{"u":{"s":{";":{"0":{"codepoints":[10865],"characters":"⩱"}}}}},"s":{"i":{";":{"0":{"codepoints":[949],"characters":"ε"}},"l":{"o":{"n":{";":{"0":{"codepoints":[949],"characters":"ε"}}}}},"v":{";":{"0":{"codepoints":[1013],"characters":"ϵ"}}}}}},"q":{"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[8790],"characters":"≖"}}}}},"o":{"l":{"o":{"n":{";":{"0":{"codepoints":[8789],"characters":"≕"}}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8770],"characters":"≂"}}}},"l":{"a":{"n":{"t":{"g":{"t":{"r":{";":{"0":{"codepoints":[10902],"characters":"⪖"}}}}},"l":{"e":{"s":{"s":{";":{"0":{"codepoints":[10901],"characters":"⪕"}}}}}}}}}}},"u":{"a":{"l":{"s":{";":{"0":{"codepoints":[61],"characters":"="}}}}},"e":{"s":{"t":{";":{"0":{"codepoints":[8799],"characters":"≟"}}}}},"i":{"v":{";":{"0":{"codepoints":[8801],"characters":"≡"}},"D":{"D":{";":{"0":{"codepoints":[10872],"characters":"⩸"}}}}}}},"v":{"p":{"a":{"r":{"s":{"l":{";":{"0":{"codepoints":[10725],"characters":"⧥"}}}}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[10609],"characters":"⥱"}}}}},"D":{"o":{"t":{";":{"0":{"codepoints":[8787],"characters":"≓"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8495],"characters":"ℯ"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[8784],"characters":"≐"}}}}},"i":{"m":{";":{"0":{"codepoints":[8770],"characters":"≂"}}}}},"t":{"a":{";":{"0":{"codepoints":[951],"characters":"η"}}},"h":{"0":{"codepoints":[240],"characters":"ð"},";":{"0":{"codepoints":[240],"characters":"ð"}}}},"u":{"m":{"l":{"0":{"codepoints":[235],"characters":"ë"},";":{"0":{"codepoints":[235],"characters":"ë"}}}},"r":{"o":{";":{"0":{"codepoints":[8364],"characters":"€"}}}}},"x":{"c":{"l":{";":{"0":{"codepoints":[33],"characters":"!"}}}},"i":{"s":{"t":{";":{"0":{"codepoints":[8707],"characters":"∃"}}}}},"p":{"e":{"c":{"t":{"a":{"t":{"i":{"o":{"n":{";":{"0":{"codepoints":[8496],"characters":"ℰ"}}}}}}}}}},"o":{"n":{"e":{"n":{"t":{"i":{"a":{"l":{"e":{";":{"0":{"codepoints":[8519],"characters":"ⅇ"}}}}}}}}}}}}}},"f":{"a":{"l":{"l":{"i":{"n":{"g":{"d":{"o":{"t":{"s":{"e":{"q":{";":{"0":{"codepoints":[8786],"characters":"≒"}}}}}}}}}}}}}},"c":{"y":{";":{"0":{"codepoints":[1092],"characters":"ф"}}}},"e":{"m":{"a":{"l":{"e":{";":{"0":{"codepoints":[9792],"characters":"♀"}}}}}}},"f":{"i":{"l":{"i":{"g":{";":{"0":{"codepoints":[64259],"characters":"ﬃ"}}}}}},"l":{"i":{"g":{";":{"0":{"codepoints":[64256],"characters":"ﬀ"}}}},"l":{"i":{"g":{";":{"0":{"codepoints":[64260],"characters":"ﬄ"}}}}}},"r":{";":{"0":{"codepoints":[120099],"characters":"𝔣"}}}},"i":{"l":{"i":{"g":{";":{"0":{"codepoints":[64257],"characters":"ﬁ"}}}}}},"j":{"l":{"i":{"g":{";":{"0":{"codepoints":[102,106],"characters":"fj"}}}}}},"l":{"a":{"t":{";":{"0":{"codepoints":[9837],"characters":"♭"}}}},"l":{"i":{"g":{";":{"0":{"codepoints":[64258],"characters":"ﬂ"}}}}},"t":{"n":{"s":{";":{"0":{"codepoints":[9649],"characters":"▱"}}}}}},"n":{"o":{"f":{";":{"0":{"codepoints":[402],"characters":"ƒ"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120151],"characters":"𝕗"}}}},"r":{"a":{"l":{"l":{";":{"0":{"codepoints":[8704],"characters":"∀"}}}}},"k":{";":{"0":{"codepoints":[8916],"characters":"⋔"}},"v":{";":{"0":{"codepoints":[10969],"characters":"⫙"}}}}}},"p":{"a":{"r":{"t":{"i":{"n":{"t":{";":{"0":{"codepoints":[10765],"characters":"⨍"}}}}}}}}},"r":{"a":{"c":{"1":{"2":{"0":{"codepoints":[189],"characters":"½"},";":{"0":{"codepoints":[189],"characters":"½"}}},"3":{";":{"0":{"codepoints":[8531],"characters":"⅓"}}},"4":{"0":{"codepoints":[188],"characters":"¼"},";":{"0":{"codepoints":[188],"characters":"¼"}}},"5":{";":{"0":{"codepoints":[8533],"characters":"⅕"}}},"6":{";":{"0":{"codepoints":[8537],"characters":"⅙"}}},"8":{";":{"0":{"codepoints":[8539],"characters":"⅛"}}}},"2":{"3":{";":{"0":{"codepoints":[8532],"characters":"⅔"}}},"5":{";":{"0":{"codepoints":[8534],"characters":"⅖"}}}},"3":{"4":{"0":{"codepoints":[190],"characters":"¾"},";":{"0":{"codepoints":[190],"characters":"¾"}}},"5":{";":{"0":{"codepoints":[8535],"characters":"⅗"}}},"8":{";":{"0":{"codepoints":[8540],"characters":"⅜"}}}},"4":{"5":{";":{"0":{"codepoints":[8536],"characters":"⅘"}}}},"5":{"6":{";":{"0":{"codepoints":[8538],"characters":"⅚"}}},"8":{";":{"0":{"codepoints":[8541],"characters":"⅝"}}}},"7":{"8":{";":{"0":{"codepoints":[8542],"characters":"⅞"}}}}},"s":{"l":{";":{"0":{"codepoints":[8260],"characters":"⁄"}}}}},"o":{"w":{"n":{";":{"0":{"codepoints":[8994],"characters":"⌢"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119995],"characters":"𝒻"}}}}}},"F":{"c":{"y":{";":{"0":{"codepoints":[1060],"characters":"Ф"}}}},"f":{"r":{";":{"0":{"codepoints":[120073],"characters":"𝔉"}}}},"i":{"l":{"l":{"e":{"d":{"S":{"m":{"a":{"l":{"l":{"S":{"q":{"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[9724],"characters":"◼"}}}}}}}}}}}}},"V":{"e":{"r":{"y":{"S":{"m":{"a":{"l":{"l":{"S":{"q":{"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[9642],"characters":"▪"}}}}}}}}}}}}}}}}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120125],"characters":"𝔽"}}}},"r":{"A":{"l":{"l":{";":{"0":{"codepoints":[8704],"characters":"∀"}}}}}},"u":{"r":{"i":{"e":{"r":{"t":{"r":{"f":{";":{"0":{"codepoints":[8497],"characters":"ℱ"}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8497],"characters":"ℱ"}}}}}},"g":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[501],"characters":"ǵ"}}}}}},"m":{"m":{"a":{";":{"0":{"codepoints":[947],"characters":"γ"}},"d":{";":{"0":{"codepoints":[989],"characters":"ϝ"}}}}}},"p":{";":{"0":{"codepoints":[10886],"characters":"⪆"}}}},"b":{"r":{"e":{"v":{"e":{";":{"0":{"codepoints":[287],"characters":"ğ"}}}}}}},"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[285],"characters":"ĝ"}}}}},"y":{";":{"0":{"codepoints":[1075],"characters":"г"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[289],"characters":"ġ"}}}}},"e":{";":{"0":{"codepoints":[8805],"characters":"≥"}},"l":{";":{"0":{"codepoints":[8923],"characters":"⋛"}}},"q":{";":{"0":{"codepoints":[8805],"characters":"≥"}},"q":{";":{"0":{"codepoints":[8807],"characters":"≧"}}},"s":{"l":{"a":{"n":{"t":{";":{"0":{"codepoints":[10878],"characters":"⩾"}}}}}}}},"s":{"c":{"c":{";":{"0":{"codepoints":[10921],"characters":"⪩"}}}},";":{"0":{"codepoints":[10878],"characters":"⩾"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10880],"characters":"⪀"}},"o":{";":{"0":{"codepoints":[10882],"characters":"⪂"}},"l":{";":{"0":{"codepoints":[10884],"characters":"⪄"}}}}}}},"l":{";":{"0":{"codepoints":[8923,65024],"characters":"⋛︀"}},"e":{"s":{";":{"0":{"codepoints":[10900],"characters":"⪔"}}}}}}},"E":{";":{"0":{"codepoints":[8807],"characters":"≧"}},"l":{";":{"0":{"codepoints":[10892],"characters":"⪌"}}}},"f":{"r":{";":{"0":{"codepoints":[120100],"characters":"𝔤"}}}},"g":{";":{"0":{"codepoints":[8811],"characters":"≫"}},"g":{";":{"0":{"codepoints":[8921],"characters":"⋙"}}}},"i":{"m":{"e":{"l":{";":{"0":{"codepoints":[8503],"characters":"ℷ"}}}}}},"j":{"c":{"y":{";":{"0":{"codepoints":[1107],"characters":"ѓ"}}}}},"l":{"a":{";":{"0":{"codepoints":[10917],"characters":"⪥"}}},";":{"0":{"codepoints":[8823],"characters":"≷"}},"E":{";":{"0":{"codepoints":[10898],"characters":"⪒"}}},"j":{";":{"0":{"codepoints":[10916],"characters":"⪤"}}}},"n":{"a":{"p":{";":{"0":{"codepoints":[10890],"characters":"⪊"}},"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10890],"characters":"⪊"}}}}}}}},"e":{";":{"0":{"codepoints":[10888],"characters":"⪈"}},"q":{";":{"0":{"codepoints":[10888],"characters":"⪈"}},"q":{";":{"0":{"codepoints":[8809],"characters":"≩"}}}}},"E":{";":{"0":{"codepoints":[8809],"characters":"≩"}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8935],"characters":"⋧"}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120152],"characters":"𝕘"}}}}},"r":{"a":{"v":{"e":{";":{"0":{"codepoints":[96],"characters":"`"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8458],"characters":"ℊ"}}}},"i":{"m":{";":{"0":{"codepoints":[8819],"characters":"≳"}},"e":{";":{"0":{"codepoints":[10894],"characters":"⪎"}}},"l":{";":{"0":{"codepoints":[10896],"characters":"⪐"}}}}}},"t":{"0":{"codepoints":[62],"characters":">"},"c":{"c":{";":{"0":{"codepoints":[10919],"characters":"⪧"}}},"i":{"r":{";":{"0":{"codepoints":[10874],"characters":"⩺"}}}}},";":{"0":{"codepoints":[62],"characters":">"}},"d":{"o":{"t":{";":{"0":{"codepoints":[8919],"characters":"⋗"}}}}},"l":{"P":{"a":{"r":{";":{"0":{"codepoints":[10645],"characters":"⦕"}}}}}},"q":{"u":{"e":{"s":{"t":{";":{"0":{"codepoints":[10876],"characters":"⩼"}}}}}}},"r":{"a":{"p":{"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10886],"characters":"⪆"}}}}}}},"r":{"r":{";":{"0":{"codepoints":[10616],"characters":"⥸"}}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[8919],"characters":"⋗"}}}}},"e":{"q":{"l":{"e":{"s":{"s":{";":{"0":{"codepoints":[8923],"characters":"⋛"}}}}}},"q":{"l":{"e":{"s":{"s":{";":{"0":{"codepoints":[10892],"characters":"⪌"}}}}}}}}},"l":{"e":{"s":{"s":{";":{"0":{"codepoints":[8823],"characters":"≷"}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8819],"characters":"≳"}}}}}}},"v":{"e":{"r":{"t":{"n":{"e":{"q":{"q":{";":{"0":{"codepoints":[8809,65024],"characters":"≩︀"}}}}}}}}},"n":{"E":{";":{"0":{"codepoints":[8809,65024],"characters":"≩︀"}}}}}},"G":{"a":{"m":{"m":{"a":{";":{"0":{"codepoints":[915],"characters":"Γ"}},"d":{";":{"0":{"codepoints":[988],"characters":"Ϝ"}}}}}}},"b":{"r":{"e":{"v":{"e":{";":{"0":{"codepoints":[286],"characters":"Ğ"}}}}}}},"c":{"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[290],"characters":"Ģ"}}}}}},"i":{"r":{"c":{";":{"0":{"codepoints":[284],"characters":"Ĝ"}}}}},"y":{";":{"0":{"codepoints":[1043],"characters":"Г"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[288],"characters":"Ġ"}}}}},"f":{"r":{";":{"0":{"codepoints":[120074],"characters":"𝔊"}}}},"g":{";":{"0":{"codepoints":[8921],"characters":"⋙"}}},"J":{"c":{"y":{";":{"0":{"codepoints":[1027],"characters":"Ѓ"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120126],"characters":"𝔾"}}}}},"r":{"e":{"a":{"t":{"e":{"r":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8805],"characters":"≥"}},"L":{"e":{"s":{"s":{";":{"0":{"codepoints":[8923],"characters":"⋛"}}}}}}}}}}},"F":{"u":{"l":{"l":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8807],"characters":"≧"}}}}}}}}}}},"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[10914],"characters":"⪢"}}}}}}}}},"L":{"e":{"s":{"s":{";":{"0":{"codepoints":[8823],"characters":"≷"}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10878],"characters":"⩾"}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8819],"characters":"≳"}}}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119970],"characters":"𝒢"}}}}},"T":{"0":{"codepoints":[62],"characters":">"},";":{"0":{"codepoints":[62],"characters":">"}}},"t":{";":{"0":{"codepoints":[8811],"characters":"≫"}}}},"H":{"a":{"c":{"e":{"k":{";":{"0":{"codepoints":[711],"characters":"ˇ"}}}}},"t":{";":{"0":{"codepoints":[94],"characters":"^"}}}},"A":{"R":{"D":{"c":{"y":{";":{"0":{"codepoints":[1066],"characters":"Ъ"}}}}}}},"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[292],"characters":"Ĥ"}}}}}},"f":{"r":{";":{"0":{"codepoints":[8460],"characters":"ℌ"}}}},"i":{"l":{"b":{"e":{"r":{"t":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8459],"characters":"ℋ"}}}}}}}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[8461],"characters":"ℍ"}}}},"r":{"i":{"z":{"o":{"n":{"t":{"a":{"l":{"L":{"i":{"n":{"e":{";":{"0":{"codepoints":[9472],"characters":"─"}}}}}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8459],"characters":"ℋ"}}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[294],"characters":"Ħ"}}}}}}},"u":{"m":{"p":{"D":{"o":{"w":{"n":{"H":{"u":{"m":{"p":{";":{"0":{"codepoints":[8782],"characters":"≎"}}}}}}}}}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8783],"characters":"≏"}}}}}}}}}}},"h":{"a":{"i":{"r":{"s":{"p":{";":{"0":{"codepoints":[8202],"characters":" "}}}}}},"l":{"f":{";":{"0":{"codepoints":[189],"characters":"½"}}}},"m":{"i":{"l":{"t":{";":{"0":{"codepoints":[8459],"characters":"ℋ"}}}}}},"r":{"d":{"c":{"y":{";":{"0":{"codepoints":[1098],"characters":"ъ"}}}}},"r":{"c":{"i":{"r":{";":{"0":{"codepoints":[10568],"characters":"⥈"}}}}},";":{"0":{"codepoints":[8596],"characters":"↔"}},"w":{";":{"0":{"codepoints":[8621],"characters":"↭"}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8660],"characters":"⇔"}}}}},"b":{"a":{"r":{";":{"0":{"codepoints":[8463],"characters":"ℏ"}}}}},"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[293],"characters":"ĥ"}}}}}},"e":{"a":{"r":{"t":{"s":{";":{"0":{"codepoints":[9829],"characters":"♥"}},"u":{"i":{"t":{";":{"0":{"codepoints":[9829],"characters":"♥"}}}}}}}}},"l":{"l":{"i":{"p":{";":{"0":{"codepoints":[8230],"characters":"…"}}}}}},"r":{"c":{"o":{"n":{";":{"0":{"codepoints":[8889],"characters":"⊹"}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120101],"characters":"𝔥"}}}},"k":{"s":{"e":{"a":{"r":{"o":{"w":{";":{"0":{"codepoints":[10533],"characters":"⤥"}}}}}}},"w":{"a":{"r":{"o":{"w":{";":{"0":{"codepoints":[10534],"characters":"⤦"}}}}}}}}},"o":{"a":{"r":{"r":{";":{"0":{"codepoints":[8703],"characters":"⇿"}}}}},"m":{"t":{"h":{"t":{";":{"0":{"codepoints":[8763],"characters":"∻"}}}}}},"o":{"k":{"l":{"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8617],"characters":"↩"}}}}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8618],"characters":"↪"}}}}}}}}}}}}}},"p":{"f":{";":{"0":{"codepoints":[120153],"characters":"𝕙"}}}},"r":{"b":{"a":{"r":{";":{"0":{"codepoints":[8213],"characters":"―"}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119997],"characters":"𝒽"}}}},"l":{"a":{"s":{"h":{";":{"0":{"codepoints":[8463],"characters":"ℏ"}}}}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[295],"characters":"ħ"}}}}}}},"y":{"b":{"u":{"l":{"l":{";":{"0":{"codepoints":[8259],"characters":"⁃"}}}}}},"p":{"h":{"e":{"n":{";":{"0":{"codepoints":[8208],"characters":"‐"}}}}}}}},"I":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[205],"characters":"Í"},";":{"0":{"codepoints":[205],"characters":"Í"}}}}}}},"c":{"i":{"r":{"c":{"0":{"codepoints":[206],"characters":"Î"},";":{"0":{"codepoints":[206],"characters":"Î"}}}}},"y":{";":{"0":{"codepoints":[1048],"characters":"И"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[304],"characters":"İ"}}}}},"E":{"c":{"y":{";":{"0":{"codepoints":[1045],"characters":"Е"}}}}},"f":{"r":{";":{"0":{"codepoints":[8465],"characters":"ℑ"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[204],"characters":"Ì"},";":{"0":{"codepoints":[204],"characters":"Ì"}}}}}}},"J":{"l":{"i":{"g":{";":{"0":{"codepoints":[306],"characters":"Ĳ"}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[298],"characters":"Ī"}}}},"g":{"i":{"n":{"a":{"r":{"y":{"I":{";":{"0":{"codepoints":[8520],"characters":"ⅈ"}}}}}}}}}},";":{"0":{"codepoints":[8465],"characters":"ℑ"}},"p":{"l":{"i":{"e":{"s":{";":{"0":{"codepoints":[8658],"characters":"⇒"}}}}}}}},"n":{"t":{";":{"0":{"codepoints":[8748],"characters":"∬"}},"e":{"g":{"r":{"a":{"l":{";":{"0":{"codepoints":[8747],"characters":"∫"}}}}}},"r":{"s":{"e":{"c":{"t":{"i":{"o":{"n":{";":{"0":{"codepoints":[8898],"characters":"⋂"}}}}}}}}}}}},"v":{"i":{"s":{"i":{"b":{"l":{"e":{"C":{"o":{"m":{"m":{"a":{";":{"0":{"codepoints":[8291],"characters":"⁣"}}}}}}},"T":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8290],"characters":"⁢"}}}}}}}}}}}}}}},"O":{"c":{"y":{";":{"0":{"codepoints":[1025],"characters":"Ё"}}}}},"o":{"g":{"o":{"n":{";":{"0":{"codepoints":[302],"characters":"Į"}}}}},"p":{"f":{";":{"0":{"codepoints":[120128],"characters":"𝕀"}}}},"t":{"a":{";":{"0":{"codepoints":[921],"characters":"Ι"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8464],"characters":"ℐ"}}}}},"t":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[296],"characters":"Ĩ"}}}}}}},"u":{"k":{"c":{"y":{";":{"0":{"codepoints":[1030],"characters":"І"}}}}},"m":{"l":{"0":{"codepoints":[207],"characters":"Ï"},";":{"0":{"codepoints":[207],"characters":"Ï"}}}}}},"i":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[237],"characters":"í"},";":{"0":{"codepoints":[237],"characters":"í"}}}}}}},"c":{";":{"0":{"codepoints":[8291],"characters":"⁣"}},"i":{"r":{"c":{"0":{"codepoints":[238],"characters":"î"},";":{"0":{"codepoints":[238],"characters":"î"}}}}},"y":{";":{"0":{"codepoints":[1080],"characters":"и"}}}},"e":{"c":{"y":{";":{"0":{"codepoints":[1077],"characters":"е"}}}},"x":{"c":{"l":{"0":{"codepoints":[161],"characters":"¡"},";":{"0":{"codepoints":[161],"characters":"¡"}}}}}},"f":{"f":{";":{"0":{"codepoints":[8660],"characters":"⇔"}}},"r":{";":{"0":{"codepoints":[120102],"characters":"𝔦"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[236],"characters":"ì"},";":{"0":{"codepoints":[236],"characters":"ì"}}}}}}},"i":{";":{"0":{"codepoints":[8520],"characters":"ⅈ"}},"i":{"i":{"n":{"t":{";":{"0":{"codepoints":[10764],"characters":"⨌"}}}}},"n":{"t":{";":{"0":{"codepoints":[8749],"characters":"∭"}}}}},"n":{"f":{"i":{"n":{";":{"0":{"codepoints":[10716],"characters":"⧜"}}}}}},"o":{"t":{"a":{";":{"0":{"codepoints":[8489],"characters":"℩"}}}}}},"j":{"l":{"i":{"g":{";":{"0":{"codepoints":[307],"characters":"ĳ"}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[299],"characters":"ī"}}}},"g":{"e":{";":{"0":{"codepoints":[8465],"characters":"ℑ"}}},"l":{"i":{"n":{"e":{";":{"0":{"codepoints":[8464],"characters":"ℐ"}}}}}},"p":{"a":{"r":{"t":{";":{"0":{"codepoints":[8465],"characters":"ℑ"}}}}}}},"t":{"h":{";":{"0":{"codepoints":[305],"characters":"ı"}}}}},"o":{"f":{";":{"0":{"codepoints":[8887],"characters":"⊷"}}}},"p":{"e":{"d":{";":{"0":{"codepoints":[437],"characters":"Ƶ"}}}}}},"n":{"c":{"a":{"r":{"e":{";":{"0":{"codepoints":[8453],"characters":"℅"}}}}}},";":{"0":{"codepoints":[8712],"characters":"∈"}},"f":{"i":{"n":{";":{"0":{"codepoints":[8734],"characters":"∞"}},"t":{"i":{"e":{";":{"0":{"codepoints":[10717],"characters":"⧝"}}}}}}}},"o":{"d":{"o":{"t":{";":{"0":{"codepoints":[305],"characters":"ı"}}}}}},"t":{"c":{"a":{"l":{";":{"0":{"codepoints":[8890],"characters":"⊺"}}}}},";":{"0":{"codepoints":[8747],"characters":"∫"}},"e":{"g":{"e":{"r":{"s":{";":{"0":{"codepoints":[8484],"characters":"ℤ"}}}}}},"r":{"c":{"a":{"l":{";":{"0":{"codepoints":[8890],"characters":"⊺"}}}}}}},"l":{"a":{"r":{"h":{"k":{";":{"0":{"codepoints":[10775],"characters":"⨗"}}}}}}},"p":{"r":{"o":{"d":{";":{"0":{"codepoints":[10812],"characters":"⨼"}}}}}}}},"o":{"c":{"y":{";":{"0":{"codepoints":[1105],"characters":"ё"}}}},"g":{"o":{"n":{";":{"0":{"codepoints":[303],"characters":"į"}}}}},"p":{"f":{";":{"0":{"codepoints":[120154],"characters":"𝕚"}}}},"t":{"a":{";":{"0":{"codepoints":[953],"characters":"ι"}}}}},"p":{"r":{"o":{"d":{";":{"0":{"codepoints":[10812],"characters":"⨼"}}}}}},"q":{"u":{"e":{"s":{"t":{"0":{"codepoints":[191],"characters":"¿"},";":{"0":{"codepoints":[191],"characters":"¿"}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119998],"characters":"𝒾"}}}},"i":{"n":{";":{"0":{"codepoints":[8712],"characters":"∈"}},"d":{"o":{"t":{";":{"0":{"codepoints":[8949],"characters":"⋵"}}}}},"E":{";":{"0":{"codepoints":[8953],"characters":"⋹"}}},"s":{";":{"0":{"codepoints":[8948],"characters":"⋴"}},"v":{";":{"0":{"codepoints":[8947],"characters":"⋳"}}}},"v":{";":{"0":{"codepoints":[8712],"characters":"∈"}}}}}},"t":{";":{"0":{"codepoints":[8290],"characters":"⁢"}},"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[297],"characters":"ĩ"}}}}}}},"u":{"k":{"c":{"y":{";":{"0":{"codepoints":[1110],"characters":"і"}}}}},"m":{"l":{"0":{"codepoints":[239],"characters":"ï"},";":{"0":{"codepoints":[239],"characters":"ï"}}}}}},"J":{"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[308],"characters":"Ĵ"}}}}},"y":{";":{"0":{"codepoints":[1049],"characters":"Й"}}}},"f":{"r":{";":{"0":{"codepoints":[120077],"characters":"𝔍"}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120129],"characters":"𝕁"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119973],"characters":"𝒥"}}}},"e":{"r":{"c":{"y":{";":{"0":{"codepoints":[1032],"characters":"Ј"}}}}}}},"u":{"k":{"c":{"y":{";":{"0":{"codepoints":[1028],"characters":"Є"}}}}}}},"j":{"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[309],"characters":"ĵ"}}}}},"y":{";":{"0":{"codepoints":[1081],"characters":"й"}}}},"f":{"r":{";":{"0":{"codepoints":[120103],"characters":"𝔧"}}}},"m":{"a":{"t":{"h":{";":{"0":{"codepoints":[567],"characters":"ȷ"}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120155],"characters":"𝕛"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119999],"characters":"𝒿"}}}},"e":{"r":{"c":{"y":{";":{"0":{"codepoints":[1112],"characters":"ј"}}}}}}},"u":{"k":{"c":{"y":{";":{"0":{"codepoints":[1108],"characters":"є"}}}}}}},"K":{"a":{"p":{"p":{"a":{";":{"0":{"codepoints":[922],"characters":"Κ"}}}}}},"c":{"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[310],"characters":"Ķ"}}}}}},"y":{";":{"0":{"codepoints":[1050],"characters":"К"}}}},"f":{"r":{";":{"0":{"codepoints":[120078],"characters":"𝔎"}}}},"H":{"c":{"y":{";":{"0":{"codepoints":[1061],"characters":"Х"}}}}},"J":{"c":{"y":{";":{"0":{"codepoints":[1036],"characters":"Ќ"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120130],"characters":"𝕂"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119974],"characters":"𝒦"}}}}}},"k":{"a":{"p":{"p":{"a":{";":{"0":{"codepoints":[954],"characters":"κ"}},"v":{";":{"0":{"codepoints":[1008],"characters":"ϰ"}}}}}}},"c":{"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[311],"characters":"ķ"}}}}}},"y":{";":{"0":{"codepoints":[1082],"characters":"к"}}}},"f":{"r":{";":{"0":{"codepoints":[120104],"characters":"𝔨"}}}},"g":{"r":{"e":{"e":{"n":{";":{"0":{"codepoints":[312],"characters":"ĸ"}}}}}}},"h":{"c":{"y":{";":{"0":{"codepoints":[1093],"characters":"х"}}}}},"j":{"c":{"y":{";":{"0":{"codepoints":[1116],"characters":"ќ"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120156],"characters":"𝕜"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120000],"characters":"𝓀"}}}}}},"l":{"A":{"a":{"r":{"r":{";":{"0":{"codepoints":[8666],"characters":"⇚"}}}}},"r":{"r":{";":{"0":{"codepoints":[8656],"characters":"⇐"}}}},"t":{"a":{"i":{"l":{";":{"0":{"codepoints":[10523],"characters":"⤛"}}}}}}},"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[314],"characters":"ĺ"}}}}}},"e":{"m":{"p":{"t":{"y":{"v":{";":{"0":{"codepoints":[10676],"characters":"⦴"}}}}}}}},"g":{"r":{"a":{"n":{";":{"0":{"codepoints":[8466],"characters":"ℒ"}}}}}},"m":{"b":{"d":{"a":{";":{"0":{"codepoints":[955],"characters":"λ"}}}}}},"n":{"g":{";":{"0":{"codepoints":[10216],"characters":"⟨"}},"d":{";":{"0":{"codepoints":[10641],"characters":"⦑"}}},"l":{"e":{";":{"0":{"codepoints":[10216],"characters":"⟨"}}}}}},"p":{";":{"0":{"codepoints":[10885],"characters":"⪅"}}},"q":{"u":{"o":{"0":{"codepoints":[171],"characters":"«"},";":{"0":{"codepoints":[171],"characters":"«"}}}}},"r":{"r":{"b":{";":{"0":{"codepoints":[8676],"characters":"⇤"}},"f":{"s":{";":{"0":{"codepoints":[10527],"characters":"⤟"}}}}},";":{"0":{"codepoints":[8592],"characters":"←"}},"f":{"s":{";":{"0":{"codepoints":[10525],"characters":"⤝"}}}},"h":{"k":{";":{"0":{"codepoints":[8617],"characters":"↩"}}}},"l":{"p":{";":{"0":{"codepoints":[8619],"characters":"↫"}}}},"p":{"l":{";":{"0":{"codepoints":[10553],"characters":"⤹"}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[10611],"characters":"⥳"}}}}},"t":{"l":{";":{"0":{"codepoints":[8610],"characters":"↢"}}}}}},"t":{"a":{"i":{"l":{";":{"0":{"codepoints":[10521],"characters":"⤙"}}}}},";":{"0":{"codepoints":[10923],"characters":"⪫"}},"e":{";":{"0":{"codepoints":[10925],"characters":"⪭"}},"s":{";":{"0":{"codepoints":[10925,65024],"characters":"⪭︀"}}}}}},"b":{"a":{"r":{"r":{";":{"0":{"codepoints":[10508],"characters":"⤌"}}}}},"b":{"r":{"k":{";":{"0":{"codepoints":[10098],"characters":"❲"}}}}},"r":{"a":{"c":{"e":{";":{"0":{"codepoints":[123],"characters":"{"}}},"k":{";":{"0":{"codepoints":[91],"characters":"["}}}}},"k":{"e":{";":{"0":{"codepoints":[10635],"characters":"⦋"}}},"s":{"l":{"d":{";":{"0":{"codepoints":[10639],"characters":"⦏"}}},"u":{";":{"0":{"codepoints":[10637],"characters":"⦍"}}}}}}}},"B":{"a":{"r":{"r":{";":{"0":{"codepoints":[10510],"characters":"⤎"}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[318],"characters":"ľ"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[316],"characters":"ļ"}}}}},"i":{"l":{";":{"0":{"codepoints":[8968],"characters":"⌈"}}}}},"u":{"b":{";":{"0":{"codepoints":[123],"characters":"{"}}}},"y":{";":{"0":{"codepoints":[1083],"characters":"л"}}}},"d":{"c":{"a":{";":{"0":{"codepoints":[10550],"characters":"⤶"}}}},"q":{"u":{"o":{";":{"0":{"codepoints":[8220],"characters":"“"}},"r":{";":{"0":{"codepoints":[8222],"characters":"„"}}}}}},"r":{"d":{"h":{"a":{"r":{";":{"0":{"codepoints":[10599],"characters":"⥧"}}}}}},"u":{"s":{"h":{"a":{"r":{";":{"0":{"codepoints":[10571],"characters":"⥋"}}}}}}}},"s":{"h":{";":{"0":{"codepoints":[8626],"characters":"↲"}}}}},"e":{";":{"0":{"codepoints":[8804],"characters":"≤"}},"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8592],"characters":"←"}},"t":{"a":{"i":{"l":{";":{"0":{"codepoints":[8610],"characters":"↢"}}}}}}}}}}},"h":{"a":{"r":{"p":{"o":{"o":{"n":{"d":{"o":{"w":{"n":{";":{"0":{"codepoints":[8637],"characters":"↽"}}}}}},"u":{"p":{";":{"0":{"codepoints":[8636],"characters":"↼"}}}}}}}}}}},"l":{"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{"s":{";":{"0":{"codepoints":[8647],"characters":"⇇"}}}}}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8596],"characters":"↔"}},"s":{";":{"0":{"codepoints":[8646],"characters":"⇆"}}}}}}}},"h":{"a":{"r":{"p":{"o":{"o":{"n":{"s":{";":{"0":{"codepoints":[8651],"characters":"⇋"}}}}}}}}}},"s":{"q":{"u":{"i":{"g":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8621],"characters":"↭"}}}}}}}}}}}}}}}}},"t":{"h":{"r":{"e":{"e":{"t":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8907],"characters":"⋋"}}}}}}}}}}}}}},"g":{";":{"0":{"codepoints":[8922],"characters":"⋚"}}},"q":{";":{"0":{"codepoints":[8804],"characters":"≤"}},"q":{";":{"0":{"codepoints":[8806],"characters":"≦"}}},"s":{"l":{"a":{"n":{"t":{";":{"0":{"codepoints":[10877],"characters":"⩽"}}}}}}}},"s":{"c":{"c":{";":{"0":{"codepoints":[10920],"characters":"⪨"}}}},";":{"0":{"codepoints":[10877],"characters":"⩽"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10879],"characters":"⩿"}},"o":{";":{"0":{"codepoints":[10881],"characters":"⪁"}},"r":{";":{"0":{"codepoints":[10883],"characters":"⪃"}}}}}}},"g":{";":{"0":{"codepoints":[8922,65024],"characters":"⋚︀"}},"e":{"s":{";":{"0":{"codepoints":[10899],"characters":"⪓"}}}}},"s":{"a":{"p":{"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10885],"characters":"⪅"}}}}}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[8918],"characters":"⋖"}}}}},"e":{"q":{"g":{"t":{"r":{";":{"0":{"codepoints":[8922],"characters":"⋚"}}}}},"q":{"g":{"t":{"r":{";":{"0":{"codepoints":[10891],"characters":"⪋"}}}}}}}},"g":{"t":{"r":{";":{"0":{"codepoints":[8822],"characters":"≶"}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8818],"characters":"≲"}}}}}}}},"E":{";":{"0":{"codepoints":[8806],"characters":"≦"}},"g":{";":{"0":{"codepoints":[10891],"characters":"⪋"}}}},"f":{"i":{"s":{"h":{"t":{";":{"0":{"codepoints":[10620],"characters":"⥼"}}}}}},"l":{"o":{"o":{"r":{";":{"0":{"codepoints":[8970],"characters":"⌊"}}}}}},"r":{";":{"0":{"codepoints":[120105],"characters":"𝔩"}}}},"g":{";":{"0":{"codepoints":[8822],"characters":"≶"}},"E":{";":{"0":{"codepoints":[10897],"characters":"⪑"}}}},"H":{"a":{"r":{";":{"0":{"codepoints":[10594],"characters":"⥢"}}}}},"h":{"a":{"r":{"d":{";":{"0":{"codepoints":[8637],"characters":"↽"}}},"u":{";":{"0":{"codepoints":[8636],"characters":"↼"}},"l":{";":{"0":{"codepoints":[10602],"characters":"⥪"}}}}}},"b":{"l":{"k":{";":{"0":{"codepoints":[9604],"characters":"▄"}}}}}},"j":{"c":{"y":{";":{"0":{"codepoints":[1113],"characters":"љ"}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[8647],"characters":"⇇"}}}}},";":{"0":{"codepoints":[8810],"characters":"≪"}},"c":{"o":{"r":{"n":{"e":{"r":{";":{"0":{"codepoints":[8990],"characters":"⌞"}}}}}}}},"h":{"a":{"r":{"d":{";":{"0":{"codepoints":[10603],"characters":"⥫"}}}}}},"t":{"r":{"i":{";":{"0":{"codepoints":[9722],"characters":"◺"}}}}}},"m":{"i":{"d":{"o":{"t":{";":{"0":{"codepoints":[320],"characters":"ŀ"}}}}}},"o":{"u":{"s":{"t":{"a":{"c":{"h":{"e":{";":{"0":{"codepoints":[9136],"characters":"⎰"}}}}}},";":{"0":{"codepoints":[9136],"characters":"⎰"}}}}}}},"n":{"a":{"p":{";":{"0":{"codepoints":[10889],"characters":"⪉"}},"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10889],"characters":"⪉"}}}}}}}},"e":{";":{"0":{"codepoints":[10887],"characters":"⪇"}},"q":{";":{"0":{"codepoints":[10887],"characters":"⪇"}},"q":{";":{"0":{"codepoints":[8808],"characters":"≨"}}}}},"E":{";":{"0":{"codepoints":[8808],"characters":"≨"}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8934],"characters":"⋦"}}}}}},"o":{"a":{"n":{"g":{";":{"0":{"codepoints":[10220],"characters":"⟬"}}}},"r":{"r":{";":{"0":{"codepoints":[8701],"characters":"⇽"}}}}},"b":{"r":{"k":{";":{"0":{"codepoints":[10214],"characters":"⟦"}}}}},"n":{"g":{"l":{"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10229],"characters":"⟵"}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10231],"characters":"⟷"}}}}}}}}}}}}}}}},"m":{"a":{"p":{"s":{"t":{"o":{";":{"0":{"codepoints":[10236],"characters":"⟼"}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10230],"characters":"⟶"}}}}}}}}}}}}}},"o":{"p":{"a":{"r":{"r":{"o":{"w":{"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8619],"characters":"↫"}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[8620],"characters":"↬"}}}}}}}}}}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[10629],"characters":"⦅"}}}},"f":{";":{"0":{"codepoints":[120157],"characters":"𝕝"}}},"l":{"u":{"s":{";":{"0":{"codepoints":[10797],"characters":"⨭"}}}}}},"t":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[10804],"characters":"⨴"}}}}}}},"w":{"a":{"s":{"t":{";":{"0":{"codepoints":[8727],"characters":"∗"}}}}},"b":{"a":{"r":{";":{"0":{"codepoints":[95],"characters":"_"}}}}}},"z":{";":{"0":{"codepoints":[9674],"characters":"◊"}},"e":{"n":{"g":{"e":{";":{"0":{"codepoints":[9674],"characters":"◊"}}}}}},"f":{";":{"0":{"codepoints":[10731],"characters":"⧫"}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[40],"characters":"("}},"l":{"t":{";":{"0":{"codepoints":[10643],"characters":"⦓"}}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[8646],"characters":"⇆"}}}}},"c":{"o":{"r":{"n":{"e":{"r":{";":{"0":{"codepoints":[8991],"characters":"⌟"}}}}}}}},"h":{"a":{"r":{";":{"0":{"codepoints":[8651],"characters":"⇋"}},"d":{";":{"0":{"codepoints":[10605],"characters":"⥭"}}}}}},"m":{";":{"0":{"codepoints":[8206],"characters":"‎"}}},"t":{"r":{"i":{";":{"0":{"codepoints":[8895],"characters":"⊿"}}}}}},"s":{"a":{"q":{"u":{"o":{";":{"0":{"codepoints":[8249],"characters":"‹"}}}}}},"c":{"r":{";":{"0":{"codepoints":[120001],"characters":"𝓁"}}}},"h":{";":{"0":{"codepoints":[8624],"characters":"↰"}}},"i":{"m":{";":{"0":{"codepoints":[8818],"characters":"≲"}},"e":{";":{"0":{"codepoints":[10893],"characters":"⪍"}}},"g":{";":{"0":{"codepoints":[10895],"characters":"⪏"}}}}},"q":{"b":{";":{"0":{"codepoints":[91],"characters":"["}}},"u":{"o":{";":{"0":{"codepoints":[8216],"characters":"‘"}},"r":{";":{"0":{"codepoints":[8218],"characters":"‚"}}}}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[322],"characters":"ł"}}}}}}},"t":{"0":{"codepoints":[60],"characters":"<"},"c":{"c":{";":{"0":{"codepoints":[10918],"characters":"⪦"}}},"i":{"r":{";":{"0":{"codepoints":[10873],"characters":"⩹"}}}}},";":{"0":{"codepoints":[60],"characters":"<"}},"d":{"o":{"t":{";":{"0":{"codepoints":[8918],"characters":"⋖"}}}}},"h":{"r":{"e":{"e":{";":{"0":{"codepoints":[8907],"characters":"⋋"}}}}}},"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8905],"characters":"⋉"}}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[10614],"characters":"⥶"}}}}}},"q":{"u":{"e":{"s":{"t":{";":{"0":{"codepoints":[10875],"characters":"⩻"}}}}}}},"r":{"i":{";":{"0":{"codepoints":[9667],"characters":"◃"}},"e":{";":{"0":{"codepoints":[8884],"characters":"⊴"}}},"f":{";":{"0":{"codepoints":[9666],"characters":"◂"}}}},"P":{"a":{"r":{";":{"0":{"codepoints":[10646],"characters":"⦖"}}}}}}},"u":{"r":{"d":{"s":{"h":{"a":{"r":{";":{"0":{"codepoints":[10570],"characters":"⥊"}}}}}}},"u":{"h":{"a":{"r":{";":{"0":{"codepoints":[10598],"characters":"⥦"}}}}}}}},"v":{"e":{"r":{"t":{"n":{"e":{"q":{"q":{";":{"0":{"codepoints":[8808,65024],"characters":"≨︀"}}}}}}}}},"n":{"E":{";":{"0":{"codepoints":[8808,65024],"characters":"≨︀"}}}}}},"L":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[313],"characters":"Ĺ"}}}}}},"m":{"b":{"d":{"a":{";":{"0":{"codepoints":[923],"characters":"Λ"}}}}}},"n":{"g":{";":{"0":{"codepoints":[10218],"characters":"⟪"}}}},"p":{"l":{"a":{"c":{"e":{"t":{"r":{"f":{";":{"0":{"codepoints":[8466],"characters":"ℒ"}}}}}}}}}},"r":{"r":{";":{"0":{"codepoints":[8606],"characters":"↞"}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[317],"characters":"Ľ"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[315],"characters":"Ļ"}}}}}},"y":{";":{"0":{"codepoints":[1051],"characters":"Л"}}}},"e":{"f":{"t":{"A":{"n":{"g":{"l":{"e":{"B":{"r":{"a":{"c":{"k":{"e":{"t":{";":{"0":{"codepoints":[10216],"characters":"⟨"}}}}}}}}}}}}},"r":{"r":{"o":{"w":{"B":{"a":{"r":{";":{"0":{"codepoints":[8676],"characters":"⇤"}}}}},";":{"0":{"codepoints":[8592],"characters":"←"}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8646],"characters":"⇆"}}}}}}}}}}}}}}}}},"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8656],"characters":"⇐"}}}}}}},"C":{"e":{"i":{"l":{"i":{"n":{"g":{";":{"0":{"codepoints":[8968],"characters":"⌈"}}}}}}}}},"D":{"o":{"u":{"b":{"l":{"e":{"B":{"r":{"a":{"c":{"k":{"e":{"t":{";":{"0":{"codepoints":[10214],"characters":"⟦"}}}}}}}}}}}}},"w":{"n":{"T":{"e":{"e":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10593],"characters":"⥡"}}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10585],"characters":"⥙"}}}}},";":{"0":{"codepoints":[8643],"characters":"⇃"}}}}}}}}}}}},"F":{"l":{"o":{"o":{"r":{";":{"0":{"codepoints":[8970],"characters":"⌊"}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8596],"characters":"↔"}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10574],"characters":"⥎"}}}}}}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8660],"characters":"⇔"}}}}}}}}}}}},"T":{"e":{"e":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8612],"characters":"↤"}}}}}}},";":{"0":{"codepoints":[8867],"characters":"⊣"}},"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10586],"characters":"⥚"}}}}}}}}}},"r":{"i":{"a":{"n":{"g":{"l":{"e":{"B":{"a":{"r":{";":{"0":{"codepoints":[10703],"characters":"⧏"}}}}},";":{"0":{"codepoints":[8882],"characters":"⊲"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8884],"characters":"⊴"}}}}}}}}}}}}}}},"U":{"p":{"D":{"o":{"w":{"n":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10577],"characters":"⥑"}}}}}}}}}}}},"T":{"e":{"e":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10592],"characters":"⥠"}}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10584],"characters":"⥘"}}}}},";":{"0":{"codepoints":[8639],"characters":"↿"}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10578],"characters":"⥒"}}}}},";":{"0":{"codepoints":[8636],"characters":"↼"}}}}}}}}}},"s":{"s":{"E":{"q":{"u":{"a":{"l":{"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[8922],"characters":"⋚"}}}}}}}}}}}}}},"F":{"u":{"l":{"l":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8806],"characters":"≦"}}}}}}}}}}},"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[8822],"characters":"≶"}}}}}}}}},"L":{"e":{"s":{"s":{";":{"0":{"codepoints":[10913],"characters":"⪡"}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10877],"characters":"⩽"}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8818],"characters":"≲"}}}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120079],"characters":"𝔏"}}}},"J":{"c":{"y":{";":{"0":{"codepoints":[1033],"characters":"Љ"}}}}},"l":{";":{"0":{"codepoints":[8920],"characters":"⋘"}},"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8666],"characters":"⇚"}}}}}}}}}}},"m":{"i":{"d":{"o":{"t":{";":{"0":{"codepoints":[319],"characters":"Ŀ"}}}}}}},"o":{"n":{"g":{"L":{"e":{"f":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10229],"characters":"⟵"}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10231],"characters":"⟷"}}}}}}}}}}}}}}}},"l":{"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10232],"characters":"⟸"}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10234],"characters":"⟺"}}}}}}}}}}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10230],"characters":"⟶"}}}}}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[10233],"characters":"⟹"}}}}}}}}}}}}}},"p":{"f":{";":{"0":{"codepoints":[120131],"characters":"𝕃"}}}},"w":{"e":{"r":{"L":{"e":{"f":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8601],"characters":"↙"}}}}}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8600],"characters":"↘"}}}}}}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8466],"characters":"ℒ"}}}},"h":{";":{"0":{"codepoints":[8624],"characters":"↰"}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[321],"characters":"Ł"}}}}}}},"T":{"0":{"codepoints":[60],"characters":"<"},";":{"0":{"codepoints":[60],"characters":"<"}}},"t":{";":{"0":{"codepoints":[8810],"characters":"≪"}}}},"m":{"a":{"c":{"r":{"0":{"codepoints":[175],"characters":"¯"},";":{"0":{"codepoints":[175],"characters":"¯"}}}},"l":{"e":{";":{"0":{"codepoints":[9794],"characters":"♂"}}},"t":{";":{"0":{"codepoints":[10016],"characters":"✠"}},"e":{"s":{"e":{";":{"0":{"codepoints":[10016],"characters":"✠"}}}}}}},"p":{";":{"0":{"codepoints":[8614],"characters":"↦"}},"s":{"t":{"o":{";":{"0":{"codepoints":[8614],"characters":"↦"}},"d":{"o":{"w":{"n":{";":{"0":{"codepoints":[8615],"characters":"↧"}}}}}},"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8612],"characters":"↤"}}}}}},"u":{"p":{";":{"0":{"codepoints":[8613],"characters":"↥"}}}}}}}},"r":{"k":{"e":{"r":{";":{"0":{"codepoints":[9646],"characters":"▮"}}}}}}},"c":{"o":{"m":{"m":{"a":{";":{"0":{"codepoints":[10793],"characters":"⨩"}}}}}},"y":{";":{"0":{"codepoints":[1084],"characters":"м"}}}},"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8212],"characters":"—"}}}}}},"D":{"D":{"o":{"t":{";":{"0":{"codepoints":[8762],"characters":"∺"}}}}}},"e":{"a":{"s":{"u":{"r":{"e":{"d":{"a":{"n":{"g":{"l":{"e":{";":{"0":{"codepoints":[8737],"characters":"∡"}}}}}}}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120106],"characters":"𝔪"}}}},"h":{"o":{";":{"0":{"codepoints":[8487],"characters":"℧"}}}},"i":{"c":{"r":{"o":{"0":{"codepoints":[181],"characters":"µ"},";":{"0":{"codepoints":[181],"characters":"µ"}}}}},"d":{"a":{"s":{"t":{";":{"0":{"codepoints":[42],"characters":"*"}}}}},"c":{"i":{"r":{";":{"0":{"codepoints":[10992],"characters":"⫰"}}}}},";":{"0":{"codepoints":[8739],"characters":"∣"}},"d":{"o":{"t":{"0":{"codepoints":[183],"characters":"·"},";":{"0":{"codepoints":[183],"characters":"·"}}}}}},"n":{"u":{"s":{"b":{";":{"0":{"codepoints":[8863],"characters":"⊟"}}},";":{"0":{"codepoints":[8722],"characters":"−"}},"d":{";":{"0":{"codepoints":[8760],"characters":"∸"}},"u":{";":{"0":{"codepoints":[10794],"characters":"⨪"}}}}}}}},"l":{"c":{"p":{";":{"0":{"codepoints":[10971],"characters":"⫛"}}}},"d":{"r":{";":{"0":{"codepoints":[8230],"characters":"…"}}}}},"n":{"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[8723],"characters":"∓"}}}}}}},"o":{"d":{"e":{"l":{"s":{";":{"0":{"codepoints":[8871],"characters":"⊧"}}}}}},"p":{"f":{";":{"0":{"codepoints":[120158],"characters":"𝕞"}}}}},"p":{";":{"0":{"codepoints":[8723],"characters":"∓"}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120002],"characters":"𝓂"}}}},"t":{"p":{"o":{"s":{";":{"0":{"codepoints":[8766],"characters":"∾"}}}}}}},"u":{";":{"0":{"codepoints":[956],"characters":"μ"}},"l":{"t":{"i":{"m":{"a":{"p":{";":{"0":{"codepoints":[8888],"characters":"⊸"}}}}}}}},"m":{"a":{"p":{";":{"0":{"codepoints":[8888],"characters":"⊸"}}}}}}},"M":{"a":{"p":{";":{"0":{"codepoints":[10501],"characters":"⤅"}}}},"c":{"y":{";":{"0":{"codepoints":[1052],"characters":"М"}}}},"e":{"d":{"i":{"u":{"m":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8287],"characters":" "}}}}}}}}}}},"l":{"l":{"i":{"n":{"t":{"r":{"f":{";":{"0":{"codepoints":[8499],"characters":"ℳ"}}}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120080],"characters":"𝔐"}}}},"i":{"n":{"u":{"s":{"P":{"l":{"u":{"s":{";":{"0":{"codepoints":[8723],"characters":"∓"}}}}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120132],"characters":"𝕄"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8499],"characters":"ℳ"}}}}},"u":{";":{"0":{"codepoints":[924],"characters":"Μ"}}}},"n":{"a":{"b":{"l":{"a":{";":{"0":{"codepoints":[8711],"characters":"∇"}}}}},"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[324],"characters":"ń"}}}}}},"n":{"g":{";":{"0":{"codepoints":[8736,8402],"characters":"∠⃒"}}}},"p":{";":{"0":{"codepoints":[8777],"characters":"≉"}},"E":{";":{"0":{"codepoints":[10864,824],"characters":"⩰̸"}}},"i":{"d":{";":{"0":{"codepoints":[8779,824],"characters":"≋̸"}}}},"o":{"s":{";":{"0":{"codepoints":[329],"characters":"ŉ"}}}},"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[8777],"characters":"≉"}}}}}}},"t":{"u":{"r":{"a":{"l":{";":{"0":{"codepoints":[9838],"characters":"♮"}},"s":{";":{"0":{"codepoints":[8469],"characters":"ℕ"}}}}},";":{"0":{"codepoints":[9838],"characters":"♮"}}}}}},"b":{"s":{"p":{"0":{"codepoints":[160],"characters":" "},";":{"0":{"codepoints":[160],"characters":" "}}}},"u":{"m":{"p":{";":{"0":{"codepoints":[8782,824],"characters":"≎̸"}},"e":{";":{"0":{"codepoints":[8783,824],"characters":"≏̸"}}}}}}},"c":{"a":{"p":{";":{"0":{"codepoints":[10819],"characters":"⩃"}}},"r":{"o":{"n":{";":{"0":{"codepoints":[328],"characters":"ň"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[326],"characters":"ņ"}}}}}},"o":{"n":{"g":{";":{"0":{"codepoints":[8775],"characters":"≇"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10861,824],"characters":"⩭̸"}}}}}}}},"u":{"p":{";":{"0":{"codepoints":[10818],"characters":"⩂"}}}},"y":{";":{"0":{"codepoints":[1085],"characters":"н"}}}},"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8211],"characters":"–"}}}}}},"e":{"a":{"r":{"h":{"k":{";":{"0":{"codepoints":[10532],"characters":"⤤"}}}},"r":{";":{"0":{"codepoints":[8599],"characters":"↗"}},"o":{"w":{";":{"0":{"codepoints":[8599],"characters":"↗"}}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8663],"characters":"⇗"}}}}},";":{"0":{"codepoints":[8800],"characters":"≠"}},"d":{"o":{"t":{";":{"0":{"codepoints":[8784,824],"characters":"≐̸"}}}}},"q":{"u":{"i":{"v":{";":{"0":{"codepoints":[8802],"characters":"≢"}}}}}},"s":{"e":{"a":{"r":{";":{"0":{"codepoints":[10536],"characters":"⤨"}}}}},"i":{"m":{";":{"0":{"codepoints":[8770,824],"characters":"≂̸"}}}}},"x":{"i":{"s":{"t":{";":{"0":{"codepoints":[8708],"characters":"∄"}},"s":{";":{"0":{"codepoints":[8708],"characters":"∄"}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120107],"characters":"𝔫"}}}},"g":{"E":{";":{"0":{"codepoints":[8807,824],"characters":"≧̸"}}},"e":{";":{"0":{"codepoints":[8817],"characters":"≱"}},"q":{";":{"0":{"codepoints":[8817],"characters":"≱"}},"q":{";":{"0":{"codepoints":[8807,824],"characters":"≧̸"}}},"s":{"l":{"a":{"n":{"t":{";":{"0":{"codepoints":[10878,824],"characters":"⩾̸"}}}}}}}},"s":{";":{"0":{"codepoints":[10878,824],"characters":"⩾̸"}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8821],"characters":"≵"}}}}},"t":{";":{"0":{"codepoints":[8815],"characters":"≯"}},"r":{";":{"0":{"codepoints":[8815],"characters":"≯"}}}}},"G":{"g":{";":{"0":{"codepoints":[8921,824],"characters":"⋙̸"}}},"t":{";":{"0":{"codepoints":[8811,8402],"characters":"≫⃒"}},"v":{";":{"0":{"codepoints":[8811,824],"characters":"≫̸"}}}}},"h":{"a":{"r":{"r":{";":{"0":{"codepoints":[8622],"characters":"↮"}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8654],"characters":"⇎"}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[10994],"characters":"⫲"}}}}}},"i":{";":{"0":{"codepoints":[8715],"characters":"∋"}},"s":{";":{"0":{"codepoints":[8956],"characters":"⋼"}},"d":{";":{"0":{"codepoints":[8954],"characters":"⋺"}}}},"v":{";":{"0":{"codepoints":[8715],"characters":"∋"}}}},"j":{"c":{"y":{";":{"0":{"codepoints":[1114],"characters":"њ"}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[8602],"characters":"↚"}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8653],"characters":"⇍"}}}}},"d":{"r":{";":{"0":{"codepoints":[8229],"characters":"‥"}}}},"E":{";":{"0":{"codepoints":[8806,824],"characters":"≦̸"}}},"e":{";":{"0":{"codepoints":[8816],"characters":"≰"}},"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8602],"characters":"↚"}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8622],"characters":"↮"}}}}}}}}}}}}}},"q":{";":{"0":{"codepoints":[8816],"characters":"≰"}},"q":{";":{"0":{"codepoints":[8806,824],"characters":"≦̸"}}},"s":{"l":{"a":{"n":{"t":{";":{"0":{"codepoints":[10877,824],"characters":"⩽̸"}}}}}}}},"s":{";":{"0":{"codepoints":[10877,824],"characters":"⩽̸"}},"s":{";":{"0":{"codepoints":[8814],"characters":"≮"}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8820],"characters":"≴"}}}}},"t":{";":{"0":{"codepoints":[8814],"characters":"≮"}},"r":{"i":{";":{"0":{"codepoints":[8938],"characters":"⋪"}},"e":{";":{"0":{"codepoints":[8940],"characters":"⋬"}}}}}}},"L":{"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8653],"characters":"⇍"}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8654],"characters":"⇎"}}}}}}}}}}}}}}},"l":{";":{"0":{"codepoints":[8920,824],"characters":"⋘̸"}}},"t":{";":{"0":{"codepoints":[8810,8402],"characters":"≪⃒"}},"v":{";":{"0":{"codepoints":[8810,824],"characters":"≪̸"}}}}},"m":{"i":{"d":{";":{"0":{"codepoints":[8740],"characters":"∤"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120159],"characters":"𝕟"}}}},"t":{"0":{"codepoints":[172],"characters":"¬"},";":{"0":{"codepoints":[172],"characters":"¬"}},"i":{"n":{";":{"0":{"codepoints":[8713],"characters":"∉"}},"d":{"o":{"t":{";":{"0":{"codepoints":[8949,824],"characters":"⋵̸"}}}}},"E":{";":{"0":{"codepoints":[8953,824],"characters":"⋹̸"}}},"v":{"a":{";":{"0":{"codepoints":[8713],"characters":"∉"}}},"b":{";":{"0":{"codepoints":[8951],"characters":"⋷"}}},"c":{";":{"0":{"codepoints":[8950],"characters":"⋶"}}}}}},"n":{"i":{";":{"0":{"codepoints":[8716],"characters":"∌"}},"v":{"a":{";":{"0":{"codepoints":[8716],"characters":"∌"}}},"b":{";":{"0":{"codepoints":[8958],"characters":"⋾"}}},"c":{";":{"0":{"codepoints":[8957],"characters":"⋽"}}}}}}}},"p":{"a":{"r":{"a":{"l":{"l":{"e":{"l":{";":{"0":{"codepoints":[8742],"characters":"∦"}}}}}}},";":{"0":{"codepoints":[8742],"characters":"∦"}},"s":{"l":{";":{"0":{"codepoints":[11005,8421],"characters":"⫽⃥"}}}},"t":{";":{"0":{"codepoints":[8706,824],"characters":"∂̸"}}}}},"o":{"l":{"i":{"n":{"t":{";":{"0":{"codepoints":[10772],"characters":"⨔"}}}}}}},"r":{";":{"0":{"codepoints":[8832],"characters":"⊀"}},"c":{"u":{"e":{";":{"0":{"codepoints":[8928],"characters":"⋠"}}}}},"e":{"c":{";":{"0":{"codepoints":[8832],"characters":"⊀"}},"e":{"q":{";":{"0":{"codepoints":[10927,824],"characters":"⪯̸"}}}}},";":{"0":{"codepoints":[10927,824],"characters":"⪯̸"}}}}},"r":{"a":{"r":{"r":{"c":{";":{"0":{"codepoints":[10547,824],"characters":"⤳̸"}}},";":{"0":{"codepoints":[8603],"characters":"↛"}},"w":{";":{"0":{"codepoints":[8605,824],"characters":"↝̸"}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8655],"characters":"⇏"}}}}},"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8603],"characters":"↛"}}}}}}}}}}},"t":{"r":{"i":{";":{"0":{"codepoints":[8939],"characters":"⋫"}},"e":{";":{"0":{"codepoints":[8941],"characters":"⋭"}}}}}}},"R":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8655],"characters":"⇏"}}}}}}}}}}}},"s":{"c":{";":{"0":{"codepoints":[8833],"characters":"⊁"}},"c":{"u":{"e":{";":{"0":{"codepoints":[8929],"characters":"⋡"}}}}},"e":{";":{"0":{"codepoints":[10928,824],"characters":"⪰̸"}}},"r":{";":{"0":{"codepoints":[120003],"characters":"𝓃"}}}},"h":{"o":{"r":{"t":{"m":{"i":{"d":{";":{"0":{"codepoints":[8740],"characters":"∤"}}}}},"p":{"a":{"r":{"a":{"l":{"l":{"e":{"l":{";":{"0":{"codepoints":[8742],"characters":"∦"}}}}}}}}}}}}}},"i":{"m":{";":{"0":{"codepoints":[8769],"characters":"≁"}},"e":{";":{"0":{"codepoints":[8772],"characters":"≄"}},"q":{";":{"0":{"codepoints":[8772],"characters":"≄"}}}}}},"m":{"i":{"d":{";":{"0":{"codepoints":[8740],"characters":"∤"}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[8742],"characters":"∦"}}}}},"q":{"s":{"u":{"b":{"e":{";":{"0":{"codepoints":[8930],"characters":"⋢"}}}},"p":{"e":{";":{"0":{"codepoints":[8931],"characters":"⋣"}}}}}}},"u":{"b":{";":{"0":{"codepoints":[8836],"characters":"⊄"}},"E":{";":{"0":{"codepoints":[10949,824],"characters":"⫅̸"}}},"e":{";":{"0":{"codepoints":[8840],"characters":"⊈"}}},"s":{"e":{"t":{";":{"0":{"codepoints":[8834,8402],"characters":"⊂⃒"}},"e":{"q":{";":{"0":{"codepoints":[8840],"characters":"⊈"}},"q":{";":{"0":{"codepoints":[10949,824],"characters":"⫅̸"}}}}}}}}},"c":{"c":{";":{"0":{"codepoints":[8833],"characters":"⊁"}},"e":{"q":{";":{"0":{"codepoints":[10928,824],"characters":"⪰̸"}}}}}},"p":{";":{"0":{"codepoints":[8837],"characters":"⊅"}},"E":{";":{"0":{"codepoints":[10950,824],"characters":"⫆̸"}}},"e":{";":{"0":{"codepoints":[8841],"characters":"⊉"}}},"s":{"e":{"t":{";":{"0":{"codepoints":[8835,8402],"characters":"⊃⃒"}},"e":{"q":{";":{"0":{"codepoints":[8841],"characters":"⊉"}},"q":{";":{"0":{"codepoints":[10950,824],"characters":"⫆̸"}}}}}}}}}}},"t":{"g":{"l":{";":{"0":{"codepoints":[8825],"characters":"≹"}}}},"i":{"l":{"d":{"e":{"0":{"codepoints":[241],"characters":"ñ"},";":{"0":{"codepoints":[241],"characters":"ñ"}}}}}},"l":{"g":{";":{"0":{"codepoints":[8824],"characters":"≸"}}}},"r":{"i":{"a":{"n":{"g":{"l":{"e":{"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8938],"characters":"⋪"}},"e":{"q":{";":{"0":{"codepoints":[8940],"characters":"⋬"}}}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[8939],"characters":"⋫"}},"e":{"q":{";":{"0":{"codepoints":[8941],"characters":"⋭"}}}}}}}}}}}}}}}}},"u":{";":{"0":{"codepoints":[957],"characters":"ν"}},"m":{";":{"0":{"codepoints":[35],"characters":"#"}},"e":{"r":{"o":{";":{"0":{"codepoints":[8470],"characters":"№"}}}}},"s":{"p":{";":{"0":{"codepoints":[8199],"characters":" "}}}}}},"v":{"a":{"p":{";":{"0":{"codepoints":[8781,8402],"characters":"≍⃒"}}}},"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8876],"characters":"⊬"}}}}}},"D":{"a":{"s":{"h":{";":{"0":{"codepoints":[8877],"characters":"⊭"}}}}}},"g":{"e":{";":{"0":{"codepoints":[8805,8402],"characters":"≥⃒"}}},"t":{";":{"0":{"codepoints":[62,8402],"characters":">⃒"}}}},"H":{"a":{"r":{"r":{";":{"0":{"codepoints":[10500],"characters":"⤄"}}}}}},"i":{"n":{"f":{"i":{"n":{";":{"0":{"codepoints":[10718],"characters":"⧞"}}}}}}},"l":{"A":{"r":{"r":{";":{"0":{"codepoints":[10498],"characters":"⤂"}}}}},"e":{";":{"0":{"codepoints":[8804,8402],"characters":"≤⃒"}}},"t":{";":{"0":{"codepoints":[60,8402],"characters":"<⃒"}},"r":{"i":{"e":{";":{"0":{"codepoints":[8884,8402],"characters":"⊴⃒"}}}}}}},"r":{"A":{"r":{"r":{";":{"0":{"codepoints":[10499],"characters":"⤃"}}}}},"t":{"r":{"i":{"e":{";":{"0":{"codepoints":[8885,8402],"characters":"⊵⃒"}}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8764,8402],"characters":"∼⃒"}}}}}},"V":{"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8878],"characters":"⊮"}}}}}},"D":{"a":{"s":{"h":{";":{"0":{"codepoints":[8879],"characters":"⊯"}}}}}}},"w":{"a":{"r":{"h":{"k":{";":{"0":{"codepoints":[10531],"characters":"⤣"}}}},"r":{";":{"0":{"codepoints":[8598],"characters":"↖"}},"o":{"w":{";":{"0":{"codepoints":[8598],"characters":"↖"}}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8662],"characters":"⇖"}}}}},"n":{"e":{"a":{"r":{";":{"0":{"codepoints":[10535],"characters":"⤧"}}}}}}}},"N":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[323],"characters":"Ń"}}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[327],"characters":"Ň"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[325],"characters":"Ņ"}}}}}},"y":{";":{"0":{"codepoints":[1053],"characters":"Н"}}}},"e":{"g":{"a":{"t":{"i":{"v":{"e":{"M":{"e":{"d":{"i":{"u":{"m":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8203],"characters":"​"}}}}}}}}}}}}},"T":{"h":{"i":{"c":{"k":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8203],"characters":"​"}}}}}}}}},"n":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8203],"characters":"​"}}}}}}}}}}},"V":{"e":{"r":{"y":{"T":{"h":{"i":{"n":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8203],"characters":"​"}}}}}}}}}}}}}}}}}}}}},"s":{"t":{"e":{"d":{"G":{"r":{"e":{"a":{"t":{"e":{"r":{"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[8811],"characters":"≫"}}}}}}}}}}}}}}}},"L":{"e":{"s":{"s":{"L":{"e":{"s":{"s":{";":{"0":{"codepoints":[8810],"characters":"≪"}}}}}}}}}}}}}},"w":{"L":{"i":{"n":{"e":{";":{"0":{"codepoints":[10],"characters":"\n"}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120081],"characters":"𝔑"}}}},"J":{"c":{"y":{";":{"0":{"codepoints":[1034],"characters":"Њ"}}}}},"o":{"B":{"r":{"e":{"a":{"k":{";":{"0":{"codepoints":[8288],"characters":"⁠"}}}}}}},"n":{"B":{"r":{"e":{"a":{"k":{"i":{"n":{"g":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[160],"characters":" "}}}}}}}}}}}}}}}},"p":{"f":{";":{"0":{"codepoints":[8469],"characters":"ℕ"}}}},"t":{";":{"0":{"codepoints":[10988],"characters":"⫬"}},"C":{"o":{"n":{"g":{"r":{"u":{"e":{"n":{"t":{";":{"0":{"codepoints":[8802],"characters":"≢"}}}}}}}}}},"u":{"p":{"C":{"a":{"p":{";":{"0":{"codepoints":[8813],"characters":"≭"}}}}}}}},"D":{"o":{"u":{"b":{"l":{"e":{"V":{"e":{"r":{"t":{"i":{"c":{"a":{"l":{"B":{"a":{"r":{";":{"0":{"codepoints":[8742],"characters":"∦"}}}}}}}}}}}}}}}}}}},"E":{"l":{"e":{"m":{"e":{"n":{"t":{";":{"0":{"codepoints":[8713],"characters":"∉"}}}}}}}},"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8800],"characters":"≠"}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8770,824],"characters":"≂̸"}}}}}}}}}}},"x":{"i":{"s":{"t":{"s":{";":{"0":{"codepoints":[8708],"characters":"∄"}}}}}}}},"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[8815],"characters":"≯"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8817],"characters":"≱"}}}}}}},"F":{"u":{"l":{"l":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8807,824],"characters":"≧̸"}}}}}}}}}}},"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[8811,824],"characters":"≫̸"}}}}}}}}},"L":{"e":{"s":{"s":{";":{"0":{"codepoints":[8825],"characters":"≹"}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10878,824],"characters":"⩾̸"}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8821],"characters":"≵"}}}}}}}}}}}}}},"H":{"u":{"m":{"p":{"D":{"o":{"w":{"n":{"H":{"u":{"m":{"p":{";":{"0":{"codepoints":[8782,824],"characters":"≎̸"}}}}}}}}}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8783,824],"characters":"≏̸"}}}}}}}}}}},"L":{"e":{"f":{"t":{"T":{"r":{"i":{"a":{"n":{"g":{"l":{"e":{"B":{"a":{"r":{";":{"0":{"codepoints":[10703,824],"characters":"⧏̸"}}}}},";":{"0":{"codepoints":[8938],"characters":"⋪"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8940],"characters":"⋬"}}}}}}}}}}}}}}}}},"s":{"s":{";":{"0":{"codepoints":[8814],"characters":"≮"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8816],"characters":"≰"}}}}}}},"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[8824],"characters":"≸"}}}}}}}}},"L":{"e":{"s":{"s":{";":{"0":{"codepoints":[8810,824],"characters":"≪̸"}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10877,824],"characters":"⩽̸"}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8820],"characters":"≴"}}}}}}}}}}},"N":{"e":{"s":{"t":{"e":{"d":{"G":{"r":{"e":{"a":{"t":{"e":{"r":{"G":{"r":{"e":{"a":{"t":{"e":{"r":{";":{"0":{"codepoints":[10914,824],"characters":"⪢̸"}}}}}}}}}}}}}}}},"L":{"e":{"s":{"s":{"L":{"e":{"s":{"s":{";":{"0":{"codepoints":[10913,824],"characters":"⪡̸"}}}}}}}}}}}}}}}},"P":{"r":{"e":{"c":{"e":{"d":{"e":{"s":{";":{"0":{"codepoints":[8832],"characters":"⊀"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10927,824],"characters":"⪯̸"}}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8928],"characters":"⋠"}}}}}}}}}}}}}}}}}}}},"R":{"e":{"v":{"e":{"r":{"s":{"e":{"E":{"l":{"e":{"m":{"e":{"n":{"t":{";":{"0":{"codepoints":[8716],"characters":"∌"}}}}}}}}}}}}}}},"i":{"g":{"h":{"t":{"T":{"r":{"i":{"a":{"n":{"g":{"l":{"e":{"B":{"a":{"r":{";":{"0":{"codepoints":[10704,824],"characters":"⧐̸"}}}}},";":{"0":{"codepoints":[8939],"characters":"⋫"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8941],"characters":"⋭"}}}}}}}}}}}}}}}}}}}},"S":{"q":{"u":{"a":{"r":{"e":{"S":{"u":{"b":{"s":{"e":{"t":{";":{"0":{"codepoints":[8847,824],"characters":"⊏̸"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8930],"characters":"⋢"}}}}}}}}}}},"p":{"e":{"r":{"s":{"e":{"t":{";":{"0":{"codepoints":[8848,824],"characters":"⊐̸"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8931],"characters":"⋣"}}}}}}}}}}}}}}}}}}}},"u":{"b":{"s":{"e":{"t":{";":{"0":{"codepoints":[8834,8402],"characters":"⊂⃒"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8840],"characters":"⊈"}}}}}}}}}}},"c":{"c":{"e":{"e":{"d":{"s":{";":{"0":{"codepoints":[8833],"characters":"⊁"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10928,824],"characters":"⪰̸"}}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8929],"characters":"⋡"}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8831,824],"characters":"≿̸"}}}}}}}}}}}}},"p":{"e":{"r":{"s":{"e":{"t":{";":{"0":{"codepoints":[8835,8402],"characters":"⊃⃒"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8841],"characters":"⊉"}}}}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8769],"characters":"≁"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8772],"characters":"≄"}}}}}}},"F":{"u":{"l":{"l":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8775],"characters":"≇"}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8777],"characters":"≉"}}}}}}}}}}}},"V":{"e":{"r":{"t":{"i":{"c":{"a":{"l":{"B":{"a":{"r":{";":{"0":{"codepoints":[8740],"characters":"∤"}}}}}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119977],"characters":"𝒩"}}}}},"t":{"i":{"l":{"d":{"e":{"0":{"codepoints":[209],"characters":"Ñ"},";":{"0":{"codepoints":[209],"characters":"Ñ"}}}}}}},"u":{";":{"0":{"codepoints":[925],"characters":"Ν"}}}},"O":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[211],"characters":"Ó"},";":{"0":{"codepoints":[211],"characters":"Ó"}}}}}}},"c":{"i":{"r":{"c":{"0":{"codepoints":[212],"characters":"Ô"},";":{"0":{"codepoints":[212],"characters":"Ô"}}}}},"y":{";":{"0":{"codepoints":[1054],"characters":"О"}}}},"d":{"b":{"l":{"a":{"c":{";":{"0":{"codepoints":[336],"characters":"Ő"}}}}}}},"E":{"l":{"i":{"g":{";":{"0":{"codepoints":[338],"characters":"Œ"}}}}}},"f":{"r":{";":{"0":{"codepoints":[120082],"characters":"𝔒"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[210],"characters":"Ò"},";":{"0":{"codepoints":[210],"characters":"Ò"}}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[332],"characters":"Ō"}}}}},"e":{"g":{"a":{";":{"0":{"codepoints":[937],"characters":"Ω"}}}}},"i":{"c":{"r":{"o":{"n":{";":{"0":{"codepoints":[927],"characters":"Ο"}}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120134],"characters":"𝕆"}}}}},"p":{"e":{"n":{"C":{"u":{"r":{"l":{"y":{"D":{"o":{"u":{"b":{"l":{"e":{"Q":{"u":{"o":{"t":{"e":{";":{"0":{"codepoints":[8220],"characters":"“"}}}}}}}}}}}}},"Q":{"u":{"o":{"t":{"e":{";":{"0":{"codepoints":[8216],"characters":"‘"}}}}}}}}}}}}}}},"r":{";":{"0":{"codepoints":[10836],"characters":"⩔"}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119978],"characters":"𝒪"}}}},"l":{"a":{"s":{"h":{"0":{"codepoints":[216],"characters":"Ø"},";":{"0":{"codepoints":[216],"characters":"Ø"}}}}}}},"t":{"i":{"l":{"d":{"e":{"0":{"codepoints":[213],"characters":"Õ"},";":{"0":{"codepoints":[213],"characters":"Õ"}}}}},"m":{"e":{"s":{";":{"0":{"codepoints":[10807],"characters":"⨷"}}}}}}},"u":{"m":{"l":{"0":{"codepoints":[214],"characters":"Ö"},";":{"0":{"codepoints":[214],"characters":"Ö"}}}}},"v":{"e":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[8254],"characters":"‾"}}}},"r":{"a":{"c":{"e":{";":{"0":{"codepoints":[9182],"characters":"⏞"}}},"k":{"e":{"t":{";":{"0":{"codepoints":[9140],"characters":"⎴"}}}}}}}}},"P":{"a":{"r":{"e":{"n":{"t":{"h":{"e":{"s":{"i":{"s":{";":{"0":{"codepoints":[9180],"characters":"⏜"}}}}}}}}}}}}}}}}},"o":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[243],"characters":"ó"},";":{"0":{"codepoints":[243],"characters":"ó"}}}}}},"s":{"t":{";":{"0":{"codepoints":[8859],"characters":"⊛"}}}}},"c":{"i":{"r":{"c":{"0":{"codepoints":[244],"characters":"ô"},";":{"0":{"codepoints":[244],"characters":"ô"}}},";":{"0":{"codepoints":[8858],"characters":"⊚"}}}},"y":{";":{"0":{"codepoints":[1086],"characters":"о"}}}},"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8861],"characters":"⊝"}}}}},"b":{"l":{"a":{"c":{";":{"0":{"codepoints":[337],"characters":"ő"}}}}}},"i":{"v":{";":{"0":{"codepoints":[10808],"characters":"⨸"}}}},"o":{"t":{";":{"0":{"codepoints":[8857],"characters":"⊙"}}}},"s":{"o":{"l":{"d":{";":{"0":{"codepoints":[10684],"characters":"⦼"}}}}}}},"e":{"l":{"i":{"g":{";":{"0":{"codepoints":[339],"characters":"œ"}}}}}},"f":{"c":{"i":{"r":{";":{"0":{"codepoints":[10687],"characters":"⦿"}}}}},"r":{";":{"0":{"codepoints":[120108],"characters":"𝔬"}}}},"g":{"o":{"n":{";":{"0":{"codepoints":[731],"characters":"˛"}}}},"r":{"a":{"v":{"e":{"0":{"codepoints":[242],"characters":"ò"},";":{"0":{"codepoints":[242],"characters":"ò"}}}}}},"t":{";":{"0":{"codepoints":[10689],"characters":"⧁"}}}},"h":{"b":{"a":{"r":{";":{"0":{"codepoints":[10677],"characters":"⦵"}}}}},"m":{";":{"0":{"codepoints":[937],"characters":"Ω"}}}},"i":{"n":{"t":{";":{"0":{"codepoints":[8750],"characters":"∮"}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[8634],"characters":"↺"}}}}},"c":{"i":{"r":{";":{"0":{"codepoints":[10686],"characters":"⦾"}}}},"r":{"o":{"s":{"s":{";":{"0":{"codepoints":[10683],"characters":"⦻"}}}}}}},"i":{"n":{"e":{";":{"0":{"codepoints":[8254],"characters":"‾"}}}}},"t":{";":{"0":{"codepoints":[10688],"characters":"⧀"}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[333],"characters":"ō"}}}}},"e":{"g":{"a":{";":{"0":{"codepoints":[969],"characters":"ω"}}}}},"i":{"c":{"r":{"o":{"n":{";":{"0":{"codepoints":[959],"characters":"ο"}}}}}},"d":{";":{"0":{"codepoints":[10678],"characters":"⦶"}}},"n":{"u":{"s":{";":{"0":{"codepoints":[8854],"characters":"⊖"}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120160],"characters":"𝕠"}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[10679],"characters":"⦷"}}}},"e":{"r":{"p":{";":{"0":{"codepoints":[10681],"characters":"⦹"}}}}},"l":{"u":{"s":{";":{"0":{"codepoints":[8853],"characters":"⊕"}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[8635],"characters":"↻"}}}}},";":{"0":{"codepoints":[8744],"characters":"∨"}},"d":{";":{"0":{"codepoints":[10845],"characters":"⩝"}},"e":{"r":{";":{"0":{"codepoints":[8500],"characters":"ℴ"}},"o":{"f":{";":{"0":{"codepoints":[8500],"characters":"ℴ"}}}}}},"f":{"0":{"codepoints":[170],"characters":"ª"},";":{"0":{"codepoints":[170],"characters":"ª"}}},"m":{"0":{"codepoints":[186],"characters":"º"},";":{"0":{"codepoints":[186],"characters":"º"}}}},"i":{"g":{"o":{"f":{";":{"0":{"codepoints":[8886],"characters":"⊶"}}}}}},"o":{"r":{";":{"0":{"codepoints":[10838],"characters":"⩖"}}}},"s":{"l":{"o":{"p":{"e":{";":{"0":{"codepoints":[10839],"characters":"⩗"}}}}}}},"v":{";":{"0":{"codepoints":[10843],"characters":"⩛"}}}},"S":{";":{"0":{"codepoints":[9416],"characters":"Ⓢ"}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8500],"characters":"ℴ"}}}},"l":{"a":{"s":{"h":{"0":{"codepoints":[248],"characters":"ø"},";":{"0":{"codepoints":[248],"characters":"ø"}}}}}},"o":{"l":{";":{"0":{"codepoints":[8856],"characters":"⊘"}}}}},"t":{"i":{"l":{"d":{"e":{"0":{"codepoints":[245],"characters":"õ"},";":{"0":{"codepoints":[245],"characters":"õ"}}}}},"m":{"e":{"s":{"a":{"s":{";":{"0":{"codepoints":[10806],"characters":"⨶"}}}},";":{"0":{"codepoints":[8855],"characters":"⊗"}}}}}}},"u":{"m":{"l":{"0":{"codepoints":[246],"characters":"ö"},";":{"0":{"codepoints":[246],"characters":"ö"}}}}},"v":{"b":{"a":{"r":{";":{"0":{"codepoints":[9021],"characters":"⌽"}}}}}}},"p":{"a":{"r":{"a":{"0":{"codepoints":[182],"characters":"¶"},";":{"0":{"codepoints":[182],"characters":"¶"}},"l":{"l":{"e":{"l":{";":{"0":{"codepoints":[8741],"characters":"∥"}}}}}}},";":{"0":{"codepoints":[8741],"characters":"∥"}},"s":{"i":{"m":{";":{"0":{"codepoints":[10995],"characters":"⫳"}}}},"l":{";":{"0":{"codepoints":[11005],"characters":"⫽"}}}},"t":{";":{"0":{"codepoints":[8706],"characters":"∂"}}}}},"c":{"y":{";":{"0":{"codepoints":[1087],"characters":"п"}}}},"e":{"r":{"c":{"n":{"t":{";":{"0":{"codepoints":[37],"characters":"%"}}}}},"i":{"o":{"d":{";":{"0":{"codepoints":[46],"characters":"."}}}}},"m":{"i":{"l":{";":{"0":{"codepoints":[8240],"characters":"‰"}}}}},"p":{";":{"0":{"codepoints":[8869],"characters":"⊥"}}},"t":{"e":{"n":{"k":{";":{"0":{"codepoints":[8241],"characters":"‱"}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120109],"characters":"𝔭"}}}},"h":{"i":{";":{"0":{"codepoints":[966],"characters":"φ"}},"v":{";":{"0":{"codepoints":[981],"characters":"ϕ"}}}},"m":{"m":{"a":{"t":{";":{"0":{"codepoints":[8499],"characters":"ℳ"}}}}}},"o":{"n":{"e":{";":{"0":{"codepoints":[9742],"characters":"☎"}}}}}},"i":{";":{"0":{"codepoints":[960],"characters":"π"}},"t":{"c":{"h":{"f":{"o":{"r":{"k":{";":{"0":{"codepoints":[8916],"characters":"⋔"}}}}}}}}},"v":{";":{"0":{"codepoints":[982],"characters":"ϖ"}}}},"l":{"a":{"n":{"c":{"k":{";":{"0":{"codepoints":[8463],"characters":"ℏ"}},"h":{";":{"0":{"codepoints":[8462],"characters":"ℎ"}}}}},"k":{"v":{";":{"0":{"codepoints":[8463],"characters":"ℏ"}}}}}},"u":{"s":{"a":{"c":{"i":{"r":{";":{"0":{"codepoints":[10787],"characters":"⨣"}}}}}},"b":{";":{"0":{"codepoints":[8862],"characters":"⊞"}}},"c":{"i":{"r":{";":{"0":{"codepoints":[10786],"characters":"⨢"}}}}},";":{"0":{"codepoints":[43],"characters":"+"}},"d":{"o":{";":{"0":{"codepoints":[8724],"characters":"∔"}}},"u":{";":{"0":{"codepoints":[10789],"characters":"⨥"}}}},"e":{";":{"0":{"codepoints":[10866],"characters":"⩲"}}},"m":{"n":{"0":{"codepoints":[177],"characters":"±"},";":{"0":{"codepoints":[177],"characters":"±"}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[10790],"characters":"⨦"}}}}},"t":{"w":{"o":{";":{"0":{"codepoints":[10791],"characters":"⨧"}}}}}}}},"m":{";":{"0":{"codepoints":[177],"characters":"±"}}},"o":{"i":{"n":{"t":{"i":{"n":{"t":{";":{"0":{"codepoints":[10773],"characters":"⨕"}}}}}}}},"p":{"f":{";":{"0":{"codepoints":[120161],"characters":"𝕡"}}}},"u":{"n":{"d":{"0":{"codepoints":[163],"characters":"£"},";":{"0":{"codepoints":[163],"characters":"£"}}}}}},"r":{"a":{"p":{";":{"0":{"codepoints":[10935],"characters":"⪷"}}}},";":{"0":{"codepoints":[8826],"characters":"≺"}},"c":{"u":{"e":{";":{"0":{"codepoints":[8828],"characters":"≼"}}}}},"e":{"c":{"a":{"p":{"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10935],"characters":"⪷"}}}}}}}},";":{"0":{"codepoints":[8826],"characters":"≺"}},"c":{"u":{"r":{"l":{"y":{"e":{"q":{";":{"0":{"codepoints":[8828],"characters":"≼"}}}}}}}}},"e":{"q":{";":{"0":{"codepoints":[10927],"characters":"⪯"}}}},"n":{"a":{"p":{"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10937],"characters":"⪹"}}}}}}}},"e":{"q":{"q":{";":{"0":{"codepoints":[10933],"characters":"⪵"}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8936],"characters":"⋨"}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8830],"characters":"≾"}}}}}},";":{"0":{"codepoints":[10927],"characters":"⪯"}}},"E":{";":{"0":{"codepoints":[10931],"characters":"⪳"}}},"i":{"m":{"e":{";":{"0":{"codepoints":[8242],"characters":"′"}},"s":{";":{"0":{"codepoints":[8473],"characters":"ℙ"}}}}}},"n":{"a":{"p":{";":{"0":{"codepoints":[10937],"characters":"⪹"}}}},"E":{";":{"0":{"codepoints":[10933],"characters":"⪵"}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8936],"characters":"⋨"}}}}}},"o":{"d":{";":{"0":{"codepoints":[8719],"characters":"∏"}}},"f":{"a":{"l":{"a":{"r":{";":{"0":{"codepoints":[9006],"characters":"⌮"}}}}}},"l":{"i":{"n":{"e":{";":{"0":{"codepoints":[8978],"characters":"⌒"}}}}}},"s":{"u":{"r":{"f":{";":{"0":{"codepoints":[8979],"characters":"⌓"}}}}}}},"p":{";":{"0":{"codepoints":[8733],"characters":"∝"}},"t":{"o":{";":{"0":{"codepoints":[8733],"characters":"∝"}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8830],"characters":"≾"}}}}},"u":{"r":{"e":{"l":{";":{"0":{"codepoints":[8880],"characters":"⊰"}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120005],"characters":"𝓅"}}}},"i":{";":{"0":{"codepoints":[968],"characters":"ψ"}}}},"u":{"n":{"c":{"s":{"p":{";":{"0":{"codepoints":[8200],"characters":" "}}}}}}}},"P":{"a":{"r":{"t":{"i":{"a":{"l":{"D":{";":{"0":{"codepoints":[8706],"characters":"∂"}}}}}}}}},"c":{"y":{";":{"0":{"codepoints":[1055],"characters":"П"}}}},"f":{"r":{";":{"0":{"codepoints":[120083],"characters":"𝔓"}}}},"h":{"i":{";":{"0":{"codepoints":[934],"characters":"Φ"}}}},"i":{";":{"0":{"codepoints":[928],"characters":"Π"}}},"l":{"u":{"s":{"M":{"i":{"n":{"u":{"s":{";":{"0":{"codepoints":[177],"characters":"±"}}}}}}}}}},"o":{"i":{"n":{"c":{"a":{"r":{"e":{"p":{"l":{"a":{"n":{"e":{";":{"0":{"codepoints":[8460],"characters":"ℌ"}}}}}}}}}}}}},"p":{"f":{";":{"0":{"codepoints":[8473],"characters":"ℙ"}}}}},"r":{";":{"0":{"codepoints":[10939],"characters":"⪻"}},"e":{"c":{"e":{"d":{"e":{"s":{";":{"0":{"codepoints":[8826],"characters":"≺"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10927],"characters":"⪯"}}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8828],"characters":"≼"}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8830],"characters":"≾"}}}}}}}}}}}}},"i":{"m":{"e":{";":{"0":{"codepoints":[8243],"characters":"″"}}}}},"o":{"d":{"u":{"c":{"t":{";":{"0":{"codepoints":[8719],"characters":"∏"}}}}}},"p":{"o":{"r":{"t":{"i":{"o":{"n":{"a":{"l":{";":{"0":{"codepoints":[8733],"characters":"∝"}}}},";":{"0":{"codepoints":[8759],"characters":"∷"}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119979],"characters":"𝒫"}}}},"i":{";":{"0":{"codepoints":[936],"characters":"Ψ"}}}}},"Q":{"f":{"r":{";":{"0":{"codepoints":[120084],"characters":"𝔔"}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[8474],"characters":"ℚ"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119980],"characters":"𝒬"}}}}},"U":{"O":{"T":{"0":{"codepoints":[34],"characters":"\""},";":{"0":{"codepoints":[34],"characters":"\""}}}}}},"q":{"f":{"r":{";":{"0":{"codepoints":[120110],"characters":"𝔮"}}}},"i":{"n":{"t":{";":{"0":{"codepoints":[10764],"characters":"⨌"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120162],"characters":"𝕢"}}}}},"p":{"r":{"i":{"m":{"e":{";":{"0":{"codepoints":[8279],"characters":"⁗"}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120006],"characters":"𝓆"}}}}},"u":{"a":{"t":{"e":{"r":{"n":{"i":{"o":{"n":{"s":{";":{"0":{"codepoints":[8461],"characters":"ℍ"}}}}}}}}},"i":{"n":{"t":{";":{"0":{"codepoints":[10774],"characters":"⨖"}}}}}}},"e":{"s":{"t":{";":{"0":{"codepoints":[63],"characters":"?"}},"e":{"q":{";":{"0":{"codepoints":[8799],"characters":"≟"}}}}}}},"o":{"t":{"0":{"codepoints":[34],"characters":"\""},";":{"0":{"codepoints":[34],"characters":"\""}}}}}},"r":{"A":{"a":{"r":{"r":{";":{"0":{"codepoints":[8667],"characters":"⇛"}}}}},"r":{"r":{";":{"0":{"codepoints":[8658],"characters":"⇒"}}}},"t":{"a":{"i":{"l":{";":{"0":{"codepoints":[10524],"characters":"⤜"}}}}}}},"a":{"c":{"e":{";":{"0":{"codepoints":[8765,817],"characters":"∽̱"}}},"u":{"t":{"e":{";":{"0":{"codepoints":[341],"characters":"ŕ"}}}}}},"d":{"i":{"c":{";":{"0":{"codepoints":[8730],"characters":"√"}}}}},"e":{"m":{"p":{"t":{"y":{"v":{";":{"0":{"codepoints":[10675],"characters":"⦳"}}}}}}}},"n":{"g":{";":{"0":{"codepoints":[10217],"characters":"⟩"}},"d":{";":{"0":{"codepoints":[10642],"characters":"⦒"}}},"e":{";":{"0":{"codepoints":[10661],"characters":"⦥"}}},"l":{"e":{";":{"0":{"codepoints":[10217],"characters":"⟩"}}}}}},"q":{"u":{"o":{"0":{"codepoints":[187],"characters":"»"},";":{"0":{"codepoints":[187],"characters":"»"}}}}},"r":{"r":{"a":{"p":{";":{"0":{"codepoints":[10613],"characters":"⥵"}}}},"b":{";":{"0":{"codepoints":[8677],"characters":"⇥"}},"f":{"s":{";":{"0":{"codepoints":[10528],"characters":"⤠"}}}}},"c":{";":{"0":{"codepoints":[10547],"characters":"⤳"}}},";":{"0":{"codepoints":[8594],"characters":"→"}},"f":{"s":{";":{"0":{"codepoints":[10526],"characters":"⤞"}}}},"h":{"k":{";":{"0":{"codepoints":[8618],"characters":"↪"}}}},"l":{"p":{";":{"0":{"codepoints":[8620],"characters":"↬"}}}},"p":{"l":{";":{"0":{"codepoints":[10565],"characters":"⥅"}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[10612],"characters":"⥴"}}}}},"t":{"l":{";":{"0":{"codepoints":[8611],"characters":"↣"}}}},"w":{";":{"0":{"codepoints":[8605],"characters":"↝"}}}}},"t":{"a":{"i":{"l":{";":{"0":{"codepoints":[10522],"characters":"⤚"}}}}},"i":{"o":{";":{"0":{"codepoints":[8758],"characters":"∶"}},"n":{"a":{"l":{"s":{";":{"0":{"codepoints":[8474],"characters":"ℚ"}}}}}}}}}},"b":{"a":{"r":{"r":{";":{"0":{"codepoints":[10509],"characters":"⤍"}}}}},"b":{"r":{"k":{";":{"0":{"codepoints":[10099],"characters":"❳"}}}}},"r":{"a":{"c":{"e":{";":{"0":{"codepoints":[125],"characters":"}"}}},"k":{";":{"0":{"codepoints":[93],"characters":"]"}}}}},"k":{"e":{";":{"0":{"codepoints":[10636],"characters":"⦌"}}},"s":{"l":{"d":{";":{"0":{"codepoints":[10638],"characters":"⦎"}}},"u":{";":{"0":{"codepoints":[10640],"characters":"⦐"}}}}}}}},"B":{"a":{"r":{"r":{";":{"0":{"codepoints":[10511],"characters":"⤏"}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[345],"characters":"ř"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[343],"characters":"ŗ"}}}}},"i":{"l":{";":{"0":{"codepoints":[8969],"characters":"⌉"}}}}},"u":{"b":{";":{"0":{"codepoints":[125],"characters":"}"}}}},"y":{";":{"0":{"codepoints":[1088],"characters":"р"}}}},"d":{"c":{"a":{";":{"0":{"codepoints":[10551],"characters":"⤷"}}}},"l":{"d":{"h":{"a":{"r":{";":{"0":{"codepoints":[10601],"characters":"⥩"}}}}}}},"q":{"u":{"o":{";":{"0":{"codepoints":[8221],"characters":"”"}},"r":{";":{"0":{"codepoints":[8221],"characters":"”"}}}}}},"s":{"h":{";":{"0":{"codepoints":[8627],"characters":"↳"}}}}},"e":{"a":{"l":{";":{"0":{"codepoints":[8476],"characters":"ℜ"}},"i":{"n":{"e":{";":{"0":{"codepoints":[8475],"characters":"ℛ"}}}}},"p":{"a":{"r":{"t":{";":{"0":{"codepoints":[8476],"characters":"ℜ"}}}}}},"s":{";":{"0":{"codepoints":[8477],"characters":"ℝ"}}}}},"c":{"t":{";":{"0":{"codepoints":[9645],"characters":"▭"}}}},"g":{"0":{"codepoints":[174],"characters":"®"},";":{"0":{"codepoints":[174],"characters":"®"}}}},"f":{"i":{"s":{"h":{"t":{";":{"0":{"codepoints":[10621],"characters":"⥽"}}}}}},"l":{"o":{"o":{"r":{";":{"0":{"codepoints":[8971],"characters":"⌋"}}}}}},"r":{";":{"0":{"codepoints":[120111],"characters":"𝔯"}}}},"H":{"a":{"r":{";":{"0":{"codepoints":[10596],"characters":"⥤"}}}}},"h":{"a":{"r":{"d":{";":{"0":{"codepoints":[8641],"characters":"⇁"}}},"u":{";":{"0":{"codepoints":[8640],"characters":"⇀"}},"l":{";":{"0":{"codepoints":[10604],"characters":"⥬"}}}}}},"o":{";":{"0":{"codepoints":[961],"characters":"ρ"}},"v":{";":{"0":{"codepoints":[1009],"characters":"ϱ"}}}}},"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8594],"characters":"→"}},"t":{"a":{"i":{"l":{";":{"0":{"codepoints":[8611],"characters":"↣"}}}}}}}}}}},"h":{"a":{"r":{"p":{"o":{"o":{"n":{"d":{"o":{"w":{"n":{";":{"0":{"codepoints":[8641],"characters":"⇁"}}}}}},"u":{"p":{";":{"0":{"codepoints":[8640],"characters":"⇀"}}}}}}}}}}},"l":{"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{"s":{";":{"0":{"codepoints":[8644],"characters":"⇄"}}}}}}}},"h":{"a":{"r":{"p":{"o":{"o":{"n":{"s":{";":{"0":{"codepoints":[8652],"characters":"⇌"}}}}}}}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{"s":{";":{"0":{"codepoints":[8649],"characters":"⇉"}}}}}}}}}}}}},"s":{"q":{"u":{"i":{"g":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8605],"characters":"↝"}}}}}}}}}}}},"t":{"h":{"r":{"e":{"e":{"t":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8908],"characters":"⋌"}}}}}}}}}}}}}}},"n":{"g":{";":{"0":{"codepoints":[730],"characters":"˚"}}}},"s":{"i":{"n":{"g":{"d":{"o":{"t":{"s":{"e":{"q":{";":{"0":{"codepoints":[8787],"characters":"≓"}}}}}}}}}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[8644],"characters":"⇄"}}}}},"h":{"a":{"r":{";":{"0":{"codepoints":[8652],"characters":"⇌"}}}}},"m":{";":{"0":{"codepoints":[8207],"characters":"‏"}}}},"m":{"o":{"u":{"s":{"t":{"a":{"c":{"h":{"e":{";":{"0":{"codepoints":[9137],"characters":"⎱"}}}}}},";":{"0":{"codepoints":[9137],"characters":"⎱"}}}}}}},"n":{"m":{"i":{"d":{";":{"0":{"codepoints":[10990],"characters":"⫮"}}}}}},"o":{"a":{"n":{"g":{";":{"0":{"codepoints":[10221],"characters":"⟭"}}}},"r":{"r":{";":{"0":{"codepoints":[8702],"characters":"⇾"}}}}},"b":{"r":{"k":{";":{"0":{"codepoints":[10215],"characters":"⟧"}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[10630],"characters":"⦆"}}}},"f":{";":{"0":{"codepoints":[120163],"characters":"𝕣"}}},"l":{"u":{"s":{";":{"0":{"codepoints":[10798],"characters":"⨮"}}}}}},"t":{"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[10805],"characters":"⨵"}}}}}}}},"p":{"a":{"r":{";":{"0":{"codepoints":[41],"characters":")"}},"g":{"t":{";":{"0":{"codepoints":[10644],"characters":"⦔"}}}}}},"p":{"o":{"l":{"i":{"n":{"t":{";":{"0":{"codepoints":[10770],"characters":"⨒"}}}}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[8649],"characters":"⇉"}}}}}},"s":{"a":{"q":{"u":{"o":{";":{"0":{"codepoints":[8250],"characters":"›"}}}}}},"c":{"r":{";":{"0":{"codepoints":[120007],"characters":"𝓇"}}}},"h":{";":{"0":{"codepoints":[8625],"characters":"↱"}}},"q":{"b":{";":{"0":{"codepoints":[93],"characters":"]"}}},"u":{"o":{";":{"0":{"codepoints":[8217],"characters":"’"}},"r":{";":{"0":{"codepoints":[8217],"characters":"’"}}}}}}},"t":{"h":{"r":{"e":{"e":{";":{"0":{"codepoints":[8908],"characters":"⋌"}}}}}},"i":{"m":{"e":{"s":{";":{"0":{"codepoints":[8906],"characters":"⋊"}}}}}},"r":{"i":{";":{"0":{"codepoints":[9657],"characters":"▹"}},"e":{";":{"0":{"codepoints":[8885],"characters":"⊵"}}},"f":{";":{"0":{"codepoints":[9656],"characters":"▸"}}},"l":{"t":{"r":{"i":{";":{"0":{"codepoints":[10702],"characters":"⧎"}}}}}}}}},"u":{"l":{"u":{"h":{"a":{"r":{";":{"0":{"codepoints":[10600],"characters":"⥨"}}}}}}}},"x":{";":{"0":{"codepoints":[8478],"characters":"℞"}}}},"R":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[340],"characters":"Ŕ"}}}}}},"n":{"g":{";":{"0":{"codepoints":[10219],"characters":"⟫"}}}},"r":{"r":{";":{"0":{"codepoints":[8608],"characters":"↠"}},"t":{"l":{";":{"0":{"codepoints":[10518],"characters":"⤖"}}}}}}},"B":{"a":{"r":{"r":{";":{"0":{"codepoints":[10512],"characters":"⤐"}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[344],"characters":"Ř"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[342],"characters":"Ŗ"}}}}}},"y":{";":{"0":{"codepoints":[1056],"characters":"Р"}}}},"e":{";":{"0":{"codepoints":[8476],"characters":"ℜ"}},"v":{"e":{"r":{"s":{"e":{"E":{"l":{"e":{"m":{"e":{"n":{"t":{";":{"0":{"codepoints":[8715],"characters":"∋"}}}}}}}},"q":{"u":{"i":{"l":{"i":{"b":{"r":{"i":{"u":{"m":{";":{"0":{"codepoints":[8651],"characters":"⇋"}}}}}}}}}}}}},"U":{"p":{"E":{"q":{"u":{"i":{"l":{"i":{"b":{"r":{"i":{"u":{"m":{";":{"0":{"codepoints":[10607],"characters":"⥯"}}}}}}}}}}}}}}}}}}}}},"E":{"G":{"0":{"codepoints":[174],"characters":"®"},";":{"0":{"codepoints":[174],"characters":"®"}}}},"f":{"r":{";":{"0":{"codepoints":[8476],"characters":"ℜ"}}}},"h":{"o":{";":{"0":{"codepoints":[929],"characters":"Ρ"}}}},"i":{"g":{"h":{"t":{"A":{"n":{"g":{"l":{"e":{"B":{"r":{"a":{"c":{"k":{"e":{"t":{";":{"0":{"codepoints":[10217],"characters":"⟩"}}}}}}}}}}}}},"r":{"r":{"o":{"w":{"B":{"a":{"r":{";":{"0":{"codepoints":[8677],"characters":"⇥"}}}}},";":{"0":{"codepoints":[8594],"characters":"→"}},"L":{"e":{"f":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8644],"characters":"⇄"}}}}}}}}}}}}}}}},"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8658],"characters":"⇒"}}}}}}},"C":{"e":{"i":{"l":{"i":{"n":{"g":{";":{"0":{"codepoints":[8969],"characters":"⌉"}}}}}}}}},"D":{"o":{"u":{"b":{"l":{"e":{"B":{"r":{"a":{"c":{"k":{"e":{"t":{";":{"0":{"codepoints":[10215],"characters":"⟧"}}}}}}}}}}}}},"w":{"n":{"T":{"e":{"e":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10589],"characters":"⥝"}}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10581],"characters":"⥕"}}}}},";":{"0":{"codepoints":[8642],"characters":"⇂"}}}}}}}}}}}},"F":{"l":{"o":{"o":{"r":{";":{"0":{"codepoints":[8971],"characters":"⌋"}}}}}}},"T":{"e":{"e":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8614],"characters":"↦"}}}}}}},";":{"0":{"codepoints":[8866],"characters":"⊢"}},"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10587],"characters":"⥛"}}}}}}}}}},"r":{"i":{"a":{"n":{"g":{"l":{"e":{"B":{"a":{"r":{";":{"0":{"codepoints":[10704],"characters":"⧐"}}}}},";":{"0":{"codepoints":[8883],"characters":"⊳"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8885],"characters":"⊵"}}}}}}}}}}}}}}},"U":{"p":{"D":{"o":{"w":{"n":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10575],"characters":"⥏"}}}}}}}}}}}},"T":{"e":{"e":{"V":{"e":{"c":{"t":{"o":{"r":{";":{"0":{"codepoints":[10588],"characters":"⥜"}}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10580],"characters":"⥔"}}}}},";":{"0":{"codepoints":[8638],"characters":"↾"}}}}}}}}}},"V":{"e":{"c":{"t":{"o":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[10579],"characters":"⥓"}}}}},";":{"0":{"codepoints":[8640],"characters":"⇀"}}}}}}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[8477],"characters":"ℝ"}}}},"u":{"n":{"d":{"I":{"m":{"p":{"l":{"i":{"e":{"s":{";":{"0":{"codepoints":[10608],"characters":"⥰"}}}}}}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8667],"characters":"⇛"}}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[8475],"characters":"ℛ"}}}},"h":{";":{"0":{"codepoints":[8625],"characters":"↱"}}}},"u":{"l":{"e":{"D":{"e":{"l":{"a":{"y":{"e":{"d":{";":{"0":{"codepoints":[10740],"characters":"⧴"}}}}}}}}}}}}},"S":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[346],"characters":"Ś"}}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[352],"characters":"Š"}}}}}},";":{"0":{"codepoints":[10940],"characters":"⪼"}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[350],"characters":"Ş"}}}}}},"i":{"r":{"c":{";":{"0":{"codepoints":[348],"characters":"Ŝ"}}}}},"y":{";":{"0":{"codepoints":[1057],"characters":"С"}}}},"f":{"r":{";":{"0":{"codepoints":[120086],"characters":"𝔖"}}}},"H":{"C":{"H":{"c":{"y":{";":{"0":{"codepoints":[1065],"characters":"Щ"}}}}}},"c":{"y":{";":{"0":{"codepoints":[1064],"characters":"Ш"}}}}},"h":{"o":{"r":{"t":{"D":{"o":{"w":{"n":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8595],"characters":"↓"}}}}}}}}}}},"L":{"e":{"f":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8592],"characters":"←"}}}}}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8594],"characters":"→"}}}}}}}}}}}},"U":{"p":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8593],"characters":"↑"}}}}}}}}}}}}},"i":{"g":{"m":{"a":{";":{"0":{"codepoints":[931],"characters":"Σ"}}}}}},"m":{"a":{"l":{"l":{"C":{"i":{"r":{"c":{"l":{"e":{";":{"0":{"codepoints":[8728],"characters":"∘"}}}}}}}}}}}},"O":{"F":{"T":{"c":{"y":{";":{"0":{"codepoints":[1068],"characters":"Ь"}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120138],"characters":"𝕊"}}}}},"q":{"r":{"t":{";":{"0":{"codepoints":[8730],"characters":"√"}}}},"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[9633],"characters":"□"}},"I":{"n":{"t":{"e":{"r":{"s":{"e":{"c":{"t":{"i":{"o":{"n":{";":{"0":{"codepoints":[8851],"characters":"⊓"}}}}}}}}}}}}}},"S":{"u":{"b":{"s":{"e":{"t":{";":{"0":{"codepoints":[8847],"characters":"⊏"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8849],"characters":"⊑"}}}}}}}}}}},"p":{"e":{"r":{"s":{"e":{"t":{";":{"0":{"codepoints":[8848],"characters":"⊐"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8850],"characters":"⊒"}}}}}}}}}}}}}}},"U":{"n":{"i":{"o":{"n":{";":{"0":{"codepoints":[8852],"characters":"⊔"}}}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119982],"characters":"𝒮"}}}}},"t":{"a":{"r":{";":{"0":{"codepoints":[8902],"characters":"⋆"}}}}},"u":{"b":{";":{"0":{"codepoints":[8912],"characters":"⋐"}},"s":{"e":{"t":{";":{"0":{"codepoints":[8912],"characters":"⋐"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8838],"characters":"⊆"}}}}}}}}}}},"c":{"c":{"e":{"e":{"d":{"s":{";":{"0":{"codepoints":[8827],"characters":"≻"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[10928],"characters":"⪰"}}}}}}},"S":{"l":{"a":{"n":{"t":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8829],"characters":"≽"}}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8831],"characters":"≿"}}}}}}}}}}}},"h":{"T":{"h":{"a":{"t":{";":{"0":{"codepoints":[8715],"characters":"∋"}}}}}}}},"m":{";":{"0":{"codepoints":[8721],"characters":"∑"}}},"p":{";":{"0":{"codepoints":[8913],"characters":"⋑"}},"e":{"r":{"s":{"e":{"t":{";":{"0":{"codepoints":[8835],"characters":"⊃"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8839],"characters":"⊇"}}}}}}}}}}}},"s":{"e":{"t":{";":{"0":{"codepoints":[8913],"characters":"⋑"}}}}}}}},"s":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[347],"characters":"ś"}}}}}}},"b":{"q":{"u":{"o":{";":{"0":{"codepoints":[8218],"characters":"‚"}}}}}},"c":{"a":{"p":{";":{"0":{"codepoints":[10936],"characters":"⪸"}}},"r":{"o":{"n":{";":{"0":{"codepoints":[353],"characters":"š"}}}}}},";":{"0":{"codepoints":[8827],"characters":"≻"}},"c":{"u":{"e":{";":{"0":{"codepoints":[8829],"characters":"≽"}}}}},"e":{";":{"0":{"codepoints":[10928],"characters":"⪰"}},"d":{"i":{"l":{";":{"0":{"codepoints":[351],"characters":"ş"}}}}}},"E":{";":{"0":{"codepoints":[10932],"characters":"⪴"}}},"i":{"r":{"c":{";":{"0":{"codepoints":[349],"characters":"ŝ"}}}}},"n":{"a":{"p":{";":{"0":{"codepoints":[10938],"characters":"⪺"}}}},"E":{";":{"0":{"codepoints":[10934],"characters":"⪶"}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8937],"characters":"⋩"}}}}}},"p":{"o":{"l":{"i":{"n":{"t":{";":{"0":{"codepoints":[10771],"characters":"⨓"}}}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8831],"characters":"≿"}}}}},"y":{";":{"0":{"codepoints":[1089],"characters":"с"}}}},"d":{"o":{"t":{"b":{";":{"0":{"codepoints":[8865],"characters":"⊡"}}},";":{"0":{"codepoints":[8901],"characters":"⋅"}},"e":{";":{"0":{"codepoints":[10854],"characters":"⩦"}}}}}},"e":{"a":{"r":{"h":{"k":{";":{"0":{"codepoints":[10533],"characters":"⤥"}}}},"r":{";":{"0":{"codepoints":[8600],"characters":"↘"}},"o":{"w":{";":{"0":{"codepoints":[8600],"characters":"↘"}}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8664],"characters":"⇘"}}}}},"c":{"t":{"0":{"codepoints":[167],"characters":"§"},";":{"0":{"codepoints":[167],"characters":"§"}}}},"m":{"i":{";":{"0":{"codepoints":[59],"characters":";"}}}},"s":{"w":{"a":{"r":{";":{"0":{"codepoints":[10537],"characters":"⤩"}}}}}},"t":{"m":{"i":{"n":{"u":{"s":{";":{"0":{"codepoints":[8726],"characters":"∖"}}}}}},"n":{";":{"0":{"codepoints":[8726],"characters":"∖"}}}}},"x":{"t":{";":{"0":{"codepoints":[10038],"characters":"✶"}}}}},"f":{"r":{";":{"0":{"codepoints":[120112],"characters":"𝔰"}},"o":{"w":{"n":{";":{"0":{"codepoints":[8994],"characters":"⌢"}}}}}}},"h":{"a":{"r":{"p":{";":{"0":{"codepoints":[9839],"characters":"♯"}}}}},"c":{"h":{"c":{"y":{";":{"0":{"codepoints":[1097],"characters":"щ"}}}}},"y":{";":{"0":{"codepoints":[1096],"characters":"ш"}}}},"o":{"r":{"t":{"m":{"i":{"d":{";":{"0":{"codepoints":[8739],"characters":"∣"}}}}},"p":{"a":{"r":{"a":{"l":{"l":{"e":{"l":{";":{"0":{"codepoints":[8741],"characters":"∥"}}}}}}}}}}}}},"y":{"0":{"codepoints":[173],"characters":"­"},";":{"0":{"codepoints":[173],"characters":"­"}}}},"i":{"g":{"m":{"a":{";":{"0":{"codepoints":[963],"characters":"σ"}},"f":{";":{"0":{"codepoints":[962],"characters":"ς"}}},"v":{";":{"0":{"codepoints":[962],"characters":"ς"}}}}}},"m":{";":{"0":{"codepoints":[8764],"characters":"∼"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10858],"characters":"⩪"}}}}},"e":{";":{"0":{"codepoints":[8771],"characters":"≃"}},"q":{";":{"0":{"codepoints":[8771],"characters":"≃"}}}},"g":{";":{"0":{"codepoints":[10910],"characters":"⪞"}},"E":{";":{"0":{"codepoints":[10912],"characters":"⪠"}}}},"l":{";":{"0":{"codepoints":[10909],"characters":"⪝"}},"E":{";":{"0":{"codepoints":[10911],"characters":"⪟"}}}},"n":{"e":{";":{"0":{"codepoints":[8774],"characters":"≆"}}}},"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[10788],"characters":"⨤"}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[10610],"characters":"⥲"}}}}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[8592],"characters":"←"}}}}}},"m":{"a":{"l":{"l":{"s":{"e":{"t":{"m":{"i":{"n":{"u":{"s":{";":{"0":{"codepoints":[8726],"characters":"∖"}}}}}}}}}}}},"s":{"h":{"p":{";":{"0":{"codepoints":[10803],"characters":"⨳"}}}}}},"e":{"p":{"a":{"r":{"s":{"l":{";":{"0":{"codepoints":[10724],"characters":"⧤"}}}}}}}},"i":{"d":{";":{"0":{"codepoints":[8739],"characters":"∣"}}},"l":{"e":{";":{"0":{"codepoints":[8995],"characters":"⌣"}}}}},"t":{";":{"0":{"codepoints":[10922],"characters":"⪪"}},"e":{";":{"0":{"codepoints":[10924],"characters":"⪬"}},"s":{";":{"0":{"codepoints":[10924,65024],"characters":"⪬︀"}}}}}},"o":{"f":{"t":{"c":{"y":{";":{"0":{"codepoints":[1100],"characters":"ь"}}}}}},"l":{"b":{"a":{"r":{";":{"0":{"codepoints":[9023],"characters":"⌿"}}}},";":{"0":{"codepoints":[10692],"characters":"⧄"}}},";":{"0":{"codepoints":[47],"characters":"/"}}},"p":{"f":{";":{"0":{"codepoints":[120164],"characters":"𝕤"}}}}},"p":{"a":{"d":{"e":{"s":{";":{"0":{"codepoints":[9824],"characters":"♠"}},"u":{"i":{"t":{";":{"0":{"codepoints":[9824],"characters":"♠"}}}}}}}},"r":{";":{"0":{"codepoints":[8741],"characters":"∥"}}}}},"q":{"c":{"a":{"p":{";":{"0":{"codepoints":[8851],"characters":"⊓"}},"s":{";":{"0":{"codepoints":[8851,65024],"characters":"⊓︀"}}}}},"u":{"p":{";":{"0":{"codepoints":[8852],"characters":"⊔"}},"s":{";":{"0":{"codepoints":[8852,65024],"characters":"⊔︀"}}}}}},"s":{"u":{"b":{";":{"0":{"codepoints":[8847],"characters":"⊏"}},"e":{";":{"0":{"codepoints":[8849],"characters":"⊑"}}},"s":{"e":{"t":{";":{"0":{"codepoints":[8847],"characters":"⊏"}},"e":{"q":{";":{"0":{"codepoints":[8849],"characters":"⊑"}}}}}}}},"p":{";":{"0":{"codepoints":[8848],"characters":"⊐"}},"e":{";":{"0":{"codepoints":[8850],"characters":"⊒"}}},"s":{"e":{"t":{";":{"0":{"codepoints":[8848],"characters":"⊐"}},"e":{"q":{";":{"0":{"codepoints":[8850],"characters":"⊒"}}}}}}}}}},"u":{"a":{"r":{"e":{";":{"0":{"codepoints":[9633],"characters":"□"}}},"f":{";":{"0":{"codepoints":[9642],"characters":"▪"}}}}},";":{"0":{"codepoints":[9633],"characters":"□"}},"f":{";":{"0":{"codepoints":[9642],"characters":"▪"}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[8594],"characters":"→"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120008],"characters":"𝓈"}}}},"e":{"t":{"m":{"n":{";":{"0":{"codepoints":[8726],"characters":"∖"}}}}}},"m":{"i":{"l":{"e":{";":{"0":{"codepoints":[8995],"characters":"⌣"}}}}}},"t":{"a":{"r":{"f":{";":{"0":{"codepoints":[8902],"characters":"⋆"}}}}}}},"t":{"a":{"r":{";":{"0":{"codepoints":[9734],"characters":"☆"}},"f":{";":{"0":{"codepoints":[9733],"characters":"★"}}}}},"r":{"a":{"i":{"g":{"h":{"t":{"e":{"p":{"s":{"i":{"l":{"o":{"n":{";":{"0":{"codepoints":[1013],"characters":"ϵ"}}}}}}}}},"p":{"h":{"i":{";":{"0":{"codepoints":[981],"characters":"ϕ"}}}}}}}}}},"n":{"s":{";":{"0":{"codepoints":[175],"characters":"¯"}}}}}},"u":{"b":{";":{"0":{"codepoints":[8834],"characters":"⊂"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10941],"characters":"⪽"}}}}},"E":{";":{"0":{"codepoints":[10949],"characters":"⫅"}}},"e":{";":{"0":{"codepoints":[8838],"characters":"⊆"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10947],"characters":"⫃"}}}}}},"m":{"u":{"l":{"t":{";":{"0":{"codepoints":[10945],"characters":"⫁"}}}}}},"n":{"E":{";":{"0":{"codepoints":[10955],"characters":"⫋"}}},"e":{";":{"0":{"codepoints":[8842],"characters":"⊊"}}}},"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[10943],"characters":"⪿"}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[10617],"characters":"⥹"}}}}}},"s":{"e":{"t":{";":{"0":{"codepoints":[8834],"characters":"⊂"}},"e":{"q":{";":{"0":{"codepoints":[8838],"characters":"⊆"}},"q":{";":{"0":{"codepoints":[10949],"characters":"⫅"}}}}},"n":{"e":{"q":{";":{"0":{"codepoints":[8842],"characters":"⊊"}},"q":{";":{"0":{"codepoints":[10955],"characters":"⫋"}}}}}}}},"i":{"m":{";":{"0":{"codepoints":[10951],"characters":"⫇"}}}},"u":{"b":{";":{"0":{"codepoints":[10965],"characters":"⫕"}}},"p":{";":{"0":{"codepoints":[10963],"characters":"⫓"}}}}}},"c":{"c":{"a":{"p":{"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10936],"characters":"⪸"}}}}}}}},";":{"0":{"codepoints":[8827],"characters":"≻"}},"c":{"u":{"r":{"l":{"y":{"e":{"q":{";":{"0":{"codepoints":[8829],"characters":"≽"}}}}}}}}},"e":{"q":{";":{"0":{"codepoints":[10928],"characters":"⪰"}}}},"n":{"a":{"p":{"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[10938],"characters":"⪺"}}}}}}}},"e":{"q":{"q":{";":{"0":{"codepoints":[10934],"characters":"⪶"}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8937],"characters":"⋩"}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8831],"characters":"≿"}}}}}}},"m":{";":{"0":{"codepoints":[8721],"characters":"∑"}}},"n":{"g":{";":{"0":{"codepoints":[9834],"characters":"♪"}}}},"p":{"1":{"0":{"codepoints":[185],"characters":"¹"},";":{"0":{"codepoints":[185],"characters":"¹"}}},"2":{"0":{"codepoints":[178],"characters":"²"},";":{"0":{"codepoints":[178],"characters":"²"}}},"3":{"0":{"codepoints":[179],"characters":"³"},";":{"0":{"codepoints":[179],"characters":"³"}}},";":{"0":{"codepoints":[8835],"characters":"⊃"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10942],"characters":"⪾"}}}},"s":{"u":{"b":{";":{"0":{"codepoints":[10968],"characters":"⫘"}}}}}},"E":{";":{"0":{"codepoints":[10950],"characters":"⫆"}}},"e":{";":{"0":{"codepoints":[8839],"characters":"⊇"}},"d":{"o":{"t":{";":{"0":{"codepoints":[10948],"characters":"⫄"}}}}}},"h":{"s":{"o":{"l":{";":{"0":{"codepoints":[10185],"characters":"⟉"}}}},"u":{"b":{";":{"0":{"codepoints":[10967],"characters":"⫗"}}}}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[10619],"characters":"⥻"}}}}}},"m":{"u":{"l":{"t":{";":{"0":{"codepoints":[10946],"characters":"⫂"}}}}}},"n":{"E":{";":{"0":{"codepoints":[10956],"characters":"⫌"}}},"e":{";":{"0":{"codepoints":[8843],"characters":"⊋"}}}},"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[10944],"characters":"⫀"}}}}}},"s":{"e":{"t":{";":{"0":{"codepoints":[8835],"characters":"⊃"}},"e":{"q":{";":{"0":{"codepoints":[8839],"characters":"⊇"}},"q":{";":{"0":{"codepoints":[10950],"characters":"⫆"}}}}},"n":{"e":{"q":{";":{"0":{"codepoints":[8843],"characters":"⊋"}},"q":{";":{"0":{"codepoints":[10956],"characters":"⫌"}}}}}}}},"i":{"m":{";":{"0":{"codepoints":[10952],"characters":"⫈"}}}},"u":{"b":{";":{"0":{"codepoints":[10964],"characters":"⫔"}}},"p":{";":{"0":{"codepoints":[10966],"characters":"⫖"}}}}}}},"w":{"a":{"r":{"h":{"k":{";":{"0":{"codepoints":[10534],"characters":"⤦"}}}},"r":{";":{"0":{"codepoints":[8601],"characters":"↙"}},"o":{"w":{";":{"0":{"codepoints":[8601],"characters":"↙"}}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8665],"characters":"⇙"}}}}},"n":{"w":{"a":{"r":{";":{"0":{"codepoints":[10538],"characters":"⤪"}}}}}}},"z":{"l":{"i":{"g":{"0":{"codepoints":[223],"characters":"ß"},";":{"0":{"codepoints":[223],"characters":"ß"}}}}}}},"T":{"a":{"b":{";":{"0":{"codepoints":[9],"characters":"\t"}}},"u":{";":{"0":{"codepoints":[932],"characters":"Τ"}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[356],"characters":"Ť"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[354],"characters":"Ţ"}}}}}},"y":{";":{"0":{"codepoints":[1058],"characters":"Т"}}}},"f":{"r":{";":{"0":{"codepoints":[120087],"characters":"𝔗"}}}},"h":{"e":{"r":{"e":{"f":{"o":{"r":{"e":{";":{"0":{"codepoints":[8756],"characters":"∴"}}}}}}}},"t":{"a":{";":{"0":{"codepoints":[920],"characters":"Θ"}}}}},"i":{"c":{"k":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8287,8202],"characters":"  "}}}}}}}}},"n":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8201],"characters":" "}}}}}}}}}},"H":{"O":{"R":{"N":{"0":{"codepoints":[222],"characters":"Þ"},";":{"0":{"codepoints":[222],"characters":"Þ"}}}}}},"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8764],"characters":"∼"}},"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8771],"characters":"≃"}}}}}}},"F":{"u":{"l":{"l":{"E":{"q":{"u":{"a":{"l":{";":{"0":{"codepoints":[8773],"characters":"≅"}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8776],"characters":"≈"}}}}}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120139],"characters":"𝕋"}}}}},"R":{"A":{"D":{"E":{";":{"0":{"codepoints":[8482],"characters":"™"}}}}}},"r":{"i":{"p":{"l":{"e":{"D":{"o":{"t":{";":{"0":{"codepoints":[8411],"characters":"⃛"}}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119983],"characters":"𝒯"}}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[358],"characters":"Ŧ"}}}}}}},"S":{"c":{"y":{";":{"0":{"codepoints":[1062],"characters":"Ц"}}}},"H":{"c":{"y":{";":{"0":{"codepoints":[1035],"characters":"Ћ"}}}}}}},"t":{"a":{"r":{"g":{"e":{"t":{";":{"0":{"codepoints":[8982],"characters":"⌖"}}}}}},"u":{";":{"0":{"codepoints":[964],"characters":"τ"}}}},"b":{"r":{"k":{";":{"0":{"codepoints":[9140],"characters":"⎴"}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[357],"characters":"ť"}}}}}},"e":{"d":{"i":{"l":{";":{"0":{"codepoints":[355],"characters":"ţ"}}}}}},"y":{";":{"0":{"codepoints":[1090],"characters":"т"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[8411],"characters":"⃛"}}}}},"e":{"l":{"r":{"e":{"c":{";":{"0":{"codepoints":[8981],"characters":"⌕"}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120113],"characters":"𝔱"}}}},"h":{"e":{"r":{"e":{"4":{";":{"0":{"codepoints":[8756],"characters":"∴"}}},"f":{"o":{"r":{"e":{";":{"0":{"codepoints":[8756],"characters":"∴"}}}}}}}},"t":{"a":{";":{"0":{"codepoints":[952],"characters":"θ"}},"s":{"y":{"m":{";":{"0":{"codepoints":[977],"characters":"ϑ"}}}}},"v":{";":{"0":{"codepoints":[977],"characters":"ϑ"}}}}}},"i":{"c":{"k":{"a":{"p":{"p":{"r":{"o":{"x":{";":{"0":{"codepoints":[8776],"characters":"≈"}}}}}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8764],"characters":"∼"}}}}}}},"n":{"s":{"p":{";":{"0":{"codepoints":[8201],"characters":" "}}}}}},"k":{"a":{"p":{";":{"0":{"codepoints":[8776],"characters":"≈"}}}},"s":{"i":{"m":{";":{"0":{"codepoints":[8764],"characters":"∼"}}}}}},"o":{"r":{"n":{"0":{"codepoints":[254],"characters":"þ"},";":{"0":{"codepoints":[254],"characters":"þ"}}}}}},"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[732],"characters":"˜"}}}}},"m":{"e":{"s":{"0":{"codepoints":[215],"characters":"×"},"b":{"a":{"r":{";":{"0":{"codepoints":[10801],"characters":"⨱"}}}},";":{"0":{"codepoints":[8864],"characters":"⊠"}}},";":{"0":{"codepoints":[215],"characters":"×"}},"d":{";":{"0":{"codepoints":[10800],"characters":"⨰"}}}}}},"n":{"t":{";":{"0":{"codepoints":[8749],"characters":"∭"}}}}},"o":{"e":{"a":{";":{"0":{"codepoints":[10536],"characters":"⤨"}}}},"p":{"b":{"o":{"t":{";":{"0":{"codepoints":[9014],"characters":"⌶"}}}}},"c":{"i":{"r":{";":{"0":{"codepoints":[10993],"characters":"⫱"}}}}},";":{"0":{"codepoints":[8868],"characters":"⊤"}},"f":{";":{"0":{"codepoints":[120165],"characters":"𝕥"}},"o":{"r":{"k":{";":{"0":{"codepoints":[10970],"characters":"⫚"}}}}}}},"s":{"a":{";":{"0":{"codepoints":[10537],"characters":"⤩"}}}}},"p":{"r":{"i":{"m":{"e":{";":{"0":{"codepoints":[8244],"characters":"‴"}}}}}}},"r":{"a":{"d":{"e":{";":{"0":{"codepoints":[8482],"characters":"™"}}}}},"i":{"a":{"n":{"g":{"l":{"e":{";":{"0":{"codepoints":[9653],"characters":"▵"}},"d":{"o":{"w":{"n":{";":{"0":{"codepoints":[9663],"characters":"▿"}}}}}},"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[9667],"characters":"◃"}},"e":{"q":{";":{"0":{"codepoints":[8884],"characters":"⊴"}}}}}}}},"q":{";":{"0":{"codepoints":[8796],"characters":"≜"}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[9657],"characters":"▹"}},"e":{"q":{";":{"0":{"codepoints":[8885],"characters":"⊵"}}}}}}}}}}}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[9708],"characters":"◬"}}}}},"e":{";":{"0":{"codepoints":[8796],"characters":"≜"}}},"m":{"i":{"n":{"u":{"s":{";":{"0":{"codepoints":[10810],"characters":"⨺"}}}}}}},"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[10809],"characters":"⨹"}}}}}},"s":{"b":{";":{"0":{"codepoints":[10701],"characters":"⧍"}}}},"t":{"i":{"m":{"e":{";":{"0":{"codepoints":[10811],"characters":"⨻"}}}}}}},"p":{"e":{"z":{"i":{"u":{"m":{";":{"0":{"codepoints":[9186],"characters":"⏢"}}}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120009],"characters":"𝓉"}}},"y":{";":{"0":{"codepoints":[1094],"characters":"ц"}}}},"h":{"c":{"y":{";":{"0":{"codepoints":[1115],"characters":"ћ"}}}}},"t":{"r":{"o":{"k":{";":{"0":{"codepoints":[359],"characters":"ŧ"}}}}}}},"w":{"i":{"x":{"t":{";":{"0":{"codepoints":[8812],"characters":"≬"}}}}},"o":{"h":{"e":{"a":{"d":{"l":{"e":{"f":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8606],"characters":"↞"}}}}}}}}}}},"r":{"i":{"g":{"h":{"t":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8608],"characters":"↠"}}}}}}}}}}}}}}}}}}},"U":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[218],"characters":"Ú"},";":{"0":{"codepoints":[218],"characters":"Ú"}}}}}},"r":{"r":{";":{"0":{"codepoints":[8607],"characters":"↟"}},"o":{"c":{"i":{"r":{";":{"0":{"codepoints":[10569],"characters":"⥉"}}}}}}}}},"b":{"r":{"c":{"y":{";":{"0":{"codepoints":[1038],"characters":"Ў"}}}},"e":{"v":{"e":{";":{"0":{"codepoints":[364],"characters":"Ŭ"}}}}}}},"c":{"i":{"r":{"c":{"0":{"codepoints":[219],"characters":"Û"},";":{"0":{"codepoints":[219],"characters":"Û"}}}}},"y":{";":{"0":{"codepoints":[1059],"characters":"У"}}}},"d":{"b":{"l":{"a":{"c":{";":{"0":{"codepoints":[368],"characters":"Ű"}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120088],"characters":"𝔘"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[217],"characters":"Ù"},";":{"0":{"codepoints":[217],"characters":"Ù"}}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[362],"characters":"Ū"}}}}}},"n":{"d":{"e":{"r":{"B":{"a":{"r":{";":{"0":{"codepoints":[95],"characters":"_"}}}},"r":{"a":{"c":{"e":{";":{"0":{"codepoints":[9183],"characters":"⏟"}}},"k":{"e":{"t":{";":{"0":{"codepoints":[9141],"characters":"⎵"}}}}}}}}},"P":{"a":{"r":{"e":{"n":{"t":{"h":{"e":{"s":{"i":{"s":{";":{"0":{"codepoints":[9181],"characters":"⏝"}}}}}}}}}}}}}}}},"i":{"o":{"n":{";":{"0":{"codepoints":[8899],"characters":"⋃"}},"P":{"l":{"u":{"s":{";":{"0":{"codepoints":[8846],"characters":"⊎"}}}}}}}}}},"o":{"g":{"o":{"n":{";":{"0":{"codepoints":[370],"characters":"Ų"}}}}},"p":{"f":{";":{"0":{"codepoints":[120140],"characters":"𝕌"}}}}},"p":{"A":{"r":{"r":{"o":{"w":{"B":{"a":{"r":{";":{"0":{"codepoints":[10514],"characters":"⤒"}}}}},";":{"0":{"codepoints":[8593],"characters":"↑"}},"D":{"o":{"w":{"n":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8645],"characters":"⇅"}}}}}}}}}}}}}}}},"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8657],"characters":"⇑"}}}}}}},"D":{"o":{"w":{"n":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8597],"characters":"↕"}}}}}}}}}}},"d":{"o":{"w":{"n":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8661],"characters":"⇕"}}}}}}}}}}},"E":{"q":{"u":{"i":{"l":{"i":{"b":{"r":{"i":{"u":{"m":{";":{"0":{"codepoints":[10606],"characters":"⥮"}}}}}}}}}}}}},"p":{"e":{"r":{"L":{"e":{"f":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8598],"characters":"↖"}}}}}}}}}}},"R":{"i":{"g":{"h":{"t":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8599],"characters":"↗"}}}}}}}}}}}}}}},"s":{"i":{";":{"0":{"codepoints":[978],"characters":"ϒ"}},"l":{"o":{"n":{";":{"0":{"codepoints":[933],"characters":"Υ"}}}}}}},"T":{"e":{"e":{"A":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8613],"characters":"↥"}}}}}}},";":{"0":{"codepoints":[8869],"characters":"⊥"}}}}}},"r":{"i":{"n":{"g":{";":{"0":{"codepoints":[366],"characters":"Ů"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119984],"characters":"𝒰"}}}}},"t":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[360],"characters":"Ũ"}}}}}}},"u":{"m":{"l":{"0":{"codepoints":[220],"characters":"Ü"},";":{"0":{"codepoints":[220],"characters":"Ü"}}}}}},"u":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[250],"characters":"ú"},";":{"0":{"codepoints":[250],"characters":"ú"}}}}}},"r":{"r":{";":{"0":{"codepoints":[8593],"characters":"↑"}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8657],"characters":"⇑"}}}}},"b":{"r":{"c":{"y":{";":{"0":{"codepoints":[1118],"characters":"ў"}}}},"e":{"v":{"e":{";":{"0":{"codepoints":[365],"characters":"ŭ"}}}}}}},"c":{"i":{"r":{"c":{"0":{"codepoints":[251],"characters":"û"},";":{"0":{"codepoints":[251],"characters":"û"}}}}},"y":{";":{"0":{"codepoints":[1091],"characters":"у"}}}},"d":{"a":{"r":{"r":{";":{"0":{"codepoints":[8645],"characters":"⇅"}}}}},"b":{"l":{"a":{"c":{";":{"0":{"codepoints":[369],"characters":"ű"}}}}}},"h":{"a":{"r":{";":{"0":{"codepoints":[10606],"characters":"⥮"}}}}}},"f":{"i":{"s":{"h":{"t":{";":{"0":{"codepoints":[10622],"characters":"⥾"}}}}}},"r":{";":{"0":{"codepoints":[120114],"characters":"𝔲"}}}},"g":{"r":{"a":{"v":{"e":{"0":{"codepoints":[249],"characters":"ù"},";":{"0":{"codepoints":[249],"characters":"ù"}}}}}}},"H":{"a":{"r":{";":{"0":{"codepoints":[10595],"characters":"⥣"}}}}},"h":{"a":{"r":{"l":{";":{"0":{"codepoints":[8639],"characters":"↿"}}},"r":{";":{"0":{"codepoints":[8638],"characters":"↾"}}}}},"b":{"l":{"k":{";":{"0":{"codepoints":[9600],"characters":"▀"}}}}}},"l":{"c":{"o":{"r":{"n":{";":{"0":{"codepoints":[8988],"characters":"⌜"}},"e":{"r":{";":{"0":{"codepoints":[8988],"characters":"⌜"}}}}}}},"r":{"o":{"p":{";":{"0":{"codepoints":[8975],"characters":"⌏"}}}}}},"t":{"r":{"i":{";":{"0":{"codepoints":[9720],"characters":"◸"}}}}}},"m":{"a":{"c":{"r":{";":{"0":{"codepoints":[363],"characters":"ū"}}}}},"l":{"0":{"codepoints":[168],"characters":"¨"},";":{"0":{"codepoints":[168],"characters":"¨"}}}},"o":{"g":{"o":{"n":{";":{"0":{"codepoints":[371],"characters":"ų"}}}}},"p":{"f":{";":{"0":{"codepoints":[120166],"characters":"𝕦"}}}}},"p":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8593],"characters":"↑"}}}}}}},"d":{"o":{"w":{"n":{"a":{"r":{"r":{"o":{"w":{";":{"0":{"codepoints":[8597],"characters":"↕"}}}}}}}}}}},"h":{"a":{"r":{"p":{"o":{"o":{"n":{"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8639],"characters":"↿"}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[8638],"characters":"↾"}}}}}}}}}}}}}},"l":{"u":{"s":{";":{"0":{"codepoints":[8846],"characters":"⊎"}}}}},"s":{"i":{";":{"0":{"codepoints":[965],"characters":"υ"}},"h":{";":{"0":{"codepoints":[978],"characters":"ϒ"}}},"l":{"o":{"n":{";":{"0":{"codepoints":[965],"characters":"υ"}}}}}}},"u":{"p":{"a":{"r":{"r":{"o":{"w":{"s":{";":{"0":{"codepoints":[8648],"characters":"⇈"}}}}}}}}}}},"r":{"c":{"o":{"r":{"n":{";":{"0":{"codepoints":[8989],"characters":"⌝"}},"e":{"r":{";":{"0":{"codepoints":[8989],"characters":"⌝"}}}}}}},"r":{"o":{"p":{";":{"0":{"codepoints":[8974],"characters":"⌎"}}}}}},"i":{"n":{"g":{";":{"0":{"codepoints":[367],"characters":"ů"}}}}},"t":{"r":{"i":{";":{"0":{"codepoints":[9721],"characters":"◹"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120010],"characters":"𝓊"}}}}},"t":{"d":{"o":{"t":{";":{"0":{"codepoints":[8944],"characters":"⋰"}}}}},"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[361],"characters":"ũ"}}}}}},"r":{"i":{";":{"0":{"codepoints":[9653],"characters":"▵"}},"f":{";":{"0":{"codepoints":[9652],"characters":"▴"}}}}}},"u":{"a":{"r":{"r":{";":{"0":{"codepoints":[8648],"characters":"⇈"}}}}},"m":{"l":{"0":{"codepoints":[252],"characters":"ü"},";":{"0":{"codepoints":[252],"characters":"ü"}}}}},"w":{"a":{"n":{"g":{"l":{"e":{";":{"0":{"codepoints":[10663],"characters":"⦧"}}}}}}}}},"v":{"a":{"n":{"g":{"r":{"t":{";":{"0":{"codepoints":[10652],"characters":"⦜"}}}}}},"r":{"e":{"p":{"s":{"i":{"l":{"o":{"n":{";":{"0":{"codepoints":[1013],"characters":"ϵ"}}}}}}}}},"k":{"a":{"p":{"p":{"a":{";":{"0":{"codepoints":[1008],"characters":"ϰ"}}}}}}},"n":{"o":{"t":{"h":{"i":{"n":{"g":{";":{"0":{"codepoints":[8709],"characters":"∅"}}}}}}}}},"p":{"h":{"i":{";":{"0":{"codepoints":[981],"characters":"ϕ"}}}},"i":{";":{"0":{"codepoints":[982],"characters":"ϖ"}}},"r":{"o":{"p":{"t":{"o":{";":{"0":{"codepoints":[8733],"characters":"∝"}}}}}}}},"r":{";":{"0":{"codepoints":[8597],"characters":"↕"}},"h":{"o":{";":{"0":{"codepoints":[1009],"characters":"ϱ"}}}}},"s":{"i":{"g":{"m":{"a":{";":{"0":{"codepoints":[962],"characters":"ς"}}}}}},"u":{"b":{"s":{"e":{"t":{"n":{"e":{"q":{";":{"0":{"codepoints":[8842,65024],"characters":"⊊︀"}},"q":{";":{"0":{"codepoints":[10955,65024],"characters":"⫋︀"}}}}}}}}}},"p":{"s":{"e":{"t":{"n":{"e":{"q":{";":{"0":{"codepoints":[8843,65024],"characters":"⊋︀"}},"q":{";":{"0":{"codepoints":[10956,65024],"characters":"⫌︀"}}}}}}}}}}}},"t":{"h":{"e":{"t":{"a":{";":{"0":{"codepoints":[977],"characters":"ϑ"}}}}}},"r":{"i":{"a":{"n":{"g":{"l":{"e":{"l":{"e":{"f":{"t":{";":{"0":{"codepoints":[8882],"characters":"⊲"}}}}}},"r":{"i":{"g":{"h":{"t":{";":{"0":{"codepoints":[8883],"characters":"⊳"}}}}}}}}}}}}}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[8661],"characters":"⇕"}}}}},"B":{"a":{"r":{";":{"0":{"codepoints":[10984],"characters":"⫨"}},"v":{";":{"0":{"codepoints":[10985],"characters":"⫩"}}}}}},"c":{"y":{";":{"0":{"codepoints":[1074],"characters":"в"}}}},"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8866],"characters":"⊢"}}}}}},"D":{"a":{"s":{"h":{";":{"0":{"codepoints":[8872],"characters":"⊨"}}}}}},"e":{"e":{"b":{"a":{"r":{";":{"0":{"codepoints":[8891],"characters":"⊻"}}}}},";":{"0":{"codepoints":[8744],"characters":"∨"}},"e":{"q":{";":{"0":{"codepoints":[8794],"characters":"≚"}}}}},"l":{"l":{"i":{"p":{";":{"0":{"codepoints":[8942],"characters":"⋮"}}}}}},"r":{"b":{"a":{"r":{";":{"0":{"codepoints":[124],"characters":"|"}}}}},"t":{";":{"0":{"codepoints":[124],"characters":"|"}}}}},"f":{"r":{";":{"0":{"codepoints":[120115],"characters":"𝔳"}}}},"l":{"t":{"r":{"i":{";":{"0":{"codepoints":[8882],"characters":"⊲"}}}}}},"n":{"s":{"u":{"b":{";":{"0":{"codepoints":[8834,8402],"characters":"⊂⃒"}}},"p":{";":{"0":{"codepoints":[8835,8402],"characters":"⊃⃒"}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120167],"characters":"𝕧"}}}}},"p":{"r":{"o":{"p":{";":{"0":{"codepoints":[8733],"characters":"∝"}}}}}},"r":{"t":{"r":{"i":{";":{"0":{"codepoints":[8883],"characters":"⊳"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120011],"characters":"𝓋"}}}},"u":{"b":{"n":{"E":{";":{"0":{"codepoints":[10955,65024],"characters":"⫋︀"}}},"e":{";":{"0":{"codepoints":[8842,65024],"characters":"⊊︀"}}}}},"p":{"n":{"E":{";":{"0":{"codepoints":[10956,65024],"characters":"⫌︀"}}},"e":{";":{"0":{"codepoints":[8843,65024],"characters":"⊋︀"}}}}}}},"z":{"i":{"g":{"z":{"a":{"g":{";":{"0":{"codepoints":[10650],"characters":"⦚"}}}}}}}}},"V":{"b":{"a":{"r":{";":{"0":{"codepoints":[10987],"characters":"⫫"}}}}},"c":{"y":{";":{"0":{"codepoints":[1042],"characters":"В"}}}},"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8873],"characters":"⊩"}},"l":{";":{"0":{"codepoints":[10982],"characters":"⫦"}}}}}}},"D":{"a":{"s":{"h":{";":{"0":{"codepoints":[8875],"characters":"⊫"}}}}}},"e":{"e":{";":{"0":{"codepoints":[8897],"characters":"⋁"}}},"r":{"b":{"a":{"r":{";":{"0":{"codepoints":[8214],"characters":"‖"}}}}},"t":{";":{"0":{"codepoints":[8214],"characters":"‖"}},"i":{"c":{"a":{"l":{"B":{"a":{"r":{";":{"0":{"codepoints":[8739],"characters":"∣"}}}}},"L":{"i":{"n":{"e":{";":{"0":{"codepoints":[124],"characters":"|"}}}}}},"S":{"e":{"p":{"a":{"r":{"a":{"t":{"o":{"r":{";":{"0":{"codepoints":[10072],"characters":"❘"}}}}}}}}}}},"T":{"i":{"l":{"d":{"e":{";":{"0":{"codepoints":[8768],"characters":"≀"}}}}}}}}}}}},"y":{"T":{"h":{"i":{"n":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8202],"characters":" "}}}}}}}}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120089],"characters":"𝔙"}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120141],"characters":"𝕍"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119985],"characters":"𝒱"}}}}},"v":{"d":{"a":{"s":{"h":{";":{"0":{"codepoints":[8874],"characters":"⊪"}}}}}}}},"W":{"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[372],"characters":"Ŵ"}}}}}},"e":{"d":{"g":{"e":{";":{"0":{"codepoints":[8896],"characters":"⋀"}}}}}},"f":{"r":{";":{"0":{"codepoints":[120090],"characters":"𝔚"}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120142],"characters":"𝕎"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119986],"characters":"𝒲"}}}}}},"w":{"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[373],"characters":"ŵ"}}}}}},"e":{"d":{"b":{"a":{"r":{";":{"0":{"codepoints":[10847],"characters":"⩟"}}}}},"g":{"e":{";":{"0":{"codepoints":[8743],"characters":"∧"}},"q":{";":{"0":{"codepoints":[8793],"characters":"≙"}}}}}},"i":{"e":{"r":{"p":{";":{"0":{"codepoints":[8472],"characters":"℘"}}}}}}},"f":{"r":{";":{"0":{"codepoints":[120116],"characters":"𝔴"}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120168],"characters":"𝕨"}}}}},"p":{";":{"0":{"codepoints":[8472],"characters":"℘"}}},"r":{";":{"0":{"codepoints":[8768],"characters":"≀"}},"e":{"a":{"t":{"h":{";":{"0":{"codepoints":[8768],"characters":"≀"}}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120012],"characters":"𝓌"}}}}}},"x":{"c":{"a":{"p":{";":{"0":{"codepoints":[8898],"characters":"⋂"}}}},"i":{"r":{"c":{";":{"0":{"codepoints":[9711],"characters":"◯"}}}}},"u":{"p":{";":{"0":{"codepoints":[8899],"characters":"⋃"}}}}},"d":{"t":{"r":{"i":{";":{"0":{"codepoints":[9661],"characters":"▽"}}}}}},"f":{"r":{";":{"0":{"codepoints":[120117],"characters":"𝔵"}}}},"h":{"a":{"r":{"r":{";":{"0":{"codepoints":[10231],"characters":"⟷"}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[10234],"characters":"⟺"}}}}}},"i":{";":{"0":{"codepoints":[958],"characters":"ξ"}}},"l":{"a":{"r":{"r":{";":{"0":{"codepoints":[10229],"characters":"⟵"}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[10232],"characters":"⟸"}}}}}},"m":{"a":{"p":{";":{"0":{"codepoints":[10236],"characters":"⟼"}}}}},"n":{"i":{"s":{";":{"0":{"codepoints":[8955],"characters":"⋻"}}}}},"o":{"d":{"o":{"t":{";":{"0":{"codepoints":[10752],"characters":"⨀"}}}}},"p":{"f":{";":{"0":{"codepoints":[120169],"characters":"𝕩"}}},"l":{"u":{"s":{";":{"0":{"codepoints":[10753],"characters":"⨁"}}}}}},"t":{"i":{"m":{"e":{";":{"0":{"codepoints":[10754],"characters":"⨂"}}}}}}},"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[10230],"characters":"⟶"}}}}},"A":{"r":{"r":{";":{"0":{"codepoints":[10233],"characters":"⟹"}}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120013],"characters":"𝓍"}}}},"q":{"c":{"u":{"p":{";":{"0":{"codepoints":[10758],"characters":"⨆"}}}}}}},"u":{"p":{"l":{"u":{"s":{";":{"0":{"codepoints":[10756],"characters":"⨄"}}}}}},"t":{"r":{"i":{";":{"0":{"codepoints":[9651],"characters":"△"}}}}}},"v":{"e":{"e":{";":{"0":{"codepoints":[8897],"characters":"⋁"}}}}},"w":{"e":{"d":{"g":{"e":{";":{"0":{"codepoints":[8896],"characters":"⋀"}}}}}}}},"X":{"f":{"r":{";":{"0":{"codepoints":[120091],"characters":"𝔛"}}}},"i":{";":{"0":{"codepoints":[926],"characters":"Ξ"}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120143],"characters":"𝕏"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119987],"characters":"𝒳"}}}}}},"Y":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[221],"characters":"Ý"},";":{"0":{"codepoints":[221],"characters":"Ý"}}}}}}},"A":{"c":{"y":{";":{"0":{"codepoints":[1071],"characters":"Я"}}}}},"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[374],"characters":"Ŷ"}}}}},"y":{";":{"0":{"codepoints":[1067],"characters":"Ы"}}}},"f":{"r":{";":{"0":{"codepoints":[120092],"characters":"𝔜"}}}},"I":{"c":{"y":{";":{"0":{"codepoints":[1031],"characters":"Ї"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120144],"characters":"𝕐"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119988],"characters":"𝒴"}}}}},"U":{"c":{"y":{";":{"0":{"codepoints":[1070],"characters":"Ю"}}}}},"u":{"m":{"l":{";":{"0":{"codepoints":[376],"characters":"Ÿ"}}}}}},"y":{"a":{"c":{"u":{"t":{"e":{"0":{"codepoints":[253],"characters":"ý"},";":{"0":{"codepoints":[253],"characters":"ý"}}}}},"y":{";":{"0":{"codepoints":[1103],"characters":"я"}}}}},"c":{"i":{"r":{"c":{";":{"0":{"codepoints":[375],"characters":"ŷ"}}}}},"y":{";":{"0":{"codepoints":[1099],"characters":"ы"}}}},"e":{"n":{"0":{"codepoints":[165],"characters":"¥"},";":{"0":{"codepoints":[165],"characters":"¥"}}}},"f":{"r":{";":{"0":{"codepoints":[120118],"characters":"𝔶"}}}},"i":{"c":{"y":{";":{"0":{"codepoints":[1111],"characters":"ї"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120170],"characters":"𝕪"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120014],"characters":"𝓎"}}}}},"u":{"c":{"y":{";":{"0":{"codepoints":[1102],"characters":"ю"}}}},"m":{"l":{"0":{"codepoints":[255],"characters":"ÿ"},";":{"0":{"codepoints":[255],"characters":"ÿ"}}}}}},"Z":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[377],"characters":"Ź"}}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[381],"characters":"Ž"}}}}}},"y":{";":{"0":{"codepoints":[1047],"characters":"З"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[379],"characters":"Ż"}}}}},"e":{"r":{"o":{"W":{"i":{"d":{"t":{"h":{"S":{"p":{"a":{"c":{"e":{";":{"0":{"codepoints":[8203],"characters":"​"}}}}}}}}}}}}}},"t":{"a":{";":{"0":{"codepoints":[918],"characters":"Ζ"}}}}},"f":{"r":{";":{"0":{"codepoints":[8488],"characters":"ℨ"}}}},"H":{"c":{"y":{";":{"0":{"codepoints":[1046],"characters":"Ж"}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[8484],"characters":"ℤ"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[119989],"characters":"𝒵"}}}}}},"z":{"a":{"c":{"u":{"t":{"e":{";":{"0":{"codepoints":[378],"characters":"ź"}}}}}}},"c":{"a":{"r":{"o":{"n":{";":{"0":{"codepoints":[382],"characters":"ž"}}}}}},"y":{";":{"0":{"codepoints":[1079],"characters":"з"}}}},"d":{"o":{"t":{";":{"0":{"codepoints":[380],"characters":"ż"}}}}},"e":{"e":{"t":{"r":{"f":{";":{"0":{"codepoints":[8488],"characters":"ℨ"}}}}}},"t":{"a":{";":{"0":{"codepoints":[950],"characters":"ζ"}}}}},"f":{"r":{";":{"0":{"codepoints":[120119],"characters":"𝔷"}}}},"h":{"c":{"y":{";":{"0":{"codepoints":[1078],"characters":"ж"}}}}},"i":{"g":{"r":{"a":{"r":{"r":{";":{"0":{"codepoints":[8669],"characters":"⇝"}}}}}}}},"o":{"p":{"f":{";":{"0":{"codepoints":[120171],"characters":"𝕫"}}}}},"s":{"c":{"r":{";":{"0":{"codepoints":[120015],"characters":"𝓏"}}}}},"w":{"j":{";":{"0":{"codepoints":[8205],"characters":"‍"}}},"n":{"j":{";":{"0":{"codepoints":[8204],"characters":"‌"}}}}}}};
module.exports = HTMLNamedCharReferenceTrie;
})();

},{}],42:[function(require,module,exports){
/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com, neraliu@gmail.com>
*/
/*jshint -W030 */
(function () {
"use strict";

var fs = require('fs');
require('./polyfills/polyfill.js');

/////////////////////////////////////////////////////
//
// @module HTMLDecoder
// 
/////////////////////////////////////////////////////
function HTMLDecoder(config) {
    config || (config = {});
    var load = config.load === undefined? true: config.load;

    load? this.namedCharReferenceTrie = require('./gen/trie.js') : this.namedCharReferenceTrie = {};
}

/////////////////////////////////////////////////////
//
// PUBLIC API
// 
/////////////////////////////////////////////////////

/**
* @function HTMLDecoder#encode
*
* @description
* HTML encode the character
*
* TODO: it is blindly encoding, need to enhance it later.
*/
HTMLDecoder.prototype.encode = function(str) {
    var l = str.length,
        c1, c2, r = '';

    for(var i=0;i<l;++i) {
        c1 = str.charCodeAt(i);
        // 55296-57343
        if (c1>=0xD800 && c1<=0xDFFF) {
            c2 = str.codePointAt(i);
            if (c1 !== c2) {
                i++; // consume one more char if c1 !== c2 and i+1<l
                c1 = c2;
            }
        }
        r += "&#"+c1+";";
    }
    return r;
};

/**
* @function HTMLDecoder#decode
*
* @description
* HTML decode the character
*
* Reference:
* https://html.spec.whatwg.org/multipage/syntax.html#tokenizing-character-references
*/
HTMLDecoder.prototype.reCharReferenceDecode = /&([a-z]{2,31}\d{0,2};?)|&#0*(x[a-f0-9]+|[0-9]+);?/ig;
HTMLDecoder.prototype.decode = function(str) {
    var self = this, num, r;
    return str.replace(this.reCharReferenceDecode, function(m, named, number) {
        if (named) {
            r = self._findString(named);
            return r? r.characters + (r.unconsumed ? r.unconsumed:'') : m;
        } else {
            num = parseInt(number[0] <= '9' ? number : '0' + number); // parseInt('0xA0') is equiv to parseInt('A0', 16)
            return num === 0x00 ? '\uFFFD' // REPLACEMENT CHARACTER    
                       : num === 0x80 ? '\u20AC'  // EURO SIGN (€)
                       : num === 0x82 ? '\u201A'  // SINGLE LOW-9 QUOTATION MARK (‚)
                       : num === 0x83 ? '\u0192'  // LATIN SMALL LETTER F WITH HOOK (ƒ)
                       : num === 0x84 ? '\u201E'  // DOUBLE LOW-9 QUOTATION MARK („)
                       : num === 0x85 ? '\u2026'  // HORIZONTAL ELLIPSIS (…)
                       : num === 0x86 ? '\u2020'  // DAGGER (†)
                       : num === 0x87 ? '\u2021'  // DOUBLE DAGGER (‡)
                       : num === 0x88 ? '\u02C6'  // MODIFIER LETTER CIRCUMFLEX ACCENT (ˆ)
                       : num === 0x89 ? '\u2030'  // PER MILLE SIGN (‰)
                       : num === 0x8A ? '\u0160'  // LATIN CAPITAL LETTER S WITH CARON (Š)
                       : num === 0x8B ? '\u2039'  // SINGLE LEFT-POINTING ANGLE QUOTATION MARK (‹)
                       : num === 0x8C ? '\u0152'  // LATIN CAPITAL LIGATURE OE (Œ)
                       : num === 0x8E ? '\u017D'  // LATIN CAPITAL LETTER Z WITH CARON (Ž)
                       : num === 0x91 ? '\u2018'  // LEFT SINGLE QUOTATION MARK (‘)
                       : num === 0x92 ? '\u2019'  // RIGHT SINGLE QUOTATION MARK (’)
                       : num === 0x93 ? '\u201C'  // LEFT DOUBLE QUOTATION MARK (“)
                       : num === 0x94 ? '\u201D'  // RIGHT DOUBLE QUOTATION MARK (”)
                       : num === 0x95 ? '\u2022'  // BULLET (•)
                       : num === 0x96 ? '\u2013'  // EN DASH (–)
                       : num === 0x97 ? '\u2014'  // EM DASH (—)
                       : num === 0x98 ? '\u02DC'  // SMALL TILDE (˜)
                       : num === 0x99 ? '\u2122'  // TRADE MARK SIGN (™)
                       : num === 0x9A ? '\u0161'  // LATIN SMALL LETTER S WITH CARON (š)
                       : num === 0x9B ? '\u203A'  // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
                       : num === 0x9C ? '\u0153'  // LATIN SMALL LIGATURE OE (œ)
                       : num === 0x9E ? '\u017E'  // LATIN SMALL LETTER Z WITH CARON (ž)
                       : num === 0x9F ? '\u0178'  // LATIN CAPITAL LETTER Y WITH DIAERESIS (Ÿ)
                       : self.frCoPt(num);
        }
    });
};

/**
* @function HTMLEntites#frCoPt
*
* @description
* Convert the code point to character except those numeric range will trigger the parse error in HTML decoding.
* https://html.spec.whatwg.org/multipage/syntax.html#tokenizing-character-references  
*/
HTMLDecoder.prototype.frCoPt = function(num) {
    return !isFinite(num) ||                  // `NaN`, `+Infinity`, or `-Infinity`
        num <= 0x00 ||                        // NULL or not a valid Unicode code point
        num > 0x10FFFF ||                     // not a valid Unicode code point
        (num >= 0xD800 && num <= 0xDFFF) || 
        (num >= 0x01 && num <= 0x08) ||
        (num >= 0x0D && num <= 0x1F) ||
        (num >= 0x7F && num <= 0x9F) ||       // NOTE: the spec may be wrong as 0x9F returns U+0178
        (num >= 0xFDD0 && num <= 0xFDEF) ||

        num === 0x0B ||
        (num & 0xFFFF) === 0xFFFF ||
        (num & 0xFFFF) === 0xFFFE ? '\uFFFD' : String.fromCodePoint(num);
};

/////////////////////////////////////////////////////
//
// TRIE GENERATION API
// 
/////////////////////////////////////////////////////

/**
* @function HTMLEntites#buildNamedCharReferenceTrie
*
* @description
*/
HTMLDecoder.prototype.buildNamedCharReferenceTrie = function(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var info = obj[key];
            this._addStringToTrie(this.namedCharReferenceTrie, key, info);
        }
    }
    return obj;
};

/**
* @function HTMLDecoder#saveNamedCharReferenceTrie
*
* @description
* Save the trie in json format.
*/
HTMLDecoder.prototype.saveNamedCharReferenceTrie = function(file) {
    /* NOTE: JSON.stringify convert undefined to null */
    var json = JSON.stringify(this.namedCharReferenceTrie);
    var str = '(function() {\n"use strict";\n';
    str += 'var HTMLNamedCharReferenceTrie = '+json+';\n';
    str += 'module.exports = HTMLNamedCharReferenceTrie;\n})();\n';
    fs.writeFileSync(file, str);
};

/////////////////////////////////////////////////////
//
// INTERAL API
// 
/////////////////////////////////////////////////////

/**
* @function HTMLDecoder#_findString
*
* @description
* Find whether the string is defined in the trie.
*/
HTMLDecoder.prototype._findString = function(str) {
    return this._findStringFromRoot(this.namedCharReferenceTrie, str, 0);
};

/**
* @function HTMLDecoder#_findStringFromRoot
*
* @description
*/
HTMLDecoder.prototype._findStringFromRoot = function(trie, str, pos) {
    /* init the trace */
    pos === 0? this.matchTrace = [] : '';

    /* skip the '&' for performance */
    if (str[pos] === '&') pos++;

    var index = str[pos], l, r;

    if (trie[index] === null || trie[index] === undefined) { // end of trie
        if (this.matchTrace.length > 0) { // return the last longest matched pattern, else return undefined
            r = {
                characters: this.matchTrace[this.matchTrace.length-1].info.characters,
                unconsumed: this.matchTrace[this.matchTrace.length-1].unconsumed
            };
        }
        return r;
    } else if (pos+1 === str.length) { // end of string
        if (trie[index][0] !== null && trie[index][0] !== undefined) {
            r = trie[index][0];
        } else if (this.matchTrace.length > 0) { // return the last longest matched pattern, else return undefined
            r = {
                characters: this.matchTrace[this.matchTrace.length-1].info.characters,
                unconsumed: this.matchTrace[this.matchTrace.length-1].unconsumed
            };
        }
        return r;
    } else {
        if (trie[index][0] !== null && trie[index][0] !== undefined) {
            this.matchTrace.push({ unconsumed: str.substr(pos+1), info: trie[index][0] } );
        }
        return this._findStringFromRoot(trie[index], str, pos+1);
    }
};

/**
* @function HTMLDecoder#_addStringToTrie
*
* @description
*/
HTMLDecoder.prototype._addStringToTrie = function(trie, str, info) {
    var l = str.length;
    var rootTrie = trie;

    for(var i=0;i<l;++i) {
        /* skip the '&' */
        if (str[i] === '&') continue;
     
        var isLastElement = i===l-1? true: false;
        var childTrie = this._addCharToTrie(rootTrie, str[i], info, isLastElement);
        rootTrie = childTrie;
    }
};

/**
* @function HTMLDecoder#_addCharToTrie
*
* @description
*/
HTMLDecoder.prototype._addCharToTrie = function(trie, c, info, isLastElement) {
    var index = c;
    if (trie[index] === null || trie[index] === undefined) {
        trie[index] = {};
    }
    if (isLastElement)
        trie[index][0] = info;
    return trie[index];
};

/* exposing it */
module.exports = HTMLDecoder;

})();

},{"./gen/trie.js":41,"./polyfills/polyfill.js":43,"fs":3}],43:[function(require,module,exports){
/*! http://mths.be/codepointat v0.1.0 by @mathias */
if (!String.prototype.codePointAt) {
  (function() {
    'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
    var codePointAt = function(position) {
      /*jshint eqnull:true */
      if (this == null) {
        throw new TypeError();
      }
      var string = String(this);
      var size = string.length;
      // `ToInteger`
      var index = position ? Number(position) : 0;
      if (index != index) { // better `isNaN`
        index = 0;
      }
      // Account for out-of-bounds indices:
      if (index < 0 || index >= size) {
        return undefined;
      }
      // Get the first code unit
      var first = string.charCodeAt(index);
      var second;
      if ( // check if it’s the start of a surrogate pair
        first >= 0xD800 && first <= 0xDBFF && // high surrogate
        size > index + 1 // there is a next code unit
      ) {
        second = string.charCodeAt(index + 1);
        if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
          // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
        }
      }
      return first;
    };
    if (Object.defineProperty) {
      Object.defineProperty(String.prototype, 'codePointAt', {
        'value': codePointAt,
        'configurable': true,
        'writable': true
      });
    } else {
      String.prototype.codePointAt = codePointAt;
    }
  }());
}

/*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
if (!String.fromCodePoint) {
  (function() {
    var defineProperty = (function() {
      // IE 8 only supports `Object.defineProperty` on DOM elements
      try {
        var object = {};
        var $defineProperty = Object.defineProperty;
        var result = $defineProperty(object, object, object) && $defineProperty;
        return result;
      } catch(error) { return false; }
    }());
    var stringFromCharCode = String.fromCharCode;
    var floor = Math.floor;
    var fromCodePoint = function() {
      var MAX_SIZE = 0x4000;
      var codeUnits = [];
      var highSurrogate;
      var lowSurrogate;
      var index = -1;
      var length = arguments.length;
      if (!length) {
        return '';
      }
      var result = '';
      while (++index < length) {
        var codePoint = Number(arguments[index]);
        if (
          !isFinite(codePoint) ||       // `NaN`, `+Infinity`, or `-Infinity`
          codePoint < 0 ||              // not a valid Unicode code point
          codePoint > 0x10FFFF ||       // not a valid Unicode code point
          floor(codePoint) != codePoint // not an integer
        ) {
          throw RangeError('Invalid code point: ' + codePoint);
        }
        if (codePoint <= 0xFFFF) { // BMP code point
          codeUnits.push(codePoint);
        } else { // Astral code point; split in surrogate halves
          // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          codePoint -= 0x10000;
          highSurrogate = (codePoint >> 10) + 0xD800;
          lowSurrogate = (codePoint % 0x400) + 0xDC00;
          codeUnits.push(highSurrogate, lowSurrogate);
        }
        if (index + 1 == length || codeUnits.length > MAX_SIZE) {
          result += stringFromCharCode.apply(null, codeUnits);
          codeUnits.length = 0;
        }
      }
      return result;
    };
    if (defineProperty) {
      defineProperty(String, 'fromCodePoint', {
        'value': fromCodePoint,
        'configurable': true,
        'writable': true
      });
    } else {
      String.fromCodePoint = fromCodePoint;
    }
  }());
}

},{}],44:[function(require,module,exports){
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

/* import the required package */
var ContextParser = require('context-parser'),
    Parser = ContextParser.Parser;

/////////////////////////////////////////////////////
//
// @module Parser 
// 
/////////////////////////////////////////////////////

// Reference: http://www.w3.org/TR/html-markup/elements.html
Parser.ATTRTYPE_URI = 1,
Parser.ATTRTYPE_CSS = 2,
Parser.ATTRTYPE_SCRIPTABLE = 3,
Parser.ATTRTYPE_MIME = 4,
Parser.ATTRTYPE_GENERAL = undefined;

Parser.attributeNamesType = {
    // we generally do not differentiate whether these attribtues are tag specific during matching for simplicity
    'href'       :Parser.ATTRTYPE_URI,     // for a, link, img, area, iframe, frame, video, object, embed ...
    'src'        :Parser.ATTRTYPE_URI,
    'background' :Parser.ATTRTYPE_URI,     // for body, table, tbody, tr, td, th, etc? (obsolete)
    'action'     :Parser.ATTRTYPE_URI,     // for form, input, button
    'formaction' :Parser.ATTRTYPE_URI,     
    'cite'       :Parser.ATTRTYPE_URI,     // for blockquote, del, ins, q
    'poster'     :Parser.ATTRTYPE_URI,     // for img, object, video, source
    'usemap'     :Parser.ATTRTYPE_URI,     // for image
    'longdesc'   :Parser.ATTRTYPE_URI,                         
    'folder'     :Parser.ATTRTYPE_URI,     // for a
    'manifest'   :Parser.ATTRTYPE_URI,     // for html
    'classid'    :Parser.ATTRTYPE_URI,     // for object
    'codebase'   :Parser.ATTRTYPE_URI,     // for object, applet
    'icon'       :Parser.ATTRTYPE_URI,     // for command
    'profile'    :Parser.ATTRTYPE_URI,     // for head
    /* TODO: we allow content before we implement the stack in CP for tracking attributeName
    'content'    :Parser.ATTRTYPE_URI,     // for meta http-equiv=refresh
    */

    // http://www.w3.org/TR/xmlbase/#syntax
    'xmlns'      :Parser.ATTRTYPE_URI,     // for svg, etc?
    'xml:base'   :Parser.ATTRTYPE_URI, 
    'xmlns:xlink':Parser.ATTRTYPE_URI,
    'xlink:href' :Parser.ATTRTYPE_URI,     // for xml-related

    // srcdoc is the STRING type, not URI
    'srcdoc'     :Parser.ATTRTYPE_URI,     // for iframe

    'style'      :Parser.ATTRTYPE_CSS,     // for global attributes list

    // pattern matching, handling it within the function getAttributeNameType
    // 'on*'     :Parser.ATTRTYPE_SCRIPTABLE,

    'type'       :Parser.ATTRTYPE_MIME,    // TODO: any potential attack of the MIME type?

    'data'       :{'object'  :Parser.ATTRTYPE_URI},
    'rel'        :{'link'    :Parser.ATTRTYPE_URI},
    'value'      :{'param'   :Parser.ATTRTYPE_URI},
};

/**
 * @function Parser#getAttributeNameType
 *
 * @returns {integer} the attribute type defined for different handling
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
Parser.prototype.getAttributeNameType = function() {
    // Assume CP has **lowercased** the attributeName
    var attrName = this.getAttributeName();

    // TODO: support compound uri context at <meta http-equiv="refresh" content="seconds; url">, <img srcset="url 1.5x, url 2x">

    // Note: o{{placeholder}}n* can bypass the check. Anyway, we are good to throw error in atttribute name state. 
    if (attrName[0] === 'o' && attrName[1] === 'n') { 
        return Parser.ATTRTYPE_SCRIPTABLE;
    }

    // return Parser.ATTRTYPE_GENERAL (i.e. undefined) for case without special handling
    // here,  attrTags === [integer] is a tag agnostic matching
    // while, attrTags[tags] === [integer] matches only those attribute of the given tagName
    var attrTags = Parser.attributeNamesType[attrName];
    return typeof attrTags === 'object'? attrTags[this.getStartTagName()] : attrTags;
};

/**
 * @function Parser#cloneStates
 *
 * @params {parser} the Context Parser for copying states.
 *
 * @description
 * Copy the required states for state comparison in the conditional branching templates.
 *
 */
Parser.prototype.cloneStates = function(parser) {
    this.state = parser.getLastState();
    this.attrName = parser.getAttributeName();
    this.attributeValue = parser.getAttributeValue();
};


/**
 * @function ContextParser#getParser
 *
 * @description
 * expose a factory that carries default settings
 *
 */
ContextParser.getParser = function () {
    return new ContextParser.Parser({
        enableInputPreProcessing: true,
        enableCanonicalization: true,
        enableVoidingIEConditionalComments: true,
        enableStateTracking: true
    });
};

module.exports = ContextParser;

})();

},{"context-parser":1}],45:[function(require,module,exports){
/*! http://mths.be/codepointat v0.1.0 by @mathias */
if (!String.prototype.codePointAt) {
  (function() {
    'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
    var codePointAt = function(position) {
      if (this === null || this === undefined) {
        throw new TypeError();
      }
      var string = String(this);
      var size = string.length;
      // `ToInteger`
      var index = position ? Number(position) : 0;
      if (index != index) { // better `isNaN`
        index = 0;
      }
      // Account for out-of-bounds indices:
      if (index < 0 || index >= size) {
        return undefined;
      }
      // Get the first code unit
      var first = string.charCodeAt(index);
      var second;
      if ( // check if it’s the start of a surrogate pair
        first >= 0xD800 && first <= 0xDBFF && // high surrogate
        size > index + 1 // there is a next code unit
      ) {
        second = string.charCodeAt(index + 1);
        if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
          // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
        }
      }
      return first;
    };
    if (Object.defineProperty) {
      Object.defineProperty(String.prototype, 'codePointAt', {
        'value': codePointAt,
        'configurable': true,
        'writable': true
      });
    } else {
      String.prototype.codePointAt = codePointAt;
    }
  }());
}

/*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
if (!String.fromCodePoint) {
  (function() {
    var defineProperty = (function() {
      // IE 8 only supports `Object.defineProperty` on DOM elements
      try {
        var object = {};
        var $defineProperty = Object.defineProperty;
        var result = $defineProperty(object, object, object) && $defineProperty;
        return result;
      } catch(error) { return false; }
    }());
    var stringFromCharCode = String.fromCharCode;
    var floor = Math.floor;
    var fromCodePoint = function() {
      var MAX_SIZE = 0x4000;
      var codeUnits = [];
      var highSurrogate;
      var lowSurrogate;
      var index = -1;
      var length = arguments.length;
      if (!length) {
        return '';
      }
      var result = '';
      while (++index < length) {
        var codePoint = Number(arguments[index]);
        if (
          !isFinite(codePoint) ||       // `NaN`, `+Infinity`, or `-Infinity`
          codePoint < 0 ||              // not a valid Unicode code point
          codePoint > 0x10FFFF ||       // not a valid Unicode code point
          floor(codePoint) != codePoint // not an integer
        ) {
          throw RangeError('Invalid code point: ' + codePoint);
        }
        if (codePoint <= 0xFFFF) { // BMP code point
          codeUnits.push(codePoint);
        } else { // Astral code point; split in surrogate halves
          // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          codePoint -= 0x10000;
          highSurrogate = (codePoint >> 10) + 0xD800;
          lowSurrogate = (codePoint % 0x400) + 0xDC00;
          codeUnits.push(highSurrogate, lowSurrogate);
        }
        if (index + 1 == length || codeUnits.length > MAX_SIZE) {
          result += stringFromCharCode.apply(null, codeUnits);
          codeUnits.length = 0;
        }
      }
      return result;
    };
    if (defineProperty) {
      defineProperty(String, 'fromCodePoint', {
        'value': fromCodePoint,
        'configurable': true,
        'writable': true
      });
    } else {
      String.fromCodePoint = fromCodePoint;
    }
  }());
}
},{}],46:[function(require,module,exports){
/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
var Handlebars = require('handlebars'),
    ContextParserHandlebars = require("./context-parser-handlebars"),
    xssFilters = require('xss-filters'),
    handlebarsUtils = require('./handlebars-utils.js');

var hbsCreate = Handlebars.create,
    privateFilters = ['yd', 'yc', 'yavd', 'yavs', 'yavu', 'yu', 'yuc', 'yubl', 'yufull', 'yceu', 'yced', 'yces', 'yceuu', 'yceud', 'yceus'],
    baseContexts = ['HTMLData', 'HTMLComment', 'SingleQuotedAttr', 'DoubleQuotedAttr', 'UnQuotedAttr'],
    contextPrefixes = ['in', 'uriIn', 'uriPathIn', 'uriQueryIn', 'uriComponentIn', 'uriFragmentIn'];

function preprocess(template, strictMode) {
    try {
        if (template) {
            var parser = new ContextParserHandlebars({printCharEnable: false, strictMode: strictMode});
            return parser.analyzeContext(template);
        }
    } catch (err) {
        handlebarsUtils.warn('[WARNING] SecureHandlebars: falling back to the original template');
        for (var k in err) {
            handlebarsUtils.warn(k.toUpperCase() + ': ' + err[k]);
        }
        handlebarsUtils.warn(template);
    }
    return template;
}

function overrideHbsCreate() {
    var h = hbsCreate(),
        c = h.compile, 
        pc = h.precompile,
        privFilters = xssFilters._privFilters,
        i, j, filterName, prefix, baseContext;

    // override precompile function to preprocess the template first
    h.precompile = function (template, options) {
        options = options || {};
        return pc.call(this, preprocess(template, options.strictMode), options);
    };

    // override compile function to preprocess the template first
    h.compile = function (template, options) {
        options = options || {};
        return c.call(this, preprocess(template, options.strictMode), options);
    };

    // make y refer to the default escape function
    h.registerHelper('y', Handlebars.escapeExpression);

    // don't escape SafeStrings, since they're already safe according to Handlebars
    // Reference: https://github.com/wycats/handlebars.js/blob/master/lib/handlebars/utils.js#L63-L82
    function safeStringCompatibleFilter (filterName) {
        return function (s) {
            // Unlike escapeExpression(), return s instead of s.toHTML() since downstream
            //  filters of the same chain has to be disabled too.
            //  Handlebars will invoke SafeString.toString() at last during data binding
            return (s && s.toHTML) ? s : privFilters[filterName](s);
        };
    }

    /*jshint -W083 */
    // register below the filters that are automatically applied by context parser 
    for (i = 0; (filterName = privateFilters[i]); i++) {
        h.registerHelper(filterName, safeStringCompatibleFilter(filterName));
    }

    // register below the filters that might be manually applied by developers
    for (i = 0; (prefix = contextPrefixes[i]); i++) {
        for (j = 0; (baseContext = baseContexts[j]); j++) {
            filterName = prefix + baseContext;
            h.registerHelper(filterName, xssFilters[filterName]);
        }
    }

    return h;
}

module.exports = overrideHbsCreate();
module.exports.create = overrideHbsCreate;

// the following is in addition to the original Handlbars prototype
module.exports.ContextParserHandlebars = ContextParserHandlebars;

},{"./context-parser-handlebars":37,"./handlebars-utils.js":40,"handlebars":24,"xss-filters":36}]},{},[46])(46)
});