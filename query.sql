SELECT 
    paintings.title, 
    colors.color, 
    colors.color_hex
FROM paintings 
JOIN colors ON paintings.painting_id = colors.painting_id
ORDER BY paintings.title, colors.color;