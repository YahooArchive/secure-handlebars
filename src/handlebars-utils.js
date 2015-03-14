/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*jshint -W084 */
(function () {
"use strict";

/**
* @class HandlebarsUtils
* @static
*/
var HandlebarsUtils = {};

/* filter */
var filter = require('xss-filters')._privFilters;

/* type of expression */
HandlebarsUtils.UNHANDLED_EXPRESSION = -1;

HandlebarsUtils.NOT_EXPRESSION = 0;

/* '{{{{' '\s'* ('not \s, special-char'+) '\s'* non-greedy '}}}}' and not follow by '}' */
HandlebarsUtils.RAW_BLOCK = 9; // {{{{block}}}}
HandlebarsUtils.rawBlockRegExp = /^\{\{\{\{\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*?\}\}\}\}/;
/* '{{{{' '/' ('not \s, special-char'+) non-greedy '}}}}' and not follow by '}' */
HandlebarsUtils.RAW_END_BLOCK = 10; // {{{{/block}}}}
HandlebarsUtils.rawEndBlockRegExp = /^\{\{\{\{\/([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)?\}\}\}\}(?!})/;

/* '{{{' '~'? 'space'* '@'? 'space'* ('not {}~'+) 'space'* ('not {}~'+) '~'? non-greedy '}}}' and not follow by '}' */
HandlebarsUtils.RAW_EXPRESSION = 1; // {{{expression}}}
// HandlebarsUtils.rawExpressionRegExp = /^\{\{\{\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>\[\\\]\^`\{\|\}\~]+)\s*?\}\}\}(?!})/;
HandlebarsUtils.rawExpressionRegExp = /^\{\{\{~?\s*@?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}\}(?!})/;

/* '{{' '~'? 'space'* '@'? 'space'* ('not {}~'+) 'space'* ('not {}~'+) '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.ESCAPE_EXPRESSION = 2; // {{expression}}
HandlebarsUtils.escapeExpressionRegExp = /^\{\{~?\s*@?\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;

/* '{{' '~'? '>' '\s'* ('not \s, special-char'+) '\s'* 'not ~{}'* non-greedy '}}' and not follow by '}' */
HandlebarsUtils.PARTIAL_EXPRESSION = 3; // {{>.*}}
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?>\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^~\}\{]*~??\}\}(?!})/;

/* '{{' '~'? '&' '\s'* ('not \s, special-char'+) '\s'* 'not ~{}'* non-greedy '}}' and not follow by '}' */
HandlebarsUtils.REFERENCE_EXPRESSION = 11; // {{&.*}}
HandlebarsUtils.referenceExpressionRegExp = /^\{\{~?&\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^~\}\{]*~??\}\}(?!})/;

/* '{{' '~'? '# or ^' '\s'* ('not \s, special-char'+) '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.BRANCH_EXPRESSION = 4; // {{#.*}}, {{^.*}}
HandlebarsUtils.branchExpressionRegExp = /^\{\{~?[#|\^]\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^\}\{~]*~??\}\}(?!})/;
/* '{{' '~'? '/' '\s'* ('not \s, special-char'+) '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.BRANCH_END_EXPRESSION = 5; // {{/.*}}
HandlebarsUtils.branchEndExpressionRegExp = /^\{\{~?\/\s*([^\s!"#%&'\(\)\*\+,\.\/;<=>@\[\\\]\^`\{\|\}\~]+)\s*[^\}\{~]*~??\}\}(?!})/;

/* '{{' '~'? '\s'* 'else' '\s'* 'not {}~'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.ELSE_EXPRESSION = 6; // {{else}}, {{^}}
HandlebarsUtils.elseExpressionRegExp = /^\{\{~?\s*else\s*[^\}\{~]*~??\}\}(?!})/;
/* '{{' '~'? '^'{1} '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.elseShortFormExpressionRegExp = /^\{\{~?\^{1}~??\}\}(?!})/;

/* '{{' '~'? '!--' */
HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM = 7; // {{!--.*--}}
HandlebarsUtils.commentLongFormExpressionRegExp = /^\{\{~?!--/;
/* '{{' '~'? '!' */
HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM = 8; // {{!.*}}
HandlebarsUtils.commentShortFormExpressionRegExp = /^\{\{~?!/;

// @function HandlebarsUtils.lookAheadTest
HandlebarsUtils.lookAheadTest = function(input, i) {
    var len = input.length,
        j;

    /* reserved char must be the immediate char right after brace */
    if (input[i] === '{' && i+2<len && input[i+1] === '{') {
        j = input[i+2] === '~' ? 3 : 2;

        switch(input[i+j]) {
            case '>':
                return HandlebarsUtils.PARTIAL_EXPRESSION;
            case '#':
                return HandlebarsUtils.BRANCH_EXPRESSION;
            case '^':
                // {{~?^}} will pass!, but isValidExpression can guard against
                return HandlebarsUtils.BRANCH_EXPRESSION;
            case '/':
                return HandlebarsUtils.BRANCH_END_EXPRESSION;
            case '&':
                return HandlebarsUtils.REFERENCE_EXPRESSION;
            case '!':
                if (i+j+2<len && input[i+j+1] === '-' && input[i+j+2] === '-') {
                    return HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM;
                }
                return HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM;
            default: 
                return HandlebarsUtils.ESCAPE_EXPRESSION;
        }
    }
    return HandlebarsUtils.UNHANDLED_EXPRESSION;
};

// @function HandlebarsUtils.isValidExpression
HandlebarsUtils.isValidExpression = function(input, i, type) {
    var re = {};
    var s = input.slice(i);
    switch(type) {
        case HandlebarsUtils.RAW_BLOCK:
            re = HandlebarsUtils.rawBlockRegExp.exec(s);
            break;
        case HandlebarsUtils.RAW_END_BLOCK:
            re = HandlebarsUtils.rawEndBlockRegExp.exec(s);
            break;
        case HandlebarsUtils.RAW_EXPRESSION:
            re = HandlebarsUtils.rawExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.ESCAPE_EXPRESSION:
            re = HandlebarsUtils.escapeExpressionRegExp.exec(s);
            if (re !== null && re[1] !== undefined) {
                if (HandlebarsUtils.isReservedChar(re[1], 0)) {
                    re.tag = false;
                    re.isSingleID = false;
                    re.result = false;
                    return re;
                }
                if (re[2] === '') {
                    re.isSingleID = true;
                } else {
                    re.isSingleID = false;
                }
            }
            break;
        case HandlebarsUtils.PARTIAL_EXPRESSION:
            re = HandlebarsUtils.partialExpressionRegExp.exec(s);
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
        case HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM:
            re = HandlebarsUtils.commentLongFormExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM:
            re = HandlebarsUtils.commentShortFormExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.REFERENCE_EXPRESSION:
            re = HandlebarsUtils.referenceExpressionRegExp.exec(s);
            break;
        default:
            return re;
    }

    if (re !== null) {
        re.result = true;
        if (re !== null && re[1]) {
            re.tag = re[1];
        }
    } else {
        re = {};
        re.tag = false;
        re.isSingleID = false;
        re.result = false;
    }
    return re;
};

// @function HandlebarsUtils.isReservedChar
HandlebarsUtils.isReservedChar = function(input, i) {
    var ch = input[i];
    if (ch === '~' && i+1<input.length) {
        ch = input[i+1];
    }

    return (ch === '#' || ch === '/' || ch === '>' || ch === '^' || ch === '!' || ch === '&');
};

// @function HandlebarsUtils.handleError
HandlebarsUtils.handleError = function(exceptionObj, throwErr) {
    if (throwErr) {
        throw exceptionObj;
    } else if (typeof console === 'object') {
        if (console.hasOwnProperty('warn') && typeof console.warn === 'function') {
            console.warn(exceptionObj.msg + " [lineNo:" + exceptionObj.lineNo + ",charNo:" + exceptionObj.charNo + "]");
        } else if (console.hasOwnProperty('log') && typeof console.log === 'function') {
            console.log(exceptionObj.msg + " [lineNo:" + exceptionObj.lineNo + ",charNo:" + exceptionObj.charNo + "]");
        }
    }
};

// @function HandlebarsUtils.blacklistProtocol
HandlebarsUtils.blacklistProtocol = function(s) {
    /* the assumption of the blacklist filter behavior is to modify the input 
       if it is blacklisted
    */
    var es = encodeURI(s),
        ns = filter.yubl(es);
    return (ns[0] !== es[0] || ns[1] !== es[1]);
};

module.exports = HandlebarsUtils;

})();
