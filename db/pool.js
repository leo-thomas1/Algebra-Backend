const { Pool } = require('pg');

const pool = new Pool({
  user: 'algebra1',
  host: 'algebra1.ctqaoyew8pt1.ap-south-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'Merinjai',
  port: 5432, // Default PostgreSQL port
});
module.exports = pool;
