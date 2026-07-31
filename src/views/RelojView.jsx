import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Typography, Space, Row, Col, InputNumber, Switch, Table, Input, Radio, Tag, Tooltip, Select, App as AntApp, Modal } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  RedoOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined, 
  DeleteOutlined, 
  SoundOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  SmileOutlined,
  ControlOutlined,
  EditOutlined,
  PictureOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { supabase, rawFetch, broadcastEventStatus, resolveBetsForEvent, upsertSetting } from '../lib/supabase';

const { Title, Text } = Typography;
const { Option } = Select;

// Synthesize custom sound themes for celebration
const playCelebrationSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'victory') {
      // Arpeggio sound for victory
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major chord arpeggio
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);
        
        gainNode.gain.setValueAtTime(0, now + index * 0.12);
        gainNode.gain.linearRampToValueAtTime(0.2, now + index * 0.12 + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.6);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.7);
      });
    } else if (type === 'draw') {
      // Harmonious, mysterious chord for draw
      const freqs = [349.23, 440.00, 523.25, 587.33]; // F Major 6th
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.0);
      });
    }
  } catch (e) {
    console.error('Celebration audio failed:', e);
  }
};

const playSynthesizedSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'bell') {
      const now = ctx.currentTime;
      const frequencies = [440, 554.37, 659.25, 880];
      const gains = [0.5, 0.3, 0.2, 0.1];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gainNode.gain.setValueAtTime(gains[index], now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.1);
      });
    } else if (type === 'buzzer') {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(120, now);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(122, now);
      gainNode.gain.setValueAtTime(0.4, now);
      gainNode.gain.setValueAtTime(0.4, now + 1.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.6);
      osc2.stop(now + 1.6);
    } else if (type === 'warning') {
      const now = ctx.currentTime;
      [0, 0.3].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + delay);
        gainNode.gain.setValueAtTime(0.3, now + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });
    }
  } catch (err) {
    console.error('Audio synthesis failed:', err);
  }
};

export default function RelojView() {
  const { message } = AntApp.useApp();
  
  // Custom states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [presetDuration, setPresetDuration] = useState(600); // 10 minutes in seconds
  const [timeLeft, setTimeLeft] = useState(600); // Remaining countdown
  const [elapsedTime, setElapsedTime] = useState(0); // Elapsed countup
  const [isRunning, setIsRunning] = useState(false);
  
  // Careo / Sub-timers state
  const [subTimeLeft, setSubTimeLeft] = useState(null); // null or seconds remaining (red clock)
  const [subTimerLabel, setSubTimerLabel] = useState('');
  const [pauseMainOnSub, setPauseMainOnSub] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [scoreboardStyle, setScoreboardStyle] = useState(() => localStorage.getItem('scoreboard_style') || 'broadcast'); // 'modern', 'arena', 'broadcast'
  
  // Rooster Photos state
  const [fotoAzul, setFotoAzul] = useState(null);
  const [fotoBlanco, setFotoBlanco] = useState(null);
  
  // Active fight details
  const [fightNumber, setFightNumber] = useState(1);
  const [gallinoName, setGallinoName] = useState('');
  const [blancoName, setBlancoName] = useState('');
  
  // Weights and extra info
  const [pesoAzul, setPesoAzul] = useState('');
  const [colorAzul, setColorAzul] = useState('');
  const [marcaAzul, setMarcaAzul] = useState('');
  
  const [pesoBlanco, setPesoBlanco] = useState('');
  const [colorBlanco, setColorBlanco] = useState('');
  const [marcaBlanco, setMarcaBlanco] = useState('');

  // Cartelera & Local Results state
  const [carteleraFights, setCarteleraFights] = useState([]);
  const [loadingCartelera, setLoadingCartelera] = useState(false);
  const [fightResults, setFightResults] = useState(() => {
    const saved = localStorage.getItem('fight_results_reloj');
    return saved ? JSON.parse(saved) : {};
  });

  // Dynamic Celebration Overlay state
  const [celebration, setCelebration] = useState(null); // null or { type: 'Azul' | 'Blanco' | 'Tablas', title: string, subtitle: string }
  
  // Betting phase state (2-minute countdown before fight starts)
  const [bettingPhase, setBettingPhase] = useState(false);
  const [bettingTimeLeft, setBettingTimeLeft] = useState(120);
  const bettingTimerRef = useRef(null);
  
  // Refs
  const timerRef = useRef(null);
  const subTimerRef = useRef(null);
  const containerRef = useRef(null);
  const channelRef = useRef(null);

  // Initialize Realtime Channel for instant live broadcasting
  useEffect(() => {
    const channel = supabase.channel('chat_live', {
      config: { broadcast: { self: true } }
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      try { supabase.removeChannel(channel); } catch(_) {}
    };
  }, []);

  // Fetch cartelera fights
  const fetchCartelera = async () => {
    setLoadingCartelera(true);
    try {
      const data = await rawFetch('cartelera_fights?select=*&order=numero_pelea.asc');
      if (data) {
        setCarteleraFights(data);
        const events = await rawFetch('events?select=*');
        
        // Build fightResults from Supabase finished events to stay 100% in sync
        const dbResults = {};
        if (events) {
          const finishedEvents = events.filter(e => e.status === 'FINISHED');
          const localResults = JSON.parse(localStorage.getItem('fight_results_reloj') || '{}');
          for (const ev of finishedEvents) {
            const num = parseInt(ev.post_number);
            if (num) {
              const winnerSideMap = { 'A': 'Azul', 'B': 'Blanco', 'D': 'Tablas' };
              dbResults[num] = {
                result: winnerSideMap[ev.winner_side] || 'Tablas',
                duration: localResults[num]?.duration || '-',
                timestamp: ev.updated_at ? new Date(ev.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'
              };
            }
          }
        }
        setFightResults(dbResults);
        localStorage.setItem('fight_results_reloj', JSON.stringify(dbResults));

        // Sync local to DB (fallback in case some local result was registered offline)
        const localResults = JSON.parse(localStorage.getItem('fight_results_reloj') || '{}');
        for (const f of data) {
          const resultInfo = localResults[f.numero_pelea];
          if (resultInfo) {
            const ev = events ? events.find(e => parseInt(e.post_number) === f.numero_pelea) : null;
            if (!ev || ev.status !== 'FINISHED') {
              const winnerSideMap = { 'Azul': 'A', 'Blanco': 'B', 'Tablas': 'D' };
              const winnerSide = winnerSideMap[resultInfo.result] || 'D';
              
              const weightA = JSON.stringify({ weight: `${f.peso_libras_a}-${f.peso_onzas_a}.${f.peso_puntos_a}`, color: f.color_a, marca: f.marca_a, clase: f.clase_a, turno: f.turno_a });
              const weightB = JSON.stringify({ weight: `${f.peso_libras_b}-${f.peso_onzas_b}.${f.peso_puntos_b}`, color: f.color_b, marca: f.marca_b, clase: f.clase_b, turno: f.turno_b });

              const payload = {
                post_number: f.numero_pelea.toString(),
                gallo_a_name: f.traba_a,
                gallo_b_name: f.traba_b,
                gallo_a_weight: weightA,
                gallo_b_weight: weightB,
                gallo_a_odds: 1.9,
                gallo_b_odds: 1.9,
                status: 'FINISHED',
                winner_side: winnerSide
              };
              try {
                if (ev) {
                  await rawFetch(`events`, { method: 'PATCH', body: payload, query: `id=eq.${ev.id}` });
                } else {
                  await rawFetch('events', { method: 'POST', body: payload });
                }
              } catch (syncErr) {
                console.error("Cartelera sync fight error:", syncErr);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching cartelera:', err);
      message.error('No se pudo cargar la cartelera de Supabase');
    } finally {
      setLoadingCartelera(false);
    }
  };

  useEffect(() => {
    fetchCartelera();

    // Load initial clock state from localStorage to resume if tab was closed/refreshed
    const isRun = localStorage.getItem('clock_running') === 'true';
    const startedAt = localStorage.getItem('clock_started_at');
    const totalDuration = parseInt(localStorage.getItem('clock_total_duration') || '600', 10);
    const elapsedPaused = parseInt(localStorage.getItem('clock_elapsed_paused') || '0', 10);

    setPresetDuration(totalDuration);

    if (isRun && startedAt) {
      const now = new Date().getTime();
      const delta = Math.floor((now - parseInt(startedAt, 10)) / 1000);
      const currentElapsed = elapsedPaused + delta;
      
      if (currentElapsed >= totalDuration) {
        setElapsedTime(totalDuration);
        setTimeLeft(0);
        setIsRunning(false);
        localStorage.setItem('clock_running', 'false');
      } else {
        setElapsedTime(currentElapsed);
        setTimeLeft(totalDuration - currentElapsed);
        setIsRunning(true);
      }
    } else {
      setElapsedTime(elapsedPaused);
      setTimeLeft(totalDuration - elapsedPaused);
      setIsRunning(false);
    }

    // Load sub-timer state
    const subRun = localStorage.getItem('sub_running') === 'true';
    const subStartedAt = localStorage.getItem('sub_started_at');
    const subTotal = parseInt(localStorage.getItem('sub_total_duration') || '0', 10);
    const subLabelVal = localStorage.getItem('sub_timer_label') || '';

    if (subRun && subStartedAt && subTotal > 0) {
      const now = new Date().getTime();
      const delta = Math.floor((now - parseInt(subStartedAt, 10)) / 1000);
      const remaining = subTotal - delta;
      if (remaining <= 0) {
        setSubTimeLeft(null);
        setSubTimerLabel('');
        localStorage.setItem('sub_running', 'false');
      } else {
        setSubTimerLabel(subLabelVal);
        setSubTimeLeft(remaining);
      }
    }
    // Restore active fight context from Supabase on page load/refresh
    // NOTE: Restores display data AND resumes betting phase if still active.
    const restoreActiveFight = async () => {
      try {
        const clockRunning = localStorage.getItem('clock_running') === 'true';
        // 1. Check if there's an active betting phase in localStorage first
        const bettingActive = localStorage.getItem('betting_active') === 'true';
        const bettingStartedAt = parseInt(localStorage.getItem('betting_started_at') || '0', 10);
        const bettingTotal = parseInt(localStorage.getItem('betting_total') || '120', 10);
        const bettingFightNum = parseInt(localStorage.getItem('betting_fight_number') || '0', 10);

        if (bettingActive && bettingStartedAt > 0) {
          const elapsed = Math.floor((new Date().getTime() - bettingStartedAt) / 1000);
          const remaining = bettingTotal - elapsed;

          if (remaining > 0) {
            // Betting phase still active — resume it
            setBettingPhase(true);
            setBettingTimeLeft(remaining);
            if (bettingFightNum > 0) setFightNumber(bettingFightNum);
            if (bettingTimerRef.current) clearInterval(bettingTimerRef.current);
            bettingTimerRef.current = setInterval(() => {
              const now = new Date().getTime();
              const newElapsed = Math.floor((now - bettingStartedAt) / 1000);
              const newRemaining = bettingTotal - newElapsed;
              if (newRemaining <= 0) {
                clearInterval(bettingTimerRef.current);
                setBettingPhase(false);
                localStorage.setItem('betting_active', 'false');
                upsertEvent(bettingFightNum, 'CLOSED');
                setBettingTimeLeft(0);
                return;
              }
              setBettingTimeLeft(newRemaining);
            }, 500);
          } else {
            // Betting phase expired while away — auto-close bets
            localStorage.setItem('betting_active', 'false');
            if (bettingFightNum > 0) {
              upsertEvent(bettingFightNum, 'CLOSED');
            }
          }
        }

        // 2. Restore fight display data from Supabase
        const activeEv = await rawFetch('events?select=*&status=in.(LIVE,CLOSED)&order=updated_at.desc&limit=1');
        if (activeEv && activeEv[0]) {
          const ev = activeEv[0];
          const num = parseInt(ev.post_number) || 1;

          setFightNumber(num);
          if (ev.gallo_a_name) setGallinoName(ev.gallo_a_name);
          if (ev.gallo_b_name) setBlancoName(ev.gallo_b_name);
          // Restore weight/color/marca from cartelera if available
          const savedCartelera = await rawFetch('cartelera_fights?select=*&numero_pelea=eq.' + num);
          if (savedCartelera && savedCartelera[0]) {
            const f = savedCartelera[0];
            setPesoAzul(`${f.peso_libras_a}-${f.peso_onzas_a}.${f.peso_puntos_a}`);
            setColorAzul(f.color_a || '');
            setMarcaAzul(f.marca_a || '');
            setPesoBlanco(`${f.peso_libras_b}-${f.peso_onzas_b}.${f.peso_puntos_b}`);
            setColorBlanco(f.color_b || '');
          }
        }

        // 3. Restore scoreboard design style from Supabase settings
        const styleSetting = await rawFetch('settings?id=eq.scoreboard_style');
        if (styleSetting && styleSetting[0] && styleSetting[0].value) {
          setScoreboardStyle(styleSetting[0].value);
          localStorage.setItem('scoreboard_style', styleSetting[0].value);
        }
      } catch (_) {}
    };
    restoreActiveFight();
  }, []);
  
  // Save local results helper
  const saveLocalResults = (newResults) => {
    setFightResults(newResults);
    localStorage.setItem('fight_results_reloj', JSON.stringify(newResults));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        message.error('No se pudo activar pantalla completa');
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen to fullscreen changes outside standard triggers
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Main timer handler (Counts down remaining time and counts up elapsed time based on absolute timestamps)
  useEffect(() => {
    if (isRunning) {
      const startedAt = parseInt(localStorage.getItem('clock_started_at') || new Date().getTime().toString(), 10);
      const elapsedPaused = parseInt(localStorage.getItem('clock_elapsed_paused') || '0', 10);
      const totalDuration = presetDuration;

      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const delta = Math.floor((now - startedAt) / 1000);
        const currentElapsed = elapsedPaused + delta;
        const currentRemaining = totalDuration - currentElapsed;

        if (currentElapsed >= totalDuration) {
          clearInterval(timerRef.current);
          setElapsedTime(totalDuration);
          setTimeLeft(0);
          setIsRunning(false);
          localStorage.setItem('clock_running', 'false');
          localStorage.setItem('clock_elapsed_paused', totalDuration.toString());
          playSynthesizedSound('bell');
          message.success('¡Tiempo de pelea agotado!');
        } else {
          setElapsedTime(currentElapsed);
          setTimeLeft(currentRemaining);
          if (currentRemaining === 60 || currentRemaining === 30) {
            playSynthesizedSound('warning');
          }
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, presetDuration, message]);

  // Handlers for rooster photo uploads
  const handleFotoAzulChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setFotoAzul(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFotoBlancoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setFotoBlanco(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Avatar rendering helper
  const renderRoosterAvatar = (side, photo) => {
    const isAzul = side === 'azul';
    const borderCol = isAzul ? '#0f3dd1' : '#ffffff';
    if (photo) {
      return (
        <img 
          src={photo} 
          style={{ 
            width: isFullscreen ? 120 : 80, 
            height: isFullscreen ? 120 : 80, 
            borderRadius: '50%', 
            objectFit: 'cover', 
            border: `3px solid ${borderCol}`,
            boxShadow: '0 6px 15px rgba(0,0,0,0.6)'
          }} 
          alt={`Gallo ${side}`} 
        />
      );
    }
    return (
      <div style={{
        width: isFullscreen ? 120 : 80,
        height: isFullscreen ? 120 : 80,
        borderRadius: '50%',
        background: isAzul ? 'linear-gradient(135deg, #0f2d8a 0%, #1e40af 100%)' : 'linear-gradient(135deg, #1f2937 0%, #4b5563 100%)',
        border: `3px solid ${borderCol}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 15px rgba(0,0,0,0.5)',
        fontSize: isFullscreen ? 56 : 38
      }}>
        🐓
      </div>
    );
  };

  // Secondary sub-timer handler (Careo/Tierra countdown in the middle red clock)
  useEffect(() => {
    if (subTimeLeft !== null && subTimeLeft > 0) {
      const subStartedAt = parseInt(localStorage.getItem('sub_started_at') || new Date().getTime().toString(), 10);
      const subTotal = parseInt(localStorage.getItem('sub_total_duration') || '60', 10);

      subTimerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const delta = Math.floor((now - subStartedAt) / 1000);
        const remaining = subTotal - delta;

        if (remaining <= 0) {
          clearInterval(subTimerRef.current);
          setSubTimeLeft(null);
          localStorage.setItem('sub_running', 'false');
          playSynthesizedSound('buzzer');
          message.info(`¡Tiempo de ${subTimerLabel} concluido!`);
          setShowOutcomeModal(true);
        } else {
          setSubTimeLeft(remaining);
        }
      }, 1000);
    } else {
      if (subTimerRef.current) clearInterval(subTimerRef.current);
    }

    return () => {
      if (subTimerRef.current) clearInterval(subTimerRef.current);
    };
  }, [subTimeLeft, subTimerLabel, message, setShowOutcomeModal]);

  const upsertEvent = async (fightNum, status, winnerSide = null) => {
    try {
      const fight = carteleraFights.find(f => f.numero_pelea === fightNum);
      const nameA = fight ? fight.traba_a : (fightNum === fightNumber ? gallinoName : 'Gallo Azul');
      const nameB = fight ? fight.traba_b : (fightNum === fightNumber ? blancoName : 'Gallo Blanco');
      const weightA = fight ? JSON.stringify({ weight: `${fight.peso_libras_a}-${fight.peso_onzas_a}.${fight.peso_puntos_a}`, color: fight.color_a, marca: fight.marca_a, clase: fight.clase_a, turno: fight.turno_a }) : '';
      const weightB = fight ? JSON.stringify({ weight: `${fight.peso_libras_b}-${fight.peso_onzas_b}.${fight.peso_puntos_b}`, color: fight.color_b, marca: fight.marca_b, clase: fight.clase_b, turno: fight.turno_b }) : '';

      const existing = await rawFetch(`events?select=*&post_number=eq.${fightNum}`);
      const payload = {
        post_number: fightNum.toString(),
        gallo_a_name: nameA,
        gallo_b_name: nameB,
        gallo_a_weight: weightA,
        gallo_b_weight: weightB,
        gallo_a_odds: 1.9,
        gallo_b_odds: 1.9,
        status: status,
        winner_side: winnerSide
      };

      let eventId = null;
      if (existing && existing[0]) {
        eventId = existing[0].id;
        await rawFetch(`events`, {
          method: 'PATCH',
          body: payload,
          query: `id=eq.${existing[0].id}`
        });
      } else {
        const created = await rawFetch('events', {
          method: 'POST',
          body: payload
        });
        if (created && created[0]) eventId = created[0].id;
      }

      await broadcastEventStatus(fightNum, status, eventId);
    } catch (err) {
      console.error('Error upserting event:', err);
    }
  };

  const broadcastClockState = async (isRun, elapsed, total, subLeftVal) => {
    const now = Date.now();
    let startedAtToUse = 0;
    if (isRun) {
      const storedStartedAt = parseInt(localStorage.getItem('clock_started_at') || '0', 10);
      startedAtToUse = storedStartedAt > 0 ? storedStartedAt : now;
    }

    const payload = {
      clock_running: isRun,
      clock_started_at: startedAtToUse,
      clock_elapsed_paused: isRun ? parseInt(localStorage.getItem('clock_elapsed_paused') || '0', 10) : elapsed,
      clock_total_duration: total,
      sub_timer_left: subLeftVal !== undefined ? subLeftVal : subTimeLeft,
      updated_at: now
    };

    localStorage.setItem('clock_running', isRun ? 'true' : 'false');
    localStorage.setItem('clock_started_at', startedAtToUse.toString());
    localStorage.setItem('clock_total_duration', total.toString());
    if (!isRun) {
      localStorage.setItem('clock_elapsed_paused', elapsed.toString());
    }

    if (subLeftVal !== undefined) {
      if (subLeftVal !== null) localStorage.setItem('sub_timer_left', subLeftVal.toString());
      else localStorage.removeItem('sub_timer_left');
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'clock_sync',
        payload
      });
    }

    await upsertSetting('clock_state', payload);
  };

  const handleScoreboardStyleChange = async (newStyle) => {
    setScoreboardStyle(newStyle);
    localStorage.setItem('scoreboard_style', newStyle);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'scoreboard_style_sync',
        payload: { style: newStyle }
      });
    }

    await upsertSetting('scoreboard_style', newStyle);
  };

  // Actions
  const handleStart = () => {
    if (!gallinoName && !blancoName) {
      message.error('⚠️ Debes cargar una pelea de la cartelera antes de iniciar el combate.');
      return;
    }
    if (timeLeft <= 0) {
      message.warning('El tiempo está en 0. Reinicia o cambia el ajuste.');
      return;
    }
    playSynthesizedSound('bell');
    setIsRunning(true);
    
    // Save to localStorage & broadcast live to all viewers
    const now = Date.now();
    localStorage.setItem('clock_started_at', now.toString());
    localStorage.setItem('clock_elapsed_paused', elapsedTime.toString());
    broadcastClockState(true, elapsedTime, presetDuration);

    // Update status in Supabase
    upsertEvent(fightNumber, 'CLOSED');
  };

  const handlePause = () => {
    setIsRunning(false);
    playSynthesizedSound('bell');
    broadcastClockState(false, elapsedTime, presetDuration);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSubTimeLeft(null);
    setTimeLeft(presetDuration);
    setElapsedTime(0);
    
    broadcastClockState(false, 0, presetDuration, null);
    localStorage.setItem('sub_running', 'false');
    
    message.info('Relojes restablecidos');
  };

  const handleStartSubTimer = (seconds, label) => {
    playSynthesizedSound('warning');
    setSubTimerLabel(label);
    setSubTimeLeft(seconds);
    
    const now = new Date().getTime();
    localStorage.setItem('sub_running', 'true');
    localStorage.setItem('sub_started_at', now.toString());
    localStorage.setItem('sub_total_duration', seconds.toString());
    localStorage.setItem('sub_timer_label', label);

    let mainRunning = isRunning;
    if (pauseMainOnSub && isRunning) {
      setIsRunning(false);
      mainRunning = false;
    }

    broadcastClockState(mainRunning, elapsedTime, presetDuration, seconds);
  };

  const handleCancelSubTimer = () => {
    setSubTimeLeft(null);
    localStorage.setItem('sub_running', 'false');
    localStorage.removeItem('sub_timer_left');
    if (subTimerRef.current) clearInterval(subTimerRef.current);
    broadcastClockState(isRunning, elapsedTime, presetDuration, null);
  };

  // Helper formatting mm:ss
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Log Fight Result & Trigger Premium Confetti Celebration Overlay
  const handleSaveFightResult = async (resultType) => {
    const durationStr = formatTime(elapsedTime);
    const newResults = {
      ...fightResults,
      [fightNumber]: {
        result: resultType,
        duration: durationStr,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    };
    
    saveLocalResults(newResults);

    // Fire custom premium celebration
    let title = '';
    let subtitle = '';
    
    if (resultType === 'Azul') {
      title = '¡VICTORIA LADO AZUL!';
      subtitle = `${gallinoName || 'Traba Azul'} ha vencido a los ${durationStr} de combate`;
      playCelebrationSound('victory');
    } else if (resultType === 'Blanco') {
      title = '¡VICTORIA LADO BLANCO!';
      subtitle = `${blancoName || 'Traba Blanca'} ha vencido a los ${durationStr} de combate`;
      playCelebrationSound('victory');
    } else {
      title = '¡PELEA EN TABLAS / NULA!';
      subtitle = `El combate finalizó en tablas tras ${durationStr}`;
      playCelebrationSound('draw');
    }

    setCelebration({
      type: resultType,
      title,
      subtitle,
      fightNum: fightNumber
    });

    // Sync result to Supabase events table
    const winnerSideMap = { 'Azul': 'A', 'Blanco': 'B', 'Tablas': 'D' };
    const winSide = winnerSideMap[resultType] || 'D';
    await upsertEvent(fightNumber, 'FINISHED', winSide);

    // Resolve pending bets and pay winners/refund draws immediately
    try {
      await resolveBetsForEvent(null, winSide, fightNumber);
    } catch (bErr) {
      console.error('Error resolving bets in handleSaveFightResult:', bErr);
    }

    // Auto close celebration after 7 seconds
    setTimeout(() => {
      setCelebration(null);
    }, 7000);
    
    const nextFightNum = fightNumber + 1;
    setFightNumber(nextFightNum);
    
    // Clear fight details to wait for manual load
    setGallinoName('');
    setBlancoName('');
    setPesoAzul('');
    setColorAzul('');
    setMarcaAzul('');
    setPesoBlanco('');
    setColorBlanco('');
    setMarcaBlanco('');
    
    // Reset betting states
    setBettingPhase(false);
    localStorage.setItem('betting_active', 'false');
    if (bettingTimerRef.current) clearInterval(bettingTimerRef.current);

    handleReset();
  };

  const handleLoadFight = (fight) => {
    setFightNumber(fight.numero_pelea);
    setGallinoName(fight.traba_a || '');
    setBlancoName(fight.traba_b || '');
    
    setPesoAzul(`${fight.peso_libras_a}-${fight.peso_onzas_a}.${fight.peso_puntos_a}`);
    setColorAzul(fight.color_a || '');
    setMarcaAzul(fight.marca_a || '');
    
    setPesoBlanco(`${fight.peso_libras_b}-${fight.peso_onzas_b}.${fight.peso_puntos_b}`);
    setColorBlanco(fight.color_b || '');
    setMarcaBlanco(fight.marca_b || '');
    
    // Reset photos on fight load to let user customize per fight
    setFotoAzul(null);
    setFotoBlanco(null);
    
    handleReset();
    
    // Start 2-minute BETTING PHASE — status LIVE (apuestas abiertas)
    const BETTING_DURATION = 120;
    const bettingStartedAt = new Date().getTime();
    setBettingPhase(true);
    setBettingTimeLeft(BETTING_DURATION);
    // Persist to localStorage so it survives page navigation
    localStorage.setItem('betting_active', 'true');
    localStorage.setItem('betting_started_at', bettingStartedAt.toString());
    localStorage.setItem('betting_total', BETTING_DURATION.toString());
    localStorage.setItem('betting_fight_number', fight.numero_pelea.toString());
    if (bettingTimerRef.current) clearInterval(bettingTimerRef.current);
    bettingTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - bettingStartedAt) / 1000);
      const remaining = BETTING_DURATION - elapsed;
      if (remaining <= 0) {
        clearInterval(bettingTimerRef.current);
        setBettingPhase(false);
        localStorage.setItem('betting_active', 'false');
        upsertEvent(fight.numero_pelea, 'CLOSED');
        setBettingTimeLeft(0);
        return;
      }
      setBettingTimeLeft(remaining);
    }, 500); // Poll every 500ms for accuracy
    
    message.success(`✅ Pelea #${fight.numero_pelea} cargada — 2 minutos de apuestas`);
    // Sync LIVE status so spectators see APUESTAS ABIERTAS
    upsertEvent(fight.numero_pelea, 'LIVE');
  };
  
  // Close bets manually and start the fight clock
  const handleCloseBets = () => {
    if (bettingTimerRef.current) clearInterval(bettingTimerRef.current);
    setBettingPhase(false);
    // Clear betting phase from localStorage
    localStorage.setItem('betting_active', 'false');
    playSynthesizedSound('bell');
    // Transition to CLOSED (fight started) and start the main clock directly
    upsertEvent(fightNumber, 'CLOSED');
    // Start clock directly (bypassing the guard since we know a fight is loaded)
    setIsRunning(true);
    const now = new Date().getTime();
    localStorage.setItem('clock_running', 'true');
    localStorage.setItem('clock_started_at', now.toString());
    localStorage.setItem('clock_total_duration', presetDuration.toString());
    localStorage.setItem('clock_elapsed_paused', elapsedTime.toString());
    message.success('⚔️ ¡Apuestas cerradas! Combate iniciado');
  };

  const handleClearResult = async (fightNum) => {
    const updated = { ...fightResults };
    delete updated[fightNum];
    saveLocalResults(updated);
    message.info(`Resultado de Pelea #${fightNum} borrado`);
    try {
      await rawFetch('events', {
        method: 'DELETE',
        query: `post_number=eq.${fightNum}`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const clearAllResults = async () => {
    saveLocalResults({});
    message.info('Historial y resultados locales limpiados');
    try {
      await rawFetch('events', {
        method: 'DELETE',
        query: `status=eq.FINISHED`
      });
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Pending fights data & columns (fights to be loaded and played)
  const pendingTableData = carteleraFights
    .filter(f => !fightResults[f.numero_pelea])
    .map(f => ({
      key: f.id || f.numero_pelea.toString(),
      ...f,
      result: null,
      duration: '-',
      timestamp: '-'
    }));

  const pendingColumns = [
    { title: '# Pelea', dataIndex: 'numero_pelea', key: 'numero_pelea', width: 90, align: 'center', render: (num) => <Text style={{ fontWeight: 800 }}>#{num}</Text> },
    { 
      title: 'Lado Azul (Izquierdo)', 
      key: 'gallo_azul', 
      render: (_, r) => (
        <div>
          <Text style={{ fontWeight: 700, color: '#60a5fa', display: 'block' }}>{r.traba_a}</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Peso: {r.peso_libras_a}-{r.peso_onzas_a}.{r.peso_puntos_a} | Color: {r.color_a} | Marca: {r.marca_a || '-'}
          </Text>
        </div>
      ) 
    },
    { 
      title: 'Lado Blanco (Derecho)', 
      key: 'gallo_blanco', 
      render: (_, r) => (
        <div>
          <Text style={{ fontWeight: 700, color: '#fff', display: 'block' }}>{r.traba_b}</Text>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            Peso: {r.peso_libras_b}-{r.peso_onzas_b}.{r.peso_puntos_b} | Color: {r.color_b} | Marca: {r.marca_b || '-'}
          </Text>
        </div>
      ) 
    },
    { 
      title: 'Acciones', 
      key: 'actions', 
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button 
          size="small" 
          type="primary" 
          onClick={() => handleLoadFight(record)}
          style={{ background: '#10b981', borderColor: '#10b981', fontSize: 11, fontWeight: 700 }}
        >
          Cargar
        </Button>
      ) 
    }
  ];

  // 2. Completed fights data & columns (fights that have a saved result)
  const completedTableData = carteleraFights
    .filter(f => !!fightResults[f.numero_pelea])
    .map(f => {
      const res = fightResults[f.numero_pelea];
      return {
        key: f.id || f.numero_pelea.toString(),
        ...f,
        result: res.result,
        duration: res.duration,
        timestamp: res.timestamp
      };
    });

  const completedColumns = [
    { title: '# Pelea', dataIndex: 'numero_pelea', key: 'numero_pelea', width: 80, align: 'center', render: (num) => <Text style={{ fontWeight: 800 }}>#{num}</Text> },
    { 
      title: 'Detalle de Combate', 
      key: 'fight_detail', 
      render: (_, r) => (
        <div>
          <Text style={{ fontWeight: 700, fontSize: 12 }}>
            <span style={{ color: '#60a5fa' }}>{r.traba_a}</span> 
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 6px' }}>vs</span> 
            <span style={{ color: '#fff' }}>{r.traba_b}</span>
          </Text>
        </div>
      ) 
    },
    { title: 'Duración', dataIndex: 'duration', key: 'duration', width: 95, align: 'center' },
    { 
      title: 'Resultado', 
      dataIndex: 'result', 
      key: 'result', 
      width: 110,
      align: 'center',
      render: (val) => {
        let color = 'gray';
        if (val === 'Placa' || val === 'Azul') color = 'blue';
        if (val === 'Blanco') color = 'default';
        if (val === 'Tablas') color = 'gold';
        return <Tag color={color} style={{ fontWeight: 800, fontSize: 10 }}>{val.toUpperCase()}</Tag>;
      }
    },
    { 
      title: 'Acciones', 
      key: 'delete_action', 
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button 
          size="small" 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => handleClearResult(record.numero_pelea)} 
        />
      ) 
    }
  ];

  return (
    <div 
      ref={containerRef} 
      style={{ 
        padding: isFullscreen ? '20px 10px' : '24px 16px', 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at center, #0a110e 0%, #020503 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: "'Outfit', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background ambient glows */}
      <div style={{ position: 'absolute', top: '-10%', left: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(16,185,129,0.03)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(59,130,246,0.02)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 1280, width: '100%', margin: '0 auto', zIndex: 10 }}>
        
        {/* Top bar */}
        {!isFullscreen && (
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Space size="middle">
                <div style={{ background: 'rgba(16,185,129,0.1)', padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 0 15px rgba(16,185,129,0.15)' }}>
                  <Text style={{ color: '#10b981', fontWeight: 900, fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase' }}>TABLERO OFICIAL DE JUECES</Text>
                </div>
                <Button 
                  size="small"
                  type="text" 
                  icon={<SyncOutlined spin={loadingCartelera} />} 
                  onClick={fetchCartelera}
                  style={{ color: '#10b981', fontWeight: 600 }}
                >
                  Sincronizar Cartelera
                </Button>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title="Prueba de sonido">
                  <Button 
                    icon={<SoundOutlined />} 
                    onClick={() => playSynthesizedSound('bell')}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                  />
                </Tooltip>
                <Button 
                  icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
                  onClick={toggleFullscreen}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600 }}
                >
                  {isFullscreen ? 'Salir' : 'Pantalla Completa'}
                </Button>
              </Space>
            </Col>
          </Row>
        )}

        {/* ======================================================== */}
        {/* PREMIUM SCOREBOARD TABLERO (Modern Flat Slate Style) */}
        {/* ======================================================== */}


        {/* Style Selector Bar (visible in both normal and fullscreen modes) */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: 12, 
          marginBottom: 16,
          background: '#1a1a1a',
          padding: '8px 16px',
          borderRadius: 8,
          border: '1px solid #2d2d2d'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Diseño de Pantalla (Transmisión):
          </span>
          <Radio.Group 
            value={scoreboardStyle} 
            onChange={(e) => handleScoreboardStyleChange(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="modern" style={{ fontWeight: 700 }}>CLÁSICO</Radio.Button>
            <Radio.Button value="arena" style={{ fontWeight: 700 }}>VS ARENA (LADOS)</Radio.Button>
            <Radio.Button value="broadcast" style={{ fontWeight: 700 }}>OSD COMPACTO (TIRA)</Radio.Button>
          </Radio.Group>
        </div>
        {/* ======================================================== */}
        {/* CONDITIONAL SCOREBOARD RENDER */}
        {/* ======================================================== */}
        {scoreboardStyle === 'modern' && (
          <div style={{ 
            background: '#161616', 
            border: '1px solid #2a2a2a', 
            borderRadius: 12, 
            padding: 12, 
            boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
            position: 'relative',
            marginBottom: 20
          }}>
            {/* Header Title Banner (Modern Flat Slate with Gamecock Logos) */}
            <div style={{ 
              background: '#1f1f1f', 
              borderBottom: '1px solid #2d2d2d', 
              padding: '12px 20px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 15,
              borderRadius: '10px 10px 0 0'
            }}>
              <img src="/official_logo.png" style={{ height: isFullscreen ? 48 : 32, borderRadius: '50%', border: '2px solid #d4af37' }} alt="Gallo Logo" />
              <span style={{ 
                color: '#f3f4f6', 
                fontSize: isFullscreen ? '32px' : '22px', 
                fontWeight: 800, 
                letterSpacing: '6px',
                fontFamily: 'Outfit',
                textTransform: 'uppercase',
                display: 'inline-block'
              }}>
                COLISEO ANGEL CRUZ
              </span>
              <img src="/official_logo.png" style={{ height: isFullscreen ? 48 : 32, borderRadius: '50%', border: '2px solid #d4af37', transform: 'scaleX(-1)' }} alt="Gallo Logo" />
            </div>

            {/* Tri-Timer Grid Panel (Flat modern premium look) */}
            <Row gutter={8} style={{ background: '#111111', margin: '8px 0', padding: 12, borderRadius: 8, border: '1px solid #222222' }}>
              <Col span={9} style={{ borderRight: '1px solid #222', padding: '16px 4px', textAlign: 'center', position: 'relative' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isFullscreen ? 11 : 9, fontWeight: 700, letterSpacing: 2 }}>TIEMPO TRANSCURRIDO</div>
                <div style={{ 
                  color: '#10b981', 
                  fontSize: isFullscreen ? 'clamp(90px, 18vw, 180px)' : 'clamp(55px, 11vw, 100px)', 
                  fontFamily: 'Outfit',
                  fontWeight: 800,
                  lineHeight: 1,
                  margin: '5px 0',
                  letterSpacing: '2px'
                }}>
                  {formatTime(elapsedTime)}
                </div>
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.05), transparent)' }} />
              </Col>

              <Col span={6} style={{ borderRight: '1px solid #222', padding: '16px 4px', textAlign: 'center', position: 'relative' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isFullscreen ? 11 : 9, fontWeight: 700, letterSpacing: 2 }}>CAREO / TIERRA</div>
                <div style={{ 
                  color: '#ef4444', 
                  fontSize: isFullscreen ? 'clamp(90px, 18vw, 180px)' : 'clamp(55px, 11vw, 100px)', 
                  fontFamily: 'Outfit',
                  fontWeight: 800,
                  lineHeight: 1,
                  margin: '5px 0',
                  letterSpacing: '2px'
                }}>
                  {subTimeLeft !== null ? subTimeLeft.toString().padStart(2, '0') : '00'}
                </div>
                <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '1px', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.05), transparent)' }} />
              </Col>

              <Col span={9} style={{ padding: '16px 4px', textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isFullscreen ? 11 : 9, fontWeight: 700, letterSpacing: 2 }}>TIEMPO RESTANTE</div>
                <div style={{ 
                  color: '#f59e0b', 
                  fontSize: isFullscreen ? 'clamp(90px, 18vw, 180px)' : 'clamp(55px, 11vw, 100px)', 
                  fontFamily: 'Outfit',
                  fontWeight: 800,
                  lineHeight: 1,
                  margin: '5px 0',
                  letterSpacing: '2px'
                }}>
                  {formatTime(timeLeft)}
                </div>
              </Col>
            </Row>

            {/* Active Combatant Banner (High-end blue/white split) */}
            <Row style={{ border: '1px solid #2d2d2d', margin: '8px 0', background: '#111', borderRadius: 8, overflow: 'hidden' }}>
              <Col span={6} style={{ 
                background: '#1d1d1d', 
                borderRight: '1px solid #2d2d2d', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '16px 8px'
              }}>
                <span style={{ color: '#ef4444', fontWeight: 800, fontSize: isFullscreen ? 22 : 14, letterSpacing: 2 }}>PELEA</span>
                <span style={{ color: '#ffffff', fontWeight: 900, fontSize: isFullscreen ? 60 : 38, lineHeight: 1 }}>{fightNumber}</span>
              </Col>

              <Col span={18}>
                <div style={{ 
                  background: '#ffffff', 
                  color: '#111111', 
                  padding: isFullscreen ? '20px 30px' : '12px 18px',
                  fontWeight: 800,
                  fontSize: isFullscreen ? 40 : 26,
                  textTransform: 'uppercase',
                  borderBottom: '1px solid #dddddd'
                }}>
                  {gallinoName ? gallinoName : ''}
                </div>

                <div style={{ 
                  background: '#0f3dd1', 
                  color: '#ffffff', 
                  padding: isFullscreen ? '20px 30px' : '12px 18px',
                  fontWeight: 800,
                  fontSize: isFullscreen ? 40 : 26,
                  textTransform: 'uppercase'
                }}>
                  {blancoName ? blancoName : ''}
                </div>
              </Col>
            </Row>

            {/* Bottom ticker banner */}
            <div style={{ 
              background: '#111111', 
              borderTop: '1px solid #2d2d2d', 
              padding: '14px 0',
              overflow: 'hidden',
              borderRadius: '0 0 10px 10px',
              position: 'relative'
            }}>
              <div className="marquee-content" style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                paddingLeft: '100%',
                animation: 'ticker-marquee 18s linear infinite',
                color: '#ffffff',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: isFullscreen ? 22 : 15,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {gallinoName || blancoName ? (
                  <span>
                    ••• {gallinoName || 'LADO AZUL'} [ MARCA: {marcaAzul || '-'} • PESO: {pesoAzul || '-'} • COLOR: {colorAzul || '-'} ] 
                    <span style={{ color: '#ef4444', margin: '0 40px', fontWeight: 900 }}>VS</span> 
                    {blancoName || 'LADO BLANCO'} [ MARCA: {marcaBlanco || '-'} • PESO: {pesoBlanco || '-'} • COLOR: {colorBlanco || '-'} ] •••
                  </span>
                ) : (
                  <span>••• COLISEO ANGEL CRUZ • LISTO PARA LA PELEA • SELECCIONE LOS GALLOS DE LA CARTELERA ABAJO •••</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STYLE 2: VS ARENA (SPLIT LATERAL WITH CENTERED STACKED TIMERS) */}
        {/* ======================================================== */}
        {scoreboardStyle === 'arena' && (
          <div style={{ 
            background: '#161616', 
            border: '1px solid #2a2a2a', 
            borderRadius: 12, 
            padding: 12, 
            boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
            position: 'relative',
            marginBottom: 20
          }}>
            {/* Header */}
            <div style={{ 
              background: '#1f1f1f', 
              borderBottom: '1px solid #2d2d2d', 
              padding: '10px 20px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 15,
              borderRadius: '10px 10px 0 0'
            }}>
              <img src="/official_logo.png" style={{ height: isFullscreen ? 40 : 26, borderRadius: '50%', border: '2px solid #d4af37' }} alt="Gallo Logo" />
              <span style={{ color: '#f3f4f6', fontSize: isFullscreen ? '26px' : '18px', fontWeight: 800, letterSpacing: '4px', fontFamily: 'Outfit', textTransform: 'uppercase' }}>
                COLISEO ANGEL CRUZ
              </span>
              <img src="/official_logo.png" style={{ height: isFullscreen ? 40 : 26, borderRadius: '50%', border: '2px solid #d4af37', transform: 'scaleX(-1)' }} alt="Gallo Logo" />
            </div>

            {/* Split layout: Gallo Azul (Left 5) - Clocks (Center 14) - Gallo Blanco (Right 5) */}
            <Row gutter={8} style={{ margin: '8px 0', minHeight: isFullscreen ? 320 : 220 }}>
              
              {/* Left Side: Gallo Azul (White block) */}
              <Col span={5} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  flex: 1, 
                  background: '#ffffff', 
                  color: '#111111', 
                  borderRadius: 8, 
                  padding: 12, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  border: '1px solid #dddddd'
                }}>
                  <div style={{ marginBottom: 10 }}>
                    {renderRoosterAvatar('azul', fotoAzul)}
                  </div>
                  <div style={{ color: '#0f3dd1', fontWeight: 900, fontSize: isFullscreen ? 14 : 10, letterSpacing: 1, marginBottom: 4 }}>LADO AZUL</div>
                  <div style={{ fontWeight: 900, fontSize: isFullscreen ? 28 : 18, textTransform: 'uppercase', lineHeight: 1.2, wordBreak: 'break-word', color: '#111' }}>
                    {gallinoName ? gallinoName : ''}
                  </div>
                  <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 8, width: '100%', fontSize: isFullscreen ? 12 : 9, fontWeight: 700, color: '#555' }}>
                    <div>PESO: <strong style={{ color: '#000' }}>{pesoAzul || '-'}</strong></div>
                    <div style={{ margin: '2px 0' }}>MARCA: <strong style={{ color: '#000' }}>{marcaAzul || '-'}</strong></div>
                    <div>COLOR: <strong style={{ color: '#000' }}>{colorAzul || '-'}</strong></div>
                  </div>
                </div>
              </Col>

              {/* Center Side: Stacked Timers (Now massive!) */}
              <Col span={14} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Pelea block */}
                <div style={{ background: '#1d1d1d', border: '1px solid #2d2d2d', borderRadius: 8, padding: 6, textAlign: 'center' }}>
                  <span style={{ color: '#ef4444', fontWeight: 800, fontSize: isFullscreen ? 18 : 12, marginRight: 8 }}>PELEA</span>
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: isFullscreen ? 26 : 18 }}>{fightNumber}</span>
                </div>

                {/* Remaining Time (Huge display) */}
                <div style={{ flex: 2.5, background: '#111111', border: '1px solid #222', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 12 }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isFullscreen ? 12 : 9, fontWeight: 700, marginBottom: 4 }}>TIEMPO RESTANTE</div>
                  <div style={{ 
                    color: '#f59e0b', 
                    fontSize: isFullscreen ? 'clamp(95px, 15vw, 160px)' : 'clamp(55px, 8vw, 85px)', 
                    fontWeight: 800, 
                    fontFamily: 'Outfit', 
                    lineHeight: 1,
                    letterSpacing: '2px'
                  }}>
                    {formatTime(timeLeft)}
                  </div>
                </div>

                {/* Secondary Clocks Row */}
                <Row gutter={6} style={{ flex: 1.5 }}>
                  <Col span={12} style={{ height: '100%' }}>
                    <div style={{ background: '#111111', border: '1px solid #222', borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 8 }}>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: isFullscreen ? 10 : 8, fontWeight: 700, marginBottom: 2 }}>TRANSCURRIDO</div>
                      <div style={{ 
                        color: '#10b981', 
                        fontSize: isFullscreen ? 'clamp(36px, 5vw, 60px)' : 'clamp(22px, 3.5vw, 34px)', 
                        fontWeight: 800, 
                        fontFamily: 'Outfit',
                        lineHeight: 1
                      }}>
                        {formatTime(elapsedTime)}
                      </div>
                    </div>
                  </Col>
                  <Col span={12} style={{ height: '100%' }}>
                    <div style={{ background: '#111111', border: '1px solid #222', borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: 8 }}>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: isFullscreen ? 10 : 8, fontWeight: 700, marginBottom: 2 }}>CAREO / TIERRA</div>
                      <div style={{ 
                        color: '#ef4444', 
                        fontSize: isFullscreen ? 'clamp(36px, 5vw, 60px)' : 'clamp(22px, 3.5vw, 34px)', 
                        fontWeight: 800, 
                        fontFamily: 'Outfit',
                        lineHeight: 1
                      }}>
                        {subTimeLeft !== null ? subTimeLeft.toString().padStart(2, '0') : '00'}
                      </div>
                    </div>
                  </Col>
                </Row>
              </Col>

              {/* Right Side: Gallo Blanco (Blue block) */}
              <Col span={5} style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ 
                  flex: 1, 
                  background: '#0f3dd1', 
                  color: '#ffffff', 
                  borderRadius: 8, 
                  padding: 12, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  border: '1px solid #06238b'
                }}>
                  <div style={{ marginBottom: 10 }}>
                    {renderRoosterAvatar('blanco', fotoBlanco)}
                  </div>
                  <div style={{ color: '#ffffff', opacity: 0.8, fontWeight: 900, fontSize: isFullscreen ? 14 : 10, letterSpacing: 1, marginBottom: 4 }}>LADO BLANCO</div>
                  <div style={{ fontWeight: 900, fontSize: isFullscreen ? 28 : 18, textTransform: 'uppercase', lineHeight: 1.2, wordBreak: 'break-word', color: '#ffffff' }}>
                    {blancoName ? blancoName : ''}
                  </div>
                  <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 8, width: '100%', fontSize: isFullscreen ? 12 : 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                    <div>PESO: <strong style={{ color: '#fff' }}>{pesoBlanco || '-'}</strong></div>
                    <div style={{ margin: '2px 0' }}>MARCA: <strong style={{ color: '#fff' }}>{marcaBlanco || '-'}</strong></div>
                    <div>COLOR: <strong style={{ color: '#fff' }}>{colorBlanco || '-'}</strong></div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Bottom Marquee */}
            <div style={{ 
              background: '#111111', 
              borderTop: '1px solid #2d2d2d', 
              padding: '12px 0',
              overflow: 'hidden',
              borderRadius: '0 0 10px 10px'
            }}>
              <div className="marquee-content" style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                paddingLeft: '100%',
                animation: 'ticker-marquee 18s linear infinite',
                color: '#ffffff',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 800,
                fontSize: isFullscreen ? 20 : 14,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {gallinoName || blancoName ? (
                  <span>
                    ••• {gallinoName || 'LADO AZUL'} [ MARCA: {marcaAzul || '-'} • PESO: {pesoAzul || '-'} • COLOR: {colorAzul || '-'} ] 
                    <span style={{ color: '#ef4444', margin: '0 40px', fontWeight: 900 }}>VS</span> 
                    {blancoName || 'LADO BLANCO'} [ MARCA: {marcaBlanco || '-'} • PESO: {pesoBlanco || '-'} • COLOR: {colorBlanco || '-'} ] •••
                  </span>
                ) : (
                  <span>••• COLISEO ANGEL CRUZ • LISTO PARA LA PELEA • SELECCIONE LOS GALLOS DE LA CARTELERA ABAJO •••</span>
                )}
              </div>
            </div>
          </div>
        )}



        {/* ======================================================== */}
        {/* STYLE 3: COMPACT OSD (COMPACT SKEWED CYBERPUNK ACTION STRIP) */}
        {/* ======================================================== */}
        {scoreboardStyle === 'broadcast' && (
          <div style={{ 
            background: 'linear-gradient(135deg, #111 0%, #070707 100%)', 
            border: '2px solid #222', 
            borderRadius: 16, 
            padding: 12, 
            boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
            marginBottom: 20,
            overflow: 'hidden'
          }}>
            {/* Horizontal Cyberpunk row */}
            <Row align="middle" gutter={8}>
              {/* Pelea indicator (Hexagon styled block) */}
              <Col span={2}>
                <div style={{ 
                  background: '#1d1d1d', 
                  borderLeft: '4px solid #ef4444', 
                  borderRadius: 6, 
                  padding: isFullscreen ? '14px 4px' : '10px 2px', 
                  textAlign: 'center',
                  boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1)'
                }}>
                  <div style={{ color: '#ef4444', fontWeight: 900, fontSize: isFullscreen ? 11 : 8, letterSpacing: 0.5, lineHeight: 1 }}>COMBATE</div>
                  <div style={{ color: '#ffffff', fontWeight: 900, fontSize: isFullscreen ? 28 : 18, lineHeight: 1.1 }}>#{fightNumber}</div>
                </div>
              </Col>

              {/* Gallo Azul (Skewed Glass Parallelogram) */}
              <Col span={7}>
                <div style={{ 
                  background: '#ffffff', 
                  color: '#111111', 
                  borderRadius: 8, 
                  padding: isFullscreen ? '10px 14px' : '6px 8px',
                  borderLeft: '6px solid #0f3dd1',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transform: 'skewX(-10deg)',
                  marginLeft: 5
                }}>
                  <div style={{ transform: 'skewX(10deg)', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    {renderRoosterAvatar('azul', fotoAzul)}
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontSize: isFullscreen ? 11 : 9, color: '#0f3dd1', fontWeight: 900, letterSpacing: 0.5 }}>LADO AZUL</div>
                      <div style={{ fontWeight: 900, fontSize: isFullscreen ? 32 : 21, textTransform: 'uppercase', color: '#111111', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {gallinoName ? gallinoName : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: isFullscreen ? 13 : 10, fontWeight: 900, color: '#444' }}>
                        <span>P: <strong style={{ color: '#000' }}>{pesoAzul || '-'}</strong></span>
                        <span>M: <strong style={{ color: '#000' }}>{marcaAzul || '-'}</strong></span>
                        <span>C: <strong style={{ color: '#000' }}>{colorAzul || '-'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>

              {/* Clocks Bar (Compact futuristic panel) */}
              <Col span={8}>
                <div style={{ 
                  background: 'linear-gradient(180deg, #101010 0%, #050505 100%)', 
                  borderRadius: 10, 
                  border: '1px solid #333', 
                  padding: isFullscreen ? '10px 12px' : '6px 8px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.9)'
                }}>
                  {/* Elapsed */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#10b981', 
                      fontSize: isFullscreen ? 48 : 28, 
                      fontWeight: 900, 
                      fontFamily: 'Outfit', 
                      lineHeight: 1
                    }}>
                      {formatTime(elapsedTime)}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isFullscreen ? 10 : 8, fontWeight: 900, marginTop: 4 }}>ELAPSED</div>
                  </div>
                  
                  {/* Careo */}
                  <div style={{ textAlign: 'center', borderLeft: '1px solid #2d2d2d', borderRight: '1px solid #2d2d2d', padding: '0 20px' }}>
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: isFullscreen ? 48 : 28, 
                      fontWeight: 900, 
                      fontFamily: 'Outfit', 
                      lineHeight: 1
                    }}>
                      {subTimeLeft !== null ? subTimeLeft.toString().padStart(2, '0') : '00'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isFullscreen ? 10 : 8, fontWeight: 900, marginTop: 4 }}>{subTimerLabel || 'CAREO'}</div>
                  </div>

                  {/* Remaining */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      color: '#f59e0b', 
                      fontSize: isFullscreen ? 68 : 38, 
                      fontWeight: 900, 
                      fontFamily: 'Outfit', 
                      lineHeight: 1
                    }}>
                      {formatTime(timeLeft)}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: isFullscreen ? 10 : 8, fontWeight: 900, marginTop: 4 }}>RESTANTE</div>
                  </div>
                </div>
              </Col>

              {/* Gallo Blanco (Skewed Glass Parallelogram) */}
              <Col span={7}>
                <div style={{ 
                  background: '#0f3dd1', 
                  color: '#ffffff', 
                  borderRadius: 8, 
                  padding: isFullscreen ? '10px 14px' : '6px 8px',
                  borderRight: '6px solid #ffffff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transform: 'skewX(-10deg)',
                  marginRight: 5
                }}>
                  <div style={{ transform: 'skewX(10deg)', display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                    {renderRoosterAvatar('blanco', fotoBlanco)}
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontSize: isFullscreen ? 11 : 9, color: 'rgba(255,255,255,0.7)', fontWeight: 900, letterSpacing: 0.5 }}>LADO BLANCO</div>
                      <div style={{ fontWeight: 900, fontSize: isFullscreen ? 32 : 21, textTransform: 'uppercase', color: '#ffffff', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {blancoName ? blancoName : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: isFullscreen ? 13 : 10, fontWeight: 900, color: 'rgba(255,255,255,0.85)' }}>
                        <span>P: <strong>{pesoBlanco || '-'}</strong></span>
                        <span>M: <strong>{marcaBlanco || '-'}</strong></span>
                        <span>C: <strong>{colorBlanco || '-'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {/* ======================================================== */}
        {/* CONSOLE & JUDGE CONTROLS PANEL */}
        {/* ======================================================== */}
        {!isFullscreen && (
          <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
            
            {/* Panel 1: Main Fight Parameters & Clock Launcher */}
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ControlOutlined style={{ color: '#10b981', fontSize: 16 }} />
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '0.5px' }}>
                      PARÁMETROS DEL COMBATE
                    </span>
                  </div>
                }
                style={{ 
                  background: 'linear-gradient(145deg, rgba(18, 24, 38, 0.85) 0%, rgba(12, 16, 26, 0.95) 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(12px)'
                }}
                styles={{ body: { padding: '16px' } }}
              >
                {carteleraFights.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🎯 CARGAR PELEA DE CARTELERA
                    </Text>
                    <Select 
                      placeholder="Seleccionar pelea programada..."
                      onChange={(val) => {
                        const fight = carteleraFights.find(f => f.numero_pelea === val);
                        if (fight) handleLoadFight(fight);
                      }}
                      style={{ width: '100%' }}
                      size="middle"
                    >
                      {carteleraFights.map(f => (
                        <Option key={f.numero_pelea} value={f.numero_pelea}>
                          Pelea #{f.numero_pelea} • {f.traba_a} vs {f.traba_b}
                        </Option>
                      ))}
                    </Select>
                  </div>
                )}

                <Row gutter={10} style={{ marginBottom: 14 }}>
                  <Col span={10}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      PELEA Nº
                    </Text>
                    <InputNumber 
                      min={1} 
                      value={fightNumber} 
                      onChange={setFightNumber} 
                      style={{ 
                        width: '100%', 
                        background: 'rgba(255,255,255,0.04)', 
                        color: '#fff', 
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: 8,
                        fontWeight: 800
                      }} 
                    />
                  </Col>
                  <Col span={14}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      DURACIÓN (MIN)
                    </Text>
                    <Radio.Group 
                      value={presetDuration} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setPresetDuration(val);
                        setTimeLeft(val);
                      }}
                      size="middle"
                      buttonStyle="solid"
                      style={{ width: '100%', display: 'flex' }}
                    >
                      <Radio.Button value={600} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700 }}>10m</Radio.Button>
                      <Radio.Button value={720} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700 }}>12m</Radio.Button>
                      <Radio.Button value={900} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: 700 }}>15m</Radio.Button>
                    </Radio.Group>
                  </Col>
                </Row>

                {/* Warning when no fight is loaded */}
                {!gallinoName && !blancoName && !bettingPhase && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 12,
                    fontSize: 11,
                    color: '#fca5a5',
                    fontWeight: 700,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}>
                    <span>⚠️</span> Carga una pelea de la cartelera primero
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  {bettingPhase ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ 
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)', 
                        border: '1px solid rgba(16,185,129,0.3)', 
                        borderRadius: 12, 
                        padding: '12px 14px',
                        textAlign: 'center'
                      }}>
                        <div style={{ color: '#10b981', fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>
                          🟢 APUESTAS ABIERTAS
                        </div>
                        <div style={{ color: '#fff', fontWeight: 900, fontSize: 32, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                          {`${Math.floor(bettingTimeLeft / 60).toString().padStart(2,'0')}:${(bettingTimeLeft % 60).toString().padStart(2,'0')}`}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 }}>Contador automático de apuestas</div>
                      </div>
                      <Button 
                        block 
                        type="primary" 
                        danger 
                        style={{ 
                          fontWeight: 800, 
                          fontSize: 12, 
                          height: 42,
                          borderRadius: 10,
                          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }} 
                        onClick={handleCloseBets}
                      >
                        ⚔️ CERRAR APUESTAS — INICIAR COMBATE
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {isRunning ? (
                        <Button 
                          block 
                          type="primary" 
                          danger 
                          icon={<PauseCircleOutlined />} 
                          onClick={handlePause}
                          style={{ height: 42, borderRadius: 10, fontWeight: 800, fontSize: 13 }}
                        >
                          PAUSAR
                        </Button>
                      ) : (
                        <Button 
                          block 
                          type="primary" 
                          disabled={!gallinoName && !blancoName}
                          style={{ 
                            height: 42, 
                            borderRadius: 10, 
                            fontWeight: 800, 
                            fontSize: 13,
                            background: (gallinoName || blancoName) ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : undefined, 
                            borderColor: (gallinoName || blancoName) ? '#10b981' : undefined,
                            boxShadow: (gallinoName || blancoName) ? '0 4px 14px rgba(16, 185, 129, 0.3)' : undefined
                          }} 
                          icon={<PlayCircleOutlined />} 
                          onClick={handleStart}
                        >
                          INICIAR COMBATE
                        </Button>
                      )}
                      <Tooltip title="Restablecer reloj">
                        <Button 
                          icon={<RedoOutlined />} 
                          onClick={handleReset} 
                          style={{ 
                            height: 42,
                            width: 42,
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)', 
                            color: '#fff', 
                            border: '1px solid rgba(255,255,255,0.12)' 
                          }} 
                        />
                      </Tooltip>
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            {/* Panel 2: Active Cockfighters Info & Photo Upload */}
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <EditOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '0.5px' }}>
                      EDITAR GALLOS EN COMBATE
                    </span>
                  </div>
                }
                style={{ 
                  background: 'linear-gradient(145deg, rgba(18, 24, 38, 0.85) 0%, rgba(12, 16, 26, 0.95) 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(12px)'
                }}
                styles={{ body: { padding: '16px' } }}
              >
                {/* LADO AZUL */}
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.06)', 
                  border: '1px solid rgba(59, 130, 246, 0.2)', 
                  borderRadius: 10, 
                  padding: '10px 12px',
                  marginBottom: 10 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                    <Text style={{ color: '#60a5fa', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      LADO AZUL (IZQUIERDA)
                    </Text>
                  </div>
                  <Row gutter={6}>
                    <Col span={10}>
                      <Input 
                        size="small" 
                        placeholder="Traba Azul" 
                        value={gallinoName} 
                        onChange={(e) => setGallinoName(e.target.value)} 
                        style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'rgba(59, 130, 246, 0.3)', borderRadius: 6, fontWeight: 700 }} 
                      />
                    </Col>
                    <Col span={7}>
                      <Input 
                        size="small" 
                        placeholder="Peso" 
                        value={pesoAzul} 
                        onChange={(e) => setPesoAzul(e.target.value)} 
                        style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'rgba(59, 130, 246, 0.3)', borderRadius: 6, fontSize: 11 }} 
                      />
                    </Col>
                    <Col span={7}>
                      <Input 
                        size="small" 
                        placeholder="Marca" 
                        value={marcaAzul} 
                        onChange={(e) => setMarcaAzul(e.target.value)} 
                        style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'rgba(59, 130, 246, 0.3)', borderRadius: 6, fontSize: 11 }} 
                      />
                    </Col>
                  </Row>
                </div>

                {/* LADO BLANCO */}
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.04)', 
                  border: '1px solid rgba(255, 255, 255, 0.12)', 
                  borderRadius: 10, 
                  padding: '10px 12px',
                  marginBottom: 12 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffffff' }} />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      LADO BLANCO (DERECHA)
                    </Text>
                  </div>
                  <Row gutter={6}>
                    <Col span={10}>
                      <Input 
                        size="small" 
                        placeholder="Traba Blanca" 
                        value={blancoName} 
                        onChange={(e) => setBlancoName(e.target.value)} 
                        style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, fontWeight: 700 }} 
                      />
                    </Col>
                    <Col span={7}>
                      <Input 
                        size="small" 
                        placeholder="Peso" 
                        value={pesoBlanco} 
                        onChange={(e) => setPesoBlanco(e.target.value)} 
                        style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, fontSize: 11 }} 
                      />
                    </Col>
                    <Col span={7}>
                      <Input 
                        size="small" 
                        placeholder="Marca" 
                        value={marcaBlanco} 
                        onChange={(e) => setMarcaBlanco(e.target.value)} 
                        style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, fontSize: 11 }} 
                      />
                    </Col>
                  </Row>
                </div>

                {/* CUSTOM PHOTO UPLOAD BUTTONS */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📷 FOTOS EN VIVO (TRANSMISIÓN)
                  </Text>
                  <Row gutter={8}>
                    <Col span={12}>
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <input type="file" accept="image/*" onChange={handleFotoAzulChange} style={{ display: 'none' }} />
                        <div style={{ 
                          background: fotoAzul ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)', 
                          border: fotoAzul ? '1px solid #3b82f6' : '1px dashed rgba(59,130,246,0.4)', 
                          borderRadius: 8, 
                          padding: '6px 8px', 
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}>
                          <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {fotoAzul ? <CheckOutlined style={{ color: '#10b981' }} /> : <PictureOutlined />}
                            <span>{fotoAzul ? 'Azul Subida' : 'Foto Gallo Azul'}</span>
                          </div>
                        </div>
                      </label>
                    </Col>
                    <Col span={12}>
                      <label style={{ cursor: 'pointer', display: 'block' }}>
                        <input type="file" accept="image/*" onChange={handleFotoBlancoChange} style={{ display: 'none' }} />
                        <div style={{ 
                          background: fotoBlanco ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)', 
                          border: fotoBlanco ? '1px solid #ffffff' : '1px dashed rgba(255,255,255,0.4)', 
                          borderRadius: 8, 
                          padding: '6px 8px', 
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}>
                          <div style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {fotoBlanco ? <CheckOutlined style={{ color: '#10b981' }} /> : <PictureOutlined />}
                            <span>{fotoBlanco ? 'Blanca Subida' : 'Foto Gallo Blanco'}</span>
                          </div>
                        </div>
                      </label>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>

            {/* Panel 3: Careos & Fight Winner Resolution */}
            <Col xs={24} lg={8}>
              <Card 
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrophyOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '0.5px' }}>
                      CAREOS & RESOLUCIÓN
                    </span>
                  </div>
                }
                style={{ 
                  background: 'linear-gradient(145deg, rgba(18, 24, 38, 0.85) 0%, rgba(12, 16, 26, 0.95) 100%)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(12px)'
                }}
                styles={{ body: { padding: '16px' } }}
              >
                <div style={{ marginBottom: 14 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⏱️ CRONÓMETRO SECUNDARIO (CAREO)
                  </Text>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button 
                      size="middle" 
                      style={{ 
                        flex: 1, 
                        background: 'rgba(239, 68, 68, 0.12)', 
                        color: '#ef4444', 
                        borderColor: 'rgba(239, 68, 68, 0.3)', 
                        fontSize: 12, 
                        fontWeight: 800,
                        borderRadius: 8,
                        height: 40
                      }} 
                      onClick={() => handleStartSubTimer(60, 'CAREO')}
                    >
                      60s CAREO
                    </Button>
                    {subTimeLeft !== null && (
                      <Tooltip title="Cancelar cronómetro secundario">
                        <Button 
                          size="middle" 
                          type="text" 
                          danger 
                          icon={<CloseCircleOutlined />} 
                          onClick={handleCancelSubTimer} 
                          style={{ borderRadius: 8, height: 40 }}
                        />
                      </Tooltip>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🏆 REGISTRAR GANADOR DEL COMBATE
                  </Text>
                  <Row gutter={6}>
                    <Col span={8}>
                      <Button 
                        block 
                        size="middle" 
                        type="primary" 
                        onClick={() => handleSaveFightResult('Azul')} 
                        style={{ 
                          background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', 
                          borderColor: '#2563eb', 
                          fontSize: 11, 
                          fontWeight: 900,
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                          height: 38
                        }}
                      >
                        AZUL
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button 
                        block 
                        size="middle" 
                        type="primary" 
                        onClick={() => handleSaveFightResult('Blanco')} 
                        style={{ 
                          background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)', 
                          borderColor: '#ffffff', 
                          color: '#0f172a', 
                          fontSize: 11, 
                          fontWeight: 900,
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
                          height: 38
                        }}
                      >
                        BLANCO
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button 
                        block 
                        size="middle" 
                        type="primary" 
                        onClick={() => handleSaveFightResult('Tablas')} 
                        style={{ 
                          background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', 
                          borderColor: '#f59e0b', 
                          fontSize: 11, 
                          fontWeight: 900,
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                          height: 38
                        }}
                      >
                        TABLAS
                      </Button>
                    </Col>
                  </Row>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Split Cartelera: Programadas Left, Realizadas Right */}
        {!isFullscreen && (
          <Row gutter={[16, 16]}>
            {/* Left Column: pending fights */}
            <Col xs={24} lg={13}>
              <Card 
                title={
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '1px' }}>
                    PELEAS PROGRAMADAS (PENDIENTES)
                  </span>
                }
                style={{ 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  borderColor: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: 12,
                  overflow: 'hidden'
                }}
                styles={{ body: { padding: 0 } }}
              >
                <Table 
                  dataSource={pendingTableData} 
                  columns={pendingColumns} 
                  loading={loadingCartelera}
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: <Text style={{ color: 'rgba(255,255,255,0.35)' }}>No hay peleas programadas pendientes</Text> }}
                  className="custom-table"
                  style={{ background: 'transparent' }}
                />
              </Card>
            </Col>

            {/* Right Column: completed fights */}
            <Col xs={24} lg={11}>
              <Card 
                title={
                  <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                    <Col>
                      <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '1px' }}>
                        PELEAS REALIZADAS
                      </span>
                    </Col>
                    <Col>
                      {Object.keys(fightResults).length > 0 && (
                        <Button type="text" danger size="small" onClick={clearAllResults} icon={<DeleteOutlined />} style={{ fontSize: 11 }}>
                          Limpiar Historial
                        </Button>
                      )}
                    </Col>
                  </Row>
                }
                style={{ 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  borderColor: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: 12,
                  overflow: 'hidden'
                }}
                styles={{ body: { padding: 0 } }}
              >
                <Table 
                  dataSource={completedTableData} 
                  columns={completedColumns} 
                  loading={loadingCartelera}
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: <Text style={{ color: 'rgba(255,255,255,0.35)' }}>No hay peleas realizadas todavía</Text> }}
                  className="custom-table"
                  style={{ background: 'transparent' }}
                />
              </Card>
            </Col>
          </Row>
        )}

      </div>

      {/* Modal de decisión rápida al terminar Careo/Tierra */}
      <Modal
        title={<span style={{ color: '#fff', fontSize: 16, fontWeight: 800, fontFamily: 'Outfit' }}>¡TIEMPO CONCLUIDO! REGISTRAR RESULTADO</span>}
        open={showOutcomeModal}
        footer={null}
        closable={false}
        centered
        styles={{ body: { background: '#161616', padding: 24 } }}
        style={{ borderRadius: 12, overflow: 'hidden' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, display: 'block', marginBottom: 4, fontFamily: 'Outfit' }}>
            El tiempo de <strong>{subTimerLabel}</strong> de la Pelea #{fightNumber} ha concluido.
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, display: 'block', fontFamily: 'Outfit' }}>
            ¿Deseas registrar un ganador o declarar tablas ahora mismo?
          </Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button 
            type="primary" 
            size="large"
            onClick={() => {
              handleSaveFightResult('Azul');
              setShowOutcomeModal(false);
            }} 
            style={{ background: '#0f3dd1', borderColor: '#0f3dd1', fontWeight: 800, height: 48, fontSize: 13, textTransform: 'uppercase', fontFamily: 'Outfit' }}
          >
            GANÓ AZUL (PLACA): {gallinoName || 'LADO AZUL'}
          </Button>
          <Button 
            type="primary" 
            size="large"
            onClick={() => {
              handleSaveFightResult('Blanco');
              setShowOutcomeModal(false);
            }} 
            style={{ background: '#ffffff', borderColor: '#ffffff', color: '#111', fontWeight: 800, height: 48, fontSize: 13, textTransform: 'uppercase', fontFamily: 'Outfit' }}
          >
            GANÓ BLANCO: {blancoName || 'LADO BLANCO'}
          </Button>
          <Button 
            type="primary" 
            size="large"
            onClick={() => {
              handleSaveFightResult('Tablas');
              setShowOutcomeModal(false);
            }} 
            style={{ background: '#d97706', borderColor: '#d97706', fontWeight: 800, height: 48, fontSize: 13, textTransform: 'uppercase', fontFamily: 'Outfit' }}
          >
            PELEA EN TABLAS
          </Button>
          <Button 
            type="text" 
            danger
            onClick={() => setShowOutcomeModal(false)} 
            style={{ fontWeight: 700, marginTop: 8, fontFamily: 'Outfit' }}
          >
            DES CARTAR (SEGUIR COMBATE)
          </Button>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* FULL-SCREEN CELEBRATION OVERLAY (DYNAMIC SHOCKWAVE ANIM) */}
      {/* ======================================================== */}
      {celebration && (
        <div 
          onClick={() => setCelebration(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: celebration.type === 'Tablas' 
              ? 'rgba(10, 8, 4, 0.98)' 
              : celebration.type === 'Azul' 
                ? 'rgba(4, 9, 24, 0.98)' 
                : 'rgba(2, 4, 10, 0.98)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            animation: 'fadeInOverlay 0.3s ease-out',
            textAlign: 'center',
            padding: 20
          }}
        >
          {/* Neon Confetti Shower Effects */}
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => {
              const randomLeft = Math.random() * 100;
              const randomDelay = Math.random() * 4;
              const randomDuration = Math.random() * 3 + 2;
              const color = celebration.type === 'Tablas' 
                ? '#f59e0b' 
                : celebration.type === 'Azul' 
                  ? '#3b82f6' 
                  : '#ffffff';
              return (
                <div 
                  key={i} 
                  className="confetti-particle" 
                  style={{
                    left: `${randomLeft}%`,
                    animationDelay: `${randomDelay}s`,
                    animationDuration: `${randomDuration}s`,
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}`
                  }}
                />
              );
            })}
          </div>

          {/* Golden/Neon Shockwave ring */}
          <div className="shockwave-ring" style={{
            borderColor: celebration.type === 'Tablas' ? '#f59e0b' : celebration.type === 'Azul' ? '#2563eb' : '#fff',
            boxShadow: celebration.type === 'Tablas' ? '0 0 50px #f59e0b' : celebration.type === 'Azul' ? '0 0 50px #2563eb' : '0 0 50px #fff'
          }} />

          {/* Main animated banner wrapper */}
          <div style={{ animation: 'bounceScale 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both', zIndex: 10 }}>
            
            <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15 }}>
              <img 
                src="/official_logo.png" 
                style={{ 
                  width: 120, 
                  height: 120, 
                  borderRadius: '50%', 
                  border: '3px solid #d4af37', 
                  boxShadow: '0 0 25px rgba(212,175,55,0.6)', 
                  animation: 'pulse-gallo 2s infinite ease-in-out'
                }} 
                alt="Gallo Logo"
              />
            </div>

            <Text style={{ 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: 18, 
              fontWeight: 800, 
              letterSpacing: '5px', 
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: 10
            }}>
              PELEA #{celebration.fightNum} CONCLUIDA
            </Text>

            <Title level={1} className="pulse-text" style={{ 
              color: celebration.type === 'Tablas' ? '#f59e0b' : celebration.type === 'Azul' ? '#60a5fa' : '#ffffff', 
              fontSize: 'clamp(32px, 6vw, 64px)', 
              fontWeight: 900, 
              margin: 0,
              textTransform: 'uppercase',
              fontFamily: 'Outfit',
              letterSpacing: '2px',
              textShadow: celebration.type === 'Tablas' 
                ? '0 0 20px rgba(245,158,11,0.6), 0 0 40px rgba(245,158,11,0.3)' 
                : celebration.type === 'Azul' 
                  ? '0 0 20px rgba(96,165,250,0.6), 0 0 40px rgba(96,165,250,0.3)' 
                  : '0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.3)'
            }}>
              {celebration.title}
            </Title>

            <div style={{ 
              width: 120, 
              height: 4, 
              background: celebration.type === 'Tablas' ? '#f59e0b' : celebration.type === 'Azul' ? '#2563eb' : '#fff', 
              margin: '25px auto', 
              borderRadius: 2,
              boxShadow: '0 0 10px currentColor'
            }} />

            <Text style={{ 
              color: '#ffffff', 
              fontSize: 'clamp(14px, 3vw, 22px)', 
              fontWeight: 600, 
              opacity: 0.9,
              display: 'block',
              maxWidth: 700,
              margin: '0 auto 40px auto'
            }}>
              {celebration.subtitle}
            </Text>

            <Button 
              size="large" 
              type="primary"
              onClick={() => setCelebration(null)}
              style={{
                background: celebration.type === 'Tablas' ? '#f59e0b' : celebration.type === 'Azul' ? '#2563eb' : '#ffffff',
                borderColor: celebration.type === 'Tablas' ? '#f59e0b' : celebration.type === 'Azul' ? '#2563eb' : '#ffffff',
                color: celebration.type === 'Blanco' ? '#000' : '#fff',
                fontWeight: 900,
                borderRadius: 25,
                height: 50,
                padding: '0 40px',
                fontSize: 14,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
              }}
            >
              Confirmar & Continuar
            </Button>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        
        .digital-timer-font {
          font-family: 'Share Tech Mono', 'Courier New', Courier, monospace !important;
          font-weight: bold;
        }

        /* Metallic Gold reflection effect */
        .premium-logo-text {
          background: linear-gradient(to right, #bf953f 0%, #fcf6ba 25%, #b38728 50%, #fbf5b7 75%, #aa771c 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          position: relative;
        }

        /* Confetti particle rain */
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }

        .confetti-particle {
          position: absolute;
          top: -20px;
          width: 10px;
          height: 15px;
          opacity: 0.8;
          border-radius: 2px;
          animation: fallConfetti linear infinite;
        }

        @keyframes fallConfetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0;
          }
        }

        /* Zooming bounce scaling anim for banner */
        @keyframes bounceScale {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Full screen overlay fade in */
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Triumphant pulse text & Rooster logo pulse */
        .pulse-text {
          animation: textPulse 2s infinite ease-in-out;
        }
        @keyframes textPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        
        @keyframes pulse-gallo {
          0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(212,175,55,0.6); }
          50% { transform: scale(1.06); box-shadow: 0 0 45px rgba(212,175,55,0.9); }
        }

        /* Shockwave expanding circle */
        .shockwave-ring {
          position: absolute;
          width: 100px;
          height: 100px;
          border: 4px solid;
          border-radius: 50%;
          opacity: 0;
          animation: shockwaveExpand 1.5s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          pointer-events: none;
        }
        @keyframes shockwaveExpand {
          0% {
            width: 0px;
            height: 0px;
            opacity: 0.8;
          }
          100% {
            width: 800px;
            height: 800px;
            opacity: 0;
          }
        }

        /* Smooth infinite marquee scrolling */
        @keyframes ticker-marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-100%, 0, 0);
          }
        }

        /* Ant tables styling overrides */
        .custom-table .ant-table {
          background: transparent !important;
          color: #fff !important;
        }
        .custom-table .ant-table-thead > tr > th {
          background: rgba(255, 255, 255, 0.03) !important;
          color: rgba(255, 255, 255, 0.6) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
          color: #fff !important;
        }
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .custom-table .ant-pagination-item {
          background: transparent !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .custom-table .ant-pagination-item a {
          color: rgba(255,255,255,0.6) !important;
        }
        .custom-table .ant-pagination-item-active {
          border-color: #10b981 !important;
        }
        .custom-table .ant-pagination-item-active a {
          color: #10b981 !important;
        }
        .custom-table .ant-pagination-prev .ant-pagination-item-link,
        .custom-table .ant-pagination-next .ant-pagination-item-link {
          background: transparent !important;
          color: rgba(255,255,255,0.6) !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
      `}} />
    </div>
  );
}
