/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com, neraliu@gmail.com>
*/
/*jshint -W030 */
(function () {
"use strict";

var fs = require('fs');
require('./polyfills/polyfill.js');

/////////////////////////////////////////////////////
//
// @module HTMLDecoder
// 
/////////////////////////////////////////////////////
function HTMLDecoder(config) {
    config || (config = {});
    var load = config.load === undefined? true: config.load;

    load? this.namedCharReferenceTrie = require('./gen/trie.js') : this.namedCharReferenceTrie = {};
}

/////////////////////////////////////////////////////
//
// PUBLIC API
// 
/////////////////////////////////////////////////////

/**
* @function HTMLDecoder#encode
*
* @description
* HTML encode the character
*
* TODO: it is blindly encoding, need to enhance it later.
*/
HTMLDecoder.prototype.encode = function(str) {
    var l = str.length,
        c1, c2, r = '';

    for(var i=0;i<l;++i) {
        c1 = str.charCodeAt(i);
        // 55296-57343
        if (c1>=0xD800 && c1<=0xDFFF) {
            c2 = str.codePointAt(i);
            if (c1 !== c2) {
                i++; // consume one more char if c1 !== c2 and i+1<l
                c1 = c2;
            }
        }
        r += "&#"+c1+";";
    }
    return r;
};

/**
* @function HTMLDecoder#decode
*
* @description
* HTML decode the character
*
* Reference:
* https://html.spec.whatwg.org/multipage/syntax.html#tokenizing-character-references
*/
HTMLDecoder.prototype.reCharReferenceDecode = /&([a-z]{2,31}\d{0,2};?)|&#0*(x[a-f0-9]+|[0-9]+);?/ig;
HTMLDecoder.prototype.decode = function(str) {
    var self = this, num, r;
    return str.replace(this.reCharReferenceDecode, function(m, named, number) {
        if (named) {
            r = self._findString(named);
            return r? r.characters + (r.unconsumed ? r.unconsumed:'') : m;
        } else {
            num = parseInt(number[0] <= '9' ? number : '0' + number); // parseInt('0xA0') is equiv to parseInt('A0', 16)
            return num === 0x00 ? '\uFFFD' // REPLACEMENT CHARACTER    
                       : num === 0x80 ? '\u20AC'  // EURO SIGN (€)
                       : num === 0x82 ? '\u201A'  // SINGLE LOW-9 QUOTATION MARK (‚)
                       : num === 0x83 ? '\u0192'  // LATIN SMALL LETTER F WITH HOOK (ƒ)
                       : num === 0x84 ? '\u201E'  // DOUBLE LOW-9 QUOTATION MARK („)
                       : num === 0x85 ? '\u2026'  // HORIZONTAL ELLIPSIS (…)
                       : num === 0x86 ? '\u2020'  // DAGGER (†)
                       : num === 0x87 ? '\u2021'  // DOUBLE DAGGER (‡)
                       : num === 0x88 ? '\u02C6'  // MODIFIER LETTER CIRCUMFLEX ACCENT (ˆ)
                       : num === 0x89 ? '\u2030'  // PER MILLE SIGN (‰)
                       : num === 0x8A ? '\u0160'  // LATIN CAPITAL LETTER S WITH CARON (Š)
                       : num === 0x8B ? '\u2039'  // SINGLE LEFT-POINTING ANGLE QUOTATION MARK (‹)
                       : num === 0x8C ? '\u0152'  // LATIN CAPITAL LIGATURE OE (Œ)
                       : num === 0x8E ? '\u017D'  // LATIN CAPITAL LETTER Z WITH CARON (Ž)
                       : num === 0x91 ? '\u2018'  // LEFT SINGLE QUOTATION MARK (‘)
                       : num === 0x92 ? '\u2019'  // RIGHT SINGLE QUOTATION MARK (’)
                       : num === 0x93 ? '\u201C'  // LEFT DOUBLE QUOTATION MARK (“)
                       : num === 0x94 ? '\u201D'  // RIGHT DOUBLE QUOTATION MARK (”)
                       : num === 0x95 ? '\u2022'  // BULLET (•)
                       : num === 0x96 ? '\u2013'  // EN DASH (–)
                       : num === 0x97 ? '\u2014'  // EM DASH (—)
                       : num === 0x98 ? '\u02DC'  // SMALL TILDE (˜)
                       : num === 0x99 ? '\u2122'  // TRADE MARK SIGN (™)
                       : num === 0x9A ? '\u0161'  // LATIN SMALL LETTER S WITH CARON (š)
                       : num === 0x9B ? '\u203A'  // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
                       : num === 0x9C ? '\u0153'  // LATIN SMALL LIGATURE OE (œ)
                       : num === 0x9E ? '\u017E'  // LATIN SMALL LETTER Z WITH CARON (ž)
                       : num === 0x9F ? '\u0178'  // LATIN CAPITAL LETTER Y WITH DIAERESIS (Ÿ)
                       : self.frCoPt(num);
        }
    });
};

/**
* @function HTMLEntites#frCoPt
*
* @description
* Convert the code point to character except those numeric range will trigger the parse error in HTML decoding.
* https://html.spec.whatwg.org/multipage/syntax.html#tokenizing-character-references  
*/
HTMLDecoder.prototype.frCoPt = function(num) {
    return !isFinite(num) ||                  // `NaN`, `+Infinity`, or `-Infinity`
        num <= 0x00 ||                        // NULL or not a valid Unicode code point
        num > 0x10FFFF ||                     // not a valid Unicode code point
        (num >= 0xD800 && num <= 0xDFFF) || 
        (num >= 0x01 && num <= 0x08) ||
        (num >= 0x0D && num <= 0x1F) ||
        (num >= 0x7F && num <= 0x9F) ||       // NOTE: the spec may be wrong as 0x9F returns U+0178
        (num >= 0xFDD0 && num <= 0xFDEF) ||

        num === 0x0B ||
        (num & 0xFFFF) === 0xFFFF ||
        (num & 0xFFFF) === 0xFFFE ? '\uFFFD' : String.fromCodePoint(num);
};

/////////////////////////////////////////////////////
//
// TRIE GENERATION API
// 
/////////////////////////////////////////////////////

/**
* @function HTMLEntites#buildNamedCharReferenceTrie
*
* @description
*/
HTMLDecoder.prototype.buildNamedCharReferenceTrie = function(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            var info = obj[key];
            this._addStringToTrie(this.namedCharReferenceTrie, key, info);
        }
    }
    return obj;
};

/**
* @function HTMLDecoder#saveNamedCharReferenceTrie
*
* @description
* Save the trie in json format.
*/
HTMLDecoder.prototype.saveNamedCharReferenceTrie = function(file) {
    /* NOTE: JSON.stringify convert undefined to null */
    var json = JSON.stringify(this.namedCharReferenceTrie);
    var str = '(function() {\n"use strict";\n';
    str += 'var HTMLNamedCharReferenceTrie = '+json+';\n';
    str += 'module.exports = HTMLNamedCharReferenceTrie;\n})();\n';
    fs.writeFileSync(file, str);
};

/////////////////////////////////////////////////////
//
// INTERAL API
// 
/////////////////////////////////////////////////////

/**
* @function HTMLDecoder#_findString
*
* @description
* Find whether the string is defined in the trie.
*/
HTMLDecoder.prototype._findString = function(str) {
    return this._findStringFromRoot(this.namedCharReferenceTrie, str, 0);
};

/**
* @function HTMLDecoder#_findStringFromRoot
*
* @description
*/
HTMLDecoder.prototype._findStringFromRoot = function(trie, str, pos) {
    /* init the trace */
    pos === 0? this.matchTrace = [] : '';

    /* skip the '&' for performance */
    if (str[pos] === '&') pos++;

    var index = str[pos], l, r;

    if (trie[index] === null || trie[index] === undefined) { // end of trie
        if (this.matchTrace.length > 0) { // return the last longest matched pattern, else return undefined
            r = {
                characters: this.matchTrace[this.matchTrace.length-1].info.characters,
                unconsumed: this.matchTrace[this.matchTrace.length-1].unconsumed
            };
        }
        return r;
    } else if (pos+1 === str.length) { // end of string
        if (trie[index][0] !== null && trie[index][0] !== undefined) {
            r = trie[index][0];
        } else if (this.matchTrace.length > 0) { // return the last longest matched pattern, else return undefined
            r = {
                characters: this.matchTrace[this.matchTrace.length-1].info.characters,
                unconsumed: this.matchTrace[this.matchTrace.length-1].unconsumed
            };
        }
        return r;
    } else {
        if (trie[index][0] !== null && trie[index][0] !== undefined) {
            this.matchTrace.push({ unconsumed: str.substr(pos+1), info: trie[index][0] } );
        }
        return this._findStringFromRoot(trie[index], str, pos+1);
    }
};

/**
* @function HTMLDecoder#_addStringToTrie
*
* @description
*/
HTMLDecoder.prototype._addStringToTrie = function(trie, str, info) {
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
* @function HTMLDecoder#_addCharToTrie
*
* @description
*/
HTMLDecoder.prototype._addCharToTrie = function(trie, c, info, isLastElement) {
    var index = c;
    if (trie[index] === null || trie[index] === undefined) {
        trie[index] = {};
    }
    if (isLastElement)
        trie[index][0] = info;
    return trie[index];
};

/* exposing it */
module.exports = HTMLDecoder;

})();
