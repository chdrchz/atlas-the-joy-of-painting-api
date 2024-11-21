-- First, delete duplicate records in child tables
WITH ranked_paintings AS (
  SELECT 
    painting_id, 
    title, 
    image_url,
    ROW_NUMBER() OVER (PARTITION BY title, image_url ORDER BY painting_id) AS row_num
  FROM paintings
),
duplicate_painting_ids AS (
  SELECT painting_id 
  FROM ranked_paintings 
  WHERE row_num > 1
)
-- Delete related records in child tables first
DELETE FROM colors WHERE painting_id IN (SELECT painting_id FROM duplicate_painting_ids);
DELETE FROM episodes WHERE painting_id IN (SELECT painting_id FROM duplicate_painting_ids);
DELETE FROM painting_features WHERE painting_id IN (SELECT painting_id FROM duplicate_painting_ids);

-- Then delete duplicate paintings
WITH ranked_paintings AS (
  SELECT 
    painting_id, 
    title, 
    image_url,
    ROW_NUMBER() OVER (PARTITION BY title, image_url ORDER BY painting_id) AS row_num
  FROM paintings
)
DELETE FROM paintings
WHERE painting_id IN (
  SELECT painting_id 
  FROM ranked_paintings 
  WHERE row_num > 1
);