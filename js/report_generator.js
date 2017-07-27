//  variables defined at global level


var ViewModel = {
    self : this,
    parsedJson: ko.observable(),
    // convertRecords: ko.computed(function() {
    //      return this.parsedJson.data
    // },this)
};
ko.applyBindings(ViewModel);
function parseCsv() {
// get file name from DOM
    var file = $('#csv_input')[0].files[0];
// Setup config for Papa.parse
    var config = {
    delimiter: "",  // auto-detect
    newline: "",    // auto-detect
    quoteChar: '"',
    header: true,
    dynamicTyping: true,
    preview: 0,
    encoding: "",
    worker: false,
    comments: false,
    step: undefined,
    complete : processJSON,
    error : errorHandler,
    download: false,
    skipEmptyLines: false,
    chunk: undefined,
    fastMode: undefined,
    beforeFirstChunk: undefined,
    withCredentials: undefined
    };
    Papa.parse(file, config);
};
function processJSON(result,file) {
    ViewModel.parsedJson(result);
    x = result;
    console.log(x);
}
function errorHandler (error,file) {
    alert (error);
    console.log(error);
}
ViewModel.convertErrors = ko.computed(function() {
    return ViewModel.parsedJson().data
    })

