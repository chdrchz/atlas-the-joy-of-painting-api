const fs = require("fs");
const csv = require("csv-parser");
const { Pool } = require("pg");

// PostgreSQL connection configuration
const pool = new Pool({
  user: "chdrchz",
  host: "localhost",
  database: "joy_of_painting",
  password: "root",
  port: 5432, 
});

const csvFilePath = "colors.csv";

const cleanArrayFromString = (arrayString) => {
  // Function to clean array from string, handling both colors and hex codes
  const cleanedArray = JSON.parse(arrayString.replace(/'/g, '"'));
  return cleanedArray.map((item) => item.trim());
};

const findOrInsertPainting = async (client, title, img_url) => {
  try {
    // First, check if the painting already exists
    const existingPaintingQuery = `
      SELECT painting_id 
      FROM paintings 
      WHERE title = $1 AND image_url = $2
    `;
    const existingPaintingResult = await client.query(existingPaintingQuery, [title, img_url]);

    // If painting exists, return its ID
    if (existingPaintingResult.rows.length > 0) {
      console.log(`Painting already exists: ${title}`);
      return existingPaintingResult.rows[0].painting_id;
    }

    // If painting doesn't exist, insert it
    const insertPaintingQuery = `
      INSERT INTO paintings (title, image_url) 
      VALUES ($1, $2) 
      RETURNING painting_id
    `;
    const insertResult = await client.query(insertPaintingQuery, [title, img_url]);
    
    console.log(`Inserted new painting: ${title}`);
    return insertResult.rows[0].painting_id;
  } catch (error) {
    console.error(`Error finding/inserting painting ${title}:`, error);
    throw error;
  }
};

const findOrInsertEpisode = async (client, paintingId, seasonNumber, episodeNumber, youtubeUrl) => {
  try {
    // Check if the episode already exists
    const existingEpisodeQuery = `
      SELECT episode_id 
      FROM episodes 
      WHERE painting_id = $1 
        AND season = $2 
        AND episode_number = $3
    `;
    const existingEpisodeResult = await client.query(existingEpisodeQuery, [
      paintingId, 
      seasonNumber, 
      episodeNumber
    ]);

    // If episode exists, return its ID
    if (existingEpisodeResult.rows.length > 0) {
      console.log(`Episode already exists: Season ${seasonNumber}, Episode ${episodeNumber}`);
      return existingEpisodeResult.rows[0].episode_id;
    }

    // If episode doesn't exist, insert it
    const insertEpisodeQuery = `
      INSERT INTO episodes (painting_id, season, episode_number, air_date, youtube_url) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING episode_id
    `;
    const insertResult = await client.query(insertEpisodeQuery, [
      paintingId, 
      seasonNumber, 
      episodeNumber, 
      0,  // Placeholder for air_date
      youtubeUrl
    ]);
    
    console.log(`Inserted new episode: Season ${seasonNumber}, Episode ${episodeNumber}`);
    return insertResult.rows[0].episode_id;
  } catch (error) {
    console.error(`Error finding/inserting episode for painting ${paintingId}:`, error);
    throw error;
  }
};

const findOrInsertColor = async (client, paintingId, colorName, colorHex) => {
  try {
    // Ensure hex code starts with '#'
    const formattedHex = colorHex.startsWith('#') 
      ? colorHex 
      : `#${colorHex}`;

    // Check if the color already exists for this painting
    const existingColorQuery = `
      SELECT color_id 
      FROM colors 
      WHERE painting_id = $1 
        AND color = $2
        AND color_hex = $3
    `;
    const existingColorResult = await client.query(existingColorQuery, [
      paintingId, 
      colorName, 
      formattedHex
    ]);

    // If color exists, return its ID
    if (existingColorResult.rows.length > 0) {
      console.log(`Color already exists: ${colorName} for painting ${paintingId}`);
      return existingColorResult.rows[0].color_id;
    }

    // If color doesn't exist, insert it
    const insertColorQuery = `
      INSERT INTO colors (painting_id, color, color_hex) 
      VALUES ($1, $2, $3) 
      RETURNING color_id
    `;
    const insertResult = await client.query(insertColorQuery, [
      paintingId, 
      colorName, 
      formattedHex
    ]);
    
    console.log(`Inserted new color: ${colorName} for painting ${paintingId}`);
    return insertResult.rows[0].color_id;
  } catch (error) {
    console.error(`Error finding/inserting color ${colorName} for painting ${paintingId}:`, error);
    throw error;
  }
};

const processCSV = async () => {
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query('BEGIN');

    const rows = await new Promise((resolve, reject) => {
      const dataRows = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => dataRows.push(row))
        .on("end", () => resolve(dataRows))
        .on("error", (error) => reject(error));
    });

    console.log(`Processing ${rows.length} rows...`);

    for (const row of rows) {
      // Clean colors and hex codes arrays
      const cleanedColors = cleanArrayFromString(row.colors.trim());
      const cleanedHexCodes = cleanArrayFromString(row.color_hex.trim());
      
      const title = row.painting_title;
      const img_url = row.img_src;
      const seasonNumber = parseInt(row.season);
      const episodeNumber = parseInt(row.episode);
      const youtubeUrl = row.youtube_src;

      // Insert or find existing painting
      const paintingId = await findOrInsertPainting(client, title, img_url);

      // Insert or find existing episode
      await findOrInsertEpisode(
        client, 
        paintingId, 
        seasonNumber, 
        episodeNumber, 
        youtubeUrl
      );

      // Ensure colors and hex codes arrays have matching lengths
      if (cleanedColors.length !== cleanedHexCodes.length) {
        console.warn(`Mismatched colors and hex codes for painting: ${title}`);
        continue;
      }

      // Insert or find existing colors
      for (let i = 0; i < cleanedColors.length; i++) {
        await findOrInsertColor(
          client, 
          paintingId, 
          cleanedColors[i], 
          cleanedHexCodes[i]
        );
      }
    }

    // Commit the transaction
    await client.query('COMMIT');

    console.log("Data processing completed successfully!");
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error("Error processing CSV:", error);
  } finally {
    // Release the client back to the pool
    client.release();
    await pool.end();
  }
};

processCSV();
