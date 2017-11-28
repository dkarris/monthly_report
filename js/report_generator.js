//TODO - rewrite with KO.computed for filteredresults - eliminate calc button



//  variables defined at global level
// Constants to map platforms to global platforms
var platformMapping = {
  Hips : "Joints",
  Knees: "Joints",
  Trauma : "Trauma",
  Spine : "Spine",
  Shoulders: "Other",
  Mitek: "Sports",
  PT: "Other",
  CMF: "Other",
  Other : "Other"
}

//G9 country definition
var countryG9List=['Germany','France','Italy','Australia','New Zealand', 'Japan','Korea','US','UK'];

// global variable to store unique regions and platforms
// used to aggregate data when doing subtotals

var uniqueRegion;
var uniquePlatform;
var tempArray = []; // delete later
var tempArray2 = []; // delete later
var W2Records = [];


// VMMV model
var ViewModel = {
    this : self,
    parsedErrors: ko.observable(), // this one is for errors in parsed csv
    parsedData: ko.observableArray(), // stores all data set from csv
    parsedFilteredData : ko.observableArray(), // temporary subset filtered by criterias entered by user
    reportType: ko.observable(), // user defined: by region or by platform
    reportOptions: ko.observableArray(),  // for future use - contains region or platfrom array depending on reportTyope above
    reportPeriod: ko.observable(), //user defined: YTD/MTD/QTD
    breakByPlatform: ko.observable() // split by platform
    //parsedFilteredDataMapped : ko.mapping.fromJS(self.parsedFilteredData)
};

//Computed on change on report period, platfor/region, etc
ko.applyBindings(ViewModel);

// temp development
(function selfLaunch() {
//   $('#tempDivToDelete').hide()
//   ViewModel.parsedData(myTempArray);
// change array prototype to include last method
  if (!Array.prototype.last) {
      Array.prototype.last = function () {
          return this[this.length - 1];
      };
  };
  displayGrid();
 
}());

// subscribe to change in radio control

ViewModel.reportType.subscribe(function(value){
    //clearlist at first
    ViewModel.reportOptions.removeAll();
    if (value == "platform") {
    // do by platfrom
    // find unique ids and fill out  reportOptions
    // later make a separate function
        for (var x=0; x<ViewModel.parsedData().length; x++){
            var row = ViewModel.parsedData()[x];
            if (ViewModel.reportOptions().indexOf(row['platformGlobalMapping']) == -1) {
                ViewModel.reportOptions.push(row['platformGlobalMapping']);
            }
        }
        //store for future use
        
        // not needed as of now uniquePlatform = ViewModel.reportOptions();
    } else {
    // do by region
        for (var x=0; x<ViewModel.parsedData().length; x++){
            var row = ViewModel.parsedData()[x];
            if (ViewModel.reportOptions().indexOf(row['region']) == -1) {
                ViewModel.reportOptions.push(row['region']);
            }
        }
        // store for future use
        // not needed as of now uniqueRegion = ViewModel.reportOptions();
    }
});


// Roll up functions

function getLastItemKeys(node) {
  if (node.values) {
    return getLastItemKeys(node.values[0]);}
  else { return (Object.keys(node.value));}
}


function rollupRecursiveHelper(node,field) {
  node[field] = node ['values'].reduce(function(total,item) {
    //return total + (item['values']  ? rollupRecursiveHelper(item,field) : item.value[field]);
      if (item['values']) {
          return total + rollupRecursiveHelper(item, field);
      }
      if (item['value']) {
          item[field] = item.value[field];
          return total + item.value[field];
      }
},0);
  return node[field];
}


function addHelperFieldsRecursive(node) {
// add vs PY, vs JU, vs FBP calc fields.
  if (node) {
    //first handle ww case/ by platform  where there are no arrays and then all the rest
    if (!(node instanceof Array)) {
        node['vs_PY_$'] = ((node['actualAtPY'] - node['pyAtActual']).toFixed(0) || 0);
        node['vs_FBP_$'] = ((node['actualAtFBP'] - node['fbp']).toFixed(0) || 0);
        node['vs_JU_$'] = ((node['actualAtJU'] - node['ju']).toFixed(0) || 0);
        node['vs_PY_Pct_ops'] = ((node['vs_PY_$']/node['pyAtActual'])*100 || 0).toFixed(1);
        node['vs_FBP_Pct'] = ((node['vs_FBP_$']/node['fbp'])*100 || 0).toFixed(1);
        node['vs_JU_Pct'] = ((node['vs_JU_$']/node['ju'])*100 || 0).toFixed(1);
        addHelperFieldsRecursive(node.values);
      } else {
        node.forEach (function (element) {
        element['vs_PY_$'] = ((element['actualAtPY'] - element['pyAtActual']).toFixed(0) || 0);
        element['vs_FBP_$'] = ((element['actualAtFBP'] - element['fbp']).toFixed(0) || 0);
        element['vs_JU_$'] = ((element['actualAtJU'] - element['ju']).toFixed(0) || 0);
        element['vs_PY_Pct_ops'] = ((element['vs_PY_$']/element['pyAtActual'])*100 || 0).toFixed(1);
        element['vs_FBP_Pct'] = ((element['vs_FBP_$']/element['fbp'])*100 || 0).toFixed(1);
        element['vs_JU_Pct'] = ((element['vs_JU_$']/element['ju'])*100 || 0).toFixed(1);
        if (element.value) { addHelperFieldsRecursive(element.value) } else { addHelperFieldsRecursive(element.values)};
        });
    }
  } else return undefined;
}
     
function rollupRecursive(node) {
  //launch roll up for each key
  //get the last element keys and create roll ups for each
  getLastItemKeys(node).forEach(function(key) {
    rollupRecursiveHelper(node,key);
  });
  addHelperFieldsRecursive(node);
}

// roll up functions end

// function transformates D3 tree into multilevel W2UI grid

function recordToW2GridObject(element, recid) {
    return recordObject = {
        recid: recid,
        datapoint: element.key,
        act: element.actual,
        py: element.pyAtActual,
        vs_PY_$: element.vs_PY_$,
        vs_PY_PCT: element.vs_PY_Pct_ops,
        fbp: element.fbp,
        vs_FBP_$: element.vs_FBP_$,
        vs_FBP_PCT: element.vs_FBP_Pct,
        ju: element.ju,
        vs_JU_$: element.vs_JU_$,
        vs_JU_PCT: element.vs_JU_Pct
    }
}

function D3NestToGrid(node, arrayToAppend, recid) {
    
    // WW level is not an array - one exemption. So create manual object
    if (node.key == "WW") {
        arrayToAppend.push(recordToW2GridObject(node,0));
        // arrayToAppend.last().w2ui = { children: [] };
        // var newBranch = arrayToAppend.last().w2ui.children;
        // D3NestToGrid(node.values, newBranch, 1);
    }
    if (!recid) {
        var recid = 1;
    } else {
        recid = Number(recid + String(11));
    }
    node.values.forEach(function (element) {
        arrayToAppend.push(recordToW2GridObject(element, recid));
        recid++;
        if (element.values) {
            arrayToAppend.last().w2ui = { children: [] };
            var newBranch = arrayToAppend.last().w2ui.children;
            D3NestToGrid(element, newBranch, recid-1);
        }
    });
}


function createReportSource() {
    //var tempArray = [];
    
    
    // Clear filtered array
    ViewModel.parsedFilteredData().removeAll;
    var periodCriteria = ViewModel.reportPeriod();
   
   
    // Aplly MTD/QTD/YTD filter at first
    ViewModel.parsedFilteredData(ViewModel.parsedData().filter(function (element) {
        return element['mtd_qtd_ytd'] == periodCriteria;
    }));
  
  
    //parsedFilteredData has the basis to work on
    // next create roll up with d3. Use tempArray to simplify syntaxis for ViewModel.parsedfiltedarray....
    tempArray = d3.nest()
      .key(function (d){return d.region;}) //.key(function (d) {return d.country;})
      .key(function (d) {return d.country;})
      .key(function (d) {return d.platformGlobalMapping})
      .rollup(function(v) {return {
        actual: d3.sum(v, function(d) {return d.actual;}),
        actualAtFBP: d3.sum(v, function(d) {return d.actualAtFBP;}),
        actualAtJU: d3.sum(v, function(d) {return d.actualAtJU;}),
        actualAtPY: d3.sum(v, function(d) {return d.actualAtPY;}),
        fbp: d3.sum(v, function(d) {return d.fbp;}),
        ju: d3.sum(v, function(d) {return d.ju;}),
        ju_decAtFbp17: d3.sum(v, function(d) {return d.ju_decAtFbp17;}),
        ju_sepAtFbp17: d3.sum(v, function(d) {return d.ju_sepAtFbp17;}),
        pyAtActual: d3.sum(v, function(d) {return d.pyAtActual;}),
        pyAtFbp16: d3.sum(v, function(d) {return d.pyAtFbp16;}),
        pyAtFbp17: d3.sum(v, function(d) {return d.pyAtFbp17;}),
        py_decAtFbp17: d3.sum(v, function(d) {return d.py_decAtFbp17;}),
        py_sepAtFbp17: d3.sum(v, function(d) {return d.py_sepAtFbp17;})}})
        .entries(ViewModel.parsedFilteredData());
    
      tempArray = {'values':tempArray, 'key': 'WW','level':'WW'};
    
    // launch recursive function to do roll up on a non leaf nodes
    // Create subtotals by region or platform
    
      rollupRecursive(tempArray);

    // now need to convert nice tempArray list to format W2UI for data grid. W2Records is an array for W2 Grid
      D3NestToGrid(tempArray, W2Records);
      $('#grid').w2grid().records = W2Records;
      $('#grid').w2grid().refresh();
    // Now W2Records contains valid grid records. Changed w2ui grid object with new records.

}


// temp function to display grid.  For production move code to OnReady and bind data  to ko.observable
function displayGrid() {
        
    var gridData = {
        name: 'grid',
        columns: [
            {field: 'recid', caption: 'id', size: '0%'},
            {field: 'datapoint', caption:'', size: '7%'},
            {field: 'act', caption: 'ACT', size: '7%' },
            {field: 'py', caption: 'PY', size: '7%' },
            {field: 'vs_PY_$', caption: '$', size: '7%' },
            {field: 'vs_PY_PCT', caption: '%', size: '3%' },
            {field: 'fbp', caption: 'FBP', size: '10%' },
            {field: 'vs_FBP_$', caption: '$', size: '7%' },
            {field: 'vs_FBP_PCT', caption: '%', size: '3%' },
            {field: 'ju', caption: 'FBP', size: '10%' },
            {field: 'vs_JU_$', caption: '$', size: '7%' },
            {field: 'vs_JU_PCT', caption: '%', size: '3%' },
            {field: 'nu', caption: 'NU', size: '10%' },
            {field: 'vs_NU_$', caption: '$', size: '3%' },
            {field: 'vs_NU_PCT', caption: '%', size: '3%' }
        ],
        columnGroups: [
            {caption: '', span:3},
            {caption: 'PY', span: 3 },
            {caption: 'FBP', span: 3 },
            {caption: 'JU', span: 3 },
            {caption: 'NU', span: 3 },
        ]
    };
    $('#grid').w2grid(gridData);
}


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
}


function processJSON(result,file) {
    // also do a lenght - 1 : erase the last record => which triggers
    // while doing copying to new array rename headers because in excel there are spaces
    // so either redo excel or correct it here
    // second option better since don't change anything in the original and not  break links
    // to HFM
    
        
    //first of cleanse data of comma - replace with dot
    var parsedData = [];
    for (var i=0; i<result.data.length-1;i++) {
        var currentRow = result.data[i];
        var parsedRow = {
            'mtd_qtd_ytd' : currentRow['MTD_QTD_YTD'],
            'country'     : currentRow['country'],
            'region'      : currentRow['region'],
            'month'       : currentRow['month'],
            'platform'    : currentRow['platform'],
            'actual'      : (Number(String(currentRow['Actual']).replace(",",""))/1000).toFixed(2) || 0, // this replace "," for "" - as there were some cases of thousand
            'actualAtFBP' : (Number(String(currentRow['Actual@FBP']).replace(",","")) || 0), // next in NaN returns 0
            'actualAtJU'  : (Number(String(currentRow['Actual@JU']).replace(",","")) || 0),
            'actualAtPY'  : (Number(String(currentRow['Actual@PYrate']).replace(",","")) || 0),
            'fbp'         : (Number(String(currentRow['FBP']).replace(",","")) || 0),
            'ju'          : (Number(String(currentRow['JU']).replace(",","")) || 0),
            'ju_decAtFbp17': (Number(String(currentRow['JU_DEC@FBP17']).replace(",","")) || 0),
            'ju_sepAtFbp17': (Number(String(currentRow['JU_Sep']).replace(",","")) || 0),
            'pyAtActual'   : (Number(String(currentRow['PY@ActualFX']).replace(",","")) || 0),
            'pyAtFbp16'    : (Number(String(currentRow['PY@FBP16']).replace(",","")) || 0),
            'pyAtFbp17'    : (Number(String(currentRow['PY@FBP17']).replace(",","")) || 0),
            'py_decAtFbp17': (Number(String(currentRow['PY_DEC@FBP17']).replace(",","")) || 0),
            'py_sepAtFbp17': (Number(String(currentRow['PY_SEP@FBP17']).replace(",","")) || 0)
        };
        // next add some calculated fields for each object
        // parsedRow['vs_PY_$'] = ((parsedRow['actualAtPY'] - parsedRow['pyAtActual']).toFixed(0) || 0);
        // parsedRow['vs_PY_Pct_ops'] = (((parsedRow['vS_PY_$']/parsedRow['pyAtActual'])*100) || 0).toFixed(1); //if division by zero then put zero
        // parsedRow['vs_FBP_Pct'] = (((parsedRow['actualAtFBP']/parsedRow['fbp']-1)*100) || 0).toFixed(1);
        // parsedRow['vs_FBP_$'] = ((parsedRow['actualAtFBP']-parsedRow['fbp']).toFixed(0) || 0);
        // parsedRow['vs_JU_Pct'] = (((parsedRow['actualAtJU']/parsedRow['ju']-1)*100) || 0).toFixed(1);
        // parsedRow['vs_JU_$'] = ((parsedRow['actualAtJU'] - parsedRow['ju']).toFixed(0) || 0);
        
        // create a field for global platform mapping
        
        if (parsedRow['platform'] in platformMapping) {
           parsedRow.platformGlobalMapping = platformMapping[parsedRow['platform']]
        } else
        //if not then make that property as not mapped
        { parsedRow.platformGlobalMapping = "No mapping" }
        

        // Create G9 field
        var position = countryG9List.indexOf(parsedRow['country']);
        if (position == -1) {
            parsedRow.g9Country = "No"
        } else {
            parsedRow.g9Country = "Yes";
        }

        // Create unique ID and indexing fields

        parsedRow.id = i;
        parsedRow.index = parsedRow.region + parsedRow.platformGlobalMapping;
        parsedData.push(parsedRow);
      
    }
    ViewModel.parsedErrors(result.errors);
    ViewModel.parsedData(parsedData);
    $("#csv_load").dataTable();
}

function errorHandler (error,file) {
    alert (error);
    console.log(error);
}

