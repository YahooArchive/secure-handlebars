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

/* import the html context parser */
var contextParser = require('context-parser'),
    stateMachine = contextParser.StateMachine,
    htmlState = stateMachine.State,
    htmlParser = contextParser.FastParser;

// Perform input stream preprocessing
// Reference: https://html.spec.whatwg.org/multipage/syntax.html#preprocessing-the-input-stream
function InputPreProcessing (state, i) {
    var input = this.input, 
        chr = input[i],
        nextChr = input[i+1];

    // equivalent to inputStr.replace(/\r\n?/g, '\n')
    if (chr === '\r') {
        if (nextChr === '\n') {
            input.splice(i, 1);
            this.inputLen--;
        } else {
            input[i] = '\n';
        }
    } 
    // the following are control characters or permanently undefined Unicode characters (noncharacters), resulting in parse errors
    // \uFFFD replacement is not required by the specification, we consider \uFFFD character as an inert character
    else if ((chr >= '\x01'   && chr <= '\x08') || 
             (chr >= '\x0E'   && chr <= '\x1F') ||
             (chr >= '\x7F'   && chr <= '\x9F') ||
             (chr >= '\uFDD0' && chr <= '\uFDEF') ||
             chr === '\x0B' || chr === '\uFFFE' || chr === '\uFFFF') {
        input[i] = '\uFFFD';
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
        input[i] = input[i+1] = '\uFFFD';
    }
}

function ConvertBogusCommentToComment(i) {
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

        // convert [>] to [-]->
        this.input.splice(i, 0, '-', '-');
        this.inputLen += 2;

        this.emit('bogusCommentCoverted', state, i, endsWithEOF);
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
    
    this.emit('preCanonicalize', state, i, endsWithEOF);

    var reCanonicalizeNeeded = true,
        input = this.input,
        chr = input[i], nextChr = input[i+1],
        potentialState = this._getNextState(state, i, endsWithEOF),
        nextPotentialState = this._getNextState(potentialState, i + 1, endsWithEOF);

    // console.log(i, state, potentialState, nextPotentialState, input.slice(i).join(''));

    // batch replacement of NULL with \uFFFD would violate the spec
    //  - for example, NULL is untouched in CDATA section state
    if (chr === '\x00' && statesRequiringNullReplacement[state]) {
        input[i] = '\uFFFD';
    }
    // encode < into &lt; for [<]* (* is non-alpha) in STATE_DATA, [<]% and [<]! in STATE_RCDATA and STATE_RAWTEXT
    else if ((potentialState === htmlState.STATE_TAG_OPEN && nextPotentialState === htmlState.STATE_DATA) ||  // [<]*, where * is non-alpha
             ((state === htmlState.STATE_RCDATA || state === htmlState.STATE_RAWTEXT) &&                            // in STATE_RCDATA and STATE_RAWTEXT
            chr === '<' && (nextChr === '%' || nextChr === '!'))) {   // [<]% or [<]!
        
        // [<]*, [<]%, [<]!
        input.splice(i, 1, '&', 'l', 't', ';');
        this.inputLen += 3;
    }
    // enforce <!doctype html>
    // + convert bogus comment or unknown doctype to the standard html comment
    else if (potentialState === htmlState.STATE_MARKUP_DECLARATION_OPEN) {            // <[!]***  
        reCanonicalizeNeeded = false;

        // context-parser treats the doctype and [CDATA[ as resulting into STATE_BOGUS_COMMENT
        // so, we need our algorithm here to extract and check the next 7 characters
        var commentKey = input.slice(i + 1, i + 8).join('');

        // enforce <!doctype html>
        if (commentKey.toLowerCase() === 'doctype') {               // <![d]octype
            // extract 6 chars immediately after <![d]octype and check if it's equal to ' html>'
            if (input.slice(i + 8, i + 14).join('').toLowerCase() !== ' html>') {

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
                    (nextChr === '-' && input[i+2] === '-')) {
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
            nextPotentialState === htmlState.STATE_BEFORE_ATTRTYPE) {           // input[i+1] is ANYTHING_ELSE (i.e., not EOF nor >)
        // if ([htmlState.STATE_TAG_NAME,                                             // <a[/]* replaced with <a[ ]*
        //     /* following is unknown to CP
        //     htmlState.STATE_RCDATA_END_TAG_NAME,
        //     htmlState.STATE_RAWTEXT_END_TAG_NAME,
        //     htmlState.STATE_SCRIPT_DATA_END_TAG_NAME,
        //     htmlState.STATE_SCRIPT_DATA_ESCAPED_END_TAG_NAME,
        //     */
        //     htmlState.STATE_BEFORE_ATTRTYPE,                                 // <a [/]* replaced with <a [ ]*
        //     htmlState.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED].indexOf(state) !== -1)   // <a abc=""[/]* replaced with <a abc=""[ ]*
        input[i] = ' ';

        // given input[i] was    '/', nextPotentialState was htmlState.STATE_BEFORE_ATTRTYPE
        // given input[i] is now ' ', nextPotentialState becomes STATE_BEFORE_ATTRTYPE if current state is STATE_ATTRTYPE or STATE_AFTER_ATTRTYPE
        // to preserve state, remove future EQUAL SIGNs (=)s to force STATE_AFTER_ATTRTYPE behave as if it is STATE_BEFORE_ATTRTYPE
        // this is okay since EQUAL SIGNs (=)s will be stripped anyway in the STATE_BEFORE_ATTRTYPE cleanup handling 
        if (state === htmlState.STATE_ATTRTYPE ||                               // <a abc[/]=abc  replaced with <a abc[ ]*
                state === htmlState.STATE_AFTER_ATTRTYPE) {                     // <a abc [/]=abc replaced with <a abc [ ]*
            for (var j = i + 1; j < this.inputLen && input[j] === '='; j++) {
                input.splice(j, 1);
                this.inputLen--;
            }
        }
    }
    // remove unnecessary equal signs, hence <input checked[=]> become <input checked[>], or <input checked [=]> become <input checked [>]
    else if (potentialState === htmlState.STATE_BEFORE_ATTRIBUTE_VALUE &&   // only from STATE_ATTRTYPE or STATE_AFTER_ATTRTYPE
            nextPotentialState === htmlState.STATE_DATA) {                  // <a abc[=]> or <a abc [=]>
        input.splice(i, 1);
        this.inputLen--;
    }
    // insert a space for <a abc="***["]* or <a abc='***[']* after quoted attribute value (i.e., <a abc="***["] * or <a abc='***['] *)
    else if (potentialState === htmlState.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED &&        // <a abc=""[*] where * is not SPACE (\t,\n,\f,' ')
            nextPotentialState === htmlState.STATE_BEFORE_ATTRTYPE &&
            this._getSymbol(i + 1) !== stateMachine.Symbol.SPACE) {
        input.splice(i + 1, 0, ' ');
        this.inputLen++;
    }
    // else here means no special pattern was found requiring rewriting
    else {
        reCanonicalizeNeeded = false;
    }

    // remove " ' < = from being treated as part of attribute name (not as the spec recommends though)
    switch (potentialState) {
        case htmlState.STATE_BEFORE_ATTRTYPE:     // remove ambigious symbols in <a [*]href where * is ", ', <, or = 
            if (nextChr === "=") {
                input.splice(i + 1, 1);
                this.inputLen--;
                reCanonicalizeNeeded = true;
                break;
            }
            /* falls through */
        case htmlState.STATE_ATTRTYPE:            // remove ambigious symbols in <a href[*] where * is ", ', or <
        case htmlState.STATE_AFTER_ATTRTYPE:      // remove ambigious symbols in <a href [*] where * is ", ', or <
            if (nextChr === '"' || nextChr === "'" || nextChr === '<') {
                input.splice(i + 1, 1);
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
                input.splice(i, 1, '&', 'q', 'u', 'o', 't', ';');
                this.inputLen += 5;
                break;
            } else if (chr === "'") {
                input.splice(i, 1, '&', '#', '3', '9', ';');
                this.inputLen += 4;
                break;
            }
            /* falls through */
        case htmlState.STATE_BEFORE_ATTRIBUTE_VALUE:     // treat < = ` as if they are in STATE_ATTRIBUTE_VALUE_UNQUOTED
            if (chr === '<') {
                input.splice(i, 1, '&', 'l', 't', ';');
                this.inputLen += 3;
            } else if (chr === '=') {
                input.splice(i, 1, '&', '#', '6', '1', ';');
                this.inputLen += 4;
            } else if (chr === '`') {
                input.splice(i, 1, '&', '#', '9', '6', ';');
                this.inputLen += 4;
            }
            break;

    // add hyphens to complete <!----> to avoid raising parsing errors
        // replace <!--[>] with <!--[-]->
        case htmlState.STATE_COMMENT_START:
            if (chr === '>') {                          // <!--[>]
                input.splice(i, 0, '-', '-');
                this.inputLen += 2;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            break;
        // replace <!---[>] with <!---[-]>
        case htmlState.STATE_COMMENT_START_DASH:
            if (chr === '>') {                          // <!---[>]
                input.splice(i, 0, '-'); 
                this.inputLen++;
                // reCanonicalizeNeeded = true;  // not need due to no where to treat its potential states
            }
            break;

    // replace --[!]> with --[>]
        case htmlState.STATE_COMMENT_END:
            if (chr === '!' && nextChr === '>') {
                input.splice(i, 1);
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
    var input = this.input;

    if (state === htmlState.STATE_COMMENT && input[i] === ']' && input[i+1] === '>') {
        input.splice(i, 0, ' ');
        this.inputLen++;
    }
}

/** 
* @module StrictContextParser
*/
function StrictContextParser(config, listeners) {
    var self = this, k;

    // super
    htmlParser.apply(self, arguments);

    // config
    config || (config = {});

    self.listeners = {};
    // deep copy the provided listeners, if any
    if (typeof listeners === 'object') {
        for (k in listeners) {
            self.listeners[k] = listeners[k].slice();
        }
    }
    // initialize default listeners, of which the order of registration matters
    else {

        // run through the input stream with input pre-processing
        !config.disableInputPreProcessing && this.on('preWalk', InputPreProcessing);
        // fix parse errors before they're encountered in walk()
        !config.disableCanonicalization && this.on('preWalk', Canonicalize).on('reWalk', Canonicalize);
        // disable IE conditional comments
        !config.disableIEConditionalComments && this.on('preWalk', DisableIEConditionalComments);
        // TODO: rewrite IE <comment> tags

        // TODO: When a start tag token is emitted with its self-closing flag set, if the flag is not acknowledged when it is processed by the tree construction stage, that is a parse error.
        // TODO: When an end tag token is emitted with attributes, that is a parse error.
        // TODO: When an end tag token is emitted with its self-closing flag set, that is a parse error.

        // for bookkeeping the processed inputs and states
        if (config.enableStateTracking) {
            this.states = [this.state];
            this.buffer = []; 
            this.on('postWalk', function (lastState, state, i, endsWithEOF) {
                this.buffer.push(this.input[i]);
                this.states.push(state);
            }).on('reWalk', this.setCurrentState);
        }
    }

    // deep copy the config to this.config
    this.config = {};
    for (k in config) {
        this.config[k] = config[k];
    }
}

/* inherit contextParser.FastParser */
StrictContextParser.prototype = Object.create(htmlParser.prototype);
StrictContextParser.prototype.constructor = StrictContextParser;

/**
* @function StrictContextParser._getSymbol
* @param {integer} i - the index of input stream
*
* @description
* Get the html symbol mapping for the character located in the given index of input stream
*/
StrictContextParser.prototype._getSymbol = function (i) {
    return i < this.inputLen ? this.lookupChar(this.input[i]) : -1;
};

/**
* @function StrictContextParser._getNextState
* @param {integer} state - the current state
* @param {integer} i - the index of input stream
* @returns {integer} the potential state about to transition into, given the current state and an index of input stream
*
* @description
* Get the potential html state about to transition into
*/
StrictContextParser.prototype._getNextState = function (state, i, endsWithEOF) {
    return i < this.inputLen ? stateMachine.lookupStateFromSymbol[this._getSymbol(i)][state] : -1;
};

/**
* @function StrictContextParser.fork
* @returns {object} a new parser with all internal states inherited
*
* @description
* create a new parser with all internal states inherited
*/
StrictContextParser.prototype.fork = function() {
    var parser = new this.constructor(this.config, this.listeners);

    parser.state = this.state;
    parser.tagNames = this.tagNames.slice();
    parser.tagNameIdx = this.tagNameIdx;
    parser.attributeName = this.attributeName;
    parser.attributeValue = this.attributeValue;

    if (this.config.enableStateTracking) {
        parser.buffer = this.buffer.slice();
        parser.states = this.states.slice();
    }

    return parser;
};


/**
 * @function StrictContextParser#on
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>register the given event listener to the given eventType</p>
 *
 */
StrictContextParser.prototype.on = function(eventType, listener) {
    var self = this, listeners = self.listeners[eventType];
    if (listener) {
        if (listeners) {
            listeners.push(listener);
        } else {
            self.listeners[eventType] = [listener];
        }
    }
    return self;
};

/**
 * @function StrictContextParser#once
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>register the given event listener to the given eventType, for which it will be fired only once</p>
 *
 */
StrictContextParser.prototype.once = function(eventType, listener) {
    var self = this, onceListener;
    if (listener) {
        onceListener = function () {
            self.off(eventType, onceListener);
            listener.apply(self, arguments);
        };
        return this.on(eventType, onceListener);
    }
    return self;
};

/**
 * @function StrictContextParser#off
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @param {function} listener - the event listener
 * @returns this
 *
 * @description
 * <p>remove the listener from being fired when the eventType happen</p>
 *
 */
StrictContextParser.prototype.off = function (eventType, listener) {
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
 * @function StrictContextParser#emit
 *
 * @param {string} eventType - the event type (e.g., preWalk, reWalk, postWalk, ...)
 * @returns this
 *
 * @description
 * <p>fire those listeners correspoding to the given eventType</p>
 *
 */
StrictContextParser.prototype.emit = function (eventType) {
    var self = this,
        listeners = self.listeners[eventType],
        i, args, listener;

    if (listeners) {
        args = [].slice.call(arguments, 1);
        for (i = 0; (listener = listeners[i]); i++) {
            listener.apply(self, args);
        }
    }
    return self;
};

/**
 * @function StrictContextParser#parsePartial
 *
 * @param {string} input - The HTML fragment
 * @returns {string} the inputs with parse errors and browser-inconsistent characters automatically corrected
 *
 * @description
 * <p>Perform HTML fixer before the contextual analysis</p>
 *
 */
StrictContextParser.prototype.parsePartial = function(input, endsWithEOF) {
    var self = this;
    self.input = input.split('');
    self.inputLen = self.input.length;

    for (var i = 0, lastState; i < self.inputLen; i++) {
        lastState = self.state;

        // TODO: endsWithEOF handling
        self.emit('preWalk', lastState, i, endsWithEOF);
        self.walk(i, self.input, endsWithEOF);
        self.emit('postWalk', lastState, self.state, i, endsWithEOF);
    }

    return (self.output = self.input.join(''));
};


// the only difference from the original walk is to use the this.emit('reWalk') interface
StrictContextParser.prototype.walk = function(i, input, endsWithEOF) {

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
        this.emit('reWalk', this.state, i, endsWithEOF);

        // if( this.states) {
        //     // This is error prone. May need to change the way we walk the stream to avoid this.
        //     this.states[i] = this.state; 
        // }
        return this.walk(i, input);
    }

    return this;
};



/**
 * @function StrictContextParser#setCurrentState
 *
 * @param {integer} state - The state of HTML5 page.
 *
 * @description
 * Set the current state of the HTML5 Context Parser.
 *
 */
StrictContextParser.prototype.setCurrentState = function(state) {
    this.state = state;
    if (this.states) {
        this.states.pop();
        this.states.push(state);
    }
    return this;
};

/**
 * @function StrictContextParser#getCurrentState
 *
 * @returns {integer} The last state of the HTML5 Context Parser.
 *
 * @description
 * Get the last state of HTML5 Context Parser.
 *
 */
StrictContextParser.prototype.getCurrentState = function() {
    return this.state;
};


// <iframe srcdoc=""> is a scriptable attribute too
// Reference: https://html.spec.whatwg.org/multipage/embedded-content.html#attr-iframe-srcdoc
var scriptableTags = {
    script:1,style:1,
    svg:1,xml:1,math:1,
    applet:1,object:1,embed:1,link:1,
    scriptlet:1                  // IE-specific
};

/**
 * @function StrictContextParser#isScriptableTag
 *
 * @returns {boolean} true if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
StrictContextParser.prototype.isScriptableTag = function() {
    return scriptableTags[this.tagNames[0]] === 1;
};

// Reference: http://www.w3.org/TR/html-markup/elements.html
StrictContextParser.ATTRTYPE_URI = 1,
StrictContextParser.ATTRTYPE_CSS = 2,
StrictContextParser.ATTRTYPE_SCRIPTABLE = 3,
StrictContextParser.ATTRTYPE_MIME = 4,
StrictContextParser.ATTRTYPE_GENERAL = undefined;

var attributeNamesType = {
    // we generally do not differentiate whether these attribtues are tag specific during matching for simplicity
    'href'       :StrictContextParser.ATTRTYPE_URI,     // for a, link, img, area, iframe, frame, video, object, embed ...
    'src'        :StrictContextParser.ATTRTYPE_URI,
    'background' :StrictContextParser.ATTRTYPE_URI,     // for body, table, tbody, tr, td, th, etc? (obsolete)
    'action'     :StrictContextParser.ATTRTYPE_URI,     // for form, input, button
    'formaction' :StrictContextParser.ATTRTYPE_URI,     
    'cite'       :StrictContextParser.ATTRTYPE_URI,     // for blockquote, del, ins, q
    'poster'     :StrictContextParser.ATTRTYPE_URI,     // for img, object, video, source
    'usemap'     :StrictContextParser.ATTRTYPE_URI,     // for image
    'longdesc'   :StrictContextParser.ATTRTYPE_URI,                         
    'folder'     :StrictContextParser.ATTRTYPE_URI,     // for a
    'manifest'   :StrictContextParser.ATTRTYPE_URI,     // for html
    'classid'    :StrictContextParser.ATTRTYPE_URI,     // for object
    'codebase'   :StrictContextParser.ATTRTYPE_URI,     // for object, applet
    'icon'       :StrictContextParser.ATTRTYPE_URI,     // for command
    'profile'    :StrictContextParser.ATTRTYPE_URI,     // for head
    'content'    :StrictContextParser.ATTRTYPE_URI,     // for meta http-equiv=refresh, kill more than need

    // http://www.w3.org/TR/xmlbase/#syntax
    'xmlns'      :StrictContextParser.ATTRTYPE_URI,     // for svg, etc?
    'xml:base'   :StrictContextParser.ATTRTYPE_URI, 
    'xmlns:xlink':StrictContextParser.ATTRTYPE_URI,
    'xlink:href' :StrictContextParser.ATTRTYPE_URI,     // for xml-related

    // srcdoc is the STRING type, not URI
    'srcdoc'     :StrictContextParser.ATTRTYPE_URI,     // for iframe

    'style'      :StrictContextParser.ATTRTYPE_CSS,     // for global attributes list

    // pattern matching, handling it within the function getAttributeNamesType
    // 'on*'     :StrictContextParser.ATTRTYPE_SCRIPTABLE,

    'type'       :StrictContextParser.ATTRTYPE_MIME,    // TODO: any potential attack of the MIME type?

    'data'       :{'object'  :StrictContextParser.ATTRTYPE_URI},
    'rel'        :{'link'    :StrictContextParser.ATTRTYPE_URI},
    'value'      :{'param'   :StrictContextParser.ATTRTYPE_URI},
};

/**
 * @function StrictContextParser#getAttributeNamesType
 *
 * @returns {integer} the attribute type defined for different handling
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
StrictContextParser.prototype.getAttributeNamesType = function() {
    if (this.attributeName[0] === 'o' && this.attributeName[1] === 'n') { /* assuming it is from Strict Context Parser.
                                                                             and o{{placeholder}}n* can bypass the check.
                                                                             anyway, we are good to throw error in atttribute name state. */
        return StrictContextParser.ATTRTYPE_SCRIPTABLE;
    } else {
        // TODO: support compound uri context at <meta http-equiv="refresh" content="seconds; url">, <img srcset="url 1.5x, url 2x">

        // return StrictContextParser.ATTRTYPE_GENERAL for case without special handling
        // here,  attrTags === [integer] is a tag agnostic matching
        // while, attrTags[tagName] === [integer] matches only those attribute of the given tagName

        var attrTags = attributeNamesType[this.attributeName];
        return typeof attrTags === 'object'? attrTags[this.tagNames[0]] : attrTags;
    }
};

/**
 * ==================
 * the following legacy function is maintained for backward compatibility with the contextParser.Parser
 * ==================
 */

/**
 * @function StrictContextParser#setCurrentState
 *
 * @param {integer} state - The state of HTML5 page.
 *
 * @description
 * Set the current state of the HTML5 Context Parser.
 *
 */
// StrictContextParser.prototype.setCurrentState = function(state) {
//     this.state = state;
// };


/**
 * @function StrictContextParser#getStates
 *
 * @returns {Array} An array of states.
 *
 * @description
 * Get the states of the HTML5 page
 *
 */
StrictContextParser.prototype.getStates = function() {
    return this.states;
};

/**
 * @function StrictContextParser#setInitState
 *
 * @param {integer} state - The initial state of the HTML5 Context Parser.
 *
 * @description
 * Set the init state of HTML5 Context Parser.
 *
 */
StrictContextParser.prototype.setInitState = function(state) {
    this.states && (this.states[0] = state);
};

/**
 * @function StrictContextParser#getInitState
 *
 * @returns {integer} The initial state of the HTML5 Context Parser.
 *
 * @description
 * Get the init state of HTML5 Context Parser.
 *
 */
StrictContextParser.prototype.getInitState = function() {
    return this.states && this.states[0];
};

/**
 * @function StrictContextParser#getLastState
 *
 * @returns {integer} The last state of the HTML5 Context Parser.
 *
 * @description
 * Get the last state of HTML5 Context Parser.
 *
 */
StrictContextParser.prototype.getLastState = function() {
    // * undefined if length = 0 
    return this.states ? this.states[ this.states.length - 1 ] : this.state;
};

/**
 * @function StrictContextParser#getAttributeName
 *
 * @returns {string} The current handling attribute name.
 *
 * @description
 * Get the current handling attribute name of HTML tag.
 *
 */
StrictContextParser.prototype.getAttributeName = function() {
    return this.attributeName;
};

/**
 * @function StrictContextParser#getAttributeValue
 *
 * @returns {string} The current handling attribute name's value.
 *
 * @description
 * Get the current handling attribute name's value of HTML tag.
 *
 */
StrictContextParser.prototype.getAttributeValue = function() {
    return this.attributeValue;
};

/**
 * @function StrictContextParser#getStartTagName
 *
 * @returns {string} The current handling start tag name
 *
 */
StrictContextParser.prototype.getStartTagName = function() {
    return this.tagNames[0];
};



/* exposing it */
module.exports = StrictContextParser;

})();
