const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'db_alge',
  password: 'leo@123',
  port: 5432, // Default PostgreSQL port
});

module.exports = pool;
