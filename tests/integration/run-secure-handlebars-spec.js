/*
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
*/
var expect = chai.expect;

describe("SecureHandlebars: inclusion tests", function() {
    it('Handlebars exists', function() {
    	expect(typeof Handlebars).to.be.equal('object');
    });

});

function HandlebarsGetOutput(html, json) {
    var template = Handlebars.compile(html);
    return template(json);
}

describe("SecureHandlebars: helpers tests", function() {

    it('xss-filters registered as helpers', function(){
        [
            'inHTMLData', 'inHTMLComment',
            'inSingleQuotedAttr', 'inDoubleQuotedAttr', 'inUnQuotedAttr',
            'uriInSingleQuotedAttr', 'uriInDoubleQuotedAttr', 'uriInUnQuotedAttr', 'uriInHTMLData', 'uriInHTMLComment',
            'uriPathInSingleQuotedAttr', 'uriPathInDoubleQuotedAttr', 'uriPathInUnQuotedAttr', 'uriPathInHTMLData', 'uriPathInHTMLComment',
            'uriQueryInSingleQuotedAttr', 'uriQueryInDoubleQuotedAttr', 'uriQueryInUnQuotedAttr', 'uriQueryInHTMLData', 'uriQueryInHTMLComment',
            'uriComponentInSingleQuotedAttr', 'uriComponentInDoubleQuotedAttr', 'uriComponentInUnQuotedAttr', 'uriComponentInHTMLData', 'uriComponentInHTMLComment',
            'uriFragmentInSingleQuotedAttr', 'uriFragmentInDoubleQuotedAttr', 'uriFragmentInUnQuotedAttr', 'uriFragmentInHTMLData', 'uriFragmentInHTMLComment',
            'y', 'ya',
            'yd', 'yc',
            'yavd', 'yavs', 'yavu',
            'yu', 'yuc',
            'yubl', 'yufull',
            'yceu', 'yced', 'yces', 'yceuu', 'yceud', 'yceus',
            'uriData', 'uriComponentData'

        ].forEach(function (filterName) {
            expect(typeof Handlebars.helpers[filterName]).to.be.equal('function');
        });
    });

    it("SafeString test", function() {
        var data = {
            url: 'javascript:alert(1)', 
            safeUrl: new Handlebars.SafeString('javascript:alert(1)')
        };

        var template = '<a href="{{safeUrl}}">SafeURL</a><a href="{{url}}">FilteredUrl</a>';

        expect(HandlebarsGetOutput(template, data)).to.be.equal('<a href="javascript:alert(1)">SafeURL</a><a href="x-javascript:alert(1)">FilteredUrl</a>');
    });

    it("null and undefined treatment test", function() {
        var data = {
            undefined1: undefined,
            null1: null
        };

        // yavu is special and cannot return '' but \uFFFD
        var template = '<a href={{undefined1}}>undefined</a><a class={{null1}}>null</a>';
        expect(HandlebarsGetOutput(template, data)).to.be.equal('<a href=\uFFFD>undefined</a><a class=\uFFFD>null</a>');

        // other filters are okay to turn null/undefined into ''
        var template = '<a href="{{undefined1}}" class=\'{{undefined1}}\'>undefined</a><a href="{{null1}}" style="background:url({{null1}})">null</a>';
        expect(HandlebarsGetOutput(template, data)).to.be.equal('<a href="" class=\'\'>undefined</a><a href="" style="background:url()">null</a>');

    });

    // given no definition of script in data, expects to output empty string by Handlebars.escapeExpression()
    it("Use of Handlebars.escapeExpression() as y", function() {
        var template = '<script>{{script1}}</script><script>{{script2}}</script>';
        expect(HandlebarsGetOutput(template, {script2: null})).to.be.equal('<script></script><script></script>');
    });

});


describe("SecureHandlebars: compilation tests", function() {
    it('smoke template', function(){
        var html = '<!--{{hello}}--><a href={{url}} style="background:url({{url}})" id="{{id}}" id=\'{{id}}\'>{{hello}}</a>';
        var output = HandlebarsGetOutput(html, {
            'id': '12`"\'3',
            'hello': 'hello',
            'url': 'javascript:alert(1)'
        });

        expect(output).to.be.equal('<!--hello--><a href=x-javascript:alert(1) style="background:url(##javascript:alert%281%29)" id="12`&quot;\'3" id=\'12`"&#39;3\'>hello</a>');
    });
});

describe("SecureHandlebars: preprocess tests", function() {
    it('smoke template', function(){
        var html = '<!--{{hello}}--><a href={{url}} style="background:url({{url}})" id="{{id}}" id=\'{{id}}\'>{{hello}}</a>';
        var data = {
            'id': '12`"\'3',
            'hello': 'hello',
            'url': 'javascript:alert(1)'
        };

        var preprocessed = Handlebars.preprocess(html);
        expect(preprocessed).to.be.equal('<!--{{{yc hello}}}--><a href={{{yubl (yavu (yufull url))}}} style="background:url({{{yubl (yavd (yceuu url))}}})" id="{{{yavd id}}}" id=\'{{{yavs id}}}\'>{{{yd hello}}}</a>');

        var output = Handlebars.compilePreprocessed(preprocessed)(data);
        expect(output).to.be.equal('<!--hello--><a href=x-javascript:alert(1) style="background:url(##javascript:alert%281%29)" id="12`&quot;\'3" id=\'12`"&#39;3\'>hello</a>');
    });
});

describe("SecureHandlebars: compilation error tests", function() {
    it('fallback template', function(){
        var html = '{{#if url}}<a href="{{url}}"{{else}}<a href="{{url}}">closed</a>{{/if}}';;
        var output = HandlebarsGetOutput(html, {
            'url': 'javascript:alert(1)'
        });

        expect(output).to.be.equal('<a href="javascript:alert(1)"');
    });

});
