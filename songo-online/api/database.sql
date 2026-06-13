-- ============================================
-- SONGO — Base de données
-- Exécuter dans phpMyAdmin (onglet SQL)
-- ============================================

CREATE DATABASE IF NOT EXISTS songo_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE songo_db;

CREATE TABLE IF NOT EXISTS games (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  game_code      VARCHAR(5)   NOT NULL UNIQUE,  -- Code hex 5 car. ex: C23AF
  board          VARCHAR(100) NOT NULL,          -- '5,5,5,...' (14 valeurs)
  score_sud      INT          DEFAULT 0,
  score_nord     INT          DEFAULT 0,
  current_player VARCHAR(4)   DEFAULT 'sud',    -- 'sud' ou 'nord'
  status         VARCHAR(10)  DEFAULT 'waiting', -- 'waiting','playing','finished'
  winner         VARCHAR(4)   DEFAULT NULL,      -- 'sud','nord','draw'
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  -- Nettoyage auto des vieilles parties (optionnel)
  INDEX idx_game_code (game_code),
  INDEX idx_status    (status)
);

-- Optionnel : supprimer les parties de plus de 24h
-- (à planifier via un cron job sur le serveur)
-- DELETE FROM games WHERE created_at < NOW() - INTERVAL 24 HOUR;
