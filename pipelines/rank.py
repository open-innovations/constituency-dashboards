import pandas as pd
import json

if __name__ == "__main__":
    # Read data
    data = pd.read_csv("data/constituencies.csv", index_col=['PCON24CD'])
    # Make values numeric
    data['Value'] = pd.to_numeric(data['Value'], errors='coerce')
    # Add a rank column
    data["rank"] = data.groupby(["Theme", "Title", 'Subtitle'])['Value'].rank(ascending=False, method='dense')
    # Add a percentile column
    data["pct"] = data.groupby(["Theme", "Title", 'Subtitle'])['Value'].rank(ascending=False, method='dense', pct=True)
    data['pct'] = data['pct'].round(3)
    # Count the number of "titles" for each theme, aka the number of constituencies for each statistic
    data['count'] = data.groupby(["Theme", 'Title', 'Subtitle'])['Value'].transform('nunique')
    # Write to CSV
    data.to_csv('data/ranked_constituencies.csv')
    # Reset the index
    data.reset_index(inplace=True)
    # Build nested dictionary
    nested = {}
    for _, row in data.iterrows():
        region = row['PCON24CD']
        theme = row['Theme']
        title = row['Title']
        subtitle = row['Subtitle']
        rank = row['rank']
        count = row['count']
        pct = row['pct']

        if not pd.isna(row['rank']):
            nested\
                .setdefault(region, {})\
                .setdefault(theme, {})\
                .setdefault(title, {})[subtitle] = {
                    "r": rank,
                    "c": count,
                    "p": pct,
                }

    # Convert to JSON
    with open("src/_data/ranked_constituencies.json", 'w') as f:
        json.dump(nested, f)
