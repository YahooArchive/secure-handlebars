{{#if wallartPapertypesEnabled}}
<div {{attr}} class="1wallart-options-bar">
{{else}}
<div {{attr}} class="2wallart-options-bar">
{{/if}}

{{#if wallartPapertypesEnabled}}
<div {{attr}} style="wallart-options-bar
{{#ifCond typeName '===' 'mounted'}} {{style}} is-mounted{{/ifCond}}
" {{attr}}>
{{else}}
<div {{attr}} class="wallart-options-bar">
{{/if}}
