const fs = require("fs");
const readline = require('readline');
const { Pool } = require("pg");

// PostgreSQL connection configuration
const pool = new Pool({
  user: "chdrchz",
  host: "localhost",
  database: "joy_of_painting",
  password: "root",
  port: 5432,
});

const csvFilePath = "episodes.csv";

// Function to parse the date string and extract month
const parseAirDate = (dateString) => {
  // Updated regex to match date regardless of what comes after
  const dateMatch = dateString.match(/\(([A-Za-z]+)\s+(\d+),\s+(\d{4})\)/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    try {
      // Convert month name to number (1-12)
      const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;
      return {
        month: monthNumber,
        day: parseInt(day),
        year: parseInt(year)
      };
    } catch (error) {
      console.error(`Error parsing date: ${dateString}`);
      return null;
    }
  }
  return null;
};

// Function to parse the title with more flexible matching
const parseTitle = (line) => {
  const titleMatch = line.match(/"([^"]+)"/);
  if (!titleMatch) {
    console.log(`Could not find title in line: ${line}`);
    return null;
  }
  return titleMatch[1].trim();
};

const updateEpisodeAirDate = async (paintingTitle, airDate) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');  // Start transaction

    // First find the painting_id and check if it already has an air date
    const checkQuery = `
      SELECT paintings.painting_id, episodes.air_date 
      FROM paintings 
      LEFT JOIN episodes ON paintings.painting_id = episodes.painting_id
      WHERE paintings.title = $1
    `;
    
    const checkResult = await client.query(checkQuery, [paintingTitle]);
    
    if (checkResult.rows.length === 0) {
      console.log(`No painting found with title: ${paintingTitle}`);
      await client.query('COMMIT');
      return;
    }

    const paintingId = checkResult.rows[0].painting_id;
    const existingAirDate = checkResult.rows[0].air_date;

    // If air_date already exists and matches, skip update
    if (existingAirDate === airDate.month) {
      console.log(`Air date already up to date for "${paintingTitle}" (month ${airDate.month})`);
      await client.query('COMMIT');
      return;
    }

    // If air_date is different or null, update it
    const updateQuery = `
      UPDATE episodes 
      SET air_date = $1 
      WHERE painting_id = $2 
      RETURNING episode_id
    `;

    const result = await client.query(updateQuery, [airDate.month, paintingId]);
    
    if (result.rows.length > 0) {
      if (existingAirDate) {
        console.log(`Updated air date for "${paintingTitle}" from month ${existingAirDate} to ${airDate.month}`);
      } else {
        console.log(`Set air date for "${paintingTitle}" to month ${airDate.month}`);
      }
    } else {
      console.log(`No episode found for painting: ${paintingTitle}`);
    }

    await client.query('COMMIT');  // Commit transaction

  } catch (error) {
    await client.query('ROLLBACK');  // Rollback on error
    console.error(`Error updating air date for ${paintingTitle}:`, error);
  } finally {
    client.release();
  }
};

const processAirDates = async () => {
  // Keep track of processed paintings to avoid duplicates
  const processedPaintings = new Set();

  try {
    // Create readline interface
    const fileStream = fs.createReadStream(csvFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    // Process each line
    for await (const line of rl) {
      // Skip empty lines
      if (!line.trim()) continue;

      const title = parseTitle(line);
      if (!title) {
        continue; // Skip lines where we couldn't parse the title
      }

      const airDate = parseAirDate(line);
      if (!airDate) {
        console.log(`Could not parse date in line: ${line}`);
        continue;
      }

      // Log the parsed data for verification
      console.log(`Parsed: "${title}" - Month: ${airDate.month}, Day: ${airDate.day}, Year: ${airDate.year}`);

      // Check if we've already processed this painting
      if (processedPaintings.has(title)) {
        console.log(`Skipping duplicate entry for "${title}"`);
        continue;
      }

      await updateEpisodeAirDate(title, airDate);
      processedPaintings.add(title);
    }

    console.log("Air date processing completed!");
    console.log(`Total unique paintings processed: ${processedPaintings.size}`);

  } catch (error) {
    console.error("Error processing air dates:", error);
  } finally {
    await pool.end();
  }
};

// Execute the script
processAirDates();