const express = require('express');
const app = express();
const pool = require('./db/db.js');

app.get('/api/episodes', async (req, res) => {
    try {
        const { colors, features, month, matchType = 'all' } = req.query;
        
        // Convert inputs to arrays
        const colorList = colors ? colors.split(',').map(c => c.trim()) : [];
        const featureList = features ? features.split(',').map(f => f.trim()) : [];
        const monthList = month ? month.split(',').map(m => parseInt(m.trim())) : [];

        let query = `
            SELECT DISTINCT 
                p.painting_id,
                p.title,
                e.episode_id,
                e.episode_number,
                e.season,
                e.air_date,
                array_agg(DISTINCT c.color) as colors,
                array_agg(DISTINCT f.feature_name) as features
            FROM paintings p
            JOIN episodes e ON p.painting_id = e.painting_id
            LEFT JOIN colors c ON p.painting_id = c.painting_id
            LEFT JOIN painting_features pf ON p.painting_id = pf.painting_id
            LEFT JOIN features f ON pf.feature_id = f.feature_id
            WHERE 1=1
        `;

        const queryParams = [];
        let paramCount = 1;

        if (matchType === 'all') {
            // ALL conditions must match
            if (colorList.length > 0) {
                queryParams.push(colorList);
                query += `
                    AND p.painting_id IN (
                        SELECT painting_id 
                        FROM colors 
                        WHERE color = ANY($${paramCount})
                        GROUP BY painting_id 
                        HAVING COUNT(DISTINCT color) = ${colorList.length}
                    )`;
                paramCount++;
            }

            if (featureList.length > 0) {
                queryParams.push(featureList);
                query += `
                    AND p.painting_id IN (
                        SELECT pf.painting_id 
                        FROM painting_features pf
                        JOIN features f ON pf.feature_id = f.feature_id 
                        WHERE f.feature_name = ANY($${paramCount})
                        AND pf.value = TRUE
                        GROUP BY pf.painting_id 
                        HAVING COUNT(DISTINCT f.feature_name) = ${featureList.length}
                    )`;
                paramCount++;
            }

            if (monthList.length > 0) {
                queryParams.push(monthList);
                query += `
                    AND EXTRACT(MONTH FROM TO_TIMESTAMP(e.air_date)::timestamp) = ANY($${paramCount})`;
                paramCount++;
            }
        } else {
            // ANY condition can match (union)
            const conditions = [];
            
            if (colorList.length > 0) {
                queryParams.push(colorList);
                conditions.push(`c.color = ANY($${paramCount})`);
                paramCount++;
            }

            if (featureList.length > 0) {
                queryParams.push(featureList);
                conditions.push(`(f.feature_name = ANY($${paramCount}) AND pf.value = TRUE)`);
                paramCount++;
            }

            if (monthList.length > 0) {
                queryParams.push(monthList);
                conditions.push(`EXTRACT(MONTH FROM TO_TIMESTAMP(e.air_date)::timestamp) = ANY($${paramCount})`);
                paramCount++;
            }

            if (conditions.length > 0) {
                query += ` AND (${conditions.join(' OR ')})`;
            }
        }

        query += `
            GROUP BY 
                p.painting_id,
                p.title,
                e.episode_id,
                e.episode_number,
                e.season,
                e.air_date
            ORDER BY e.season, e.episode_number
        `;

        const result = await pool.query(query, queryParams);

        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            filters_applied: {
                colors: colorList,
                features: featureList,
                months: monthList,
                match_type: matchType
            },
            total_matches: result.rows.length,
            episodes: result.rows.map(row => ({
                episode: {
                    season: row.season,
                    number: row.episode_number,
                    air_date: new Date(row.air_date * 1000).toLocaleDateString()
                },
                painting: {
                    id: row.painting_id,
                    title: row.title,
                    features: row.features.filter(f => f !== null),
                    colors: row.colors.filter(c => c !== null)
                }
            }))
        }, null, 2));

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});