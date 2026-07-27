const supabaseUrl = 'https://znhvjpyvdawmapxreypq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaHZqcHl2ZGF3bWFweHJleXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTUxNDMsImV4cCI6MjA5MDI5MTE0M30.Zj4eIauG_Ej0KmEj4g3YiCQvbXKK9dqvXvcZuoYZtTA';

async function trySQL() {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: "ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'ARCHIVED';" })
    });
    
    if (response.ok) {
        console.log("SUCCESS: Enum updated");
    } else {
        const err = await response.text();
        console.log("FAILED: " + err);
    }
  } catch (e) {
    console.error(e);
  }
}

trySQL();
