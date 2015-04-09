SecureHandlebars
===============================
SecureHandlebars is to **automatically** conduct HTML 5 context analysis on Handlebars templates, and apply context-dependent XSS filtering to output expressions.

## Quick Start

### Client-side Use

Analyze the HTML contexts of Handlebars templates on client-side
```html
<!-- Disable the original handlebars-->
<!--script src="dist/handlebars.min.js"></script-->

<script src="dist/secure-handlebars.min.js"></script>
<script>
// given data stores a handlebars template as string
var html = '<html><title>{{title}}</title></html>',
	data = {title: 'Hello'};

// analyze the HTML contexts, and return a handlebars template with context-sensitive helpers added! 
var template = Handlebars.compile(html);
// i.e., output is '<html><title>Hello</title></html>';
alert(template(data));
// ...
</script>
```

### Server-side Use (Template PreCompilation using a CLI utility)

We recommend using the [express-secure-handlebars npm](https://www.npmjs.com/package/express-secure-handlebars) for most use cases.

Install the [secure-handlebars npm](https://www.npmjs.com/package/secure-handlebars) globally, so it can be used in any project.
```sh
npm install secure-handlebars -g
```

Given a handlebars template file named `sample.hbs` like so:
```html
<html><title>{{title}}</title></html>
```

Preprocess the template:
```sh
$ handlebarspc sample.hbs > sample.shbs
```

Precompile using the handlebars precompiler (for details, refer to the [original precompiler](https://github.com/wycats/handlebars.js#precompiling-templates)):
```sh
$ handlebars sample.shbs
```

The resulted pre-compiled template file is fully-compatible with the [original Handlebars runtime](http://builds.handlebarsjs.com.s3.amazonaws.com/handlebars.runtime.min-latest.js). See [secure-handlebars-helpers](https://www.npmjs.com/package/secure-handlebars-helpers) on how to register the corresponding helpers on the client-side for context-sensitive filtering.

Note: the default [context-insensitive HTML escaping](http://handlebarsjs.com/#html-escaping) by Handlebars is disabled with the raw {{{expression}}} to prevent redundant escaping.

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
