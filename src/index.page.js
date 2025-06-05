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

function axisType(arr){
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

// Function to return a yaxis object suitable for OI Lume Viz adjusted to the range of the data
function getYAxis(data,scale){
	if(!scale) scale = {};
	let min = Infinity,max = -Infinity,range,spacing,lo,hi,axis,i,y,pre = "",post = "",f = 1;
	// Calculate the min/max in the data and get the pre/post units
	for(i = 0; i < data.length; i++){
		if(!isNaN(data[i].value)){
			min = Math.min(min,data[i].value);
			max = Math.max(max,data[i].value);
		}
		if(i==0){ pre = data[i].preunit||""; post = data[i].postunit||""; }
	}
	// If the scale minimum is set we'll use that instead (this helps preserve some sensible zero scaling)
	if(typeof scale.min==="number") min = scale.min;
	// Find the range
	range = max - min;
	// Work out a spacing and then a scale factor
	if(range > 0){
		spacing = Math.pow(10,Math.floor(Math.log10(range)));
		let n = range/spacing;
		if(n > 3) f = 2;
		if(n > 6) f = 5;
	}else{
		spacing = 1;
	}
	// Update the tick spacing
	spacing = (new Decimal(spacing)).times(f);
	// Find the new minimum/maximum to use for the scale
	lo = new Decimal(Math.floor(min/spacing.toNumber())*spacing.toNumber());
	hi = new Decimal(Math.ceil(max/spacing.toNumber())*spacing.toNumber());
	axis = {min:lo.toNumber(),max:hi.toNumber(),ticks:[],'grid':{'stroke-width': 0.5}};
	// Create tick marks
	//axis.ticks.push({'value':lo.toNumber(),'label':(pre+lo.toNumber().toLocaleString()+post),'grid':true});
	//axis.ticks.push({'value':hi.toNumber(),'label':(pre+hi.toNumber().toLocaleString()+post),'grid':true});
	for(y = lo; y.lessThanOrEqualTo(hi) ; y = y.plus(spacing)){
		axis.ticks.push({'value':y.toNumber(),'label':(pre+y.toNumber().toLocaleString()+post),'grid':true});
	}
	return axis;
}

function getXAxis(axis){
	let s = Infinity,e = -Infinity,gap,r,y,i;
	let xaxis = {grid:{show:false},ticks:[]};
	// If we have a year or number axis we'll make ticks
	if(axis.type=="year" || axis.type=="number"){
		for(i = 0; i < axis.values.length; i++){
			s = Math.min(s,axis.values[i]);
			e = Math.max(e,axis.values[i]);
		}
		gap = 1;
		r = Math.abs(e-s);
		if(r > 4) gap = 2;
		if(r > 11) gap = 5;
		if(r > 28) gap = 10;
		for(y = gap*Math.floor(s/gap) ; y < e; y += gap){
			if((y > s || y==0) && y < e) xaxis.ticks.push({"value":y,"label":Math.round(y)+"","tickSize": 5,"grid":false});
		}
	}
	return xaxis;

}
function getItem(v){
	return fetchIt(v.url).then((value) => {
		v.json = value;
	});
}

export default async function* (page) {

	console.log('Get HexJSON and MPs...');
	const hexjson = page.hexjson['uk-constituencies-2024'];
	const hexes = hexjson.hexes;
	const pcons = Object.keys(hexes);

	const index = page.api||{'themes':[]};

	// Calculate rankings
	let pcon,v,val,viz,key,label,i,arr,rank,title,theme,frequencies,quantiles = 5,quantile;

	for(theme in index.themes){
		for(viz = 0; viz < index.themes[theme].visualisations.length; viz++){
			for(pcon in index.themes[theme].visualisations[viz].json.data.constituencies){
				// Add empty rank object
				index.themes[theme].visualisations[viz].json.data.constituencies[pcon].ranks = {};
			}

			title = index.themes[theme].visualisations[viz].json.title;
			if(title in page.rankIndicator[theme]){
				for(v = 0; v < index.themes[theme].visualisations[viz].json.values.length; v++){
					// For this value we need to work out the ranking for every constituency
					// Build an array of constituency objects with ID, value, and rank
					arr = [];
					key = index.themes[theme].visualisations[viz].json.values[v].value;
					label = index.themes[theme].visualisations[viz].json.values[v].label||key;
					
					if(label in page.rankIndicator[theme][title]){
						for(pcon in index.themes[theme].visualisations[viz].json.data.constituencies){
							arr.push({'id':pcon,'value':index.themes[theme].visualisations[viz].json.data.constituencies[pcon][key]});
						}
						// Sort the array by the values
						arr.sort((a, b) => a.value - b.value);
						frequencies = {};
						for(i = 0; i < arr.length; i++){
							val = (arr[i].value||0)+'';
							if(!(val in frequencies)) frequencies[val] = 0;
							frequencies[val]++;
						}

						// Loop through array and add the rank
						for(i = 0; i < arr.length; i++){
							pcon = arr[i].id;
							// The rank is the quintile
							quantile = Math.max(Math.ceil(quantiles*i/arr.length),1);
							if(page.rankIndicator[theme][title][label] == "h") quantile = quantiles-quantile+1;
							
							// Percentile rank https://en.wikipedia.org/wiki/Percentile_rank
							rank = (i + (0.5*frequencies[arr[i].value+'']))/arr.length;
							// Switch direction of rank if necessary
							if(page.rankIndicator[theme][title][label] == "h") rank = 1-rank;
							// Limit range just in case
							rank = Math.max(0,Math.min(1,rank));

							index.themes[theme].visualisations[viz].json.data.constituencies[pcon].ranks[label] = {'rank':rank,'value':arr[i].value,'freq':frequencies[arr[i].value+''],'i':i,'quintile':quantile,'n':arr.length};
						}
					}
				}
			}
		}
	}

/*
	theme = "economy";
	title = "ATMs: total (UK)";
	v = 0;
	pcon = "W07000081";
	for(viz = 0; viz < index.themes[theme].visualisations.length; viz++){
		if(index.themes[theme].visualisations[viz].json.title == title){
			v = viz;
		}
	}
	console.log('Theme: '+theme)
	console.log('Title: '+title)
	console.log('JS',index.themes[theme].visualisations[v].json.data.constituencies[pcon].ranks);
	//console.log('Python',page.ranked_constituencies[pcon][theme][title]);
*/
	const n = (DEV ? 20 : pcons.length);

	for(let p = 0; p < n; p++){

		const code = pcons[p];
		const mp = page['currentMPs'][code];

		//console.log("Building "+hexes[code].n+" ("+code+")");

		let dashboard = {};
		let opts = {};
		let data = {};

		// Looping over each theme
		for(const [theme, themeData] of Object.entries(index.themes)){

			// Loop through each vis and store its data
			for(const vis of themeData.visualisations){

				// Visualisation-specific options
				opts = {};

				// Only build the page if there is json content
				if(vis.json != null && code in vis.json.data.constituencies){
					const constituencyData = vis.json.data.constituencies[code];
					const attribution = vis.json.data.attribution;
					const dataDate = vis.json.data.date||"";
					const titleKey = vis.json.title;
					const url = vis.json.url;
					const axis = axisType(vis.json.values);

					let units = new Array(axis.values.length);
					let s = Infinity,e = -Infinity;
					// Create some options for Lume to work out what to show
					if (vis.json.values.length > 3) {
						opts['type'] = 'line';
					} 
					else if (vis.json.values.length > 1) {
						opts['showSubtitle'] = true;
					}

					// Loop over slider values
					for(let i = 0 ; i < vis.json.values.length ; i++){
						const newKey = vis.json.values[i].label;
						let unit = {};
						if("units" in vis.json){
							if(vis.json.values[i].label in vis.json.units){
								unit = vis.json.units[vis.json.values[i].label];
							}else if(vis.json.values[i].value in vis.json.units){
								unit = vis.json.units[vis.json.values[i].value];
							}
							let scale = unit.scaleBy;
							let precision = unit.precision;
							if(unit.pre === undefined) unit.pre = "";
							if(unit.pre === undefined) unit.post = "";
							// Set some pre/post-fixes based on specific units
							if (unit.category == 'currency' && unit.value=='GBP'){ 
								unit.pre = '£';
							} else if (unit.value=='percent') {
								unit.post = '%';
								if(!precision) precision = 0.1;
							} else if (unit.value=='hr') {
								unit.post = ' hr';
								if(!precision) precision = 0.1;
							} else if (unit.value=='Mb/s') {
								unit.post = ' Mb/s';
							} else if (unit.value=='MW') {
								unit.post = ' MW';
							} else if (unit.value=='yr') {
								unit.post = ' years'
							} else if (unit.value=='ha') {
								unit.post = ' hectares'
							}
							if(typeof precision==="number") unit.precision = precision;
							if(typeof scale==="number") unit.scaleBy = scale;
						}
						units[i] = unit;
					}

					// Create variables/constants
					let dataArray = [];
					let yrange = {'min':Infinity,'max':-Infinity};
						
					let nonzero = 0;
					let unit;
					// Iterate through the different "values" in the data
					for(let i = 0 ; i < vis.json.values.length ; i++){
						unit = units[i];
						//console.log('values',i,vis.json.values[i],constituencyData);
						let val = constituencyData[vis.json.values[i].value];
						let key = vis.json.values[i].label||vis.json.values[i].value;

						let rank = -1;
						if(key in constituencyData.ranks && "rank" in constituencyData.ranks[key]) rank = constituencyData.ranks[key].rank;

						// If the value is a number, apply the scale if it exists, or multiply by 1.
						if(typeof val==="number"){
							val *= (unit.scaleBy || 1);
							if(typeof unit.precision==="number"){
								// Use Decimal function (below) to avoid rounding issues
								let v = new Decimal(val);
								v = v.div(unit.precision).toInteger().times(unit.precision);
								val = v.toNumber();
							}
						}
						yrange.min = Math.min(yrange.min,val);
						yrange.max = Math.max(yrange.max,val);
						let x = (axis.type=="year" || axis.type=="number") ? axis.values[i] : i;
						if(val != 0) nonzero++;
						// Create a new dictionary with all the info we need to generate the site.
						let datum = {
							"measure": vis.json.values[i].label,
							"x": x,
							"value": val,
						};
						if(rank >= 0) datum.rank = rank;
						if(typeof unit.pre!=="undefined" && unit.pre != "") datum.preunit = unit.pre;
						if(typeof unit.post!=="undefined" && unit.post != "") datum.postunit = unit.post;
						if(typeof unit.notes!=="undefined" && unit.notes != "") datum.notes = unit.notes;
						dataArray.push(datum);
					}

					opts.xaxis = getXAxis(axis);
					opts.yaxis = (yrange.max-yrange.min>0) ? getYAxis(dataArray,vis.json.scale) : opts.yaxis = {grid:{show:false},ticks:[]};

					if(yrange.max-yrange.min == 0 || axis.type=="category"){
						opts.xaxis = {grid:{show:false},ticks:[]};
						if (vis.json.values.length > 1 && axis.type!='year') opts['type'] = 'bar';
					}

					if(vis.json.values.length==1 || (vis.json.values.length > 1 && nonzero > 0)){

						if(!(theme in data)) data[theme] = {};
						data[theme][titleKey] = {"data": dataArray, "url": url, "opts": opts, "attribution": attribution, "date": dataDate};

					}
				}
			}
		}

		const result = {
			url: `/${code}/`,
			layout: 'template/constituencies.vto',
			title: hexes[code]['n'],
			bgColour: mp['Party bg'],
			fontColour: contrastColour(mp['Party bg']),
			tags: 'constituency',
			figures: data,
			region: hexes.region,
			mpData: mp,
			code,
			ranked_constituencies: null,//{[code]:page.ranked_constituencies[code]},
			"currentMPs": {[code]:mp},
			hexjson: null,
		};
		yield result;
	}

	page.api = null;
	console.log('Done index.page.js');
}
/* decimal.js-light v2.5.1 https://github.com/MikeMcl/decimal.js-light/LICENCE */
!function(r){"use strict";function e(r,e){var t,n,i,o,s,u,f,c,l=r.constructor,d=l.precision;if(!r.s||!e.s)return e.s||(e=new l(r)),E?h(e,d):e;if(f=r.d,c=e.d,s=r.e,i=e.e,f=f.slice(),o=s-i){for(0>o?(n=f,o=-o,u=c.length):(n=c,i=s,u=f.length),s=Math.ceil(d/y),u=s>u?s+1:u+1,o>u&&(o=u,n.length=1),n.reverse();o--;)n.push(0);n.reverse()}for(u=f.length,o=c.length,0>u-o&&(o=u,n=c,c=f,f=n),t=0;o;)t=(f[--o]=f[o]+c[o]+t)/q|0,f[o]%=q;for(t&&(f.unshift(t),++i),u=f.length;0==f[--u];)f.pop();return e.d=f,e.e=i,E?h(e,d):e}function t(r,e,t){if(r!==~~r||e>r||r>t)throw Error(x+r)}function n(r){var e,t,n,i=r.length-1,o="",s=r[0];if(i>0){for(o+=s,e=1;i>e;e++)n=r[e]+"",t=y-n.length,t&&(o+=u(t)),o+=n;s=r[e],n=s+"",t=y-n.length,t&&(o+=u(t))}else if(0===s)return"0";for(;s%10===0;)s/=10;return o+s}function i(r,e){var t,i,s,u,f,c,l=0,d=0,a=r.constructor,g=a.precision;if(o(r)>16)throw Error(O+o(r));if(!r.s)return new a(v);for(null==e?(E=!1,c=g):c=e,f=new a(.03125);r.abs().gte(.1);)r=r.times(f),d+=5;for(i=Math.log(L(2,d))/Math.LN10*2+5|0,c+=i,t=s=u=new a(v),a.precision=c;;){if(s=h(s.times(r),c),t=t.times(++l),f=u.plus(P(s,t,c)),n(f.d).slice(0,c)===n(u.d).slice(0,c)){for(;d--;)u=h(u.times(u),c);return a.precision=g,null==e?(E=!0,h(u,g)):u}u=f}}function o(r){for(var e=r.e*y,t=r.d[0];t>=10;t/=10)e++;return e}function s(r,e,t){if(e>r.LN10.sd())throw E=!0,t&&(r.precision=t),Error(N+"LN10 precision limit exceeded");return h(new r(r.LN10),e)}function u(r){for(var e="";r--;)e+="0";return e}function f(r,e){var t,i,u,c,l,d,a,g,p,w=1,m=10,x=r,O=x.d,b=x.constructor,L=b.precision;if(x.s<1)throw Error(N+(x.s?"NaN":"-Infinity"));if(x.eq(v))return new b(0);if(null==e?(E=!1,g=L):g=e,x.eq(10))return null==e&&(E=!0),s(b,g);if(g+=m,b.precision=g,t=n(O),i=t.charAt(0),c=o(x),!(Math.abs(c)<15e14))return a=s(b,g+2,L).times(c+""),x=f(new b(i+"."+t.slice(1)),g-m).plus(a),b.precision=L,null==e?(E=!0,h(x,L)):x;for(;7>i&&1!=i||1==i&&t.charAt(1)>3;)x=x.times(r),t=n(x.d),i=t.charAt(0),w++;for(c=o(x),i>1?(x=new b("0."+t),c++):x=new b(i+"."+t.slice(1)),d=l=x=P(x.minus(v),x.plus(v),g),p=h(x.times(x),g),u=3;;){if(l=h(l.times(p),g),a=d.plus(P(l,new b(u),g)),n(a.d).slice(0,g)===n(d.d).slice(0,g))return d=d.times(2),0!==c&&(d=d.plus(s(b,g+2,L).times(c+""))),d=P(d,new b(w),g),b.precision=L,null==e?(E=!0,h(d,L)):d;d=a,u+=2}}function c(r,e){var t,n,i;for((t=e.indexOf("."))>-1&&(e=e.replace(".","")),(n=e.search(/e/i))>0?(0>t&&(t=n),t+=+e.slice(n+1),e=e.substring(0,n)):0>t&&(t=e.length),n=0;48===e.charCodeAt(n);)++n;for(i=e.length;48===e.charCodeAt(i-1);)--i;if(e=e.slice(n,i)){if(i-=n,t=t-n-1,r.e=b(t/y),r.d=[],n=(t+1)%y,0>t&&(n+=y),i>n){for(n&&r.d.push(+e.slice(0,n)),i-=y;i>n;)r.d.push(+e.slice(n,n+=y));e=e.slice(n),n=y-e.length}else n-=i;for(;n--;)e+="0";if(r.d.push(+e),E&&(r.e>_||r.e<-_))throw Error(O+t)}else r.s=0,r.e=0,r.d=[0];return r}function h(r,e,t){var n,i,s,u,f,c,h,l,d=r.d;for(u=1,s=d[0];s>=10;s/=10)u++;if(n=e-u,0>n)n+=y,i=e,h=d[l=0];else{if(l=Math.ceil((n+1)/y),s=d.length,l>=s)return r;for(h=s=d[l],u=1;s>=10;s/=10)u++;n%=y,i=n-y+u}if(void 0!==t&&(s=L(10,u-i-1),f=h/s%10|0,c=0>e||void 0!==d[l+1]||h%s,c=4>t?(f||c)&&(0==t||t==(r.s<0?3:2)):f>5||5==f&&(4==t||c||6==t&&(n>0?i>0?h/L(10,u-i):0:d[l-1])%10&1||t==(r.s<0?8:7))),1>e||!d[0])return c?(s=o(r),d.length=1,e=e-s-1,d[0]=L(10,(y-e%y)%y),r.e=b(-e/y)||0):(d.length=1,d[0]=r.e=r.s=0),r;if(0==n?(d.length=l,s=1,l--):(d.length=l+1,s=L(10,y-n),d[l]=i>0?(h/L(10,u-i)%L(10,i)|0)*s:0),c)for(;;){if(0==l){(d[0]+=s)==q&&(d[0]=1,++r.e);break}if(d[l]+=s,d[l]!=q)break;d[l--]=0,s=1}for(n=d.length;0===d[--n];)d.pop();if(E&&(r.e>_||r.e<-_))throw Error(O+o(r));return r}function l(r,e){var t,n,i,o,s,u,f,c,l,d,a=r.constructor,g=a.precision;if(!r.s||!e.s)return e.s?e.s=-e.s:e=new a(r),E?h(e,g):e;if(f=r.d,d=e.d,n=e.e,c=r.e,f=f.slice(),s=c-n){for(l=0>s,l?(t=f,s=-s,u=d.length):(t=d,n=c,u=f.length),i=Math.max(Math.ceil(g/y),u)+2,s>i&&(s=i,t.length=1),t.reverse(),i=s;i--;)t.push(0);t.reverse()}else{for(i=f.length,u=d.length,l=u>i,l&&(u=i),i=0;u>i;i++)if(f[i]!=d[i]){l=f[i]<d[i];break}s=0}for(l&&(t=f,f=d,d=t,e.s=-e.s),u=f.length,i=d.length-u;i>0;--i)f[u++]=0;for(i=d.length;i>s;){if(f[--i]<d[i]){for(o=i;o&&0===f[--o];)f[o]=q-1;--f[o],f[i]+=q}f[i]-=d[i]}for(;0===f[--u];)f.pop();for(;0===f[0];f.shift())--n;return f[0]?(e.d=f,e.e=n,E?h(e,g):e):new a(0)}function d(r,e,t){var i,s=o(r),f=n(r.d),c=f.length;return e?(t&&(i=t-c)>0?f=f.charAt(0)+"."+f.slice(1)+u(i):c>1&&(f=f.charAt(0)+"."+f.slice(1)),f=f+(0>s?"e":"e+")+s):0>s?(f="0."+u(-s-1)+f,t&&(i=t-c)>0&&(f+=u(i))):s>=c?(f+=u(s+1-c),t&&(i=t-s-1)>0&&(f=f+"."+u(i))):((i=s+1)<c&&(f=f.slice(0,i)+"."+f.slice(i)),t&&(i=t-c)>0&&(s+1===c&&(f+="."),f+=u(i))),r.s<0?"-"+f:f}function a(r,e){return r.length>e?(r.length=e,!0):void 0}function g(r){function e(r){var t=this;if(!(t instanceof e))return new e(r);if(t.constructor=e,r instanceof e)return t.s=r.s,t.e=r.e,void(t.d=(r=r.d)?r.slice():r);if("number"==typeof r){if(0*r!==0)throw Error(x+r);if(r>0)t.s=1;else{if(!(0>r))return t.s=0,t.e=0,void(t.d=[0]);r=-r,t.s=-1}return r===~~r&&1e7>r?(t.e=0,void(t.d=[r])):c(t,r.toString())}if("string"!=typeof r)throw Error(x+r);if(45===r.charCodeAt(0)?(r=r.slice(1),t.s=-1):t.s=1,!D.test(r))throw Error(x+r);c(t,r)}var t,n,i;if(e.prototype=A,e.ROUND_UP=0,e.ROUND_DOWN=1,e.ROUND_CEIL=2,e.ROUND_FLOOR=3,e.ROUND_HALF_UP=4,e.ROUND_HALF_DOWN=5,e.ROUND_HALF_EVEN=6,e.ROUND_HALF_CEIL=7,e.ROUND_HALF_FLOOR=8,e.clone=g,e.config=e.set=p,void 0===r&&(r={}),r)for(i=["precision","rounding","toExpNeg","toExpPos","LN10"],t=0;t<i.length;)r.hasOwnProperty(n=i[t++])||(r[n]=this[n]);return e.config(r),e}function p(r){if(!r||"object"!=typeof r)throw Error(N+"Object expected");var e,t,n,i=["precision",1,w,"rounding",0,8,"toExpNeg",-1/0,0,"toExpPos",0,1/0];for(e=0;e<i.length;e+=3)if(void 0!==(n=r[t=i[e]])){if(!(b(n)===n&&n>=i[e+1]&&n<=i[e+2]))throw Error(x+t+": "+n);this[t]=n}if(void 0!==(n=r[t="LN10"])){if(n!=Math.LN10)throw Error(x+t+": "+n);this[t]=new this(n)}return this}var v,w=1e9,m={precision:20,rounding:4,toExpNeg:-7,toExpPos:21,LN10:"2.302585092994045684017991454684364207601101488628772976033327900967572609677352480235997205089598298341967784042286"},E=!0,N="[DecimalError] ",x=N+"Invalid argument: ",O=N+"Exponent out of range: ",b=Math.floor,L=Math.pow,D=/^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,q=1e7,y=7,M=9007199254740991,_=b(M/y),A={};A.absoluteValue=A.abs=function(){var r=new this.constructor(this);return r.s&&(r.s=1),r},A.comparedTo=A.cmp=function(r){var e,t,n,i,o=this;if(r=new o.constructor(r),o.s!==r.s)return o.s||-r.s;if(o.e!==r.e)return o.e>r.e^o.s<0?1:-1;for(n=o.d.length,i=r.d.length,e=0,t=i>n?n:i;t>e;++e)if(o.d[e]!==r.d[e])return o.d[e]>r.d[e]^o.s<0?1:-1;return n===i?0:n>i^o.s<0?1:-1},A.decimalPlaces=A.dp=function(){var r=this,e=r.d.length-1,t=(e-r.e)*y;if(e=r.d[e])for(;e%10==0;e/=10)t--;return 0>t?0:t},A.dividedBy=A.div=function(r){return P(this,new this.constructor(r))},A.dividedToIntegerBy=A.idiv=function(r){var e=this,t=e.constructor;return h(P(e,new t(r),0,1),t.precision)},A.equals=A.eq=function(r){return!this.cmp(r)},A.exponent=function(){return o(this)},A.greaterThan=A.gt=function(r){return this.cmp(r)>0},A.greaterThanOrEqualTo=A.gte=function(r){return this.cmp(r)>=0},A.isInteger=A.isint=function(){return this.e>this.d.length-2},A.isNegative=A.isneg=function(){return this.s<0},A.isPositive=A.ispos=function(){return this.s>0},A.isZero=function(){return 0===this.s},A.lessThan=A.lt=function(r){return this.cmp(r)<0},A.lessThanOrEqualTo=A.lte=function(r){return this.cmp(r)<1},A.logarithm=A.log=function(r){var e,t=this,n=t.constructor,i=n.precision,o=i+5;if(void 0===r)r=new n(10);else if(r=new n(r),r.s<1||r.eq(v))throw Error(N+"NaN");if(t.s<1)throw Error(N+(t.s?"NaN":"-Infinity"));return t.eq(v)?new n(0):(E=!1,e=P(f(t,o),f(r,o),o),E=!0,h(e,i))},A.minus=A.sub=function(r){var t=this;return r=new t.constructor(r),t.s==r.s?l(t,r):e(t,(r.s=-r.s,r))},A.modulo=A.mod=function(r){var e,t=this,n=t.constructor,i=n.precision;if(r=new n(r),!r.s)throw Error(N+"NaN");return t.s?(E=!1,e=P(t,r,0,1).times(r),E=!0,t.minus(e)):h(new n(t),i)},A.naturalExponential=A.exp=function(){return i(this)},A.naturalLogarithm=A.ln=function(){return f(this)},A.negated=A.neg=function(){var r=new this.constructor(this);return r.s=-r.s||0,r},A.plus=A.add=function(r){var t=this;return r=new t.constructor(r),t.s==r.s?e(t,r):l(t,(r.s=-r.s,r))},A.precision=A.sd=function(r){var e,t,n,i=this;if(void 0!==r&&r!==!!r&&1!==r&&0!==r)throw Error(x+r);if(e=o(i)+1,n=i.d.length-1,t=n*y+1,n=i.d[n]){for(;n%10==0;n/=10)t--;for(n=i.d[0];n>=10;n/=10)t++}return r&&e>t?e:t},A.squareRoot=A.sqrt=function(){var r,e,t,i,s,u,f,c=this,l=c.constructor;if(c.s<1){if(!c.s)return new l(0);throw Error(N+"NaN")}for(r=o(c),E=!1,s=Math.sqrt(+c),0==s||s==1/0?(e=n(c.d),(e.length+r)%2==0&&(e+="0"),s=Math.sqrt(e),r=b((r+1)/2)-(0>r||r%2),s==1/0?e="5e"+r:(e=s.toExponential(),e=e.slice(0,e.indexOf("e")+1)+r),i=new l(e)):i=new l(s.toString()),t=l.precision,s=f=t+3;;)if(u=i,i=u.plus(P(c,u,f+2)).times(.5),n(u.d).slice(0,f)===(e=n(i.d)).slice(0,f)){if(e=e.slice(f-3,f+1),s==f&&"4999"==e){if(h(u,t+1,0),u.times(u).eq(c)){i=u;break}}else if("9999"!=e)break;f+=4}return E=!0,h(i,t)},A.times=A.mul=function(r){var e,t,n,i,o,s,u,f,c,l=this,d=l.constructor,a=l.d,g=(r=new d(r)).d;if(!l.s||!r.s)return new d(0);for(r.s*=l.s,t=l.e+r.e,f=a.length,c=g.length,c>f&&(o=a,a=g,g=o,s=f,f=c,c=s),o=[],s=f+c,n=s;n--;)o.push(0);for(n=c;--n>=0;){for(e=0,i=f+n;i>n;)u=o[i]+g[n]*a[i-n-1]+e,o[i--]=u%q|0,e=u/q|0;o[i]=(o[i]+e)%q|0}for(;!o[--s];)o.pop();return e?++t:o.shift(),r.d=o,r.e=t,E?h(r,d.precision):r},A.toDecimalPlaces=A.todp=function(r,e){var n=this,i=n.constructor;return n=new i(n),void 0===r?n:(t(r,0,w),void 0===e?e=i.rounding:t(e,0,8),h(n,r+o(n)+1,e))},A.toExponential=function(r,e){var n,i=this,o=i.constructor;return void 0===r?n=d(i,!0):(t(r,0,w),void 0===e?e=o.rounding:t(e,0,8),i=h(new o(i),r+1,e),n=d(i,!0,r+1)),n},A.toFixed=function(r,e){var n,i,s=this,u=s.constructor;return void 0===r?d(s):(t(r,0,w),void 0===e?e=u.rounding:t(e,0,8),i=h(new u(s),r+o(s)+1,e),n=d(i.abs(),!1,r+o(i)+1),s.isneg()&&!s.isZero()?"-"+n:n)},A.toInteger=A.toint=function(){var r=this,e=r.constructor;return h(new e(r),o(r)+1,e.rounding)},A.toNumber=function(){return+this},A.toPower=A.pow=function(r){var e,t,n,o,s,u,c=this,l=c.constructor,d=12,g=+(r=new l(r));if(!r.s)return new l(v);if(c=new l(c),!c.s){if(r.s<1)throw Error(N+"Infinity");return c}if(c.eq(v))return c;if(n=l.precision,r.eq(v))return h(c,n);if(e=r.e,t=r.d.length-1,u=e>=t,s=c.s,u){if((t=0>g?-g:g)<=M){for(o=new l(v),e=Math.ceil(n/y+4),E=!1;t%2&&(o=o.times(c),a(o.d,e)),t=b(t/2),0!==t;)c=c.times(c),a(c.d,e);return E=!0,r.s<0?new l(v).div(o):h(o,n)}}else if(0>s)throw Error(N+"NaN");return s=0>s&&1&r.d[Math.max(e,t)]?-1:1,c.s=1,E=!1,o=r.times(f(c,n+d)),E=!0,o=i(o),o.s=s,o},A.toPrecision=function(r,e){var n,i,s=this,u=s.constructor;return void 0===r?(n=o(s),i=d(s,n<=u.toExpNeg||n>=u.toExpPos)):(t(r,1,w),void 0===e?e=u.rounding:t(e,0,8),s=h(new u(s),r,e),n=o(s),i=d(s,n>=r||n<=u.toExpNeg,r)),i},A.toSignificantDigits=A.tosd=function(r,e){var n=this,i=n.constructor;return void 0===r?(r=i.precision,e=i.rounding):(t(r,1,w),void 0===e?e=i.rounding:t(e,0,8)),h(new i(n),r,e)},A.toString=A.valueOf=A.val=A.toJSON=function(){var r=this,e=o(r),t=r.constructor;return d(r,e<=t.toExpNeg||e>=t.toExpPos)};var P=function(){function r(r,e){var t,n=0,i=r.length;for(r=r.slice();i--;)t=r[i]*e+n,r[i]=t%q|0,n=t/q|0;return n&&r.unshift(n),r}function e(r,e,t,n){var i,o;if(t!=n)o=t>n?1:-1;else for(i=o=0;t>i;i++)if(r[i]!=e[i]){o=r[i]>e[i]?1:-1;break}return o}function t(r,e,t){for(var n=0;t--;)r[t]-=n,n=r[t]<e[t]?1:0,r[t]=n*q+r[t]-e[t];for(;!r[0]&&r.length>1;)r.shift()}return function(n,i,s,u){var f,c,l,d,a,g,p,v,w,m,E,x,O,b,L,D,M,_,A=n.constructor,P=n.s==i.s?1:-1,R=n.d,U=i.d;if(!n.s)return new A(n);if(!i.s)throw Error(N+"Division by zero");for(c=n.e-i.e,M=U.length,L=R.length,p=new A(P),v=p.d=[],l=0;U[l]==(R[l]||0);)++l;if(U[l]>(R[l]||0)&&--c,x=null==s?s=A.precision:u?s+(o(n)-o(i))+1:s,0>x)return new A(0);if(x=x/y+2|0,l=0,1==M)for(d=0,U=U[0],x++;(L>l||d)&&x--;l++)O=d*q+(R[l]||0),v[l]=O/U|0,d=O%U|0;else{for(d=q/(U[0]+1)|0,d>1&&(U=r(U,d),R=r(R,d),M=U.length,L=R.length),b=M,w=R.slice(0,M),m=w.length;M>m;)w[m++]=0;_=U.slice(),_.unshift(0),D=U[0],U[1]>=q/2&&++D;do d=0,f=e(U,w,M,m),0>f?(E=w[0],M!=m&&(E=E*q+(w[1]||0)),d=E/D|0,d>1?(d>=q&&(d=q-1),a=r(U,d),g=a.length,m=w.length,f=e(a,w,g,m),1==f&&(d--,t(a,g>M?_:U,g))):(0==d&&(f=d=1),a=U.slice()),g=a.length,m>g&&a.unshift(0),t(w,a,m),-1==f&&(m=w.length,f=e(U,w,M,m),1>f&&(d++,t(w,m>M?_:U,m))),m=w.length):0===f&&(d++,w=[0]),v[l++]=d,f&&w[0]?w[m++]=R[b]||0:(w=[R[b]],m=1);while((b++<L||void 0!==w[0])&&x--)}return v[0]||v.shift(),p.e=c,h(p,u?s+o(p)+1:s)}}();m=g(m),m["default"]=m.Decimal=m,v=new m(1),"function"==typeof define&&define.amd?define(function(){return m}):"undefined"!=typeof module&&module.exports?module.exports=m:(r||(r="undefined"!=typeof self&&self&&self.self==self?self:Function("return this")()),r.Decimal=m)}(this);
//# sourceMappingURL=doc/decimal.js.map
