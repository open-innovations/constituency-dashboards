import pandas as pd
import json

if __name__ == "__main__":
    # Read data
    data = pd.read_csv("data/constituencies.csv", index_col=['PCON24CD'])
    # Make values numeric
    data['Value'] = pd.to_numeric(data['Value'], errors='coerce')
    # Add a rank column
    data["rank"] = data.groupby(["Theme", "Title"])['Value'].rank(ascending=False, method='dense')
    # Write to CSV
    data.to_csv('data/ranked_constituencies.csv')
    # Reset the index
    data.reset_index(inplace=True)
    # Set dictionary variable
    rank = {}
    # iterate through the dataframe
    for _, row in data.iterrows():
        # get data
        cd = row['PCON24CD']
        th = row['Theme']
        ti = row['Title']
        # Create dictionaries if they don't exist
        if cd not in rank:
            rank[cd] = {}
        if th not in rank[cd]:
            rank[cd][th] = {}
        # If ranking is not NAN, add it to the dictionary
        if not pd.isna(row['rank']):
            rank[cd][th][ti] = {"rank": row['rank']}
    # Write to file
    with open("src/_data/ranked_constituencies.json", 'w') as f:
        json.dump(rank, f)
