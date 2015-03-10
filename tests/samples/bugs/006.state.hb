{{#if wallartPapertypesEnabled}}
<div {{attr}} style="wallart-options-bar
{{#ifCond typeName '===' 'mounted'}} {{styleoutput}} is-mounted{{/ifCond}}
" {{attr}}>
{{else}}
<div {{attr}} class="wallart-options-bar">
{{/if}}

{{#if wallartPapertypesEnabled}}
<div {{attr}} class="wallart-options-bar
{{#ifCond typeName '===' 'mounted'}} {{classoutput}} is-mounted{{/ifCond}}
" {{attr}}>
{{else}}
<div {{attr}} class="wallart-options-bar">
{{/if}}
