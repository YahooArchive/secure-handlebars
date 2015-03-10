/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
(function() {

var expect = require('chai').expect;

exports.testArrMatch = function(data, arr) {
   arr.forEach(function(p) {
       expect(data).to.match(p);
   });
};

exports.testExpression = function(result, obj) {
    expect(result.isPrefixWithKnownFilter).to.equal(obj.isPrefixWithKnownFilter);
    expect(result.filter).to.equal(obj.filter);
    expect(result.isSingleIdentifier).to.equal(obj.isSingleIdentifier);
};

exports.testIsValidExpression = function(result, obj) {
    if (obj.hasOwnProperty('rstr')) {
        expect(result[0]).to.equal(obj.rstr);
    }
    expect(result.result).to.equal(obj.result);
};

exports.append_zero = function(i) {
    var s = i.toString();
    while(s.length < 3) {
        s = "0" + s;
    }
    return s;
};

})();
