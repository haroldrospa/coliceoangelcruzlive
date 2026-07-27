import { rawFetch } from './src/lib/supabase.js';

const testFetch = async () => {
  try {
    console.log('Testing cartelera_fights fetch...');
    const data = await rawFetch('cartelera_fights?select=*&order=numero_pelea.asc');
    console.log('cartelera_fights success, count:', data.length);
    
    console.log('Testing events fetch...');
    const events = await rawFetch('events?select=*');
    console.log('events success, count:', events.length);
  } catch (err) {
    console.error('FETCH ERROR DETAIL:', err.message || err);
  }
};

testFetch();
