# Bob Ross Episodes API

## Database Schema

The API uses a PostgreSQL database with the following structure:

```sql
-- Create 'paintings' table
CREATE TABLE paintings (
    painting_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url TEXT
);

-- Create 'colors' table
CREATE TABLE colors (
    color_id SERIAL PRIMARY KEY,
    painting_id INT NOT NULL,
    color_hex CHAR(7) NOT NULL,
    color VARCHAR(50),
    FOREIGN KEY (painting_id) REFERENCES paintings (painting_id)
);

-- Create 'episodes' table
CREATE TABLE episodes (
    episode_id SERIAL PRIMARY KEY,
    painting_id INT NOT NULL,
    episode_number INT NOT NULL,
    air_date INT NOT NULL,
    season INT NOT NULL,
    youtube_url TEXT,
    FOREIGN KEY (painting_id) REFERENCES paintings (painting_id)
);

-- Create 'features' table
CREATE TABLE features (
    feature_id SERIAL PRIMARY KEY,
    feature_name TEXT NOT NULL UNIQUE
);

-- Create 'painting_features' table
CREATE TABLE painting_features (
    painting_id INT NOT NULL,
    feature_id INT NOT NULL,
    value BOOLEAN NOT NULL,
    FOREIGN KEY (painting_id) REFERENCES paintings (painting_id),
    FOREIGN KEY (feature_id) REFERENCES features (feature_id),
    PRIMARY KEY (painting_id, feature_id)
);
```

## API Endpoints

### Get Filtered Episodes

`GET /api/episodes`

#### Query Parameters

|
 Parameter 
|
 Type 
|
 Description 
|
 Example 
|
|
-----------
|
------
|
-------------
|
----------
|
|
`colors`
|
 string 
|
 Comma-separated list of colors 
|
 "Black,White,Brown" 
|
|
`features`
|
 string 
|
 Comma-separated list of features 
|
 "tree,mountain,lake" 
|
|
`month`
|
 string 
|
 Comma-separated list of months (1-12) 
|
 "1,12" 
|
|
`matchType`
|
 string 
|
 Match type: 'all' or 'any' (default: 'all') 
|
 "all" 
|

#### Example Requests

Find episodes with both trees and mountains that use blue:
```bash
curl "http://localhost:3000/api/episodes?features=tree,mountain&colors=blue&matchType=all"
```

Find episodes with either trees OR lakes OR aired in January:
```bash
curl "http://localhost:3000/api/episodes?features=tree,lake&month=1&matchType=any"
```

Find episodes that use both black and white colors:
```bash
curl "http://localhost:3000/api/episodes?colors=black,white&matchType=all"
```

#### Response Format

```json
{
  "filters_applied": {
    "colors": ["blue"],
    "features": ["tree", "mountain"],
    "months": [],
    "match_type": "all"
  },
  "total_matches": 1,
  "episodes": [
    {
      "episode": {
        "season": 3,
        "number": 12,
        "air_date": "4/12/1983"
      },
      "painting": {
        "id": 67,
        "title": "Mountain Stream",
        "features": ["tree", "mountain", "stream"],
        "colors": ["Blue", "Green", "Brown"]
      }
    }
  ]
}
```

## Setup

1. Ensure PostgreSQL is installed and running
2. Create the database tables using the provided schema
3. Install dependencies:
    ```bash
    npm install express pg
    ```
4. Configure database connection in `db/db.js`
5. Start the server:
    ```bash
    node server.js
    ```

The server will start on port 3000 by default. You can modify the port by setting the `PORT` environment variable.

## Notes

- Case-insensitive searching for colors and features
- Dates are stored as Unix timestamps and converted to local date strings in responses
- All responses are formatted with proper indentation
- `matchType=all`: Results include episodes matching every specified criterion
- `matchType=any`: Results include episodes matching at least one criterion

## Error Handling

|
 Status Code 
|
 Description 
|
|
-------------
|
-------------
|
|
 200 
|
 Successful request with results (even if no matches found) 
|
|
 500 
|
 Internal Server Error with error message in response 
|

## Example Query Generation

Sample SQL query for finding episodes with specific features (ALL match):

```sql
SELECT painting_id 
FROM painting_features pf
JOIN features f ON pf.feature_id = f.feature_id 
WHERE f.feature_name = ANY(ARRAY['tree', 'mountain'])
AND pf.value = TRUE
GROUP BY painting_id 
HAVING COUNT(DISTINCT f.feature_name) = 2;
```