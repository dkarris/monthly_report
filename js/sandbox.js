var tempArray = [];
var W2Records = new Array;
var x;
function processNodeTemp() {
    
}


/* Accepts node to process
    Child indicates if we append to children properties of an object or
    to main parent object
*/

function D3NestToGrid(node, arrayToAppend, recid) {
    // no node.values => root element recid = 1 else increment + 1
    if (!recid) {
        var recid = 1;
    } else {
        recid = Number(recid + String(1));
    }
    node.values.forEach(function (element, index, array) {
        var recordObject = {
            recid: recid,
            datapoint: element.key,
            act: element.actual,
            py: element.actualAtPY,
            vs_py_$: element.vs_PY_$,
            vs_py_pct: element.vs_PY_Pct_ops
        }
        arrayToAppend.push(recordObject);
        recid++;
        if (element.values) {
            arrayToAppend.last().w2ui = {children:[]};
            var newBranch = arrayToAppend.last().w2ui.children;
            //call with new parent and recid for that element in tree
            D3NestToGrid(element, newBranch, recid-1);
        }
    }, this);

}
// Roll up functions


function getLastItemKeys(node) {
    if (node.values) {
        return getLastItemKeys(node.values[0]);
    }
    else { return (Object.keys(node.value)); }
}



// unfortunately doesn't work: because platform level is empty so had to insert
// item[field] = ...

// function rollupRecursiveHelper(node, field) {
//     node[field] = node['values'].reduce(function (total, item) {
//         return total + (item['values'] ? rollupRecursiveHelper(item, field) : item.value[field]);
//     }, 0);
//     return node[field];
// }

function rollupRecursiveHelper(node, field) {
    node[field] = node['values'].reduce(function (total, item) {
        
        //can not use ternary because of item[field] - otherwiseneed two statements
        // return total + (item['values'] ? rollupRecursiveHelper(item, field) : item.value[field]);
        if (item['values']) {
            return total + rollupRecursiveHelper(item, field);
        }
        if (item['value']) {
            item[field] = item.value[field];
            return total+ item.value[field];
        }
    }, 0);
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
            node['vs_PY_Pct_ops'] = ((node['vs_PY_$'] / node['pyAtActual']) * 100 || 0).toFixed(1);
            node['vs_FBP_Pct'] = ((node['vs_FBP_$'] / node['fbp']) * 100 || 0).toFixed(1);
            node['vs_JU_Pct'] = ((node['vs_JU_$'] / node['ju']) * 100 || 0).toFixed(1);
            addHelperFieldsRecursive(node.values);
        } else {
            node.forEach(function (element) {
                element['vs_PY_$'] = ((element['actualAtPY'] - element['pyAtActual']).toFixed(0) || 0);
                element['vs_FBP_$'] = ((element['actualAtFBP'] - element['fbp']).toFixed(0) || 0);
                element['vs_JU_$'] = ((element['actualAtJU'] - element['ju']).toFixed(0) || 0);
                element['vs_PY_Pct_ops'] = ((element['vs_PY_$'] / element['pyAtActual']) * 100 || 0).toFixed(1);
                element['vs_FBP_Pct'] = ((element['vs_FBP_$'] / element['fbp']) * 100 || 0).toFixed(1);
                element['vs_JU_Pct'] = ((element['vs_JU_$'] / element['ju']) * 100 || 0).toFixed(1);
                //if (element.value) { addHelperFieldsRecursive(element) } else { addHelperFieldsRecursive(element.values) };
                addHelperFieldsRecursive(element.value);
            });
        }
    } else return undefined;
}

function rollupRecursive(node) {
    //launch roll up for each key
    //get the last element keys and create roll ups for each
    getLastItemKeys(node).forEach(function (key) {
        rollupRecursiveHelper(node, key);
    });
    rollupRecursiveHelper(node,'actual')
    //addHelperFieldsRecursive(node);
}







if (!Array.prototype.last) {
    Array.prototype.last = function () {
        return this[this.length-1];
    };
};


myTempArray = myTempArray.filter(function (element) {
    return element["mtd_qtd_ytd"] == "YTD";
})
var tempArray = d3.nest()
    .key(function (d) { return d.region; }) //.key(function (d) {return d.country;})
    .key(function (d) { return d.country; })
    .key(function (d) { return d.platformGlobalMapping })
    .rollup(function (v) {
        return {
                actual: d3.sum(v, function (d) { return d.actual; }),
                actualAtFBP: d3.sum(v, function (d) { return d.actualAtFBP; }),
                actualAtJU: d3.sum(v, function (d) { return d.actualAtJU; }),
                actualAtPY: d3.sum(v, function (d) { return d.actualAtPY; }),
                fbp: d3.sum(v, function (d) { return d.fbp; }),
                ju: d3.sum(v, function (d) { return d.ju; }),
                ju_decAtFbp17: d3.sum(v, function (d) { return d.ju_decAtFbp17; }),
                ju_sepAtFbp17: d3.sum(v, function (d) { return d.ju_sepAtFbp17; }),
                pyAtActual: d3.sum(v, function (d) { return d.pyAtActual; }),
                pyAtFbp16: d3.sum(v, function (d) { return d.pyAtFbp16; }),
                pyAtFbp17: d3.sum(v, function (d) { return d.pyAtFbp17; }),
                py_decAtFbp17: d3.sum(v, function (d) { return d.py_decAtFbp17; }),
                py_sepAtFbp17: d3.sum(v, function (d) { return d.py_sepAtFbp17; })
            }
        })
    .entries(myTempArray);
 tempArray = { 'values': tempArray, 'key': 'WW', 'level': 'WW' };
 
 rollupRecursive(tempArray);
 D3NestToGrid(tempArray,W2Records);



