import lume from "lume/mod.ts";
import base_path from "lume/plugins/base_path.ts";
import favicon from "lume/plugins/favicon.ts";
import google_fonts from "lume/plugins/google_fonts.ts";
import nav from "lume/plugins/nav.ts";
import postcss from "lume/plugins/postcss.ts";

// Importing the OI Lume charts and utilities
import oiViz from "https://deno.land/x/oi_lume_viz@v0.16.11/mod.ts";
import autoDependency from "https://deno.land/x/oi_lume_utils@v0.4.0/processors/auto-dependency.ts";
import jsonLoader from "lume/core/loaders/json.ts";
import oiVizConfig from "./oi-viz-config.ts";


const site = lume({
    src: "./src",
    location: new URL("https://open-innovations.github.io/constituency-api-test"),
});

// Register an HTML processor
// https://lume.land/docs/core/processors/
site.process([".html"], (pages) => pages.forEach(autoDependency));

site.use(base_path());
site.use(google_fonts({
    fonts: "https://fonts.google.com/share?selection.family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900"
}));
site.use(nav());
site.use(postcss());
site.use(oiViz(oiVizConfig));

site.loadData([".hexjson"], jsonLoader);

site.remoteFile("_data/hexjson/constituencies.hexjson", "https://github.com/open-innovations/constituencies/raw/refs/heads/main/src/_data/hexjson/constituencies.hexjson");
site.remoteFile("_data/hexjson/uk-constituencies-2023-temporary.hexjson", "https://github.com/open-innovations/constituencies/raw/refs/heads/main/src/_data/hexjson/uk-constituencies-2023-temporary.hexjson");
site.remoteFile("_data/hexjson/uk-constituencies-2024.hexjson", "https://github.com/open-innovations/constituencies/raw/refs/heads/main/src/_data/hexjson/uk-constituencies-2024.hexjson");

site.filter("dump", (Object) => {
    return JSON.stringify(Object);
});

site.filter("capitalise", (x: string) => {
    if (!x) return x; // Handle empty strings
    return x.charAt(0).toUpperCase() + x.slice(1);
});

site.filter("formatRank", (num: number) => {
    if (num == null) {return null};
    const strNum = Math.abs(num).toString();
    const lastDigit = strNum.slice(-1);
    const lastTwoDigits = strNum.slice(-2);
    if (lastTwoDigits == "11" || lastTwoDigits == "12" || lastTwoDigits == "13") {
        return strNum + "<sup>th</sup>";}
    else if (lastDigit=="1") {return strNum + '<sup>st</sup>'}
    else if (lastDigit=="2") {return strNum + '<sup>nd</sup>'}
    else if (lastDigit=="3") {return strNum + '<sup>rd</sup>'}
    else { return strNum + '<sup>th</sup>'}
});

site.filter("slugify", (str: string) => {
    if (!str) return str; // Handle empty strings
    return str
        .toLowerCase().trim() // Convert to lowercase and trim whitespace
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric characters with hyphens
        .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
});

site.filter("formatNumber");

site.copy("/assets/js/filterList.js");
export default site;
