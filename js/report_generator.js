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
//var W2Records = [];


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
  $('#tempDivToDelete').hide()
  ViewModel.parsedData(myTempArray);
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
    var W2Records = [];
    
    // Clear filtered array
    ViewModel.parsedFilteredData().removeAll;
    var periodCriteria = ViewModel.reportPeriod();
   
   
    // Aplly MTD/QTD/YTD filter at first
    ViewModel.parsedFilteredData(ViewModel.parsedData().filter(function (element) {
        return element['mtd_qtd_ytd'] == periodCriteria;
    }));
  
    
    //parsedFilteredData has the basis to work on
    // next create roll up with d3. Use tempArray to simplify syntaxis for ViewModel.parsedfiltedarray....
    if (ViewModel.reportType() == 'region') {
        tempArray = d3.nest()
        .key(function (d){return d.region;})
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
        };
    if (ViewModel.reportType() == 'platform') {
        tempArray = d3.nest()
        .key(function (d) {return d.platformGlobalMapping;})
        .key(function (d) {return d.region;})
        .key(function (d) {return d.country;})
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
        }
    
    tempArray = {'values':tempArray, 'key': 'WW','level':'WW'};
    
    // launch recursive function to do roll up on a non leaf nodes
    // Create subtotals by region or platform
    
      rollupRecursive(tempArray);

    // now need to convert nice tempArray list to format W2UI for data grid. W2Records is an array for W2 Grid
      W2Records.length = 0; //clear to 
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
            'actualAtFBP' : (Number(String(currentRow['Actual@FBP']).replace(",",""))/1000).toFixed(2) || 0, // next in NaN returns 0
            'actualAtJU'  : (Number(String(currentRow['Actual@JU']).replace(",",""))/1000).toFixed(2) || 0,
            'actualAtPY'  : (Number(String(currentRow['Actual@PYrate']).replace(",",""))/1000).toFixed(2) || 0,
            'fbp'         : (Number(String(currentRow['FBP']).replace(",",""))/1000).toFixed(2) || 0,
            'ju'          : (Number(String(currentRow['JU']).replace(",",""))/1000).toFixed(2) || 0,
            'ju_decAtFbp17': (Number(String(currentRow['JU_DEC@FBP17']).replace(",",""))/1000).toFixed(2) || 0,
            'ju_sepAtFbp17': (Number(String(currentRow['JU_Sep']).replace(",",""))/1000).toFixed(2) || 0,
            'pyAtActual'   : (Number(String(currentRow['PY@ActualFX']).replace(",",""))/1000).toFixed(2) || 0,
            'pyAtFbp16'    : (Number(String(currentRow['PY@FBP16']).replace(",",""))/1000).toFixed(2) || 0,
            'pyAtFbp17'    : (Number(String(currentRow['PY@FBP17']).replace(",",""))/1000).toFixed(2) || 0,
            'py_decAtFbp17': (Number(String(currentRow['PY_DEC@FBP17']).replace(",",""))/1000).toFixed(2) || 0,
            'py_sepAtFbp17': (Number(String(currentRow['PY_SEP@FBP17']).replace(",",""))/1000).toFixed(2) || 0
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


// **************************************************/
// Numbers to text report functions go here
//
// **************************************************/

//Change String prototype to include format 
//https://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format

// "foo {0},{1}".format('bar1','bar2')
String.prototype.format = function (){
    var args = [];
    // now check each argument for "//,,//" occurence. If it is then it means caller passed concatenated 
    // array of parameters and we need to split it.
    // each argument must be string or array of strings
    Array.prototype.slice.call(arguments).forEach(function (element){
        if (element.indexOf('//,,//') > 0) {
            element.split('//,,//').forEach(function(substring) {args.push(substring);})
        }
        else {
            args.push(element);
        }
    });
    return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (curlyBrack, index) {
        return ((curlyBrack == "{{") ? "{" : ((curlyBrack == "}}") ? "}" : args[index]));
    });
};

function generateHeader(node){
// full D3 object - reads to level with WW and generates Summary header
    reportString = "Summary \n WW Sales for the {0} quarter of 2018 were {1}, which is an {2} of {3} or {4} vs {5}. "
     +"Excluding the impact of the Codman Neurosurgery (CNS) divestiture, WW Ortho growth was {6}. Adjusting for the negative" + 
     "impact of the CNS divestiture and the OUS selling days variance, WW growth was {7} \n."
// generate substitues for the string
    var quarter = 'second';
    var salesCY$ = node.actual;
    var salesPY$ = node.pyAtActual;
    var opsResult$ = salesCY$ - salesPY$;
    var opsResultText = opsResult$ <0 ? "operational decline" : "operational growth";
    var opsResultPCT = (((salesCY$/salesPY$-1)*100).toFixed(2))+"%";
    var quarterPY = "2Q17";
    return reportString.format(quarter,salesCY$.toFixed(2),opsResultText, opsResult$.toFixed(2),opsResultPCT,quarterPY); 
}

function generateReportByPlatform(platformNode) {
    
    // WW Trauma (+4.5%; +5.2% ADS) "driven" by
    var reportMainString = " * WW {0} ({1};{2}) {3} by";
    var platformName = platformNode.key;
    var platformCY$ = platformNode.actual;
    var platformPY$ = platformNode.pyAtActual;
    var platformOpsResult$ = platformCY$ - platformPY$;
    var platformOpsResultText = platformOpsResult$ < 0 ? " driven" : " driven"
    var platformOpsResultPCT = (((platformCY$/platformPY$-1)*100).toFixed(2))+"%";
    var platformADSResultPCT = "WW Platform ADS calc here"; //To do add ADS calc and change later to accomodate for str format
    reportMainString = reportMainString.format(platformName, platformOpsResult$.toFixed(2), platformADSResultPCT, platformOpsResultText);
    //Now execute report by region and concatenate the report mainstring
    
    var platformRegionReports = [];
    var platformGrowth = platformOpsResult$ < 0 ? false: true; 
    var platformObject = {}; //object to store platform parameters such us growth within certain areas/regions display order, etc.
    var regionsFactorsAll = '';
    var regionsFactorsAll = '';
    platformNode.values.forEach(function (region) {
        regionsFactorsAll = regionsFactorsAll + subReportPlatformRegion(platformName,region);
    });
    return reportMainString + regionsFactorsAll + '\n';
}

function subReportPlatformRegion(platformName,region) {
// called from generateReportByPlatform and ....
// returns summary by regions within defined platform
    var regionName = region.key;
    regionName = (regionName == 'US') ? "the US" : regionName;
    var regionCY$ = region.actual;
    var regionPY$ = region.pyAtActual;
    var regionOpsResult$ = regionCY$ - regionPY$;
    var regionOpsResultText = regionOpsResult$ < 0 ? "driven by" : "fueled by"
    var regionOpsResultPCT = (((regionCY$/regionPY$-1)*100).toFixed(2))+"%";
    var regionADSResultPCT = "Region ADS calc here"; //To do add ADS calc and change later to accomodate for str format
    var regionGrowth = regionOpsResult$ < 0 ? false : true;
    
    ///temp object for development. SHould be linked to excel in prod.

    var platformRegionFactor = {
        "Jointsthe US" : ["Joints  US factor1", "JointsUS factor2"],
        "JointsEMEA" : ["Joints EMEA factor 1"],
        "JointsASPAC" : ["Joints ASPAC factor1"],
        "JointsLATAM" : ["JointsLAtam factor1", "JointsLAtam factor2", "JointsLAtam factor3"]
    }

     
    //drill down by country
    
    // •	.... the U.S. (+3.8%; +3.8% ADS) fueled by market volume growth 
    // and continued strong sales of TFNA. ASPAC (+10.0.%; +12.3% ADS) growth was driven by China’s return to normal inventory, volume growth in MEA, 
    // and NPI sales in Japan. EMEA (+4.4%; +5.4% ADS) growth was the result of competitor account conversion in UK and Ireland. LATAM (+1.9%; +5.2% ADS) 
    // growth was driven by new government bid in Costa Rica. 
    
    var subReportPlatformRegionString = platformRegionFactor[(platformName+regionName)];
    
    
    var mergedPlatformRegionFactors = '';


    if (subReportPlatformRegionString) { //if exists key in factors then form factors string
    
        // if array > 1 this means that we have at least  2 factors and need to merge them with "and"
        // if not the last element then add factor text +','. 
        // if last item delete last ',' - slice(0,-1) also add "AND" + factor
        if (subReportPlatformRegionString.length>1) {
               subReportPlatformRegionString.forEach(function (factor, index, array){
                    (array.length - index == 1 ) ? mergedPlatformRegionFactors = mergedPlatformRegionFactors.slice(0,-1) + ' and '
                     + factor + '.' : mergedPlatformRegionFactors = mergedPlatformRegionFactors + ' ' + factor + ',';
        });
        } else if (subReportPlatformRegionString.length == 1) { 
            mergedPlatformRegionFactors =  subReportPlatformRegionString[0];
        } else {
            // do nothing if no region factor. Will return empty string
        };
    }    // create output string and return in
    var outputRegion = regionName + ' (' + regionOpsResultPCT + '; ' + regionADSResultPCT + ') ' + regionOpsResultText + ' ' + mergedPlatformRegionFactors + '.';
    return outputRegion;
}


// Markets:
// (the below market commentary excludes the impact of the Codman Neurosurgery divestiture impact)
// Q1 operational decline of - 1.9 % (excluding Codman) was driven by negative growth in the U.S.of - 2.4 % (-2.4 % ADS),
//  EMEA decline of - 2.4 % (-1.5 % ADS), LATAM - 4.3 % (-1.2 % ADS) and Canada of - 2.1 % (-0.5 % ADS), 
//partially offset by growth in ASPAC of + 2.0 % (+4.2 % ADS).  
function generateMarketsHeader(D3NestObject)
 {
    
    var marketsObject = D3NestObject; // create copy of object and work with it 
    var quarter = 'Q2';
    var salesCY$ = marketsObject.actual;
    var salesPY$ = marketsObject.pyAtActual;
    var opsResult$ = salesCY$ - salesPY$;
    var opsResultText = opsResult$ < 0 ? "operational decline" : "operational growth";
    var opsResultGrowth = opsResult$ <0 ? "negative growth in" : "positive growth in";
    var opsResultPCT = (((salesCY$ / salesPY$ - 1) * 100).toFixed(2)) + "%";
    var reportHeaderString = '{0} {1} of {2} (excluding Codman) was driven by {3} '.format(quarter,opsResultText,opsResultPCT, opsResultGrowth);
    
    // in the U.S.of - 2.4 % (-2.4 % ADS), EMEA decline of - 2.4 % (-1.5 % ADS), 
    // LATAM - 4.3 % (-1.2 % ADS) and Canada of - 2.1 % (-0.5 % ADS), 
    // partially offset by growth in ASPAC of + 2.0 % (+4.2 % ADS)

    // generate string based on opsResult
    // partyallyOffset flag true when need to add partially offset for the first time 
    var partiallyOffset = false; 
    var marketStrings = ''
    if (opsResult$ < 0 ) {
        marketsObject.values.sort(function (regionA, regionB) {
            return Number(regionA['vs_PY_$']) - Number(regionB['vs_PY_$'])
        });
        marketStrings = marketsObject.values.reduce(function (marketStrings, region) {
            var marketString = region.key + ' (' + region['vs_PY_Pct_ops'] + '%;(ADS will be here),';
            if (Number(region['vs_PY_Pct_ops'])>0 && !(partiallyOffset)) {
                marketString = 'partially offset by ' + marketString;
                partiallyOffset = true;
            };
            return marketStrings + marketString;
        },'');
    } else { // if ops growth ==0 still treat as positive otherwise need to build another logic
        marketsObject.values.sort(function (regionA, regionB) {
            return Number(regionB['vs_PY_$']) - Number(regionA['vs_PY_$']) 
        });
        marketStrings = marketsObject.values.reduce(function (marketStrings, region) {
            var marketString = region.key + ' (' + region['vs_PY_Pct_ops'] + '%;(ADS will be here),';
            if (Number(region['vs_PY_Pct_ops']) < 0 && !(partiallyOffset)) {
                marketString = 'partially offset by ' + marketString;
                partiallyOffset = true;
            };
            return marketStrings + marketString;
        }, '');
    }
    return reportHeaderString + marketStrings;
}


function generateMarketsUSPiece(USRegionNode) {
  //  U.S.decline of - 3.8 % was driven primarily by Spine(-10.8 %) and Knees(-7.1 %), 
  // partially offset by Trauma(+3.8 %) and Other Recon(+9.4 %).
  // There was no official U.S.selling day difference between 1Q18 and 1Q17.However, there was an impact to elective surgeries in 1Q18 
  // related to the timing of Easter / Good Friday and New Year's Day.  
  // We estimate the impact to be equivalent to 1 selling day, or $14.2MM. Excluding this holiday impact, U.S. decline would have been -2.8%.    
    var salesCY$ = USRegionNode.actual;
    var salesPY$ = USRegionNode.pyAtActual;
    var opsResult$ = salesCY$ - salesPY$;
    var opsResultPCT = (((salesCY$ / salesPY$ - 1) * 100).toFixed(2)) + "%";
    var opsResultGrowth = opsResult$ < 0 ? "decline of" : "growth of";
    var USreportString = 'U.S. {0} of {1} was driven primary by '.format(opsResultPCT, opsResultGrowth);
    
        
    var partiallyOffset = false;
    var platformStrings = '';
    if (opsResult$ < 0) {
        USRegionNode.values[0].values.sort(function (platformA, platformB) {
            return Number(platformA['vs_PY_$']) - Number(platformB['vs_PY_$']);
        });
        platformStrings = USRegionNode.values[0].values.reduce(function (platformStrings, platform) {
            var platformString = platform.key + ' (' + platform['vs_PY_Pct_ops'] + '%;(ADS will be here),';
            if (Number(platform['vs_PY_Pct_ops']) > 0 && !(partiallyOffset)) {
                platformString = 'partially offset by ' + platformString;
                partiallyOffset = true;
            };
            return platformStrings + platformString;
        }, '');
    } else { // if ops growth ==0 still treat as positive otherwise need to build another logic
        USRegionNode.values[0].values.sort(function (platformA, platformB) {
            return Number(platformB['vs_PY_$']) - Number(platformA['vs_PY_$']);
        });
        platformStrings = USRegionNode.values[0].values.reduce(function (platformStrings, platform) {
            var platformString = platform.key + ' (' + platform['vs_PY_Pct_ops'] + '%;(ADS will be here),';
            if (Number(platform['vs_PY_Pct_ops']) < 0 && !(partiallyOffset)) {
                platformString = 'partially offset by ' + platformString;
                partiallyOffset = true;
            };
            return platformStrings + platformString;
        }, '');
    }
    return USreportString + platformStrings + 'ADD US EVENTS HERE';
}

function generateMarketsOUSPiece(OUSRegionArray) {
   // From a total OUS standpoint, operational net trade sales decline of - 1.1 % (excluding Codman) 
   // was driven by Australia(-14.3 %) and UK(-12.7 %), partially offset by growth in China(+16.3 %).
   // Excluding the net impact of the selling days, operational growth was + 0.4 %.  
    
    var salesCY$ = OUSRegionArray.reduce(function (salesCY, region) {
        return salesCY + Number(region['actual']);        
    },0)
    var salesPY$ = OUSRegionArray.reduce(function (salesPY, region){
        return salesPY + Number(region['pyAtActual']);
    },0)

    var opsResult$ = salesCY$ - salesPY$;
    var opsResultPCT = (((salesCY$ / salesPY$ - 1) * 100).toFixed(2)) + "%";
    var opsResultGrowth = opsResult$ < 0 ? "decline of" : "growth of";
    var offsetType = opsResult$ < 0 ? "partially offset by growth in" : "partially offset by decline in";

    var OUSHeaderString = 'From a total OUS standpoint, operational net trade sales {0} of {1} (excluding Codman)\
    was driven by'.format(opsResultGrowth, opsResultPCT);

    var allCountries = []; //Combine all regions OUS to one array for sorting in the next steps:
    OUSRegionArray.forEach(function (region) {
        region.values.forEach(function (country) {
            allCountries.push(country);
        })
    })

    // sort All countries depending on whether we decline or grow and select bottow x + top countries for report
    
    if (opsResult$ < 0) {
        OUSRegionArray.sort(function (countryA, countryB) {
            return Number(countryA['vs_PY_$']) - Number(countryB['vs_PY_$']);
        })
    }   else {
        OUSRegionArray.sort(function (countryA, countryB) {
            return Number(countryB['vs_PY_$']) - Number(countryA['vs_PY_$']);
        })
    }

    const bottomCountriesN = topCountriesN = 3; 
    var bottomCountries = allCountries.slice(0,bottomCountriesN)
    var topCountries = allCountries.slice(-topCountriesN)
    var bottomCountriesString = bottomCountries.reduce(function (bottomCountriesString, country) {
        var countryString = country.key + ' (' + country['vs_PY_Pct_ops'] + '%),';
        return bottomCountriesString + countryString;        
    },'')
    var topCountriesString = topCountries.reduce(function (topCountriesString, country) {
        var countryString = country.key + ' (' + country['vs_PY_Pct_ops'] + '%),';
        return topCountriesString + countryString;
    }, '')

    OUSHeaderString = OUSHeaderString + bottomCountriesString +';partially ofset by ' + topCountriesString+'\n';

    // * UK(-$8.6MM; -12.7 %) was impacted negatively in Hips, Knees and Spine 
    // by continued NHS funding issues and budgetary constraints    

    var countryString = bottomCountries.reduce(function (countryString, country) {
        var countryParagraph = '* ' + country.key + ' (' + country['vs_PY_$'] + '); ' +
         country['vs_PY_Pct_ops'] +'%) was impacted ......INSERT REASON HERE....\n'
        return countryString + countryParagraph;
    },'')

    OUSHeaderString = OUSHeaderString + countryString;
    return OUSHeaderString;

}


// main function runs headers generation and concatenates each platfrom/region report by calling each element 
// within array.reduce()
function generateReportPlatform() {
    var totalPlatformReport = '';
    return (generateHeader(tempArray) + tempArray.values.reduce(function(totalPlatformReport, region){ 
        return totalPlatformReport + generateReportByPlatform(region);
    },''));
}

function generateReportMarket() {
    // var totalMarketReport = '';
    // Separate for US and OUS piece
    var OUSRegionArray = [];
    for (var x = 0; x<tempArray.values.length; x++) {
        if (tempArray.values[x].key == 'US') {
            var USNode = tempArray.values[x];
        } else {
            OUSRegionArray.push(tempArray.values[x]);
        }
    }

    // Run US and OUS pieces
    return generateMarketsHeader(tempArray) + generateMarketsUSPiece(USNode) + generateMarketsOUSPiece (OUSRegionArray);
}
