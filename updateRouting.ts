import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const newMappings = {
    'Soft Copy of Certificate': 'Gemalyn Cabral',
    'Hard Copy of Certificate': 'Angeline Villanueva',
    'Shopee Courier/ Delivery': 'Angeline Villanueva',
    'Enrollment/ Post-test': 'Arvin Lim',
    'Other Operations concerns': 'Paul Alado'
  };

  const { error } = await supabase
    .from('routing')
    .update({ mappings: newMappings })
    .eq('department', 'Operations');

  if (error) {
    console.error("Error updating Operations routing:", error);
  } else {
    console.log("Successfully updated Operations routing!");
  }
}

run();
