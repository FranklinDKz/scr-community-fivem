CREATE TABLE products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price >= 100),
  category TEXT NOT NULL CHECK(category IN ('base','script','service')),
  image_url TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  docs_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  features TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  gallery TEXT NOT NULL DEFAULT '[]',
  discord_role_id TEXT NOT NULL DEFAULT '',
  delivery_url TEXT NOT NULL DEFAULT '',
  license_ticket_url TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products(id,title,subtitle,price,category,image_url,label,docs_url,video_url,features,description,gallery,discord_role_id,delivery_url,license_ticket_url,published,sort_order) VALUES
('creative-v6','Creative V6','Uma cidade pronta para a sua história.',39990,'base','assets/creative-reference.png','Multi-framework','https://scr-community-1.gitbook.io/creative-v6-multi-framework','https://www.youtube.com/watch?v=y3J5HJMhcTg','["Núcleo no padrão Creative Network","Creative V5, vRP e vRPex","Temas SP ou RJ e pack de veículos BR","Smartphone, polícias e facções","Instalador ScR e licença por IP","Suporte permanente incluído"]','A base que reúne os sistemas essenciais para tirar sua cidade do papel. Baús, crafting, blips, fardas, veículos e locais configurados, com orientação da equipe ScR.','[]','1191845850436083722','https://dk-license-api.onrender.com/download/instalador','https://discord.gg/NBtdqHuw72',1,10),
('standalone','Standalone','Sua cidade. Suas regras. Seu controle.',79990,'base','assets/standalone-reference.png','Configuração in-game','https://scr-community.gitbook.io/base-standalone','https://www.youtube.com/watch?v=vs1_ygaER6M','["Gerenciamento de sistemas dentro do jogo","Baús, crafting, rotas e grupos","Polícia, hospital e mecânica","Tema, cores e identidade da cidade","Compatibilidade com múltiplos frameworks","Suporte permanente incluído"]','Mais autonomia para personalizar sua cidade. Ajuste sistemas, grupos e identidade visual dentro do jogo. Consulte a documentação para confirmar a compatibilidade dos seus scripts.','[]','1524550741312929812','https://dk-license-api.onrender.com/download/instalador','https://discord.gg/NBtdqHuw72',1,20);

ALTER TABLE users ADD COLUMN discord_id TEXT;
UPDATE users SET discord_id=id WHERE auth_provider='discord';
CREATE UNIQUE INDEX idx_users_discord_id ON users(discord_id) WHERE discord_id IS NOT NULL;

ALTER TABLE orders ADD COLUMN discord_role_status TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE orders ADD COLUMN discord_role_error TEXT;
