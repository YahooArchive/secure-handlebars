/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
(function() {

var expect = require('chai').expect,
    handlebarsUtils = require('../src/handlebars-utils');

exports.testArrMatch = function(data, arr) {
   arr.forEach(function(p) {
       expect(data).to.match(p);
   });
};

var testBranch = function(ast, testObj) {
   ast.left.forEach(function(obj, i) {
       expect(obj.type).to.equal(testObj.left.rtype[i]);
       if (obj.type !== handlebarsUtils.AST_NODE) {
           expect(obj.content).to.equal(testObj.left.rstr[i]);
       } else {
           testBranch(obj.content, testObj.left.rstr[i]);
       }
   });
   ast.right.forEach(function(obj, i) {
       expect(obj.type).to.equal(testObj.right.rtype[i]);
       if (obj.type !== handlebarsUtils.AST_NODE) {
           expect(obj.content).to.equal(testObj.right.rstr[i]);
       } else {
           testBranch(obj.content, testObj.right.rstr[i]);
       }
   });
};
exports.testBranch = testBranch;

exports.append_zero = function(i) {
    var s = i.toString();
    while(s.length < 3) {
        s = "0" + s;
    }
    return s;
};

})();
