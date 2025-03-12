import { fetchAll, fetchIt } from "./assets/js/fetch.js"

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

export default async function* () {
    // Get the index of all API data.
    let index = await fetchIt("https://constituencies.open-innovations.org/themes/index.json");
    if (index == null) {
        console.error("Failed to get index.");
        return;
    }
    // Looping over each theme
    for (const [theme, themeData] of Object.entries(index.themes)) {
        // Looping through the visualisations (which have URL, title, attribution)
        for (const v of themeData.visualisations) {
            // Adding a URL for the individual page
            v.slug = "/" + slugifyString(theme) + "/" + slugifyString(v.title) + "/";
            // Add the JSON data for that visualisation
            v.json = await fetchIt(v.url);
        }
        // Now yield each theme page.
        yield {
            url: `/${slugifyString(theme)}/`,
            title: themeData.title,
            layout: 'template/themePage.vto',
            tags: 'themes',
            // This gets used in the themePage.vto to create a list of visualisations using themeData.visualisations[].slug
            themeData,
            theme
        };
        // Loop through each vis and create its page.
        for (const vis of themeData.visualisations) {
            const rows = [];
            // Only build the page if there is json content
            if (vis.json != null) {
                //  Reshape the data to a form that OI lume viz is happy with.
                for (const [key, value] of Object.entries(vis.json.data.constituencies)){
                    rows.push(value);
                }
            }
            // Create the visualisation page.
            yield {
                url: vis.slug,
                title: vis.title,
                layout: 'template/visPage.vto',
                tags: 'visualisations',
                map: vis.json,
                rows
            };
        }
    } 
}
