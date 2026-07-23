-- ExameQR — coordenadas da empresa (para o mapa do painel do dono).
-- Preenchidas por geocodificação do endereço (OpenStreetMap/Nominatim).
alter table empresas add column if not exists lat double precision;
alter table empresas add column if not exists lng double precision;
