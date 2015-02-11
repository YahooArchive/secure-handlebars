/* 
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/**
This utility parse the handlebars template file and add the customized filters
*/
(function() {

    var fs = require('fs'),
        ContextParserHandlebars = require("./context-parser-handlebars.js"),
        noOfArgs = 0,
        file = '',
        printChar = true,
        subexpression = true;

    process.argv.forEach(function (val, index) {
        ++noOfArgs;
        if (index === 2) {
            file = val;
        } else if (index === 3) {
            printChar = val;
        } else if (index === 4) {
            subexpression = val;
        }
    });

    if (noOfArgs >= 3 && noOfArgs <= 4) {
        if (fs.existsSync(file)) {
            var data = fs.readFileSync(file, 'utf-8');
            var parser = new ContextParserHandlebars(printChar, subexpression);
            parser.contextualize(data);
            parser.printCharWithState();
            process.exit(0);
        } else {
            console.log("[ERROR] "+file+" not exist");
            process.exit(1);
        }
    } else {
        console.log("Usage: handlebarspc <Handlebars template file> <printChar? true|false> <Handlebars 2.0 subexpression filter? true|false>");
        process.exit(1);
    }

}).call(this);
