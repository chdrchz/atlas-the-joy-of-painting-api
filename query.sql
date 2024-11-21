SELECT 
    paintings.title,
    episodes.season,
    episodes.episode_number,
    episodes.youtube_url
FROM paintings 
JOIN episodes ON paintings.painting_id = episodes.painting_id
WHERE paintings.title = 'Autumn Glory';