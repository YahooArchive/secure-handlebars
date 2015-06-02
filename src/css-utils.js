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

require('../src/polyfills/minimal.js');
var cssParser = require("./css-parser/css-parser.js");

var HtmlEntitiesDecoder = require("./html-decoder/html-decoder.js"),
    htmlDecoder = new HtmlEntitiesDecoder(); 

/////////////////////////////////////////////////////
//
// @module CSSParserUtils
// 
/////////////////////////////////////////////////////
var CSSParserUtils = {};

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
* These function decode did slightly more than html decoding, we replace \r\n\f\t with space for
* secure-handlebars for filter judgement without considering those chars.
*
* Reference:
* http://www.w3.org/TR/css-style-attr/
*
*/
CSSParserUtils.reHtmlDecode = /(\t|\r|\n|\f)/g;
CSSParserUtils.HtmlDecodeReplacement = {
    '\t'         : ' ', // 0x09
    '\r'         : ' ', // 0x0A
    '\n'         : ' ', // 0x0C
    '\f'         : ' ', // 0x0D
};
CSSParserUtils.htmlStyleAttributeValueEntitiesDecode = function(str) {
    str = htmlDecoder.decode(str);
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
