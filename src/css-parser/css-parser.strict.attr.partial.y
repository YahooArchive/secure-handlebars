/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com, neraliu@gmail.com>

Reference:
- http://www.w3.org/TR/2011/REC-CSS2-20110607/syndata.html
- http://www.w3.org/TR/2011/REC-CSS2-20110607/grammar.html
- http://www.w3.org/TR/css-style-attr/
*/

%start style_attribute

%%

/* style_attribute -> S* declaration? [ ';' S* declaration? ]* */
style_attribute
  : space_or_empty declarations declaration_list
    %{
      $$ = [];
      var r = $$;
      $2 !== null? $$.push($2) : '';
      $3 !== null? $3.forEach(function(e) { r.push(e); }) : ''

      /* this is used for capturing the empty declaration */
      if ($$.length === 0) $$.push({ type: -1, key: '', value: '' });
      return $$;
    %}
  ;

/* declarations -> [ property ':' S* expr prio? ]? */
declarations
  : property ':' space_or_empty expr prio
    %{
      $$ = {};
      $$.key = $1;

      $$.type = -1;
      var l = $4.length;
      l>0? $$.value = $4[l-1].value : '';

      /* TODO: we can refine the following logic by revising the grammar with 
         START_STRING and START_URI pattern (either unquoted,single or double quoted),
         however, I prefer of not having too much change in the grammar with the 
         original one to save the effort of maintenance
      */

      /* if the last expr is BAD_URI, then we test for the following pattern */
      if ($4[l-1].type !== undefined && $4[l-1].type === 'BAD_URI') {
        $4[l-1].value.match(/^(url\([\s]*)$/i)? $$.type = 1 : '';

      /* if the last expr is BAD_STRING pattern, then we test
         (1) the string is ended with single/double quote, then it is 5/6.
         (2) the second last expr is BAD_URI, then if it is ended with single/double quote, then it is 2/3.
         if the last expr is SPACE_EMPTY pattern, then it is 4
      */
      } else if ($4[l-1].type !== undefined && ($4[l-1].type === 'BAD_STRING' || $4[l-1].type === 'SPACE_EMPTY')) {
        $4[l-1].value === ''? $$.type = 4 : '';
        $4[l-1].value.match(/^'[\s]*$/)? $$.type = 5 : '';
        $4[l-1].value.match(/^"[\s]*$/)? $$.type = 6 : '';

        if ($4[l-2] !== undefined && $4[l-2].type !== undefined && $4[l-2].type === 'BAD_URI') {
          $4[l-1].value.match(/^'[\s]*$/)? $$.type = 2 : '';
          $4[l-1].value.match(/^"[\s]*$/)? $$.type = 3 : '';
          $$.value = $4[l-2].value + $$.value;
        }

      /* if it is end with semicolon, keep it intact */
      } else if ($4[l-1].type !== undefined && $4[l-1].type === -2) {

      /* if the last expr is VALID pattern, then we test
         (1) the string is ended with at least one space.
         (2) look ahead one expr and see whether it is BAD_URI, if yes, it is ERROR.
      */
      } else {
        $4[l-1].value.match(/[\s]+$/)?  $$.type = 4 : '';

        if ($4[l-2] !== undefined && $4[l-2].type !== undefined && $4[l-2].type === 'BAD_URI') {
          $$.type = -1; /* always bad */
          $$.value = $4[l-2].value + $$.value;
        }
      }

      $5 !== null? $$.value += ' ' + $5 : '';
    %}
  | -> null
  ;

/* declaration_list -> [ ';' S* declaration? ]* */
declaration_list
  : ';' space_or_empty declarations
    %{
      $$ = [];
      /* capture the semicolon */
      $$.push({ type: -2, key: '', value: ';' });
      if ($3 !== null) $$.push($3);
    %}
  | declaration_list ';' space_or_empty declarations
    %{
      $$ = [];
      $$ = $1;
      /* capture the semicolon */
      $$.push({ type: -2, key: '', value: ';' });
      if ($4 !== null) $$.push($4);
    %}
  | -> null
  ;

/* property -> IDENT S* */
property
  : IDENT space_or_empty 	-> $1
  ;

/* expr -> term [ operator? term ]* */
expr
  : term term_list
    %{
      $$ = [];
      $$.push($1);
      var r = $$;
      $2 !== null? $2.forEach(function(e) { r.push(e) }) : '';
    %}
  ;

term_list
  : term
    %{
      $$ = [];
      $$.push($1);
    %}
  | operator term
    %{
      $$ = [];
      $$.push($2);
    %}
  | term_list term
    %{
      $$ = [];
      $1 !== null? $$ = $1 : '';
      $$.push($2);
    %}
  | term_list operator term
    %{
      $$ = [];
      $1 !== null? $$ = $1 : '';
      $$.push($3);
    %}
  | -> null
  ;

/*
term
  : unary_operator?
    [ NUMBER S* | PERCENTAGE S* | LENGTH S* | EMS S* | EXS S* | ANGLE S* |
      TIME S* | FREQ S* ]
  | STRING S* | IDENT S* | URI S* | hexcolor | function
  ;
*/
term
  : numeric_term 			-> $1
  | unary_operator numeric_term
    %{
      $$ = $2;
      $$.value = $1 + $2.value;
    %}
  | string_term				-> $1
  | bad_term                            -> $1
  ;
numeric_term
  : NUMBER space_or_empty      	-> { value: $1 + $2 }
  | PERCENTAGE space_or_empty	-> { value: $1 + $2 }
  | LENGTH space_or_empty	-> { value: $1 + $2 }
  | EMS space_or_empty	        -> { value: $1 + $2 }
  | EXS space_or_empty	        -> { value: $1 + $2 }
  | ANGLE space_or_empty	-> { value: $1 + $2 }
  | TIME space_or_empty	        -> { value: $1 + $2 }
  | FREQ space_or_empty	        -> { value: $1 + $2 }
  ;
string_term
  : STRING space_or_empty 	-> { value: $1 + $2 }
  | IDENT space_or_empty	-> { value: $1 + $2 }
  | URI space_or_empty		-> { value: $1 + $2 }
  | hexcolor space_or_empty	-> { value: $1 + $2 }
  | function space_or_empty	-> { value: $1 + $2 }
  ;
bad_term
  : BAD_STRING space_or_empty   -> { value: $1 + $2, type: 'BAD_STRING' }
  | BAD_URI space_or_empty      -> { value: $1 + $2, type: 'BAD_URI'    }
  | space_or_empty              -> { value: $1, type: 'SPACE_EMPTY' }
  ;

/* prio -> IMPORTANT_SYM S* */
prio
  : IMPORTANT_SYM space_or_empty	-> $1 + $2
  | -> null
  ;

/* function -> FUNCTION S* expr ')' S* */
function
  : FUNCTION space_or_empty expr ')' space_or_empty -> { value: $1 + $2 + $3 + $4 + $5 }
  ;

/*
* There is a constraint on the color that it must
* have either 3 or 6 hex-digits (i.e., [0-9a-fA-F])
* after the "#"; e.g., "#000" is OK, but "#abcd" is not.
* hexcolor -> HASH S*
*/
hexcolor
  : HASH space_or_empty 	-> $1
  ;

/* S+ */
at_least_one_space
  : S                           -> " "
  | at_least_one_space S        -> " "
  ;

/* S* */
space_or_empty
  : at_least_one_space 		-> $1
  | -> ""
  ;

/* unary_operator -> '-' | '+' */
unary_operator
  : '+' 			-> $1
  | '-'				-> $1
  ;

/* operator -> '/' S* | ',' S* */
operator
  : '/' space_or_empty		-> $1
  | ',' space_or_empty 		-> $1
  ;
