/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/*jshint -W030 */
(function () {
"use strict";

/* import the required package */
var ContextParser = require('context-parser'),
    Parser = ContextParser.Parser;

/////////////////////////////////////////////////////
//
// @module Parser 
// 
/////////////////////////////////////////////////////

// Reference: http://www.w3.org/TR/html-markup/elements.html
Parser.ATTRTYPE_URI = 1,
Parser.ATTRTYPE_CSS = 2,
Parser.ATTRTYPE_SCRIPTABLE = 3,
Parser.ATTRTYPE_MIME = 4,
Parser.ATTRTYPE_GENERAL = undefined;

Parser.attributeNamesType = {
    // we generally do not differentiate whether these attribtues are tag specific during matching for simplicity
    'href'       :Parser.ATTRTYPE_URI,     // for a, link, img, area, iframe, frame, video, object, embed ...
    'src'        :Parser.ATTRTYPE_URI,
    'background' :Parser.ATTRTYPE_URI,     // for body, table, tbody, tr, td, th, etc? (obsolete)
    'action'     :Parser.ATTRTYPE_URI,     // for form, input, button
    'formaction' :Parser.ATTRTYPE_URI,     
    'cite'       :Parser.ATTRTYPE_URI,     // for blockquote, del, ins, q
    'poster'     :Parser.ATTRTYPE_URI,     // for img, object, video, source
    'usemap'     :Parser.ATTRTYPE_URI,     // for image
    'longdesc'   :Parser.ATTRTYPE_URI,                         
    'folder'     :Parser.ATTRTYPE_URI,     // for a
    'manifest'   :Parser.ATTRTYPE_URI,     // for html
    'classid'    :Parser.ATTRTYPE_URI,     // for object
    'codebase'   :Parser.ATTRTYPE_URI,     // for object, applet
    'icon'       :Parser.ATTRTYPE_URI,     // for command
    'profile'    :Parser.ATTRTYPE_URI,     // for head
    /* TODO: we allow content before we implement the stack in CP for tracking attributeName
    'content'    :Parser.ATTRTYPE_URI,     // for meta http-equiv=refresh
    */

    // http://www.w3.org/TR/xmlbase/#syntax
    'xmlns'      :Parser.ATTRTYPE_URI,     // for svg, etc?
    'xml:base'   :Parser.ATTRTYPE_URI, 
    'xmlns:xlink':Parser.ATTRTYPE_URI,
    'xlink:href' :Parser.ATTRTYPE_URI,     // for xml-related

    // srcdoc is the STRING type, not URI
    'srcdoc'     :Parser.ATTRTYPE_SCRIPTABLE,     // for iframe

    'style'      :Parser.ATTRTYPE_CSS,     // for global attributes list

    // pattern matching, handling it within the function getAttributeNameType
    // 'on*'     :Parser.ATTRTYPE_SCRIPTABLE,

    'type'       :Parser.ATTRTYPE_MIME,    // TODO: any potential attack of the MIME type?

    'data'       :{'object'  :Parser.ATTRTYPE_URI},
    'rel'        :{'link'    :Parser.ATTRTYPE_URI},
    'value'      :{'param'   :Parser.ATTRTYPE_URI},
};

/**
 * @function Parser#getAttributeNameType
 *
 * @returns {integer} the attribute type defined for different handling
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
Parser.prototype.getAttributeNameType = function() {
    // Assume CP has **lowercased** the attributeName
    var attrName = this.getAttributeName();

    // TODO: support compound uri context at <meta http-equiv="refresh" content="seconds; url">, <img srcset="url 1.5x, url 2x">

    // Note: o{{placeholder}}n* can bypass the check. Anyway, we are good to throw error in atttribute name state. 
    if (attrName[0] === 'o' && attrName[1] === 'n') { 
        return Parser.ATTRTYPE_SCRIPTABLE;
    }

    // return Parser.ATTRTYPE_GENERAL (i.e. undefined) for case without special handling
    // here,  attrTags === [integer] is a tag agnostic matching
    // while, attrTags[tags] === [integer] matches only those attribute of the given tagName
    var attrTags = Parser.attributeNamesType[attrName];
    return typeof attrTags === 'object'? attrTags[this.getStartTagName()] : attrTags;
};

/**
 * @function Parser#cloneStates
 *
 * @params {parser} the Context Parser for copying states.
 *
 * @description
 * Copy the required states for state comparison in the conditional branching templates.
 *
 */
Parser.prototype.cloneStates = function(parser) {
    this.state = parser.getCurrentState();
    this.attrName = parser.getAttributeName();
    this.attributeValue = parser.getAttributeValue();
};

/**
 * @function ContextParser#getParser
 *
 * @description
 * expose a factory that carries default settings
 *
 */
ContextParser.getParser = function () {
    return new ContextParser.Parser({
        enableInputPreProcessing: true,
        enableCanonicalization: true,
        enableVoidingIEConditionalComments: true,
        enableStateTracking: false
    });
};

module.exports = ContextParser;

})();
