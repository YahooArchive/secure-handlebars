document.addEventListener("DOMContentLoaded", function(event) {

  var preProcessedTemplate = "";
  var templateInput = document.getElementById("templateInput");
  var jsonInput = document.getElementById("jsonInput");

  templateInput.focus();
  templateInput.value = "{{data}}";
  jsonInput.value = '{\n"data": "data"\n}\n';
  
  var preProcessTemplate = function() {
    try {
        var strictMode = document.getElementById("strictMode").checked;
        console.log("[INFO] Strict Mode?"+strictMode);
        var preProcessor = new Handlebars.ContextParserHandlebars({printCharEnable: false, strictMode: strictMode});
        preProcessedTemplate = preProcessor.analyzeContext(templateInput.value);
        document.getElementById("templateOutput").value = preProcessedTemplate;
        if (preProcessedTemplate !== "") {
          dataBinding();
        }
    } catch (err) {
        document.getElementById("templateOutput").value = err.msg;
    }
  };
  var dataBinding = function() {
      var template = Handlebars.compile(preProcessedTemplate);
      var jsonString = jsonInput.value;
      try {
          var data = JSON.parse(jsonString);
          document.getElementById("output").value = template(data);
      } catch (err) {
          document.getElementById("output").value = err;
      }
  };
  var processing = function(event){
    if (templateInput.value !== "") {
        preProcessTemplate();
    }
  };

  templateInput.addEventListener("blur", processing);
  jsonInput.addEventListener("blur", processing);
  preProcessTemplate();

});
