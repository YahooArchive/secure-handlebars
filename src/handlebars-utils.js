/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {
"use strict";

/**
* @class HandlebarsUtils
* @static
*/
var HandlebarsUtils = {};

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
HandlebarsUtils.RAW_END_BLOCK = 11; // {{{{/block}}}}

/* reference: http://handlebarsjs.com/expressions.html */
/* '{{{{' '~'? 'not {}~'+ '~'? non-greedy '}}}}' and not follow by '}' */
HandlebarsUtils.rawBlockRegExp = /^\{\{\{\{~?\s*([^\}\{~\s]+)\s*~??\}\}\}\}(?!})/;
/* '{{{{' '~'? '/' 'not {}~'+ '~'? non-greedy '}}}}' and not follow by '}' */
HandlebarsUtils.rawEndBlockRegExp = /^\{\{\{\{~?\/\s*([^\}\{~\s]+)\s*~??\}\}\}\}(?!})/;
/* '{{{' '~'? 'not {}~'+ '~'? non-greedy '}}}' and not follow by '}' */
HandlebarsUtils.rawExpressionRegExp = /^\{\{\{~?([^\}\{~]+)~??\}\}\}(?!})/;

/* '{{' '~'? 'space'* ('not {}~'+) '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.escapeExpressionRegExp = /^\{\{~?\s*([^\}\{~]+)~??\}\}(?!})/;
/* '{{' '~'? '>' 'space'* ('not {}~'+) 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.partialExpressionRegExp = /^\{\{~?>\s*([^\}\{~]+)\s*~??\}\}(?!})/;
/* '{{' '~'? '@' 'space'* ('not {}~'+) 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.dataVarExpressionRegExp = /^\{\{~?@\s*([^\}\{~]+)\s*~??\}\}(?!})/;

// need to capture the first non-whitespace string and capture the rest
/* '{{' '~'? '# or ^' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.branchExpressionRegExp = /^\{\{~?[#|\^]\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? '/' 'space'* ('not \s{}~'+) 'space'* ('not {}~')* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.branchEndExpressionRegExp = /^\{\{~?\/\s*([^\s\}\{~]+)\s*([^\}\{~]*)~??\}\}(?!})/;
/* '{{' '~'? 'space'* 'else' 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.elseExpressionRegExp = /^\{\{~?\s*else\s*~??\}\}(?!})/;
/* '{{' '~'? 'space'* '^'{1} 'space'* '~'? non-greedy '}}' and not follow by '}' */
HandlebarsUtils.elseShortFormExpressionRegExp = /^\{\{~?\s*\^{1}\s*~??\}\}(?!})/;

// @function HandlebarsUtils.getExpressionType
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

// @function HandlebarsUtils.isValidExpression
HandlebarsUtils.isValidExpression = function(input, i, type) {
    var re = {};
    re.tag = false;
    re.result = false;
    var s = input.slice(i);
    switch(type) {
        case HandlebarsUtils.RAW_BLOCK:
            re = HandlebarsUtils.rawBlockRegExp.exec(s);
            if (re !== null) {
                re.tag = re[1];
            }
            break;
        case HandlebarsUtils.RAW_END_BLOCK:
            re = HandlebarsUtils.rawEndBlockRegExp.exec(s);
            if (re !== null) {
                re.tag = re[1];
            }
            break;
        case HandlebarsUtils.RAW_EXPRESSION:
            re = HandlebarsUtils.rawExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.ESCAPE_EXPRESSION:
            re = HandlebarsUtils.escapeExpressionRegExp.exec(s);
            if (re !== null && re[1] !== undefined) {
                if (HandlebarsUtils.isReservedChar(re[1], 0)) {
                    re.result = false;
                    return re;
                }
            }
            break;
        case HandlebarsUtils.PARTIAL_EXPRESSION:
            re = HandlebarsUtils.partialExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.DATA_VAR_EXPRESSION:
            re = HandlebarsUtils.dataVarExpressionRegExp.exec(s);
            break;
        case HandlebarsUtils.BRANCH_EXPRESSION:
            re = HandlebarsUtils.branchExpressionRegExp.exec(s);
            if (re !== null) {
                re.tag = re[1];
            }
            break;
        case HandlebarsUtils.BRANCH_END_EXPRESSION:
            re = HandlebarsUtils.branchEndExpressionRegExp.exec(s);
            if (re !== null) {
                re.tag = re[1];
            }
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
        re.tag = false;
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

    if (ch === '#' || ch === '/' || ch === '>' || ch === '@' || ch === '^' || ch === '!') {
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
