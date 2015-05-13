/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/
(function() {

var handlebarsUtils = require('../src/handlebars-utils');

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

var buildAstPatterns = [
    { syntax: 'xxxx{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}xxxx', 
      output: 'xxxx{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}xxxx', 
      rstr: [ 'xxxx', '{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}', 'xxxx' ], 
      rtype: [ 'html', 'rawblock', 'html' ],
    },
    { syntax: 'xxxx{{{rawexpression}}} {{{rawexpression}}} xxxx', 
      output: 'xxxx{{{rawexpression}}} {{{rawexpression}}} xxxx', 
      rstr: [ 'xxxx', '{{{rawexpression}}}', ' ', '{{{rawexpression}}}', ' xxxx' ],
      rtype: [ 'html', 'rawexpression', 'html', 'rawexpression', 'html' ],
    },
    { syntax: 'xxxx{{escapeexpression}} {{>partial}} {{&reference}} xxxx', 
      output: 'xxxx{{{yd escapeexpression}}} {{>partial}} {{&reference}} xxxx', 
      rstr: [ 'xxxx', '{{escapeexpression}}', ' ', '{{>partial}}', ' ', '{{&reference}}', ' xxxx' ],
      rtype: [ 'html', 'escapeexpression', 'html', 'expression', 'html', 'expression', 'html' ],
    },
    { syntax: 'xxxx{{! comment }} {{!-- }} --}} xxxx',
      output: 'xxxx{{! comment }} {{!-- }} --}} xxxx',
      rstr: [ 'xxxx', '{{! comment }}', ' ', '{{!-- }} --}}', ' xxxx' ],
      rtype: [ 'html', 'expression', 'html', 'expression', 'html' ],
    },

    // branching
    { syntax: 'xxxx{{#if abc}} yyyy {{else}} zzzz {{/if}} xxxx',
      output: 'xxxx{{#if abc}} yyyy {{else}} zzzz {{/if}} xxxx',
      rstr: [ 'xxxx', { left:  { 
                                 rstr: [ '{{#if abc}}', ' yyyy ' ],
                                 rtype: [ 'branchstart', 'html' ],
                               }, 
                        right: {
                                 rstr: [ '{{else}}', ' zzzz ', '{{/if}}' ],
                                 rtype: [ 'branchelse', 'html', 'branchend' ],
                               } 
                      }, ' xxxx' ],
      rtype: [ 'html', 'node', 'html' ],
    },

    // branching with different types
    { syntax: 'xxxx{{#if abc}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{escapeexpression}} {{>partial}} {{&reference}} yyyy {{else}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{escapeexpression}} {{>partial}} {{&reference}} zzzz {{/if}} xxxx',
      output: 'xxxx{{#if abc}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{{yd escapeexpression}}} {{>partial}} {{&reference}} yyyy {{else}} {{{{rawblock}}}} {{expression}} {{{{/rawblock}}}} {{{rawexpression}}} {{{yd escapeexpression}}} {{>partial}} {{&reference}} zzzz {{/if}} xxxx',
      rstr: [ 'xxxx', { left:  { 
                                 rstr: [ '{{#if abc}}', ' ', '{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}', ' ', '{{{rawexpression}}}', ' ', '{{escapeexpression}}', ' ', '{{>partial}}', ' ', '{{&reference}}', ' yyyy ' ],
                                 rtype: [ 'branchstart', 'html', 'rawblock', 'html', 'rawexpression', 'html', 'escapeexpression', 'html', 'expression', 'html', 'expression', 'html' ], }, 
                        right: {
                                 rstr: [ '{{else}}', ' ', '{{{{rawblock}}}} {{expression}} {{{{/rawblock}}}}', ' ', '{{{rawexpression}}}', ' ', '{{escapeexpression}}', ' ', '{{>partial}}', ' ', '{{&reference}}', ' zzzz ', '{{/if}}' ],
                                 rtype: [ 'branchelse', 'html', 'rawblock', 'html', 'rawexpression', 'html', 'escapeexpression', 'html', 'expression', 'html', 'expression', 'html', 'branchend' ], }, 
                      }, ' xxxx' ],
      rtype: [ 'html', 'node', 'html' ],
    },
    // branching (nested)
    { syntax: 'xxxx{{#if abc}} yyyy {{#msg def}} 123 {{else}} 456 {{/msg}} {{else}} zzzz {{/if}} xxxx',
      output: 'xxxx{{#if abc}} yyyy {{#msg def}} 123 {{else}} 456 {{/msg}} {{else}} zzzz {{/if}} xxxx',
      rstr: [ 'xxxx', { left:  { 
                                 rstr: [ '{{#if abc}}', ' yyyy ', { left:  {
                                                                             rstr: [ '{{#msg def}}', ' 123 ' ],
                                                                             rtype: [ 'branchstart', 'html' ],
                                                                           },
                                                                    right: {
                                                                             rstr: [ '{{else}}', ' 456 ', '{{/msg}}' ],
                                                                             rtype: [ 'branchelse', 'html', 'branchend' ],
                                                                           },
                                                                  }, ' ' ],
                                 rtype: [ 'branchstart', 'html', 'node', 'html' ],
                               }, 
                        right: {
                                 rstr: [ '{{else}}', ' zzzz ', '{{/if}}' ],
                                 rtype: [ 'branchelse', 'html', 'branchend' ],
                               } 
                      }, ' xxxx' ],
      rtype: [ 'html', 'node', 'html' ],
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
];
exports.templatePatterns = templatePatterns;

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
            /{{{yubl \(yavd \(yufull url19\)\)}}}/, /{{{yubl \(yavd \(yufull url20\)\)}}}/,

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
                  /{{{y color11}}}/, /{{{y color12}}}/, /{{{y bgcolor1}}}/, /{{{y color41}}}/,
                  /{{{y color5}}}/, /{{{y bgcolor5}}}/,
                  // single quoted
                  /{{{y color21}}}/, /{{{y color22}}}/, /{{{y bgcolor2}}}/, /{{{y color42}}}/,
                  /{{{y color6}}}/, /{{{y bgcolor6}}}/,
                  // unquoted
                  /{{{y color31}}}/, /{{{y color32}}}/, /{{{y bgcolor3}}}/, /{{{y color43}}}/,
                  /{{{y color7}}}/, /{{{y bgcolor7}}}/
        ],
    },
    {
        title: './bin/handlebarspp attribute value / CSS state (full string) template filter test',
        file: './tests/samples/files/handlebarsjs_filter_attr_value_style_002.hbs',
        result: [ // double quoted
                  /{{{y style1}}}/, /{{{y style4}}}/,
                  // single quoted
                  /{{{y style2}}}/, /{{{y style5}}}/,
                  // unquoted
                  /{{{y style3}}}/, /{{{y style6}}}/
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
        result: [ /ERROR/, /scriptable/, ],
    },
    {
        title: './bin/handlebarspp STATE_ATTRIBUTE_NAME strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_002.hbs',
        strictMode: true,
        result: [ /ERROR/, /attribute name/ ],
    },
    {
        title: './bin/handlebarspp STATE_RAWTEXT strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_003.hbs',
        strictMode: true,
        result: [ /ERROR/, /scriptable <style> tag/ ],
    },
    {
        title: './bin/handlebarspp STATE_TAG_NAME strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_004.hbs',
        strictMode: true,
        result: [ /ERROR/, /TAG_NAME/ ],
    },
    {
        title: './bin/handlebarspp attribute URI Javascript context strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_005.hbs',
        strictMode: true,
        result: [ /ERROR/, /scriptable URI/ ],
    },
    {
        title: './bin/handlebarspp attribute style CSS context strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_006.hbs',
        strictMode: true,
        result: [ /ERROR/, /CSS style attribute/ ],
    },
    {
        title: './bin/handlebarspp attribute on* Javascript context strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_007.hbs',
        strictMode: true,
        result: [ /ERROR/, /JavaScript event attribute/ ],
    },
    {
        title: './bin/handlebarspp NOT HANDLE state strict mode test',
        file: './tests/samples/files/handlebarsjs_template_strict_mode_008.hbs',
        strictMode: true,
        result: [ /ERROR/, /unsupported/ ],
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

var htmlEntities = [
    /*
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

    { o: { "&A;":      { "codepoints": [0], "characters": "" } }, result: { paths: [ [1,] ], codepoints: [ [0] ], exist: undefined } },
    { o: { "&Aa;":     { "codepoints": [0], "characters": "" } }, result: { paths: [ [1,27] ], codepoints: [ [0] ], exist: undefined } },
    { o: { "&Aa;":     { "codepoints": [0], "characters": "" } }, result: { paths: [ [1], [1,27] ], codepoints: [ [0], [0] ], exist: [0] } },
    { o: { "&Aacute;": { "codepoints": [193], "characters": "\u00C1" } }, result: { paths: [ [1,27,29,47,46,31,63,0] ], codepoints: [ [193] ], exist: undefined } },
    { o: { "&Aacute":  { "codepoints": [193], "characters": "\u00C1" } }, result: { paths: [ [1,27,29,47,46,31,0] ], codepoints: [ [193] ], exist: undefined } },
    { o: { "&acE;":    { "codepoints": [8766, 819], "characters": "\u223E\u0333" } }, result: { paths: [ [27,29,5,63,0] ], codepoints: [ [8766, 819] ], exist: undefined } },
];
exports.htmlEntities = htmlEntities;

/* for the pattern cannot be found */
var htmlEntitiesFindString = [
    { str: '&SmallCircle;', result: { codepoints: [8728] } },
    { str: '&SmallCircle',  result: { codepoints: undefined } },
    { str: '&XXX',          result: { codepoints: undefined } },

    /* throw error as expected
    { str: '&\ufffd',       result: { codepoints: undefined } },
    */
];
exports.htmlEntitiesFindString = htmlEntitiesFindString;

var htmlEntitiesEncode = [
    { str: 'abcdefghijklmnop', result: '&#97;&#98;&#99;&#100;&#101;&#102;&#103;&#104;&#105;&#106;&#107;&#108;&#109;&#110;&#111;&#112;' },
    { str: 'ABCDEFGHIJKLMNOP', result: '&#65;&#66;&#67;&#68;&#69;&#70;&#71;&#72;&#73;&#74;&#75;&#76;&#77;&#78;&#79;&#80;' },
    { str: '0123456789',       result: '&#48;&#49;&#50;&#51;&#52;&#53;&#54;&#55;&#56;&#57;' },
    { str: '\u0024',           result: '&#36;' },
    { str: '\u20ac',           result: '&#8364;' },
    { str: '\u10437',          result: '&#4163;&#55;' },
    { str: '\u24B62',          result: '&#9398;&#50;' },

    { str: '\uD852\uDF62',     result: '&#150370;' },
    { str: '\uD801\uDC37',     result: '&#66615;' },
    { str: '\uDBFF\uDC00',     result: '&#1113088;' },
    { str: '\uFFFF\uDC00',     result: '&#65535;' },
    { str: '\uD800\uDC00',     result: '&#65536;' },

    /* out of range, skip one char */
    { str: '\uDC00\uDC00',     result: '&#56320;' },
    { str: '\uDFFF\uDC00',     result: '&#57343;' },
];
exports.htmlEntitiesEncode = htmlEntitiesEncode;

var htmlEntitiesDecode = [
    { str: '&#97;&#98;&#99;&#100;&#101;&#102;&#103;&#104;&#105;&#106;&#107;&#108;&#109;&#110;&#111;&#112;',       result: 'abcdefghijklmnop' },
    { str: '&#65;&#66;&#67;&#68;&#69;&#70;&#71;&#72;&#73;&#74;&#75;&#76;&#77;&#78;&#79;&#80;',                    result: 'ABCDEFGHIJKLMNOP' },
    { str: '&#48;&#49;&#50;&#51;&#52;&#53;&#54;&#55;&#56;&#57;',                                                  result: '0123456789'       },
    { str: '&#x61;&#x62;&#x63;&#x64;&#x65;&#x66;&#x67;&#x68;&#x69;&#x6a;&#x6b;&#x6c;&#x6d;&#x6e;&#x6f;&#x70;',    result: 'abcdefghijklmnop' },
    { str: '&#x41;&#x42;&#x43;&#x44;&#x45;&#x46;&#x47;&#x48;&#x49;&#x4a;&#x4b;&#x4c;&#x4d;&#x4e;&#x4f;&#x50;',    result: 'ABCDEFGHIJKLMNOP' },
    { str: '&#x30;&#x31;&#x32;&#x33;&#x34;&#x35;&#x36;&#x37;&#x38;&#x39;',                                        result: '0123456789'       },

    { str: '&#150370;',       result: '\uD852\uDF62' }, 
    { str: '&#66615;',        result: '\uD801\uDC37' }, 
    { str: '&#1113088;',      result: '\uDBFF\uDC00' },
    { str: '&#65535;',        result: '\uFFFF' },
    { str: '&#65536;',        result: '\uD800\uDC00' },

    { str: '&#000065536;',    result: '\uD800\uDC00' },
    { str: '&#65536',         result: '\uD800\uDC00' },

    { str: '&#x24B62;',       result: '\uD852\uDF62' }, 
    { str: '&#x10437;',       result: '\uD801\uDC37' }, 
    { str: '&#x10FC00;',      result: '\uDBFF\uDC00' },
    { str: '&#xFFFF;',        result: '\uFFFF' },
    { str: '&#x10000;',       result: '\uD800\uDC00' },

    { str: '&#x000010000;',   result: '\uD800\uDC00' },
    { str: '&#x010000',       result: '\uD800\uDC00' },

    /* out of range */
    { str: '&#56320;',        result: '\uFFFD' },
    { str: '&#57343;',        result: '\uFFFD' },

    // named character reference
    { str: '&aelig;',         result: '\u00E6' },
    { str: '&Afr;',           result: '\uD835\uDD04' },
    { str: '&NewLine;',       result: '\u000A' },
    { str: '&bne;',           result: '\u003D\u20E5' },
    { str: '&CounterClockwiseContourIntegral;',           result: '\u2233' },

    { str: '&Uuml;',          result: '\u00DC' },
    { str: '&Uuml',           result: '\u00DC' },

    { str: '&NewLine',        result: '&NewLine'  },
    { str: '&newLine;',       result: '&newLine;' },

    { str: 'abcdefg&NewLine;hijklmnop',      result: 'abcdefg\u000Ahijklmnop' },
    { str: 'abcdefg&NewLinehijklmnop',       result: 'abcdefg&NewLinehijklmnop' },
];
exports.htmlEntitiesDecode = htmlEntitiesDecode;

})();
