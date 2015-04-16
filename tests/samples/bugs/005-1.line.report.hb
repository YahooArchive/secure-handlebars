{{! This template is tested for the char/line no reporting in the error message }}

{{#if wallartPapertypesEnabled}}
<div {{attr}} class="1wallart-options-bar">
{{else}}
<div {{attr}} class="2wallart-options-bar">
{{/if}}

{{#if wallartPapertypesEnabled}}
<div {{attr}} class="wallart-options-bar
{{#ifCond typeName '===' 'mounted'}} is-mounted{{/ifCond}}

" {{attr}}>
{{else}}
<div {{attr}} class="wallart-options-bar">
{{/if}}
