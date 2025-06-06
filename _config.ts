import lume from "lume/mod.ts";
import base_path from "lume/plugins/base_path.ts";
import favicon from "lume/plugins/favicon.ts";
import google_fonts from "lume/plugins/google_fonts.ts";
import postcss from "lume/plugins/postcss.ts";

// Importing the OI Lume charts and utilities
import oiViz from "https://deno.land/x/oi_lume_viz@v0.17.0/mod.ts";
import jsonLoader from "lume/core/loaders/json.ts";
import date from "lume/plugins/date.ts";
import getAPIData from "./api.js";

const site = lume({
    src: "./src",
    location: new URL("https://open-innovations.github.io/constituency-api-test"),
});

site.add([".css"]);

site.use(google_fonts({
	cssFile: "fonts.css",
    fonts: "https://fonts.google.com/share?selection.family=Poppins:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700"
}));

import oiVizConfig from "./oi-viz-config.ts";
site.use(oiViz(oiVizConfig));

// Register an HTML processor
// https://lume.land/docs/core/processors/
site.process([".html"], (pages) => {
	for (const page of pages) {
		// Trim pages to save memory
		page.text = page.text.replace(/\t+/g,"\t");
		page.text = page.text.replace(/ data-dependencies="[^\"]+"/g,"");	// We've manually included the JS to avoid a document processing
		page.text = page.text.replace(/(<svg[^\>]*) style="max-width:100%;width:100%;height:auto;"/g,function(m,p1){ return p1; });	// Put these in CSS instead
		page.text = page.text.replace(/(<svg[^\>]*) overflow="visible"/g,function(m,p1){ return p1; });	// Put these in CSS instead
		page.text = page.text.replace(/(<svg[^\>]*) width="(480|400)" height="250"/g,function(m,p1){ return p1; });	// Not really needed
		page.text = page.text.replace(/ vector-effect="non-scaling-stroke"/g,'');	// Not necessary for this site
		page.text = page.text.replace(/<text class="axis-grid-title"[^\>]+><\/text>/g,'');	// Empty text
		page.text = page.text.replace(/<g class="axis-grid axis-grid-[xy]"><\/g>/g,'');	// Empty group
		page.text = page.text.replace(/tspan font-family="Arial,sans-serif"/g,'tspan');	// Not needed because we'll use CSS instead
		page.text = page.text.replace(/tspan font-size="16"/g,'tspan');	// Not needed because we'll use CSS instead
		page.text = page.text.replace(/ fill-opacity="1"/g,'');	// The default anyway
		page.text = page.text.replace(/<div class="oi-(top|bottom) oi-(left|right)"><\/div>/g,'');	// Remove empty holders
		page.text = page.text.replace(/<div class="oi-(left-right)"><\/div>/g,'');	// Remove empty holders
		page.text = page.text.replace(/<div class="oi-(top|bottom)"><\/div>/g,'');	// Remove empty holders
		page.text = page.text.replace(/<(rect|circle|text)([^\>]*) fill="#(FFFFFF|000000)"/g,function(m,p1,p2){ return '<'+p1+p2; });	// This let's them inherit currentColour
		page.text = page.text.replace(/<(line)([^\>]*) stroke="#(B2B2B2)"/g,function(m,p1,p2){ return '<'+p1+p2; });	// Don't set the line
		page.text = page.text.replace(/<(text)([^\>]*) font-weight="bold"/g,function(m,p1,p2){ return '<'+p1+p2; });	// Don't keep the weight
		page.text = page.text.replace(/ fill-opacity="null"/g,'');	// Invalid anyway
		page.text = page.text.replace(/<g data="[^\"]+"/g,'<g'); // We don't need this property
		page.text = page.text.replace(/<g data-category="[^\"]+"/g,'<g');	// We don't need this property
		page.text = page.text.replace(/\.000([,\)])/g,function(m,p1){ return p1; });	// Trim trailing .000
	}
	console.log('Processed pages in _config.ts');
});

site.use(base_path());

site.use(date(/* Options */));
site.use(favicon({input: "/assets/img/oi-square-8.png"}));
site.add("/assets/img");
site.loadData([".hexjson"], jsonLoader);

site.remoteFile("_data/hexjson/uk-constituencies-2024.hexjson", "https://github.com/open-innovations/constituencies/raw/refs/heads/main/src/_data/hexjson/uk-constituencies-2024.hexjson");
site.remoteFile("_data/currentMPs.json", "https://github.com/open-innovations/constituencies/raw/refs/heads/main/lookups/current-MPs.json");

site.filter("dump", (Object) => {
    return JSON.stringify(Object);
});

site.filter("capitalise", (x: string) => {
	if (!x) return x; // Handle empty strings
	return x.charAt(0).toUpperCase() + x.slice(1);
});

site.filter('humanise', (input) => {
	if (typeof(input) == 'string') return input;
	else  return `${(input).toLocaleString()}` 
});

site.filter("checkNull", (arr) => {
	// Loop through the array
	for (const a of arr) {
		// If value isn't defined in a, fail.
		if (typeof a.value === undefined || a.value == null) {
			return 0;
		}  
	}
	// Otherwise success.
	return 1;
});

// Lume 3
site.add([".js"]);

site.add("/_data/ranked_constituencies.csv");


// Make a variable that is available to beforeRender
let apiresults = {};
site.addEventListener("beforeBuild", async (event) => {
	apiresults = await getAPIData(event);
});
site.addEventListener("beforeRender", (event) => {
	for(let i = 0; i < event.pages.length; i++){
		// Provide the API results to the index page generator
		if(event.pages[i].src.path == "/index" && event.pages[i].src.ext == ".page.js"){
			event.pages[i].data.api = apiresults;
		}
	}
});

export default site;
