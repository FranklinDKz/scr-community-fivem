UPDATE products
SET image_url = 'assets/creative-v6-cover.svg',
    gallery = '[{"url":"assets/creative-reference.png","type":"image","caption":"Apresentação original da Creative V6 na ScR Store."}]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'creative-v6';

UPDATE products
SET image_url = 'assets/standalone-cover.svg',
    gallery = '[{"url":"assets/standalone-reference.png","type":"image","caption":"Apresentação original da Base Standalone na ScR Store."}]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'standalone';
