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
        parserUtils = require("../../src/parser-utils.js"),
        ContextParser = parserUtils.Parser;

    describe('Attribute Name Type Test', function(){
        it('should give attribute name type', function () {
            var parser = parserUtils.getParser();
            [
                [ '<a href=""            ',   ' ></a>',         ContextParser.ATTRTYPE_URI ],
                [ '<a src=""             ',   ' ></a>',         ContextParser.ATTRTYPE_URI ],

                [ '<body background=""   ',   ' ></body>',      ContextParser.ATTRTYPE_URI ],
                [ '<form action=""       ',   ' ></form>',      ContextParser.ATTRTYPE_URI ],
                [ '<form formaction=""   ',   ' ></form>',      ContextParser.ATTRTYPE_URI ],
                [ '<blockquote cite=""   ',   ' ></blockquote>',ContextParser.ATTRTYPE_URI ],
                [ '<img poster=""        ',   ' ></img>',       ContextParser.ATTRTYPE_URI ],
                [ '<img usemap=""        ',   ' ></img>',       ContextParser.ATTRTYPE_URI ],
                [ '<a longdesc=""        ',   ' ></a>',         ContextParser.ATTRTYPE_URI ],
                [ '<a folder=""          ',   ' ></a>',         ContextParser.ATTRTYPE_URI ],
                [ '<body manifest=""     ',   ' ></body>',      ContextParser.ATTRTYPE_URI ],
                [ '<command icon=""      ',   ' ></command>',   ContextParser.ATTRTYPE_URI ],
                [ '<head profile=""      ',   ' ></head>',      ContextParser.ATTRTYPE_URI ],

                // [ '<meta http-equiv=refresh content=""      ',   ' ></meta>', ContextParser.ATTRTYPE_URI ],

                [ '<doc xml:base=""      ',   ' ></doc>',       ContextParser.ATTRTYPE_URI ],
                [ '<doc xmlns:xlink=""   ',   ' ></doc>',       ContextParser.ATTRTYPE_URI ],
                [ '<link xlink:href=""   ',   ' ></link>',      ContextParser.ATTRTYPE_URI ],
                [ '<svg xmlns=""         ',   ' ></svg>',       ContextParser.ATTRTYPE_URI ],

                [ '<div style=""         ',   ' ></div>',       ContextParser.ATTRTYPE_CSS ],

                [ '<a class=""           ',   ' ></a>',         ContextParser.ATTRTYPE_GENERAL ],

                [ '<object classid=""    ',   ' ></object>',    ContextParser.ATTRTYPE_URI ],
                [ '<object codebase=""   ',   ' ></object>',    ContextParser.ATTRTYPE_URI ],
                [ '<object data=""       ',   ' ></object>',    ContextParser.ATTRTYPE_URI ],

                [ '<a onclick=""         ',   ' ></a>',         ContextParser.ATTRTYPE_SCRIPTABLE ],
                [ '<a onXXX=""           ',   ' ></a>',         ContextParser.ATTRTYPE_SCRIPTABLE ],

                [ '<param value=""       ',   ' ></param>',     ContextParser.ATTRTYPE_URI ],
                [ '<XXX value=""      ',      ' ></XXX>',       ContextParser.ATTRTYPE_GENERAL ],
                [ '<link rel=""          ',   ' ><link>',       ContextParser.ATTRTYPE_URI ],
                [ '<XXX rel=""        ',      ' ></XXX>',       ContextParser.ATTRTYPE_GENERAL ],

                [ '<iframe srcdoc=""       ', ' ></iframe>',    ContextParser.ATTRTYPE_SCRIPTABLE ],
                
                // Uppercases
                [ '<a ONCLICK=""           ', ' ></a>',         ContextParser.ATTRTYPE_SCRIPTABLE ],
                [ '<PARAM VALUE=""       ',   ' ></PARAM>',     ContextParser.ATTRTYPE_URI ],
                [ '<A CLASS=""           ',   ' ></A>',         ContextParser.ATTRTYPE_GENERAL ]


            ].forEach(function(testObj) {
                parser.contextualize(testObj[0]);
                expect(parser.getAttributeNameType()).to.equal(testObj[2]);
                parser.contextualize(testObj[1]);
            });
        });
    });

    describe('Clone States Test', function(){
        it('should be of same states', function () {
            var parser1 = parserUtils.getParser(),
                parser2 = parserUtils.getParser(),
                html = "<a href='http://www.abc.com'>link</a>";
            parser1.contextualize(html);
            parser2.cloneStates(parser1);
            expect(parser2.getCurrentState()).to.equal(1);
            expect(parser2.getAttributeName()).to.equal("href");
            expect(parser2.getAttributeValue()).to.equal("http://www.abc.com");
        });
    });

}());
