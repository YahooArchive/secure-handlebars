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

var fs = require('fs');

/////////////////////////////////////////////////////
//
// @module HTMLEntities
// 
/////////////////////////////////////////////////////
function HTMLEntities() {
    this.namedCharReferenceTrie = [];

    /* TODO: load the serialized trie here */
}

/////////////////////////////////////////////////////
//
// PUBLIC API
// 
/////////////////////////////////////////////////////

/**
* @function HTMLEntities#findString
*
* @description
* Find whether the string is defined in the trie.
*/
HTMLEntities.prototype.findString = function(str) {
    return this._findStringWithCodePoint(this.namedCharReferenceTrie, str, 0);
};

/**
* @function HTMLEntites#buildNamedCharReferenceTrie
*
* @description
*/
HTMLEntities.prototype.buildNamedCharReferenceTrie = function(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var info = obj[key];
            if (this._findStringWithCodePoint(this.namedCharReferenceTrie, key, 0) === undefined) {
                this._addStringToTrie(this.namedCharReferenceTrie, key, info);
            }
        }
    }
    return obj;
};

/**
* @function HTMLEntities#loadNamedCharReferenceTrie
*
* @description
* Load the trie from json format.
*/
HTMLEntities.prototype.loadNamedCharReferenceTrie = function(file) {
    if (fs.existsSync(file)) {
        var d = fs.readFileSync(file, 'utf8');
        this.namedCharReferenceTrie = JSON.parse(d);
    } else {
        throw '[ERROR] HTMLEntities: Fail to load the file as it is not existed! OR JSON.parse error!';
    }
};

/**
* @function HTMLEntities#saveNamedCharReferenceTrie
*
* @description
* Save the trie in json format.
*/
HTMLEntities.prototype.saveNamedCharReferenceTrie = function(file) {
    var json = JSON.stringify(this.namedCharReferenceTrie);
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, json);
    } else {
        throw '[ERROR] HTMLEntities: Fail to save the file as it is existed!';
    }
};

/////////////////////////////////////////////////////
//
// INTERAL API
// 
/////////////////////////////////////////////////////

/**
@description
This is the index structure of the array for holding the trie.
We don't use the object prop lookup to improve the performance.

0       - the code point.
1-26    - the captial letter A-Z.
27-52   - the small letter a-z.
53-62   - the integer 0-9.
63      - the ';'.

The ASCII code of
A-Z     - 65 to 90
a-z     - 97 to 122
0-9     - 48 to 57
';'     - 59
'&'     - 38

| 0 |
> 0 <
| 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 |
> A B C D E F G H I J  K  L  M  N  O  P  Q  R  S  T  U  V  W  X  Y  Z  <
| 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 |
> a  b  c  d  e  f  g  h  i  j  k  l  m  n  o  p  q  r  s  t  u  v  w  x  y  z  <
| 53 54 55 56 57 58 59 60 61 62 |
> 0  1  2  3  4  5  6  7  8  9  <
| 63 |
> ;  <
*/

/* shift downwards 64 for the first element A (ascii=65) to index 1 */
var OFFSET_CAPTIAL_AZ_INDEX = -64; 
/* shift downwards 70 for the first element a (ascii=97) to index 27 */
var OFFSET_SMALL_AZ_INDEX = -70; 
/* shift upwards 5 for the first element 0 (ascii=48) to index 53 */
var OFFSET_INTEGER_INDEX = 5;
/* semicolon */
var SEMICOLON_ASCIICODE = 59;
var SEMICOLON_INDEX = 63;
HTMLEntities.prototype.lastIndex = SEMICOLON_INDEX;

/**
* @function HTMLEntites#_mapToIndex
*
* @description
*/
HTMLEntities.prototype._mapToIndex = function(char) {
    var c = char.charCodeAt(0);
    var index = -1;

    if (c >= 65 && c <= 90) {
        index = c+OFFSET_CAPTIAL_AZ_INDEX;
    } else if (c >= 97 && c <= 122) {
        index = c+OFFSET_SMALL_AZ_INDEX;
    } else if (c >= 48 && c <= 57) {
        index = c+OFFSET_INTEGER_INDEX;
    } else if (c === SEMICOLON_ASCIICODE) {
        index = SEMICOLON_INDEX;
    }

    if (index === -1) 
        throw '[ERROR] HTMLEntities: the input does not in the defined index map ('+c+')';

    return index;
};

/**
* @function HTMLEntities#_findStringWithCodePoint
*
* @description
*/
HTMLEntities.prototype._findStringWithCodePoint = function(trie, str, pos) {
    /* skip the '&' */
    if (str[pos] === '&') 
        return this._findStringWithCodePoint(trie, str, pos+1);

    var index = this._mapToIndex(str[pos]);
    if (trie[index] === undefined) {
        return undefined;
    } else {
        if (pos+1 === str.length) {
            // check for codepoints
            return trie[index][0] === undefined? undefined:trie[index][0];
        } else {
            return this._findStringWithCodePoint(trie[index], str, pos+1);
        }
    }
};

/**
* @function HTMLEntities#_addStringToTrie
*
* @description
*/
HTMLEntities.prototype._addStringToTrie = function(trie, str, info) {
    var l = str.length;
    var rootTrie = trie;

    for(var i=0;i<l;++i) {
        /* skip the '&' */
        if (str[i] === '&') continue;
     
        var isLastElement = i===l-1? true: false;
        var childTrie = this._addCharToTrie(rootTrie, str[i], info, isLastElement);
        rootTrie = childTrie;
    }
};

/**
* @function HTMLEntities#_addCharToTrie
*
* @description
*/
HTMLEntities.prototype._addCharToTrie = function(trie, c, info, isLastElement) {
    var index = this._mapToIndex(c);
    if (trie[index] === undefined) {
        trie[index] = [];
    }
    if (isLastElement)
        trie[index][0] = info.codepoints;
    return trie[index];
};

/* exposing it */
module.exports = HTMLEntities;

})();
