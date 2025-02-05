const { Pool } = require('pg');

const pool = new Pool({
  user: 'algebra1',
  host: 'myorder-db.xyz123.region.rds.amazonaws.com',
  database: 'postgres',
  password: 'Merinjai',
  port: 5432, // Default PostgreSQL port
});
module.exports = pool;
