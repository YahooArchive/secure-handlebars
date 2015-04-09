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

describe("SecureHandlebars: helpers existence tests", function() {

    it('xss-filters registered as helpers', function(){
        [
            'inHTMLData', 'inHTMLComment',
            'inSingleQuotedAttr', 'inDoubleQuotedAttr', 'inUnQuotedAttr',
            'uriInSingleQuotedAttr', 'uriInDoubleQuotedAttr', 'uriInUnQuotedAttr', 'uriInHTMLData', 'uriInHTMLComment',
            'uriPathInSingleQuotedAttr', 'uriPathInDoubleQuotedAttr', 'uriPathInUnQuotedAttr', 'uriPathInHTMLData', 'uriPathInHTMLComment',
            'uriQueryInSingleQuotedAttr', 'uriQueryInDoubleQuotedAttr', 'uriQueryInUnQuotedAttr', 'uriQueryInHTMLData', 'uriQueryInHTMLComment',
            'uriComponentInSingleQuotedAttr', 'uriComponentInDoubleQuotedAttr', 'uriComponentInUnQuotedAttr', 'uriComponentInHTMLData', 'uriComponentInHTMLComment',
            'uriFragmentInSingleQuotedAttr', 'uriFragmentInDoubleQuotedAttr', 'uriFragmentInUnQuotedAttr', 'uriFragmentInHTMLData', 'uriFragmentInHTMLComment',
            'y',
            'yd', 'yc',
            'yavd', 'yavs', 'yavu',
            'yu', 'yuc',
            'yubl', 'yufull'
        ].forEach(function (filterName) {
            expect(typeof Handlebars.helpers[filterName]).to.be.equal('function');
        });
    });

});

var HandlebarsGetOutput = function(html, json) {
    var template = Handlebars.compile(html);
    var output = template(json);
    return output;
};

describe("SecureHandlebars: compilation tests", function() {
    it('smoke template', function(){
        var html = '<!--{{hello}}--><a href={{url}} id="{{id}}" id=\'{{id}}\'>{{hello}}</a>';
        var output = HandlebarsGetOutput(html, {
            'id': '12`"\'3',
            'hello': 'hello',
            'url': 'javascript:alert(1)'
        });

        expect(output).to.be.equal('<!--hello--><a href=x-javascript:alert(1) id="12`&quot;\'3" id=\'12`"&#39;3\'>hello</a>');
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
