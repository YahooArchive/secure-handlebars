{{!-- 
this test is being used for testing the state 34/42 inconsitent after branching 
--}}

<input type="text" name="ccYear" id="credit-card-expire-year" maxlength="4" class="short {{#if check_cc}}may-have-errors{{/if}}" autocomplete="billing cc-exp-year" required {{#if order_data.orderLocked}}disabled="disabled"{{else}}min="2014" max="{{max_expiry_year}}" placeholder="YYYY" {{/if}} />
