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

/* type of expression */
HandlebarsUtils.NOT_EXPRESSION = 0;
HandlebarsUtils.RAW_EXPRESSION = 1; // {{{expression}}}

HandlebarsUtils.ESCAPE_EXPRESSION = 2; // {{expression}}
HandlebarsUtils.PARTIAL_EXPRESSION = 3; // {{>.*}}
HandlebarsUtils.DATA_VAR_EXPRESSION = 4; // {{@.*}}
HandlebarsUtils.BRANCH_EXPRESSION = 5; // {{#.*}}, {{^.*}}
HandlebarsUtils.BRANCH_END_EXPRESSION = 6; // {{/.*}}
HandlebarsUtils.ELSE_EXPRESSION = 7; // {{else}}, {{^}}
HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM = 8; // {{!--.*--}}
HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM = 9; // {{!.*}}

HandlebarsUtils.RAW_BLOCK = 10; // {{{{block}}}}

/* reference: http://handlebarsjs.com/expressions.html */
/* '{{{{' '~'? 'not {}~'+ '~'? greedy '}}}}' and not follow by '}' */
HandlebarsUtils.rawBlockRegExp = /^\{\{\{\{~?([^\}\{~]+)~??\}\}\}\}(?!})/;
/* '{{{' '~'? 'not {}~'+ '~'? greedy '}}}' and not follow by '}' */
HandlebarsUtils.rawExpressionRegExp = /^\{\{\{~?([^\}\{~]+)~??\}\}\}(?!})/;

/* '{{' '~'? 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? greedy '}}' and not follow by '}' */
HandlebarsUtils.escapeExpressionRegExp = /^\{\{~?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? '>' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? greedy '}}' and not follow by '}' */
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?>\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? '@' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? greedy '}}' and not follow by '}' */
HandlebarsUtils.dataVarExpressionRegExp = /^\{\{~?@\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;

// need to capture the first non-whitespace string and capture the rest
/* '{{' '~'? '# or ^' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? greedy '}}' and not follow by '}' */
HandlebarsUtils.branchExpressionRegExp = /^\{\{~?[#|\^]\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? '/' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? greedy '}}' and not follow by '}' */
HandlebarsUtils.branchEndExpressionRegExp = /^\{\{~?\/\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? 'space'* 'else' 'space'* '~'? greedy '}}' and not follow by '}' */
HandlebarsUtils.elseExpressionRegExp = /^\{\{~?\s*else\s*~??\}\}(?!})/;
/* '{{' '~'? 'space'* '^'{1} 'space'* '~'? greedy '}}' and not follow by '}' */
HandlebarsUtils.elseShortFormExpressionRegExp = /^\{\{~?\s*\^{1}\s*~??\}\}(?!})/;

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
    // TODO: can optimize
    if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '>') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '>') 
    ) {
        return HandlebarsUtils.PARTIAL_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '@') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '@') 
    ) {
        return HandlebarsUtils.DATA_VAR_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '#') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '#') 
    ) {
        return HandlebarsUtils.BRANCH_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '^') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '^') 
    ) {
        // this one is not exact, {{~?^}} will pass!
        return HandlebarsUtils.BRANCH_EXPRESSION;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '/') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '/') 
    ) {
        return HandlebarsUtils.BRANCH_END_EXPRESSION;
    } else if ((input[i] === '{' && i+4<len && input[i+1] === '{' && input[i+2] === '!' && input[i+3] === '-' && input[i+4] === '-') ||
        (input[i] === '{' && i+4<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!' && input[i+4] === '-' && input[i+5] === '-')
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '!') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!') 
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM;
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
    var s = input.slice(i);
    switch(type) {
        case HandlebarsUtils.RAW_BLOCK:
            re = HandlebarsUtils.rawBlock.exec(s);
            break;
        case HandlebarsUtils.RAW_EXPRESSION:
            re = HandlebarsUtils.rawExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.ESCAPE_EXPRESSION:
            re = HandlebarsUtils.escapeExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.PARTIAL_EXPRESSION:
            re = HandlebarsUtils.partialExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.DATA_VAR_EXPRESSION:
            re = HandlebarsUtils.dataVarExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.BRANCH_EXPRESSION:
            re = HandlebarsUtils.branchExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.BRANCH_END_EXPRESSION:
            re = HandlebarsUtils.branchEndExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.ELSE_EXPRESSION:
            re = HandlebarsUtils.elseExpressionRegExp.exec(s);
            if (re === null) {
                re = HandlebarsUtils.elseShortFormExpressionRegExp.exec(s);
            }
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

/*
* @function HandlebarsUtils._analyzeContext
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

/**
* @function HandlebarsUtils.analyseBranchAst
*/
HandlebarsUtils.analyseBranchAst = function(ast, state) {
    var obj = {},
        len = ast.program.length;

    var r = {},
        s = [],
        t, msg,
        newLastState;
    r.lastStates = [];
    r.lastStates[0] = state;
    r.lastStates[1] = state;
    r.output = '';

    for(var i=0;i<len;++i) {
        obj = ast.program[i];
        if (obj.type === 'content') {
            t = HandlebarsUtils._analyzeContext(r.lastStates[0], obj.content);
            newLastState = t.lastState;
            r.output += t.output;
            debugBranch("analyseBranchAst:program:content,["+r.lastStates[0]+"/"+newLastState+"],["+obj.content+"],["+r.output+"]");
            r.lastStates[0] = newLastState;
        } else if (obj.type === 'node') {
            t = HandlebarsUtils.analyseBranchAst(obj.content, r.lastStates[0]);
            newLastState = t.lastStates[0]; // index 0 and 1 MUST be equal
            debugBranch("analyseBranchAst:program:node,["+r.lastStates[0]+"/"+newLastState+"]");
            r.lastStates[0] = newLastState;
            r.output += t.output;
        } else if (obj.type === 'branch' ||
            obj.type === 'branchelse' ||
            obj.type === 'branchend') {
            r.output += obj.content;
        }
    }
    len = ast.inverse.length;
    for(i=0;i<len;++i) {
        obj = ast.inverse[i];
        if (obj.type === 'content') {
            t = HandlebarsUtils._analyzeContext(r.lastStates[1], obj.content);
            newLastState = t.lastState;
            r.output += t.output;
            debugBranch("analyseBranchAst:inverse:content,["+r.lastStates[1]+"/"+newLastState+"],["+obj.content+"],["+r.output+"]");
            r.lastStates[1] = newLastState;
        } else if (obj.type === 'node') {
            t = HandlebarsUtils.analyseBranchAst(obj.content, r.lastStates[1]);
            newLastState = t.lastStates[1]; // index 0 and 1 MUST be equal
            debugBranch("analyseBranchAst:inverse:node,["+r.lastStates[1]+"/"+newLastState+"]");
            r.lastStates[1] = newLastState;
            r.output += t.output;
        } else if (obj.type === 'branch' ||
            obj.type === 'branchelse' ||
            obj.type === 'branchend') {
            r.output += obj.content;
        }
    }

    if (ast.program.length > 0 && ast.inverse.length === 0) {
        debugBranch("panalyseBranchAst:["+r.lastStates[0]+"/"+r.lastStates[0]+"]");
        r.lastStates[1] = r.lastStates[0];
    } else if (ast.program.length === 0 && ast.inverse.length > 0) {
        debugBranch("analyseBranchAst:["+r.lastStates[1]+"/"+r.lastStates[1]+"]");
        r.lastStates[0] = r.lastStates[1];
    }

    if (r.lastStates[0] !== r.lastStates[1]) {
        msg = "[ERROR] ContextParserHandlebars: Parsing error! Inconsitent HTML5 state after conditional branches. Please fix your template!";
        HandlebarsUtils.handleError(msg, true);
    }
    return r;
};

/**
* @function HandlebarsUtils.buildBranchAst
*/
HandlebarsUtils.buildBranchAst = function(input, i) {

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
        var exp = HandlebarsUtils.isBranchExpression(str, j),
            endExpression = HandlebarsUtils.isBranchEndExpression(str, j);
        
        if (exp !== false) {
            /* encounter the first branch expression */
            if (sp.length === 0) {
                /* save the branch expression name */
                sp.push(exp);

                content = '';
                inverse = false;

                /* consume till the end of expression */
                r = HandlebarsUtils._consumeTillCloseBrace(str, j, len);
                j = r.index;
                obj = HandlebarsUtils._saveAstObject('branch', r.str);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

            } else {
                /* encounter another branch expression, save the previous string */
                obj = HandlebarsUtils._saveAstObject('content', content);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }
                content = '';

                r = HandlebarsUtils.buildBranchAst(str, j);
                obj = HandlebarsUtils._saveAstObject('node', r);
                j = j + r.index;
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }
            }
        } else if (HandlebarsUtils.isElseExpression(str, j)) {
            obj = HandlebarsUtils._saveAstObject('content', content);
            if (!inverse) {
                ast.program.push(obj);
            } else if (inverse) {
                ast.inverse.push(obj);
            }

            inverse = true;
            content = '';

            /* consume till the end of expression */
            r = HandlebarsUtils._consumeTillCloseBrace(str, j, len);
            j = r.index;
            obj = HandlebarsUtils._saveAstObject('branchelse', r.str);
            if (!inverse) {
                ast.program.push(obj);
            } else if (inverse) {
                ast.inverse.push(obj);
            }

        } else if (endExpression !== false) {
            var t = sp.pop();
            if (t === endExpression) {
                obj = HandlebarsUtils._saveAstObject('content', content);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

                /* consume till the end of expression */
                r = HandlebarsUtils._consumeTillCloseBrace(str, j, len);
                j = r.index;
                obj = HandlebarsUtils._saveAstObject('branchend', r.str);
                if (!inverse) {
                    ast.program.push(obj);
                } else if (inverse) {
                    ast.inverse.push(obj);
                }

                break;
            } else {
                /* broken template as the end expression does not match, throw exception before function returns */
                msg = "[ERROR] ContextParserHandlebars: Template expression mismatch (startExpression:"+t+"/endExpression:"+endExpression+")";
                HandlebarsUtils.handleError(msg, true);
            }
        } else {
            var expressionType = HandlebarsUtils.getExpressionType(str, j, len);
            if (expressionType === HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM ||
                expressionType === HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
                /* capturing the string till the end of comment */
                r = HandlebarsUtils._consumeTillCommentCloseBrace(str, j, len, expressionType);
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
        HandlebarsUtils.handleError(msg, true);
    }

    ast.index = j;
    return ast;
};

/**
* @function HandlebarsUtils._saveAstObject
*/
HandlebarsUtils._saveAstObject = function(type, content) {
    var obj = {};
    obj.type = type;
    obj.content = content;
    return obj;
};

/**
* @function HandlebarsUtils._consumeTillCloseBrace
*/
HandlebarsUtils._consumeTillCloseBrace = function(input, i, len) {
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
    HandlebarsUtils.handleError(msg, true);
};

/**
* @function HandlebarsUtils._consumeTillCommentCloseBrace
*/
HandlebarsUtils._consumeTillCommentCloseBrace = function(input, i, len, type) {
    var msg, 
        str = '',
        obj = {};
    for(var j=i;j<len;++j) {
        if (type === HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM) {
            if (input[j] === '-' && j+3<len && input[j+1] === '-' && input[j+2] === '}' && input[j+3] === '}') {
                str += '--}}';
                j=j+3;
                obj.index = j;
                obj.str = str;
                return obj;
            }
        } else if (type === HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM) {
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
    HandlebarsUtils.handleError(msg, true);
};

module.exports = HandlebarsUtils;

})();
