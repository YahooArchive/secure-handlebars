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
    handlebarsUtils = require('./handlebars-utils.js'),
    privateFilterList = handlebarsUtils.pFilterList,
    manualFilterList = handlebarsUtils.mFilterList,
    hbsCreate = Handlebars.create;

// don't escape SafeStrings, since they're already safe according to Handlebars
// Reference: https://github.com/wycats/handlebars.js/blob/master/lib/handlebars/utils.js#L63-L82
function getHbsCompatibleFilter (filterName) {
    var specialReturnValue = filterName === 'yavu' ? '\uFFFD' : '';
    return function filter (s) {
        // align with Handlebars preference to return '' when s is null/undefined, except in unquoted attr, '\uFFFD' is returned to avoid context breaking
        return s === null || s === undefined ? specialReturnValue : 
            // Unlike escapeExpression(), return s instead of s.toHTML() since downstream
            //  filters of the same chain has to be disabled too.
            //  Handlebars will invoke SafeString.toString() at last during data binding
            s.toHTML ? s : xssFilters._privFilters[filterName](s);
    };
}

function overrideHbsCreate() {
    var h = hbsCreate(),
        c = h.compile, 
        pc = h.precompile,
        i, filterName;

    // expose preprocess function
    h.preprocess = function (template, options) {
        options = options || {};
        options.printCharEnable = false;

        var k, parser;

        try {
            if (template) {
                parser = new ContextParserHandlebars(options);
                return parser.analyzeContext(template);
            }
        } catch (err) {
            handlebarsUtils.warn('[WARNING] SecureHandlebars: falling back to the original template');
            for (k in err) {
                handlebarsUtils.warn(k.toUpperCase() + ': ' + err[k]);
            }
            handlebarsUtils.warn(template);
        }

        return template;
    };

    // override precompile function to preprocess the template first
    h.precompile = function (template, options) {
        return pc.call(this, h.preprocess(template, options), options);
    };

    // override compile function to preprocess the template first
    h.compile = function (template, options) {
        return c.call(this, h.preprocess(template, options), options);
    };

    // expose the original (pre-)/compile
    h.precompilePreprocessed = pc;
    h.compilePreprocessed = c;

    // register below the filters that are automatically applied by context parser 
    for (i = 0; (filterName = privateFilterList[i]); i++) {
        h.registerHelper(filterName, getHbsCompatibleFilter(filterName));
    }

    // override the default y to refer to the Handlebars escape function
    h.registerHelper('y', Handlebars.escapeExpression);

    // register below the filters that are designed for manual application 
    for (i = 0; (filterName = manualFilterList[i]); i++) {
        h.registerHelper(filterName, xssFilters[filterName]);
    }
    h.registerHelper('uriComponentData', xssFilters._privFilters.yuc);
    h.registerHelper('uriData', xssFilters._privFilters.yublf);

    return h;
}

module.exports = overrideHbsCreate();
module.exports.create = overrideHbsCreate;

// @deprecated - the following is in addition to the original Handlbars prototype
module.exports.ContextParserHandlebars = ContextParserHandlebars;
