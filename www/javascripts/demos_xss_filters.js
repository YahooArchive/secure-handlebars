document.addEventListener("DOMContentLoaded", function(event) {
  // Init
  document.getElementById("userInput").focus();

  // Clear Btn
  var clearBtn = document.getElementById("clearBtn");
  clearBtn.addEventListener("click", function(event){
    document.getElementById("userInput").value = "";
    document.getElementById("output").innerHTML = "";
  });

  // ENTER logic
  var userInputBox = document.getElementById("userInput");
  userInputBox.addEventListener("keypress", function(event){
    if (event.which == 13) {
      var userInput = document.getElementById("userInput").value;
      console.log("[DEBUG] userInput:"+userInput);

      var testFilterFunctions = {
        'inHTMLData': 		xssFilters.inHTMLData(userInput),
        'inHTMLComment': 	'<!--'+xssFilters.inHTMLComment(userInput)+'-->',
        'inSingleQuotedAttr': 	"<div id='"+xssFilters.inSingleQuotedAttr(userInput)+"'>"+xssFilters.inHTMLData(userInput)+"</div>",
        'inDoubleQuotedAttr': 	'<div id="'+xssFilters.inDoubleQuotedAttr(userInput)+'">'+xssFilters.inHTMLData(userInput)+'</div>',
        'inUnQuotedAttr':     	'<div id='+xssFilters.inUnQuotedAttr(userInput)+'>'+xssFilters.inHTMLData(userInput)+'</div>',

        'uriInHTMLData':		xssFilters.uriInHTMLData(userInput),
        'uriInHTMLComment':       	'<!--'+xssFilters.uriInHTMLComment(userInput)+'-->',
        "uriInSingleQuotedAttr":	"<a href='"+xssFilters.uriInSingleQuotedAttr(userInput)+"'>"+xssFilters.uriInHTMLData(userInput)+"</a>",
        'uriInDoubleQuotedAttr':	'<a href="'+xssFilters.uriInDoubleQuotedAttr(userInput)+'">'+xssFilters.uriInHTMLData(userInput)+'</a>',
        'uriInUnQuotedAttr':		'<a href='+xssFilters.uriInUnQuotedAttr(userInput)+'>'+xssFilters.uriInHTMLData(userInput)+'</a>',

        'uriPathInHTMLData':		xssFilters.uriPathInHTMLData(userInput),
        'uriPathInHTMLComment':		'<!--'+xssFilters.uriPathInHTMLComment(userInput)+'-->',
        "uriPathInSingleQuotedAttr":	"<a href='"+xssFilters.uriPathInSingleQuotedAttr(userInput)+"'>"+xssFilters.uriPathInHTMLData(userInput)+"</a>",
        'uriPathInDoubleQuotedAttr':	'<a href="'+xssFilters.uriPathInDoubleQuotedAttr(userInput)+'">'+xssFilters.uriPathInHTMLData(userInput)+'</a>',
        'uriPathInUnQuotedAttr':	'<a href='+xssFilters.uriPathInUnQuotedAttr(userInput)+'>'+xssFilters.uriPathInHTMLData(userInput)+'</a>',

        'uriQueryInHTMLData':		xssFilters.uriQueryInHTMLData(userInput),
        'uriQueryInHTMLComment':	'<!--x?'+xssFilters.uriQueryInHTMLComment(userInput)+'-->',
        "uriQueryInSingleQuotedAttr":	"<a href='x?"+xssFilters.uriQueryInSingleQuotedAttr(userInput)+"'>"+xssFilters.uriQueryInHTMLData(userInput)+"</a>",
        'uriQueryInDoubleQuotedAttr': 	'<a href="x?'+xssFilters.uriQueryInDoubleQuotedAttr(userInput)+'">'+xssFilters.uriQueryInHTMLData(userInput)+'</a>',
        'uriQueryInUnQuotedAttr':     	'<a href=x?'+xssFilters.uriQueryInUnQuotedAttr(userInput)+'>'+xssFilters.uriQueryInHTMLData(userInput)+'</a>',

        'uriComponentInHTMLData':	 xssFilters.uriComponentInHTMLData(userInput),
        'uriComponentInHTMLComment':	 '<!--x?name='+xssFilters.uriComponentInHTMLComment(userInput)+'-->',
        "uriComponentInSingleQuotedAttr":"<a href='x?name="+xssFilters.uriComponentInSingleQuotedAttr(userInput)+"'>"+xssFilters.uriComponentInHTMLData(userInput)+"</a>",
        'uriComponentInDoubleQuotedAttr':'<a href="x?name='+xssFilters.uriComponentInDoubleQuotedAttr(userInput)+'">'+xssFilters.uriComponentInHTMLData(userInput)+'</a>',
        'uriComponentInUnQuotedAttr':	 '<a href=x?name='+xssFilters.uriComponentInUnQuotedAttr(userInput)+'>'+xssFilters.uriComponentInHTMLData(userInput)+'</a>',

        'uriFragmentInHTMLData':	xssFilters.uriFragmentInHTMLData(userInput),
        'uriFragmentInHTMLComment':	'<!--#'+xssFilters.uriFragmentInHTMLComment(userInput)+'-->',
        "uriFragmentInSingleQuotedAttr":"<a href='#"+xssFilters.uriFragmentInSingleQuotedAttr(userInput)+"'>"+xssFilters.uriFragmentInHTMLData(userInput)+"</a>",
        'uriFragmentInDoubleQuotedAttr':'<a href="#'+xssFilters.uriFragmentInDoubleQuotedAttr(userInput)+'">'+xssFilters.uriFragmentInHTMLData(userInput)+'</a>',
        'uriFragmentInUnQuotedAttr':	'<a href=#'+xssFilters.uriFragmentInUnQuotedAttr(userInput)+'>'+xssFilters.uriFragmentInHTMLData(userInput)+'</a>'
      };
      
      var output = '<h4>Filtering Result</h4>';
      output += '<table class="table table-bordered">';
      output += "<tbody>";
      output += "<tr><td>Applied filter</td><td>Filtered result</td></tr>";
      for (var f in testFilterFunctions) {
        if (testFilterFunctions.hasOwnProperty(f)) {
          output += "<tr>";
          output += "<td>"+f+"</td>";
          output += "<td>"+testFilterFunctions[f]+"</td>";
          output += "</tr>";
        }
      }
      output += "</tbody>";
      output += "</table>";
  
      document.getElementById('output').innerHTML = output;
    }
  });
});
