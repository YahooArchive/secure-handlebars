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

var filter = {
    FILTER_NOT_HANDLE: 'y',
    FILTER_DATA: 'yd',
    FILTER_COMMENT: 'yc',
    FILTER_ATTRIBUTE_VALUE_DOUBLE_QUOTED: 'yavd',
    FILTER_ATTRIBUTE_VALUE_SINGLE_QUOTED: 'yavs',
    FILTER_ATTRIBUTE_VALUE_UNQUOTED: 'yavu',
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
    var lineNo, isFullUri, f, filters, exceptionObj,
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
        lineNo = this._countNewLineChar(input.slice(0, this._charNo));
        exceptionObj = new ContextParserHandlebarsException(
            '[WARNING] ContextParserHandlebars: ' + stateRelatedMessage, 
            lineNo,
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
    var lineNo, msg, exceptionObj, 
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
    lineNo = this._countNewLineChar(input.slice(0, this._charNo));
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter close brace of expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

// @function module:ContextParserHandlebars._handleEscapeExpression
ContextParserHandlebars.prototype._handleEscapeExpression = function(input, i, len, nextState, saveToBuffer) {
    var lineNo, msg, exceptionObj,
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
    lineNo = this._countNewLineChar(input.slice(0, this._charNo));
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of escape expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

// @function module:ContextParserHandlebars._handleRawBlock
ContextParserHandlebars.prototype._handleRawBlock = function(input, i, saveToBuffer) {
    var lineNo, msg, exceptionObj, 
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
                lineNo = this._countNewLineChar(input.slice(0, this._charNo));
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw end block expression.";
                exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, true);
            }
            if (re.tag !== tag) {
                lineNo = this._countNewLineChar(input.slice(0, this._charNo));
                msg = "[ERROR] ContextParserHandlebars: Parsing error! start/end raw block name mismatch.";
                exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
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
    lineNo = this._countNewLineChar(input.slice(0, this._charNo));
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}}}' close brace of raw block.";
    exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
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
    var lineNo, msg, exceptionObj;
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
        lineNo = this._countNewLineChar(input.slice(0, this._charNo));
        exceptionObj = new ContextParserHandlebarsException(
            '[WARNING] ContextParserHandlebars: ' + stateRelatedMessage, 
            lineNo, 
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
        t, lineNo, msg, exceptionObj;

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
        debugBranch("_analyzeBranchAst:["+r.lastStates[0].state+"/"+r.lastStates[0].state+"]");
        r.lastStates[1] = r.lastStates[0];
    } else if (ast.program.length === 0 && ast.inverse.length > 0) {
        debugBranch("_analyzeBranchAst:["+r.lastStates[1].state+"/"+r.lastStates[1].state+"]");
        r.lastStates[0] = r.lastStates[1];
    }

    if (!this._deepCompareState(r.lastStates[0], r.lastStates[1])) {
        lineNo = this._countNewLineChar(r.output.slice(0, this._charNo));
        msg  = "[ERROR] ContextParserHandlebars: Parsing error! Inconsistent HTML5 state OR without close tag after conditional branches. Please fix your template! \n";
        msg += "[ERROR] #if  branch: " + programDebugOutput.slice(0, 50) + "...\n";
        msg += "[ERROR] else branch: " + inverseDebugOutput.slice(0, 50) + "...\n";
        msg += JSON.stringify(r.lastStates[0]) + "\n";
        msg += JSON.stringify(r.lastStates[1]) + "\n";
        exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
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
        lineNo, msg, exceptionObj; // msg and exception

    var content = '',
        inverse = false,
        buildNode = false,
        saveObj = {},
        obj = {};

    var startPos = 0,
        endPos = 0;

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
                    saveObj = this._getSaveObject('content', content, startPos);
                    inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                    content = '';
                }

                switch (handlebarsExpressionType) {
                    case handlebarsUtils.RAW_BLOCK:
                        /* _handleRawBlock */
                        startPos = j;
                        obj = this._handleRawBlock(input, j, false);
                        endPos = j = obj.index;
                        saveObj = this._getSaveObject('rawblock', obj.str, startPos);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                 
                        break;
                    case handlebarsUtils.ELSE_EXPRESSION:
                        /* inverse */
                        inverse = true;

                        /* _consumeExpression */
                        startPos = j;
                        obj = this._consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        saveObj = this._getSaveObject(handlebarsExpressionTypeName, obj.str, startPos);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);

                        break;
                    case handlebarsUtils.BRANCH_EXPRESSION:

                        if (sp.length === 0 || buildNode) {
                            /* buildAst recursively */
                            startPos = j;
                            obj = this.buildAst(input, j, [re.tag]);
                            endPos = j = obj.index;
                            saveObj = this._getSaveObject('node', obj, startPos);
                            inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                        } else {
                            /* _consumeExpression */
                            startPos = j;
                            obj = this._consumeExpression(input, j, handlebarsExpressionType, false);
                            endPos = j = obj.index;
                            saveObj = this._getSaveObject(handlebarsExpressionTypeName, obj.str, startPos);
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
                        saveObj = this._getSaveObject(handlebarsExpressionTypeName, obj.str, startPos);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);

                        break;
                    default:
                        throw "[ERROR] ContextParserHandlebars: Parsing error! Unexcepted error.";
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
            throw "[ERROR] ContextParserHandlebars: Template does not have branching close expression";
        }
    } catch (stateRelatedMessage) {
        lineNo = this._countNewLineChar(input.slice(0, this._charNo));
        exceptionObj = new ContextParserHandlebarsException(
            '[WARNING] ContextParserHandlebars: ' + stateRelatedMessage, 
            lineNo, 
            this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
    }
   
    /* save the last content */
    if (content !== '') {
        startPos = endPos+1;
        endPos = startPos+content.length-1;
        saveObj = this._getSaveObject('content', content, startPos);
        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
    }

    ast.index = j;
    return ast;
};

// @function ContextParserHandlebars._getSaveObject
ContextParserHandlebars.prototype._getSaveObject = function(type, content, startPos) {
    var obj = {};
    obj.type = type;
    obj.content = content;

    obj.startPos = startPos;
    return obj;
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();
