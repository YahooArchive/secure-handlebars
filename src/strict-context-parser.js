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
var ContextParser = require('context-parser').Parser;

/////////////////////////////////////////////////////
//
// @module ContextParser 
// 
/////////////////////////////////////////////////////

// Reference: http://www.w3.org/TR/html-markup/elements.html
ContextParser.ATTRTYPE_URI = 1,
ContextParser.ATTRTYPE_CSS = 2,
ContextParser.ATTRTYPE_SCRIPTABLE = 3,
ContextParser.ATTRTYPE_MIME = 4,
ContextParser.ATTRTYPE_GENERAL = undefined;

ContextParser.attributeNamesType = {
    // we generally do not differentiate whether these attribtues are tag specific during matching for simplicity
    'href'       :ContextParser.ATTRTYPE_URI,     // for a, link, img, area, iframe, frame, video, object, embed ...
    'src'        :ContextParser.ATTRTYPE_URI,
    'background' :ContextParser.ATTRTYPE_URI,     // for body, table, tbody, tr, td, th, etc? (obsolete)
    'action'     :ContextParser.ATTRTYPE_URI,     // for form, input, button
    'formaction' :ContextParser.ATTRTYPE_URI,     
    'cite'       :ContextParser.ATTRTYPE_URI,     // for blockquote, del, ins, q
    'poster'     :ContextParser.ATTRTYPE_URI,     // for img, object, video, source
    'usemap'     :ContextParser.ATTRTYPE_URI,     // for image
    'longdesc'   :ContextParser.ATTRTYPE_URI,                         
    'folder'     :ContextParser.ATTRTYPE_URI,     // for a
    'manifest'   :ContextParser.ATTRTYPE_URI,     // for html
    'classid'    :ContextParser.ATTRTYPE_URI,     // for object
    'codebase'   :ContextParser.ATTRTYPE_URI,     // for object, applet
    'icon'       :ContextParser.ATTRTYPE_URI,     // for command
    'profile'    :ContextParser.ATTRTYPE_URI,     // for head
    /* TODO: we allow content before we implement the stack in CP for tracking attributeName
    'content'    :ContextParser.ATTRTYPE_URI,     // for meta http-equiv=refresh
    */

    // http://www.w3.org/TR/xmlbase/#syntax
    'xmlns'      :ContextParser.ATTRTYPE_URI,     // for svg, etc?
    'xml:base'   :ContextParser.ATTRTYPE_URI, 
    'xmlns:xlink':ContextParser.ATTRTYPE_URI,
    'xlink:href' :ContextParser.ATTRTYPE_URI,     // for xml-related

    // srcdoc is the STRING type, not URI
    'srcdoc'     :ContextParser.ATTRTYPE_URI,     // for iframe

    'style'      :ContextParser.ATTRTYPE_CSS,     // for global attributes list

    // pattern matching, handling it within the function getAttributeNameType
    // 'on*'     :ContextParser.ATTRTYPE_SCRIPTABLE,

    'type'       :ContextParser.ATTRTYPE_MIME,    // TODO: any potential attack of the MIME type?

    'data'       :{'object'  :ContextParser.ATTRTYPE_URI},
    'rel'        :{'link'    :ContextParser.ATTRTYPE_URI},
    'value'      :{'param'   :ContextParser.ATTRTYPE_URI},
};

/**
 * @function ContextParser#getAttributeNameType
 *
 * @returns {integer} the attribute type defined for different handling
 *
 * @description
 * Check if the current tag can possibly incur script either through configuring its attribute name or inner HTML
 *
 */
ContextParser.prototype.getAttributeNameType = function() {
    if (this.attrName[0] === 'o' && this.attrName[1] === 'n') { /* assuming it is from Strict Context Parser.
                                                                             and o{{placeholder}}n* can bypass the check.
                                                                             anyway, we are good to throw error in atttribute name state. 
                                                                             note: CP has lowerCase the attributeName */
        return ContextParser.ATTRTYPE_SCRIPTABLE;
    } else {
        // TODO: support compound uri context at <meta http-equiv="refresh" content="seconds; url">, <img srcset="url 1.5x, url 2x">

        // return ContextParser.ATTRTYPE_GENERAL for case without special handling
        // here,  attrTags === [integer] is a tag agnostic matching
        // while, attrTags[tags] === [integer] matches only those attribute of the given tagName

        var attrTags = ContextParser.attributeNamesType[this.attrName];
        return typeof attrTags === 'object'? attrTags[this.tags[0]] : attrTags;
    }
};

/**
 * @function ContextParser#cloneStates
 *
 * @params {parser} the Context Parser for copying states.
 *
 * @description
 * Copy the required states for state comparison in the conditional branching templates.
 *
 */
ContextParser.prototype.cloneStates = function(parser) {
    this.state = parser.getLastState();
    this.attrName = parser.getAttributeName();
    this.attributeValue = parser.getAttributeValue();
};

/* exposing it */
module.exports = ContextParser;

})();
