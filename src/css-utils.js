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
