import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkRecentTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, customerId, email, department, status')
    .order('createdAt', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Recent Tickets:", JSON.stringify(data, null, 2));
  }
}

checkRecentTickets();
