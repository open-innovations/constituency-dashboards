import { fetchIt } from "../assets/js/fetch.js";
let constituencies = [{"PCON24CD":"E14000530", "PCON24NM": "Aldershot"},{"PCON24CD":"E14000531", "PCON24NM": "Aldridge-Brownhills"}];
let url = "https://constituencies.open-innovations.org/themes/economy/house-prices/map_2.json";
export default async function* () {
    for (const con of constituencies) {
        const index = await fetchIt(url);
        const value = index.value;
        const title = index.title;
        const mapValue = index.data.constituencies[con.PCON24CD];
        yield {
            url: `/dashboard/${con.PCON24CD}/`,
            layout: 'template/dashboard.vto',
            title: con.PCON24NM,
            tags: 'dashboard',
            figureTitle: title,
            figure: mapValue[value]
        };
    }
}
