/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
(function() {

var handlebarsUtils = require('../src/handlebars-utils'),
    cssParser = require('../src/css-parser/css-parser'),
    cssParserUtils = require('../src/css-utils');

// for handlebars-3.0-spec test only
var expressionTestPatterns = [

    // NOTE: result[0]: it is being used in run-handlebars-3.0-spec.js for the AST object type from Handlebars 3.0
    //       result[1]: it is being used in run-utils-spec.js for isValidExpression test.
    //       result[2]: it is being used in run-cph-spec.js for consumeExpression test.
    //       Empty string represents not being used in the unit tests testing.

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
    { syntax: '{{expression}}               ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // it is fine to have space in the expression
    { syntax: '{{  expression   }}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // it is fine to have whitespace control in the expression.
    { syntax: '{{~ expression  ~}}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // private variable  
    { syntax: '{{@expression}}              ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // private variable with space before  
    { syntax: '{{@  expression  }}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // private variable with space after/before  
    { syntax: '{{  @  expression  }}        ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'expression', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // dot as the ID
    { syntax: '{{.}}                        ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: '.',          isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // with / as separator 
    { syntax: '{{../name}}                  ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: '../name',    isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    { syntax: '{{../name ../name}}          ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: '../name',    isSingleID: false, result: [ 'MustacheStatement', true, '' ]},
    // with dot as separator 
    { syntax: '{{article.title}}            ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article.title', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // with / as separator 
    { syntax: '{{article/title}}            ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article/title', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // with dot as separator and index
    { syntax: '{{article.[10].[#comments]}} ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article.[10].[#comments]', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    // 2 expressions
    { syntax: '{{exp1 exp2}}                ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, '' ]},
    // 3 expressions
    { syntax: '{{exp1 exp2 exp3}}           ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, '' ]},
    // expression with param
    { syntax: '{{exp1 (param1)}}            ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, '' ]},
    // expression with data param
    { syntax: '{{exp1 (@param1)}}           ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, '' ]},
    // expression with 2 params
    { syntax: '{{exp1 (param1 param2)}}     ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1', isSingleID: false, result: [ 'MustacheStatement', true, '' ]},

    // reserved char
    { syntax: '{{/exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ false, false, '' ]},
    { syntax: '{{#exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ false, false, '' ]},
    { syntax: '{{>exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ 'PartialStatement', false, '' ]},
    { syntax: '{{!exp1}}                    ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ 'CommentStatement', false, '' ]},
    // it is fine to pass util test, as Handlebars parser will fails the second &exp2
    { syntax: '{{exp1 &exp2}}               ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'exp1',isSingleID: false, result: [ false, true, '' ]},
    // we skip this pattern
    { syntax: '{{}}                         ', type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: false, isSingleID: false, result: [ false, false, '' ]},

    { syntax: '{{article.[a b].[c d]            }} ',      
        type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article.[a b].[c d]', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    { syntax: '{{article.[a b].[c d]     something    }} ', 
        type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article.[a b].[c d]', isSingleID: false, result: [ 'MustacheStatement', true, '' ]},
    { syntax: '{{article/[a b]}} ',      
        type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article/[a b]', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
    { syntax: '{{article.[a\rb]}} ',      
        type: handlebarsUtils.ESCAPE_EXPRESSION, rstr: 'article.[a\rb]', isSingleID: true, result: [ 'MustacheStatement', true, '' ]},
];
exports.escapeExpressionTestPatterns = escapeExpressionTestPatterns;

var referenceExpressionTestPatterns = [
    // valid syntax
    { syntax: '{{&expression}}          ', type: handlebarsUtils.AMPERSAND_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 14 ]},
    // it is fine to have space in the reference.
    { syntax: '{{&   expression     }}  ', type: handlebarsUtils.AMPERSAND_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 22 ]},
    // it is fine to have whitespace control in the reference.
    { syntax: '{{~&expression~}}        ', type: handlebarsUtils.AMPERSAND_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 16 ]},
    // it is fine to have space at the end of whitespace control in the reference.
    { syntax: '{{~&expression    ~}}    ', type: handlebarsUtils.AMPERSAND_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 20 ]},
    // for non-greedy match
    { syntax: '{{&expression}} {{&expression}}', type: handlebarsUtils.AMPERSAND_EXPRESSION, rstr: 'expression', result: [ 'MustacheStatement', true, 14 ]},
    // new line char test
    { syntax: '{{&exp\rression}}     ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:'exp', result: [ 'MustacheStatement', true, 15 ]},
    { syntax: '{{&exp\nression}}     ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:'exp', result: [ 'MustacheStatement', true, 15 ]},

    // invalid syntax
    // the cph test can pass as there is no isValidExpression to guard against
    { syntax: '{{ &expression}}      ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:false, result: [ false, false, 15 ]},
    { syntax: '{{ & expression}}     ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:false, result: [ false, false, 16 ]},
    { syntax: '{{~ &expression}}     ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:false, result: [ false, false, 16 ]},
    { syntax: '{{&expression}}}      ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:false, result: [ false, false, 14 ]},
    // '~' must be next to '}}'
    { syntax: '{{&expression  ~ }}   ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:false, result: [ false, false, 18 ]},
    // with one brace less 
    { syntax: '{{&expression}        ', type:handlebarsUtils.AMPERSAND_EXPRESSION, rstr:false, result: [ false, false, false ]},
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

    { syntax: '{{> myPartial myOtherContext }}     ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:'myPartial', result: [ 'PartialStatement', true, 30 ]},
    { syntax: '{{> myPartial parameter=value }}    ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:'myPartial', result: [ 'PartialStatement', true, 31 ]},
    { syntax: '{{> myPartial name=../name }}       ', type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:'myPartial', result: [ 'PartialStatement', true, 28 ]},

    // dynamic partial (it will trigger Parse Error! in the function buildAst, the lookAheadTest and isValidExpression return different result)
    // it is ok, as we are not supporting dynamic partial yet.
    // TODO: support dynamic partial
    { syntax: '{{> (whichPartial) }}       ',          type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ 'PartialStatement', false, 20 ]},
    { syntax: "{{> (lookup . 'myVariable') }}       ", type:handlebarsUtils.PARTIAL_EXPRESSION, rstr:false, result: [ 'PartialStatement', false, 29 ]},

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

var escapeBraceExpressionTestPatterns = [
    { syntax: '{{expression}}    ', type:'' , rstr: '', result: [ 'MustacheStatement', '' , '']},

    // same as '{{expression}}', so '\' can be skipped
    { syntax: '\{{expression}}   ', type:'' , rstr: '', result: [ 'MustacheStatement', '' , '']},

    // escaped mustache
    { syntax: '\\{{expression}}  ', type:'' , rstr: '', result: [ 'ContentStatement', '' , '']},
    { syntax: '\\{{expression1}}  {{expression2}}',   type:'' , rstr: '', result: [ 'ContentStatement', '' , '']},
    { syntax: '\\{{expression1}}  \{{expression2}}',  type:'' , rstr: '', result: [ 'ContentStatement', '' , '']},
    { syntax: '\\{{expression1}}  \\{{expression2}}', type:'' , rstr: '', result: [ 'ContentStatement', '' , '']},

    // same as '\{{expressionA}}' in the stream.
    { syntax: '\\\{{expressionA}}  ', type:'' , rstr: '', result: [ 'ContentStatement', '' , '']},

    // same as '\\{{expressionB}}' in the stream.
    { syntax: '\\\\{{expressionB}}  ', type:'' , rstr: '', result: [ 'ContentStatement', '' , '']},
];
exports.escapeBraceExpressionTestPatterns = escapeBraceExpressionTestPatterns;

var buildAstPatterns = [
    { syntax: 'xxxx{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}xxxx', 
      output: 'xxxx{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}xxxx', 
      rstr: [ 'xxxx', '{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}', 'xxxx' ], 
      rtype: [ handlebarsUtils.AST_HTML, handlebarsUtils.RAW_BLOCK, handlebarsUtils.AST_HTML ],
    },
    { syntax: 'xxxx{{{rawexpression}}} {{{rawexpression}}} xxxx', 
      output: 'xxxx{{{rawexpression}}} {{{rawexpression}}} xxxx', 
      rstr: [ 'xxxx', '{{{rawexpression}}}', ' ', '{{{rawexpression}}}', ' xxxx' ],
      rtype: [ handlebarsUtils.AST_HTML, handlebarsUtils.RAW_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.RAW_EXPRESSION, handlebarsUtils.AST_HTML ],
    },
    { syntax: 'xxxx{{escapeexpression}} {{>partial}} {{&reference}} xxxx', 
      output: 'xxxx{{{yd escapeexpression}}} {{>partial}} {{&reference}} xxxx', 
      rstr: [ 'xxxx', '{{escapeexpression}}', ' ', '{{>partial}}', ' ', '{{&reference}}', ' xxxx' ],
      rtype: [ handlebarsUtils.AST_HTML, handlebarsUtils.ESCAPE_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.PARTIAL_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.AMPERSAND_EXPRESSION, handlebarsUtils.AST_HTML ],
    },
    { syntax: 'xxxx{{! comment }} {{!-- }} --}} xxxx',
      output: 'xxxx{{! comment }} {{!-- }} --}} xxxx',
      rstr: [ 'xxxx', '{{! comment }}', ' ', '{{!-- }} --}}', ' xxxx' ],
      rtype: [ handlebarsUtils.AST_HTML, handlebarsUtils.COMMENT_EXPRESSION_SHORT_FORM, handlebarsUtils.AST_HTML, handlebarsUtils.COMMENT_EXPRESSION_LONG_FORM, handlebarsUtils.AST_HTML ],
    },

    // branching
    { syntax: 'xxxx{{#if abc}} yyyy {{else}} zzzz {{/if}} xxxx',
      output: 'xxxx{{#if abc}} yyyy {{else}} zzzz {{/if}} xxxx',
      rstr: [ 'xxxx', { left:  { 
                                 rstr: [ '{{#if abc}}', ' yyyy ' ],
                                 rtype: [ handlebarsUtils.BRANCH_EXPRESSION, handlebarsUtils.AST_HTML ],
                               }, 
                        right: {
                                 rstr: [ '{{else}}', ' zzzz ', '{{/if}}' ],
                                 rtype: [ handlebarsUtils.ELSE_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.BRANCH_END_EXPRESSION ],
                               } 
                      }, ' xxxx' ],
      rtype: [ handlebarsUtils.AST_HTML, handlebarsUtils.AST_NODE, handlebarsUtils.AST_HTML ],
    },

    // branching with different types
    { syntax: 'xxxx{{#if abc}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{escapeexpression}} {{>partial}} {{&reference}} yyyy {{else}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{escapeexpression}} {{>partial}} {{&reference}} zzzz {{/if}} xxxx',
      output: 'xxxx{{#if abc}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{{yd escapeexpression}}} {{>partial}} {{&reference}} yyyy {{else}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{{yd escapeexpression}}} {{>partial}} {{&reference}} zzzz {{/if}} xxxx',
      rstr: [ 'xxxx', { left:  { 
                                 rstr: [ '{{#if abc}}', ' ', '{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}', ' ', '{{{rawexpression}}}', ' ', '{{escapeexpression}}', ' ', '{{>partial}}', ' ', '{{&reference}}', ' yyyy ' ],
                                 rtype: [ handlebarsUtils.BRANCH_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.RAW_BLOCK, handlebarsUtils.AST_HTML, handlebarsUtils.RAW_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.ESCAPE_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.PARTIAL_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.AMPERSAND_EXPRESSION, handlebarsUtils.AST_HTML ], }, 
                        right: {
                                 rstr: [ '{{else}}', ' ', '{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}', ' ', '{{{rawexpression}}}', ' ', '{{escapeexpression}}', ' ', '{{>partial}}', ' ', '{{&reference}}', ' zzzz ', '{{/if}}' ],
                                 rtype: [ handlebarsUtils.ELSE_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.RAW_BLOCK, handlebarsUtils.AST_HTML, handlebarsUtils.RAW_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.ESCAPE_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.PARTIAL_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.AMPERSAND_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.BRANCH_END_EXPRESSION ], }, 
                      }, ' xxxx' ],
      rtype: [ handlebarsUtils.AST_HTML, handlebarsUtils.AST_NODE, handlebarsUtils.AST_HTML ],
    },
    // branching (nested)
    { syntax: 'xxxx{{#if abc}} yyyy {{#msg def}} 123 {{else}} 456 {{/msg}} {{else}} zzzz {{/if}} xxxx',
      output: 'xxxx{{#if abc}} yyyy {{#msg def}} 123 {{else}} 456 {{/msg}} {{else}} zzzz {{/if}} xxxx',
      rstr: [ 'xxxx', { left:  { 
                                 rstr: [ '{{#if abc}}', ' yyyy ', { left:  {
                                                                             rstr: [ '{{#msg def}}', ' 123 ' ],
                                                                             rtype: [ handlebarsUtils.BRANCH_EXPRESSION, handlebarsUtils.AST_HTML ],
                                                                           },
                                                                    right: {
                                                                             rstr: [ '{{else}}', ' 456 ', '{{/msg}}' ],
                                                                             rtype: [ handlebarsUtils.ELSE_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.BRANCH_END_EXPRESSION ],
                                                                           },
                                                                  }, ' ' ],
                                 rtype: [ handlebarsUtils.BRANCH_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.AST_NODE, handlebarsUtils.AST_HTML ],
                               }, 
                        right: {
                                 rstr: [ '{{else}}', ' zzzz ', '{{/if}}' ],
                                 rtype: [ handlebarsUtils.ELSE_EXPRESSION, handlebarsUtils.AST_HTML, handlebarsUtils.BRANCH_END_EXPRESSION ],
                               } 
                      }, ' xxxx' ],
      rtype: [ handlebarsUtils.AST_HTML, handlebarsUtils.AST_NODE, handlebarsUtils.AST_HTML ],
    },
];
exports.buildAstPatterns = buildAstPatterns;

var templatePatterns = [
    {
        title: './bin/handlebarspp escape expression template test',
        file: './tests/samples/files/handlebarsjs_template_escape_expression.hbs',
        result: [ /{{{yd name}}}/ ],
    },
    {
        title: './bin/handlebarspp raw expression template test',
        file: './tests/samples/files/handlebarsjs_template_raw_expression.hbs',
        result: [ /{{{name}}}/ ],
    },
    {
        title: './bin/handlebarspp branching template test',
        file: './tests/samples/files/handlebarsjs_template_branching_001.hbs',
        result: [ /{{#list people}}{{{yd firstName}}} {{{yd lastName}}}{{\/list}}/,
                  /{{#with story}}/, /<div class="intro">{{{yd intro}}}<\/div>/, /<div class="body">{{{yd body}}}<\/div>/, /{{\/with}}/
        ],
    },
    {
        title: './bin/handlebarspp branching template test',
        file: './tests/samples/files/handlebarsjs_template_branching_002.hbs',
        result: [ /{{{yavd SELECTED1}}}/, /{{{yavd SELECTED2}}}/, /{{{yavd SELECTED3}}}/,
                  /{{{yavd SELECTED4}}}/, /{{{yubl \(yavd \(yufull URL1\)\)}}}/, /{{{yubl \(yavd \(yufull URL2\)\)}}}/,
                  /{{{yd NAME1}}}/, /{{{yd NAME2}}}/, /{{{y SELECTED}}}/,
                  /{{#NAVIGATION}}/, /{{\/NAVIGATION}}/, /{{#if SELECTED}}/,
                  /{{\/if}}/,
                  /{{else}}/
        ],
    },
    {
        title: './bin/handlebarspp branching template test',
        file: './tests/samples/files/handlebarsjs_template_branching_003.hbs',
        result: [ // {{{#list}}
                  /{{{yavd valueA}}}/, /{{{yd firstName11}}}/, /{{{yd lastName12}}}/, /{{{yd placeholderA}}}/,
                  // {{{#each}}
                  /{{{yavd valueB}}}/, /{{{yd firstName21}}}/, /{{{yd lastName22}}}/, /{{{yd placeholderB}}}/,
                  // {{{#with}}
                  /{{{yavd valueC}}}/, /{{{yd firstName31}}}/, /{{{yd lastName32}}}/, /{{{yd placeholderC}}}/,
                  // {{{#tag}}
                  /{{{yavd valueD}}}/, /{{{yd firstName41}}}/, /{{{yd lastName42}}}/, /{{{yd placeholderD}}}/,
                  // {{{#unless}}
                  /{{{yavd valueE}}}/, /{{{yd firstName51}}}/, /{{{yd lastName52}}}/, /{{{yd placeholderE}}}/,
        ],
    },
    {
        title: './bin/handlebarspp comment expression template test',
        file: './tests/samples/files/handlebarsjs_template_comment.hbs',
        result: [ /{{!--    comment1  --}}/, /{{!--    comment2  }}   --}}/, /{{! comment3 }}/ ],
    },
    {
        title: './bin/handlebarspp partial expression template test',
        file: './tests/samples/files/handlebarsjs_template_partial.hbs',
        result: [ /{{>html_header}}/,
                  /{{>header}}/,
                  /{{>footer}}/,
                  /{{>html_footer}}/
        ],
    },
    {
        title: './bin/handlebarspp subexpression template test',
        file: './tests/samples/files/handlebarsjs_template_subexpression.hbs',
        result: [ /{{{yd \(outer-helper1 \(inner-helper1 'abc'\) 'def'\)}}}/,
                  /{{{yubl \(yavd \(yufull \(outer-helper2 \(inner-helper2 'abc'\) 'def'\)\)\)}}}/
        ],
    },
    {
        title: './bin/handlebarspp comment expression template test',
        file: './tests/samples/files/handlebarsjs_template_comment.hbs',
        result: [ /{{!--    comment1  --}}/, /{{!--    comment2  }}   --}}/, /{{! comment3 }}/ ],
    },
    {
        title: './bin/handlebarspp attribute value template test',
        file: './tests/samples/files/handlebarsjs_template_attribute_value.hbs',
        result: [ /{{{yavd classname}}}/,
                  /{{{yavd index_active}}}/,
                  /{{{yavd safejstemplating_active1}}}/,
                  /{{{y safejstemplating_active2}}}/
        ],
    },
    {
        title: './bin/handlebarspp after unquote attribute value test',
        file: './tests/samples/files/handlebarsjs_template_after_unquote_attribute_value.hbs',
        result: [ /{{{yd html}}}/,
                  /{{{yavu SELECTED1}}}/, /{{{yavu SELECTED21}}}/, /{{{yavu SELECTED22}}}/, /{{{yavd SELECTED3}}}/, /{{{yavd SELECTED4}}}/,
                  /{{{yd NAME1}}}/, /{{{yd NAME2}}}/, /{{{yd NAME3}}}/, /{{{yd NAME4}}}/,
                  /{{{yubl \(yavd \(yufull URL1\)\)}}}/, /{{{yubl \(yavd \(yufull URL2\)\)}}}/, /{{{yubl \(yavu \(yufull URL3\)\)}}}/, /{{{yubl \(yavu \(yufull URL4\)\)}}}/,
                  /{{{yc COMMENT1}}}/, /{{{yc COMMENT2}}}/,
                  /{{{y ATTR1}}}/
        ],
    },
    {
        title: './bin/handlebarspp inverse branching template test',
        file: './tests/samples/files/handlebarsjs_template_inverse.hbs',
        result: [ /{{{yavd nomsg}}}/, /{{{yd name}}}/,
                  /{{\^msg}}/, /{{\/msg}}/
        ],
    },
    {
        title: './bin/handlebarspp raw block template test',
        file: './tests/samples/files/handlebarsjs_template_raw_block.hbs',
        result: [ /{{{{rawblock}}}}/, /{{{{\/rawblock}}}}/, /{{foo}}/ ],
    },
    {
        title: './bin/handlebarspp expression state change (lookUpStateForHandlebarsBraceChar) test',
        file: './tests/samples/files/handlebarsjs_template_hardcode_state.hbs',
        result: [ /{{{y TAG_OPEN}}}/,
                  /{{{y END_TAG_OPEN}}}/,
                  /{{{y RCDATA_END_TAG_OPEN}}}/,
                  /{{{y RCDATA_END_TAG_NAME}}}/,
                  /{{{y RAWTEXT_END_TAG_OPEN}}}/,
                  /{{{y RAWTEXT_END_TAG_NAME}}}/,
                  /{{{y SCRIPT_DATA_END_TAG_OPEN}}}/,
                  /{{{y SCRIPT_DATA_END_TAG_NAME}}}/,
                  /{{{y SCRIPT_DATA_ESCAPED_LESS_THAN_SIGN}}}/,
                  /{{{y SCRIPT_DATA_ESCAPED_END_TAG_OPEN}}}/,
                  /{{{y SCRIPT_DATA_ESCAPED_END_TAG_NAME}}}/,
                  /{{{y SCRIPT_DATA_DOUBLE_ESCAPE_START}}}/,
                  /{{{y SCRIPT_DATA_DOUBLE_ESCAPE_END}}}/,
        ],
    },
    {
        title: './bin/handlebarspp branching state consistency test',
        file: './tests/samples/files/handlebarsjs_template_state_consistency.hbs',
        result: [ /{{{yd placeholder3A}}}/, /{{{yavd valueA}}}/,
                  /{{{yd placeholder1B}}}/, /{{{yd placeholder2B}}}/, /{{{yd placeholder3B}}}/, /{{{yavd valueB}}}/,
                  /{{{placeholder1C}}}/, /{{{placeholder2C}}}/, /{{{yd placeholder3C}}}/, /{{{yavd valueC}}}/,
        ],
    },
    {
        title: './bin/handlebarspp escaped mustache test',
        file: 'tests/samples/files/handlebarsjs_escaped_mustache.hbs',
        result: [ /{{{yd expression1}}}/, /{{expression2}}/, /{{{yd expression3}}}/,
                  /{{{rawexpression1}}}/, /{{{rawexpression2}}}/, /{{{rawexpression3}}}/,
        ],
    },
    {
        title: './bin/handlebarspp friend filters test',
        file: 'tests/samples/files/handlebarsjs_template_friend_filters.hbs',
        result: [ /{{{yd uriInHTMLData}}}/, /{{{yd \(uriInHTMLData exp1\)}}}/,
                  /{{{yavd uriInDoubleQuotedAttr}}}/, /{{{yavd \(ya \(uriInDoubleQuotedAttr url1\)\)}}}/,
                  /{{{yavs uriInDoubleQuotedAttr}}}/, /{{{yavs \(ya \(uriInDoubleQuotedAttr url2\)\)}}}/,
        ],
    }
];
exports.templatePatterns = templatePatterns;

var partialPatterns = [
    {
        title: './bin/handlebarspp partial handling test',
        file: 'tests/samples/files/handlebarsjs_template_include_partials.hbs',
        partialProcessing: true,
        combine: true,
        result: [ /{{{y insidepartial}}}/ ]
    },
    {
        title: './bin/handlebarspp partial handling with template generation test',
        file: 'tests/samples/files/handlebarsjs_template_include_partials.hbs',
        partialProcessing: true,
        result: [ /{{> SJST\/6\/handlebarsjs_template_partial}}/ ]
    },
    {
        title: './bin/handlebarspp partial handling with missing partial test',
        file: 'tests/samples/files/handlebarsjs_template_include_partial_miss_cache.hbs',
        partialProcessing: true,
        result: [ /*/{{> SJST\/SKIP\/miss_cache}}/,*/ /WARNING/, /Failed to load the partial content of {{> miss_cache}}/ ]
    },
    {
        title: './bin/handlebarspp partial handling without enabling partial processing',
        file: 'tests/samples/files/handlebarsjs_template_include_partials.hbs',
        partialProcessing: false,
        result: [ /contextual analysis over the partial content of {{> handlebarsjs_template_partial}}/ ]
    },

];
exports.partialPatterns = partialPatterns;

var filterTemplatePatterns = [
    {
        title: './bin/handlebarspp data state template filter test',
        file: './tests/samples/files/handlebarsjs_filter_data_state.hbs',
        result: [ /{{{yd name}}}/ ],
    },
    {
        title: './bin/handlebarspp comment state template filter test',
        file: './tests/samples/files/handlebarsjs_filter_comment_state.hbs',
        result: [ /{{{yd name}}}/, /{{{yc comment}}}/ ],
    },
    {
        title: './bin/handlebarspp attribute value / URI state template filter test 1',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_href.hbs',
        result: [ 
                  // test against double quoted, single quoted and unquoted URL in attribute href
                  /{{{yubl \(yavd \(yufull url11\)\)}}}/, /{{{yubl \(yavs \(yufull url12\)\)}}}/, /{{{yubl \(yavd \(yufull url13\)\)}}}/,
                  /{{{yubl \(yavs \(yufull url14\)\)}}}/, /{{{yubl \(yavu \(yufull url15\)\)}}}/, /{{{yubl \(yavu \(yufull url16\)\)}}}/,
                  // test against double quoted, single quoted and unquoted URL Path in attribute href
                  /{{{yavd \(yu path11\)}}}/, /{{{yavs \(yu path12\)}}}/, /{{{yavd \(yu path13\)}}}/,
                  /{{{yavs \(yu path14\)}}}/, /{{{yavu \(yu path15\)}}}/, /{{{yavu \(yu path16\)}}}/,
                  // test against double quoted, single quoted and unquoted after URL ? in attribute href
                  /{{{yavd \(yu kv11\)}}}/, /{{{yavs \(yu kv12\)}}}/, /{{{yavd \(yu kv13\)}}}/,
                  /{{{yavs \(yu kv14\)}}}/, /{{{yavu \(yu kv15\)}}}/, /{{{yavu \(yu kv16\)}}}/,
                  // test against double quoted, single quoted and unquoted URL query string in attribute href
                  /{{{yavd \(yuc q11\)}}}/, /{{{yavd \(yuc q12\)}}}/, /{{{yavd \(yuc q13\)}}}/,
                  /{{{yavs \(yuc q14\)}}}/, /{{{yavs \(yuc q15\)}}}/, /{{{yavs \(yuc q16\)}}}/,
                  /{{{yavd \(yuc q17\)}}}/, /{{{yavd \(yuc q18\)}}}/, /{{{yavs \(yuc q19\)}}}/,
                  /{{{yavs \(yuc q20\)}}}/, /{{{yavu \(yuc q21\)}}}/, /{{{yavu \(yuc q22\)}}}/,
                  /{{{yavu \(yuc q22\)}}}/, /{{{yavu \(yuc q23\)}}}/, /{{{yavu \(yuc q24\)}}}/,
                  /{{{yavu \(yuc q25\)}}}/,
                  // test against double quoted, single quoted and unquoted URL hash in attribute href
                  /{{{yavd \(yuc hash11\)}}}/, /{{{yavs \(yuc hash12\)}}}/, /{{{yavd \(yuc hash13\)}}}/,
                  /{{{yavs \(yuc hash14\)}}}/, /{{{yavu \(yuc hash15\)}}}/, /{{{yavu \(yuc hash16\)}}}/
        ],
    },
    {
        title: './bin/handlebarspp attribute value / URI state template filter test 2',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_src.hbs',
        result: [],
    },
    {
        title: './bin/handlebarspp attribute value / URI state template filter test 3',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_form_action.hbs',
        result: [],
    },
    {
        title: './bin/handlebarspp attribute value / URI state template filter test 4',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_button_formaction.hbs',
        result: [],
    },
    {
        title: './bin/handlebarspp URI attribute test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_uri_contexts.hbs',
        result: [
            /{{{yubl \(yavd \(yufull url01\)\)}}}/, /{{{yubl \(yavd \(yufull url02\)\)}}}/, /{{{yubl \(yavd \(yufull url03\)\)}}}/,
            /{{{yubl \(yavd \(yufull url04\)\)}}}/, /{{{yubl \(yavd \(yufull url05\)\)}}}/, /{{{yubl \(yavd \(yufull url06\)\)}}}/,
            /{{{yubl \(yavd \(yufull url07\)\)}}}/, /{{{yubl \(yavd \(yufull url08\)\)}}}/, /{{{yubl \(yavd \(yufull url09\)\)}}}/,
            /{{{yubl \(yavd \(yufull url10\)\)}}}/, /{{{yubl \(yavd \(yufull url11\)\)}}}/, /{{{yubl \(yavd \(yufull url12\)\)}}}/,
            /{{{yubl \(yavd \(yufull url13\)\)}}}/, /{{{yubl \(yavd \(yufull url14\)\)}}}/, /{{{yubl \(yavd \(yufull url15\)\)}}}/,
            /{{{yubl \(yavd \(yufull url16\)\)}}}/, /{{{yubl \(yavd \(yufull url17\)\)}}}/, /{{{yubl \(yavd \(yufull url18\)\)}}}/,
            /{{{yubl \(yavd \(yufull url19\)\)}}}/, /{{{y url20}}}/,

            // only add url filters to tag specific attribute
            /{{{yubl \(yavd \(yufull url90\)\)}}}/, /{{{yubl \(yavd \(yufull url91\)\)}}}/, 
            /{{{yavd url92}}}/, /{{{yavd url93}}}/,
            /{{{yubl \(yavd \(yufull url94\)\)}}}/,
            /{{{yavd url95}}}/,
        ]
    },
    {
        title: './bin/handlebarspp attribute value / CSS state (value string) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_style_001.hbs',
        result: [
                  // double quoted
                  /{{{yavd \(yceu color11\)}}}/, /{{{yavd \(yceu color12\)}}}/, /{{{yavd \(yceu bgcolor1\)}}}/,
                  /{{{yavd \(yceu color5\)}}}/, /{{{yavd \(yceu bgcolor5\)}}}/,
                  // double quoted with css single quoted
                  /{{{yavd \(yces color41\)}}}/,

                  // single quoted
                  /{{{yavs \(yceu color21\)}}}/, /{{{yavs \(yceu color22\)}}}/, /{{{yavs \(yceu bgcolor2\)}}}/,
                  /{{{yavs \(yceu color6\)}}}/, /{{{yavs \(yceu bgcolor6\)}}}/,
                  // single quoted with css double quoted
                  /{{{yavs \(yced color42\)}}}/,

                  // unquoted
                  /{{{yavu \(yceu color31\)}}}/, /{{{yavu \(yceu color32\)}}}/, /{{{yavu \(yceu bgcolor3\)}}}/,
                  /{{{yavu \(yceu color7\)}}}/,

                  // url
                  /{{{yubl \(yavd \(yceuu url4\)\)}}}/,
                  /{{{yubl \(yavd \(yceus url5\)\)}}}/,
                  /{{{yubl \(yavs \(yceud url6\)\)}}}/,
                  /{{{yubl \(yavd \(yceuu url7\)\)}}}/,
                  /{{{yubl \(yavd \(yceus url8\)\)}}}/,
                  /{{{yubl \(yavs \(yceud url9\)\)}}}/,

                  // attribute name
                  /{{{y bgcolor7}}}/, /{{{y color43}}}/, /{{{y color44}}}/,

                  // invalid
                  /{{{y invalid1}}}/, /{{{y invalid2}}}/, /{{{y invalid3}}}/, /{{{y invalid4}}}/, /{{{y invalid5}}}/,
                  /{{{y invalid6}}}/, /{{{y invalid7}}}/,
                  /{{{y url1}}}/, /{{{y url2}}}/, /{{{y url3}}}/,
        ],
    },
    {
        title: './bin/handlebarspp attribute value / CSS state (full string) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_style_002.hbs',
        result: [ // double quoted
                  /{{{y style1}}}/, /{{{y style4}}}/, /{{{y style7}}}/,
                  // single quoted
                  /{{{y style2}}}/, /{{{y style5}}}/, /{{{y style8}}}/,
                  // unquoted
                  /{{{y style3}}}/, /{{{y style6}}}/, /{{{y style9}}}/,
        ],
    },
    {
        title: './bin/handlebarspp attribute value / CSS state branching template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_style_003.hbs',
        result: [ // double quoted
                  /{{{yavd \(yceu color1\)}}}/,
                  /{{{yavd \(yceu color2\)}}}/,
                  /{{{yavd \(yces color5\)}}}/,
                  /{{{yavd \(yces color6\)}}}/,
                  // single quoted
                  /{{{yavs \(yceu color3\)}}}/,
                  /{{{yavs \(yceu color4\)}}}/,
                  /{{{yavs \(yced color7\)}}}/,
                  /{{{yavs \(yced color8\)}}}/,
                  // unquoted
                  /{{{yavu \(yceu color9\)}}}/,
                  /{{{yavu \(yceu color10\)}}}/,

                  // invalid
                  /{{{y color0}}}/,
                  /{{{y invalid1}}}/, /{{{y invalid2}}}/, /{{{y invalid3}}}/, /{{{y invalid4}}}/,

                  // valid pattern with conditional templates
                  /{{{yavu \(yced color11\)}}}/,
                  /{{{yavu \(yced color12\)}}}/,
                  /{{{yavu \(yces color13\)}}}/,
                  /{{{yavu \(yces color14\)}}}/,
        ],
    },
    {
        title: './bin/handlebarspp attribute value template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value.hbs',
        result: [ // double quoted
                  /{{{yavd class1}}}/, /{{{yavd class4}}}/,
                  // single quoted
                  /{{{yavs class2}}}/, /{{{yavs class5}}}/,
                  // unquoted
                  /{{{yavu class3}}}/, /{{{yavu class6}}}/, /{{{yavu class7}}}/
        ],
    },
    {
        title: './bin/handlebarspp attribute value / JS state template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_onclick.hbs',
        result: [ // double quoted
                  /{{{y arg1}}}/, /{{{y arg4}}}/,
                  // single quoted
                  /{{{y arg2}}}/, /{{{y arg5}}}/,
                  // unquoted
                  /{{{y arg3}}}/, /{{{y arg6}}}/,
                  // double/single/unqouted line break
                  /{{{y arg7}}}/, /{{{y arg8}}}/, /{{{y arg9}}}/// single quoted
        ],
    },
    {
        title: './bin/handlebarspp attribute value / JS state (as function argument) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_onclick_function_arguments.hbs',
        result: [ 
                  // double quoted with parameter unquoted
                  /{{{y arg1}}}/, /{{{y arg2}}}/, /{{{y arg3}}}/, /{{{y arg4}}}/, /{{{y arg5}}}/, /{{{y arg6}}}/, /{{{y arg7}}}/, /{{{y arg8}}}/, /{{{y arg9}}}/,
                  // single quoted with parameter unquoted
                  /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/, /{{{y arg13}}}/, /{{{y arg14}}}/, /{{{y arg15}}}/, /{{{y arg16}}}/, /{{{y arg17}}}/, /{{{y arg18}}}/,
                  // unquoted with parameter unquoted
                  /{{{y arg19}}}/, /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/, /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/, /{{{y arg26}}}/, /{{{y arg27}}}/
        ],
    },
    {
        title: './bin/handlebarspp attribute value / JS state (quoted onclick) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_onclick_quoted.hbs',
        result: [ // double quoted with parameter unquoted
                  /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/,
                  // single quoted with parameter unquoted
                  /{{{y arg13}}}/, /{{{y arg14}}}/, /{{{y arg15}}}/,
                  // double quoted with parameter unquoted (with space)
                  /{{{y arg16}}}/, /{{{y arg17}}}/,
                  // single quoted with parameter unquoted (with space)
                  /{{{y arg18}}}/, /{{{y arg19}}}/,
                  // double quoted with parameter quoted
                  /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/,
                  // single quoted with parameter quoted
                  /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/,
                  // double quoted with parameter quoted (with space)
                  /{{{y arg26}}}/, /{{{y arg27}}}/,
                  // single quoted with parameter quoted (with space)
                  /{{{y arg28}}}/, /{{{y arg29}}}/,
                  // double quoted with parameter slash quoted
                  /{{{y arg30}}}/, /{{{y arg31}}}/, /{{{y arg32}}}/,
                  // single quoted with parameter slash quoted
                  /{{{y arg33}}}/, /{{{y arg34}}}/, /{{{y arg35}}}/,
                  // double quoted with parameter slash quoted (with space)
                  /{{{y arg36}}}/, /{{{y arg37}}}/,
                  // single quoted with parameter slash quoted (with space)
                  /{{{y arg38}}}/, /{{{y arg39}}}/,
                  // double quoted
                  /{{{y arg40}}}/, /{{{y arg43}}}/,
                  // single quoted
                  /{{{y arg41}}}/, /{{{y arg44}}}/,
                  // unquoted
                  /{{{y arg42}}}/, /{{{y arg45}}}/,
        ],
    },
    {
        title: './bin/handlebarspp attribute value / JS state (unquoted onclick) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_onclick_unquoted.hbs',
        result: [ // unquoted with parameter unquoted
                  /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/, /{{{y arg13}}}/, /{{{y arg14}}}/,
                  // unquoted with parameter single / double quoted
                  /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/,
                  // unquoted with parameter single quoted
                  /{{{y arg23}}}/, /{{{y arg24}}}/,
                  // unquoted with parameter double quoted
                  /{{{y arg25}}}/, /{{{y arg26}}}/
        ],
    },
    {
        title: './bin/handlebarspp attribute value / JS state (quoted/unquoted href) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_href_js.hbs',
        result: [ // double quoted with parameter unquoted
                  /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/,
                  // single quoted with parameter unquoted
                  /{{{y arg13}}}/, /{{{y arg14}}}/, /{{{y arg15}}}/,
                  // double quoted with parameter unquoted (with space)
                  /{{{y arg16}}}/, /{{{y arg17}}}/,
                  // single quoted with parameter unquoted (with space)
                  /{{{y arg18}}}/, /{{{y arg19}}}/,
                  // double quoted with parameter quoted
                  /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/,
                  // single quoted with parameter quoted
                  /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/,
                  // double quoted with parameter quoted (with space)
                  /{{{y arg26}}}/, /{{{y arg27}}}/,
                  // single quoted with parameter quoted (with space)
                  /{{{y arg28}}}/, /{{{y arg29}}}/,
                  // double quoted with parameter slash quoted
                  /{{{y arg30}}}/, /{{{y arg31}}}/, /{{{y arg32}}}/,
                  // single quoted with parameter slash quoted
                  /{{{y arg33}}}/, /{{{y arg34}}}/, /{{{y arg35}}}/,
                  // double quoted with parameter slash quoted (with space)
                  /{{{y arg36}}}/, /{{{y arg37}}}/,
                  // single quoted with parameter slash quoted (with space)
                  /{{{y arg38}}}/, /{{{y arg39}}}/,

                  // double quoted with parameter unquoted
                  /{{{y vbarg10}}}/, /{{{y vbarg11}}}/, /{{{y vbarg12}}}/,
                  // single quoted with parameter unquoted
                  /{{{y vbarg13}}}/, /{{{y vbarg14}}}/, /{{{y vbarg15}}}/,
                  // double quoted with parameter unquoted (with space)
                  /{{{y vbarg16}}}/, /{{{y vbarg17}}}/,
                  // single quoted with parameter unquoted (with space)
                  /{{{y vbarg18}}}/, /{{{y vbarg19}}}/,
                  // double quoted with parameter quoted
                  /{{{y vbarg20}}}/, /{{{y vbarg21}}}/, /{{{y vbarg22}}}/,
                  // single quoted with parameter quoted
                  /{{{y vbarg23}}}/, /{{{y vbarg24}}}/, /{{{y vbarg25}}}/,
                  // double quoted with parameter quoted (with space)
                  /{{{y vbarg26}}}/, /{{{y vbarg27}}}/,
                  // single quoted with parameter quoted (with space)
                  /{{{y vbarg28}}}/, /{{{y vbarg29}}}/,
                  // double quoted with parameter slash quoted
                  /{{{y vbarg30}}}/, /{{{y vbarg31}}}/, /{{{y vbarg32}}}/,
                  // single quoted with parameter slash quoted
                  /{{{y vbarg33}}}/, /{{{y vbarg34}}}/, /{{{y vbarg35}}}/,
                  // double quoted with parameter slash quoted (with space)
                  /{{{y vbarg36}}}/, /{{{y vbarg37}}}/,
                  // single quoted with parameter slash quoted (with space)
                  /{{{y vbarg38}}}/, /{{{y vbarg39}}}/,

                  // double quoted
                  /{{{yubl \(yavd \(yufull arg40\)\)}}}/, /{{{yubl \(yavd \(yufull arg43\)\)}}}/,
                  // single quoted
                  /{{{yubl \(yavs \(yufull arg41\)\)}}}/, /{{{yubl \(yavs \(yufull arg44\)\)}}}/,
                  // unquoted
                  /{{{yubl \(yavu \(yufull arg42\)\)}}}/, /{{{yubl \(yavu \(yufull arg45\)\)}}}/
        ]
    },
    {
        title: './bin/handlebarspp attribute value / JS state (unquoted href) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_href_js_unquoted.hbs',
        result: [ // unquoted with parameter unquoted
                  /{{{y arg10}}}/, /{{{y arg11}}}/, /{{{y arg12}}}/, /{{{y arg13}}}/, /{{{y arg14}}}/,
                  // unquoted with parameter double / single unquoted
                  /{{{y arg20}}}/, /{{{y arg21}}}/, /{{{y arg22}}}/, /{{{y arg23}}}/, /{{{y arg24}}}/, /{{{y arg25}}}/, /{{{y arg26}}}/,
                  // unquoted with parameter unquoted (vbscript)
                  /{{{y vbarg10}}}/, /{{{y vbarg11}}}/, /{{{y vbarg12}}}/, /{{{y vbarg13}}}/, /{{{y vbarg14}}}/,
                  // unquoted with parameter double / single unquoted (vbscript)
                  /{{{y vbarg20}}}/, /{{{y vbarg21}}}/, /{{{y vbarg22}}}/, /{{{y vbarg23}}}/, /{{{y vbarg24}}}/, /{{{y vbarg25}}}/, /{{{y vbarg26}}}/,
        ]
    },
    {
        title: './bin/handlebarspp script data template filter test',
        file: './tests/samples/files/handlebarsjs_filter_script_data.hbs',
        result: [ // single quoted
                  /{{{y arg11}}}/,
                  // double quoted
                  /{{{y arg12}}}/,
                  // unquoted
                  /{{{y arg13}}}/
        ],
    },
    {
        title: './bin/handlebarspp raw text state (<style>) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_raw_text_style.hbs',
        result: [ /{{{y fontsize}}}/ ],
    },
    {
        title: './bin/handlebarspp rcdata state template filter test',
        file: './tests/samples/files/handlebarsjs_filter_rcdata.hbs',
        result: [ /{{{yd title}}}/ ],
    },
    {
        title: './bin/handlebarspp attribute name state template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_name.hbs',
        result: [ /{{{y attribute1}}}/, /{{{y attribute2}}}/ ],
    },
];
// the attribute value / URI state result is the same
filterTemplatePatterns[3]['result'] = filterTemplatePatterns[2]['result'];
filterTemplatePatterns[4]['result'] = filterTemplatePatterns[2]['result'];
filterTemplatePatterns[5]['result'] = filterTemplatePatterns[2]['result'];
exports.filterTemplatePatterns = filterTemplatePatterns;

var exceptionPatterns = [
    {
        title: './bin/handlebarspp broken conditional {{#if}} without {{/if}} template test',
        file: './tests/samples/files/handlebarsjs_template_invalid_branching_001.hbs',
        strictMode: false,
        result: [ /Template does not have branching close expression/, /lineNo:3,charNo:101/ ],
    },
    {
        title: './bin/handlebarspp branching logic startName/endName mismatch template test',
        file: './tests/samples/files/handlebarsjs_template_invalid_branching_002.hbs',
        strictMode: false,
        result: [ /Template expression mismatch/, /lineNo:2,charNo:104/ ],
    },
    {
        title: './bin/handlebarspp broken conditional {{#if}} without {{#if}} template test',
        file: './tests/samples/files/handlebarsjs_template_invalid_branching_003.hbs',
        strictMode: false,
        result: [ /Template expression mismatch/, /lineNo:2,charNo:87/ ],
    },
    {
        title: './bin/handlebarspp invalid {{expression}} template test',
        file: './tests/samples/files/handlebarsjs_template_invalid_escape_expression.hbs',
        strictMode: false,
        result: [ /Invalid expression/, /lineNo:4,charNo:80/ ],
    },
    {
        title: './bin/handlebarspp invalid {{{expression}}} template test',
        file: './tests/samples/files/handlebarsjs_template_invalid_raw_expression.hbs',
        strictMode: false,
        result: [ /Invalid expression/, /lineNo:4,charNo:88/ ],
    },
    {
        title: './bin/handlebarspp invalid raw block startName/endName mismatch template test',
        file: './tests/samples/files/handlebarsjs_template_invalid_raw_block.hbs',
        strictMode: false,
        result: [ /raw block name mismatch/, /lineNo:2,charNo:52/ ],
    },
    {
        title: './bin/handlebarspp html5 inconsistent state (42/34) test',
        file: './tests/samples/bugs/003.html5.inconsitent.hb',
        strictMode: false,
        result: [ /Inconsistent HTML5 state/, /lineNo:5,charNo:387/ ],
    },
    {
        title: './bin/handlebarspp html5 attribute name type inconsistent state test',
        file: './tests/samples/bugs/007.state.attribute-name-comparison-001.hbs',
        strictMode: false,
        result: [ /Inconsistent HTML5 state/, /lineNo:9,charNo:202/ ],
    },
    {
        title: './bin/handlebarspp line no and char no reporting buildAst test',
        file: './tests/samples/bugs/005-2.line.report.hb',
        strictMode: false,
        result: [ /lineNo:8,charNo:223/ ],
    },
    {
        title: './bin/handlebarspp rawblock expression in non-data state test',
        file: './tests/samples/files/handlebarsjs_template_expression_in_non_data_state_002.hbs',
        strictMode: true,
        result: [ /{{{{rawblock}}}}html{{{{\/rawblock}}}} is placed in a non-text context/ ],
    },
    {
        title: './bin/handlebarspp ampersand expression in non-data state test',
        file: './tests/samples/files/handlebarsjs_template_expression_in_non_data_state_003.hbs',
        strictMode: true,
        result: [ /{{&rawexpression}} is placed in a non-text context/ ],
    },
    /* remove this test as we don't test for tagNameIdx in deepCompare
    {
        title: 'state (missing close tag) in branching template test',
        file: './tests/samples/bugs/006.state.missing-close-tag.hb',
        strictMode: false,
        result: [],
    },
    */
    {
        title: './bin/handlebarspp STATE_SCRIPT_DATA strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_001.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data}} found at scriptable <script> tag/, ],
    },
    {
        title: './bin/handlebarspp STATE_ATTRIBUTE_NAME strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_002.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data}} found at being an attribute name \(state #: 35\)/ ],
    },
    {
        title: './bin/handlebarspp STATE_RAWTEXT strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_003.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data_style}} found at scriptable <style> tag/ ],
    },
    {
        title: './bin/handlebarspp STATE_TAG_NAME strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_004.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data}} found at being a tag name \(i.e., TAG_NAME state\)/ ],
    },
    {
        title: './bin/handlebarspp attribute URI Javascript context strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_005.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data}} found at scriptable URI attribute \(e.g., after <a href="javascript: \)/ ],
    },
    {
        title: './bin/handlebarspp attribute style CSS context strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_006.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data}} found at unsupported position of style attribute \(e.g., <div style="{{output}}:red;", being as the key instead of value. \)/ ],
    },
    {
        title: './bin/handlebarspp attribute on* Javascript context strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_007.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data}} found at onclick JavaScript event attribute/ ],
    },
    {
        title: './bin/handlebarspp NOT HANDLE state strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_008.hbs',
        strictMode: true,
        result: [ /ERROR/, /Unsafe output expression {{data}} found at unsupported position \(i.e., state #: 13\)/ ],
    },
    {
        title: './bin/handlebarspp partial handling with miss cache test',
        file: 'tests/samples/files/handlebarsjs_template_include_partial_miss_cache.hbs',
        strictMode: true,
        result: [ /ERROR/, /Failed to load the partial content of {{> miss_cache}}/ ]
    },
    {
        title: './bin/handlebarspp infinite loop of partial test',
        file: 'tests/samples/files/handlebarsjs_template_include_partials_loop.hbs',
        strictMode: true,
        result: [ /ERROR/, /The partial inclusion chain \({{> l1 }} > {{> l2.hbs }} > {{> l1.hbs }} > {{> l2.hbs }} > {{> l1.hbs }} > {{> l2.hbs }} > {{> l1.hbs }} > {{> l2.hbs }} > {{> l1.hbs }} > {{> l2.hbs }}\) has exceeded the maximum number of allowed depths \(maxPartialDepth: 10\)./ ]
    },
];
exports.exceptionPatterns = exceptionPatterns;

var reportedBugPatterns = [
    {
        title: './bin/handlebarspp line no and char no reporting addFilters test',
        file: './tests/samples/bugs/005-1.line.report.hb',
        result: [ /lineNo:4,charNo:122/, /lineNo:6,charNo:175/, /lineNo:10,charNo:261/, /lineNo:13,charNo:359/, /lineNo:15,charNo:383/ ],
    },
    {
        title: 'state (tag name) propagation in branching template test',
        file: './tests/samples/bugs/004.script.hb',
        result: [],
    },
    {
        title: 'state (attribute name) propagation in branching template test',
        file: './tests/samples/bugs/006.state.attribute-name.hb',
        result: [ /{{{y styleoutput}}}/, /{{{yavd classoutput}}}/ ],
    },
    {
        title: './bin/handlebarspp html5 attribute name type inconsistent state test',
        file: './tests/samples/bugs/007.state.attribute-name-comparison-002.hbs',
        result: [],
    },
/* disable this test during the code refactoring
    {
        title: 'template file with special character',
        file: './tests/samples/files/handlebarsjs_template_special_char.hbs',
        result: [ /{\ufffd}/, /abcde\ufffdnull\ufffd12345/, /{{{yd express\ufffdion}}}/,
                  /{{{rawexpress\ufffdion}}}/, /{{>part\ufffdial}}/,
                  /{{{{raw\ufffdblock}}}}\ufffdnullinrawblock\ufffd{{{{\/raw\ufffdblock}}}}/ ],
    },
*/
];
exports.reportedBugPatterns = reportedBugPatterns;

var scriptableTagTestPatterns = [
    { tag: 'script', result: true },
    { tag: 'style', result: true },
    { tag: 'svg', result: true },
    { tag: 'object', result: true },
    { tag: 'embed', result: true },
    { tag: 'link', result: true },
    { tag: 'scriptlet', result: true },
    { tag: 'a', result: false },
];
exports.scriptableTagTestPatterns = scriptableTagTestPatterns;

var cssStyleAttributeValuePatterns1 = [
    { css: '', result: '' },
    { css: '&#058&#058;&#x03a&#x03A;&colon;',               result: ':::::' },
    { css: '&#059&#059;&#x03b&#x03B;&semi;',                result: ';;;;;' },
    { css: '&#040&#040;&#x028&#x028;&lpar;',                result: '(((((' },
    { css: '&#041&#041;&#x029&#x029;&rpar;',                result: ')))))' },
    { css: '&#034&#034;&#x022&#x022;&quot;&QUOT;',          result: '\"\"\"\"\"\"' },
    { css: '&#039&#039;&#x027&#x027;&apos;',                result: '\'\'\'\'\''   },
    { css: '&#047&#047;&#x02f&#x02F;&sol;',                 result: '\/\/\/\/\/'   },
    { css: '&#044&#044;&#x02c&#x02C;&comma;',               result: ',,,,,' },
    { css: '&#043&#043;&#x02b&#x02B;&plus;',                result: '+++++' },
    { css: '&#045&#045;&#x02d&#x02D;',                      result: '----'  },
    { css: '&#037&#037;&#x025&#x025;&percnt;',              result: '%%%%%' },
    { css: '&#035&#035;&#x023&#x023;&num;',                 result: '#####' },
    { css: '&#033&#033;&#x021&#x021;&excl;',                result: '!!!!!' },
    { css: '&#095&#095;&#x05f&#x05F;&lowbar;&UnderBar;',    result: '______' },
    { css: '&#092&#092;&#x05c&#x05C;&bsol;',                result: '\\\\\\\\\\'    },
    { css: '&#042&#042;&#x02a&#x02A;&ast;&midast;',         result: '******' },
    { css: '&#032&#032;&#x020&#x020;&#9&#9;&Tab;&#010;&#010&#x0a&#x0A;&NewLine;&#012&#012;&#x0c&#x0C;&#013&#013;&#x0d&#x0D;\t\r\n\f',
        result: '    \t\t\t\n\n\n\n\n\f\f\f\f\ufffd\ufffd\ufffd\ufffd\t\r\n\f' },
];
exports.cssStyleAttributeValuePatterns1 = cssStyleAttributeValuePatterns1;

var cssStyleAttributeValuePatterns2 = [
    // property parsing error
    { css: '"   :', result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },

    // <div style="color:{{xxx}}">
    // SPACE_EMPTY
    { css: 'color: ',              result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: ''} ] },
    { css: 'color:  ',             result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: ''} ] },
    { css: 'color:     ',          result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: ''} ] },

    // <div style="color:'{{xxx}}'">
    // <div style='color:"{{xxx}}"'>
    // BAD_STRING
    { css: "color:'",      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'color', value: "'" } ] },
    { css: 'color:"',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'color', value: '"' } ] },
    { css: "color: '",     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'color', value: "'" } ] },
    { css: 'color: "',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'color', value: '"' } ] },
    { css: "color: '   ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'color', value: "'   " } ] },
    { css: 'color: "   ',  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'color', value: '"   ' } ] },

    // <div style="font:italic bold {{xxx}}px">
    // GOOD_STRING
    { css: 'font: italic bold',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'font', value: 'bold' } ] },
    { css: 'font: italic bold ',    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'font', value: 'bold ' } ] },
    { css: 'font: italic   bold   ',result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'font', value: 'bold ' } ] },

    // <div style="font:italic bold string">
    // BAD_STRING
    { css: "font: italic bold'",    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'font', value: "'" } ] },
    { css: 'font: italic bold"',    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'font', value: '"' } ] },
    // BAD_STRING
    { css: "font: italic bold '",   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'font', value: "'" } ] },
    { css: 'font: italic bold "',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'font', value: '"' } ] },
    { css: "font: italic bold '  ", result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'font', value: "'  " } ] },
    { css: 'font: italic bold "  ', result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'font', value: '"  ' } ] },

    // <div style='font-family: Times, "{{xxx}}"'>
    // SPACE_EMPTY
    { css: 'font-family: Times,',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'font-family', value: '' } ] },
    { css: 'font-family: Times,   ',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'font-family', value: '' } ] },
    // BAD_STRING
    { css: "font-family: Times,  '",   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'font-family', value: "'" } ] },
    { css: 'font-family: Times,  "',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'font-family', value: '"' } ] },
    { css: "font-family: Times,'  ",   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'font-family', value: "'  " } ] },
    { css: 'font-family: Times,"  ',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'font-family', value: '"  ' } ] },
    { css: "font-family: Times, ' ",   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'font-family', value: "' " } ] },
    { css: 'font-family: Times, " ',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'font-family', value: '" ' } ] },

    // <div style='background: url({{xxx}})'>
    // BAD_URI
    { css: 'background: url(',        result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED, key: 'background', value: 'url(' } ] },
    { css: 'background: UrL(',        result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED, key: 'background', value: 'UrL(' } ] },
    { css: 'background: url(    ',    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED, key: 'background', value: 'url(    ' } ] },
    // BAD_URI + BAD_STRING
    { css: "background: url('",       result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url('" } ] },
    { css: 'background: url("',       result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED, key: 'background', value: 'url("' } ] },
    { css: "background: url(  '",     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url(  '" } ] },
    { css: 'background: url(  "',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED, key: 'background', value: 'url(  "' } ] },
    { css: "background: url(  '  ",   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url(  '  " } ] },
    { css: 'background: url(  "  ',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED, key: 'background', value: 'url(  "  ' } ] },

    // <div style='background: red url({{xxx}})'>
    // BAD_URI
    { css: 'background: red url(',    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED, key: 'background', value: 'url(' } ] },
    { css: 'background: red url(  ',  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED, key: 'background', value: 'url(  ' } ] },
    // BAD_URI + BAD_STRING
    { css: "background: red url('",   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url('" } ] },
    { css: 'background: red url("',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED, key: 'background', value: 'url("' } ] },
    { css: "background: red url(  '", result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url(  '" } ] },
    { css: 'background: red url(  "', result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED, key: 'background', value: 'url(  "' } ] },
    { css: "background: red url(  ' ",result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url(  ' " } ] },
    { css: 'background: red url(  " ',result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED, key: 'background', value: 'url(  " ' } ] },

    // 2 delcarations
    // SPACE_EMPTY
    { css: 'color: xxx; background: ',   result: [
       { key: 'color', value: 'xxx', type: cssParserUtils.STYLE_ATTRIBUTE_ERROR },
       { key: '', value: ';', type: cssParserUtils.SEMICOLON },
       { key: 'background', value: '', type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED }
    ] },
    // BAD_STRING
    { css: "color: xxx; background: '",  result: [
       { key: 'color', value: 'xxx', type: cssParserUtils.STYLE_ATTRIBUTE_ERROR },
       { key: '', value: ';', type: cssParserUtils.SEMICOLON },
       { key: 'background', value: "'", type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED }
    ] },
    { css: 'color: xxx; background: "',  result: [
       { key: 'color', value: 'xxx', type: cssParserUtils.STYLE_ATTRIBUTE_ERROR },
       { key: '', value: ';', type: cssParserUtils.SEMICOLON },
       { key: 'background', value: '"', type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED }
    ] },
    // BAD_URI
    { css: 'color: xxx; background: url(',   result: [
       { key: 'color', value: 'xxx', type: cssParserUtils.STYLE_ATTRIBUTE_ERROR },
       { key: '', value: ';', type: cssParserUtils.SEMICOLON },
       { key: 'background', value: 'url(', type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED }
    ] },
    // BAD_URI + BAD_STRING
    { css: "color: xxx; background: url('",   result: [
       { key: 'color', value: 'xxx', type: cssParserUtils.STYLE_ATTRIBUTE_ERROR },
       { key: '', value: ';', type: cssParserUtils.SEMICOLON },
       { key: 'background', value: "url('", type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED }
    ] },
    { css: 'color: xxx; background: url("',   result: [
       { key: 'color', value: 'xxx', type: cssParserUtils.STYLE_ATTRIBUTE_ERROR },
       { key: '', value: ';', type: cssParserUtils.SEMICOLON },
       { key: 'background', value: 'url("', type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED }
    ] },

    // GOOD_STRING
    { css: 'background: "red    "  ',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: '"red    " ' } ] },
    { css: "background: 'red    '  ",     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: "'red    ' " } ] },
    // BAD_STRING
    { css: "background: 'red    ' '",     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'background', value: "'" } ] },
    { css: 'background: "red    " "',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'background', value: '"' } ] },
    // BAD_URI
    { css: 'background: "red    "  url(',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED, key: 'background', value: 'url(' } ] },
    // BAD_URI + BAD_STRING
    { css: "background: 'red    '  url('",    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url('" } ] },
    { css: 'background: "red    "  url("',    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_DOUBLE_QUOTED, key: 'background', value: 'url("' } ] },
    // GOOD_STRING
    { css: 'background: url(http://www.evil.com)    ',  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: 'url(http://www.evil.com) ' } ] },
    { css: 'background: url("http://www.evil.com")  ',  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: 'url("http://www.evil.com") ' } ] },
    { css: "background: url('http://www.evil.com')  ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: "url('http://www.evil.com') " } ] },

    // GOOD_STRING
    { css: 'background: "re"d   ',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: 'd ' } ] },
    // BAD_STRING
    { css: 'background: "re\'d  ',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: '"re\'d  ' } ] },
    // BAD_URI
    { css: 'background: "re"d   url(', result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_UNQUOTED, key: 'background', value: 'url(' } ] },
    // BAD_STRING
    { css: 'background: "red    ',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: '"red    ' } ] },
    { css: "background: 'red    ",     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: "'red    " } ] },

    // PARSING ERROR
    { css: ':',            result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: '    :',        result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: '    :     ',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: ':;',           result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: ':   ;',        result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: ':   ;     ',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'color::;  ',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'xxx',          result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'color:red; color ', result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: 'red' } ] },

    // GOOD_STRING
    { css: 'color:""',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: '""' } ] },
    { css: "color:''",     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: "''" } ] },
    { css: 'color:" "',    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: '" "' } ] },
    { css: "color:' '",    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: "' '" } ] },
    { css: 'color:""   ',  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: '"" ' } ] },
    { css: "color:''   ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: "'' " } ] },

    // BAD_URI + BAD_STRING
    { css: "background: url('     ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url('     " } ] },
    { css: "background: url( '    ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_URL_SINGLE_QUOTED, key: 'background', value: "url( '    " } ] },

    // BAD_URI + GOOD_STRING
    { css: "background: url( ' '  ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: "url( ' ' " } ] },
    { css: 'background: url( " "  ',  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: 'url( " " ' } ] },

    // GOOD FUNCTION
    { css: "background: url()",        result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: 'url()' } ] },
    { css: "background: url(  )",      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: 'url(  )' } ] },
    { css: "background: url()      ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: 'url() ' } ] },
    { css: "background: url(' ')   ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: "url(' ') " } ] },
    { css: "background: url( ' ')  ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: "url( ' ') " } ] },
    { css: "background: url( ' ' )",   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'background', value: "url( ' ' )" } ] },
    { css: "background: url( ' ' ) ",  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: "url( ' ' ) " } ] },

    // GOOD_STRING
    { css: 'color:";"',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: '";"' } ] },
    { css: 'color:";" ',  result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: '";" ' } ] },

    // BAD_STRING
    { css: 'color:";" "', result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_DOUBLE_QUOTED, key: 'color', value: '"' } ] },
    { css: "color:';' '", result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_SINGLE_QUOTED, key: 'color', value: "'" } ] },

    // Parse nothing
    { css: '',    result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: '   ', result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },

    // End with semicolon
    { css: 'color:red;  ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: 'red' },
                                          { type: cssParserUtils.SEMICOLON, key: '', value: ';' } ] },
    { css: 'color:red ; ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: 'red ' },
                                          { type: cssParserUtils.SEMICOLON, key: '', value: ';' } ] },
    { css: 'color:red;; ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: 'color', value: 'red' },
                                          { type: cssParserUtils.SEMICOLON, key: '', value: ';' },
                                          { type: cssParserUtils.SEMICOLON, key: '', value: ';' } ] },
    { css: 'color:;     ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: '' },
                                          { type: cssParserUtils.SEMICOLON, key: '', value: ';' } ] },
    { css: 'color:;;    ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'color', value: '' },
                                          { type: cssParserUtils.SEMICOLON, key: '', value: ';' },
                                          { type: cssParserUtils.SEMICOLON, key: '', value: ';' } ] },

    // Parsing error for both case with and without decoding.
    { css: 'color: \u24B62',     result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'color: &#x24B62;',   result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },

    // after the html decode, if there are still some delimitar in the string, it should cause Parsing error!
    { css: '&background : red   ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'back&ground : red   ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'background& : red   ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: ';',                         result: [ { type: cssParserUtils.SEMICOLON, key: '', value: ';' } ] },
    { css: ';background : red   ',      result: [ { type: cssParserUtils.SEMICOLON, key: '', value: ';' },
                                                  { type: cssParserUtils.STYLE_ATTRIBUTE_UNQUOTED, key: 'background', value: 'red ' } ] },
    { css: 'back;ground : red   ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'background; : red   ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'background  : &red  ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'background  : r&ed  ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
    { css: 'background  : r&ed; ',      result: [ { type: cssParserUtils.STYLE_ATTRIBUTE_ERROR, key: '', value: '' } ] },
];
exports.cssStyleAttributeValuePatterns2 = cssStyleAttributeValuePatterns2;

var cssHtmlEntitiesPattern = [
    { html: '', result: '' },

    { html: '&#9;',        result: '\t' },
    { html: '&#9',         result: '\t' },
    { html: '&#00009;',    result: '\t' },
    { html: '&#x9;',       result: '\t' },

    { html: '&#a;',        result: '&#a;'  },
    { html: '&#xa;',       result: '\n'    },
    { html: '&#xa',        result: '\n'    },
    { html: '&#x0000a;',   result: '\n',   },

    { html: '&#aZ;',       result: '&#aZ;'  },
    { html: '&#xaf;',      result: '¯' },
    { html: '&#xaf',       result: '¯' },
    { html: '&#x0000af;',  result: '¯' },

    { html: '&#d;',        result: '&#d;'  },
    { html: '&#xd;',       result: '\ufffd'    },
    { html: '&#xd',        result: '\ufffd'    },
    { html: '&#x0000d;',   result: '\ufffd'    },

    { html: '&#d7ff;',     result: '&#d7ff;'  },
    { html: '&#xd7ff;',    result: '퟿'     },
    { html: '&#xd7ff',     result: '퟿'     },
    { html: '&#x000d7ff;', result: '퟿'     },

    { html: '&#d800;',     result: '&#d800;'  },
    { html: '&#xd800;',    result: '\ufffd'   },
    { html: '&#xd800',     result: '\ufffd'   },
    { html: '&#x000d800;', result: '\ufffd'   },

    { html: '&#dfff;',     result: '&#dfff;'  },
    { html: '&#xdfff;',    result: '\ufffd'   },
    { html: '&#xdfff;',    result: '\ufffd'   },
    { html: '&#x000dfff;', result: '\ufffd'   },

    { html: '&#e000;',     result: '&#e000;'  },
    { html: '&#xe000;',    result: '\ue000'   },
    { html: '&#xe000',     result: '\ue000'   },
    { html: '&#x000e000;', result: '\ue000'   },

    { html: '&#24B62;',    result: '\ufffdB62;'},
    { html: '&#x24B62;',   result: '\ud852\udf62' },
    { html: '&#x24B62',    result: '\ud852\udf62' },
    { html: '&#x0024B62',  result: '\ud852\udf62' },

    { html: '&#65536;',    result: '\ud800\udc00' },
    { html: '&#x65536;',   result: '\ud955\udd36' },
    { html: '&#x65536',    result: '\ud955\udd36' },
    { html: '&#x0065536;', result: '\ud955\udd36' },
];
exports.cssHtmlEntitiesPattern = cssHtmlEntitiesPattern;

})();
