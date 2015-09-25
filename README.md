SecureHandlebars
===============================
*Automatically* applying context-sensitive output escaping to prevent XSS!

[![npm version][npm-badge]][npm]
[![dependency status][dep-badge]][dep-status]
[![Build Status](https://travis-ci.org/yahoo/secure-handlebars.svg?branch=master)](https://travis-ci.org/yahoo/secure-handlebars)

[npm]: https://www.npmjs.org/package/secure-handlebars
[npm-badge]: https://img.shields.io/npm/v/secure-handlebars.svg?style=flat-square
[dep-status]: https://david-dm.org/yahoo/secure-handlebars
[dep-badge]: https://img.shields.io/david/yahoo/secure-handlebars.svg?style=flat-square

## Introduction
*Check out the latest [slide deck](http://www.slideshare.net/adonatwork/efficient-contextsensitive-output-escaping-for-javascript-template-engines), presented in the OWASP AppSec USA 2015.*

Security is of utmost importance! 

Imagine a template is written like so: `<a href="{{url}}">{{url}}</a>`. When it is compiled with an untrusted user data like `{"url": "javascript:alert(666)"}`, secure-handlebars automatically applies contextual escaping and generates the HTML `<a href="x-javascript:alert(666)">javascript:alert(666)</a>` as a result. 

Clearly, the same `{{url}}` must be escaped according to different output contexts to prevent malicious script executions, which otherwise would be vulnerable if the original [Handlebars](http://handlebarsjs.com/) is used alone.

This is archived by enhancing the original Handlebars to perform the following steps:

![alt Visualizing the architecture of secure-handlebars](https://yahoo.github.io/secure-handlebars/assets/images/secure-handlebars.png)

- analyze templates to identify contexts of output expressions;
- insert contextual escaping filters to templates, of which the markup is compatible with Handlebars;
- register the filter implementations as Handlebars helpers, to be used during data binding.

<!--### Demonstration
Click [here](https://yahoo.github.io/secure-handlebars/demosSecureHandlebars.html) for a quick demo!-->

### Supported Contexts

| Context  | Examples  |
|---|---|
| HTML Data | `<div>{{output}}</div>` |
| HTML Comment | `<!-- {{output}} -->` |
| HTML Attribute Value <br>(unquoted, single-quoted and double-quoted) | `<a class={{output}}>` <br> `<div class='{{output}}'>` <br> `<div class="{{output}}">` |
| URI in Attribute Value <br>(unquoted, single-quoted and double-quoted) | `<a href={{output}}>` <br> `<a href='{{output}}'>` <br> `<a href="{{output}}">` |
| CSS in Attribute Value <br>(unquoted, single-quoted and double-quoted) | `<div style="color:{{output}}">` <br> `<div style="backgrount:url({{output}})">` |
It is generally a bad idea to place an `{{expression}}` inside those scriptable contexts (e.g., `<script>{{script}}</script>` or `<div onclick="{{onclick}}"`). Check out the [Section of Warnings and Workarounds](#warnings-and-workarounds) for resolutions.

## Quick Start

### Server-side Use for Express w/Handlebars
We highly recommend using the [express-secure-handlebars npm](https://www.npmjs.com/package/express-secure-handlebars) for a streamlined experience of template pre-processing, compilating, context-sensitive output escaping, and data binding.

### Client-side Use
Automatically apply Contextual XSS Escaping for Handlebars templates on client-side
```html
<!-- Disable <script src="dist/handlebars.min.js"></script> -->
<script src="dist/secure-handlebars.min.js"></script>

<script>
// given data stores a handlebars template as string
var html = '<a href="{{url}}">{{url}}</a>',
    data = {url: 'javascript:alert(666)'};

// Compile the template and apply data binding w/automatic contextual escaping
// the resulted html is '<a href="x-javascript:alert(666)">javascript:alert(666)</a>'
var html = Handlebars.compile(html)(data);
</script>
```

### Advanced Usage for Pre-processing Templates Only
You can perform offline pre-processing for your templates using the provided CLI utility, which rewrites the templates to insert contextual output escaping filter markups. Fully compatible with the original Handlebars, the rewritten templates can be further compiled and data-binded with [secure-handlebars-helpers](https://www.npmjs.com/package/secure-handlebars-helpers).

To achieve this, install the [secure-handlebars npm](https://www.npmjs.com/package/secure-handlebars) globally, so it can be used in any project.
```sh
npm install secure-handlebars -g
```

Given a handlebars template file named `sample.hbs` like so:
```html
<!doctype html>
<html><title>{{title}}</title></html>
```

Get the template with contextual escaping filters inserted:
```sh
handlebarspp sample.hbs > sample.shbs
```

The pre-processed template file `sample.shbs` that is fully-compatible with the original ([runtime](http://builds.handlebarsjs.com.s3.amazonaws.com/handlebars.min-latest.js)) Handlebars:
```html
<!doctype html>
<html><title>{{{yd title}}}</title></html>
```
These rewritten templates can then go through the standard Handlebars pre-compilation process, and be used with [secure-handlebars-helpers](https://www.npmjs.com/package/secure-handlebars-helpers) during runtime compilation.
On the other hand, this utility also faciilates statistics collection. For instance, you can write a simple script to count the number of dangerous contexts (such as `<script>{{script}}</script>`).

## Development

### How to test
```sh
npm test
```
## Known Limitations & Issues
- Templates MUST be in UTF-8 encoding and using HTML 5 doctype (i.e., `<!doctype html>`).
- There is no support to the JavaScript contexts and `<style>` tags yet. See the [section](#warnings-and-workarounds) below for details.
- Our approach involves only static analysis on the template files, and thus data dynamically binded through raw output expressions that may alter the execution context on the rendered HTML CANNOT be taken into account.
- We now assume that `{{>partial}}` and `{{{{rawblock}}}}` are always placed in the HTML Data context, and that they will result in the same Data context after data binding (hence, in-state and out-state are both of the data context). 

### Warnings and Workarounds
When output expressions are found inside dangerous (yet-to-be-supported) contexts, we echo warnings and gracefully fallback to apply the default Handlebars [`escapeExpression()`](http://handlebarsjs.com/#html-escaping). These warnings are indications of potential security exploits, and thus require closer inspections. Instead of simply abusing `{{{raw_expression}}}` to suppress the warnings, here are some alternative suggestions to secure your applications.
- [WARNING] SecureHandlebars: Unsafe output expression found at scriptable `<script>` tag

 ```html
<!-- Rewrite <script>var strJS = {{strJS}};</script> as: -->
<input type="hidden" id="strJS" value="{{strJS}}">
<script>var strJS = document.getElementById('strJS').value;</script>
```
- [WARNING] SecureHandlebars: Unsafe output expression found at onclick JavaScript event attribute
 
 - *Case 1.* the data is trusted, or will not be used as URI/HTML output

   ```html
<!-- Rewrite <div onclick="hello({{name}})"> as: -->
<div onclick="hello(this.getAttribute('data-name'))" data-name="{{name}}">
```

 - *Case 2A.* the data will be used as URI/HTML output<br/>The contextual analyzer does not (cannot) evaluate your JavaScript code, and thus lacks the information on which contexts the data will be ultimately used. Therefore, you must manually apply the escaping filters including `uriData` (a patched `encodeURI()`), `uriComponentData` (alias of `encodeURIComponent()`), and the [xss-filters](https://github.com/yahoo/xss-filters#the-api) that are already registered as Handlebars helpers.
   ```html
<script>
function search(url, keyword) {
          var xhr = new XMLHttpRequest(); xhr.open('GET', url, true); // ...
          document.getElementById('status').innerHTML = 'Searching for ' + keyword;
}
</script>
<!-- Rewrite <div onclick="search('/query?q={{keyword}}&lang=us', '{{keyword}}')"> as: -->
<div onclick="search(this.getAttribute('data-url'), this.getAttribute('data-keyword'))"
             data-url="/query?q={{uriComponentData keyword}}&lang=us"
             data-keyword="{{inHTMLData keyword}}">
```
   The manually-applied filters here are to pre-escape `{{keyword}}` depending on the ultimate output contexts, while the `{{` `}}` is still needed (**NOT** `{{{ }}}`) to let `secure-handlebars` automatically applies the escaping filter for the immediate attribute value context.
   
 - *Case 2B.* Alternatively, just in case the output pre-escaping is what you want to avoid, please embed the [xss-filters](https://github.com/yahoo/xss-filters/#client-side-browser) on the client-side for filtering.
   ```html
<script src="dist/xss-filters.min.js"></script>
<script>
function search(keyword) {
          // ...
          document.getElementById('status').innerHTML = 'Searching for ' + xssFilters.inHTMLData(keyword);
}
</script>
<div onclick="search(this.getAttribute('data-keyword'))" data-keyword="{{keyword}}">
```

   


## License

This software is free to use under the BSD license.
See the [LICENSE file](./LICENSE) for license text and copyright information.
