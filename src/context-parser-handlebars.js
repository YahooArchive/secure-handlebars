/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*jshint -W030 */
/*jshint -W083 */
(function () {
"use strict";

/* import the required package */
var handlebarsUtils = require('./handlebars-utils.js'),
    parserUtils = require('./parser-utils.js'),
    cssParserUtils = require('./css-utils.js');

var stateMachine = parserUtils.StateMachine,
    ContextParser = parserUtils.Parser;

var HtmlDecoder = require("html-decoder");

var filterMap = handlebarsUtils.filterMap;

// https://github.com/yahoo/secure-handlebars/blob/master/src/handlebars-utils.js#L76
// TODO: double check the case of allowing \/
var rePartialPattern = /^(\{\{~?>\s*)([^\s!"#%&'\(\)\*\+,\.;<=>@\[\\\]\^`\{\|\}\~]+)(.*)/,
    // reSJSTPartialSignature = /^SJST\/(?:\d+|SKIP)\//;
    reSJSTPartialSignature = /^SJST\/\d+\//;

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
function ContextParserHandlebarsException(msg, filePath, lineNo, charNo) {
    this.msg = msg;
    this.filePath = filePath;
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
    config.shbsPartialsCache || (config.shbsPartialsCache = {});

    /* reset the internal */
    this.reset(config.processingFile);

    /* the configuration of ContextParserHandlebars */
    this._config = {};

    /* the flag is used to print out the char to console, defaulted to true */
    this._config._printCharEnable = (config.printCharEnable !== false);

    /* the flag is used to strict mode of handling un-handled state, defaulted to false */
    this._config._strictMode = (config.strictMode === true);

    /* the flags are used to set to dis/enable partial processing, defaulted to false */
    this._config._enablePartialProcessing = config.shbsPartialsCache.raw !== undefined;

    /* the flags is used for setting the partial handling */
    this._config._enablePartialCombine = (config.enablePartialCombine === true);

    /* this flag is used for preventing infinite lookup of partials */
    this._config._maxPartialDepth = parseInt(config.maxPartialDepth) || 10;

    /* internal file cache */
    this._config._rawPartialsCache = config.shbsPartialsCache.raw || {};

    /* expose the processed partial cache */
    this._config._processedPartialsCache = config.shbsPartialsCache.preprocessed || {};
}


/**
* @function ContextParserHandlebars.reset
*
* @description
* All non-config internal variables are needed to reset!
*/
ContextParserHandlebars.prototype.reset = function(filePath) {
    /* save the processed char */
    this._buffer = [];

    this._partials = [];

    /* save the char/line no being processed */
    this._charNo = 0;
    this._lineNo = 1;
    this._filePath = filePath || '';

    /* context parser for HTML5 parsing */
    this.contextParser = parserUtils.getParser();
};

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
ContextParserHandlebars.prototype.analyzeContext = function(input, options) {
    options || (options = {});

    // the last parameter is the hack till we move to LR parser
    var ast = this.buildAst(input, 0, []),
        r = this.analyzeAst(ast, options.contextParser || this.contextParser, 0);
    
    if (this._config._printCharEnable && typeof process === 'object') {
        options.disablePrintChar || process.stdout.write(r.output);
    }

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
    var handlebarsExpressionType;

    try {
        for(j=i;j<len;++j) {

            /* distinguish the type */
            handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION; 

            if (input[j] === '{' && input[j+1] === '{') {
                if (input[j+2] === '{') { 
                    // 4 braces are encountered
                    if (input[j+3] === '{') {
                        handlebarsExpressionType = handlebarsUtils.RAW_BLOCK;
                    } 
                    // 3 braces are encountered
                    else {
                        handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
                    }
                }
                // 2 braces are encountered
                else {
                    var escapedMustache = handlebarsUtils.lookBackTest(input, j);
                    if (escapedMustache === handlebarsUtils.NOT_ESCAPED_MUSTACHE ||
                        escapedMustache === handlebarsUtils.DOUBLE_ESCAPED_MUSTACHE
                        ) {
                        handlebarsExpressionType = handlebarsUtils.lookAheadTest(input, j);
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
                    nodeObj = this.generateNodeObject(handlebarsUtils.AST_HTML, content, startPos);
                    inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
                    content = '';
                }

                switch (handlebarsExpressionType) {
                    case handlebarsUtils.RAW_BLOCK:
                        /* handleRawBlock */
                        startPos = j;
                        obj = this.handleRawBlock(input, j, false);
                        endPos = j = obj.index;
                        nodeObj = this.generateNodeObject(handlebarsExpressionType, obj.str, startPos);
                        inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
                 
                        break;
                    case handlebarsUtils.ELSE_EXPRESSION:
                        /* inverse */
                        inverse = true;

                        /* consumeExpression */
                        startPos = j;
                        obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                        endPos = j = obj.index;
                        nodeObj = this.generateNodeObject(handlebarsExpressionType, obj.str, startPos);
                        inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);

                        break;
                    case handlebarsUtils.BRANCH_EXPRESSION:

                        if (sp.length === 0 || buildNode) {
                            /* buildAst recursively */
                            startPos = j;
                            obj = this.buildAst(input, j, [re.tag]);
                            endPos = j = obj.index;
                            nodeObj = this.generateNodeObject(handlebarsUtils.AST_NODE, obj, startPos);
                            inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
                        } else {
                            /* consumeExpression */
                            startPos = j;
                            obj = this.consumeExpression(input, j, handlebarsExpressionType, false);
                            endPos = j = obj.index;
                            nodeObj = this.generateNodeObject(handlebarsExpressionType, obj.str, startPos);
                            inverse? ast.right.push(nodeObj) : ast.left.push(nodeObj);
                            buildNode = true;
                        }

                        break;
                    case handlebarsUtils.RAW_EXPRESSION:
                    case handlebarsUtils.ESCAPE_EXPRESSION:
                    case handlebarsUtils.PARTIAL_EXPRESSION:
                    case handlebarsUtils.AMPERSAND_EXPRESSION:
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
                        nodeObj = this.generateNodeObject(handlebarsExpressionType, obj.str, startPos);
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
                this._filePath,
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
        nodeObj = this.generateNodeObject(handlebarsUtils.AST_HTML, content, startPos);
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
        var j = 0, len = tree.length, node, 
            re, partialName, enterState, partialContent;

        for (; j < len; j++) {
            node = tree[j];

            if (node.type === handlebarsUtils.AST_HTML) {
                
                output += parser.contextualize(node.content);

            } else if (node.type === handlebarsUtils.ESCAPE_EXPRESSION ||
                node.type === handlebarsUtils.RAW_EXPRESSION) {

                // lookupStateForHandlebarsOpenBraceChar from current state before handle it
                parser.state = ContextParserHandlebars.lookupStateForHandlebarsOpenBraceChar[parser.state];
                this.clearBuffer();
                this.handleEscapeAndRawTemplate(node.content, 0, parser);
                output += this.getOutput();

            } else if (node.type === handlebarsUtils.AST_NODE) {
                
                t = this.analyzeAst(node.content, parser, node.startPos);
                parser.cloneStates(t.parser);

                output += t.output;

            // TODO: we support basic partial only, need to enhance it.
            // http://handlebarsjs.com/partials.html
            } else if (node.type === handlebarsUtils.PARTIAL_EXPRESSION && 
                (re = handlebarsUtils.isValidExpression(node.content, 0, node.type)) && 
                (partialName = re.tag)) {

                // if the partialName is generated by us, there is no need to reprocess it again,
                // just put back the partial expression is fine
                if (reSJSTPartialSignature.test(partialName)) {
                    output += node.content;
                    continue;
                }

                partialContent = this._config._rawPartialsCache[partialName];

                if (this._config._enablePartialProcessing && typeof partialContent === 'string') {

                    this._partials.push(node.content);

                    if (this._partials.length >= this._config._maxPartialDepth) {
                        msg = "[ERROR] SecureHandlebars: The partial inclusion chain (";
                        msg += this._partials.join(' > ') + ") has exceeded the maximum number of allowed depths (maxPartialDepth: "+this._config._maxPartialDepth+").";
                        msg += "\nPlease follow this URL to resolve - https://github.com/yahoo/secure-handlebars#warnings-and-workarounds";
                        exceptionObj = new ContextParserHandlebarsException(msg, this._filePath, this._lineNo, this._charNo);
                        handlebarsUtils.handleError(exceptionObj, true);
                    }

                    // get the html state number right the parital is called, and analyzed
                    enterState = parser.getCurrentState();

                    // TODO: this._filePath now does not reflect an error that occurs inside a partial, need to enhance it later
                    // while analyzing the partial, use the current parser (possibly forked) and disable printChar
                    partialContent = this.analyzeContext(partialContent, {
                        contextParser: parser,
                        disablePrintChar: true
                    });

                    if (this._config._enablePartialCombine) {
                        output += partialContent;
                    } else {
                        partialName = 'SJST/' + enterState + '/' + partialName;
                
                        // rewrite the partial name, that is prefixed with the in-state
                        output += node.content.replace(rePartialPattern, function(m, p1, p2, p3) {
                            return p1 + partialName + p3;
                        });

                        this._config._processedPartialsCache[partialName] = partialContent;
                    }

                    this._partials.pop();
                    
                } else {

                    output += node.content; // this._config._strictMode=true will throw

                    msg = (this._config._strictMode? '[ERROR]' : '[WARNING]') + " SecureHandlebars: ";

                    if (this._config._enablePartialProcessing) {
                        
                        msg += (partialContent === undefined) ?
                            "Failed to load the partial content of " :
                            "Failed to perform contextual analysis over (pre-)compiled partial ";
                        
                    } else {

                        // No matter a partial expression is placed in a data state, we don't know whether the partial content end in DATA state, so warn the user
                        // if (parser.getCurrentState() !== stateMachine.State.STATE_DATA) {
                        //     msg += node.content + ' is placed in a non-text context.';
                        // }
                        
                        msg += 'Please enable contextual analysis over the partial content of ';
                    }

                    msg += node.content;

                    msg += "\nPlease follow this URL to resolve - https://github.com/yahoo/secure-handlebars#warnings-and-workarounds";
                    exceptionObj = new ContextParserHandlebarsException(msg, this._filePath, this._lineNo, this._charNo);
                    handlebarsUtils.handleError(exceptionObj, this._config._strictMode);

                }
                
            // TODO: content inside RAW_BLOCK should be analysed too
            } else if (node.type === handlebarsUtils.RAW_BLOCK ||
                node.type === handlebarsUtils.AMPERSAND_EXPRESSION) {

                // if the 'rawblock' and 'ampersand expression' are not in Data State, 
                // we should warn the developers or throw exception in strict mode
                if (parser.getCurrentState() !== stateMachine.State.STATE_DATA) {
                    msg = (this._config._strictMode? '[ERROR]' : '[WARNING]') + " SecureHandlebars: " + node.content + ' is placed in a non-text context!';
                    msg += "\nPlease follow this URL to resolve - https://github.com/yahoo/secure-handlebars#warnings-and-workarounds";
                    exceptionObj = new ContextParserHandlebarsException(msg, this._filePath, this._lineNo, this._charNo);
                    handlebarsUtils.handleError(exceptionObj, this._config._strictMode);
                }

                output += node.content;
            } else if (node.type === handlebarsUtils.BRANCH_EXPRESSION ||
                node.type === handlebarsUtils.BRANCH_END_EXPRESSION ||
                node.type === handlebarsUtils.ELSE_EXPRESSION ||
                node.type === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM ||
                node.type === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM) {
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
        exceptionObj = new ContextParserHandlebarsException(msg, this._filePath, this._lineNo, this._charNo);
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
    attributeValue === null && (attributeValue = '');

    try {

        switch(state) {
            case stateMachine.State.STATE_DATA: // 1
            case stateMachine.State.STATE_RCDATA: // 3
                return [filterMap.DATA];

            case stateMachine.State.STATE_RAWTEXT:  // 5
                // inside raw text state, HTML parser ignores any state change that looks like tag/attribute
                // hence we apply the context-insensitive NOT_HANDLE filter that escapes '"`&<> without a warning/error
                if (tagName === 'xmp' || tagName === 'noembed' || tagName === 'noframes') {
                    return [filterMap.NOT_HANDLE];
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
                        f = filterMap.FULL_URI;
                    } else {
                        f = reEqualSign.test(attributeValue) ? filterMap.ENCODE_URI_COMPONENT : filterMap.ENCODE_URI;
                    }
                    filters.push(f);                    
                    
                } else if (parser.getAttributeNameType() === ContextParser.ATTRTYPE_CSS) { // CSS
                    var r;
                    try {
                        attributeValue = HtmlDecoder.decode(attributeValue);
                        r = cssParserUtils.parseStyleAttributeValue(attributeValue);
                    } catch (e) {
                        throw 'unsupported position of style attribute (e.g., <div style="{{output}}:red;", being as the key instead of value. )';
                    }
                    switch(r.code) {
                        case cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED:
                            filters.push(filterMap.ATTRIBUTE_VALUE_STYLE_EXPR_URL_UNQUOTED);
                            isFullUri = true;
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED:
                            filters.push(filterMap.ATTRIBUTE_VALUE_STYLE_EXPR_URL_SINGLE_QUOTED);
                            isFullUri = true;
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED:
                            filters.push(filterMap.ATTRIBUTE_VALUE_STYLE_EXPR_URL_DOUBLE_QUOTED);
                            isFullUri = true;
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED:
                            filters.push(filterMap.ATTRIBUTE_VALUE_STYLE_EXPR_UNQUOTED);
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED:
                            filters.push(filterMap.ATTRIBUTE_VALUE_STYLE_EXPR_SINGLE_QUOTED);
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED:
                            filters.push(filterMap.ATTRIBUTE_VALUE_STYLE_EXPR_DOUBLE_QUOTED);
                            break;
                        case cssParserUtils.STYLE_ATTRIBUTE_ERROR:
                            throw 'unsupported position of style attribute (e.g., <div style="{{output}}:red;", being as the key instead of value. )';
                    }

                    /* add the attribute value filter */
                    switch(state) {
                        case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                            f = filterMap.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                            break;
                        case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                            f = filterMap.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                            break;
                        default: // stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                            f = filterMap.ATTRIBUTE_VALUE_UNQUOTED;
                            break;
                    }
                    filters.push(f);

                    /* add blacklist filters at the end of filtering chain */
                    if (isFullUri) {
                        /* blacklist the URI scheme for full uri */
                        filters.push(filterMap.URI_SCHEME_BLACKLIST);
                    }
                    return filters;

                } else if (parser.getAttributeNameType() === ContextParser.ATTRTYPE_SCRIPTABLE) { // JS
                    /* we don't support js parser yet
                    * we use filterMap.NOT_HANDLE to warn the developers for unsafe output expression,
                    * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
                    */
                    throw attributeName + ' JavaScript event attribute';
                }


                /* add the attribute value filter */
                switch(state) {
                    case stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED:
                        f = filterMap.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
                        break;
                    case stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED:
                        f = filterMap.ATTRIBUTE_VALUE_SINGLE_QUOTED;
                        break;
                    default: // stateMachine.State.STATE_ATTRIBUTE_VALUE_UNQUOTED:
                        f = filterMap.ATTRIBUTE_VALUE_UNQUOTED;
                }
                filters.push(f);

                /* add blacklist filters at the end of filtering chain */
                if (isFullUri) {
                    /* blacklist the URI scheme for full uri */
                    filters.push(filterMap.URI_SCHEME_BLACKLIST);
                }
                return filters;
            

            case stateMachine.State.STATE_COMMENT: // 48
                return [filterMap.COMMENT];


            /* the following are those unsafe contexts that we have no plans to support (yet?)
             * we use filterMap.NOT_HANDLE to warn the developers for unsafe output expression,
             * and we fall back to default Handlebars escaping filter. IT IS UNSAFE.
             */
            case stateMachine.State.STATE_TAG_NAME: // 10
                throw 'being a tag name (i.e., TAG_NAME state)';
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
                throw 'SCRIPT_DATA state';
            
            // should not fall into the following states
            case stateMachine.State.STATE_BEFORE_ATTRIBUTE_VALUE: // 37
                throw 'unexpectedly BEFORE_ATTRIBUTE_VALUE state';

            default:
                throw 'unsupported position (i.e., state #: ' + state + ')';
        }
    } catch (exception) {

        if (typeof exception === 'string') {

            errorMessage = (this._config._strictMode? '[ERROR]' : '[WARNING]') + ' SecureHandlebars: Unsafe output expression ' + input + ' found at ';

            // To be secure, scriptable tags when encountered will anyway throw an error/warning
            // they require either special parsers of their own context (e.g., CSS/script parsers) 
            //    or an application-specific whitelisted url check (e.g., <script src=""> with yubl-yavu-yufull is not enough)
            errorMessage += handlebarsUtils.isScriptableTag(tagName) ? 'scriptable <' + tagName + '> tag' : exception;
            errorMessage += "\nPlease follow this URL to resolve - https://github.com/yahoo/secure-handlebars#warnings-and-workarounds";

            exceptionObj = new ContextParserHandlebarsException(errorMessage, this._filePath, this._lineNo, this._charNo);
            handlebarsUtils.handleError(exceptionObj, this._config._strictMode);
        } else {
            handlebarsUtils.handleError(exception, this._config._strictMode);
        }
        return [filterMap.NOT_HANDLE];
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
            case handlebarsUtils.AMPERSAND_EXPRESSION:
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
    throw "Parsing error! Cannot encounter close brace of expression.";
};

/**
* @function ContextParserHandlebars.handleEscapeAndRawTemplate
*
* @description
* Handle the Handlebars template. (Handlebars Template Context)
*/
ContextParserHandlebars.prototype.handleEscapeAndRawTemplate = function(input, i, parser) {

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
                    obj = this.handleEscapeExpression(input, i, len, parser, true);
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
                this._filePath,
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
ContextParserHandlebars.prototype.handleEscapeExpression = function(input, i, len, parser, saveToBuffer) {
    var msg, exceptionObj,
        obj = {}, filters, re;

    obj.str = '';

    saveToBuffer ? this.saveToBuffer('{{') : obj.str += '{{';
    /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
    saveToBuffer ? this.saveToBuffer('{') : obj.str += '{';

    /* parse expression */
    re = handlebarsUtils.isValidExpression(input, i, handlebarsUtils.ESCAPE_EXPRESSION);

    /* add the private filters according to the contextual analysis. 
     * no existing filters customized by developers will be found here */
    filters = this.addFilters(parser, input);

    /* if any of the provided manual filters is used as the last helper of an output expression,
     *    and it is residing in a dbl/sgl-quoted attr
     * then, insert the ampersand filter (ya) to 'html encode' the value 
     */
    if (re.isSingleID === false && re[1] &&
       (parser.getCurrentState() === stateMachine.State.STATE_ATTRIBUTE_VALUE_DOUBLE_QUOTED ||
        parser.getCurrentState() === stateMachine.State.STATE_ATTRIBUTE_VALUE_SINGLE_QUOTED)
    ) {
        var friendsFilters = handlebarsUtils.mFilterList,
            m, ll = friendsFilters.length;
        for(m=0; m<ll; ++m) {
            if (friendsFilters[m] === re[1]) {
                filters.unshift(filterMap.AMPERSAND);
                break;
            }
        }
    }

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
    msg = "[ERROR] SecureHandlebars: Parse error! Cannot encounter '}}' close brace of escape expression.";
    exceptionObj = new ContextParserHandlebarsException(msg, this._filePath, this._lineNo, this._charNo);
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
                throw "Parsing error! Invalid raw end block expression.";
            }
            if (re.tag !== tag) {
                throw "Parsing error! start/end raw block name mismatch.";
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
    throw "Parsing error! Cannot encounter '}}}}' close brace of raw block.";
};

/* exposing it */
module.exports = ContextParserHandlebars;

})();
