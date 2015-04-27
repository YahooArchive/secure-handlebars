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

/* import the html context parser */
var contextParser = require('context-parser');

/////////////////////////////////////////////////////
//
// @module CustomizedContextParser
// 
/////////////////////////////////////////////////////

/**
* @module CustomizedContextParser
*/
function CustomizedContextParser() {

    /* super() */
    contextParser.Parser.call(this);

    /* save the processed char */
    this._buffer = [];
}

/* inherit the Context Parser */
CustomizedContextParser.prototype = Object.create(contextParser.Parser.prototype);

/**
* @function CustomizedContextParser.getInternalState
*
* @description
* Get the internal state of the Context Parser.
*/
contextParser.Parser.prototype.getInternalState = function() {
    var stateObj = {};
    stateObj.state = this.state;
    stateObj.tagNames = this.tagNames;
    stateObj.tagNameIdx = this.tagNameIdx;
    stateObj.attributeName = this.attributeName;
    stateObj.attributeValue = this.attributeValue;
    return stateObj;
};

/**
* @function CustomizedContextParser.setInternalState
*
* @description
* Set the internal state of the Context Parser.
*/
contextParser.Parser.prototype.setInternalState = function(stateObj) {
    // TODO: these 2 apis need to combine.
    this.setInitState(stateObj.state);
    this.setCurrentState(stateObj.state);

    this.tagNames = stateObj.tagNames.slice(0); // need deep copy
    this.tagNameIdx = stateObj.tagNameIdx;
    this.attributeName = stateObj.attributeName;
    this.attributeValue = stateObj.attributeValue;
};

/**
* @function CustomizedContextParser.clearBuffer
*
* @description
* Clear the buffer.
*/
contextParser.Parser.prototype.clearBuffer = function() {
    // http://jsperf.com/array-destroy
    this._buffer = [];
};

/**
* @function CustomizedContextParser.getOutput
*
* @description
* Get the output of processed chars.
*/
contextParser.Parser.prototype.getOutput = function() {
    return this._buffer.join('');
};

/**
* @function CustomizedContextParser.saveToBuffer
*
* @description
* Save the processed char to the buffer array and return
* it through getOutput()
*/
contextParser.Parser.prototype.saveToBuffer = function(str) {
    this._buffer.push(str);
};

/**
* @function CustomizedContextParser.afterWalk
*
* @descciption 
* Override the HTML5 Context Parser's afterWalk
*/
contextParser.Parser.prototype.afterWalk = function(ch, i) {
    this.saveToBuffer(ch);
};

/* exposing it */
module.exports = CustomizedContextParser;

})();
