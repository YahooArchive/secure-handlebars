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

/* import the required package */
var ContextParser = require('./strict-context-parser.js'),
    handlebarsUtils = require('./handlebars-utils.js'),
    stateMachine = require('context-parser').StateMachine;

var cssParserUtils = require('./css-utils.js');

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

    /* the flag is used to print out the char to console */
    this._config._printCharEnable = config.printCharEnable === undefined ? true : config.printCharEnable;

    /* the flag is used to strict mode of handling un-handled state */
    this._config._strictMode = config.strictMode === undefined ? false: config.strictMode;

    /* save the char/line no being processed */
    this._charNo = 0;
    this._lineNo = 1;

    /* context parser for HTML5 parsing */
    this.contextParser = new ContextParser(config);
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
                    handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, j);
                    // 'expression' is the default handlebarsExpressionTypeName
                    handlebarsExpressionTypeName = handlebarsExpressionType === handlebarsUtils.ESCAPE_EXPRESSION ? 'escapeexpression'
                        : handlebarsExpressionType === handlebarsUtils.BRANCH_EXPRESSION ? 'branchstart' 
                        : handlebarsExpressionType === handlebarsUtils.ELSE_EXPRESSION ? 'branchelse' 
                        : handlebarsExpressionType === handlebarsUtils.BRANCH_END_EXPRESSION ? 'branchend' 
                        : 'expression';
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
        t, msg, exceptionObj, debugString = [];

    this._charNo = charNo;

    function consumeAstNode (tree, parser) {
        /*jshint validthis: true */

        for (var j = 0, len = tree.length, node; j < len; j++) {
            node = tree[j];

            if (node.type === 'html') {
                
                output += parser.parsePartial(node.content);

            } else if (node.type === 'escapeexpression' ||
                node.type === 'rawexpression') {

                // lookupStateForHandlebarsOpenBraceChar from current state before handle it
                parser.setCurrentState(ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[parser.state]);
                this.clearBuffer();
                this.handleTemplate(node.content, 0, parser);
                output += this.getOutput();

            } else if (node.type === 'node') {
                
                t = this.analyzeAst(node.content, parser, node.startPos);
                // cloning states from the branches
                parser.state = t.parser.state;
                parser.attributeName = t.parser.attributeName;
                parser.attributeValue = t.parser.attributeValue;

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
        // debug("analyzeAst:["+r.parsers[0].state+"/"+r.parsers[1].state+"]");
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
* @function ContextParserHandlebars.handleTemplate
*
* @description
* Handle the Handlebars template. (Handlebars Template Context)
*
* TODO: the function handleTemplate does not need to handle other expressions
* except RAW_EXPRESSION and ESCAPE_EXPRESSION anymore, we can safely remove it
* when the code is stable.
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
            debug("handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+stateObj.state);
            obj = this.consumeExpression(input, i, handlebarsExpressionType, true);
            return;
        } else if (input[i] === '{' && i+1<len && input[i+1] === '{') {
            // this is just for lookAhead, does not guarantee the valid expression.
            handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, i);
            switch (handlebarsExpressionType) {
                case handlebarsUtils.ESCAPE_EXPRESSION:
                    /* handleEscapeExpression and no validation need, it is safe guard in buildAst function */
                    debug("handleTemplate:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i+",state:"+stateObj.state);
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
        attributeName = parser.attributeName,
        attributeValue = parser.attributeValue;

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
                    // TODO: this filtering rule cannot cover all cases.
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

                    attributeValue = cssParserUtils.htmlStyleAttributeValueEntitiesDecode(attributeValue);
                    var r = cssParserUtils.parseStyleAttributeValue(attributeValue);
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


            // the following will be caught by parser.isScriptableTag() anyway
            // case stateMachine.State.STATE_SCRIPT_DATA: // 6
            //     throw 'inside <script> tag (i.e., SCRIPT_DATA state)';
            

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
            errorMessage += parser.isScriptableTag() ? 'scriptable <' + tagName + '> tag' : exception;

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
