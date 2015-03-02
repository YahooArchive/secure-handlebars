Handlebars Context Pre-compiler
===============================
This pre-compiler is to **automatically** conduct HTML 5 context analysis on Handlebars templates, and insert markup of XSS filtering helpers to output expressions based on their surrounding contexts. 

The resulted templates can then be further processed with the [vanilla Handlebars template engine](http://handlebarsjs.com). With the [context-sensitive helpers](https://www.npmjs.com/package/secure-handlebars-helpers) properly registered at runtime, the context-sensitive escaping will effectively defend against XSS attacks.

## Quick Start

### Server-side (as a CLI utility)

Install the [context-parser-handlebars npm](https://www.npmjs.com/package/context-parser-handlebars) globally, so it can be used in any project.
```sh
npm install context-parser-handlebars -g
```

Given a handlebars template file like so:
```html
<html><title>{{title}}</title></html>
```

Run through the handlebars template file with our Handlebars Context Pre-compiler, and you can see that context-sensitive helpers are added to output expressions like so:
```sh
$ handlebarspc <handlebars template file>
<html><title>{{{yd title}}}</title></html>
```

The resulted pre-compiled template file is fully-compatible with the vanilla Handlebars. See [secure-handlebars-helpers](https://www.npmjs.com/package/secure-handlebars-helpers) on how to register the corresponding helpers on the client-side for context-sensitive filtering.

Note: the default [context-insensitive HTML escaping](http://handlebarsjs.com/#html-escaping) by Handlebars is disabled with the raw {{{expression}}} to prevent redundant escaping.

### Server-side (as a Node.js library)

Analyze the HTML contexts of Handlebars templates on server-side.
```javascript
// create the precompiler
var ContextParserPreCompiler = require("context-parser-handlebars");
var preCompiler = new ContextParserPreCompiler();

// given data stores a handlebars template as string
var data = '<html><title>{{title}}</title></html>';

try {
    // analyze the HTML contexts
    preCompiler.contextualize(data);
    // return a processed handlebars template with context-sensitive helpers added! 
    // i.e., output is '<html><title>{{{yd title}}}</title></html>';
    var output = preCompiler.getOutput();
    // ...
} catch (err) {
    // ...
}
// ...
```

## Development

### How to test
```sh
npm test
```

### Build

[![Build Status](https://travis-ci.org/yahoo/context-parser-handlebars.svg?branch=master)](https://travis-ci.org/yahoo/context-parser-handlebars)

### Known Limitations

- Our approach involves only static analysis on the template files, and thus dynamic raw data that may alter the execution context on the rendered HTML will NOT be taken into account.
- We handle the HTML specification only, and provide no support to the JavaScript and CSS contexts right now.
- We now assume that {{>partial}} is always placed in the HTML Data context, and by itself will result in the same Data context after its binding (hence, in-state and out-state are both of data context). 

## License

This software is free to use under the BSD license.
See the [LICENSE file](./LICENSE) for license text and copyright information.
