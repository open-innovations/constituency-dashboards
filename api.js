

export async function fetchIt(url) {
    try {
        let promise = fetch(url).then(res => res.json());
        let result = await Promise.resolve(promise);
        return result;
    } catch (err) {
        console.log("Error: ", err);
        return null;
    }
}
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
function getItem(v){
	return fetchIt(v.url).then((value) => {
		v.json = value;
	});
}
export default async function getAPIData(page){
	
	// Get the index of all API data.
	console.log("Get API index");
	let index = await fetch("https://constituencies.open-innovations.org/themes/index.json").then(res => res.json());
	if(index == null){
		console.error("Failed to get index.");
		return;
	}
	
	// Looping over each theme
	var promises = [];
	for (const [theme, themeData] of Object.entries(index.themes)) {
		console.log("Theme: "+theme);
		if(1){ // (DEV && theme == "energy") || !DEV
			// Looping through the visualisations (which have URL, title, attribution)
			for (const v of themeData.visualisations) {
				console.log("\tGetting: "+v.title);
				// Adding a URL for the individual page
				v.slug = "/" + slugifyString(theme) + "/" + slugifyString(v.title) + "/";
				// Add the JSON data for that visualisation
				promises.push(getItem(v));
			}
		}
	}
	await Promise.all(promises);

	return index;
}
