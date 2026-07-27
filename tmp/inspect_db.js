const supabaseUrl = 'https://znhvjpyvdawmapxreypq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaHZqcHl2ZGF3bWFweHJleXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTUxNDMsImV4cCI6MjA5MDI5MTE0M30.Zj4eIauG_Ej0KmEj4g3YiCQvbXKK9dqvXvcZuoYZtTA';

async function check() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/events?select=*&limit=1`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

check();
