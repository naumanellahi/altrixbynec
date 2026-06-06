import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlbsuxxogzbyegtknpxg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYnN1eHhvZ3pieWVndGtucHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MTAzNzcsImV4cCI6MjA4NjA4NjM3N30.3huRqv7Y0cq1rL0gX_wT3rl4DFJndqRVqLFv_fsAf3o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('Logging in...');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'beaconryk@gmail.com',
    password: 'Principal888'
  });

  const schoolId = '70b40b4e-ae36-4c1e-82b0-61e08dc5d4d8';

  const res = await supabase.from('user_roles')
    .select('user_id, role, profiles!inner(display_name)')
    .eq('school_id', schoolId)
    .eq('role', 'teacher');

  console.log('Error:', res.error);
  console.log('Data:', res.data);
}

inspect();
