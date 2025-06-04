import lume from "lume/mod.ts";
import base_path from "lume/plugins/base_path.ts";
import favicon from "lume/plugins/favicon.ts";
import google_fonts from "lume/plugins/google_fonts.ts";
import nav from "lume/plugins/nav.ts";
import postcss from "lume/plugins/postcss.ts";

// Importing the OI Lume charts and utilities
import oiViz from "https://deno.land/x/oi_lume_viz@v0.17.0/mod.ts";
import autoDependency from "https://deno.land/x/oi_lume_utils@v0.4.0/processors/auto-dependency.ts";
import jsonLoader from "lume/core/loaders/json.ts";
import oiVizConfig from "./oi-viz-config.ts";
import date from "lume/plugins/date.ts";


const site = lume({
    src: "./src",
    location: new URL("https://open-innovations.github.io/constituency-api-test"),
	emptyDest: false,
});

// Register an HTML processor
// https://lume.land/docs/core/processors/
site.process([".html"], (pages) => pages.forEach(autoDependency));

site.use(base_path());
site.use(google_fonts({
    fonts: "https://fonts.google.com/share?selection.family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900"
}));
site.use(postcss());
site.use(oiViz(oiVizConfig));
site.use(date(/* Options */));
site.use(favicon({input: "/assets/img/favicon.png"}));
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
    // console.log(arr);
    for (const a of arr) {
        // If value isn't defined in a, fail.
        if (typeof a.value === undefined || a.value == null) {
            return 0;
        }  
    }
    // Otherwise success.
    return 1;
});

site.copy("/assets/js");

export default site;
