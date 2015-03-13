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

exports.append_zero = function(i) {
    var s = i.toString();
    while(s.length < 3) {
        s = "0" + s;
    }
    return s;
};

// for handlebars-3.0-spec test only
var expressionTestPatterns = [
    // valid syntax
    { syntax: '{{escapeexpression}}  ', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ]},
    { syntax: '{{&escapeexpression}} ', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ]},
    { syntax: '{{~escapeexpression}} ', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ]},
    { syntax: '{{!commentexpression}}', type: '', rstr: '', result: [ 'CommentStatement',  '', '' ]},
    { syntax: '{{#branchexpression}} {{/branchexpression}}', type: '', rstr: '', result: [ 'BlockStatement', '', '' ]},
    { syntax: '{{>partialexpression}}', type: '', rstr: '', result: [ 'PartialStatement',  '', '' ]},

    // data var is not a special place holder
    { syntax: '{{@datavar}}         ', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ], },
    { syntax: '{{@datavar @datavar}}', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ], },
    { syntax: '{{  @datavar}}       ', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ], },
    { syntax: '{{@  datavar}}       ', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ], },
    { syntax: '{{  @  datavar}}     ', type: '', rstr: '', result: [ 'MustacheStatement', '', '' ], },

    { syntax: '{{   &expression}}', type: '', rstr: '', result: [ false, '', '']},
    { syntax: '{{   ~expression}}', type: '', rstr: '', result: [ false, '', '']},
    { syntax: '{{   !expression}}', type: '', rstr: '', result: [ false, '', '']},
    { syntax: '{{   #expression}}', type: '', rstr: '', result: [ false, '', '']},
    { syntax: '{{#expression}} {{    /expression}}', type: '', rstr: '', result: [ false, '', '']},
    { syntax: '{{   >expression}}', type: '', rstr: '', result: [ false, '', '']},

    // invalid reserved char
    { syntax: '{{"xxx}}', type: '', rstr: '', result: [ false, '', '']},
    { syntax: '{{%xxx}}', type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{'xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{(xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{)xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{*xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{+xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{,xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{.xxx}}", type: '', rstr: '', result: [ false, '', '']},
    // standalone will fail the case
    { syntax: "{{/xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{;xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{<xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{=xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{[xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{\\xxx}}",type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{]xxx}}", type: '', rstr: '', result: [ false, '', '']},
    // standalone will fail the case
    { syntax: "{{^xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{{xxx}}", type: '', rstr: '', result: [ false, '', '']},
    { syntax: "{{}xxx}}", type: '', rstr: '', result: [ false, '', '']},
];
exports.expressionTestPatterns = expressionTestPatterns;

var rawExpressionTestPatterns = [
    // valid syntax
    { syntax: '{{{rawexpression}}}        ', type:handlebarsUtils.RAW_EXPRESSION, rstr: 'rawexpression', result: [ 'MustacheStatement', true, 18 ]},
    // it is fine to have space in the raw expression.
    { syntax: '{{{   rawexpression   }}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr: 'rawexpression', result: [ 'MustacheStatement', true, 24 ]},
    // for non-greedy match
    { syntax: '{{{rawexpression}}} {{{rawexpression}}}', type:handlebarsUtils.RAW_EXPRESSION, rstr: 'rawexpression', result: [ 'MustacheStatement', true, 18 ]},
    // data var is not a special place holder
    { syntax: '{{{@rawexpression}}}       ', type:handlebarsUtils.RAW_EXPRESSION, rstr: 'rawexpression', result: [ 'MustacheStatement', true, 19 ]},
    { syntax: '{{{  @rawexpression}}}     ', type:handlebarsUtils.RAW_EXPRESSION, rstr: 'rawexpression', result: [ 'MustacheStatement', true, 21 ]},

    // invalid syntax
    // new line char test
    // the util test and rstr test is incorrect
    { syntax: '{{{raw\rexpression}}}   ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'raw', result: [ 'MustacheStatement', true, 19 ]},
    { syntax: '{{{raw\nexpression}}}   ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'raw', result: [ 'MustacheStatement', true, 19 ]},
    // data var, the util test and rstr test is incorrect
    { syntax: '{{{@  rawexpression}}}    ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'rawexpression', result: [ 'MustacheStatement', true, 21 ]},
    { syntax: '{{{  @  rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'rawexpression', result: [ 'MustacheStatement', true, 23 ]},

    { syntax: '{{{rawexpression}     ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{rawexpression}}    ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{rawexpression}}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, 18    ]},
    { syntax: '{{{rawexpression}} }  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{rawexpression} }}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{ {{rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, 19     ]},
    { syntax: '{{ {rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, 19     ]},

    { syntax: '{ { {rawexpression}}} ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ 'ContentStatement', false, 20 ]},
    { syntax: '{{{rawexpression} } } ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{}}}                ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, 5     ]},

    { syntax: '{{{ }rawexpression}}} ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, 20    ]},
    { syntax: '{{{ {rawexpression}}} ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false, result: [ false, false, 20    ]},

    // throw exception, {{{rawexpression}}} does not support special character and white space control.
    // reference http://handlebarsjs.com/expressions.html
    { syntax: '{{{@rawexpression @rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'rawexpression', result: [ 'MustacheStatement', true, 34 ]},
    // even though handlebars does not support, i don't care to let it pass util test
    { syntax: '{{{!rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'!rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{#rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'#rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{%rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'%rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{&rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'&rawexpression', result: [ false, true, 19 ]},
    { syntax: "{{{'rawexpression}}}  ", type:handlebarsUtils.RAW_EXPRESSION, rstr:"'rawexpression", result: [ false, true, 19 ]},
    { syntax: '{{{(rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'(rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{)rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:')rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{*rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'*rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{+rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'+rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{,rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:',rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{.rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'.rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{/rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'/rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{;rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:';rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{>rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'>rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{=rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'=rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{<rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'<rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{[rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'[rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{^rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'^rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{]rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:']rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{`rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'`rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{{rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false,            result: [ false, false, 19 ]},
    { syntax: '{{{}rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:false,            result: [ false, false, 19 ]},
    { syntax: '{{{~rawexpression}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'rawexpression', result: [ false, true, 19 ]},
    { syntax: '{{{rawexpression~}}}  ', type:handlebarsUtils.RAW_EXPRESSION, rstr:'rawexpression', result: [ false, true, 19 ]},
];
exports.rawExpressionTestPatterns = rawExpressionTestPatterns;

var rawBlockTestPatterns = [
    // valid syntax
    { syntax: '{{{{rawblockname}}}} xxx {{{{/rawblockname}}}}      ', type:handlebarsUtils.RAW_BLOCK, rstr:'rawblockname', result: [ 'BlockStatement', true, 45 ]},
    // it is fine to have space in the start rawblockname.
    { syntax: '{{{{  rawblockname   }}}} xxx {{{{/rawblockname}}}} ', type:handlebarsUtils.RAW_BLOCK, rstr:'rawblockname', result: [ 'BlockStatement', true, 50 ]},
    // handlebars allows this syntax and the fifth } is part of content inside raw block
    { syntax: '{{{{rawblockname}}}}} xxx {{{{/rawblockname}}}}     ', type:handlebarsUtils.RAW_BLOCK, rstr:'rawblockname', result: [ 'BlockStatement', true, 46 ]},

    // invalid syntax
    // new line char test
    { syntax: '{{{{raw\rblockname}}}} xxx {{{{/rawblockname}}}}    ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{raw\nblockname}}}} xxx {{{{/rawblockname}}}}    ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    // utils test can be true as it only parses the first expression.
    { syntax: '{{{{rawblockname}}}} xxx {{{{/raw\rblockname}}}}    ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, true, false ]},
    { syntax: '{{{{rawblockname}}}} xxx {{{{/raw\nblockname}}}}    ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, true, false ]},
    // throw exception if {{{{rawblockname}}}} end with unbalanced } count.
    { syntax: '{{{{rawblockname} xxx {{{{/rawblockname}}}}         ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{rawblockname}} xxx {{{{/rawblockname}}}}        ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{rawblockname}}} xxx {{{{/rawblockname}}}}       ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    // throw exception if {{{{/rawblockname}}}} with space.
    // the utils test can be true as it only parses the first expression.
    { syntax: '{{{{rawblockname}}}} xxx {{{{/    rawblockname}}}}  ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, true, false ]},
    { syntax: '{{{{rawblockname}}}} xxx {{{{/rawblockname    }}}}  ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, true, false ]},
    // throw exception if unbalanced {{{{rawblockname}}}}.
    // the utils test can be true as it only parses the first expression.
    { syntax: '{{{{rawblockname1}}}} xxx {{{{/rawblockname2}}}}    ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, true, false ]},
    // throw exception if another {{{{rawblock}}}} within another {{{{rawblock}}}}.
    // the utils test can be true as it only parses the first expression.
    { syntax: '{{{{rawblockname}}}} {{{{rawblock}}}} xxx {{{{/rawblock}}}} {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, true, false ]},

    // throw exception, {{{{rawblockname}}}} does not support special character and white space control.
    // reference http://handlebarsjs.com/expressions.html
    { syntax: '{{{{!rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{"rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{#rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{%rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{&rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: "{{{{'rawblockname}}}} xxx {{{{/rawblockname}}}}", type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{(rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{)rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{*rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{+rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{,rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{.rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{/rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{;rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{>rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{=rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{<rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{@rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{[rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{^rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{]rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{`rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{{rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{}rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{~rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
    { syntax: '{{{{rawblockname~}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ false, false, false ]},
];
exports.rawBlockTestPatterns = rawBlockTestPatterns;

var rawEndBlockTestPatterns = [
    // valid syntax
    { syntax: '{{{{/rawblockname}}}}     ', type:handlebarsUtils.RAW_END_BLOCK, rstr: 'rawblockname', result: [ '', true, '' ]},

    // invalid syntax
    // new line char test
    { syntax: '{{{{/raw\rblockname}}}}   ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{/raw\nblockname}}}}   ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{/rawblockname}        ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{/rawblockname}}       ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{/rawblockname}}}      ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{/rawblockname}}}}}    ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},

    { syntax: '{{{{/    rawblockname}}}} ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{/rawblockname    }}}} ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{/  rawblockname  }}}} ', type:handlebarsUtils.RAW_BLOCK, rstr:false, result: [ '', false, '' ]},

    // throw exception, {{{{/rawblockname}}}} does not support special character and white space control.
    // reference http://handlebarsjs.com/expressions.html
    { syntax: '{{{{!rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{"rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{#rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{%rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{&rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: "{{{{'rawblockname}}}} xxx {{{{/rawblockname}}}}", type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{(rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{)rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{*rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{+rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{,rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{.rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    // valid syntax for raw end block
    // { syntax: '{{{{/rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{;rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{>rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{=rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{<rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{@rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{[rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{^rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{]rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{`rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{{rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{}rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{~rawblockname}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
    { syntax: '{{{{rawblockname~}}}} xxx {{{{/rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},

    { syntax: '{{{{rawblockname}}}} xxx {{{{/@rawblockname}}}}', type:handlebarsUtils.RAW_END_BLOCK, rstr:false, result: [ '', false, '' ]},
];
exports.rawEndBlockTestPatterns = rawEndBlockTestPatterns;

var escapeExpressionTestPatterns = [
    // valid syntax
    { syntax: '{{expression}}               ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // it is fine to have space in the expression
    { syntax: '{{  expression   }}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // it is fine to have whitespace control in the expression.
    { syntax: '{{~ expression  ~}}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // private variable  
    { syntax: '{{@expression}}              ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // private variable with space before  
    { syntax: '{{@  expression  }}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // private variable with space after/before  
    { syntax: '{{  @  expression  }}        ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // dot as the ID
    { syntax: '{{.}}                        ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: '.',          isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // with / as separator 
    { syntax: '{{../name}}                  ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: '../name',    isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    { syntax: '{{../name ../name}}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: '../name',    isSingleID: false, result: [ 'MustacheStatement', true, 11 ]},
    // with dot as separator 
    { syntax: '{{article.title}}            ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article.title', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // with / as separator 
    { syntax: '{{article/title}}            ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article/title', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // with dot as separator and index
    { syntax: '{{article.[10].[#comments]}} ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article.[10].[#comments]', isSingleID: true, result: [ 'MustacheStatement', true, 11 ]},
    // 2 expressions
    { syntax: '{{exp1 exp2}}                ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, 11 ]},
    // 3 expressions
    { syntax: '{{exp1 exp2 exp3}}           ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, 11 ]},
    // expression with param
    { syntax: '{{exp1 (param1)}}            ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, 11 ]},
    // expression with data param
    { syntax: '{{exp1 (@param1)}}           ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, 11 ]},
    // expression with 2 params
    { syntax: '{{exp1 (param1 param2)}}     ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, 11 ]},

    // reserved char
    { syntax: '{{/exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ false, false, 11 ]},
    { syntax: '{{#exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ false, false, 11 ]},
    { syntax: '{{>exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ 'PartialStatement', false, 11 ]},
    { syntax: '{{!exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ 'CommentStatement', false, 11 ]},
    // it is fine to pass util test, as Handlebars parser will fails the second &exp2
    { syntax: '{{exp1 &exp2}}               ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1',isSingleID: false, result: [ false, true, 11 ]},
    // we skip this pattern
    { syntax: '{{}}                         ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ false, false, 11 ]},
];
exports.escapeExpressionTestPatterns = escapeExpressionTestPatterns;

var referenceExpressionTestPatterns = [
    // valid syntax
    { syntax: '{{&expression}}          ', type: handlebarsUtils.REFERENCE_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 14 ]},
    // it is fine to have space in the reference.
    { syntax: '{{&   expression     }}  ', type: handlebarsUtils.REFERENCE_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 22 ]},
    // it is fine to have whitespace control in the reference.
    { syntax: '{{~&expression~}}        ', type: handlebarsUtils.REFERENCE_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 16 ]},
    // it is fine to have space at the end of whitespace control in the reference.
    { syntax: '{{~&expression    ~}}    ', type: handlebarsUtils.REFERENCE_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 20 ]},
    // for non-greedy match
    { syntax: '{{&expression}} {{&expression}}', type: handlebarsUtils.REFERENCE_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 14 ]},
    // new line char test
    { syntax: '{{&exp\rression}}     ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:'exp', result: [ 'MustacheStatement', true, 15 ]},
    { syntax: '{{&exp\nression}}     ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:'exp', result: [ 'MustacheStatement', true, 15 ]},

    // invalid syntax
    // the cph test can pass as there is no isValidExpression to guard against
    { syntax: '{{ &expression}}      ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:false, result: [ false, false, 15 ]},
    { syntax: '{{ & expression}}     ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:false, result: [ false, false, 16 ]},
    { syntax: '{{~ &expression}}     ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:false, result: [ false, false, 16 ]},
    { syntax: '{{&expression}}}      ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:false, result: [ false, false, 14 ]},
    // '~' must be next to '}}'
    { syntax: '{{&expression  ~ }}   ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:false, result: [ false, false, 18 ]},
    // with one brace less 
    { syntax: '{{&expression}        ', type:handlebarsUtils.REFERENCE_EXPRESSION, rstr:false, result: [ false, false, false ]},
];
exports.referenceExpressionTestPatterns = referenceExpressionTestPatterns;

var partialExpressionTestPatterns = [
    // valid syntax
    { syntax: '{{>partial}}        ', type: handlebarsUtils.PARTIAL_EXPRESSION, rstr: 'partial', result: [ 'PartialStatement', true, 11 ]},
    // it is fine to have space in the partial.
    { syntax: '{{>   partial   }}  ', type: handlebarsUtils.PARTIAL_EXPRESSION, rstr: 'partial', result: [ 'PartialStatement', true, 17 ]},
    // it is fine to have whitespace control in the partial.
    { syntax: '{{~>partial~}}      ', type: handlebarsUtils.PARTIAL_EXPRESSION, rstr: 'partial', result: [ 'PartialStatement', true, 13 ]},
    // it is fine to have space at the end of whitespace control in the partial.
    { syntax: '{{~>partial    ~}}  ', type: handlebarsUtils.PARTIAL_EXPRESSION, rstr: 'partial', result: [ 'PartialStatement', true, 17 ]},
    // for non-greedy match
    { syntax: '{{>partial}} {{>partial}}', type: handlebarsUtils.PARTIAL_EXPRESSION, rstr: 'partial', result: [ 'PartialStatement', true, 11 ]},
    // new line char test
    { syntax: '{{>par\rtial}}     ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:'par', result: [ 'PartialStatement', true, 12 ]},
    { syntax: '{{>par\ntial}}     ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:'par', result: [ 'PartialStatement', true, 12 ]},

    // invalid syntax
    // the cph test can pass as there is no isValidExpression to guard against
    { syntax: '{{ >partial}}      ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ false, false, 12 ]},
    { syntax: '{{ > partial}}     ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ false, false, 13 ]},
    { syntax: '{{~ >partial}}     ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ false, false, 13 ]},
    { syntax: '{{>partial}}}      ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ false, false, 11 ]},
    // '~' must be next to '}}'
    { syntax: '{{>partial  ~ }}   ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ false, false, 15 ]},
    // with one brace less 
    { syntax: '{{>partial}        ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ false, false, false ]},
];
exports.partialExpressionTestPatterns = partialExpressionTestPatterns;

var branchExpressionTestPatterns = [
    // valid syntax (#)
    { syntax: '{{#if}} xxx {{/if}}                   ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 18 ]},
    // it is fine to have space in the branching expression.
    { syntax: '{{#  if   }} xxx {{/  if   }}         ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 28 ]},
    // it is fine to have whitespace control in the branching expression.
    { syntax: '{{~#  if   ~}} xxx {{~/  if   ~}}     ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 32 ]},
    { syntax: '{{#if yyy}} xxx {{/if}}               ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 22 ]},
    // for non-greedy match
    { syntax: '{{#if}} xxx {{/if}}{{#if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 18 ]},
    // new line char test
    { syntax: '{{#if\ryyy}} xxx {{/if}}              ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 22 ]},

    // valid syntax (^)
    { syntax: '{{^if}} xxx {{/if}}                   ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 18 ]},
    // it is fine to have space in the branching expression.
    { syntax: '{{^  if   }} xxx {{/  if   }}         ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 28 ]},
    // it is fine to have whitespace control in the branching expression.
    { syntax: '{{~^  if   ~}} xxx {{~/  if   ~}}     ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 32 ]},
    { syntax: '{{^if yyy}} xxx {{/if}}               ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 22 ]},
    // for non-greedy match
    { syntax: '{{^if}} xxx {{/if}}{{^if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 18 ]},
    // new line char test
    { syntax: '{{^if\ryyy}} xxx {{/if}}              ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 22 ]},

    // valid syntax with else
    { syntax: '{{#if}} xxx {{else}} yyy {{/if}}      ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 31 ]},
    { syntax: '{{#if}} xxx {{  else  }} yyy {{/if}}  ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 35 ]},
    { syntax: '{{#if}} xxx {{~  else  ~}} yyy {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 37 ]},
    { syntax: '{{#if}} xxx {{^}} yyy {{/if}}         ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 28 ]},
    { syntax: '{{#if}} xxx {{~^~}} yyy {{/if}}       ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 30 ]},

    // valid syntax with else if
    { syntax: '{{#if}} xxx {{  else if }} yyy {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ 'BlockStatement', true, 37 ]},

    // invalid syntax
    { syntax: '{{  #if}} xxx {{/if}}  ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if} xxx {{/if}}     ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{~ #if}} xxx {{/if}}  ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    // the utils test can be true as it only parses the first expression, but it is invalid handlebarsUtils.BRANCH_END_EXPRESSION test.
    { syntax: '{{#if}} xxx {{  /if}}  ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ false, true, false ]},
    { syntax: '{{#if}} xxx {{/if}     ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ false, true, false ]},
    { syntax: '{{#if}} xxx {{~ /if}}  ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ false, true, false ]},
    // the utils test can be true as it only parses the first expression, but it is invalid handlebarsUtils.ELSE_EXPRESSION test.
    // the cph test can be true as the else expression is regarded as string, TODO: any issue?
    { syntax: '{{#if}} xxx {{ ^ }} yyy {{/if}}   ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ false, true, false ]},
    { syntax: '{{#if}} xxx {{~ ^ ~}} yyy {{/if}} ', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:'if', result: [ false, true, false ]},

    // throw exception, {{#if}} does not support special character and white space control.
    // reference http://handlebarsjs.com/expressions.html
    { syntax: '{{#!if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#"if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{##if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#%if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#&if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: "{{#'if}} xxx {{/if}}", type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#(if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#)if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#*if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#+if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#,if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#.if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#/if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#;if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#>if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#=if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#<if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]}, 
    { syntax: '{{#@if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#[if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#^if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#]if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#{if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#}if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#~if}} xxx {{/if}}', type:handlebarsUtils.BRANCH_EXPRESSION, rstr:false, result: [ false, false, false ]},
];
exports.branchExpressionTestPatterns = branchExpressionTestPatterns;

/* just test for the util test only */
var branchEndExpressionTestPatterns = [
    // valid syntax
    { syntax: '{{/if}}          ', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:'if', result: [ '', true, '' ]},
    // it is fine to have space in the branching expression.
    { syntax: '{{/  if  }}      ', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:'if', result: [ '', true, '' ]},
    // it is fine to have whitespace control in the branching expression.
    { syntax: '{{~/  if  ~}}    ', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:'if', result: [ '', true, '' ]},

    // throw exception, {{/if}} does not support special character and white space control.
    // reference http://handlebarsjs.com/expressions.html
    { syntax: '{{#if}} xxx {{/!if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/"if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/#if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/%if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/&if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: "{{#if}} xxx {{/'if}}", type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/(if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/)if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/*if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/+if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/,if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/.if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{//if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/;if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/>if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/=if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/<if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/@if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/[if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/^if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/]if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/{if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/}if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
    { syntax: '{{#if}} xxx {{/~if}}', type:handlebarsUtils.BRANCH_END_EXPRESSION, rstr:false, result: [ false, false, false ]},
];
exports.branchEndExpressionTestPatterns = branchEndExpressionTestPatterns;

/* just test for the util test only */
var elseExpressionTestPatterns = [
    // valid syntax
    { syntax: '{{else}}        ', type:handlebarsUtils.ELSE_EXPRESSION, rstr: undefined, result: [ '', true, '' ]},
    // it is fine to have space in the {{else if}}.
    { syntax: '{{  else if }}  ', type:handlebarsUtils.ELSE_EXPRESSION, rstr: undefined, result: [ '', true, '' ]},
    // it is fine to have space in the {{else}}.
    { syntax: '{{  else  }}    ', type:handlebarsUtils.ELSE_EXPRESSION, rstr: undefined, result: [ '', true, '' ]},
    // it is fine to have whitespace control in the {{else}}
    { syntax: '{{~  else  ~}}  ', type:handlebarsUtils.ELSE_EXPRESSION, rstr: undefined, result: [ '', true, '' ]},
    { syntax: '{{^}}           ', type:handlebarsUtils.ELSE_EXPRESSION, rstr: undefined, result: [ '', true, '' ]},
    { syntax: '{{~^~}}         ', type:handlebarsUtils.ELSE_EXPRESSION, rstr: undefined, result: [ '', true, '' ]},

    // invalid syntax
    { syntax: '{{ ^ }}         ', type:handlebarsUtils.ELSE_EXPRESSION, rstr:false, result: [ '', false, false ]},
    { syntax: '{{~ ^ ~}}       ', type:handlebarsUtils.ELSE_EXPRESSION, rstr:false, result: [ '', false, false ]},
];
exports.elseExpressionTestPatterns = elseExpressionTestPatterns;

var commentExpressionTestPatterns = [
    // valid syntax (short form)
    { syntax: '{{!comment}}     ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: undefined, result: [ 'CommentStatement', true, 11 ], },
    // last '}}' does not count as comment
    { syntax: '{{!comment}}}}   ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: undefined, result: [ 'CommentStatement', true, 11 ], },
    // '--' does not count as comment (short form can end with long form)
    { syntax: '{{!comment--}}   ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: undefined, result: [ 'CommentStatement', true, 13 ], },
    // '--' count as comment
    { syntax: '{{!comment--  }} ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: undefined, result: [ 'CommentStatement', true, 15 ], },
    // '--' count as comment and '~' does not count as comment
    { syntax: '{{!comment-- ~}} ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: undefined, result: [ 'CommentStatement', true, 15 ], },
    // '--' and '~' count as comment 
    { syntax: '{{!comment-- ~ }}', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: undefined, result: [ 'CommentStatement', true, 16 ], },
    // '~' does not count as comment 
    { syntax: '{{~!comment}}    ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: undefined, result: [ 'CommentStatement', true, 12 ], },

    // invalid syntax (short form)
    // the cph test can be true as it consumes till '}}'. TODO: it may affect the escape expression parsing.
    { syntax: '{{~ !comment}}   ', type:handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, rstr: false, result: [ false, false, 13 ], },

    // valid syntax (long form)
    { syntax: '{{!--comment--}}    ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ 'CommentStatement', true, 15 ], },
    // last '}}' does not count as comment
    { syntax: '{{!--comment--}}}}  ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ 'CommentStatement', true, 15 ], },
    // it is regard as short form and end with long form, the first '-' and last '--' does not count as comment
    { syntax: '{{!- -comment--}}   ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: false,     result: [ 'CommentStatement', false, 16 ], },
    // it is regard as short form and end with long form, the last '--' does not count as comment
    { syntax: '{{!  --comment--}}  ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: false,     result: [ 'CommentStatement', false, 17 ], },
    // '~' does not count as comment
    { syntax: '{{~!--comment--}}   ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ 'CommentStatement', true, 16 ], },
    // '~' and '--' does not count as comment
    { syntax: '{{~!--comment--~}}  ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ 'CommentStatement', true, 17 ], },
    // '~' and '--' does not count as comment
    { syntax: '{{!--comment --~}}  ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ 'CommentStatement', true, 17 ], },

    // invalid syntax (long form)
    // the cph test can be true as it consumes till '--}}'. TODO: it may affect the escape expression parsing.
    { syntax: '{{~ !--comment--}}  ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: false, result: [ false, false, 17 ], },
    { syntax: '{{ !--comment--}}   ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: false, result: [ false, false, 16 ], },
    // long form cannot find the end '--}}'
    { syntax: '{{!--comment}}      ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ false, true, false ], },
    { syntax: '{{!--comment - - }} ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ false, true, false ], },
    { syntax: '{{!--comment -- }}  ', type:handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, rstr: undefined, result: [ false, true, false ], },
];
exports.commentExpressionTestPatterns = commentExpressionTestPatterns;

})();
