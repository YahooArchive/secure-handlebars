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
    debugDump = require('debug')('cph-dump'),
    debugBranch = require('debug')('cph-branching');

/* import the html context parser */
var contextParser = require('context-parser'),
    handlebarsUtils = require('./handlebars-utils.js'),
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

    /* the flag is used to print out the char to console */
    this._printChar = typeof printChar !== undefined? printChar : true;

    /* save the line number being processed */
    this._lineNo = 1;
    this._charNo = 1;

    debug("_printChar:"+this._printChar);
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

/* '{{' '~'? 'space'* ('not space{}~'+) 'space'* ('not {}~'*) '~'? greedy '}}' and not follow by '}' */
ContextParserHandlebars.expressionRegExp = /^\{\{~?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;

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

    var obj = {
            filter: '',
            isPrefixWithKnownFilter: false,
            isSingleIdentifier: false
        };

    var str = input.slice(i);
    var m = ContextParserHandlebars.expressionRegExp.exec(str);

    if (m !== null) {
        if (m[1] !== undefined && m[2] !== undefined) {
            if (m[1] === 'else') {
                obj.isSingleIdentifier = false;
                obj.isPrefixWithKnownFilter = true;
                return obj;
            }
            if (m[1] === '^' && m[2] === '') {
                obj.isSingleIdentifier = false;
                obj.isPrefixWithKnownFilter = true;
                return obj;
            }
            if (handlebarsUtils.isReservedChar(m[1], 0)) {
                obj.isSingleIdentifier = false;
                obj.isPrefixWithKnownFilter = false;
                return obj;
            }
            if (m[2] === '') {
                obj.isSingleIdentifier = true;
            } else {
                obj.filter = m[1];
                var k = this._knownFilters.indexOf(obj.filter);
                if (k !== -1) {
                    obj.isPrefixWithKnownFilter = true;
                }
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
* @param {string} expressionInfo - The extra information for filters judgement.
* @returns {Array} The Array of the customized filters.
*
* @description
* <p>This function returns the customized filter based on the current HTML5 state with additional data parsing.</p>
*
*/
ContextParserHandlebars.prototype._addFilters = function(state, input, expressionInfo) {

    /* transitent var */
    var e, f, msg;

    /* return filters */
    var filters = [];

    var attributeName = expressionInfo.attributeName,
        attributeValue = expressionInfo.attributeValue;

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
        handlebarsUtils.handleError(msg);
        return filters;
    // 6
    } else if (state === stateMachine.State.STATE_SCRIPT_DATA) {
        /* we use filter.FILTER_NOT_HANDLE to warn the developers for unsafe output expression,
        * and we fall back to default Handlebars 'h' filter. IT IS UNSAFE.
        */
        filters.push(filter.FILTER_NOT_HANDLE);
        msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg);
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
        handlebarsUtils.handleError(msg);
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
        if (handlebarsUtils.blacklistProtocol(attributeValue)) {
            filters.push(filter.FILTER_NOT_HANDLE);
            msg = "[WARNING] ContextParserHandlebars: Unsafe output expression. ["+this._lineNo+":"+this._charNo+"]";
            handlebarsUtils.handleError(msg);
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
        handlebarsUtils.handleError(msg);
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
        handlebarsUtils.handleError(msg);
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
        handlebarsUtils.handleError(msg);
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
    handlebarsUtils.handleError(msg);
    return filters;
};

/**********************************
* TEMPLATING HANDLING LOGIC
**********************************/

// consume the raw expression.
ContextParserHandlebars.prototype._handleRawExpression = function(input, i, len, state) {
    var msg;
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+2<len && input[j+1] === '}' && input[j+2] === '}') {
                this.printChar('}}}');
                /* advance the index pointer j to the char after the last brace of expression. */
                j=j+3;

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
    handlebarsUtils.handleError(msg, true);
};

// consume the escape expression.
ContextParserHandlebars.prototype._handleEscapeExpression = function(input, i, len, state) {
    var msg,
        str = '{{';

    /* parse expression */
    var extraExpressionInfo = this._parseExpression(input, i),
        isPrefixWithKnownFilter = extraExpressionInfo.isPrefixWithKnownFilter,
        filters = [];

    /* add filters if it is not prefix with known filter */
    if (!isPrefixWithKnownFilter) {
        /* we suppress the escapeExpression of handlebars by changing the {{expression}} into {{{expression}}} */
        str += '{';

        /* get the customized filter based on the current HTML5 state before the Handlebars template expression. */
        var expressionInfo = {
            'attributeName': this.getAttributeName(),
            'attributeValue': this.getAttributeValue(),
        };
        filters = this._addFilters(state, input, expressionInfo);
        for(var k=filters.length-1;k>=0;--k) {
            if (extraExpressionInfo.isSingleIdentifier && k === 0) {
                str += filters[k] + " ";
            } else {
                str += filters[k] + " (";
            }
        }
    }
    this.printChar(str);

    for(var j=i+2;j<len;++j) {
        if (input[j] === '}' && j+1 < len && input[j+1] === '}') {
            for(var l=filters.length-1;l>=0;--l) {
                if (extraExpressionInfo.isSingleIdentifier && l === 0) {
                } else {
                    this.printChar(')');
                }
            }

            /* advance the index pointer j to the char after the last brace of expression. */
            this.printChar('}}');
            j=j+2;

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
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of escape expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// consume the comment expression.
ContextParserHandlebars.prototype._handleCommentExpression = function(input, i, len, type) {
    var msg;
    for(var j=i;j<len;++j) {
        if (type === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM) {
            if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                this.printChar('--}}');
                /* advance the index pointer j to the char after the last brace of expression. */
                j=j+4;

                return j;
            }
        } else if (type === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
            if (input[j] === '}' && j+1<len && input[j+1] === '}') {
                this.printChar('}}');
                /* advance the index pointer j to the char after the last brace of expression. */
                j=j+2;

                return j;
            }
        }
        this.printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' or '--}}' close brace of comment expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// consume the expression with }} at the end
ContextParserHandlebars.prototype._handleExpression = function(input, i, len) {
    var msg;
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+1<len && input[j+1] === '}') {
            this.printChar('}}');
            /* advance the index pointer j to the char after the last brace of expression. */
            j=j+2;

            return j;
        }
        this.printChar(input[j]);
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of partial expression. ["+this._lineNo+":"+this._charNo+"]";
    handlebarsUtils.handleError(msg, true);
};

// consume the branching expression.
ContextParserHandlebars.prototype._handleBranchExpression = function(input, i, state) {
    var msg;
    try {
        var ast = this._buildBranchAst(input, i);
        var stateObj = this._getInternalState();
        var result = this._analyseBranchAst(ast, stateObj);

        /* print the output */
        this.printChar(result.output);

        /* advance the index pointer i to the char after the last brace of branching expression. */
        i = i+ast.index+1;
        this.state = result.lastStates[0].state;

        debug("_handleBranchTemplate: state:"+this.state+",i:"+i);
        return i;
    } catch (err) {
       msg = err + " ["+this._lineNo+":"+this._charNo+"]";
       handlebarsUtils.handleError(msg, true);
    }
};

// context analyze the string.
ContextParserHandlebars.prototype._analyzeContext = function(stateObj, str) {

    var r = {
        output: '',
        stateObj: {}
    };

    // TODO: refactor
    /* factory class */
    var parser,
        ContextParserHandlebars = require('./context-parser-handlebars');

    /* parse the string */
    parser = new ContextParserHandlebars(false);
    // set the internal state
    parser.tagNames = stateObj.tagNames;
    parser.tagNameIdx = stateObj.tagNameIdx;
    parser.setInitState(stateObj.state);
    parser.contextualize(str);

    r.output = parser.getBuffer().join('');
    // get the internal state
    r.stateObj.tagNames = parser.tagNames;
    r.stateObj.tagNameIdx = parser.tagNameIdx;
    r.stateObj.state = parser.state;

    return r;
};

// context analyze the data structure of logic template.
ContextParserHandlebars.prototype._analyseBranchAst = function(ast, stateObj) {
    var obj = {},
        len = ast.program.length;

    var r = {},
        t, msg;

    r.lastStates = [];
    r.lastStates[0] = stateObj;
    r.lastStates[1] = stateObj;
    r.output = '';
    
    var programDebugOutput = "", inverseDebugOutput = "";

    for(var i=0;i<len;++i) {
        obj = ast.program[i];
        if (obj.type === 'content') {
            debugBranch("_analyseBranchAst:program:content");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[0].state);
            debugBranch("_analyseBranchAst:content:["+obj.content+"]");

            t = this._analyzeContext(r.lastStates[0], obj.content);
            r.output += t.output;
            r.lastStates[0] = t.stateObj;
            programDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[0].state);
        } else if (obj.type === 'node') {
            debugBranch("_analyseBranchAst:program:node");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[0].state);

            t = this._analyseBranchAst(obj.content, r.lastStates[0]);
            r.lastStates[0] = t.lastStates[0]; // index 0 and 1 MUST be equal
            r.output += t.output;
            programDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[0].state);
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
            debugBranch("_analyseBranchAst:program:content");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[1].state);
            debugBranch("_analyseBranchAst:content:["+obj.content+"]");

            t = this._analyzeContext(r.lastStates[1], obj.content);
            r.output += t.output;
            r.lastStates[1] = t.stateObj;
            inverseDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[1].state);
        } else if (obj.type === 'node') {
            debugBranch("_analyseBranchAst:program:node");
            debugBranch("_analyseBranchAst:state:"+r.lastStates[1].state);

            t = this._analyseBranchAst(obj.content, r.lastStates[1]);
            r.lastStates[1] = t.lastStates[1]; // index 0 and 1 MUST be equal
            r.output += t.output;
            inverseDebugOutput += t.output;

            debugBranch("_analyseBranchAst:new state:"+r.lastStates[1].state);
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

    if (r.lastStates[0].state !== r.lastStates[1].state) {
        msg = "[ERROR] ContextParserHandlebars: Parsing error! Inconsitent HTML5 state after conditional branches. Please fix your template! \n";
        msg += "[ERROR] #if.. branch: " + programDebugOutput.slice(0, 50) + "... (state:"+r.lastStates[0].state+")\n";
        msg += "[ERROR] else branch: " + inverseDebugOutput.slice(0, 50) + "... (state:"+r.lastStates[1].state+")";
        handlebarsUtils.handleError(msg, true);
    }
    return r;
};

// build the data structure for processing logic template.
ContextParserHandlebars.prototype._buildBranchAst = function(input, i) {

    /* init the data structure */
    var ast = {};
    ast.program = [];
    ast.inverse = [];

    var str = input.slice(i),
        len = str.length;

    var sp = [],
        msg,
        content = '',
        inverse = false,
        obj = {},
        k,j,r = 0;

    for(j=0;j<len;++j) {
        var exp = handlebarsUtils.isValidExpression(str, j, handlebarsUtils.BRANCH_EXPRESSION).tag,
            endExpression = handlebarsUtils.isValidExpression(str, j, handlebarsUtils.BRANCH_END_EXPRESSION).tag;
        
        if (exp !== false) {
            /* encounter the first branch expression */
            if (sp.length === 0) {
                /* save the branch expression name */
                sp.push(exp);

                content = '';
                inverse = false;

                /* consume till the end of expression */
                r = this._consumeTillCloseBrace(str, j, len);
                j = r.index;
                obj = this._saveAstObject('branch', r.str);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

            } else {
                /* encounter another branch expression, save the previous string */
                obj = this._saveAstObject('content', content);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }
                content = '';

                r = this._buildBranchAst(str, j);
                obj = this._saveAstObject('node', r);
                j = j + r.index;
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }
            }
        } else if (handlebarsUtils.isValidExpression(str, j, handlebarsUtils.ELSE_EXPRESSION).result) {
            obj = this._saveAstObject('content', content);
            if (!inverse) {
                ast.program.push(obj);
            } else if (inverse) {
                ast.inverse.push(obj);
            }

            inverse = true;
            content = '';

            /* consume till the end of expression */
            r = this._consumeTillCloseBrace(str, j, len);
            j = r.index;
            obj = this._saveAstObject('branchelse', r.str);
            if (!inverse) {
                ast.program.push(obj);
            } else if (inverse) {
                ast.inverse.push(obj);
            }

        } else if (endExpression !== false) {
            var t = sp.pop();
            if (t === endExpression) {
                obj = this._saveAstObject('content', content);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

                /* consume till the end of expression */
                r = this._consumeTillCloseBrace(str, j, len);
                j = r.index;
                obj = this._saveAstObject('branchend', r.str);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

                break;
            } else {
                /* broken template as the end expression does not match, throw exception before function returns */
                msg = "[ERROR] ContextParserHandlebars: Template expression mismatch (startExpression:"+t+"/endExpression:"+endExpression+")";
                handlebarsUtils.handleError(msg, true);
            }
        } else {
            var expressionType = handlebarsUtils.getExpressionType(str, j, len);
            if (expressionType === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM ||
                expressionType === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
                /* capturing the string till the end of comment */
                r = this._consumeTillCommentCloseBrace(str, j, len, expressionType);
                j = r.index;
                content += r.str;
            } else {
                /* capturing the string */
                content += str[j];    
            }
        }
    }

    if (sp.length > 0) {
        /* throw error on the template */
        msg = "[ERROR] ContextParserHandlebars: Template does not have balanced branching expression.";
        handlebarsUtils.handleError(msg, true);
    }

    ast.index = j;
    return ast;
};

// @function ContextParserHandlebars._getInternalState
ContextParserHandlebars.prototype._getInternalState = function() {
    var stateObj = {};
    // stateObj.bytes = this.bytes;
    stateObj.state = this.state;
    // stateObj.states = this.states;
    // stateObj.contexts = this.contexts;
    // stateObj.buffer = this.buffer;
    // stateObj.symbols = this.symbols;
    stateObj.tagNames = this.tagNames;
    stateObj.tagNameIdx = this.tagNameIdx;
    // stateObj.attributeName = this.attributeName;
    // stateObj.attributeValue = this.attributeValue;
    return stateObj;
};

// @function ContextParserHandlebars._saveAstObject
ContextParserHandlebars.prototype._saveAstObject = function(type, content) {
    var obj = {};
    obj.type = type;
    obj.content = content;
    return obj;
};

// @function ContextParserHandlebars._consumeTillCloseBrace
ContextParserHandlebars.prototype._consumeTillCloseBrace = function(input, i, len) {
    var msg, 
        str = '',
        obj = {};
    for(var j=i;j<len;++j) {
        if (input[j] === '}' && j+1 < len && input[j+1] === '}') {
            str += '}}';
            j++;
            obj.index = j;
            obj.str = str;
            return obj;
        }
        str += input[j];
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' close brace of expression.";
    handlebarsUtils.handleError(msg, true);
};

// @function ContextParserHandlebars._consumeTillCommentCloseBrace
ContextParserHandlebars.prototype._consumeTillCommentCloseBrace = function(input, i, len, type) {
    var msg, 
        str = '',
        obj = {};
    for(var j=i;j<len;++j) {
        if (type === handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM) {
            if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                str += '--}}';
                j=j+3;
                obj.index = j;
                obj.str = str;
                return obj;
            }
        } else if (type === handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
            if (input[j] === '}' && j+1<len && input[j+1] === '}') {
                str += '}}';
                j++;
                obj.index = j;
                obj.str = str;
                return obj;
            }
        }
        str += input[j];
    }
    msg = "[ERROR] ContextParserHandlebars: Parsing error! Cannot encounter '}}' or '--}}' close brace of comment expression.";
    handlebarsUtils.handleError(msg, true);
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
    /* the length of the input */
    var len = input.length;

    /* regular expression validation result */
    var re;
    /* error msg */
    var msg;

    /* Handlebars expression type */
    var handlebarsExpressionType = handlebarsUtils.NOT_EXPRESSION; 

    /* handling different type of expression */
    if (ch === '{' && i+3 < len && input[i+1] === '{' && input[i+2] === '{' && input[i+3] === '{') {
        msg = "[ERROR] ContextParserHandlebars: Not yet support RAW BLOCK! ["+this._lineNo+":"+this._charNo+"]";
        handlebarsUtils.handleError(msg, true);
    } else if (ch === '{' && i+2 < len && input[i+1] === '{' && input[i+2] === '{') {
        handlebarsExpressionType = handlebarsUtils.RAW_EXPRESSION;
        re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
        if (re.result === false) {
            msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid raw expression. ["+this._lineNo+":"+this._charNo+"]";
            handlebarsUtils.handleError(msg, true);
        }

        /* for printCharWithState */
        this.bytes[index+1] = ch;
        this.symbols[index+1] = this.lookupChar(ch);
        this.states[index+1] = state;

        /* _handleRawExpression */
        debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
        return this._handleRawExpression(input, i, len, state);
    } else if (ch === '{' && i+1 < len && input[i+1] === '{') {
        // this type may not be 100% correct (the case is BRANCH_EXPRESSION), so it need the isValidExpression call below.
        handlebarsExpressionType = handlebarsUtils.getExpressionType(input, i, len);
        switch (handlebarsExpressionType) {
            case handlebarsUtils.ESCAPE_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid escape expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }

                /* for printCharWithState */
                this.bytes[index+1] = ch;
                this.symbols[index+1] = this.lookupChar(ch);
                this.states[index+1] = state;

                /* _handleEscapeExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleEscapeExpression(input, i, len, state);

            case handlebarsUtils.PARTIAL_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid partial expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }
                /* _handleExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleExpression(input, i, len);

            case handlebarsUtils.DATA_VAR_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid data var expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }
                /* _handleExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleExpression(input, i, len);

            case handlebarsUtils.BRANCH_EXPRESSION:
                re = handlebarsUtils.isValidExpression(input, i, handlebarsExpressionType);
                if (re.result === false) {
                    msg = "[ERROR] ContextParserHandlebars: Parsing error! Invalid branch expression. ["+this._lineNo+":"+this._charNo+"]";
                    handlebarsUtils.handleError(msg, true);
                }
                /* _handleBranchExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleBranchExpression(input, i, state);

            case handlebarsUtils.BRANCH_END_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{/.*}} expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtils.handleError(msg, true);
                break;

            case handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
                // no need to validate the comment expression as the content inside are skipped.
                /* _handleCommentExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleCommentExpression(input, i, len, handlebarsExpressionType);

            case handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
                // no need to validate the comment expression as the content inside are skipped.
                /* _handleCommentExpression */
                debug("_handleTemplate:LOGIC#1:handlebarsExpressionType:"+handlebarsExpressionType,",i:"+i);
                return this._handleCommentExpression(input, i, len, handlebarsExpressionType);

            case handlebarsUtils.ELSE_EXPRESSION:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unexpected {{else}} or {{^}} expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtils.handleError(msg, true);
                break;

            default:
                msg = "[ERROR] ContextParserHandlebars: Parsing error! Unknown expression. ["+this._lineNo+":"+this._charNo+"]";
                handlebarsUtils.handleError(msg, true);
                break;
        }
    } else {
        /* return immediately for non template start char '{' */
        return index;
    }
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
