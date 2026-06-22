import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function createMetricsTable() {
  console.log("Creating metrics table...");
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS metrics (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        component_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_metrics_lookup
        ON metrics (workflow_id, component_id, metric_name, created_at DESC);
    `
  });

  if (error) {
    console.log("Note: RPC method not available. Please run the SQL manually in Supabase Dashboard.");
    console.log("Go to: Supabase Dashboard → SQL Editor → New Query");
    console.log("Paste the contents of: supabase/migrations/create_metrics_table.sql");
    console.log("\nAlternatively, trying direct table check...");
    
    // Check if table already exists by trying to query it
    const { error: queryError } = await supabase.from('metrics').select('id').limit(1);
    if (!queryError) {
      console.log("✅ metrics table already exists!");
    } else if (queryError.message.includes('does not exist')) {
      console.log("❌ metrics table does not exist yet. Please create it manually via the SQL Editor.");
      console.log("\nSQL to run:");
      console.log(fs.readFileSync('supabase/migrations/create_metrics_table.sql', 'utf8'));
    } else {
      console.log("Table status:", queryError.message);
    }
  } else {
    console.log("✅ metrics table created successfully!");
  }
}

createMetricsTable();
