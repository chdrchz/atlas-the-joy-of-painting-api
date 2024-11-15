-- Create 'paintings' table
CREATE TABLE IF NOT EXISTS paintings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    season INTEGER NOT NULL,
    episode INTEGER NOT NULL,
    image_url TEXT,
    youtube_url TEXT
);

-- Create 'colors' table
CREATE TABLE IF NOT EXISTS colors (
    id SERIAL PRIMARY KEY,
    color_name VARCHAR(100) NOT NULL,
    color_hex CHAR(7) NOT NULL -- For color code in format "#RRGGBB"
);

-- Create 'painting_colors' table (Many-to-Many relationship between paintings and colors)
CREATE TABLE IF NOT EXISTS painting_colors (
    painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE,
    color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
    used BOOLEAN,
    PRIMARY KEY (painting_id, color_id)
);

-- Create 'features' table
CREATE TABLE IF NOT EXISTS features (
    id SERIAL PRIMARY KEY,
    feature_name VARCHAR(255) NOT NULL
);

-- Create 'painting_features' table (Many-to-Many relationship between paintings and features)
CREATE TABLE IF NOT EXISTS painting_features (
    painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE,
    feature_id INTEGER REFERENCES features(id) ON DELETE CASCADE,
    PRIMARY KEY (painting_id, feature_id)
);

-- Create 'episodes' table (This can be linked to paintings)
CREATE TABLE IF NOT EXISTS episodes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    painting_id INTEGER REFERENCES paintings(id) ON DELETE CASCADE
);