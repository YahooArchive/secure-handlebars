/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/

/**
* @class HandlebarsUtils
* @static
*/
var HandlebarsUtils = {};

/* vanillia Handlebars */
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

/**
* @function HandlebarsUtils.isReservedChar
*
* @static
*
* @param {char} ch - The input character.
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars markup is a reserved markup.
* The reserved markup includes block expression, partial template expression etc.</p>
*
* <p>For reference, please check http://handlebarsjs.com/</p>
*
*/
HandlebarsUtils.isReservedChar = function(ch) {
    if (ch === '#' || ch === '/' || ch === '>' || ch === '@' || ch === '^' || ch === '!') {
        return true;
    } else {
        return false;
    }
};

/**
* @function HandlebarsUtils.isBranchTag
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars markup is {{#\w*}} and {{^\w*}} markup.</p>
*
*/
HandlebarsUtils.isBranchTag = function(input, i) {
    // TODO: regular expression and slice is slow
    var p = /^{{[#|\\^]\s*(\w)+/g;
    var re = p.exec(input.slice(i));
    if (re === null) {
        return false;
    } else {
        var tag = re[0]; 
        tag = tag.replace(/ /g, "");
        tag = tag.replace("{{#", "");
        tag = tag.replace("{{^", "");
        return tag;
    }
};

/**
* @function HandlebarsUtils.isBranchEndTag
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars markup is {{/\w*}} markup.</p>
*
*/
HandlebarsUtils.isBranchEndTag = function(input, i) {
    // TODO: regular expression and slice is slow
    var p = /^{{\/\s*(\w)+/g;
    var re = p.exec(input.slice(i));
    if (re === null) {
        return false;
    } else {
        var tag = re[0]; 
        tag = tag.replace(/ /g, "");
        tag = tag.replace("{{\/", "");
        return tag;
    }
};

/**
* @function HandlebarsUtils.isElseTag
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars markup is {{else}} markup.</p>
*
*/
HandlebarsUtils.isElseTag = function(input, i) {
    // TODO: regular expression and slice is slow
    var p = /^{{\s*else\s*}}/g;
    if (input.slice(i).match(p)) {
        return true;
    } else {
        return false;
    }
};

/**
* @function HandlebarsUtils.isBranchTags
*
* @static
*
* @returns {boolean} true or false.
*
* @description
* <p>Check whether the Handlebars markup is "branching" markup.</p>
*
*/
HandlebarsUtils.isBranchTags = function(input, i) {
    var r = HandlebarsUtils.isBranchTag(input, i);
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
* @param {int} k - The pointer to the first char of the first brace markup of Handlebars template.
* @param {boolean} masked - The flag to mask the non branching statement markup.
* @returns {Object} The object with branching statement and nonce.
*
* @description
* <p>This function extracts a branching statement with balanced markup.</p>
*
*/
HandlebarsUtils.extractBranchStmt = function(input, k, masked) {

    var stmt = '',
        msg = '',
        sp = [],
        r = {},
        j = 0;

    // init
    var str = input.slice(k);
    var l = str.length;

    /*
    * the reason for extracting the branching statement is to 
    * be used for building the AST for finding all the combination of strings,
    * however the non-branching markup will make the AST more 
    * complicated, so this function masks out all open/close brace
    * with a random nonce.
    */
    r.filterNonce = [];
    r.openBraceNonce = HandlebarsUtils.generateNonce();
    r.closeBraceNonce = HandlebarsUtils.generateNonce();

    for(var i=0;i<l;++i) {
        var tag = HandlebarsUtils.isBranchTag(str, i),
            endTag = HandlebarsUtils.isBranchEndTag(str, i);

        /* push the branching tokens */
        if (tag !== false) {
            sp.push(tag);

        /* do nothing for 'else' token */
        } else if (HandlebarsUtils.isElseTag(str, i)) {

        /* pop the branching tokens (TODO: not fast enough) */
        } else if (endTag !== false) {
            if (sp.length > 0) {
                var lastTag = sp[sp.length-1];
                /* check for balanced branching statement */
                if (lastTag === endTag) {
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
                    /* broken template as the end markup does not match, throw exception before function returns */
                    msg = "[ERROR] ContextParserHandlebars: Handlebars template markup mismatch (start_tag:"+lastTag+"/endTag:"+endTag+")";
                    HandlebarsUtils.handleError(msg, true);
                    break;
                }
            } else {
                /* broken template, throw exception before function returns */
                msg = "[ERROR] ContextParserHandlebars: Handlebars template cannot find the corresponding start markup (tag:"+endTag+")";
                HandlebarsUtils.handleError(msg, true);
                break;
            }

       /* non-branching markup */
       } else {

            /* {{{expression}}} case */
            if (str[i] === '{' && i+2<l && str[i+1] === '{' && str[i+2] === '{' && masked) {
                /* masked the '{{{' */
                stmt += r.openBraceNonce;
                stmt += r.openBraceNonce;
                stmt += r.openBraceNonce;
                /* loop till the end of '}}}' */
                for(j=i+3;j<l;++j) {
                    if (str[j] === '}' && i+3<l && str[j+1] === '}' && str[j+2] === '}') {
                        /* append 3 chars, }}} */
                        stmt += r.closeBraceNonce;
                        stmt += r.closeBraceNonce;
                        stmt += r.closeBraceNonce;
                        /* advance the pointer by 2, the for loop will increase by one more for next char */
                        i=j+2;
                        break;
                    }
                    stmt += str[j];
                }
                continue;

            /* {{[!@/>]expression}} */
            } else if (str[i] === '{' && i+2<l && str[i+1] === '{' && masked && HandlebarsUtils.isReservedChar(str[i+2])) {
                /* masked the '{{' */
                stmt += r.openBraceNonce;
                stmt += r.openBraceNonce;
                /* loop till the end of '}}' */
                for(j=i+2;j<l;++j) {
                    if (str[j] === '}' && i+2<l && str[j+1] === '}') {
                        /* append 2 chars, }} */
                        stmt += r.closeBraceNonce;
                        stmt += r.closeBraceNonce;
                        /* advance the pointer by 1, the for loop will increase by one more for next char */
                        i=j+1;
                        break;
                    }
                    stmt += str[j];
                }
                continue;

            /* {{expression}} */
            } else if (str[i] === '{' && i+2<l && str[i+1] === '{' && masked && !HandlebarsUtils.isReservedChar(str[i+2])) {
                /* masked the '{{' */
                stmt += r.openBraceNonce;
                stmt += r.openBraceNonce;

                /* add the filter place holder */
                var filterNonce = HandlebarsUtils.generateNonce();
                stmt += filterNonce + " ";
                r.filterNonce.push(filterNonce);

                /* loop till the end of '}}' */
                for(j=i+2;j<l;++j) {
                    if (str[j] === '}' && i+2<l && str[j+1] === '}') {
                        /* append 2 chars, }} */
                        stmt += r.closeBraceNonce;
                        stmt += r.closeBraceNonce;
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
        msg = "[ERROR] ContextParserHandlebars: Handlebars template does not have balanced branching markup.";
        HandlebarsUtils.handleError(msg, true);
    }

    r.stmt = stmt;
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
* @param {object} obj - The object contains the open/close brace nonce, filter nonce and branching statement.
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

    // TODO: refactor
    /* @param {boolean} _debug Internal debug flag */
    var _debug = false;

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

                    /* restore the open/close brace nonce */
                    str = str.replace(new RegExp(obj.openBraceNonce, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBraceNonce, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(state, str);
                    newLastState = t.lastState;
                    output = t.output;
                    if (_debug) { console.log(":if:1,["+state+"/"+newLastState+"],["+str+"]"); }
                    r.lastStates[0] = newLastState;

                    /* replace the filter nonce */
                    obj.stmt = HandlebarsUtils._replaceFilterNonce(obj, output);

                /* 2nd node */
                } else if (o[i].program.statements[j].type === 'block') {

                    s = [];
                    s[0] = o[i].program.statements[j];
                    t = HandlebarsUtils.parseAstTreeState(s, r.lastStates[0], obj);
                    newLastState = t.lastStates[0]; // index 0 and 1 MUST be equal
                    obj.stmt = t.stmt;
                    if (_debug) { console.log(":if:2,["+r.lastStates[0]+"/"+newLastState+"]"); }
                    r.lastStates[0] = newLastState;

                /* 3rd node */
                } else if (o[i].program.statements[j].type === 'content' && !nodeFlag[0]) {
                    str = o[i].program.statements[j].string;

                    /* restore the open/close brace nonce */
                    str = str.replace(new RegExp(obj.openBraceNonce, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBraceNonce, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(r.lastStates[0], str);
                    newLastState = t.lastState;
                    output = t.output;
                    if (_debug) { console.log(":if:3,["+r.lastStates[0]+"/"+newLastState+"],["+str+"]"); }
                    r.lastStates[0] = newLastState;

                    /* replace the filter nonce */
                    obj.stmt = HandlebarsUtils._replaceFilterNonce(obj, output);

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

                    /* restore the open/close brace nonce */
                    str = str.replace(new RegExp(obj.openBraceNonce, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBraceNonce, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(state, str);
                    newLastState = t.lastState;
                    output = t.output;
                    if (_debug) { console.log(":else:1,["+state+"/"+newLastState+"],["+str+"]"); }
                    r.lastStates[1] = newLastState;

                    /* replace the filter nonce */
                    obj.stmt = HandlebarsUtils._replaceFilterNonce(obj, output);

                /* 2nd node */
                } else if (o[i].inverse.statements[j].type === 'block') {

                    s = [];
                    s[0] = o[i].inverse.statements[j];
                    t = HandlebarsUtils.parseAstTreeState(s, r.lastStates[1], obj);
                    newLastState = t.lastStates[0]; // index 0 and 1 MUST be equal
                    obj.stmt = t.stmt;
                    if (_debug) { console.log(":else:2,["+r.lastStates[1]+"/"+newLastState+"]"); }
                    r.lastStates[1] = newLastState;

                /* 3rd node */
                } else if (o[i].inverse.statements[j].type === 'content' && !nodeFlag[1]) {
                    str = o[i].inverse.statements[j].string;

                    /* restore the open/close brace nonce */
                    str = str.replace(new RegExp(obj.openBraceNonce, 'g'), '{');
                    str = str.replace(new RegExp(obj.closeBraceNonce, 'g'), '}');

                    /* parse the string */
                    t = HandlebarsUtils._analyzeContext(r.lastStates[1], str);
                    newLastState = t.lastState;
                    output = t.output;
                    if (_debug) { console.log("else:3,["+r.lastStates[1]+"/"+newLastState+"],["+str+"]"); }
                    r.lastStates[1] = newLastState;

                    /* replace the filter nonce */
                    obj.stmt = HandlebarsUtils._replaceFilterNonce(obj, output);

                }
            }
        }
    }

    if (branchesFlag[0] && !branchesFlag[1]) {
        if (_debug) { console.log(":else:0,["+state+"/"+state+"]"); }
        r.lastStates[1] = state;
    } else if (!branchesFlag[0] && branchesFlag[1]) {
        if (_debug) { console.log(":if:0,["+state+"/"+state+"]"); }
        r.lastStates[0] = state;
    }

    if (r.lastStates[0] !== r.lastStates[1]) {
        msg = "[ERROR] ContextParserHandlebars: Handlebarsjs template parsing error, inconsitent HTML5 state after conditional branches. Please fix your template!";
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
    parser = new ContextParserHandlebars(false, false);
    parser.setInitState(state);
    parser.contextualize(str);
    r.lastState = parser.getLastState();
    r.output = parser.getBuffer().join('');

    return r;
};

/*
* @function HandlebarsUtils._replaceFilterNonce
*
* @static
* @private 
* 
*/
// TODO: can optimize the code to reduce the number of replaced filter nonce.
HandlebarsUtils._replaceFilterNonce = function(obj, str) {
    var stmt = obj.stmt,
        filterNonce = obj.filterNonce;

    for(var n=0;n<filterNonce.length;++n) {
        /* get the output markup from stmt */
        var outputMarkup = new RegExp('{{' + filterNonce[n] + '.*?}}', 'g');
        var m1 = outputMarkup.exec(stmt);

        /* get the filter markup from output */
        var filterMarkup = new RegExp('{{{([a-zA-Z_-]+[\\(\\s])+' + filterNonce[n] + '.*?}}}', 'g');
        var m2 = filterMarkup.exec(str);

        if (m1 !== null && m1[0] &&
            m2 !== null && m2[0]) {
            /* Replace the output markup with filter markup */
            stmt = stmt.replace(m1[0], m2[0]);
            /* Replace the filterNonce[n] with empty string */
            stmt = stmt.replace(filterNonce[n]+" ", "");
        }
    }
    return stmt;
};

module.exports = HandlebarsUtils;
