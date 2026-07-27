const supabaseUrl = 'https://znhvjpyvdawmapxreypq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaHZqcHl2ZGF3bWFweHJleXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTUxNDMsImV4cCI6MjA5MDI5MTE0M30.Zj4eIauG_Ej0KmEj4g3YiCQvbXKK9dqvXvcZuoYZtTA';

async function testStatus() {
  try {
    const id = "eccfaefc-6ad2-4ac3-bd1b-84747305e445"; // Existing ID from previous check
    const response = await fetch(`${supabaseUrl}/rest/v1/events?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ status: 'ARCHIVED' })
    });
    
    if (response.ok) {
        console.log("SUCCESS: ARCHIVED is allowed");
    } else {
        const err = await response.text();
        console.log("FAILED: " + err);
    }
  } catch (e) {
    console.error(e);
  }
}

testStatus();
