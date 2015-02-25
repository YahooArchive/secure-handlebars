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

/* vanilla Handlebars */
var Handlebars = require("handlebars");

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
    this._charNo = 1;

    debug("_printChar:"+this._printChar);
    debug("_enableSubexpression:"+this._enableSubexpression);
    debug("_handlebarsVersion:"+this._handlebarsVersion);
}

/* inherit the prototype of contextParser.Parser */
ContextParserHandlebars.prototype = Object.create(contextParser.Parser.prototype);

/**********************************
* OUTPUT FACILITY
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

/* being used for capturing the first non whitepsace string */
ContextParserHandlebars.expressionRegExp = /^{~?\s*([^\s~]+)\s*([^\}~]*)?~?}/;

/** 
* @function module:ContextParserHandlebars._parseExpression
*
* @param {string} input - The input string of the HTML5 web page.
* @param {integer} i - The current index of the input string.
* @returns {boolean} true or false.
*
* @description
* <p>this method is to judge whether it is a standalone output expression?</p>
*
* reference:
* http://handlebarsjs.com/expressions.html
* https://github.com/wycats/handlebars.js/blob/master/src/handlebars.l#L27
*/
ContextParserHandlebars.prototype._parseExpression = function(input, i) {

    var firststr = "",
        obj = {
            filter: '',
            isPrefixWithKnownFilter: false,
            isSingleIdentifier: false
        };

    /*
    * Note: the expected format is "{.*}" and check against isValidExpression.
    */
    var str = input.slice(i);
    var j = str.indexOf('}');
    str = str.slice(0, j+1);

    var m = ContextParserHandlebars.expressionRegExp.exec(str);

    if (m !== null) {
        var isReservedChar;
        if (m[1] !== undefined) {
            firststr = m[1];
            isReservedChar = handlebarsUtil.isReservedChar(m[1], 0);
            /* special handling for {else} */
            if (firststr === 'else' || firststr === '^') {
                obj.isSingleIdentifier = false;
                obj.isPrefixWithKnownFilter = true;
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
                obj.isPrefixWithKnownFilter = true;
            }
        }
    }
    debug("_parseExpression:"+obj);
    return obj;
};

/**
* @function module:ContextParserHandlebars._addFilters
*
* @param {integer} state - The current HTML5 state of the current character before the Handlebars expression.
* @param {string} input - The input string of HTML5 web page.
* @param {integer} ptr - The index of the current character in the input string, it is pointing to the last brace of the open brace of the expression.
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
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtil.handleError(msg);
        return filters;
    // 6
    } else if (state === stateMachine.State.STATE_SCRIPT_DATA) {
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtil.handleError(msg);
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
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
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
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtil.handleError(msg);
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
        * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtil.handleError(msg);
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
    handlebarsUtil.handleError(msg);
    return filters;
};

/**********************************
* TEMPLATING HANDLING LOGIC
**********************************/

// validate the Handlebars template before/after analysis.
ContextParserHandlebars.prototype._validateTemplate = function(template) {
    var msg;
    if (!Handlebars.VERSION.match(/^2\./)) {
        msg = "[ERROR] ContextParserHandlebars: We support Handlebars 2.0 ONLY!";
        handlebarsUtil.handleError(msg, true);
    }

    try {
        Handlebars.parse(template);
    } catch (err) {
        msg = "[ERROR] ContextParserHandlebars: Handlebars validation error!";
        handlebarsUtil.handleError(msg, true);
    }
};

// consume the raw expression.
ContextParserHandlebars.prototype._handleRawExpression = function(input, i, len, state) {
    var msg;
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+2<len && input[j+1] === '}' && input[j+2] === '}') {
                this.printChar(input[j]);
                j++;
                this.printChar(input[j]);
                j++;
                this.printChar(input[j]);
                j++;

                /* update the Context Parser's state if it is raw expression */
                this.state = state;

                /* for printCharWithState */
                this.bytes[j] = input[j-1];
                this.symbols[j] = this.lookupChar(input[j-1]);
                this.states[j] = state;

                return j;
        }
        this.printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}}' close brace of raw expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtil.handleError(msg, true);
};

// consume the escape expression.
ContextParserHandlebars.prototype._handleEscapeExpression = function(input, i, len, state) {
    var msg;

    /* Consume 2 '{' chars */
    this.printChar(input[i]);
    i++;
    this.printChar(input[i]);

    /*
    * Check whether there is a known filter being added, 
    * if yes, then we will not add any customized filters.
    */
    var extraExpressionInfo = this._parseExpression(input, i),
        isPrefixWithKnownFilter = extraExpressionInfo.isPrefixWithKnownFilter,
        filters = [];

    if (!isPrefixWithKnownFilter) {
        /* We suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
        this.printChar('{');

        /* Get the customized filter based on the current HTML5 state before the Handlebars template expression. */
        var extraInfo = {
            'attributeName': this.getAttributeName(),
            'attributeValue': this.getAttributeValue(),
        };
        filters = this._addFilters(state, input, i, extraInfo);
        for(var k=filters.length-1;k>=0;--k) {
            if (this._enableSubexpression) {
                if (extraExpressionInfo.isSingleIdentifier && k === 0) {
                    this.printChar(filters[k] + " ");
                } else {
                    this.printChar(filters[k] + " (");
                }
            } else {
                this.printChar(filters[k] + " ");
            }
        }
    }

    for(var j=i+1;j<len;++j) {
        if (input[j] === '}' && j+1 < len && input[j+1] === '}') {
            /* close the filters subexpression */
            if (this._enableSubexpression) {
                for(var l=filters.length-1;l>=0;--l) {
                    if (extraExpressionInfo.isSingleIdentifier && l === 0) {
                    } else {
                        this.printChar(")");
                    }
                }
            }

            this.printChar(input[j]);
            j++;
            this.printChar(input[j]);
            j++;

            /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
            if (!isPrefixWithKnownFilter) {
                this.printChar('}');
            }

            /* update the Context Parser's state if it is not reserved tag */
            this.state = state;

            /* for printCharWithState */
            this.bytes[j] = input[j-1];
            this.symbols[j] = this.lookupChar(input[j-1]);
            this.states[j] = state;

            return j;
        } else {
            this.printChar(input[j]);
        }
    }

    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtil.handleError(msg, true);
};

// consume the comment expression.
ContextParserHandlebars.prototype._handleCommentExpression = function(input, i, len, type) {
    var msg;
    for(var j=i;j<len;++j) {
        if (type === handlebarsUtil.COMMENT_EXPRESSION_LONG_FORM) {
            if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                this.printChar(input[j]);
                j++;
                this.printChar(input[j]);
                j++;
                this.printChar(input[j]);
                j++;
                this.printChar(input[j]);
                j++;

                return j;
            }
        } else if (type === handlebarsUtil.COMMENT_EXPRESSION_SHORT_FORM) {
            if (input[j] === '}' && j+1<len && input[j+1] === '}') {
                this.printChar(input[j]);
                j++;
                this.printChar(input[j]);
                j++;

                return j;
            }
        }
        this.printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' or '--}}' close brace of comment expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtil.handleError(msg, true);
};

// consume the expression with }} at the end
ContextParserHandlebars.prototype._handleExpression = function(input, i, len) {
    var msg;
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+1<len && input[j+1] === '}') {
            this.printChar(input[j]);
            j++;
            this.printChar(input[j]);
            j++;

            return j;
        }
        this.printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of partial expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtil.handleError(msg, true);
};

// consume the branching expression.
ContextParserHandlebars.prototype._handleBranchExpression = function(input, i, state) {
    var msg;
    try {
        /* Extract the branching statement, and subpress non-branching expression. */
        var objMaskedStmt = handlebarsUtil.extractBranchStmt(input, i, true);

        /* Parse the branching statement. */
        var ast = handlebarsUtil.parseBranchStmt(objMaskedStmt.stmt);

        /* Restore the open/close_brace_nonce with {} for analysis */
        objMaskedStmt.stmt = objMaskedStmt.stmt.replace(new RegExp(objMaskedStmt.openBracePlaceHolder, 'g'), '{');
        objMaskedStmt.stmt = objMaskedStmt.stmt.replace(new RegExp(objMaskedStmt.closeBracePlaceHolder, 'g'), '}');

        var result = handlebarsUtil.parseAstTreeState(ast, state, objMaskedStmt);

        /* echo to output */
        this.printChar(result.stmt);

        /* Advance the index pointer i to the char after the last brace of branching expression. */
        var objUnmaskedStmt = handlebarsUtil.extractBranchStmt(input, i, false);
        i=i+objUnmaskedStmt.stmt.length;
        this.state = result.lastStates[0];

        debug("_handleBranchTemplate: state:"+this.state+",i:"+i);
        return i;
    } catch (err) {
       msg = err + " ["+this._lineNo+":"+this._charNo+"]";
       handlebarsUtil.handleError(msg, true);
    }
};

/** 
* @function module:ContextParserHandlebars._handleTemplate
*
* @param {char} ch - The current character to be processed.
* @param {integer} i - The index of the current character in the input string.
* @param {string} input - The input string of the HTML5 web page.
* @param {integer} state - The current HTML5 state of the current character before the Handlebars expression.
* @returns {object} The feedback object to the Context Parser with advanced index and state of input string after processing.
*
* @description
* <p>This is the template hook implementation of the Handlebars.</p>
*
* <p>The _handleTemplate consumes the string till the end of template start char is met.
* As the Handlebars expression is in the format of either {{expression}} or {{{expression}}},
* this function return the character pointer right after the last '}' back to the contextParser.</p>
*
* <p>The context template parser expects to return the same index i if it is not template stream,
* otherwise it returns the pointer right after the template expression char, like '}'</p>
*
*/
ContextParserHandlebars.prototype._handleTemplate = function(ch, i, input, state) {

    /* return object */
    var index = i;

    /* error msg */
    var msg;
    /* the length of the input */
    var len = input.length;
    /* regular expression validation result */
    var re;

    /* Handlebars template context */
    var isHandlebarsContext = false;
    /* Handlebars expression type */
    var handlebarsExpressionType = handlebarsUtil.NOT_EXPRESSION; 

    /* handling different type of expression */
    if (ch === '{' && i+3 < len && input[i+1] === '{' && input[i+2] === '{' && input[i+3] === '{') {
        //
        // TODO
        //
    } else if (ch === '{' && i+2 < len && input[i+1] === '{' && input[i+2] === '{') {
        isHandlebarsContext = true;
        handlebarsExpressionType = handlebarsUtil.RAW_EXPRESSION;
        re = handlebarsUtil.isValidExpression(input, i, handlebarsUtil.RAW_EXPRESSION);
        if (re.result === false) {
            msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid expression. ["+this._lineNo+":"+this._charNo+"]";
            handlebarsUtil.handleError(msg, true);
        }

        /* for printCharWithState */
        this.bytes[index+1] = ch;
        this.symbols[index+1] = this.lookupChar(ch);
        this.states[index+1] = state;

        /* _handleRawExpression */
        debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
        return this._handleRawExpression(input, i, len, state);
    } else if (ch === '{' && i+1 < len && input[i+1] === '{') {
        isHandlebarsContext = true;
        handlebarsExpressionType = handlebarsUtil.getExpressionType(input, i, len);
        switch (handlebarsExpressionType) {
            case handlebarsUtil.ESCAPE_EXPRESSION:
                // handlebarsUtil.ESCAPE_EXPRESSION is a strict validation
                re = handlebarsUtil.isValidExpression(input, i, handlebarsUtil.ESCAPE_EXPRESSION);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtil.handleError(msg, true);
                }

                /* for printCharWithState */
                this.bytes[index+1] = ch;
                this.symbols[index+1] = this.lookupChar(ch);
                this.states[index+1] = state;

                /* _handleEscapeExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleEscapeExpression(input, i, len, state);
            case handlebarsUtil.BRANCH_EXPRESSION:
                // handlebarsUtil.ESCAPE_EXPRESSION is a strict validation
                re = handlebarsUtil.isValidExpression(input, i, handlebarsUtil.ESCAPE_EXPRESSION);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtil.handleError(msg, true);
                }
                /* _handleBranchExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleBranchExpression(input, i, state);
            case handlebarsUtil.BRANCH_END_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{/.*}} expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtil.handleError(msg, true);
                break;
            case handlebarsUtil.PARTIAL_EXPRESSION:
                // handlebarsUtil.ESCAPE_EXPRESSION is a strict validation
                re = handlebarsUtil.isValidExpression(input, i, handlebarsUtil.ESCAPE_EXPRESSION);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtil.handleError(msg, true);
                }
                /* _handleExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleExpression(input, i, len);
            case handlebarsUtil.COMMENT_EXPRESSION_LONG_FORM:
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleCommentExpression(input, i, len, handlebarsExpressionType);
            case handlebarsUtil.COMMENT_EXPRESSION_SHORT_FORM:
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleCommentExpression(input, i, len, handlebarsExpressionType);
            case handlebarsUtil.DATA_VAR_EXPRESSION:
                // handlebarsUtil.ESCAPE_EXPRESSION is a strict validation
                re = handlebarsUtil.isValidExpression(input, i, handlebarsUtil.ESCAPE_EXPRESSION);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtil.handleError(msg, true);
                }
                /* _handleExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleExpression(input, i, len);
            case handlebarsUtil.ELSE_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{else}} expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtil.handleError(msg, true);
                break;
            default:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unknown expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtil.handleError(msg, true);
                break;
        }
    } else {
        isHandlebarsContext = false;
        handlebarsExpressionType = handlebarsUtil.NOT_EXPRESSION;
        /* return immediately for non template start char '{' */
        return index;
    }

    return i;
};

/**********************************
* HOOK LOGIC
**********************************/

/* overriding the HTML5 Context Parser's beforeWalk for printing out */
ContextParserHandlebars.prototype.beforeWalk = function(i, input) {

    /* TODO: use vanilla Handlebars to validate the template?
    if (i === 0) {
        this._validateTemplate(input);
    }
    */

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
    this.printChar(ch);
    if (ch === '\n') {
        ++this._lineNo;
        this._charNo = 1;
    }
    ++this._charNo;
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();
