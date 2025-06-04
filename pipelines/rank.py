import pandas as pd
import json

if __name__ == "__main__":
    # Read data
    data = pd.read_csv("data/temp/constituencies.csv", index_col=['PCON24CD'])
    # Make values numeric
    data['Value'] = pd.to_numeric(data['Value'], errors='coerce')
    # Add a rank column
    # data["rank"] = data.groupby(["Theme", "Title", 'Subtitle'])['Value'].rank(ascending=False, method='dense')
    # Add a percentile column
    data["pct"] = data.groupby(["Theme", "Title", 'Subtitle'])['Value'].rank(ascending=False, method='dense', pct=True)
    data['pct'] = data['pct'].round(3)
    
    # Count the number of subtitles for a given title.
    data['count'] = data.groupby(["Theme", 'Title'])['Subtitle'].transform('nunique')

    # Write to CSV
    data.to_csv('src/_data/ranked_constituencies.csv')
    # Reset the index
    data.reset_index(inplace=True)
    # Build output dictionary
    output = {}
    for _, row in data.iterrows():
        
        # @TODO If the value looks like a year (time-series), then don't add a rating.

        region = row['PCON24CD']
        theme = row['Theme']
        title = row['Title']
        subtitle = row['Subtitle']
        # rank = row['rank']
        # count = row['count']
        pct = row['pct']
        
        if pd.isna(row['pct']):
            # If the pct value is NA, continue to next row.
            continue
        
        output\
            .setdefault(region, {})\
            .setdefault(theme, {})\
            .setdefault(title, {})[subtitle] = pct #{
                # "r": rank,
                # "c": count,
                # "p": pct,
            # }

    # Convert to JSON
    with open("src/_data/ranked_constituencies.json", 'w') as f:
        # Separators removes whitespace.
        json.dump(output, f, separators=(',', ':'))
