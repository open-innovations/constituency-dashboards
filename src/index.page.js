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

function colorIsDarkSimple(bgColor) {
    let color = (bgColor.charAt(0) === '#') ? bgColor.substring(1, 7) : bgColor;
    let r = parseInt(color.substring(0, 2), 16); // hexToR
    let g = parseInt(color.substring(2, 4), 16); // hexToG
    let b = parseInt(color.substring(4, 6), 16); // hexToB
    return ((r * 0.299) + (g * 0.587) + (b * 0.114)) <= 100;
}
// @TODO work on above to improve.

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
        // As we're looping through the visualisations, we want to store the vis data per constituency and then eventually yield a page for each one.
        for (const vis of themeData.visualisations) {
            const rows = [];
            // Only build the page if there is json content
            if (vis.json != null) {
                for (const [PCON24CD, constituencyData] of Object.entries(vis.json.data.constituencies)){ // Reshape data
                    rows.push(constituencyData); // Reshape the data to a form that OI lume viz is happy with.
                    let myArr = [];
                    const titleKey = vis.json.title;
                    for (let i=0;i<vis.json.values.length;i++) {
                        const newKey = vis.json.values[i].label;
                        let unit = "units" in vis.json && newKey in vis.json.units ? vis.json.units[newKey] : {};
                        if (unit.category == 'currency' && unit.value=='GBP'){ 
                            unit = {'pre':'&pound;'};
                        } else if (unit.value=='percent') {
                            unit = {'post':'%'};
                        } 
                        else {
                            unit={};
                        }
                        const newValue = {
                            "measure": newKey, 
                            "x": i,
                            "value": constituencyData[vis.json.values[i].value], 
                            "preunit": unit.pre,
                            "postunit": unit.post,
                            "metadata": {"date": vis.json.data.date} };
                        myArr.push(newValue);
                    }
                    updateDictionary(dashboard, [PCON24CD, theme], titleKey, myArr); // Updates the dashboard dictionary. It adds {newKey: newValue} at the level given by [keys].
                }
            } else {
                console.log(vis);
            }
            // Create the visualisation page only if it has a title to make the unique url
            if (vis.title.length > 0) {
                yield {
                    url: vis.slug,
                    title: vis.title,
                    layout: 'template/visPage.vto',
                    tags: 'visualisations',
                    map: vis.json,
                    columns: vis.json.data.virtualColumns || [],
                    rows,
                    theme
                };
            }
        }
    }
    const hexjson = await fetchIt("https://open-innovations.org/projects/hexmaps/maps/uk-constituencies-2023.hexjson");
    const hexes = hexjson.hexes;
    for (const [code, data] of Object.entries(dashboard)){
        // console.log(code);
        if (hexes[code] != null) {
            const bgColour = hexes[code]['colour'];
            const textColour = colorIsDarkSimple(bgColour) ? '#FFFFFF' : '#000000';
            yield {
                url: `/constituencies/${code}/`,
                layout: 'template/constituencies.vto',
                title: hexes[code]['n'],
                bgColour: hexes[code]['colour'],
                fontColour: textColour,
                tags: 'constituency',
                figures: data,
                region: hexes.region,
                code
            };
        }
        
    }
}
