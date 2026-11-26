const { Pool } = require('pg');

// Variables propias del gimnasio para que no herede por accidente otra base configurada en el entorno.
// Se conserva DB_USER/DB_PASSWORD como alternativa por compatibilidad con instalaciones locales.
const pool = new Pool({
  host: process.env.GYM_DB_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.GYM_DB_PORT || process.env.DB_PORT || 5432),
  database: process.env.GYM_DB_NAME || 'gimnasio_db',
  user: process.env.GYM_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.GYM_DB_PASSWORD || process.env.DB_PASSWORD
});

module.exports = pool;
