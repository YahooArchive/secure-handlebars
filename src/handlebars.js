/* 
Copyright (c) 2015, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com>
         Albert Yu <albertyu@yahoo-inc.com>
         Adonis Fung <adon@yahoo-inc.com>
*/
/**
This utility validate the handlebars template file
*/
(function() {

    var fs = require('fs'),
        ContextParserHandlebars = require("./context-parser-handlebars.js"),
        noOfArgs = 0,
        file = '';

    process.argv.forEach(function (val, index) {
        ++noOfArgs;
        if (index === 2) {
            file = val;
        }
    });

    if (noOfArgs >= 2 && noOfArgs <= 3) {
        if (fs.existsSync(file)) {
            var data = fs.readFileSync(file, 'utf-8');
            var parser = new ContextParserHandlebars();
            parser._validateTemplate(data);
            console.log("[INFO] "+file+" validation done!");
            process.exit(0);
        } else {
            console.log("[ERROR] "+file+" not exist");
            process.exit(1);
        }
    } else {
        console.log("Usage: handlebars <Handlebars template file>");
        process.exit(1);
    }

}).call(this);
