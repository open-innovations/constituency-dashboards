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

import oiVizConfig from "./oi-viz-config.ts";
site.use(oiViz(oiVizConfig));

// Register an HTML processor
// https://lume.land/docs/core/processors/
site.process([".html"], (pages) => {
	let p = 0;
	for (const page of pages) {
		// Try zapping some data to free up memory?
		//page.data.figures = null;
		//page.data.ranked_constituencies = null;
		page.text = page.text.replace(/\t+/g,"\t");//.replace(/\s+/g,' ');
		p++;
		console.log('Processed page: '+p);
	}
});

site.use(base_path());

site.use(date(/* Options */));
site.use(favicon({input: "/assets/img/favicon.png"}));
site.add("/assets/img");
site.add("/assets/fonts");
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
    if (typeof(input) == 'string') {
        return input;
    } else {
        return `${(input).toLocaleString()}` 
    }
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
