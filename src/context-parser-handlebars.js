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
    var r = true;
    [ 'state', // test for the HTML5 state.
      // 'tagNameIdx', // test for the close tag in the branching logic, but it is not balanced.
      // 'attributeName', 'attributeValue' // not necessary the same in branching logic.
    ].some(function(key) {
        if (stateObj1[key] !== '' && stateObj2[key] !== '' && stateObj1[key] !== stateObj2[key]) {
            r = false;
        }
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
    return r;
};

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

/**
* @function module:ContextParserHandlebars._countNewLineChar
*
* @description
* <p>Count the number of new line for reporting.</p>
*
*/
ContextParserHandlebars.prototype._countNewLineChar = function(ch) {
    var noOfNewLineChar = (ch.match(/\n/g) || []).length;
    return noOfNewLineChar;
};

/**********************************
* FILTERS LOGIC
**********************************/

// @function module:ContextParserHandlebars._addFilters
ContextParserHandlebars.prototype._addFilters = function(state, stateObj, input) {

    /* transitent var */
    var isFullUri, f, msg, exceptionObj;

    /* return filters */
    var filters = [],
        attributeName = stateObj.attributeName,
        attributeValue = stateObj.attributeValue;

    debug("_addFilters:state:"+state);
    debug(stateObj);

    switch(state) {
        case stateMachine.State.STATE_DATA: // 1
            filters.push(filter.FILTER_DATA);
            return filters;
        case stateMachine.State.STATE_RCDATA: // 3
            filters.push(filter.FILTER_DATA);
            return filters;
        case stateMachine.State.STATE_RAWTEXT:  // 5
            /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
            * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
            */
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ STATE_RAWTEXT state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
        case stateMachine.State.STATE_SCRIPT_DATA: // 6
            /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
            * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
            */
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ STATE_SCRIPT_DATA state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
        case stateMachine.State.STATE_BEFORE_ATTRIBUTE_NAME: // 34
            /* never fall into state 34 */
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unexpected output expression @ STATE_BEFORE_ATTRIBUTE_NAME state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
        case stateMachine.State.STATE_ATTRIBUTE_NAME: // 35
            /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
            * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
            */
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ STATE_ATTRIBUTE_NAME state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
        case stateMachine.State.STATE_AFTER_ATTRIBUTE_NAME: // 36
            /* never fall into state 36 */
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unexpected output expression @ STATE_AFTER_ATTRIBUTE_NAME state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
        case stateMachine.State.STATE_BEFORE_ATTRIBUTE_VALUE: // 37
            /* never fall into state 37 */
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unexpected output expression @ STATE_BEFORE_ATTRIBUTE_VALUE state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
        case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED: // 38
        case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED: // 39
        case stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED: // 40

            // URI scheme
            if (attributeName === "href" || attributeName === "src" || attributeName === "action" ||
                attributeName === "formaction" || attributeName === "background" || attributeName === "cite" || 
                attributeName === "longdesc" || attributeName === "usemap" || attributeName === "xlink:href"
            ) {
                /* we don't support javascript parsing yet */
                // TODO: this filtering rule cannot cover all cases.
                if (handlebarsUtils.blacklistProtocol(attributeValue)) {
                    filters.push(filter.FILTER_NOT_HANDLE);
                    msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ attribute URI Javascript context.";
                    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                    handlebarsUtils.handleError(exceptionObj, this._strictMode);
                    /* this one is safe to return */
                    return filters;
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
            } else if (attributeName === "style") {  // CSS
                /* we don't support css parser yet
                * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                */
                filters.push(filter.FILTER_NOT_HANDLE);
                msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ attribute style CSS context.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, this._strictMode);
                return filters;
            } else if (attributeName.match(/^on/i)) { // Javascript
                /* we don't support js parser yet
                * we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
                * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                */
                filters.push(filter.FILTER_NOT_HANDLE);
                msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ attrubute on* Javascript context.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, this._strictMode);
                return filters;
            } else {
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
            }
            break;
        case stateMachine.State.STATE_AFTER_ATTRIBUTE_VALUE_QUOTED: // 42
            /* never fall into state 42 */
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ STATE_AFTER_ATTRIBUTE_VALUE_QUOTED state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
        case stateMachine.State.STATE_COMMENT: // 48
            filters.push(filter.FILTER_COMMENT);
            return filters;
        default:
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression @ NOT HANDLE state.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._strictMode);
            return filters;
    }
};

/**********************************
* HANDLING TEMPLATE LOGIC
**********************************/

// @function module:ContextParserHandlebars._consumeExpression
ContextParserHandlebars.prototype._consumeExpression = function(input, i, type, printChar) {
    var msg, exceptionObj, 
        len = input.length,
        str = '',
        obj = {};

    obj.str = '';
    for(var j=i;j<len;++j) {
        switch (type) {
            case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                    printChar === true ? this._printChar('--}}') : obj.str += '--}}';
                    obj.index = j+3;
                    return obj;
                } else if (input[j] === '-' && j+4<len && input[j+1] === '-' && input[j+2] === '~' && input[j+3] === '}' && input[j+4] === '}') {
                    printChar === true ? this._printChar('--~}}') : obj.str += '--~}}';
                    obj.index = j+4;
                    return obj;
                }
                break;
            case handlebarsUtils.RAW_EXPRESSION:
                if (input[j] === '}' && j+2<len && input[j+1] === '}' && input[j+2] === '}') {
                    printChar === true ? this._printChar('}}}') : obj.str += '}}}';
                    obj.index = j+2;
                    return obj;
                }
                break;
            case handlebarsUtils.NOT_HANDLE_EXPRESSION:
            case handlebarsUtils.ESCAPE_EXPRESSION:
            case handlebarsUtils.PARTIAL_EXPRESSION:
            case handlebarsUtils.BRANCH_EXPRESSION:
            case handlebarsUtils.BRANCH_END_EXPRESSION:
            case handlebarsUtils.ELSE_EXPRESSION:
            case handlebarsUtils.REFERENCE_EXPRESSION:
            case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                if (input[j] === '}' && j+1<len && input[j+1] === '}') {
                    printChar === true ? this._printChar('}}') : obj.str += '}}';
                    obj.index = j+1;
                    return obj;
                }
                break;
        }
        printChar === true ? this._printChar(input[j]) : obj.str += input[j];
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter close brace of expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

// @function module:ContextParserHandlebars._handleEscapeExpression
ContextParserHandlebars.prototype._handleEscapeExpression = function(input, i, len, nextState) {
    var msg, exceptionObj,
        str = '{{',
        obj = {};

    /* parse expression */
    var re = handlebarsUtils.isValidExpression(input, i, handlebarsUtils.ESCAPE_EXPRESSION),
        filters = [];

    /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
    str += '{';

    /* get the customized filter based on the current HTML5 state before the Handlebars template expression. */
    var stateObj = this.getInternalState();
    filters = this._addFilters(nextState, stateObj, input);
    for(var k=filters.length-1;k>=0;--k) {
        if (re.isSingleID && k === 0) {
            str += filters[k] + " ";
        } else {
            str += filters[k] + " (";
        }
    }
    this._printChar(str);

    for(var j=i+2;j<len;++j) {
        if (input[j] === '}' && j+1<len && input[j+1] === '}') {
            for(var l=filters.length-1;l>=0;--l) {
                if (re.isSingleID && l === 0) {
                } else {
                    this._printChar(')');
                }
            }

            this._printChar('}}');
            j=j+1;

            /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}}, no need to increase j by 1. */
            this._printChar('}');

            obj.index = j;
            return obj;
        } else {
            this._printChar(input[j]);
        }
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of escape expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

// @function module:ContextParserHandlebars._handleRawBlock
ContextParserHandlebars.prototype._handleRawBlock = function(input, i) {
    var msg, exceptionObj, 
        obj = {};
    var isStartExpression = true,
        len = input.length,
        re = handlebarsUtils.isValidExpression(input, i, handlebarsUtils.RAW_BLOCK),
        tag = re.tag;

    for(var j=i;j<len;++j) {
        if (isStartExpression && input[j] === '}' && j+3<len && input[j+1] === '}' && input[j+2] === '}' && input[j+3] === '}') {
            this._printChar('}}}}');
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
                    this._printChar('}}}}');
                    k=k+3;

                    obj.index = k;
                    return obj;
                }
                this._printChar(input[k]);
            }
        }
        this._printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}}}' close brace of raw block.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

// @function module:ContextParserHandlebars._handleBranchExpression
ContextParserHandlebars.prototype._handleBranchExpression = function(input, i) {
    var msg, exceptionObj, 
        obj = {};
    try {
        var ast = this._buildBranchAst(input, i);
        var stateObj = this.getInternalState();
        var result = this._analyseBranchAst(ast, stateObj);

        /* print the output */
        this._printChar(result.output);

        /* update the state after branching expression, index 0 and 1 must be the same */
        this.setInternalState(result.lastStates[0]);
 
        /* update the _lineNo */
        this._lineNo += ast.noOfNewLineChar;

        /* update the char pointer */
        obj.index = ast.index;

        debug("_handleBranchTemplate: state:"+result.lastStates[0].state+",new i:"+ast.index+",lineNo:"+this._lineNo);
        return obj;
    } catch (err) {
        exceptionObj = new ContextParserHandlebarsException(err.msg, this._lineNo, this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
    }
};

// @function module:ContextParserHandlebars._analyzeContext
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

// @function module:ContextParserHandlebars._analyseBranchAst
ContextParserHandlebars.prototype._analyseBranchAst = function(ast, stateObj) {
    var obj = {},
        len = ast.program.length;

    var r = {},
        t, msg, exceptionObj;

    r.lastStates = [];
    r.lastStates[0] = stateObj;
    r.lastStates[1] = stateObj;
    r.output = '';
    
    var programDebugOutput = "", inverseDebugOutput = "";

    for(var i=0;i<len;++i) {
        obj = ast.program[i];
        if (obj.type === 'content') {

            debugBranch("_analyzeBranchAst:before:program:content:"+obj.content);
            debugBranch(r.lastStates[0]);

            t = this._analyzeContext(r.lastStates[0], obj);
            r.output += t.output;
            r.lastStates[0] = t.stateObj;
            programDebugOutput += t.output;

            debugBranch(r.lastStates[0]);

        } else if (obj.type === 'node') {

            debugBranch("_analyzeBranchAst:before:program:node");
            debugBranch(r.lastStates[0]);

            t = this._analyseBranchAst(obj.content, r.lastStates[0]);
            r.lastStates[0] = t.lastStates[0]; // index 0 and 1 MUST be equal
            r.output += t.output;
            programDebugOutput += t.output;

            debugBranch(r.lastStates[0]);

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

            debugBranch("_analyzeBranchAst:before:inverse:content:"+obj.content);
            debugBranch(r.lastStates[1]);

            t = this._analyzeContext(r.lastStates[1], obj);
            r.output += t.output;
            r.lastStates[1] = t.stateObj;
            inverseDebugOutput += t.output;

            debugBranch(r.lastStates[1]);

        } else if (obj.type === 'node') {

            debugBranch("_analyzeBranchAst:before:inverse:node");
            debugBranch(r.lastStates[1]);

            t = this._analyseBranchAst(obj.content, r.lastStates[1]);
            r.lastStates[1] = t.lastStates[1]; // index 0 and 1 MUST be equal
            r.output += t.output;
            inverseDebugOutput += t.output;

            debugBranch(r.lastStates[1]);

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

// @function module:ContextParserHandlebars._buildBranchAst
ContextParserHandlebars.prototype._buildBranchAst = function(input, i) {

    /* init the data structure */
    var ast = {};
    ast.program = [];
    ast.inverse = [];

    var j = 0,
        len = input.length,
        msg, exceptionObj; // msg and exception

    var sp = [], // for branching tag stack
        content = '',
        inverse = false,
        saveObj = {},
        obj = {};

    var startPos = 0,
        endPos = 0, 
        lineNo = 0;

    for(j=i;j<len;++j) {
        var exp = handlebarsUtils.isValidExpression(input, j, handlebarsUtils.BRANCH_EXPRESSION).tag,
            endExpression = handlebarsUtils.isValidExpression(input, j, handlebarsUtils.BRANCH_END_EXPRESSION).tag;
        
        if (exp !== false) {
            /* encounter the first branch expression */
            if (sp.length === 0) {
                /* save the branch expression name */
                sp.push(exp);

                /* reset the content */
                content = '';
                inverse = false;

                /* consume the start branch expression */
                startPos = j;
                obj = this._consumeExpression(input, j, handlebarsUtils.BRANCH_EXPRESSION, false);
                endPos = j = obj.index;
                debugBranch("_buildBranchAst,branch,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);

                /* save object */
                saveObj = this._getSaveObject('branch', obj.str, startPos, lineNo);
                /* update the lineNo after the saveObj as tracking for startNewLineNo */
                lineNo += this._countNewLineChar(obj.str);
                if (!inverse) {
                    ast.program.push(saveObj);
                } else if (inverse) {
                    ast.inverse.push(saveObj);
                }

            } else {
                /* save content */
                startPos = endPos+1;
                endPos = startPos+content.length-1;
                saveObj = this._getSaveObject('content', content, startPos, lineNo);
                lineNo += this._countNewLineChar(content);
                debugBranch("_buildBranchAst,content,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);
                if (!inverse) {
                    ast.program.push(saveObj);
                } else if (inverse) {
                    ast.inverse.push(saveObj);
                }

                /* reset the content */
                content = '';

                /* consume the branch recursively */
                startPos = j;
                obj = this._buildBranchAst(input, j);
                endPos = j = obj.index;
                debugBranch("_buildBranchAst,node,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);

                /* save object */
                saveObj = this._getSaveObject('node', obj, startPos, lineNo);
                lineNo += obj.noOfNewLineChar;
                if (!inverse) {
                    ast.program.push(saveObj);
                } else if (inverse) {
                    ast.inverse.push(saveObj);
                }
            }
        } else if (handlebarsUtils.isValidExpression(input, j, handlebarsUtils.ELSE_EXPRESSION).result) {
            /* save content */
            startPos = endPos+1;
            endPos = startPos+content.length-1;
            saveObj = this._getSaveObject('content', content, startPos, lineNo);
            lineNo += this._countNewLineChar(content);
            debugBranch("_buildBranchAst,content,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);
            if (!inverse) {
                ast.program.push(saveObj);
            } else if (inverse) {
                ast.inverse.push(saveObj);
            }

            /* save content and flip */
            inverse = true;
            content = '';

            /* consume the else expression */
            startPos = j;
            obj = this._consumeExpression(input, j, handlebarsUtils.ELSE_EXPRESSION, false);
            endPos = j = obj.index;
            debugBranch("_buildBranchAst,else,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);

            /* save object */
            saveObj = this._getSaveObject('branchelse', obj.str, startPos, lineNo);
            lineNo += this._countNewLineChar(obj.str);
            if (!inverse) {
                ast.program.push(saveObj);
            } else if (inverse) {
                ast.inverse.push(saveObj);
            }

        } else if (endExpression !== false) {
            var t = sp.pop();
            if (t === endExpression) {
                /* save content */
                startPos = endPos+1;
                endPos = startPos+content.length-1;
                saveObj = this._getSaveObject('content', content, startPos, lineNo);
                lineNo += this._countNewLineChar(content);
                debugBranch("_buildBranchAst,content,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);
                if (!inverse) {
                    ast.program.push(saveObj);
                } else if (inverse) {
                    ast.inverse.push(saveObj);
                }

                /* consume the expression */
                startPos = j;
                obj = this._consumeExpression(input, j, handlebarsUtils.BRANCH_END_EXPRESSION, false);
                endPos = j = obj.index;
                debugBranch("_buildBranchAst,branchend,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);

                /* save object */
                saveObj = this._getSaveObject('branchend', obj.str, startPos, lineNo);
                lineNo += this._countNewLineChar(obj.str);
                if (!inverse) {
                    ast.program.push(saveObj);
                } else if (inverse) {
                    ast.inverse.push(saveObj);
                }

                break;
            } else {
                /* broken template as the end expression does not match, throw exception before function returns */
                msg = "[ERROR] ContextParserHandlebars: Template expression mismatch (startExpression:"+t+"/endExpression:"+endExpression+")";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, true);
            }
        } else {
            var expressionType = handlebarsUtils.lookAheadTest(input, j);
            if (expressionType === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM ||
                expressionType === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
                /* consume the comment expression */
                startPos = j;
                obj = this._consumeExpression(input, j, expressionType, false);
                endPos = j = obj.index;

                content += obj.str;
                debugBranch("_buildBranchAst,comment,startPos:"+startPos+",endPos:"+endPos+",lineNo:"+lineNo+",j:"+j);
            } else {
                /* capturing the string */
                content += input[j];    
            }
        }
    }

    if (sp.length > 0) {
        /* throw error on the template */
        msg = "[ERROR] ContextParserHandlebars: Template does not have balanced branching expression.";
        exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
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

    // we don't care about the expression with more than 4 braces, handlebars will handle it.
    /* handling different type of expression */
    if ((input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '{' && input[i+3] === '{')
    ) {
        handlebarsExpressionType = handlebarsUtils.RAW_BLOCK;
        re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
        if (re.result === false) {
            msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw block expression.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, true);
        }

        /* _handleRawBlock */
        debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
        obj = this._handleRawBlock(input, i);
        /* advance the index pointer by 1 to the char after the last brace of expression. */
        return obj.index+1;

    } else if (input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '{') {
        handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
        re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
        if (re.result === false) {
            msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw expression.";
            exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, true);
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
            case handlebarsUtils.NOT_HANDLE_EXPRESSION:
                msg = "[WARNING] ContextParserHandlebars: Not supported expression.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, false);
                /* _consumeExpression */
                debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
                /* advance the index pointer by 1 to the char after the last brace of expression. */
                return obj.index+1;

            case handlebarsUtils.ESCAPE_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid escape expression.";
                    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                    handlebarsUtils.handleError(exceptionObj, true);
                }
                /* _handleEscapeExpression */
                debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                obj = this._handleEscapeExpression(input, i, len, nextState);
                /* update the Context Parser's state if it is raw expression. */
                this.state = nextState;
                /* advance the index pointer by 1 to the char after the last brace of expression. */
                return obj.index+1;

            case handlebarsUtils.PARTIAL_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid partial expression.";
                    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                    handlebarsUtils.handleError(exceptionObj, true);
                }
                /* _consumeExpression */
                debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
                /* advance the index pointer by 1 to the char after the last brace of expression. */
                return obj.index+1;

            case handlebarsUtils.REFERENCE_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid reference expression.";
                    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                    handlebarsUtils.handleError(exceptionObj, true);
                }
                /* _consumeExpression */
                debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
                /* advance the index pointer by 1 to the char after the last brace of expression. */
                return obj.index+1;

            case handlebarsUtils.BRANCH_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid branch expression.";
                    exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                    handlebarsUtils.handleError(exceptionObj, true);
                }
                /* _handleBranchExpression */
                debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                obj = this._handleBranchExpression(input, i);
                /* advance the index pointer by 1 to the char after the last brace of expression. */
                return obj.index+1;

            case handlebarsUtils.BRANCH_END_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{/.*}} expression.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, true);
                break;

            case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                // no need to validate the comment expression as the content inside are skipped.
                /* _consumeExpression */
                debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
                /* advance the index pointer by 1 to the char after the last brace of expression. */
                return obj.index+1;

            case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                // no need to validate the comment expression as the content inside are skipped.
                /* _consumeExpression */
                debug("_handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+nextState);
                obj = this._consumeExpression(input, i, handlebarsExpressionType, true);
                /* advance the index pointer by 1 to the char after the last brace of expression. */
                return obj.index+1;

            case handlebarsUtils.ELSE_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{else}} or {{^}} expression.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, true);
                break;

            default:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unknown expression.";
                exceptionObj = new ContextParserHandlebarsException(msg, this._lineNo, this._charNo);
                handlebarsUtils.handleError(exceptionObj, true);
                break;
        }
    } else {
        /* return immediately for non template start char '{' */
        return i;
    }
};

/**********************************
* HOOK LOGIC
**********************************/

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

/* exposing it */
module.exports = ContextParserHandlebars;

})();
