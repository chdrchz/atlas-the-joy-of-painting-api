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
    value BOOLEAN NOT NULL,  -- Boolean value: TRUE or FALSE
    FOREIGN KEY (painting_id) REFERENCES paintings (painting_id),
    FOREIGN KEY (feature_id) REFERENCES features (feature_id),
    PRIMARY KEY (painting_id, feature_id)  -- Ensures uniqueness for each painting-feature combination
);