/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/

/* debug facility */
var debug = require('debug')('cph-debug'),
    debugBranch = require('debug')('cph-branching'),
    debugDump = require('debug')('cph-dump');

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
* <p>For reference, please check https://github.com/mustache/spec/tree/master/specs</p>
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
    /* '{{' '# ot ^' 'space'* 'non-space and non-}'+ first-'space or }' */
    var p = /^{{[#|\\^]\s*([^\s\}]+)?[\s\}]/g;
    var re = p.exec(input.slice(i));
    if (re === null) {
        return false;
    } else {
        var tag = re[1];
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
    /* '{{' '/' 'space'* 'non-space and non-}'+ first-'space or }' */
    var p = /^{{\/\s*([^\s\}]+)?[\s\}]/g;
    var re = p.exec(input.slice(i));

    if (re === null) {
        return false;
    } else {
        var tag = re[1]; 
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
    var p = /^{{\s*else\s*?}}/g;
    var re = p.exec(input.slice(i));

    if (re === null) {
        return false;
    } else {
        return true;
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
* @returns {Object} The object with branching statement and place holder.
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

    /* init */
    var str = input.slice(k);
    var l = str.length;

    /*
    * the reason for extracting the branching statement is to 
    * be used for building the AST for finding all the combination of strings,
    * however the non-branching markup will make the AST more 
    * complicated, so this function masks out all open/close brace
    * with a random nonce.
    */
    r.filterPlaceHolder = [];
    r.openBracePlaceHolder = HandlebarsUtils.generateNonce();
    r.closeBracePlaceHolder = HandlebarsUtils.generateNonce();

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
            } else if (str[i] === '{' && i+2<l && str[i+1] === '{' && masked && HandlebarsUtils.isReservedChar(str[i+2])) {
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
            } else if (str[i] === '{' && i+2<l && str[i+1] === '{' && masked && !HandlebarsUtils.isReservedChar(str[i+2])) {
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
        msg = "[ERROR] ContextParserHandlebars: Handlebars template does not have balanced branching markup.";
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
        /* get the output markup from stmt */
        var outputMarkup = new RegExp('{{' + filterPlaceHolder + '.*?}}', 'g');
        var m1 = outputMarkup.exec(obj.stmt);

        var i = str.indexOf(filterPlaceHolder);
        if (i !== -1 && m1 !== null && m1[0]) {
            var s = str.substr(0,i).lastIndexOf('{');
            var e = str.substr(i).indexOf('}') + i + 1;
            m2 = str.substring(s-2, e+2);
            debugBranch("replaceFilterPlaceHolder:i:"+i+",s:"+s+",e:"+e+",m1:"+m1+",m2"+m2);

            if (m1 !== null && m1[0] &&
                m2 !== null && m2) {
                /* Replace the output markup with filter markup */
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

module.exports = HandlebarsUtils;
