/* 
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
var Handlebars = require('handlebars'),
    ContextParserHandlebars = require("./context-parser-handlebars"),
    xssFilters = require('xss-filters');

var hbsCreate = Handlebars.create,
    privateFilters = ['y', 'yd', 'yc', 'yavd', 'yavs', 'yavu', 'yu', 'yuc', 'yubl', 'yufull'],
    baseContexts = ['HTMLData', 'HTMLComment', 'SingleQuotedAttr', 'DoubleQuotedAttr', 'UnQuotedAttr'],
    manualFilters = ['in', 'uriIn', 'uriPathIn', 'uriQueryIn', 'uriComponentIn', 'uriFragmentIn'].map(function (outerContext) {
        return baseContexts.map(function (baseContext) {
            return outerContext + baseContext;
        });
    }).reduce(function(a, b) {return a.concat(b);});

function preprocess(template, strictMode) {
    try {
        if (template) {
            var parser = new ContextParserHandlebars({printCharEnable: false, strictMode: strictMode});
            return parser.analyzeContext(template);
        }
    } catch (err) {
        console.log('[WARNING] SecureHandlebars: falling back to the original template');
        Object.keys(err).forEach(function(k){console.log(k.toUpperCase() + ': ' + err[k]);});
        console.log(template);
    }
    return template;
}

function overrideHbsCreate() {
    var h = hbsCreate(),
        c = h.compile, 
        pc = h.precompile,
        privFilters = xssFilters._privFilters;

    // override precompile function to preprocess the template first
    h.precompile = function (template, options) {
        options = options || {};
        return pc.call(this, preprocess(template, options.strictMode), options);
    };

    // override compile function to preprocess the template first
    h.compile = function (template, options) {
        options = options || {};
        return c.call(this, preprocess(template, options.strictMode), options);
    };

    // register below the filters that are automatically applied by context parser 
    privateFilters.forEach(function(filterName){
        h.registerHelper(filterName, privFilters[filterName]);
    });

    // register below the filters that might be manually applied by developers
    manualFilters.forEach(function(filterName){
        h.registerHelper(filterName, xssFilters[filterName]);
    });

    return h;
}

module.exports = overrideHbsCreate();
module.exports.create = overrideHbsCreate;

// the following is in addition to the original Handlbars prototype
module.exports.ContextParserHandlebars = ContextParserHandlebars;
