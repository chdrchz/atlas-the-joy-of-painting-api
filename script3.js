const fs = require("fs");
const csv = require("csv-parser");
const { Pool } = require("pg");

const pool = new Pool({
  user: "chdrchz",
  host: "localhost",
  database: "joy_of_painting",
  password: "root",
  port: 5432,
});

const csvFilePath = "subject_matter.csv";

// Set to track processed paintings
const processedPaintings = new Set();

// Function to clean the feature name
const cleanFeatureName = (name) => {
  return name
    .replace(/_/g, ' ')
    .toLowerCase()
    .trim();
};

// Function to clean and lowercase the painting title
const cleanPaintingTitle = (title) => {
  return title.replace(/^"|"$/g, '').trim().toLowerCase();
};

const insertFeature = async (client, featureName) => {
  try {
    // First check if feature exists
    const checkQuery = `
      SELECT feature_id 
      FROM features 
      WHERE feature_name = $1
    `;
    
    const existingFeature = await client.query(checkQuery, [featureName]);
    
    if (existingFeature.rows.length > 0) {
      console.log(`Feature already exists: ${featureName}`);
      return existingFeature.rows[0].feature_id;
    }

    // If feature doesn't exist, insert it
    const insertQuery = `
      INSERT INTO features (feature_name)
      VALUES ($1)
      ON CONFLICT (feature_name) DO NOTHING
      RETURNING feature_id
    `;
    
    const result = await client.query(insertQuery, [featureName]);
    
    if (result.rows.length > 0) {
      console.log(`Inserted new feature: ${featureName}`);
      return result.rows[0].feature_id;
    } else {
      // Double-check for race conditions
      const doubleCheck = await client.query(checkQuery, [featureName]);
      return doubleCheck.rows[0].feature_id;
    }
  } catch (error) {
    console.error(`Error inserting/getting feature ${featureName}:`, error);
    throw error;
  }
};

const insertPaintingFeature = async (client, paintingId, featureId, value) => {
  try {
    // First check if painting-feature combination exists
    const checkQuery = `
      SELECT painting_id, feature_id, value
      FROM painting_features
      WHERE painting_id = $1 AND feature_id = $2
    `;
    
    const existingFeature = await client.query(checkQuery, [paintingId, featureId]);
    
    if (existingFeature.rows.length > 0) {
      if (existingFeature.rows[0].value === value) {
        console.log(`Feature value already set correctly for painting ${paintingId}, feature ${featureId}`);
        return;
      }
      console.log(`Updating existing feature value for painting ${paintingId}, feature ${featureId}`);
    }

    // Insert or update the feature value
    const query = `
      INSERT INTO painting_features (painting_id, feature_id, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (painting_id, feature_id) 
      DO UPDATE SET value = $3
      WHERE painting_features.value IS DISTINCT FROM $3
    `;
    
    await client.query(query, [paintingId, featureId, value]);
  } catch (error) {
    console.error(`Error inserting painting feature ${featureId} for painting ${paintingId}:`, error);
    throw error;
  }
};

const processFeatures = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Store feature names and their IDs
    const featureIds = {};
    
    // Read and process CSV
    const rows = [];
    let headers = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('headers', (headerRow) => {
          headers = headerRow.slice(2).map(cleanFeatureName);
        })
        .on('data', row => rows.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log('Processing features...');
    
    // Insert all features first
    for (const featureName of headers) {
      const featureId = await insertFeature(client, featureName);
      featureIds[featureName] = featureId;
      console.log(`Processed feature: ${featureName} with ID: ${featureId}`);
    }

    console.log('Processing paintings...');

    // Process each row
    for (const row of rows) {
      const paintingTitle = cleanPaintingTitle(row['TITLE']);
      
      // Skip if already processed
      if (processedPaintings.has(paintingTitle)) {
        console.log(`Skipping duplicate painting: ${paintingTitle}`);
        continue;
      }

      // Get painting_id using lowercase title
      const paintingResult = await client.query(
        'SELECT painting_id FROM paintings WHERE LOWER(title) = $1',
        [paintingTitle]
      );

      if (paintingResult.rows.length === 0) {
        console.log(`No painting found with title: ${paintingTitle}`);
        continue;
      }

      const paintingId = paintingResult.rows[0].painting_id;

      // Process each feature for this painting
      for (const featureName of headers) {
        const columnName = featureName.toUpperCase().replace(/ /g, '_');
        const value = row[columnName] === '1';
        await insertPaintingFeature(client, paintingId, featureIds[featureName], value);
      }

      processedPaintings.add(paintingTitle);
      console.log(`Processed features for painting: ${paintingTitle}`);
    }

    await client.query('COMMIT');
    console.log(`Successfully processed ${processedPaintings.size} paintings`);
    console.log(`Total features processed: ${Object.keys(featureIds).length}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing features:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

processFeatures();