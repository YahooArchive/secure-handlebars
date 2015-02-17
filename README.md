Handlebars Context Pre-compiler
===============================

Handlebars Pre-compiler with Context Parser. This npm package provides a handy command line utility to pre-process the Handlebars template by adding customized filters based on the context analysis of the HTML5 pages without affecting the exisiting framework of using Handlebars for their web applications.

## Overview 

- This pre-compiler processes the Handlebars template file by analyzing the execution context of output markup of the Handlebars based on the WHATWG HTML5 Specification. With the knowledge of the execution context, our pre-compiler can add the correct output filters to the Handlebars template file to defense XSS automatically.

## Quick Start

Install the npm context-parser-handlebars from the npm repo.
```
npm install context-parser-handlebars
```

### Server-side (command line)

Prepare a simple handlebars template file.
```
cat <handlebars template file>
<html><title>{{title}}</title></html>
```

Run the handlebars template file with our Handlebars Pre-compiler and context filter is added.
```
./bin/handlebarspc <handlebars template file>
<html><title>{{{yd title}}}</title></html>
```

The new pre-compiled template file is compatible with vanilla Handlebars and those can be used in the vanilla Handlebars with our new <a href="https://github.com/yahoo/secure-handlebars-helpers">secure-handlebars-helpers</a> in the client side!

Note: the default 'h' filter in Handlebars is disable with raw {{{expression}}}.

### Server-side (nodejs)

Analyze the execution context of HTML 5 web page in server side.
```
/* create the context parser */
var ContextParserHandlebars = require("context-parser-handlebars");
var parser = new ContextParserHandlebars();

/* read the html web page */
var data = '<html><title>{{title}}</title></html>';

/* analyze the execution context */
try {
    parser.contextualize(data);
    /* the output is the new handlebars template file with context filter added! 
       var output = '<html><title>{{{yd title}}}</title></html>';
    */
    var output = parser.getBuffer().join('');
} catch (err) {
    ...
}
...
```

## Development

### How to build
```
npm install
grunt
```

### How to test
```
grunt test
```

## Build

[![Build Status](https://travis-ci.org/yahoo/context-parser-handlebars.svg?branch=master)](https://travis-ci.org/yahoo/context-parser-handlebars)

### Limitations

- Our approach is the static analysis of the template file in which dynamic data affecting the execution context of the HTML5 page cannot be handled by our pre-compiler.
- We handle HTML specification only, we don't support Javascript and CSS context right now!
- We assume that the in state and out state of partial is DATA state now!

## License

This software is free to use under the BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: ./LICENSE
