import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Fix connection string format (Postgres.js/pg requires a standard postgres URI)
// We need to fetch the direct DB url, usually similar to the supabase url but different host and credentials.
// Wait, the process.env.VITE_SUPABASE_URL is an HTTPS REST URL. We need a Postgres connection string.
// VITE_SUPABASE_URL = "https://wzctdg...supabase.co"
// To connect via pg we need "postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

