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
    debugDump = require('debug')('cph-dump');

/* import the html context parser */
var contextParser = require('context-parser'),
    handlebarsUtil = require('./handlebars-utils.js'),
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

    /* The flag is used to print out the char to console */
    this._printChar = typeof printChar !== undefined? printChar : true;

    /* The flag is used to enable the output filter format as Handlebars 2.0.0 subexpression or not. */
    this._enableSubexpression = true;
    this._handlebarsVersion = require('handlebars').VERSION;

    /* save the line number being processed */
    this._lineNo = 1;

    debug("_printChar:"+this._printChar);
    debug("_enableSubexpression:"+this._enableSubexpression);
    debug("_handlebarsVersion:"+this._handlebarsVersion);
}

/* inherit the prototype of contextParser.Parser */
ContextParserHandlebars.prototype = Object.create(contextParser.Parser.prototype);

/**********************************
* PRINTING FACILITY
**********************************/

/**
* @function module:ContextParserHandlebars.printChar
*
* @param {char} ch - The character to be printed.
*
* @description
* <p>Print the char to stdout.</p>
*
*/
ContextParserHandlebars.prototype.printChar = function(ch) {
    if (this._printChar) {
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

/** 
* @function module:ContextParserHandlebars._getExpressionExtraInfo
*
* @param {string} input - The input string of the HTML5 web page.
* @param {integer} i - The current index of the input string.
* @returns {boolean} true or false.
*
* @description
* <p>this method is to judge whether it is a standalone output place holder?</p>
*
* reference:
* http://handlebarsjs.com/expressions.html
* https://github.com/wycats/handlebars.js/blob/master/src/handlebars.l#L27
*/
ContextParserHandlebars.prototype._getExpressionExtraInfo = function(input, i) {

    var firststr = "",
        obj = {
            filter: '',
            isKnownFilter: false,
            isSingleIdentifier: false
        };

    /*
    * Substring the input string and match it 
    * Note: the expected format is "{.*}".
    */
    var str = input.substring(i);
    var j = str.indexOf('}');
    str = str.substring(0, j+1);

    /* '{' 'space'* 'non-space'+ 'space'* 'non-{'* '}' */
    var r = /^{\s*(\S+)\s*([^}]*)?}/g;
    var m = r.exec(str);

    if (m !== null) {
        var isReservedChar;
        if (m[1] !== undefined) {
            firststr = m[1];
            isReservedChar = handlebarsUtil.isReservedChar(m[1][0]);
            /* special handling for {else} */
            if (firststr === 'else') {
                obj.isSingleIdentifier = false;
                obj.isKnownFilter = true;
                return obj;
            }
            if (isReservedChar) {
                return obj;
            }
        }

        if (m[2] === undefined) {
            obj.isSingleIdentifier = true;
        } else {
            obj.filter = firststr;
            var k = this._knownFilters.indexOf(obj.filter);
            if (k !== -1) {
                obj.isKnownFilter = true;
            }
        }
    }
    debug("_getExpressionExtraInfo:"+obj);
    return obj;
};

/**
* @function module:ContextParserHandlebars._addFilters
*
* @param {integer} state - The current HTML5 state of the current character before the Handlebars markup.
* @param {string} input - The input string of HTML5 web page.
* @param {integer} ptr - The index of the current character in the input string, it is pointing to the last brace of the open brace of the markup.
* @param {string} extraInfo - The extra information for filters judgement.
* @returns {Array} The Array of the customized filters.
*
* @description
* <p>This function returns the customized filter based on the current HTML5 state with additional data parsing.</p>
*
*/
ContextParserHandlebars.prototype._addFilters = function(state, input, ptr, extraInfo) {

    /* transitent var */
    var e,
        f,
        msg;

    /* return filters */
    var filters = [];

    var attributeName = extraInfo.attributeName,
        attributeValue = extraInfo.attributeValue;

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
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output place holder,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
        handlebarsUtil.handleError(msg);
        return filters;
    // 6
    } else if (state === stateMachine.State.STATE_SCRIPT_DATA) {
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output place holder,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
        handlebarsUtil.handleError(msg);
        return filters;
    // 34
    } else if (state === stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME) {
        /* never fall into this state */
    // 35
    } else if (state === stateMachine.State.STATE_ATTRIBUTE_NAME) {
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output place holder,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
        handlebarsUtil.handleError(msg);
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
        if (handlebarsUtil.blacklistProtocol(attributeValue)) {
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
            handlebarsUtil.handleError(msg);
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
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output place holder,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
        handlebarsUtil.handleError(msg);
        return filters;
    // 38, 39, 40 + Javascript spec
    } else if ((state === stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED || 
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED ||
        state === stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED) &&
        (attributeName.match(/^on/i))) {
        /* we don't support js parser yet
        *
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output place holder,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
        handlebarsUtil.handleError(msg);
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
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output place holder,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
        handlebarsUtil.handleError(msg);
        return filters;
    // 48
    } else if (state === stateMachine.State.STATE_COMMENT) {
        filters.push(filter.FILTER_COMMENT);
        return filters;
    }

    /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output place holder,
    * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
    */
    filters.push(filter.FILTER_NOT_HANDLE);
    msg = "[WARNING] ContextParserHandlebars: unsafe output place holder at (line:"+this._lineNo+"/position:"+ptr+")";
    handlebarsUtil.handleError(msg);
    return filters;
};

/**********************************
* TEMPLATING HANDLING LOGIC
**********************************/

// TODO: the current assumption is partial keeps in/out state the same
ContextParserHandlebars.prototype._handlePartialTemplate = function() {
};

// TODO: refactor the LOGIC #A into this function
ContextParserHandlebars.prototype._handleBranchTemplate = function() {
};

/** 
* @function module:ContextParserHandlebars._handleTemplate
*
* @param {char} ch - The current character to be processed.
* @param {integer} i - The index of the current character in the input string.
* @param {string} input - The input string of the HTML5 web page.
* @param {integer} state - The current HTML5 state of the current character before the Handlebars markup.
* @returns {object} The feedback object to the Context Parser with advanced index and state of input string after processing.
*
* @description
* <p>This is the template hook implementation of the Handlebars.</p>
*
* <p>The _handleTemplate consumes the string till the end of template start char is met.
* As the Handlebars markup is in the format of either {{expression}} or {{{expression}}},
* this function return the character pointer right after the last '}' back to the contextParser.</p>
*
* <p>The context template parser expects to return the same index i if it is not template stream,
* otherwise it returns the pointer right after the template markup char, like '}'</p>
*
*/
ContextParserHandlebars.prototype._handleTemplate = function(ch, i, input, state) {

    /* return object */
    var index = i;

    /* error msg */
    var msg;
    /* the length of the input */
    var len = input.length;

    /* It is not the Handlebars markup, return immediately */
    var NOT_EXPRESSION = 0;
    /* It is the Handlebars markup in the format of with prefix {{ */
    var ESCAPE_EXPRESSION = 1;
    /* It is the Handlebars markup in the format of with prefix {{{ */
    var RAW_EXPRESSION = 2;
    /* Handlebars markup type */
    var handlebarsExpressionType = NOT_EXPRESSION; 
    /* Extra information of expression */
    var extraExpressionInfo;

    /* Handlebars reserved markup */
    var isHandlebarsReservedTag = false;
    /* Handlebars template context */
    var isHandlebarsContext = false;
    /* Handlebars {{#if}} {{else}} {{#with}} {{#each}} {{#unless}} markup */
    var isBranchTags = false;

    /* context filters */
    var filters = [];
    var noOfFilter = 0;
    /* Encounter a known filter, we will not add any customized filters if it is known filter */
    var isKnownFilter = false;
    debug("_handleTemplate:len:"+len+",i:"+i);

    /* 
    * ---- LOGIC #1 - is handlebars template? ----
    * Determine the type of Handlebars markup 
    * Note: character comparison is the faster as compared with any type of string operation.
    */
    if (ch === '{' && i+2 < len && input[i+1] === '{' && input[i+2] === '{') {
        isHandlebarsContext = true;
        handlebarsExpressionType = RAW_EXPRESSION;
    } else if (ch === '{' && i+1 < len && input[i+1] === '{') {
        isHandlebarsContext = true;
        handlebarsExpressionType = ESCAPE_EXPRESSION;
    } else {
        isHandlebarsContext = false;
        handlebarsExpressionType = NOT_EXPRESSION;
        /* return immediately for non template start char '{' */
        return index;
    }
    debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);

    /*
    * ---- LOGIC #2 - OPEN BRACE ----
    */
    if (handlebarsExpressionType === ESCAPE_EXPRESSION) {
        isBranchTags = handlebarsUtil.isBranchTags(input, i);
        if (i+2<len) {
            isHandlebarsReservedTag = handlebarsUtil.isReservedChar(input[i+2]);
        }

        if (!isBranchTags) {
            /* Consume 2 '{' chars */
            this.printChar(input[i]);
            i=i+1; /** Point to next '{' */
            this.printChar(input[i]);
        }

    } else if (handlebarsExpressionType === RAW_EXPRESSION) {
        /* consume 3 '{' chars */
        this.printChar(input[i]);
        i=i+1; /* point to next '{' */
        this.printChar(input[i]);
        i=i+1; /* point to last '{' */
        this.printChar(input[i]);
    }
    debug("_handleTemplate:LOGIC#2:isBranchTags:"+isBranchTags+",isHandlebarsReservedTag:"+isHandlebarsReservedTag+",i:"+i);

    /*
    * ---- LOGIC #3 - ADD FILTERS ----
    */
    if (handlebarsExpressionType === ESCAPE_EXPRESSION && !isHandlebarsReservedTag) {
        /*
        * Check whether there is a known filter being added, 
        * if yes, then we will not add any customized filters.
        */
        extraExpressionInfo = this._getExpressionExtraInfo(input, i);
        isKnownFilter = extraExpressionInfo.isKnownFilter;

        if (!isKnownFilter) {
            /* We suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
            this.printChar('{');

            /* Get the customized filter based on the current HTML5 state before the Handlebars template markup. */
            var extraInfo = {
                'attributeName': this.getAttributeName(),
                'attributeValue': this.getAttributeValue(),
            };
            filters = this._addFilters(state, input, i, extraInfo);
            for(noOfFilter=filters.length-1;noOfFilter>=0;--noOfFilter) {
                if (this._enableSubexpression) {
                    if (extraExpressionInfo.isSingleIdentifier && noOfFilter === 0) {
                        this.printChar(filters[noOfFilter] + " ");
                    } else {
                        this.printChar(filters[noOfFilter] + " (");
                    }
                } else {
                    this.printChar(filters[noOfFilter] + " ");
                }
            }
        }
    }
    debug("_handleTemplate:LOGIC#3:extraExpressionInfo:"+extraExpressionInfo+",filters:"+filters);

    /*
    * ---- LOGIC #A - BRANCHING STATEMENT HANDLING ----
    */
    if (handlebarsExpressionType === ESCAPE_EXPRESSION && isBranchTags && isHandlebarsReservedTag) {
        /* Extract the branching statement, and subpress non-branching markup. */
        var objMaskedStmt = handlebarsUtil.extractBranchStmt(input, i, true);

        /* Parse the branching statement. */
        var ast = handlebarsUtil.parseBranchStmt(objMaskedStmt.stmt);

        /* Restore the open/close_brace_nonce with {} for analysis */
        objMaskedStmt.stmt = objMaskedStmt.stmt.replace(new RegExp(objMaskedStmt.openBracePlaceHolder, 'g'), '{');
        objMaskedStmt.stmt = objMaskedStmt.stmt.replace(new RegExp(objMaskedStmt.closeBracePlaceHolder, 'g'), '}');

        var result = handlebarsUtil.parseAstTreeState(ast, state, objMaskedStmt);

        /* echo to output */
        this.printChar(result.stmt);

        /* Advance the index pointer i to the char after the last brace of branching markup. */
        var objUnmaskedStmt = handlebarsUtil.extractBranchStmt(input, i, false);
        i=i+objUnmaskedStmt.stmt.length;
        this.state = result.lastStates[0];

        debug("_handleTemplate:LOGIC#A:state:"+this.state+",i:"+i);
        return i;
    }

    /*
    * ---- LOGIC #4 - CLOSE BRACE ----
    * After the customized filter is added, we simply consume the character till we meet the close braces of Handlebars markup
    */
    for(var j=i+1;j<len;++j) {
        i=j;

        if (handlebarsExpressionType === ESCAPE_EXPRESSION) {
            /* Encounter the end of Handlebars markup close brace */
            if (input[j] === '}' && j+1 < len && input[j+1] === '}') {

                /* close the filters subexpression */
                if (this._enableSubexpression) {
                    for(noOfFilter=filters.length-1;noOfFilter>=0;--noOfFilter) {
                        if (extraExpressionInfo.isSingleIdentifier && noOfFilter === 0) {
                        } else {
                            this.printChar(")");
                        }
                    }
                }

                /* Print the first '}' */
                this.printChar(input[j]);
                j++;
                i=j;
                /* Print the second '}' */
                this.printChar(input[j]);
                /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
                if (!isHandlebarsReservedTag && !isKnownFilter) {
                    this.printChar('}');
                }

                isHandlebarsContext = false;
                handlebarsExpressionType = NOT_EXPRESSION;
                i=i+1; /* Point to the char right after the last '}' */

                /* update the Context Parser's state if it is not reserved tag */
                if (!isHandlebarsReservedTag) {
                    this.state = state;

                    /* just for debugging */
                    this.bytes[index+1] = ch;
                    this.symbols[index+1] = this.lookupChar(ch);
                    this.states[index+1] = state;
                    this.bytes[i] = input[i-1];
                    this.symbols[i] = this.lookupChar(input[i-1]);
                    this.states[i] = state;
                }

                break;
            } else {
                this.printChar(input[j]);
            }
        } else if (handlebarsExpressionType === RAW_EXPRESSION) {
            /* Encounter the end of Handlebars markup close brace */
            if (input[j] === '}' && j+2 < len && input[j+1] === '}' && input[j+2] === '}') {
                /* Print the first '}' */
                this.printChar(input[j]);
                j++;
                i=j;
                /* Print the second '}' */
                this.printChar(input[j]);
                j++;
                i=j;
                /* Print the third '}' */
                this.printChar(input[j]);

                isHandlebarsContext = false;
                handlebarsExpressionType = NOT_EXPRESSION;
                i=i+1; /* Point to the char right after the last '}' */
                /* update the Context Parser's state if it is not reserved tag */
                this.state = state;

                /* just for debugging */
                this.bytes[index+1] = ch;
                this.symbols[index+1] = this.lookupChar(ch);
                this.states[index+1] = state;
                this.bytes[i] = input[i-1];
                this.symbols[i] = this.lookupChar(input[i-1]);
                this.states[i] = state;

                break;
            } else {
                this.printChar(input[j]);
            }
        }
    }
    debug("_handleTemplate:LOGIC#4:i:"+i);

    /*
    * ---- LOGIC #5 - BROKEN TEMPLATE ----
    * If we meet the EOF of the input string, while the Context Parser is still in the Handlebars context,
    * it indicates that the input Handlebars template file is an incomplete file.
    */
    if (isHandlebarsContext) {
        msg = "[ERROR] ContextParserHandlebars: Template parsing error, cannot encounter '}}' or '}}}' close brace at (line:"+this._lineNo+"/position:"+i+")";
        handlebarsUtil.handleError(msg, true);
    }

    return i;
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
        * we need to judge the exact state of output markup,
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

        /* update the i, it is the index right after the handlebars markup */
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
    this.printChar(ch);
    if (ch === '\n') {
        ++this._lineNo;
    }
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();
