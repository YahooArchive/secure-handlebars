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

var cssParser = require("./css-parser.js");

/////////////////////////////////////////////////////
//
// @module CSSParserUtils
// 
/////////////////////////////////////////////////////
var CSSParserUtils = {};

/*
'&#0*45;?|&#[xX]0*2[dD];?'                              // minus & dash
'&#0*92;?|&#[xX]0*5[cC];?|&bsol;'		 	// \
'&#0*95;?|&#[xX]0*5[fF];?|&lowbar;|&UnderBar;'		// _
'&#0*58;?|&#[xX]0*3[aA];?|&colon;'      		// colon
'&#0*59;?|&#[xX]0*3[bB];?|&semi;'       		// semicolon
'&#0*40;?|&#[xX]0*28;?|&lpar;'          		// (
'&#0*41;?|&#[xX]0*29;?|&rpar;'          		// )
'&#0*34;?|&#[xX]0*22;?|&quot;|&QUOT;'			// "
'&#0*39;?|&#[xX]0*27;?|&apos;'				// '
'&#0*47;?|&#[xX]0*2[fF];?|&sol;'			// /
'&#0*44;?|&#[xX]0*2[cC];?|&comma;'			// ,
'&#0*43;?|&#[xX]0*2[bB];?|&plus;'			// +
'&#0*37;?|&#[xX]0*25;?|&percnt;'			// percentage
'&#0*35;?|&#[xX]0*23;?|&num;'				// hash
'&#0*33;?|&#[xX]0*21;?|&excl;'		 		// !
'&#0*42;?|&#[xX]0*2[aA];?|&ast;|&midast;'		// *
'&#0*32;?|&#[xX]0*20;?|&#0*9;?|&#[xX]0*9;?|&Tab;|&#0*10;?|&#[xX]0*[aA];?|&NewLine;|&#0*12;?|&#[xX]0*[cC];?|&#0*13;?|&#[xX]0*[dD];?|\t|\r|\n|\f'; // space,\t,\r,\n,\f

note: the decoding order is important, as we are using regExp not real parsing. 
for example, we need to replace \ before space, as &#0*92 needs to be checked before &#0*9.
the correct decoding order is to match as greedy as possible first, that is matching N digit before N-1 digit.

*/
CSSParserUtils.cssReplaceChar = [ '-', '\\', '_', ':', ';', '(', ')', '"', '\'', '\/', ',', '+', '%', '#', '!', '*', ' ' ];
CSSParserUtils.reCss = [
    /&#0*45;?|&#[xX]0*2[dD];?/g,
    /&#0*92;?|&#[xX]0*5[cC];?|&bsol;/g,
    /&#0*95;?|&#[xX]0*5[fF];?|&lowbar;|&UnderBar;/g,
    /&#0*58;?|&#[xX]0*3[aA];?|&colon;/g,
    /&#0*59;?|&#[xX]0*3[bB];?|&semi;/g,
    /&#0*40;?|&#[xX]0*28;?|&lpar;/g,
    /&#0*41;?|&#[xX]0*29;?|&rpar;/g,
    /&#0*34;?|&#[xX]0*22;?|&quot;|&QUOT;/g,
    /&#0*39;?|&#[xX]0*27;?|&apos;/g,
    /&#0*47;?|&#[xX]0*2[fF];?|&sol;/g,
    /&#0*44;?|&#[xX]0*2[cC];?|&comma;/g,
    /&#0*43;?|&#[xX]0*2[bB];?|&plus;/g,
    /&#0*37;?|&#[xX]0*25;?|&percnt;/g,
    /&#0*35;?|&#[xX]0*23;?|&num;/g,
    /&#0*33;?|&#[xX]0*21;?|&excl;/g,
    /&#0*42;?|&#[xX]0*2[aA];?|&ast;|&midast;/g,
    /&#0*32;?|&#[xX]0*20;?|&#0*9;?|&#[xX]0*9;?|&Tab;|&#0*10;?|&#[xX]0*[aA];?|&NewLine;|&#0*12;?|&#[xX]0*[cC];?|&#0*13;?|&#[xX]0*[dD];?|\t|\r|\n|\f/g,
];

/* emum type of parseStyleAttributeValue */
CSSParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED      = 1;
CSSParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED = 2;
CSSParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED = 3;
CSSParserUtils.STYLE_ATTRIBUTE_UNQUOTED          = 4;
CSSParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED     = 5;
CSSParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED     = 6;

CSSParserUtils.STYLE_ATTRIBUTE_ERROR                     = -1;
CSSParserUtils.SEMICOLON                                 = -2;

/**
* @function CSSParserUtils.htmlStyleAttributeValueEntitiesDecode
*
* @description
* htmlStyleAttributeValueEntitiesDecode for delimiter in style attribute as defined in the spec.
* all special characters being defined must be decoded first (defined in cssReplaceChar).
* http://www.w3.org/TR/css-style-attr/
*/
CSSParserUtils.htmlStyleAttributeValueEntitiesDecode = function(str) {
    /* html decode the str before CSS parsing,
       we follow the parsing order of the browser */
    var len = CSSParserUtils.reCss.length;
    for (var j=0;j<len;++j) {
        str = str.replace(CSSParserUtils.reCss[j], CSSParserUtils.cssReplaceChar[j]);
    }
    return str;
};

/**
* @function CSSParserUtils.parseStyleAttributeValue
*
* @description
*/
CSSParserUtils.parseStyleAttributeValue = function(str) {

    var r = { prop: '', code: NaN },
        p = cssParser.parse(str),
        l = p.length-1;

    if (l >= 0) {
        r.prop = p[l].key;
        r.code = p[l].type;
    }

    return r;
};

/* exposing it */
module.exports = CSSParserUtils;

})();
