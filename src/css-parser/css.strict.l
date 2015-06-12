/*
Copyright (c) 2015, Yahoo Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.

Authors: Nera Liu <neraliu@yahoo-inc.com, neraliu@gmail.com>

Lexical definition of CSS 3 specification

Reference:
- http://www.w3.org/TR/2011/REC-CSS2-20110607/syndata.html
- http://www.w3.org/TR/2011/REC-CSS2-20110607/grammar.html
- http://www.w3.org/TR/css3-syntax/

*/

h		[0-9a-fA-F]						/* add A-Z for case-insensitive */
digit           [0-9]
nonascii	[\240-\377]
unicode		\\{h}{1,6}(\r\n|[ \t\r\n\f])?
/* TODO: the <unicode-range-token pattern has been changed in CSS 3.0 */
unicoderange	[0-9a-fA-F?]{1,6}(\-[0-9a-fA-F]{1,6})?			
escape		{unicode}|\\[^\r\n\f0-9a-fA-F]				/* add A-Z for case-insensitive */
// nmstart	[_a-zA-Z]|{nonascii}|{escape}				/* add A-Z for case-insensitive */
nmstart		[_a-zA-Z]                                               /* Strict CSS Parser: remove the {nonascii} and {escape} lexical definition */
// nmchar	[_a-zA-Z0-9\-]|{nonascii}|{escape}			/* add A-Z for case-insensitive, escape - */
nmchar		[_a-zA-Z0-9\-]                                          /* Strict CSS Parser: remove the {nonascii} and {escape} lexical definition */

// Reference: http://unicode.org/charts/PDF/U0000.pdf
// Basic ASCII (\u20-\u7E): <space>!"#$%&'\(\)\*+,\-\.\/0-9:;<=>?@A-Z\[\\\]^_`a-z\{\|\}~

/* Strict CSS Parser: support only visible basic ascii chars, and remove \\{nl} and {escape} */
// string1      \"([^\n\r\f\\"]|\\{nl}|{escape})*\"
string1         \"([ !#$%&'\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*\"
// string2	\'([^\n\r\f\\']|\\{nl}|{escape})*\'
string2         \'([ !#$%&"\(\)\*+,\-\.\/:;<=>\?@\[\\\]^_`\{\|\}~]|[a-zA-Z0-9])*\'

badstring1      \"([^\n\r\f\\"]|\\{nl}|{escape})*\\?
badstring2      \'([^\n\r\f\\']|\\{nl}|{escape})*\\?
badcomment1     \/\*[^*]*\*+([^/*][^*]*\*+)*
badcomment2     \/\*[^*]*(\*+[^/*][^*]*)*
baduri1         [uU][rR][lL]\({w}([!#$%&*-\[\]-~]|{nonascii}|{escape})*{w}	
baduri2         [uU][rR][lL]\({w}{string}{w}					
baduri3         [uU][rR][lL]\({w}{badstring}					
comment		\/\*[^*]*\*+([^/*][^*]*\*+)*\/
ident		[\-]?{nmstart}{nmchar}* 					
vendor          [\-_]{h}"-"{h}
name		{nmchar}+
num             [0-9]+(\.[0-9]+)?([eE][+\-][0-9])?|"."[0-9]+([eE][+\-][0-9])?
string		{string1}|{string2}
badstring       {badstring1}|{badstring2}
badcomment      {badcomment1}|{badcomment2}
baduri          {baduri1}|{baduri2}|{baduri3}
/* TODO: the <url-token> pattern has been changed in CSS 3.0 */

// Reference: http://www.rfc-base.org/txt/rfc-3986.txt
/* Strict CSS Parser: remove the {nonascii} and {escape} lexical definition */
// url		([!#$%&*-~]|{nonascii}|{escape})*
url		([a-zA-Z0-9]|[:\/\?#\[\]@]|[!$&'\*+,;=]|[%]|[\-\._~])*

s		[ \t\r\n\f]+
w		{s}?
nl		\n|\r\n|\r|\f

A               "A"|"a"|\\"0"{0,4}("41"|"61")(\r\n|[ \t\r\n\f])?
C               "C"|"c"|\\"0"{0,4}("43"|"63")(\r\n|[ \t\r\n\f])?
D               "D"|"d"|\\"0"{0,4}("44"|"64")(\r\n|[ \t\r\n\f])?
E               "E"|"e"|\\"0"{0,4}("45"|"65")(\r\n|[ \t\r\n\f])?
G               "G"|"g"|\\"0"{0,4}("47"|"67")(\r\n|[ \t\r\n\f])?|\\[g]
H               "H"|"h"|\\"0"{0,4}("48"|"68")(\r\n|[ \t\r\n\f])?|\\[h]
I               "I"|"i"|\\"0"{0,4}("49"|"69")(\r\n|[ \t\r\n\f])?|\\[i]
K               "K"|"k"|\\"0"{0,4}("4b"|"6b")(\r\n|[ \t\r\n\f])?|\\[k]
L               "L"|"l"|\\"0"{0,4}("4c"|"6c")(\r\n|[ \t\r\n\f])?|\\[l]
M               "M"|"m"|\\"0"{0,4}("4d"|"6d")(\r\n|[ \t\r\n\f])?|\\[m]
N               "N"|"n"|\\"0"{0,4}("4e"|"6e")(\r\n|[ \t\r\n\f])?|\\[n]
O               "O"|"o"|\\"0"{0,4}("4f"|"6f")(\r\n|[ \t\r\n\f])?|\\[o]
P               "P"|"p"|\\"0"{0,4}("50"|"70")(\r\n|[ \t\r\n\f])?|\\[p]
R               "R"|"r"|\\"0"{0,4}("52"|"72")(\r\n|[ \t\r\n\f])?|\\[r]
S               "S"|"s"|\\"0"{0,4}("53"|"73")(\r\n|[ \t\r\n\f])?|\\[s]
T               "T"|"t"|\\"0"{0,4}("54"|"74")(\r\n|[ \t\r\n\f])?|\\[t]
U               "U"|"u"|\\"0"{0,4}("55"|"75")(\r\n|[ \t\r\n\f])?|\\[u]
X               "X"|"x"|\\"0"{0,4}("58"|"78")(\r\n|[ \t\r\n\f])?|\\[x]
Z               "Z"|"z"|\\"0"{0,4}("5a"|"7a")(\r\n|[ \t\r\n\f])?|\\[z]

%%

{s}			{return 'S';}

\/\*[^*]*\*+([^/*][^*]*\*+)*\/				{} /* ignore comments */
{badcomment}                         			{} /* unclosed comment at EOF */

"<!--"			{return 'CDO';}
"-->"			{return 'CDC';}
"~="			{return 'INCLUDES';}
"|="			{return 'DASHMATCH';}
"^="                    {return 'PREFIXMATCH';}                         /* newly defined in CSS 3 */
"$="                    {return 'SUFFIXMATCH';}                         /* newly defined in CSS 3 */
"*="                    {return 'SUBSTRINGMATCH';}                      /* newly defined in CSS 3 */
"||"          		{return 'COLUMN';}				/* newly defined in CSS 3 */

{string}		{return 'STRING';}
{badstring}             {return 'BAD_STRING';}

[uU][rR][lL]"("{w}{string}{w}")" {return 'URI';}
[uU][rR][lL]"("{w}{url}{w}")"    {return 'URI';}
{baduri}                {return 'BAD_URI';}

"!"({w}|{comment})*{I}{M}{P}{O}{R}{T}{A}{N}{T}		                {return 'IMPORTANT_SYM';}

// TODO: add @namespace
"@"{I}{M}{P}{O}{R}{T}	{return 'IMPORT_SYM';}
"@"{P}{A}{G}{E}		{return 'PAGE_SYM';}
"@"{M}{E}{D}{I}{A}	{return 'MEDIA_SYM';}
"@charset "		{return 'CHARSET_SYM';}

{U}"+"{unicoderange}    {return 'UNICODERANGE';}        /* NOTE: should be placed above {ident}, otherwise pattern with '-[0-9a-z]{1,6}' cannot be matched, the more specific 

"only"                  {return 'MEDIA_TYPE_PREFIX';}
"not"                   {return 'MEDIA_TYPE_PREFIX';}
"and"                   {return 'MEDIA_TYPE_AND';}

{ident}"("		{return 'FUNCTION';}
{ident}			{return 'IDENT';}
{vendor}                {return 'VENDOR';}
"@"{ident}		{return 'ATKEYWORD';}				

"#"{name}		{return 'HASH';}

{num}{E}{M}		{return 'EMS';}					
{num}{E}{X}		{return 'EXS';}					
{num}{P}{X}		{return 'LENGTH';}				
{num}{C}{M}		{return 'LENGTH';}				
{num}{M}{M}		{return 'LENGTH';}				
{num}{I}{N}		{return 'LENGTH';} 				
{num}{P}{T}		{return 'LENGTH';} 				
{num}{P}{C}		{return 'LENGTH';} 				
{num}{D}{E}{G}		{return 'ANGLE';} 				
{num}{R}{A}{D}		{return 'ANGLE';} 				
{num}{G}{R}{A}{D}	{return 'ANGLE';}				
{num}{M}{S}		{return 'TIME';} 				
{num}{S}		{return 'TIME';} 				
{num}{H}{Z}		{return 'FREQ';} 				
{num}{K}{H}{Z}		{return 'FREQ';} 				

{num}"%"		{return 'PERCENTAGE';}
{num}			{return 'NUMBER';}

{num}{ident}		{return 'DIMENSION';}

/* TODO: the following patterns have not been added
{ident}/\\          return IDENT;
#{name}/\\          return HASH;
@{ident}/\\         return ATKEYWORD;
#/\\                return DELIM;
@/\\                return DELIM;
@/-                 return DELIM;
@/-\\               return DELIM;
-/\\                return DELIM;
-/-                 return DELIM;
\</!                return DELIM;
\</!-               return DELIM;
{num}{ident}/\\     return DIMENSION;
{num}/\\            return NUMBER;
{num}/-             return NUMBER;
{num}/-\\           return NUMBER;
[0-9]+/\.           return NUMBER;
u/\+                return IDENT;
u\+[0-9a-f?]{1,6}/- return UNICODE_RANGE;
*/

.			{return yytext; /* 'DELIM'; */}			/* the spec defines anything else as 'DELIM' */
