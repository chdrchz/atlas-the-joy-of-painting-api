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

const insertPainting = async (title, img_url) => {
  try {
    // Check if the painting already exists
    const existingPainting = await pool.query(
      "SELECT painting_id FROM paintings WHERE title = $1 AND image_url = $2",
      [title, img_url]
    );

    // If painting exists, return its existing ID
    if (existingPainting.rows.length > 0) {
      return existingPainting.rows[0].painting_id;
    }

    // If painting doesn't exist, insert it
    const result = await pool.query(
      "INSERT INTO paintings (title, image_url) VALUES ($1, $2) RETURNING painting_id",
      [title, img_url]
    );
    return result.rows[0].painting_id;
  } catch (error) {
    console.error("Error inserting/checking painting:", error);
    throw error;
  }
};

const insertColor = async (paintingId, colorName, colorHex) => {
  try {
    // Ensure hex code starts with '#'
    const formattedHex = colorHex.startsWith('#') 
      ? colorHex 
      : `#${colorHex}`;
    
    await pool.query(
      "INSERT INTO colors (painting_id, color, color_hex) VALUES ($1, $2, $3)",
      [paintingId, colorName, formattedHex]
    );
    console.log(`Inserted color: ${colorName} (${formattedHex}) for painting ${paintingId}`);
  } catch (error) {
    console.error("Error inserting color:", error);
  }
};

const processCSV = async () => {
  try {
    const rows = []; 
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
          rows.push(row);
        })
        .on("end", () => resolve())
        .on("error", (error) => reject(error));
    });
 
    console.log("CSV file successfully parsed. Starting data insertion...");
 
    for (const row of rows) {
      // Clean colors and hex codes arrays
      const cleanedColors = cleanArrayFromString(row.colors.trim());
      const cleanedHexCodes = cleanArrayFromString(row.color_hex.trim());
      
      const title = row.painting_title;
      const img_url = row.img_src;
 
      const paintingId = await insertPainting(title, img_url);
 
      // Ensure colors and hex codes arrays have matching lengths
      if (cleanedColors.length !== cleanedHexCodes.length) {
        console.warn(`Mismatched colors and hex codes for painting: ${title}`);
        continue;
      }
 
      // Insert each color with its corresponding hex code
      for (let i = 0; i < cleanedColors.length; i++) {
        await insertColor(paintingId, cleanedColors[i], cleanedHexCodes[i]);
      }
    }
 
    console.log("All data inserted successfully!");
  } catch (error) {
    console.error("Error processing CSV:", error);
  } finally {
    await pool.end();
  }
};

processCSV();
