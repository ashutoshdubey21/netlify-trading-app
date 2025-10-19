// Simple Express API -> Postgres (Neon) using connection string from env
require('dotenv').config();
const path = require('path');
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
// serve static site
app.use(express.static(path.join(__dirname)));

const connectionString = process.env.DATABASE_URL; // put your psql URL here in .env

if (!connectionString) {
  console.error('DATABASE_URL is not set. Exiting.');
  process.exit(1);
}

// many hosted Postgres providers require ssl; set rejectUnauthorized=false for dev/demo.
// For production, configure proper CA verification.
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

app.post('/api/lead', async (req, res) => {
  try {
    const { name, email, phone = null, amount = null, state = null } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

    const sql = `INSERT INTO leads (name, email, phone, amount, state, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`;
    const values = [name, email, phone || null, amount || null, state || null];

    const { rows } = await pool.query(sql, values);
    return res.json({ message: 'Lead saved', id: rows[0].id });
  } catch (err) {
    console.error('DB error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));