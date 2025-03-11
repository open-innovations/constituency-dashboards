// let url = "https://constituencies.open-innovations.org/themes/society/child-poverty/map_1.json";
import { fetchAll, fetchOne } from "./assets/js/fetch.js"

// Define URLs with data we want to grab
// let myUrls = [
//     "https://constituencies.open-innovations.org/themes/society/child-poverty/map_1.json",
//     "https://constituencies.open-innovations.org/themes/society/child-poverty/map_2.json",
//     "https://constituencies.open-innovations.org/themes/economy/broadband/average_download_speeds.json"
// ];

// async function fetchData() {
//     try {
//         let res = await fetch(url);
//         let jsonData = await res.json();
//         return jsonData;
//     } catch (err) {
//         console.log("Error: ", err);
//         return null;
//     }
// }

// export default async function* () {
//     let map = await fetchData();
//     const title = map.title;
//     const notes = map.notes;
//     yield {
//         url: `/child-poverty/`,
//         layout: "template/layout.vto",
//         content: `<h1>${title}</h1><p>${notes}</p>`
//     }
// }


// async function fetchAll(urls) {
//     let promises = urls.map(url => fetch(url).then(res => res.json()));
//     let results = await Promise.all(promises);
//     return results;
//   }

// export const layout = 'template/visPage.vto';
// export const tags = ['visualisation'];

export default async function* () {
    let index = await fetchOne("https://constituencies.open-innovations.org/themes/index.json");
    for (const [theme, themeData] of Object.entries(index.themes)) {
        yield {
            url: `/${themeData.title}/`,
            title: themeData.title,
            layout: 'template/themePage.vto',
            tags: 'themes',
            themeData,
            theme
        };
        let dataURLs = [];
        for (const v of themeData.visualisations) {
            dataURLs.push(v.url);
        }
        let mapData = await fetchAll(dataURLs);
        for (const map of mapData) {
            yield {
                url: `/${theme}/${map.title}/`,
                title: map.title,
                layout: 'template/visPage.vto',
                tags: 'visualisations',
                map
            };
        }
    }
    
}