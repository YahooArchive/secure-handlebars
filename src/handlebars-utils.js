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

/* Handlebars for tokenization */
var Handlebars = require('handlebars');

/* type of expression */
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
        re;

    if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '>') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '>') 
    ) {
        return HandlebarsUtils.PARTIAL_EXPRESSION;
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
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '&') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '&') 
    ) {
        return HandlebarsUtils.REFERENCE_EXPRESSION;
    } else if ((input[i] === '{' && i+4<len && input[i+1] === '{' && input[i+2] === '!' && input[i+3] === '-' && input[i+4] === '-') ||
        (input[i] === '{' && i+5<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!' && input[i+4] === '-' && input[i+5] === '-') 
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_LONG_FORM;
    } else if ((input[i] === '{' && i+2<len && input[i+1] === '{' && input[i+2] === '!') ||
        (input[i] === '{' && i+3<len && input[i+1] === '{' && input[i+2] === '~' && input[i+3] === '!') 
    ) {
        return HandlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM;
    }

    return HandlebarsUtils.ESCAPE_EXPRESSION;
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
    if (ch === '~' && input.length > i+1) {
        ch = input[i+1];
    }

    if (ch === '#' || ch === '/' || ch === '>' || ch === '^' || ch === '!' || ch === '&') {
        return true;
    } else {
        return false;
    }
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
