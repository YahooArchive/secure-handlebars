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
CSSParserUtils.cssReplaceChar = [ '\\', '_', ':', ';', '(', ')', '"', '\'', '\/', ',', '+', '%', '#', '!', '*', ' ' ];
CSSParserUtils.reCss = [
    /&bsol;/g,
    /&lowbar;|&UnderBar;/g,
    /&colon;/g,
    /&semi;/g,
    /&lpar;/g,
    /&rpar;/g,
    /&quot;|&QUOT;/g,
    /&apos;/g,
    /&sol;/g,
    /&comma;/g,
    /&plus;/g,
    /&percnt;/g,
    /&num;/g,
    /&excl;/g,
    /&ast;|&midast;/g,
    /&Tab;|&NewLine;|\t|\r|\n|\f/g,
];

// https://html.spec.whatwg.org/multipage/syntax.html#character-references
// these pattern is mutually exclusive.
CSSParserUtils.reHtmlDecEntities = /&#0*([0-9]+);?/g;
CSSParserUtils.reHtmlHexEntities = /&#(?:[xX])0*([a-fA-F0-9]+);?/g;
// fromCodePoint has limitation, please check the TODO in the htmlDecode function below
var codePointConvertor = String.fromCodePoint || String.fromCharCode;

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
* The purpose of these functions are to decode the html entities that will affect
* the CSS parsing. Basically, any numeric and named character reference representing
* the delimiter in the CSS grammer needs to be decoded.
*
* For example, semicolon represents a delimiter in CSS grammar, so we need to decode it,
* however, &gt; is not a delimitor, so we can keep it intact without affecting the CSS
* parsing in the downstream. Please be noted that &gt; itself will cause parsing error
* no matter decode or not if it does not belong to the STRING token.
*
* These function decode more than we need to prevent CSS parsing error.
*
* Reference:
* http://www.w3.org/TR/css-style-attr/
*
*/
CSSParserUtils.htmlStyleAttributeValueEntitiesDecode = function(str) {
    /* html decode the str before CSS parsing,
       we follow the parsing order of the browser */
     
    // numeric char reference decoding
    str = this.htmlDecode(str);

    // named char reference decoding
    var len = CSSParserUtils.reCss.length;
    for (var j=0;j<len;++j) {
        str = str.replace(CSSParserUtils.reCss[j], CSSParserUtils.cssReplaceChar[j]);
    }
    return str;
};

/**
* @function CSSParserUtils.htmlDecode
*/
CSSParserUtils.htmlDecode = function(str) {
    //
    // We are ok of not decoding the utf-16 string with 2 bytes,
    // with the assumption that any 2 bytes char does not represent as 
    // any CSS grammar delimiter.

    // TODO: add the polyfil of fromCharCode
    // TODO: double confirm some high chars representing any delimiter, especially IE.
    //
    var s = str.replace(CSSParserUtils.reHtmlDecEntities, function(m, p) {
        // \uffff = 65535
        var c = parseInt(p) <= 65535? codePointConvertor(p) : '&#'+p+';';
        return c;
    });
    return s.replace(CSSParserUtils.reHtmlHexEntities, function(m, p) {
        var c = p.length <= 4? codePointConvertor('0x'+p) : '&#x'+p+';';
        return c;
    });
};

/**
* @function CSSParserUtils.parseStyleAttributeValue
*/
CSSParserUtils.parseStyleAttributeValue = function(str) {

    var r = { prop: '', code: CSSParserUtils.STYLE_ATTRIBUTE_ERROR },
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
