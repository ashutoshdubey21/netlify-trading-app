// Serverless Netlify Function — inserts leads into Postgres (Neon) using DATABASE_URL env var
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      // keep connections low in serverless environment
      max: 1,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const phone = body.phone ? body.phone.trim() : null;
    const amount = body.amount ? body.amount : null;
    const state = body.state ? body.state.trim() : null;

    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid name or email' }),
      };
    }

    const pool = getPool();
    const sql = `INSERT INTO leads (name, email, phone, amount, state, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`;
    const values = [name, email, phone || null, amount || null, state || null];

    const result = await pool.query(sql, values);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Lead saved', id: result.rows[0].id }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' }),
    };
  }
};