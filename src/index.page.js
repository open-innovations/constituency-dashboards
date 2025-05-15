import { fetchAll, fetchIt } from "./assets/js/fetch.js"

const DEV = Deno.env.get("DEV");

function slugifyString (str) {
	return String(str)
	  .normalize('NFKD') // split accented characters into their base characters and diacritical marks
	  .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
	  .trim() // trim leading or trailing whitespace
	  .toLowerCase() // convert to lowercase
	  .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
	  .replace(/\s+/g, '-') // replace spaces with hyphens
	  .replace(/-+/g, '-'); // remove consecutive hyphens
}

// Convert to sRGB colorspace
// https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
function sRGBToLinear(v){
	v /= 255;
	if (v <= 0.03928) return v/12.92;
	else return Math.pow((v+0.055)/1.055,2.4);
}
function h2d(h) {return parseInt(h,16);}
// https://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
function relativeLuminance(rgb){ return 0.2126 * sRGBToLinear(rgb[0]) + 0.7152 * sRGBToLinear(rgb[1]) + 0.0722 * sRGBToLinear(rgb[2]); }
// https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html#contrast-ratiodef
function contrastRatio(a, b){
	var L1 = relativeLuminance(a);
	var L2 = relativeLuminance(b);
	if(L1 < L2){
		var temp = L2;
		L2 = L1;
		L1 = temp;
	}
	return (L1 + 0.05) / (L2 + 0.05);
}	
function contrastColour(c){
	var rgb = [];
	if(c.indexOf('#')==0){
		rgb = [h2d(c.substring(1,3)),h2d(c.substring(3,5)),h2d(c.substring(5,7))];
	}else if(c.indexOf('rgb')==0){
		var bits = c.match(/[0-9\.]+/g);
		if(bits.length == 4) this.alpha = parseFloat(bits[3]);
		rgb = [parseInt(bits[0]),parseInt(bits[1]),parseInt(bits[2])];
	}
	var cols = {
		"black": [0, 0, 0],
		"white": [255, 255, 255],
	};
	var maxRatio = 0;
	var contrast = "white";
	for(var col in cols){
		var contr = contrastRatio(rgb, cols[col]);
		if(contr > maxRatio){
			maxRatio = contr;
			contrast = col;
		}
	}
	if(maxRatio < 4.5){
		console.warn('Text contrast poor ('+maxRatio.toFixed(1)+') for %c'+c+'%c','background:'+c+';color:'+contrast,'background:none;color:inherit;');
	}else if(maxRatio < 7){
		//console.warn('Text contrast good ('+maxRatio.toFixed(1)+') for %c'+c+'%c','background:'+c+';color:'+contrast,'background:none;color:inherit;');
	}
	return contrast;
}

function axisType2(arr){
	let type = "";
	let yearlike = 0;
	let numberlike = 0;
	let labels = new Array(arr.length);
	// Check if this looks like a year-based visualisation
	for (let i = 0 ; i < arr.length ; i++) {
		if(looksLikeDate(arr[i].label)){
			labels[i] = decimalYear(arr[i].label);
			yearlike++;
		}else{
			if(looksLikeDate(arr[i].value)){
				labels[i] = decimalYear(arr[i].value);
				yearlike++;
			}else{
				let v = parseFloat(arr[i].value);
				if(!isNaN(v)){
					labels[i] = v;
					numberlike++;
				}else{
					let v = parseFloat(arr[i].value);
					if(!isNaN(v)){
						labels[i] = v;
						numberlike++;
					}else{
						labels[i] = arr[i].label||arr[i].value;
					}
				}
			}
		}
	}
	if(yearlike==arr.length && yearlike > 0) type = "year";
	else{
		if(numberlike==arr.length && numberlike > 0) type = "number";
		if(numberlike==0 && arr.length > 0) type = "category";
	}
	return {'type':type,'values':labels};
}

function axisType(arr){
	let yearlike = 0;
	let numberlike = 0;
	// Check if this looks like a year-based visualisation
	for (let i = 0 ; i < arr.length ; i++) {
		if(looksLikeDate(arr[i].label.label)){
			arr[i].label = arr[i].label.label;
			yearlike++;
		}else{
			if(looksLikeDate(arr[i].label.value)){
				arr[i].label = arr[i].label.value;
				yearlike++;
			}else{
				if(!isNaN(parseFloat(arr[i].label.label))){
					arr[i].label = arr[i].label.label;
					numberlike++;
				}else{
					if(!isNaN(parseFloat(arr[i].label.value))){
						arr[i].label = arr[i].label.value;
						numberlike++;
					}
				}
			}
		}
	}
	if(yearlike==arr.length && yearlike > 0) return "year";
	if(numberlike==arr.length && numberlike > 0) return "number";
	if(numberlike==0 && arr.length > 0) return "category";
	return "";
}

function looksLikeDate(d){
	if(typeof d==="number") d = d + "";
	return d.match(/^[0-9]{4}-?([0-9]{2})?-?([0-9]{2})?$/);
}

function decimalYear(date){
	let match = date.match(/^([0-9]{4})-?([0-9]{2})?-?([0-9]{2})?$/);
	let y,m,d,sy,ey;
	if(!match) return 0;
	y = parseInt(match[1]);
	m = parseInt(match[2]);
	d = parseInt(match[3]);

	if(isNaN(y)) return 0;
	if(isNaN(m)) return y;
	if(isNaN(d)) d = 1;

	let p1 = new Date();
	p1.setUTCFullYear(y);
	p1.setUTCMonth(m-1);
	p1.setUTCDate(d);
	p1.setUTCHours(0);
	p1.setUTCMinutes(0);
	p1.setUTCSeconds(0);

	// Set start of year
	sy = new Date(p1);
	sy.setUTCMonth(0);
	sy.setUTCDate(1);
	sy.setUTCHours(0);
	sy.setUTCMinutes(0);
	sy.setUTCSeconds(0);

	// Start of next year
	ey = new Date(sy);
	ey.setUTCFullYear(sy.getUTCFullYear()+1);
	return sy.getUTCFullYear() + (p1-sy)/(ey-sy);
}

function updateDictionary(dict, keys, newKey, newValue) {
	let current = dict;
	
	// Traverse or create nested structure
	for (let i = 0; i < keys.length; i++) {
		let key = keys[i];
		
		if (!current.hasOwnProperty(key)) {
			current[key] = {}; // Create a nested dictionary if it doesn't exist
		}
		
		current = current[key]; // Move deeper into the structure
	}
	
	// Assign the final key-value pair
	current[newKey] = newValue;
}

export default async function* () {
	// Get the index of all API data.
	let index = await fetchIt("https://constituencies.open-innovations.org/themes/index.json");
	if (index == null) {
		console.error("Failed to get index.");
		return;
	}
	let dashboard = {};
	// Looping over each theme
	for (const [theme, themeData] of Object.entries(index.themes)) {
		console.log("Theme: "+theme);
		// Looping through the visualisations (which have URL, title, attribution)
		for (const v of themeData.visualisations) {
			// Adding a URL for the individual page
			v.slug = "/" + slugifyString(theme) + "/" + slugifyString(v.title) + "/";
			// Add the JSON data for that visualisation
			v.json = await fetchIt(v.url);
		}
		// console.log("\tBuild theme page");
		// // Now yield each theme page.
		// yield {
		//	 url: `/${slugifyString(theme)}/`,
		//	 title: themeData.title,
		//	 layout: 'template/themePage.vto',
		//	 tags: 'themes',
		//	 // This gets used in the themePage.vto to create a list of visualisations using themeData.visualisations[].slug
		//	 themeData,
		//	 theme
		// };

		// Loop through each vis and create its page.
		// As we're looping through the visualisations, we want to store the vis data per constituency and then eventually yield a page for each one.
		for (const vis of themeData.visualisations) {
			console.log('\tProcessing '+vis.title);
			const rows = [];
			// Only build the page if there is json content
			if (vis.json != null) {

				const pcons = Object.keys(vis.json.data.constituencies);

				// Calculate some things just for the first constituency

				const PCON24CD = pcons[0];
				const constituencyData = vis.json.data.constituencies[PCON24CD];
				const titleKey = vis.json.title;
				const url = vis.json.url;
				const axis = axisType2(vis.json.values);
				let units = new Array(axis.values.length);
				let opts = {};
				let xaxis = {grid:{show:false},ticks:[]};
				let s = Infinity,e = -Infinity;
				// Create some options for Lume to work out what to show
				if (vis.json.values.length > 3) {
					opts['type'] = 'line';
				} else if (vis.json.values.length > 1) {
					opts['showSubtitle'] = true;
				}

				// Loop over slider values
				for(let i = 0 ; i < vis.json.values.length ; i++){
					const newKey = vis.json.values[i].label;
					let unit = "units" in vis.json && newKey in vis.json.units ? vis.json.units[newKey] : {};
					let scale = unit.scaleBy;
					// Set some pre/post-fixes based on specific units
					if (unit.category == 'currency' && unit.value=='GBP'){ 
						unit.pre = '&pound;';
					} else if (unit.value=='percent') {
						unit.post = '%';
					} else if (unit.value=='Mb/s') {
						unit.post = ' Mb/s';
					}
					if(typeof scale==="number") unit['scaleBy'] = scale;
					units[i] = unit;
				}
				// If we have a year or number axis we'll make ticks
				if(axis.type=="year" || axis.type=="number"){
					for(let i = 0; i < axis.values.length; i++){
						s = Math.min(s,axis.values[i]);
						e = Math.max(e,axis.values[i]);
					}
					let gap = 1;
					let r = Math.abs(e-s);
					if(r > 4) gap = 2;
					if(r > 11) gap = 5;
					if(r > 28) gap = 10;
					for(let y = gap*Math.floor(s/gap) ; y < e; y += gap){
						if((y > s || y==0) && y < e) xaxis.ticks.push({"value":y,"label":Math.round(y)+"","tickSize": 5,"grid":false});
					}
				}

				for(let p = 0; p < pcons.length; p++){
					const PCON24CD = pcons[p];
					const constituencyData = vis.json.data.constituencies[pcons[p]];
					
					// Create variables/constants
					let dataArray = [];
					let yrange = {'min':Infinity,'max':-Infinity};
					
					let nonzero = 0;
					// Iterate through the different "values" in the data
					for(let i = 0 ; i < vis.json.values.length ; i++){
						const newKey = vis.json.values[i].label;
						let unit = units[i];
						let val = constituencyData[vis.json.values[i].value];
						// If the value is a number, apply the scale if it exists, or multiply by 1.
						if (typeof(val)=='number') val *= (unit.scaleBy || 1);
						yrange.min = Math.min(yrange.min,val);
						yrange.max = Math.max(yrange.max,val);
						let x = (axis.type=="year" || axis.type=="number") ? axis.values[i] : i;
						if(val != 0) nonzero++;
						// Create a new dictionary with all the info we need to generate the site.
						dataArray.push({
							"measure": newKey, 
							"x": x,
							"value": val, 
							"preunit": unit.pre,
							"postunit": unit.post,
							"metadata": {"date": vis.json.data.date}
						});
					}
					
					opts.xaxis = JSON.parse(JSON.stringify(xaxis));
					if(yrange.max-yrange.min == 0 || axis.type=="category") opts.xaxis = {grid:{show:false},ticks:[]};

					if(vis.json.values.length==1 || (vis.json.values.length > 1 && nonzero > 0)){
						// Updates the dashboard dictionary. It adds {newKey: newValue} at the level given by [keys].
						updateDictionary(dashboard, [PCON24CD, theme], titleKey, {"data": dataArray, "url": url, "opts": opts});
					}
				}
			} else {
				console.log(vis);
			}
			// Free up some memory as we don't need it any more
			delete themeData.visualisations[vis];
		}
	}
	console.log('Get HexJSON and MPs...');
	const hexjson = await fetchIt("https://open-innovations.org/projects/hexmaps/maps/uk-constituencies-2023.hexjson");
	const hexes = hexjson.hexes;

	let currentMPs = await fetchIt("https://github.com/open-innovations/constituencies/raw/refs/heads/main/lookups/current-MPs.json");
	if (currentMPs == null) {
		console.error("Failed to get currentMPs.")
		return;
	}
	console.log('Building dashboards for each constituency...');
	let i = 0;
	for (const [code, data] of Object.entries(dashboard)){
		if (hexes[code] != null) {
			console.log("\tProcessing "+hexes[code]['n']);
			const bgColour = hexes[code]['colour'];
			const textColour = contrastColour(bgColour);
			yield {
				url: `/${code}/`,
				layout: 'template/constituencies.vto',
				title: hexes[code]['n'],
				bgColour: hexes[code]['colour'],
				fontColour: textColour,
				tags: 'constituency',
				figures: data,
				region: hexes.region,
				mpData: currentMPs[code],
				code
			};
			// Free up some memory
			delete dashboard[code];
		}
		if (DEV && i >= 5) {
			break;
		}
		i++;
	}
	console.log('Done index.page.js');
}
