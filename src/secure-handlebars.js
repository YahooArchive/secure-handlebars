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
    xssFilters = require('xss-filters'),
    handlebarsUtils = require('./handlebars-utils.js');

var hbsCreate = Handlebars.create,
    privateFilters = ['yd', 'yc', 'yavd', 'yavs', 'yavu', 'yu', 'yuc', 'yubl', 'yufull', 'yceu', 'yced', 'yces', 'yceuu', 'yceud', 'yceus'],
    baseContexts = ['HTMLData', 'HTMLComment', 'SingleQuotedAttr', 'DoubleQuotedAttr', 'UnQuotedAttr'],
    contextPrefixes = ['in', 'uriIn', 'uriPathIn', 'uriQueryIn', 'uriComponentIn', 'uriFragmentIn'];

function preprocess(template, strictMode) {
    try {
        if (template) {
            var parser = new ContextParserHandlebars({printCharEnable: false, strictMode: strictMode});
            return parser.analyzeContext(template);
        }
    } catch (err) {
        handlebarsUtils.warn('[WARNING] SecureHandlebars: falling back to the original template');
        for (var k in err) {
            handlebarsUtils.warn(k.toUpperCase() + ': ' + err[k]);
        }
        handlebarsUtils.warn(template);
    }
    return template;
}

function overrideHbsCreate() {
    var h = hbsCreate(),
        c = h.compile, 
        pc = h.precompile,
        privFilters = xssFilters._privFilters,
        i, j, filterName, prefix, baseContext;

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

    // make y refer to the default escape function
    h.registerHelper('y', Handlebars.escapeExpression);

    // don't escape SafeStrings, since they're already safe according to Handlebars
    // Reference: https://github.com/wycats/handlebars.js/blob/master/lib/handlebars/utils.js#L63-L82
    function safeStringCompatibleFilter (filterName) {
        return function (s) {
            // Unlike escapeExpression(), return s instead of s.toHTML() since downstream
            //  filters of the same chain has to be disabled too.
            //  Handlebars will invoke SafeString.toString() at last during data binding
            return (s && s.toHTML) ? s : privFilters[filterName](s);
        };
    }

    /*jshint -W083 */
    // register below the filters that are automatically applied by context parser 
    for (i = 0; (filterName = privateFilters[i]); i++) {
        h.registerHelper(filterName, safeStringCompatibleFilter(filterName));
    }

    // register below the filters that might be manually applied by developers
    for (i = 0; (prefix = contextPrefixes[i]); i++) {
        for (j = 0; (baseContext = baseContexts[j]); j++) {
            filterName = prefix + baseContext;
            h.registerHelper(filterName, xssFilters[filterName]);
        }
    }

    return h;
}

module.exports = overrideHbsCreate();
module.exports.create = overrideHbsCreate;

// the following is in addition to the original Handlbars prototype
module.exports.ContextParserHandlebars = ContextParserHandlebars;
