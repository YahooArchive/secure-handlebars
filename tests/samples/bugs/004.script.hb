{{!-- 
this test is being used for testing the <script>
tagNames has been set before entering the nested branching logic
--}}

{{#if}}
    <script>
    {{#if ../../embedrVTwo}}
        path1
    {{else}}
        path2
    {{/if}}
    </script>
{{else}}
path3
{{/if}}
