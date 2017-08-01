//  variables defined at global level

var parsedData = [];

var ViewModel = {
    self : this,
    parsedErrors: ko.observable(),
    parsedData: ko.observable(),
    reportType: ko.observable(),
    reportOptions: ko.observableArray()
};
ko.applyBindings(ViewModel);

// subscribe to change in radio control
ViewModel.reportType.subscribe(function(value){
    //clearlist at first
    ViewModel.reportOptions.removeAll();
    if (value == "platform") {
    // do by platfrom
    // find unique ids and fill out  reportOptions
    // later make a separate function
        for (var x=0; x<parsedData.length; x++){
            var row = parsedData[x];
            if (ViewModel.reportOptions().indexOf(row['platform']) == -1) {
                ViewModel.reportOptions().push(row['platform']);
            }
        }
    } else {
    // do by region
        for (var x=0; x<parsedData.length; x++){
            var row = parsedData[x];
            if (ViewModel.reportOptions().indexOf(row['region']) == -1) {
                ViewModel.reportOptions().push(row['region']);
            }
        }
    }
    console.log(value);
    console.log(ViewModel.reportOptions());
});

// is called by EventHandler from button
// with id = "csv_input"
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
    
    // debug block
    // console.log(result.data.length-2);
    // console.log('initial row:')
    // console.log(result.data[0]);
     for (var i=0; i<result.data.length-1;i++) {
        var currentRow = result.data[i];
        var parsedRow = {
            'mtd_qtd_ytd' : currentRow['MTD_QTD_YTD'],
            'country'     : currentRow['country'],
            'region'      : currentRow['region'],
            'month'       : currentRow['month'],
            'platform'    : currentRow['platform'],
            'actual'      : currentRow['Actual'],
            'actual_Fbp'  : currentRow['Actual@FBP'],
            'actual_Ju'   : currentRow['Actual@JU'],
            'actual_Pyrate':currentRow['Actual@PYrate'],
            'fbp'         : currentRow['FBP'],
            'ju'          : currentRow['JU'],
            'ju_dec'      : currentRow['JU_DEC'],
            'ju_sep'      : currentRow['JU_Sep'],
            'py_actualFx' : currentRow['PY@ActualFX'],
            'py_fbp16'    : currentRow['PY@FBP16'],
            'py_fbp17'    : currentRow['PY@FBP17'],
            'py_dec'      : currentRow['PY_DEC']
        };
        parsedData.push(parsedRow);
    }
    ViewModel.parsedErrors(result.errors);
    ViewModel.parsedData(parsedData);
}
function errorHandler (error,file) {
    alert (error);
    console.log(error);
}

// borrowed from SO. Returns distinct records.
function array_unique(array) {
    var unique = [];
    for ( var i = 0 ; i < array.length ; ++i ) {
        if ( unique.indexOf(array[i]) == -1 )
            unique.push(array[i]);
    }
    return unique;
}