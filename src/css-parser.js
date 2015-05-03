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

/////////////////////////////////////////////////////
//
// @module CSSParser
// 
/////////////////////////////////////////////////////
var CSSParser = {};

/*
'&#0*8722;?|&#[xX]0*2212;?|&minus;|&#0*8208;?|&#[xX]0*2010;?|&dash;|&hyphen;'		// minus & dash
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
CSSParser.cssReplaceChar = [ '-', '\\', '_', ':', ';', '(', ')', '"', '\'', '\/', ',', '+', '%', '#', '!', '*', ' ' ];
CSSParser.reCss = [
    /&#0*8722;?|&#[xX]0*2212;?|&minus;|&#0*8208;?|&#[xX]0*2010;?|&dash;|&hyphen;/g,
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

CSSParser.reExpr = /(['"]?)?\s*([0-9a-z%#\-+_,!\/\\\*]+)(\([^\(]?\)?)?\s*(['"]?)?\s*/ig;

/* re for URL pattern */
CSSParser.reUrlUnquoted = /^url\(\s*$/i;
CSSParser.reUrlSingleQuoted = /^url\(\s*'$/i;
CSSParser.reUrlDoubleQuoted = /^url\(\s*"$/i;

/* emum type of parseStyleAttributeValue */
CSSParser.STYLE_ATTRIBUTE_URL_UNQUOTED      = 1;
CSSParser.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED = 2;
CSSParser.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED = 3;
CSSParser.STYLE_ATTRIBUTE_UNQUOTED          = 4;
CSSParser.STYLE_ATTRIBUTE_SINGLE_QUOTED     = 5;
CSSParser.STYLE_ATTRIBUTE_DOUBLE_QUOTED     = 6;

CSSParser.STYLE_ATTRIBUTE_ERROR_AT_PROP_LOCATION = -1;
CSSParser.STYLE_ATTRIBUTE_ERROR_PROP_EMPTY       = -2;
CSSParser.STYLE_ATTRIBUTE_ERROR                  = -3;

/**
* @function CSSParser.htmlStyleAttributeValueEntitiesDecode
*
* @description
* htmlStyleAttributeValueEntitiesDecode for delimiter in style attribute as defined in the spec.
* all special characters being defined must be decoded first (defined in cssReplaceChar).
* http://www.w3.org/TR/css-style-attr/
*/
CSSParser.htmlStyleAttributeValueEntitiesDecode = function(str) {
    /* html decode the str before CSS parsing,
       we follow the parsing order of the browser */
    var len = CSSParser.reCss.length;
    for (var j=0;j<len;++j) {
        str = str.replace(CSSParser.reCss[j], CSSParser.cssReplaceChar[j]);
    }
    return str;
};

/**
* @function CSSParser.parseStyleAttributeValue
*
* @description
*/
CSSParser.parseStyleAttributeValue = function(str) {
    var r = { prop: '', code: NaN };
    var kv = str.split(';'); // it will return new array even there is no ';' in the string
    var v = kv[kv.length-1].split(':'); // only handling the last element
    if (v.length === 2) {

        // it is ok to trim the space at both ends
        var prop = v[0].trim(), 
            expr = v[1].trim();
        if (prop === '') {
            r.code = CSSParser.STYLE_ATTRIBUTE_ERROR_PROP_EMPTY;
            return r;
        }
        r.prop = prop;

        /* consume the expr and return the last expr 
        * this block can be remove with 'var lexpr = expr' without affecting the following code.
        * (EXPERIMENTAL)
        *
        * TODO: migrate to css-js when the npm is stable
        */
        var parseError = false;
        var lexpr = expr.replace(CSSParser.reExpr, function(m, p1, p2, p3, p4) {
            p3 = p3 !== undefined? p3.trim() : p3; // p3 may has space

            /* CSS STRING patterns */
            if (p1 !== undefined && p4 !== undefined && p1.match(/^['"]$/) && p4.match(/^['"]$/)) {
                return ''; /* consume the string */
            }

            // p2 is always not undefined based on the regExp
            if (p2 !== undefined && p2.match(/url/i) && p3 !== undefined && p3.match(/^\(/)) {
                if (p3.match(/"$/) || (p4 !== undefined && p4.trim() === '"')) {
                    return 'url("';
                } else if (p3.match(/'$/) || (p4 !== undefined && p4.trim() === "'")) {
                    return "url('";
                } else if (p4 === undefined || (p4 !== undefined && p4.trim() === "")) {
                    return "url(";
                }
            }

            if (p1 === undefined && p4 !== undefined) {
                if (p4 === '"') return '"'; /* this quote belong to the next expr */
                if (p4 === "'") return "'"; /* this quote belong to the next expr */
            } else if (p1 !== undefined && p4 === undefined) {
                parseError = true; /* placeholder is part of the CSS STRING */
            }

            /* consume the expr */
            return '';    
        });
        if (parseError) { 
            r.code = CSSParser.STYLE_ATTRIBUTE_ERROR;
            return r;
        }

        if (lexpr === '') {
            r.code = CSSParser.STYLE_ATTRIBUTE_UNQUOTED;
            return r;
        } else if (lexpr.match(/^'$/)) {
            r.code = CSSParser.STYLE_ATTRIBUTE_SINGLE_QUOTED;
            return r;
        } else if (lexpr.match(/^"$/)) {
            r.code = CSSParser.STYLE_ATTRIBUTE_DOUBLE_QUOTED;
            return r;
        } else if (CSSParser.reUrlUnquoted.test(lexpr)) {
            r.code = CSSParser.STYLE_ATTRIBUTE_URL_UNQUOTED;
            return r;
        } else if (CSSParser.reUrlSingleQuoted.test(lexpr)) {
            r.code = CSSParser.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED;
            return r;
        } else if (CSSParser.reUrlDoubleQuoted.test(lexpr)) {
            r.code = CSSParser.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED;
            return r;
        }

        r.code = CSSParser.STYLE_ATTRIBUTE_ERROR;
    } else {
        r.code = CSSParser.STYLE_ATTRIBUTE_ERROR_AT_PROP_LOCATION;
    }
    return r;
};

/* exposing it */
module.exports = CSSParser;

})();
