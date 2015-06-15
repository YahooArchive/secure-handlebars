SecureHandlebars
===============================
*Automatically* applying context-sensitive XSS output filtering to prevent XSS!

[![npm version][npm-badge]][npm]
[![dependency status][dep-badge]][dep-status]

[npm]: https://www.npmjs.org/package/secure-handlebars
[npm-badge]: https://img.shields.io/npm/v/secure-handlebars.svg?style=flat-square
[dep-status]: https://david-dm.org/yahoo/secure-handlebars
[dep-badge]: https://img.shields.io/david/yahoo/secure-handlebars.svg?style=flat-square

## Introduction
The original [Handlebars](http://handlebarsjs.com/) is overriden to perform the following major steps:

- *Template Pre-processor* executes static contextual analysis on a handlebars template, of which every output expression is applied with some context-dependent [helper markups](http://handlebarsjs.com/#helpers) (e.g., `<h1>{{title}}</h1>` is rewritten into `<h1>{{{yd title}}}</h1>`<sup>^</sup>). The pre-processed template is compatible with the original (runtime) Handlebars.
- The original Handlebars template engine compiles the pre-processed template.
- *Context-sensitive XSS filters* are registered as Handlebars helpers, so that any untrusted user inputs assigned to those pre-processed output expressions can be escaped with respect to the output context during data binding.

<sup>^</sup> The default [context-insensitive HTML escaping](http://handlebarsjs.com/#html-escaping) by Handlebars is disabled with the raw {{{expression}}} to avoid redundant escaping.

## Quick Start

### Client-side Use

Analyze the HTML contexts of Handlebars templates on client-side
```html
<!-- Disable the original handlebars -->
<!--script src="dist/handlebars.min.js"></script-->
<script src="dist/secure-handlebars.min.js"></script>

<script>
// given data stores a handlebars template as string
var html = '<html><title>{{title}}</title></html>',
    data = {title: 'Hello'};

// analyze the HTML contexts, and return a handlebars template with context-sensitive helpers added
var template = Handlebars.compile(html);
// html is '<html><title>Hello</title></html>'
var html = template(data);
// inserts the html to the DOM
// ...
</script>
```

### Server-side Use (Express/Node.js)
We highly recommend using the [express-secure-handlebars npm](https://www.npmjs.com/package/express-secure-handlebars) for a streamlined experience of template pre-processing, compilating, context-sensitive output escaping, and data binding.

### Advanced Server-side Use (Standalone Template Pre-processor)
Here's deeper dive into using the standalone template pre-processor to insert context-dependent helper markups. 

Install the [secure-handlebars npm](https://www.npmjs.com/package/secure-handlebars) globally, so it can be used in any project.
```sh
npm install secure-handlebars -g
```

Given a handlebars template file named `sample.hbs` like so:
```html
<!doctype html>
<html><title>{{title}}</title></html>
```

Pre-process the template:
```sh
handlebarspp sample.hbs > sample.shbs
```

The pre-processed template file `sample.shbs` that is fully-compatible with the original ([runtime](http://builds.handlebarsjs.com.s3.amazonaws.com/handlebars.runtime.min-latest.js)) Handlebars:
```html
<!doctype html>
<html><title>{{{yd title}}}</title></html>
```

You may then come up with some statistics such as counting the number of dangerous/unhandled contexts (such as `<script>{{script}}</script>`) that deserve more intensive inspections and perhaps workarounds. And in case you would like to work on these pre-processed templates for further Handlebars (pre-)compilations without using the [express-secure-handlebars npm](https://www.npmjs.com/package/express-secure-handlebars), be reminded to register the [secure-handlebars-helpers](https://www.npmjs.com/package/secure-handlebars-helpers) to apply context-sensitive output filtering accordingly.

## Development

### How to test
```sh
npm test
```

### Build

[![Build Status](https://travis-ci.org/yahoo/secure-handlebars.svg?branch=master)](https://travis-ci.org/yahoo/secure-handlebars)

### Known Limitations & Issues
- Templates MUST be in UTF-8 encoding and using HTML 5 doctype (i.e., <!doctype html>).
- We handle the HTML contextual analysis right now, and provide no support to the JavaScript yet. For CSS context, we support output expression at style attribute value ONLY.
- Our approach involves only static analysis on the template files, and thus data dynamically binded through raw output expressions that may alter the execution context on the rendered HTML CANNOT be taken into account.
- We now assume that {{>partial}} and {{{{rawblock}}}} is always placed in the HTML Data context, and by itself will result in the same Data context after its binding (hence, in-state and out-state are both of the data context). 

## License

This software is free to use under the BSD license.
See the [LICENSE file](./LICENSE) for license text and copyright information.
