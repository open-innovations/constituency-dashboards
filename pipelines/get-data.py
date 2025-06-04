import requests
import pandas as pd
import os
# Get the index
# Get list of current codes.
# Iterate through the themes
# Iterate through the visualisations
# If the code is in the data, add it to a dict
# Create dataframes.
# Do ranking

def get_url_as_json(url):
    # Make the GET request
    response = requests.get(url)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse the JSON response
        json_data = response.json()
        return json_data
    else:
        print(f"Error: {response.status_code}")
        return None
    
def get_current_constituencies():
    # Get the hexjson
    hexjson = get_url_as_json("https://open-innovations.org/projects/hexmaps/maps/uk-constituencies-2023.hexjson")
    # Select the hexes
    hexes = hexjson['hexes']
    # Create a list of codes
    current_codes = [code for code, data in hexes.items()]
    return current_codes

def update_dictionary(dct, keys, new_key, new_value):
    """
    Updates a nested dictionary by traversing the given keys and setting a new key-value pair
    at the final level. Creates intermediate dictionaries as needed.

    Parameters:
        dct (dict): The dictionary to update.
        keys (list): A list of keys representing the path to traverse or create in the dictionary.
        new_key (str): The key to set at the final nested level.
        new_value (any): The value to assign to `new_key`.

    Example:
        d = {}
        update_dictionary(d, ['x', 'y'], 'z', 100)
        # Result: {'x': {'y': {'z': 100}}}
    """
    current = dct
    # Traverse or create nested structure
    for key in keys:
        if key not in current:
            current[key] = {}
        current = current[key]

    # Assign the final key-value pair
    current[new_key] = new_value


def make_data_dictionary(index):
    assert index != None, "Index is none" # Ensure index has some values
    # Iterate through "themes"
    dashboard = {}
    for theme, content in index['themes'].items():
        title = content['title']
        desc = content['description']
        print(title, desc)
        for v in content['visualisations']:
            this_vis_url = v['url']
            this_vis_data = get_url_as_json(this_vis_url)
            # print(this_vis_data)
            assert this_vis_data != None, "Couldnt get vis data"
            for pconcd, con_data in this_vis_data['data']['constituencies'].items():
                # print(this_vis_data['values'][0]['label'])
                myArr = []
                titleKey = this_vis_data['title']
                # Use the value key from this_vis_data to access the specific variable we want from each constituency
                for i in range(len(this_vis_data['values'])):
                    newKey = this_vis_data['values'][i]['label']
                    try:
                        newValue = {
                            "measure": newKey, 
                            "value": con_data[this_vis_data['values'][i]['value']]
                        }
                    except KeyError:
                        continue   
                    myArr.append(newValue)

                update_dictionary(dashboard, [pconcd, theme], titleKey, myArr)

    return dashboard

def main():
    index = get_url_as_json('https://constituencies.open-innovations.org/themes/index.json')
    codes = get_current_constituencies()
    db = make_data_dictionary(index)
    # Normalize the data
    normalized_data = {
        'PCON24CD': [],
        'Theme': [],
        'Title': [],
        'Subtitle': [],
        'Value': []
    }
    for key, value in db.items():
        for category, subcategory in value.items():
            for name, data in subcategory.items():
                for d in data:
                    normalized_data['PCON24CD'].append(key)
                    normalized_data['Theme'].append(category)
                    normalized_data['Title'].append(name)
                    normalized_data['Subtitle'].append(d['measure'])
                    normalized_data['Value'].append(d['value'])
    # Create DataFrame
    df = pd.DataFrame(normalized_data)

    # Display the DataFrame
    df.set_index('PCON24CD', inplace=True)

    # Ensure directory exists
    OUTDIR = 'data/temp'
    os.makedirs(OUTDIR, exist_ok=True)
    
    df.to_csv(os.path.join(OUTDIR, 'constituencies.csv'))

main()