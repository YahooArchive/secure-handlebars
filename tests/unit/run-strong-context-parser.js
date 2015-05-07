/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
(function () {

    require("mocha");
    var expect = require('chai').expect,
        utils = require("../utils.js"),
        ContextParser = require("../../src/strict-context-parser.js"),
        contextParser = new ContextParser();

    describe('Attribute Name Type Test', function(){

        it('getAttributeNamesType test', function () {
            var parser = contextParser;
            [
                [ '<a href=""            ',   ' ></a>',    ContextParser.ATTRTYPE_URI ],
                [ '<a src=""             ',   ' ></a>',    ContextParser.ATTRTYPE_URI ],

                [ '<body background=""   ',   ' ></body>', ContextParser.ATTRTYPE_URI ],
                [ '<form action=""       ',   ' ></form>', ContextParser.ATTRTYPE_URI ],
                [ '<form formaction=""   ',   ' ></form>', ContextParser.ATTRTYPE_URI ],
                [ '<blockquote cite=""   ',   ' ></blockquote>', ContextParser.ATTRTYPE_URI ],
                [ '<img poster=""        ',   ' ></img>',  ContextParser.ATTRTYPE_URI ],
                [ '<img usemap=""        ',   ' ></img>',  ContextParser.ATTRTYPE_URI ],
                [ '<a longdesc=""        ',   ' ></a>',    ContextParser.ATTRTYPE_URI ],
                [ '<a folder=""          ',   ' ></a>',    ContextParser.ATTRTYPE_URI ],
                [ '<body manifest=""     ',   ' ></body>', ContextParser.ATTRTYPE_URI ],
                [ '<command icon=""      ',   ' ></command>', ContextParser.ATTRTYPE_URI ],
                [ '<head profile=""      ',   ' ></head>',    ContextParser.ATTRTYPE_URI ],

                [ '<meta http-equiv=refresh content=""      ',   ' ></meta>', ContextParser.ATTRTYPE_URI ],

                [ '<doc xml:base=""      ',   ' ></doc>',  ContextParser.ATTRTYPE_URI ],
                [ '<doc xmlns:xlink=""   ',   ' ></doc>',  ContextParser.ATTRTYPE_URI ],
                [ '<link xlink:href=""   ',   ' ></link>', ContextParser.ATTRTYPE_URI ],
                [ '<svg xmlns=""         ',   ' ></svg>',  ContextParser.ATTRTYPE_URI ],

                [ '<div style=""         ',   ' ></div>',  ContextParser.ATTRTYPE_CSS ],

                [ '<a class=""           ',   ' ></a>',    ContextParser.ATTRTYPE_GENERAL ],

                [ '<object classid=""    ',   ' ></object>', ContextParser.ATTRTYPE_URI ],
                [ '<object codebase=""   ',   ' ></object>', ContextParser.ATTRTYPE_URI ],
                [ '<object data=""       ',   ' ></object>', ContextParser.ATTRTYPE_URI ],

                [ '<a onclick=""         ',   ' ></a>',      ContextParser.ATTRTYPE_SCRIPTABLE ],
                [ '<a onXXX=""           ',   ' ></a>',      ContextParser.ATTRTYPE_SCRIPTABLE ],

                [ '<param value=""       ',   ' ></param>',  ContextParser.ATTRTYPE_URI ],
                [ '<XXX value=""      ',   ' ></XXX>',    ContextParser.ATTRTYPE_GENERAL ],
                [ '<link rel=""          ',   ' ><link>',    ContextParser.ATTRTYPE_URI ],
                [ '<XXX rel=""        ',   ' ></XXX>',    ContextParser.ATTRTYPE_GENERAL ],

                [ '<iframe srcdoc=""       ',   ' ></iframe>',  ContextParser.ATTRTYPE_URI ],

            ].forEach(function(testObj) {
                parser.parsePartial(testObj[0]);
                expect(parser.getAttributeNamesType()).to.equal(testObj[2]);
                parser.parsePartial(testObj[1]);
            });
        });
    });


    describe('Input Stream Pre-processing Test', function(){
        it('\\r\\n treatment', function () {
            expect(contextParser.parsePartial('\r\n')).to.equal('\n');
            expect(contextParser.parsePartial('\r\r\r')).to.equal('\n\n\n');
        });
        it('control character \\x0B treatment', function () {
            expect(contextParser.parsePartial('\x0B')).to.equal('\uFFFD');
        });
        it('unicode non-character U+1FFFF and U+1FFFE treatment', function () {
            expect(contextParser.parsePartial('\uD83F\uDFFE')).to.equal('\uFFFD\uFFFD');  //U+1FFFE
            expect(contextParser.parsePartial('\uD83F\uDFFF')).to.equal('\uFFFD\uFFFD');  //U+1FFFF
        });
    });


    describe("HTML Partials", function() {
        it("Inherit internal states from last partial parsing ", function() {
            var html = ['<a href=', '{{url}}', '>hello</a>'],
                htmlStates1, htmlStates3;
                contextParser1 = new ContextParser();

            expect(contextParser1.parsePartial(html[0])).to.equal('<a href=');
            // StateMachine.State.STATE_BEFORE_ATTRIBUTE_VALUE = 37;
            expect(contextParser1.getCurrentState()).to.equal(37);

            // hardcode STATE_ATTRIBUTE_VALUE_UNQUOTED
            contextParser1.setCurrentState(40);

            contextParser1.parsePartial(html[2][0]);
            // confirm state switched to STATE_DATA
            expect(contextParser1.getCurrentState()).to.equal(1);

            expect(contextParser1.parsePartial(html[2].slice(1))).to.equal('hello</a>');

        });
        it("bogus comment conversion", function() {
            expect(contextParser.parsePartial('</>')).to.equal('<!--/-->');
            expect(contextParser.parsePartial('<?>')).to.equal('<!--?-->');
            expect(contextParser.parsePartial('<!>')).to.equal('<!--!-->');
            expect(contextParser.parsePartial('<!->')).to.equal('<!--!--->');

            // the following does not require transforming into comment
            expect(contextParser.parsePartial('<%>')).to.equal('&lt;%>');
            expect(contextParser.parsePartial('<3>')).to.equal('&lt;3>');
        });
        it("bogus comment conversion skipped", function() {
            var contextParser = new ContextParser();

            var html = ['</', '>'];
            expect(contextParser.parsePartial(html[0])).to.equal('</');
            expect(contextParser.parsePartial(html[1])).to.equal('>');

            var html = ['<?', '?>'];
            expect(contextParser.parsePartial(html[0])).to.equal('<!--?');
            expect(contextParser.parsePartial(html[1])).to.equal('?-->');

            var html = ['<!', '>'];
            expect(contextParser.parsePartial(html[0])).to.equal('<!--!');
            expect(contextParser.parsePartial(html[1])).to.equal('-->');

            var html = ['<!-', '>'];
            expect(contextParser.parsePartial(html[0])).to.equal('<!--!-');
            expect(contextParser.parsePartial(html[1])).to.equal('-->');


            delete contextParser;
        });


        it("bogus comment attacks", function() {

            // https://html5sec.org/#91
            var html = [
                '<? foo="><script>alert(1)</script>">',
                '<! foo="><script>alert(1)</script>">',
                '</ foo="><script>alert(1)</script>">',
                '<? foo="><x foo=\'?><script>alert(1)</script>\'>">',
                '<! foo="[[[x]]"><x foo="]foo><script>alert(1)</script>">',
                '<% foo><x foo="%><script>alert(1)</script>">'
            ];

            expect(contextParser.parsePartial(html[0])).to.equal('<!--? foo="--><script>alert(1)</script>">');
            expect(contextParser.parsePartial(html[1])).to.equal('<!--! foo="--><script>alert(1)</script>">');
            expect(contextParser.parsePartial(html[2])).to.equal('<!--/ foo="--><script>alert(1)</script>">');

            expect(contextParser.parsePartial(html[3])).to.equal('<!--? foo="--><x foo=\'?><script>alert(1)</script>\'>">');
            expect(contextParser.parsePartial(html[4])).to.equal('<!--! foo="[[[x]]"--><x foo="]foo><script>alert(1)</script>">');
            expect(contextParser.parsePartial(html[5])).to.equal('&lt;% foo><x foo="%><script>alert(1)</script>">');
        });

        it("bogus comment conversion with two parsePartial calls (listeners inherited)", function() {
            var html = ['<?yo', 'yo?>'];
            var contextParser = new ContextParser();
            expect(contextParser.parsePartial(html[0])).to.equal('<!--?yo');
            expect(contextParser.parsePartial(html[1])).to.equal('yo?-->');
            delete contextParser;
        });

        it("bogus comment conversion with forked ContextParser", function() {
            var html = ['<?yo', 'yo?>'];
            var contextParser = new ContextParser();
            expect(contextParser.parsePartial(html[0])).to.equal('<!--?yo');

            var contextParser1 = contextParser.fork();
            expect(contextParser1.parsePartial(html[1])).to.equal('yo?-->');
            delete contextParser, contextParser1;
        });
    });


    describe("Comment Precedence in RAWTEXT and RCDATA", function() {
        it("<% treatment", function() {
            expect(contextParser.parsePartial('<style> <% </style> %> </style>')).to.equal('<style> &lt;% </style> %> </style>');
            expect(contextParser.parsePartial('<textarea> <% </textarea> %> </textarea>')).to.equal('<textarea> &lt;% </textarea> %> </textarea>');
        });
        it("<! treatment", function() {
            expect(contextParser.parsePartial('<style> <!-- </style> --> </style>')).to.equal('<style> &lt;!-- </style> --> </style>');
            expect(contextParser.parsePartial('<textarea> <!-- </textarea> --> </textarea>')).to.equal('<textarea> &lt;!-- </textarea> --> </textarea>');
        });
    });

    describe("Parse Error Correction in DATA", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('\x00')).to.equal('\uFFFD');
        });
    });

    describe("Parse Error Correction in RCDATA", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<title>\x00</title>')).to.equal('<title>\uFFFD</title>');
        });
    });

    describe("Parse Error Correction in RAWTEXT", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<style>\x00</style>')).to.equal('<style>\uFFFD</style>');
        });
    });

    describe("Parse Error Correction in SCRIPT DATA", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<script>\x00</script>')).to.equal('<script>\uFFFD</script>');
        });
    });

    describe("Parse Error Correction in PLAINTEXT", function() {
        it("NULL treatment", function() {
            expect(new ContextParser().parsePartial('<plaintext>\x00')).to.equal('<plaintext>\uFFFD');
        });
    });

    describe("Parse Error Correction in TAG OPEN", function() {
        it("QUESTION MARK treatment", function() {
            expect(contextParser.parsePartial('abcd<?  ?>efgh')).to.equal('abcd<!--?  ?-->efgh');
        });
        it("ANYTHING ELSE treatment", function() {
            expect(contextParser.parsePartial('abcd<\x00efgh')).to.equal('abcd&lt;\uFFFDefgh');
            expect(contextParser.parsePartial('abcd<3<3<3efgh')).to.equal('abcd&lt;3&lt;3&lt;3efgh');
            expect(contextParser.parsePartial('<<br>')).to.equal('&lt;<br>');
        });
    });


    describe("Parse Error Correction in END TAG OPEN", function() {
        it("GREATER-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('abcd</>efgh')).to.equal('abcd<!--/-->efgh');
        });
        it("ANYTHING ELSE treatment", function() {
            expect(contextParser.parsePartial('abcd</\x00div>efgh')).to.equal('abcd<!--/\uFFFDdiv-->efgh');
            expect(contextParser.parsePartial('abcd</ div>efgh')).to.equal('abcd<!--/ div-->efgh');
        });
    });

    describe("Parse Error Correction in TAG NAME", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<b\x00r><b\x00r/>')).to.equal('<b\uFFFDr><b\uFFFDr/>');
        });
    });


    describe("Parse Error Correction in SCRIPT DATA ESCAPED", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<script><!-- \x00 --></script>')).to.equal('<script><!-- \uFFFD --></script>');
        });
    });
    describe("Parse Error Correction in SCRIPT DATA ESCAPED DASH", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<script><!-- -\x00 --></script>')).to.equal('<script><!-- -\uFFFD --></script>');
        });
    });
    describe("Parse Error Correction in SCRIPT DATA ESCAPED DASH DASH", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<script><!-- --\x00 --></script>')).to.equal('<script><!-- --\uFFFD --></script>');
        });
    });
    describe("Parse Error Correction in SCRIPT DATA DOUBLE ESCAPED", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<script><!-- <script>\x00 --></script>')).to.equal('<script><!-- <script>\uFFFD --></script>');
        });
    });
    describe("Parse Error Correction in SCRIPT DATA DOUBLE ESCAPED DASH", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<script><!-- <script> -\x00 --></script>')).to.equal('<script><!-- <script> -\uFFFD --></script>');
        });
    });
    describe("Parse Error Correction in SCRIPT DATA DOUBLE ESCAPED DASH DASH", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<script><!-- <script> --\x00 --></script>')).to.equal('<script><!-- <script> --\uFFFD --></script>');
        });
    });

    describe("Parse Error Correction in BEFORE ATTRIBUTE NAME", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<a \x00href="#">hello</a>')).to.equal('<a \uFFFDhref="#">hello</a>');
        });
        it("QUOTATION MARK treatment", function() {
            expect(contextParser.parsePartial('<a "href="#">hello</a>')).to.equal('<a href="#">hello</a>');
            expect(contextParser.parsePartial('<img src="x" "b>hello</b>')).to.equal('<img src="x" b>hello</b>');
            expect(contextParser.parsePartial('<img src="x""b>hello</b>')).to.equal('<img src="x" b>hello</b>');
        });
        it("APOSTROPHE treatment", function() {
            expect(contextParser.parsePartial('<a \'href="#">hello</a>')).to.equal('<a href="#">hello</a>');
            expect(contextParser.parsePartial('<img src="x" \'b>hello</b>')).to.equal('<img src="x" b>hello</b>');
            expect(contextParser.parsePartial('<img src="x"\'b>hello</b>')).to.equal('<img src="x" b>hello</b>');
        });
        it("LESS-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<a <href="#">hello</a>')).to.equal('<a href="#">hello</a>');
            expect(contextParser.parsePartial('<img src="x" <b>hello</b>')).to.equal('<img src="x" b>hello</b>');
            expect(contextParser.parsePartial('<img src="x"<b>hello</b>')).to.equal('<img src="x" b>hello</b>');
        });
        it("EQUALS SIGN treatment", function() {
            expect(contextParser.parsePartial('<a =href="#">hello</a>')).to.equal('<a href="#">hello</a>');
            expect(contextParser.parsePartial('<img src="x" =b>hello</b>')).to.equal('<img src="x" b>hello</b>');
            expect(contextParser.parsePartial('<img src="x"=b>hello</b>')).to.equal('<img src="x" b>hello</b>');
        });
    });

    describe("Parse Error Correction in ATTRIBUTE NAME", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<a hre\x00f="#">hello</a>')).to.equal('<a hre\uFFFDf="#">hello</a>');
        });
        it("QUOTATION MARK treatment", function() {
            expect(contextParser.parsePartial('<a href"="#">hello</a>')).to.equal('<a href="#">hello</a>');
            expect(contextParser.parsePartial('<a href"="#">hello</a>')).to.equal('<a href="#">hello</a>');
        });
        it("APOSTROPHE treatment", function() {
            expect(contextParser.parsePartial('<a href\'="#">hello</a>')).to.equal('<a href="#">hello</a>');
            expect(contextParser.parsePartial('<a href\'="#">hello</a>')).to.equal('<a href="#">hello</a>');
        });
        it("LESS-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<a href<="#">hello</a>')).to.equal('<a href="#">hello</a>');
            expect(contextParser.parsePartial('<a href<="#">hello</a>')).to.equal('<a href="#">hello</a>');
        });


        it("malicious attribute names using APOSTROPHE", function() {

            // https://html5sec.org/#62
            var html = [
                '<!-- IE 6-8 --><x \'="foo"><x foo=\'><img src=x onerror=alert(1)//\'>', 
                '<!-- IE 6-9 --><! \'="foo"><x foo=\'><img src=x onerror=alert(2)//\'>',
                '<!-- IE 6-9 --><? \'="foo"><x foo=\'><img src=x onerror=alert(3)//\'>'
            ];

            expect(contextParser.parsePartial(html[0])).to.equal('<!-- IE 6-8 --><x foo><x foo=\'><img src=x onerror=alert(1)//\'>');
            expect(contextParser.parsePartial(html[1])).to.equal('<!-- IE 6-9 --><!--! \'="foo"--><x foo=\'><img src=x onerror=alert(2)//\'>');
            expect(contextParser.parsePartial(html[2])).to.equal('<!-- IE 6-9 --><!--? \'="foo"--><x foo=\'><img src=x onerror=alert(3)//\'>');
        });
    });

    describe("Parse Error Correction in AFTER ATTRIBUTE NAME", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<a href \x00="#">hello</a>')).to.equal('<a href \uFFFD="#">hello</a>');
        });
        it("QUOTATION MARK treatment", function() {
            expect(contextParser.parsePartial('<a href "="#">hello</a>')).to.equal('<a href ="#">hello</a>');
        });
        it("APOSTROPHE treatment", function() {
            expect(contextParser.parsePartial('<a href \'="#">hello</a>')).to.equal('<a href ="#">hello</a>');
        });
        it("LESS-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<a href <="#">hello</a>')).to.equal('<a href ="#">hello</a>');
        });
    });

    describe("Parse Error Correction in BEFORE ATTRIBUTE VALUE", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<a href=\x00x>hello</a>')).to.equal('<a href=\uFFFDx>hello</a>');
        });
        it("GREATER-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<a href=>hello</a>')).to.equal('<a href>hello</a>');
        });
        it("LESS-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<a href=<x>hello</a>')).to.equal('<a href=&lt;x>hello</a>');
            expect(contextParser.parsePartial('<a href=<>hello</a>')).to.equal('<a href=&lt;>hello</a>');
        });
        it("EQUALS SIGN treatment", function() {
            expect(contextParser.parsePartial('<a href==x>hello</a>')).to.equal('<a href=&#61;x>hello</a>');
            expect(contextParser.parsePartial('<a href==>hello</a>')).to.equal('<a href=&#61;>hello</a>');
        });
        it("GRAVE ACCENT treatment", function() {
            expect(contextParser.parsePartial('<a href=`x`>hello</a>')).to.equal('<a href=&#96;x&#96;>hello</a>');
            expect(contextParser.parsePartial('<a href=`>hello</a>')).to.equal('<a href=&#96;>hello</a>');
        });
    });

    describe("Parse Error Correction in ATTRIBUTE VALUE (DOUBLE-QUOTED)", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<a href="\x00">hello</a>')).to.equal('<a href="\uFFFD">hello</a>');
        });
    });

    describe("Parse Error Correction in ATTRIBUTE VALUE (SINGLE-QUOTED)", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<a href=\'\x00\'>hello</a>')).to.equal('<a href=\'\uFFFD\'>hello</a>');
        });
    });

    describe("Parse Error Correction in ATTRIBUTE VALUE (UNQUOTED)", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<a href=x\x00>hello</a>')).to.equal('<a href=x\uFFFD>hello</a>');
        });
        it("QUOTATION MARK treatment", function() {
            expect(contextParser.parsePartial('<a href=x">hello</a>')).to.equal('<a href=x&quot;>hello</a>');
        });
        it("APOSTROPHE treatment", function() {
            expect(contextParser.parsePartial('<a href=x\'>hello</a>')).to.equal('<a href=x&#39;>hello</a>');
        });
        it("LESS-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<a href=x<>hello</a>')).to.equal('<a href=x&lt;>hello</a>');
            expect(contextParser.parsePartial('<a href=<>hello</a>')).to.equal('<a href=&lt;>hello</a>');
        });
        it("EQUALS SIGN treatment", function() {
            expect(contextParser.parsePartial('<a href=x=>hello</a>')).to.equal('<a href=x&#61;>hello</a>');
            expect(contextParser.parsePartial('<a href==>hello</a>')).to.equal('<a href=&#61;>hello</a>');
        });
        it("GRAVE ACCENT treatment", function() {
            expect(contextParser.parsePartial('<a href=x`>hello</a>')).to.equal('<a href=x&#96;>hello</a>');
            expect(contextParser.parsePartial('<a href=`>hello</a>')).to.equal('<a href=&#96;>hello</a>');
        });
    });

    describe("Parse Error Correction in AFTER ATTRIBUTE VALUE (QUOTED)", function() {
        it("ANYTHING ELSE treatment", function() {
            expect(contextParser.parsePartial('<img src="x" onclick=""/>')).to.equal('<img src="x" onclick=""/>');
            expect(contextParser.parsePartial('<img src="x"onclick=""/>')).to.equal('<img src="x" onclick=""/>');
        });
    });

    describe("Parse Error Correction in SELF-CLOSING START TAG", function() {
        it("ANYTHING ELSE treatment", function() {
            expect(contextParser.parsePartial('<br/ onclick="">')).to.equal('<br  onclick="">');
            expect(contextParser.parsePartial('<br/onclick="">')).to.equal('<br onclick="">');

            expect(contextParser.parsePartial('<br /onclick="">')).to.equal('<br  onclick="">');
            expect(contextParser.parsePartial('<br oncl/ick="">')).to.equal('<br oncl ick="">');
            expect(contextParser.parsePartial('<br onclick /="">')).to.equal('<br onclick  >');
            expect(contextParser.parsePartial('<br onclick/="alert(1)">')).to.equal('<br onclick alert(1)>');
            expect(contextParser.parsePartial('<br onclick /="alert(1)">')).to.equal('<br onclick  alert(1)>');
        });
    });

    describe("Parse Error Correction in MARKUP DECLARATION OPEN", function() {
        it("doctype treatment", function() {
            expect(contextParser.parsePartial('<!doctype html>')).to.equal('<!doctype html>');
            expect(contextParser.parsePartial('<!doctype html5>')).to.equal('<!--!doctype html5--><!doctype html>');
            expect(contextParser.parsePartial('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">'))
                .to.equal('<!--!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd"--><!doctype html>');
        });
        it("[CDATA[ treatment", function() {
            expect(contextParser.parsePartial('<math><ms><![CDATA[x<y]]></ms></math>')).to.equal('<math><ms><![CDATA[x<y]]></ms></math>');
        });
        it("standard comment treatment", function() {
            expect(contextParser.parsePartial('<!--hello-->')).to.equal('<!--hello-->');
        });
    });

    describe("Parse Error Correction in COMMENT START", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<!--\x00-->')).to.equal('<!--\uFFFD-->');
        });
        it("GREATER-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<!-->')).to.equal('<!---->');
        });
    });

    describe("Parse Error Correction in COMMENT START DASH", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<!---\x00-->')).to.equal('<!---\uFFFD-->');
        });
        it("GREATER-THAN SIGN treatment", function() {
            expect(contextParser.parsePartial('<!--->')).to.equal('<!---->');
        });

    });

    describe("Parse Error Correction in COMMENT", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<!-- \x00-->')).to.equal('<!-- \uFFFD-->');
        });
    });

    describe("Parse Error Correction in COMMENT END DASH", function() {
        it("NULL treatment", function() {
            // expect(contextParser.parsePartial('<!---\x00->')).to.equal('<!---\uFFFD->');
            expect(contextParser.parsePartial('<!---\x00>-->')).to.equal('<!---\uFFFD>-->');
        });
    });

    describe("Parse Error Correction in COMMENT END", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<!----\x00>-->')).to.equal('<!----\uFFFD>-->');
        });
        it("EXCLAMATION MARK treatment", function() {
            expect(contextParser.parsePartial('<!--abc--!>')).to.equal('<!--abc-->');
            expect(contextParser.parsePartial('<!--abc--!-->')).to.equal('<!--abc--!-->');
            expect(contextParser.parsePartial('<!--abc--! -->')).to.equal('<!--abc--! -->');
            expect(contextParser.parsePartial('<!--abc--! --!>')).to.equal('<!--abc--! -->');
        });
        it("HYPHEN-MINUS treatment", function() {
            expect(contextParser.parsePartial('<!--abc--->')).to.equal('<!--abc--->');
        });
        it("ANYTHING ELSE treatment", function() {
            expect(contextParser.parsePartial('<!--abc--a-->')).to.equal('<!--abc--a-->');
        });
    });

    describe("Parse Error Correction in COMMENT END BANG", function() {
        it("NULL treatment", function() {
            expect(contextParser.parsePartial('<!----!\x00>-->')).to.equal('<!----!\uFFFD>-->');
        });
    });


}());
