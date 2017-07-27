//  variables defined at global level

var parsedData = [];

var ViewModel = {
    self : this,
    parsedErrors: ko.observable(),
    parsedData: ko.observable()
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
    // also do a lenght - 1 : erase the last record => which triggers
    // while doing copying to new array rename headers because in excel there are spaces
    // so either redo excel or correct it here
    // second option better since don't change anything in the original and not  break links
    // to HFM
    console.log(result.data.length-2);
    for (var i=0; i<result.data.length-1;i++) {
        var currentRow = result.data[i];
        var parsedRow = {
            'mtd_qtd_ytd' : currentRow['MTD_QTD_YTD'],
            'country'     : currentRow['country'],
            'region'      : currentRow['region'],
            'month'       : currentRow['month'],
            'actual'      : currentRow['Actual'],
            'actual_Fbp'  : currentRow['Actual@FBP'],
            'actual_Ju'   : currentRow['Actual@JU'],
            'actual_Pyrate':currentRow['Actual@PYrate'],
            'fbp'         : currentRow['FBP'],
            'ju'          : currentRow['JU'],
            'ju_dec'      : currentRow['JU_DEC'],
            'ju_sep'      : currentRow['JU_Sep'],
            'py_actualFx' : currentRow['PY@Actual FX'],
            'py_fbp16'    : currentRow['PY@FBP16'],
            'py_fbp17'    : currentRow['PY@FBP17'],
            'py_dec'      : currentRow['py_dec']
        };
        parsedData.push(parsedRow);
    }
    ViewModel.parsedErrors(result.errors);
    ViewModel.parsedData(parsedData);
    console.log(parsedData);
}
function errorHandler (error,file) {
    alert (error);
    console.log(error);
}

