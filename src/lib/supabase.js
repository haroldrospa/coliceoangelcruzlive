import { createClient } from '@supabase/supabase-js'

// PLATINUM HARDCODE FIX (Bypassing .env issues)
export const supabaseUrl = 'https://znhvjpyvdawmapxreypq.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaHZqcHl2ZGF3bWFweHJleXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTUxNDMsImV4cCI6MjA5MDI5MTE0M30.Zj4eIauG_Ej0KmEj4g3YiCQvbXKK9dqvXvcZuoYZtTA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
})

// UNIVERSAL TACTICAL BYPASS (Force apikey-in-headers to fix 406 Error)
export const rawFetch = async (endpoint, options = {}) => {
  const method = options.method || 'GET';
  const queryStr = options.query ? (endpoint.includes('?') ? `&${options.query}` : `?${options.query}`) : '';
  const url = `${supabaseUrl}/rest/v1/${endpoint}${queryStr}`;
  
  const headers = { 
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (method === 'POST' || method === 'PATCH') {
    headers['Prefer'] = 'return=representation';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    let detail = '';
    try {
        const errJson = JSON.parse(errorText);
        detail = errJson.message || errJson.error || errorText;
    } catch(e) { detail = errorText; }
    
    console.error(`Fetch API Error [${response.status}]:`, errorText);
    throw new Error(`Error ${response.status}: ${detail}`);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : { success: true };
  console.log(`[rawFetch] ${endpoint} SUCCESS:`, data);
  return data;
};

// AUTO-PROFILE SYNC: Ensures user exists in public.users
export const ensureUserProfile = async (user) => {
  if (!user) return null;
  try {
    const profile = await rawFetch(`users?id=eq.${user.id}`);
    if (!profile || profile.length === 0) {
      console.log('Profile missing, creating...');
      const newProfile = await rawFetch('users', {
        method: 'POST',
        body: { id: user.id, email: user.email, balance: 1000.00, role: 'user' }
      });
      return newProfile[0];
    }
    return profile[0];
  } catch (e) {
    console.error('Core Sync Err:', e);
    return null;
  }
};
