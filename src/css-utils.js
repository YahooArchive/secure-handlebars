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

require('./polyfill.js');
var cssParser = require("./css-parser/css-parser.js");

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

// no need to consider the char below as our parser will complain parse error.
'&#0*64;?|&#[xX]0*40;?|&commat;'		 	// @
'&#0*46;?|&#[xX]0*2[eE];?|&period;'		 	// .
'&#0*123;?|&#[xX]0*7[bB];?|&lcub;|&lbrace;'	        // {
'&#0*125;?|&#[xX]0*7[dD];?|&rcub;|&rbrace;'	        // }
*/

CSSParserUtils.reHtmlDecode = /(&bsol;|&lowbar;|&UnderBar;|&colon;|&semi;|&lpar;|&rpar;|&quot;|&QUOT;|&apos;|&sol;|&comma;|&plus;|&percnt;|&num;|&excl;|&ast;|&midast;|&Tab;|&NewLine;|\t|\r|\n|\f)/g;
CSSParserUtils.HtmlDecodeReplacement = {
    '&bsol;'     : '\\',
    '&lowbar;'   : '_', '&UnderBar;' : '_',
    '&colon;'    : ':',
    '&semi;'     : ';',
    '&lpar;'     : '(',
    '&rpar;'     : ')',
    '&quot;'     : '"', '&QUOT;'     : '"',
    '&apos;'     : '\'',
    '&sol;'      : '\/',
    '&comma;'    : ',',
    '&plus;'     : '+',
    '&percnt;'   : '%',
    '&num;'      : '#',
    '&excl;'     : '!',
    '&ast;'      : '*', '&midast;'   : '*',
    '&Tab;'      : ' ', '&NewLine;'  : ' ', '\t'         : ' ', '\r'         : ' ', '\n'         : ' ', '\f'         : ' ',
};

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
// TODO: use client side for html decode in dist/*.js version
CSSParserUtils.reCharReferenceDecode = /&([a-z]{2,};?)|&#0*(x[a-f0-9]+|[0-9]+);?/ig;
CSSParserUtils.htmlStyleAttributeValueEntitiesDecode = function(str) {
    /* html decode the str before CSS parsing,
       we follow the parsing order of the browser */
     
    // TODO: combine the following code with the html entities branch later.
    // and we did slightly more than html decoding, we replace \r\n\f\t with space for
    // secure-handlebars for filter judgement without considering those chars.
    var fromCodePoint = String.fromCodePoint;
    str = str.replace(CSSParserUtils.reCharReferenceDecode, function(m, named, number) {
        if (named) {
            return m;
        }

        var i = parseInt(number[0] <= '9' ? number : '0' + number);  // parseInt('0xA0') is equiv to parseInt('A0', 16)
        return ((i>=0 && i<=0xD7FF) || (i>=0xE000 && i<=0xFFFF) || (i>=0x10000 && i<=0x10FFFF)) ? fromCodePoint(i) : '\uFFFD';
    });
    str = str.replace(CSSParserUtils.reHtmlDecode, function(m, p) {
        return CSSParserUtils.HtmlDecodeReplacement[p];
    });

    return str;
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
