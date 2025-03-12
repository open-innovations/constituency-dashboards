export async function fetchAll(urls) {
    let promises = urls.map(url => fetch(url).then(res => res.json()));
    let results = await Promise.all(promises);
    return results;
  }

// export async function fetchOne(url) {
//     try {
//         let res = await fetch(url);
//         let jsonData = await res.json();
//         return jsonData;
//     } catch (err) {
//         console.log("Error: ", err);
//         return null;
//     }
// }

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