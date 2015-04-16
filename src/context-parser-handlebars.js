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
var debug = require('debug')('cph');

/* import the html context parser */
// TODO: require a new cp later
var contextParser = require('context-parser'),
    handlebarsUtils = require('./handlebars-utils.js'),
    stateMachine = contextParser.StateMachine;

/////////////////////////////////////////////////////
//
// TODO: need to move this code back to filter module
// 
/////////////////////////////////////////////////////
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

/////////////////////////////////////////////////////
//
// @module CustomizedContextParser
// 
/////////////////////////////////////////////////////

/**
* @module CustomizedContextParser
*/
function CustomizedContextParser() {

    /* super() */
    contextParser.Parser.call(this);

    /* save the processed char */
    this._buffer = [];

    /* save the line number being processed */
    this._charNo = 1;
}

/* inherit the Context Parser */
CustomizedContextParser.prototype = Object.create(contextParser.Parser.prototype);

/**
* @function CustomizedContextParser.getInternalState
*
* @description
* Get the internal state of the Context Parser.
*/
contextParser.Parser.prototype.getInternalState = function() {
    var stateObj = {};
    stateObj.state = this.state;
    stateObj.tagNames = this.tagNames;
    stateObj.tagNameIdx = this.tagNameIdx;
    stateObj.attributeName = this.attributeName;
    stateObj.attributeValue = this.attributeValue;
    return stateObj;
};

/**
* @function CustomizedContextParser.setInternalState
*
* @description
* Set the internal state of the Context Parser.
*/
contextParser.Parser.prototype.setInternalState = function(stateObj) {
    // TODO: these 2 apis need to combine.
    this.setInitState(stateObj.state);
    this.setCurrentState(stateObj.state);

    this.tagNames = stateObj.tagNames.slice(0); // need deep copy
    this.tagNameIdx = stateObj.tagNameIdx;
    this.attributeName = stateObj.attributeName;
    this.attributeValue = stateObj.attributeValue;
};

/**
* @function CustomizedContextParser.deepCompareState
*
* @description
* Compare the internal state of the Context Parser.
*/
contextParser.Parser.prototype.deepCompareState = function(stateObj1, stateObj2) {
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

/**
* @function CustomizedContextParser.clearBuffer
*
* @description
* Clear the buffer.
*/
contextParser.Parser.prototype.clearBuffer = function() {
    // http://jsperf.com/array-destroy
    this._buffer = [];
};

/**
* @function CustomizedContextParser.getOutput
*
* @description
* Get the output of processed chars.
*/
contextParser.Parser.prototype.getOutput = function() {
    return this._buffer.join('');
};

/**
* @function CustomizedContextParser.saveToBuffer
*
* @description
* Save the processed char to the buffer array and return
* it through getOutput()
*/
contextParser.Parser.prototype.saveToBuffer = function(str) {
    this._buffer.push(str);
};

/**
* @function CustomizedContextParser.afterWalk
*
* @descciption 
* Override the HTML5 Context Parser's afterWalk
*/
contextParser.Parser.prototype.afterWalk = function(ch, i) {
    this.saveToBuffer(ch);
    this._charNo += ch.length;
};

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

    /* the flag is used to print out the char to console */
    this._config._printCharEnable = config.printCharEnable === undefined ? true : config.printCharEnable;

    /* the flag is used to strict mode of handling un-handled state */
    this._config._strictMode = config.strictMode === undefined ? false: config.strictMode;

    /* save the line number being processed */
    this._charNo = 1;

    /* context parser for HTML5 parsing */
    this._html5Parser = new CustomizedContextParser();
}

/**
* @constant ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar
*
* @description
* The Lookup table for Handlebars open brace chars state transition.
* https://github.com/yahoo/context-parser/blob/master/src/html5-state-machine.js#L36
*/
ContextParserHandlebars.prototype.lookupStateForHandlebarsOpenBraceChar = [
    0 ,1 ,0 ,3 ,0 ,5 ,6 ,7 ,10,10,
    10,3 ,13,13,5 ,16,16,6 ,19,19,
    6 ,6 ,22,22,22,28,27,27,28,29,
    29,29,29,33,35,35,35,40,38,39,
    40,0 ,34,34,44,44,48,48,48,48,
    48,48,0 ,44
    /* 
    State transition generated from existing Context Parser
    0 ,1 ,0 ,3 ,0 ,5 ,6 ,7 ,1 ,44,
    10,3 ,3, 3 ,5 ,5 ,5 ,6 ,6, 6 ,
    6 ,6 ,22,22,22,22,22,22,22,29,
    29,29,29,29,35,35,35,40,38,39,
    40,0 ,34,34,44,44,48,48,48,48,
    48,48,0 ,44
    */
];

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
    // TODO: modify the way to get init state later.
    var stateObj = this._html5Parser.getInternalState();
    var r = this.analyzeAst(ast, stateObj);
    this._config._printCharEnable && process.stdout.write(r.output);
    return r.output;
};

/**
* @function ContextParserHandlebars.buildAst
*
* @description
* Build the AST tree of the Handlebars template language.
*/
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
                handlebarsExpressionTypeName = handlebarsExpressionType === handlebarsUtils.ESCAPE_EXPRESSION? 'escapeexpression' : 'expression';
                handlebarsExpressionType === handlebarsUtils.BRANCH_EXPRESSION? handlebarsExpressionTypeName = 'branchstart' : '';
                handlebarsExpressionType === handlebarsUtils.ELSE_EXPRESSION? handlebarsExpressionTypeName = 'branchelse' : '';
                handlebarsExpressionType === handlebarsUtils.BRANCH_END_EXPRESSION? handlebarsExpressionTypeName = 'branchend' : '';
            }

            if (handlebarsExpressionType !== handlebarsUtils.NOT_EXPRESSION) {

                /* validation */
                re = handlebarsUtils.isValidExpression(input, j, handlebarsExpressionType);
                if (re.result === false) {
                    throw "Parsing error! Invalid expression. ("+handlebarsExpressionType+")";
                }

                /* save content */
                if (content !== '') {
                    startPos = endPos+1;
                    endPos = startPos+content.length-1;
                    saveObj = this.generateNodeObject('content', content, startPos);
                    inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                    content = '';
                }

                switch (handlebarsExpressionType) {
                    case handlebarsUtils.RAW_BLOCK:
                        /* handleRawBlock */
                        startPos = j;
                        obj = this.handleRawBlock(input, j, false);
                        endPos = j = obj.index;
                        saveObj = this.generateNodeObject('rawblock', obj.str, startPos);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                 
                        break;
                    case handlebarsUtils.ELSE_EXPRESSION:
                        /* inverse */
                        inverse = true;

                        /* consumeExpression */
                        startPos = j;
                        obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        saveObj = this.generateNodeObject(handlebarsExpressionTypeName, obj.str, startPos);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);

                        break;
                    case handlebarsUtils.BRANCH_EXPRESSION:

                        if (sp.length === 0 || buildNode) {
                            /* buildAst recursively */
                            startPos = j;
                            obj = this.buildAst(input, j, [re.tag]);
                            endPos = j = obj.index;
                            saveObj = this.generateNodeObject('node', obj, startPos);
                            inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
                        } else {
                            /* consumeExpression */
                            startPos = j;
                            obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                            endPos = j = obj.index;
                            saveObj = this.generateNodeObject(handlebarsExpressionTypeName, obj.str, startPos);
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
                                throw "Template expression mismatch (startExpression:"+startTag+"/endExpression:"+re.tag+")";
                            }
                        }

                        /* consumeExpression */
                        startPos = j;
                        obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        saveObj = this.generateNodeObject(handlebarsExpressionTypeName, obj.str, startPos);
                        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);

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
            lineNo = this._countNewLineChar(input.slice(0, this._charNo));
            exceptionObj = new ContextParserHandlebarsException(
                '[ERROR] ContextParserHandlebars: ' + exception,
                lineNo, 
                this._charNo);
            handlebarsUtils.handleError(exceptionObj, true);
        } else {
            handlebarsUtils.handleError(exception, true);
        }
    }
   
    /* save the last content */
    if (content !== '') {
        startPos = endPos+1;
        endPos = startPos+content.length-1;
        saveObj = this.generateNodeObject('content', content, startPos);
        inverse === true ? ast.inverse.push(saveObj) : ast.program.push(saveObj);
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
ContextParserHandlebars.prototype.analyzeAst = function(ast, stateObj) {
    var obj = {};

    var r = {},
        t, lineNo, msg, exceptionObj, debugString = [];

    r.lastStates = [];
    r.lastStates[0] = stateObj;
    r.lastStates[1] = stateObj;
    r.output = '';

    var contextParserHandlebars = this;
    [0, 1].forEach(function(i) {
        var tree = i === 0? ast.program : ast.inverse;
        tree.forEach(function(node) {
            if (node.type === 'content') {
                debug("analyzeAst:node.type:"+node.type);
                t = contextParserHandlebars.analyzeHTMLContext(r.lastStates[i], node);
                r.output += t.output;
                r.lastStates[i] = t.stateObj;
            } else if (node.type === 'rawblock' ||
                node.type === 'expression') {
                debug("analyzeAst:node.type:"+node.type);
                r.output += node.content;
            } else if (node.type === 'escapeexpression' ||
                node.type === 'rawexpression') {
                debug("analyzeAst:node.type:"+node.type);
                /* lookupStateForHandlebarsOpenBraceChar from current state before handle it */
                r.lastStates[i].state = contextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[r.lastStates[i].state];
                contextParserHandlebars.clearBuffer();
                contextParserHandlebars.handleTemplate(node.content, 0, r.lastStates[i]);
                r.output += contextParserHandlebars.getOutput();
            } else if (node.type === 'node') {
                debug("analyzeAst:node.type:"+node.type);
                t = contextParserHandlebars.analyzeAst(node.content, r.lastStates[i]);
                r.lastStates[i] = t.lastStates[i]; // index 0 and 1 MUST be equal
                r.output += t.output;
            } else if (node.type === 'branchstart' ||
                node.type === 'branchelse' ||
                node.type === 'branchend') {
                debug("analyzeAst:node.type:"+node.type);
                r.output += node.content;
            }
        });
    });

    if (ast.program.length > 0 && ast.inverse.length === 0) {
        debug("analyzeAst:["+r.lastStates[0].state+"/"+r.lastStates[0].state+"]");
        r.lastStates[1] = r.lastStates[0];
    } else if (ast.program.length === 0 && ast.inverse.length > 0) {
        debug("analyzeAst:["+r.lastStates[1].state+"/"+r.lastStates[1].state+"]");
        r.lastStates[0] = r.lastStates[1];
    }

    if (!this._html5Parser.deepCompareState(r.lastStates[0], r.lastStates[1])) {
        lineNo = this._countNewLineChar(r.output.slice(0, this._charNo));
        msg  = "[ERROR] ContextParserHandlebars: Parsing error! Inconsistent HTML5 state OR without close tag after conditional branches. Please fix your template! \n";
        // msg += "[ERROR] #if  branch: " + debugString[0].slice(0, 50) + "...\n";
        // msg += "[ERROR] else branch: " + debugString[1].slice(0, 50) + "...\n";
        msg += JSON.stringify(r.lastStates[0]) + "\n";
        msg += JSON.stringify(r.lastStates[1]) + "\n";
        exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
        handlebarsUtils.handleError(exceptionObj, true);
    }
    return r;
};

/**
* @function ContextParserHandlebars._countNewLineChar
*
* @description
* Count the new line in the string.
*/
ContextParserHandlebars.prototype._countNewLineChar = function(str) {
    var noOfNewLineChar = (str.match(/\n/g) || []).length;
    return noOfNewLineChar;
};

/**
* @function ContextParserHandlebars.analyzeHTMLContext
*
* @description
* Analyze the execution context of the non-Handlebars HTML string. (HTML5 Context)
*/
ContextParserHandlebars.prototype.analyzeHTMLContext = function(stateObj, node) {
    var r = {
        output: '',
        stateObj: {}
    };

    /* clear the previous buffer */
    this._html5Parser.clearBuffer();

    /* set the internal state */
    this._html5Parser.setInternalState(stateObj);

    /* just for reporting. */
    this._html5Parser._charNo = node.startPos;

    /* analyze */
    this._html5Parser.contextualize(node.content);

    /* get the output string */
    r.output = this._html5Parser.getOutput();

    /* get the internal state */
    r.stateObj = this._html5Parser.getInternalState();

    return r;
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
    /* regular expression validation result */
    var re;
    /* error msg */
    var lineNo, exceptionObj;
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
                throw "Parsing error! Invalid raw block expression.";
            }

            /* handleRawBlock */
            debug("handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+stateObj.state);
            obj = this.handleRawBlock(input, i, true);
            /* advance the index pointer by 1 to the char after the last brace of expression. */
            return obj.index+1;

        } else if (input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '{') {
            handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
            re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
            if (re.result === false) {
                throw "Parsing error! Invalid raw expression.";
            }

            /* _handleRawExpression */
            debug("handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+stateObj.state);
            obj = this.consumeExpression(input, i, handlebarsExpressionType, true);
            /* advance the index pointer by 1 to the char after the last brace of expression. */
            return obj.index+1;

        } else if (input[i] === '{' && i+1<len && input[i+1] === '{') {
            // this is just for lookAhead, does not guarantee the valid expression.
            handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, i);
            switch (handlebarsExpressionType) {
                case handlebarsUtils.ESCAPE_EXPRESSION:
                    re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                    if (re.result === false) {
                        throw "Parsing error! Invalid escape expression.";
                    }

                    /* handleEscapeExpression */
                    debug("handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+stateObj.state);
                    obj = this.handleEscapeExpression(input, i, len, stateObj, true);
                    /* advance the index pointer by 1 to the char after the last brace of expression. */
                    return obj.index+1;

                case handlebarsUtils.PARTIAL_EXPRESSION:
                case handlebarsUtils.REFERENCE_EXPRESSION:
                    re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                    if (re.result === false) {
                        throw "Parsing error! Invalid partial/reference expression.";
                    }

                    /* consumeExpression */
                    debug("handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+stateObj.state);
                    obj = this.consumeExpression(input, i, handlebarsExpressionType, true);
                    /* advance the index pointer by 1 to the char after the last brace of expression. */
                    return obj.index+1;

                case handlebarsUtils.BRANCH_EXPRESSION:
                    throw "Parsing error! Unexpected {{[#|^].*}} expression.";
                case handlebarsUtils.BRANCH_END_EXPRESSION:
                    throw "Parsing error! Unexpected {{/.*}} expression.";
                case handlebarsUtils.ELSE_EXPRESSION:
                    throw "Parsing error! Unexpected {{else}} or {{^}} expression.";
                case handlebarsUtils.UNHANDLED_EXPRESSION:
                    throw "Parsing error! Unexpected expression.";
                case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                    // no need to validate the comment expression as the content inside are skipped.
                    /* consumeExpression */
                    debug("handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+stateObj.state);
                    obj = this.consumeExpression(input, i, handlebarsExpressionType, true);
                    /* advance the index pointer by 1 to the char after the last brace of expression. */
                    return obj.index+1;

                default:
                    throw "Parsing error! Unknown expression.";
            }
        } else {
            throw "Parsing error! Handlebars markup expected.";
        }
    } catch (exception) {
        if (typeof exception === 'string') {
            lineNo = this._countNewLineChar(input.slice(0, this._charNo));
            exceptionObj = new ContextParserHandlebarsException(
                '[ERROR] ContextParserHandlebars: ' + exception,
                lineNo, 
                this._charNo);
            handlebarsUtils.handleError(exceptionObj, true);
        } else {
            handlebarsUtils.handleError(exception, true);
        }
    }
};

/**
* @function ContextParserHandlebars.addFilters
*
* @description
* Add the filters to the escape expression based on the state.
*/
ContextParserHandlebars.prototype.addFilters = function(stateObj, input) {

    /* transitent var */
    var lineNo, isFullUri, f, filters, exceptionObj, msgPrefix,
        attributeName = stateObj.attributeName,
        attributeValue = stateObj.attributeValue;

    try {
        switch(stateObj.state) {
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
                    switch(stateObj.state) {
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
                    throw 'Unsafe output expression @ attribute on* Javascript context';
                } else {
                    /* add the attribute value filter */
                    switch(stateObj.state) {
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
                throw 'Unsafe output expression @ NOT HANDLE state:'+stateObj.state;
        }
    } catch (exception) {
        if (typeof exception === 'string') {
            lineNo = this._countNewLineChar(input.slice(0, this._charNo));
            this._config._strictMode? msgPrefix = '[ERROR] ContextParserHandlebars:' : msgPrefix = '[WARNING] ContextParserHandlebars';
            exceptionObj = new ContextParserHandlebarsException(
                msgPrefix + exception,
                lineNo,
                this._charNo);
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
    var lineNo, msg, exceptionObj, 
        len = input.length,
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
    lineNo = this._countNewLineChar(input.slice(0, this._charNo));
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter close brace of expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

/**
* @function ContextParserHandlebars.handleEscapeExpression
*
* @description
* Handle the escape expression.
*/
ContextParserHandlebars.prototype.handleEscapeExpression = function(input, i, len, stateObj, saveToBuffer) {
    var lineNo, msg, exceptionObj,
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
    lineNo = this._countNewLineChar(input.slice(0, this._charNo));
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of escape expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

/**
* @function ContextParserHandlebars.handleRawBlock
*
* @description
* Handle the raw block expression.
*/
ContextParserHandlebars.prototype.handleRawBlock = function(input, i, saveToBuffer) {
    var lineNo, msg, exceptionObj, 
        obj = {};
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
    lineNo = this._countNewLineChar(input.slice(0, this._charNo));
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}}}' close brace of raw block.";
    exceptionObj = new ContextParserHandlebarsException(msg, lineNo, this._charNo);
    handlebarsUtils.handleError(exceptionObj, true);
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();
