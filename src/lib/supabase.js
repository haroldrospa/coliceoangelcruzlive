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

// SAFE SETTINGS UPSERT HELPER (Avoid 409 duplicate key errors)
export const upsertSetting = async (id, value) => {
  try {
    const stringVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const existing = await rawFetch(`settings?id=eq.${id}`);
    if (existing && existing.length > 0) {
      await rawFetch(`settings?id=eq.${id}`, {
        method: 'PATCH',
        body: { value: stringVal }
      });
    } else {
      await rawFetch('settings', {
        method: 'POST',
        body: { id, value: stringVal }
      });
    }
  } catch(e) {
    console.warn(`upsertSetting [${id}] notice:`, e);
  }
};

// REALTIME BROADCAST STATUS HELPER
export const broadcastEventStatus = async (postNumber, status, eventId = null, winnerSide = null, winnerName = null, updatedAt = null, winnerWeight = null) => {
  try {
    const channel = supabase.channel('arena_realtime');
    const nowIso = updatedAt || new Date().toISOString();
    await channel.send({
      type: 'broadcast',
      event: 'fight_status_change',
      payload: { 
        post_number: postNumber, 
        status, 
        id: eventId, 
        winner_side: winnerSide, 
        winner_name: winnerName,
        winner_weight: winnerWeight,
        updated_at: nowIso,
        betting_started_at: Date.now()
      }
    });
  } catch (e) {
    console.warn('Broadcast status warning:', e);
  }
};

// CENTRALIZED BET RESOLUTION SYSTEM
export const resolveBetsForEvent = async (eventId, winnerSide, postNumber = '') => {
  try {
    let targetEventId = eventId;
    let fightNum = postNumber;

    if (!targetEventId && postNumber) {
      const evs = await rawFetch(`events?select=*&post_number=eq.${postNumber}`);
      if (evs && evs[0]) {
        targetEventId = evs[0].id;
      }
    } else if (targetEventId && !fightNum) {
      const evs = await rawFetch(`events?select=*&id=eq.${targetEventId}`);
      if (evs && evs[0]) {
        fightNum = evs[0].post_number;
      }
    }

    if (!targetEventId) {
      console.warn('resolveBetsForEvent: Target event not found');
      return { success: false, resolvedCount: 0 };
    }

    // Fetch all PENDING bets for this event
    const pendingBets = await rawFetch(`bets?select=*&event_id=eq.${targetEventId}&status=eq.PENDING`);

    if (!pendingBets || !Array.isArray(pendingBets) || pendingBets.length === 0) {
      console.log(`resolveBetsForEvent: No pending bets for event ${targetEventId}`);
      return { success: true, resolvedCount: 0 };
    }

    const isDraw = winnerSide === 'D' || winnerSide === 'DRAW' || winnerSide === 'Tablas';
    const payoutsByUser = {};

    for (const bet of pendingBets) {
      let isWinner = false;
      let payoutAmount = 0;
      let newStatus = 'LOST';
      let txDescription = '';

      if (isDraw) {
        isWinner = true;
        payoutAmount = parseFloat(bet.amount);
        newStatus = 'REFUNDED';
        txDescription = `Reembolso Tablas Pelea #${fightNum || 'N/A'}`;
      } else if (bet.selected_side === winnerSide) {
        isWinner = true;
        payoutAmount = parseFloat(bet.amount) * parseFloat(bet.odds_at_bet);
        newStatus = 'WON';
        txDescription = `Premio Pelea #${fightNum || 'N/A'} (Gallo ${winnerSide === 'A' ? 'AZUL' : 'BLANCO'})`;
      } else {
        newStatus = 'LOST';
      }

      await rawFetch(`bets?id=eq.${bet.id}`, {
        method: 'PATCH',
        body: { status: newStatus }
      });

      if (isWinner && payoutAmount > 0) {
        if (!payoutsByUser[bet.user_id]) {
          payoutsByUser[bet.user_id] = 0;
        }
        payoutsByUser[bet.user_id] += payoutAmount;

        await rawFetch('transactions', {
          method: 'POST',
          body: {
            user_id: bet.user_id,
            amount_change: payoutAmount.toFixed(2),
            type: 'BET_PAYOUT',
            description: txDescription
          }
        });
      }
    }

    // Process bulk user balance updates
    for (const userId of Object.keys(payoutsByUser)) {
      const payoutSum = payoutsByUser[userId];
      const userArr = await rawFetch(`users?select=balance&id=eq.${userId}`);
      if (userArr && userArr[0]) {
        const currentBal = parseFloat(userArr[0].balance || '0');
        const updatedBal = (currentBal + payoutSum).toFixed(2);
        await rawFetch(`users?id=eq.${userId}`, {
          method: 'PATCH',
          body: { balance: updatedBal }
        });
      }
    }

    // Send Broadcast signal to update clients immediately
    try {
      const channel = supabase.channel('arena_realtime');
      await channel.send({
        type: 'broadcast',
        event: 'bets_resolved',
        payload: { event_id: targetEventId, winner_side: winnerSide, payoutsByUser }
      });
    } catch (bcErr) {
      console.warn('Broadcast send error:', bcErr);
    }

    return { success: true, resolvedCount: pendingBets.length };
  } catch (err) {
    console.error('Error resolving bets for event:', err);
    throw err;
  }
};

