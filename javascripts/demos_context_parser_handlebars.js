document.addEventListener("DOMContentLoaded", function(event) {

  var preProcessedTemplate = "";
  var templateInput = document.getElementById("templateInput");
  var jsonInput = document.getElementById("jsonInput");

  templateInput.focus();
  templateInput.value = '<h1>{{title}}</h1>\n<a href="{{url}}">{{url}}</a>';
  jsonInput.value = '{\n  "title": "Demo\\n<script>alert(1)</script>",\n  "url": "javascript:alert(1)"\n}\n';
  
  function preProcessTemplate() {
    try {
        var strictMode = document.getElementById("strictMode").checked;
        console.log("[INFO] Strict Mode?"+strictMode);
        var preProcessor = new Handlebars.ContextParserHandlebars({printCharEnable: false, strictMode: strictMode});
        preProcessedTemplate = preProcessor.analyzeContext(templateInput.value);
        document.getElementById("templateOutput").value = preProcessedTemplate;
        return true;
    } catch (err) {
        document.getElementById("templateOutput").value = err.msg;
    }
  };
  function dataBinding() {
      var template = Handlebars.compile(preProcessedTemplate);
      var jsonString = jsonInput.value || '{}';
      try {
          var data = JSON.parse(jsonString);
          document.getElementById("output").value = template(data);
      } catch (err) {
          document.getElementById("output").value = 'JSON Format ' + err;
      }
  };

  function processTemplate() {
    preProcessTemplate() && dataBinding();
  }

  templateInput.addEventListener("blur", processTemplate);
  jsonInput.addEventListener("blur", processTemplate);
  processTemplate();

});
