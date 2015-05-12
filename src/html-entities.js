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
// @module HTMLEntities
// 
/////////////////////////////////////////////////////
function HTMLEntities() {
    // the 0 index is used for code point
    this.namedCharReferenceTrie = [];
}

/**
@description
This is the index structure of the array for holding the trie.
We don't use the object prop lookup to improve the performance.

0       - the code point.
1-26    - the captial letter A-Z.
27-52   - the small letter a-z.
53-63   - the integer 0-9.
64      - the ';'.

The ASCII code of
A-Z     - 65 to 90
a-z     - 97 to 122
0-9     - 48 to 57
';'     - 59
'&'     - 38
*/

/* shift downwards 64 for the first element A (ascii=65) to index 1 */
var OFFSET_CAPTIAL_AZ_INDEX = -64; 
/* shift downwards 70 for the first element a (ascii=97) to index 27 */
var OFFSET_SMALL_AZ_INDEX = -70; 
/* shift upwards 5 for the first element 0 (ascii=48) to index 53 */
var OFFSET_INTEGER_INDEX = 5;
/* semicolon */
var SEMICOLON_ASCIICODE = 59;
var SEMICOLON_INDEX = 64;

/**
* @function HTMLEntites#buildNamedCharReferenceTrie
*
* @description
*/
HTMLEntities.prototype.buildNamedCharReferenceTrie = function(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var info = obj[key];
            if (!this.findStringWithCodePoint(key)) {
                this.addStringToTrie(this.namedCharReferenceTrie, key, info);
            }
        }
    }
    return obj;
};

/**
* @function HTMLEntities#findStringWithCodePoint
*
* @description
*/
HTMLEntities.prototype.findStringWithCodePoint = function(str) {
    return false;
};

/**
* @function HTMLEntities#addStringToTrie
*
* @description
*/
HTMLEntities.prototype.addStringToTrie = function(trie, str, info) {
    var l = str.length;
    var rootTrie = trie;

    for(var i=0;i<l;++i) {
        /* skip the '&' */
        if (str[i] === '&') continue;

        var childTrie = this.addCharToTrie(rootTrie, str[i]);
        rootTrie = childTrie;
    }
};

/**
* @function HTMLEntities#addCharToTrie
*
* @description
*/
HTMLEntities.prototype.addCharToTrie = function(trie, s) {
    var c = s.charCodeAt(0);

    if (c >= 65 && c <= 90) {
        if (typeof trie[(c+OFFSET_CAPTIAL_AZ_INDEX)] !== 'array') {
            trie[(c+OFFSET_CAPTIAL_AZ_INDEX)] = [];
        }
        return trie[(c+OFFSET_CAPTIAL_AZ_INDEX)];
    } else if (c >= 97 && c <= 122) {
        if (typeof trie[(c+OFFSET_SMALL_AZ_INDEX)] !== 'array') {
            trie[(c+OFFSET_SMALL_AZ_INDEX)] = [];
        }
        return trie[(c+OFFSET_SMALL_AZ_INDEX)];
    } else if (c >= 48 && c <= 57) {
        if (typeof trie[(c+OFFSET_INTEGER_INDEX)] !== 'array') {
            trie[(c+OFFSET_INTEGER_INDEX)] = [];
        }
        return trie[(c+OFFSET_INTEGER_INDEX)];
    } else if (c === SEMICOLON_ASCIICODE) {
        if (typeof trie[SEMICOLON_INDEX] !== 'array') {
            trie[SEMICOLON_INDEX] = [];
        }
        return trie[SEMICOLON_INDEX];
    }

    throw 'Error';
};

/* exposing it */
module.exports = HTMLEntities;

})();
