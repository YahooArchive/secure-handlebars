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
var debugBranch = require('debug')('cph-branching');

/**
* @class HandlebarsUtils
* @static
*/
var HandlebarsUtils = {};

/* vanilla Handlebars */
var Handlebars = require("handlebars");

/**
* @function HandlebarsUtils.generateNonce
*
* @static
*
* @returns {string} A random string in the length of 5 (10000 combinations).
*
* @description
* <p>This function generates a random string for masking double open/close brace to simplify AST construction.</p>
*
*/
HandlebarsUtils.generateNonce = function() {
    var nonce = "";
    /* this char set must be non-template reserved char set */
    var str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    var l = str.length;
    for(var i=0;i<5;i++) {
        nonce += str.charAt(Math.floor(Math.random()*l));
    }
    return nonce;
};

/* type of expression */
HandlebarsUtils.NOT_EXPRESSION = 0;
HandlebarsUtils.RAW_EXPRESSION = 1; // {{{expression}}}
HandlebarsUtils.ESCAPE_EXPRESSION = 2; // {{expression}}
HandlebarsUtils.BRANCH_EXPRESSION = 3; // {{#.*}}, {{^.*}}
HandlebarsUtils.BRANCH_END_EXPRESSION = 4; // {{/.*}}
HandlebarsUtils.PARTIAL_EXPRESSION = 5; // {{>.*}}
HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM = 6; // {{!--.*--}}
HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM = 7; // {{!.*}}
HandlebarsUtils.DATA_VAR_EXPRESSION = 8; // {{@.*}}
HandlebarsUtils.ELSE_EXPRESSION = 9; // {{else}}, {{^}}
HandlebarsUtils.RAW_BLOCK = 10; // {{{{block}}}}

/* '{{' 'non-{,non-}'+ '}}' and not follow by '}' */
HandlebarsUtils.escapeExpressionRegExp = /^\{\{~?[^\}\{]+?\}\}(?!})/;
/* '{{{' 'non-{,non-}'+ '}}}' and not follow by '}' */
HandlebarsUtils.rawExpressionRegExp = /^\{\{\{~?[^\}\{]+?\}\}\}(?!})/;

// need to capture the first non-whitespace string
/* '{{' '# or ^' 'space'* 'non-space,non-},non-{'+ first-'space or }' */
HandlebarsUtils.branchExpressionRegExp = /^\{\{~?[#|\\^]\s*([^\s\}\{]+)?[\s\}]/;
/* '{{' '/' 'space'* 'non-space,non-},non-{'+ first-'space or }' */
HandlebarsUtils.branchEndExpressionRegExp = /^\{\{~?\/\s*([^\s\}\{]+)?[\s\}]/;

/* '{{>' 'non-{,non-}'+ '}}' and not follow by '}' */ /* NOT BEING USED YET */
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?>[^\}\{]+?\}\}(?!})/;

/* '{{!--' 'non-{,non-}'+ '--}}' and not follow by '}' */ /* NOT BEING USED YET */
HandlebarsUtils.commentExpressionLongRegExp = /^\{\{~?!--[^\}\{]+?--\}\}(?!})/;
/* '{{!' 'non-{,non-}'+ '}}' and not follow by '}' */ /* NOT BEING USED YET */
HandlebarsUtils.commentExpressionShortRegExp = /^\{\{~?!--[^\}\{]+?--\}\}(?!})/;

/* '{{@' 'non-{,non-}'+ '}}' and not follow by '}' */ /* NOT BEING USED YET */
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?@[^\}\{]+?\}\}(?!})/;

/* '{{' 'space'* 'else or ^' 'space'* '~'? '}}' and not follow by '}' */
HandlebarsUtils.elseExpressionRegExp = /^\{\{~?\s*else\s*~?\}\}(?!})/;
HandlebarsUtils.elseShortFormExpressionRegExp = /^\{\{~?\s*\^{1}\s*~?\}\}(?!})/;

/* '{{{{' 'non-{,non-}'+ '}}}}' and not follow by '}' */
HandlebarsUtils.rawBlockRegExp = /^\{\{\{\{~?[^\}\{]+?\}\}\}\}(?!})/;

/**
* @function HandlebarsUtils.getExpressionType
*
* @static
*
* @param {string} input - The input string of the HTML5 web page.
* @param {integer} i - The current index of the input string.
* @param {integer} len - The max len of the input.
* @returns {integer} The expression type.
* *
* @description
* <p>this method is to judge the type of expression</p>
*
*/
HandlebarsUtils.getExpressionType = function(input, i, len) {
    if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '#') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '#') 
    ) {
        return HandlebarsUtils.BRANCH_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '^') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '^') 
    ) {
        return HandlebarsUtils.BRANCH_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '/') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '/') 
    ) {
        return HandlebarsUtils.BRANCH_END_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '>') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '>') 
    ) {
        return HandlebarsUtils.PARTIAL_EXPRESSION;
    } else if ((input[i] === '{' && i+4<len && input[i+1] === '{' && input[i+2] === '!' && input[i+3] === '-' && input[i+4] === '-') ||
        (input[i] === '{' && i+4<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!' && input[i+4] === '-' && input[i+5] === '-')
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '!') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!') 
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '@') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '@') 
    ) {
        return HandlebarsUtils.DATA_VAR_EXPRESSION;
    }
    return HandlebarsUtils.ESCAPE_EXPRESSION;
};

/**
* @function HandlebarsUtils.isValidExpression
*
* @static
*
* @description
* <p>This function is used to look ahead to check whether it is a valid expression.</p>
*
*/
HandlebarsUtils.isValidExpression = function(input, i, type) {
    var re = {};
    re.result = false;
    switch(type) {
        case HandlebarsUtils.ESCAPE_EXPRESSION:
            re = HandlebarsUtils.escapeExpressionRegExp.exec(input.slice(i));
            break;
        case HandlebarsUtils.RAW_EXPRESSION:
            re = HandlebarsUtils.rawExpressionRegExp.exec(input.slice(i));
            break;
        case HandlebarsUtils.RAW_BLOCK:
            re = HandlebarsUtils.rawBlockRegExp.exec(input.slice(i));
            break;
        default:
            return re;
    }

    if (re !== null) {
        re.result = true;
    } else {
        re = {};
        re.result = false;
    }
    return re;
};

/**
* @function HandlebarsUtils.isReservedChar
*
* @static
*
* @param {char} ch - The input character.
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars expression is a reserved expression.
* The reserved expression includes block expression, partial template expression etc.</p>
*
* <p>For reference, please check https://github.com/mustache/spec/tree/master/specs</p>
*
*/
HandlebarsUtils.isReservedChar = function(input, i) {
    var ch = input[i];
    if (ch === '~' && input.length > i+1) {
        ch = input[i+1];
    }

    if (ch === '#' || ch === '/' || ch === '>' || ch === '@' || ch === '^' || ch === '!') {
        return true;
    } else {
        return false;
    }
};

/**
* @function HandlebarsUtils.isBranchExpression
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars expression is {{#\w*}} and {{^\w*}} expression.</p>
*
*/
HandlebarsUtils.isBranchExpression = function(input, i) {
    var re = HandlebarsUtils.branchExpressionRegExp.exec(input.slice(i));
    if (re === null) {
        return false;
    } else {
        var tag = re[1];
        return tag;
    }
};

/**
* @function HandlebarsUtils.isBranchEndExpression
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars expression is {{/\w*}} expression.</p>
*
*/
HandlebarsUtils.isBranchEndExpression = function(input, i) {
    var re = HandlebarsUtils.branchEndExpressionRegExp.exec(input.slice(i));
    if (re === null) {
        return false;
    } else {
        var tag = re[1]; 
        return tag;
    }
};

/**
* @function HandlebarsUtils.isElseExpression
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars expression is {{else}} expression.</p>
*
*/
HandlebarsUtils.isElseExpression = function(input, i) {
    var s = input.slice(i);
    var re = HandlebarsUtils.elseExpressionRegExp.exec(s);
    if (re !== null) {
        return true;
    }
    re = HandlebarsUtils.elseShortFormExpressionRegExp.exec(s);
    if (re !== null) {
        return true;
    }
    return false;
};

/**
* @function HandlebarsUtils.isBranchExpressions
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars expression is "branching" expression.</p>
*
*/
HandlebarsUtils.isBranchExpressions = function(input, i) {
    var r = HandlebarsUtils.isBranchExpression(input, i);
    if (r === false) {
        return false;
    } else {
        return true;
    }
};

/**
* @function HandlebarsUtils.handleError
*
* @static
*
* @param {string} msg - The log message string.
* @param {boolean} throwErr - Throw exception error?
*
* @description
* <p>Handle the error during parsing.</p>
*
*/    
HandlebarsUtils.handleError = function(msg, throwErr) {
    if (throwErr) {
        throw msg;
    } else if (typeof console === 'object') {
        if (console.hasOwnProperty('warn') && typeof console.warn === 'function') {
            console.warn(msg);
        } else if (console.hasOwnProperty('log') && typeof console.log === 'function') {
            console.log(msg);
        }
    }
};

/**
* @function HandlebarsUtils.parseBranchStmt
* 
* @static
*
* @param {string} s - The string in the format of balanced branching statement like {{#if}}, {{#each}}, {{#list}}, {{#unless}}, {{#with}}, {{#anything}} and {{^anything}}.
* @returns {array} An array of statement in the AST tree.
*
* @description
* <p>This function uses the native Handlebars parser to parse branching statement to generate a AST.</p>
*
*/
HandlebarsUtils.parseBranchStmt = function(s) {
    if (!Handlebars.VERSION.match(/^2\./)) {
        var msg = "[ERROR] ContextParserHandlebars: We support Handlebars 2.0 ONLY!";
        HandlebarsUtils.handleError(msg, true);
    }

    // TODO: we should build our own data structure instead of using Handlebars directly.
    var ast = Handlebars.parse(s);
    if (ast.statements !== undefined) {
        return ast.statements;
    } else {
        return [];
    }
};

/**
* @function HandlebarsUtils.extractBranchStmt
*
* @static
*
* @param {string} input - The template input string.
* @param {int} k - The pointer to the first char of the first brace expression of Handlebars template.
* @param {boolean} masked - The flag to mask the non branching statement expression.
* @returns {Object} The object with branching statement and place holder.
*
* @description
* <p>This function extracts a branching statement with balanced expression.</p>
*
*/
HandlebarsUtils.extractBranchStmt = function(input, k, masked) {

    var stmt = '',
        msg = '',
        sp = [],
        r = {},
        j = 0;

    /* init */
    var str = input.slice(k);
    var l = str.length;

    /*
    * the reason for extracting the branching statement is to 
    * be used for building the AST for finding all the combination of strings,
    * however the non-branching expression will make the AST more 
    * complicated, so this function masks out all open/close brace
    * with a random nonce.
    */
    r.filterPlaceHolder = [];
    r.openBracePlaceHolder = HandlebarsUtils.generateNonce();
    r.closeBracePlaceHolder = HandlebarsUtils.generateNonce();

    for(var i=0;i<l;++i) {
        var tag = HandlebarsUtils.isBranchExpression(str, i),
            endExpression = HandlebarsUtils.isBranchEndExpression(str, i);

        /* push the branching tokens */
        if (tag !== false) {
            sp.push(tag);

        /* do nothing for 'else' token */
        } else if (HandlebarsUtils.isElseExpression(str, i)) {

        /* pop the branching tokens (TODO: not fast enough) */
        } else if (endExpression !== false) {
            if (sp.length > 0) {
                var lastExpression = sp[sp.length-1];
                /* check for balanced branching statement */
                if (lastExpression === endExpression) {
                    sp.pop();
                    /* consume till the end of '}}' */
                    for(j=i;j<l;++j) {
                        if (str[j] === '}' && j+1<l && str[j+1] === '}') {
                            stmt += str[j];
                            i=j+1;
                            break;
                        } else {
                            stmt += str[j];
                        }
                    }
                } else {
                    /* broken template as the end expression does not match, throw exception before function returns */
                    msg = "[ERROR] ContextParserHandlebars: Template expression mismatch (startExpression:"+lastExpression+"/endExpression:"+endExpression+")";
                    HandlebarsUtils.handleError(msg, true);
                }
            } else {
                /* broken template, throw exception before function returns */
                msg = "[ERROR] ContextParserHandlebars: Cannot find the corresponding start expression (tag:"+endExpression+")";
                HandlebarsUtils.handleError(msg, true);
            }

       /* non-branching expression */
       } else {

            /* {{{expression}}} case */
            if (str[i] === '{' && i+2<l && str[i+1] === '{' && str[i+2] === '{' && masked) {
                /* masked the '{{{' */
                stmt += r.openBracePlaceHolder;
                stmt += r.openBracePlaceHolder;
                stmt += r.openBracePlaceHolder;
                /* loop till the end of '}}}' */
                for(j=i+3;j<l;++j) {
                    if (str[j] === '}' && i+3<l && str[j+1] === '}' && str[j+2] === '}') {
                        /* append 3 chars, }}} */
                        stmt += r.closeBracePlaceHolder;
                        stmt += r.closeBracePlaceHolder;
                        stmt += r.closeBracePlaceHolder;
                        /* advance the pointer by 2, the for loop will increase by one more for next char */
                        i=j+2;
                        break;
                    }
                    stmt += str[j];
                }
                continue;

            /* {{[!@/>]expression}} */
            } else if (str[i] === '{' && i+2<l && str[i+1] === '{' && masked && HandlebarsUtils.isReservedChar(str, i+2)) {
                /* masked the '{{' */
                stmt += r.openBracePlaceHolder;
                stmt += r.openBracePlaceHolder;
                /* loop till the end of '}}' */
                for(j=i+2;j<l;++j) {
                    if (str[j] === '}' && i+2<l && str[j+1] === '}') {
                        /* append 2 chars, }} */
                        stmt += r.closeBracePlaceHolder;
                        stmt += r.closeBracePlaceHolder;
                        /* advance the pointer by 1, the for loop will increase by one more for next char */
                        i=j+1;
                        break;
                    }
                    stmt += str[j];
                }
                continue;

            /* {{expression}} */
            } else if (str[i] === '{' && i+2<l && str[i+1] === '{' && masked && !HandlebarsUtils.isReservedChar(str, i+2)) {
                /* masked the '{{' */
                stmt += r.openBracePlaceHolder;
                stmt += r.openBracePlaceHolder;

                /* add the filter place holder */
                var filterPlaceHolder = HandlebarsUtils.generateNonce();
                stmt += filterPlaceHolder;
                r.filterPlaceHolder.push(filterPlaceHolder);

                /* loop till the end of '}}' */
                for(j=i+2;j<l;++j) {
                    if (str[j] === '}' && i+2<l && str[j+1] === '}') {
                        /* append 2 chars, }} */
                        stmt += r.closeBracePlaceHolder;
                        stmt += r.closeBracePlaceHolder;
                        /* advance the pointer by 1, the for loop will increase by one more for next char */
                        i=j+1;
                        break;
                    }
                    stmt += str[j];
                }
                continue;
            }
        }

        stmt += str[i];

        /* The stack is empty, we can return */
        if (sp.length === 0) {
            break;
        }
    }

    /* if all chars are consumed while the sp is not empty, the template is broken */
    if (sp.length > 0) {
        /* throw error on the template */
        msg = "[ERROR] ContextParserHandlebars: Template does not have balanced branching expression.";
        HandlebarsUtils.handleError(msg, true);
    }

    r.stmt = stmt;
    debugBranch("extractBranchStmt:"+stmt);
    return r;
};

/**
* @function HandlebarsUtils.parseAstTreeState
*
* @static
*
* @description
* <p>This function transverses the AST tree of the brnaching statement of Handlebars,
* and parse and relace filter in the string on the fly.</p>
*
* @param {array} o - The AST of the branching statement.
* @param {int} state - The init state of the string.
* @param {object} obj - The object contains the open/close brace place holder, filter place holder and branching statement.
* @returns {array} The last states of the 1st and 2nd branches.
*
*/
HandlebarsUtils.parseAstTreeState = function(o, state, obj) {

    /*
    * the expected data structure of branching statement from the AST tree
    *     
    *              ________________ branching _____________
    *              |                                      |
    *       1st branch (if etc.)                    2nd branch (else)
    * -----------------------------------   ----------------------------------
    * | context | sub-branch  | context |   | context | sub-branch | context |
    *  1st node    2nd node    3rd node      1st node    2nd node    3rd node 
    *
    */

    /* being used for which node is being handled next */
    var nodeFlag = [];
    /* true for first node, false for third node (1st branch) */
    nodeFlag[0] = true;
    /* true for first node, false for third node (2nd branch) */
    nodeFlag[1] = true;

    /* indicating which branches have been handled before */
    var branchesFlag = [];
    /* true for 1st branch */
    branchesFlag[0] = false;
    /* true for 2nd branch */
    branchesFlag[1] = false;

    /* last state */
    var newLastState;

    /* return object */
    var r = {};
    r.lastStates = [];
    r.lastStates[0] = -1;
    r.lastStates[1] = -1;
    r.stmt = obj.stmt;

    /* transitent variables */
    var t,
        j = 0,
        s = [],
        str = '',
        msg = '',
        output = '';

    for(var i=0;i<o.length;++i) {

        /* if/with/each/list/tag/unless token */
        if (typeof o[i].program !== 'undefined') {
            branchesFlag[0] = true;

            for(j=0;j<o[i].program.statements.length;++j) {

                /* 1st node */
                if (o[i].program.statements[j].type === 'content' && nodeFlag[0]) { 
                    nodeFlag[0] = false;
                    str = o[i].program.statements[j].string;

                    /* restore the open/close brace place holder */
                    str = str.replace(new RegExp(obj.openBracePlaceHolder, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBracePlaceHolder, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(state, str);
                    newLastState = t.lastState;
                    output = t.output;
                    debugBranch("parseAstTreeState:if:1,["+state+"/"+newLastState+"],["+str+"],["+output+"]");
                    r.lastStates[0] = newLastState;

                    /* replace the filter place holder */
                    obj = HandlebarsUtils._replaceFilterPlaceHolder(obj, output);

                /* 2nd node */
                } else if (o[i].program.statements[j].type === 'block') {

                    s = [];
                    s[0] = o[i].program.statements[j];
                    t = HandlebarsUtils.parseAstTreeState(s, r.lastStates[0], obj);
                    newLastState = t.lastStates[0]; // index 0 and 1 MUST be equal
                    obj.stmt = t.stmt;
                    debugBranch("parseAstTreeState:if:2,["+r.lastStates[0]+"/"+newLastState+"]");
                    r.lastStates[0] = newLastState;

                /* 3rd node */
                } else if (o[i].program.statements[j].type === 'content' && !nodeFlag[0]) {
                    str = o[i].program.statements[j].string;

                    /* restore the open/close brace place holder */
                    str = str.replace(new RegExp(obj.openBracePlaceHolder, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBracePlaceHolder, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(r.lastStates[0], str);
                    newLastState = t.lastState;
                    output = t.output;
                    debugBranch("parseAstTreeState:if:3,["+r.lastStates[0]+"/"+newLastState+"],["+str+"],["+output+"]");
                    r.lastStates[0] = newLastState;

                    /* replace the filter place holder */
                    obj = HandlebarsUtils._replaceFilterPlaceHolder(obj, output);

                }
            }
        }

        /* else token */
        if (typeof o[i].inverse !== 'undefined') {
            branchesFlag[1] = true;

            for(j=0;j<o[i].inverse.statements.length;++j) {

                /* 1st node */
                if (o[i].inverse.statements[j].type === 'content' && nodeFlag[1]) {
                    nodeFlag[1] = false;
                    str = o[i].inverse.statements[j].string;

                    /* restore the open/close brace place holder */
                    str = str.replace(new RegExp(obj.openBracePlaceHolder, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBracePlaceHolder, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(state, str);
                    newLastState = t.lastState;
                    output = t.output;
                    debugBranch("parseAstTreeState:else:1,["+state+"/"+newLastState+"],["+str+"],["+output+"]");
                    r.lastStates[1] = newLastState;

                    /* replace the filter place holder */
                    obj = HandlebarsUtils._replaceFilterPlaceHolder(obj, output);

                /* 2nd node */
                } else if (o[i].inverse.statements[j].type === 'block') {

                    s = [];
                    s[0] = o[i].inverse.statements[j];
                    t = HandlebarsUtils.parseAstTreeState(s, r.lastStates[1], obj);
                    newLastState = t.lastStates[0]; // index 0 and 1 MUST be equal
                    obj.stmt = t.stmt;
                    debugBranch("parseAstTreeState:else:2,["+r.lastStates[1]+"/"+newLastState+"]");
                    r.lastStates[1] = newLastState;

                /* 3rd node */
                } else if (o[i].inverse.statements[j].type === 'content' && !nodeFlag[1]) {
                    str = o[i].inverse.statements[j].string;

                    /* restore the open/close brace place holder */
                    str = str.replace(new RegExp(obj.openBracePlaceHolder, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBracePlaceHolder, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(r.lastStates[1], str);
                    newLastState = t.lastState;
                    output = t.output;
                    debugBranch("parseAstTreeState:else:3,["+r.lastStates[1]+"/"+newLastState+"],["+str+"],["+output+"]");
                    r.lastStates[1] = newLastState;

                    /* replace the filter place holder */
                    obj = HandlebarsUtils._replaceFilterPlaceHolder(obj, output);

                }
            }
        }
    }

    if (branchesFlag[0] && !branchesFlag[1]) {
        debugBranch("parseAstTreeState:else:0,["+state+"/"+state+"]");
        r.lastStates[1] = state;
    } else if (!branchesFlag[0] && branchesFlag[1]) {
        debugBranch("parseAstTreeState:if:0,["+state+"/"+state+"]");
        r.lastStates[0] = state;
    }

    if (r.lastStates[0] !== r.lastStates[1]) {
        msg = "[ERROR] ContextParserHandlebars: Parsing error! Inconsitent HTML5 state after conditional branches. Please fix your template!";
        HandlebarsUtils.handleError(msg, true);
    }

    r.stmt = obj.stmt;
    return r;
};

/*
* @function HandlebarsUtils._analyzeContext
*
* @static
* @private 
* 
*/
HandlebarsUtils._analyzeContext = function(state, str) {

    var r = {
        lastState: '',
        output: ''
    };

    // TODO: refactor
    /* factory class */
    var parser,
        ContextParserHandlebars = require('./context-parser-handlebars');

    /* parse the string */
    debugBranch("_analyzeContext:"+str);
    parser = new ContextParserHandlebars(false);
    parser.setInitState(state);
    parser.contextualize(str);
    r.lastState = parser.getLastState();
    r.output = parser.getBuffer().join('');
    debugBranch("_analyzeContext:"+r.output);

    return r;
};

/*
* @function HandlebarsUtils._replaceFilterPlaceHolder
*
* @static
* @private 
* 
*/
HandlebarsUtils._replaceFilterPlaceHolder = function(obj, str) {
    var filterPlaceHolders = obj.filterPlaceHolder.slice(0); 

    filterPlaceHolders.forEach(function(filterPlaceHolder) {
        /* get the output expression from masked stmt */
        var outputMarkup = new RegExp('\{\{' + filterPlaceHolder + '.*?\}\}', 'g');
        var m1 = outputMarkup.exec(obj.stmt);

        /* get the output filter expression from processed stmt */
        var i = str.indexOf(filterPlaceHolder);
        if (i !== -1 && m1 !== null && m1[0]) {
            var s = str.substr(0,i).lastIndexOf('{');
            var e = str.substr(i).indexOf('}') + i + 1;
            var m2 = str.substring(s-2, e+2);
            debugBranch("replaceFilterPlaceHolder:i:"+i+",s:"+s+",e:"+e+",m1:"+m1+",m2"+m2);

            if (m1 !== null && m1[0] &&
                m2 !== null && m2) {
                /* Replace the output expression with filter expression */
                obj.stmt = obj.stmt.replace(m1[0], m2);
                /* Replace the filterPlaceHolder with empty string */
                obj.stmt = obj.stmt.replace(filterPlaceHolder, "");
                /* Remove element from array */
                var j = obj.filterPlaceHolder.indexOf(filterPlaceHolder);
                obj.filterPlaceHolder.splice(j, 1);
            }
        }
    });
    return obj;
};

/* 
* @function HandlebarsUtils.blacklistProtocol
*
* Reference:
* https://github.com/yahoo/xss-filters/blob/master/src/private-xss-filters.js#L266
*/
HandlebarsUtils._URI_BLACKLIST = null;
HandlebarsUtils._URI_BLACKLIST_REGEXPSTR = "^(?:&#[xX]0*(?:1?[1-9a-fA-F]|10|20);?|&#0*(?:[1-9]|[1-2][0-9]|30|31|32);?|&Tab;|&NewLine;)*(?:(?:j|J|&#[xX]0*(?:6|4)[aA];?|&#0*(?:106|74);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:a|A|&#[xX]0*(?:6|4)1;?|&#0*(?:97|65);?)|(?:v|V|&#[xX]0*(?:7|5)6;?|&#0*(?:118|86);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:b|B|&#[xX]0*(?:6|4)2;?|&#0*(?:98|66);?))(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:s|S|&#[xX]0*(?:7|5)3;?|&#0*(?:115|83);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:c|C|&#[xX]0*(?:6|4)3;?|&#0*(?:99|67);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:r|R|&#[xX]0*(?:7|5)2;?|&#0*(?:114|82);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:i|I|&#[xX]0*(?:6|4)9;?|&#0*(?:105|73);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:p|P|&#[xX]0*(?:7|5)0;?|&#0*(?:112|80);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?:t|T|&#[xX]0*(?:7|5)4;?|&#0*(?:116|84);?)(?:&#[xX]0*[9aAdD];?|&#0*(?:9|10|13);?|&Tab;|&NewLine;)*(?::|&#[xX]0*3[aA];?|&#0*58;?)";
HandlebarsUtils.blacklistProtocol = function(s) {
    var URI_FASTLANE = ['&', 'j', 'J', 'v', 'V'];
    if (URI_FASTLANE.indexOf(s[0]) === -1) {
        return false;
    } else {
        if (HandlebarsUtils._URI_BLACKLIST === null) {
            HandlebarsUtils._URI_BLACKLIST = new RegExp(HandlebarsUtils._URI_BLACKLIST_REGEXPSTR);
        }
        if (HandlebarsUtils._URI_BLACKLIST.test(s)) {
            return true;
        } else {
            return false;
        }
    }
    return true;
};

module.exports = HandlebarsUtils;

})();
