import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, Typography, Card, Modal, InputNumber, Row, Col, Divider, Badge, App as AntApp, Tag } from 'antd';
import { SendOutlined, MessageFilled, SignalFilled, ThunderboltFilled, PlayCircleFilled, EyeOutlined, TrophyOutlined, DownloadOutlined, WhatsAppOutlined, CopyOutlined, ShareAltOutlined, UpOutlined, DownOutlined, SmileOutlined } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';
import { useSound } from '../hooks/useSound';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const { Title, Text } = Typography;

// Specialized Video.js Player for HLS (.m3u8) streams
const HLSVideoPlayer = ({ url }) => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Create a dedicated video element for Video.js to manage
        const videoElement = document.createElement("video-js");
        videoElement.classList.add('vjs-big-play-centered', 'vjs-theme-city');
        videoElement.setAttribute('playsinline', 'true');
        videoElement.setAttribute('muted', 'true'); // Required for mobile autoplay
        containerRef.current.appendChild(videoElement);

        const player = playerRef.current = videojs(videoElement, {
            autoplay: true,
            muted: true,
            controls: true,
            playsinline: true,
            preload: 'auto',
            responsive: true,
            fluid: true,
            liveui: true,
            playbackRates: [1],
            sources: [{ src: url, type: 'application/x-mpegURL' }],
            controlBar: {
                children: ['playToggle', 'volumePanel', 'fullscreenToggle']
            }
        }, () => {
            // Player is ready
        });

        player.on('error', () => {
            const error = player.error();
            if (error && onError) {
                console.error('VideoJS Error:', error.message);
                onError();
            }
        });

        // Additional listener for early load failures
        player.on('stalled', () => {
             console.warn('Playback stalled, checking signal...');
        });

        return () => {
            if (player) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, [url]);

    return (
        <div data-vjs-player style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
            <style>{`
                .vjs-theme-city .vjs-control-bar { background: rgba(18, 23, 31, 0.85); backdrop-filter: blur(12px); }
                .vjs-theme-city .vjs-big-play-button { background: #00E5A3; color: #0b1117; border: none; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; margin-top: -32px; margin-left: -32px; box-shadow: 0 0 24px rgba(0, 229, 163, 0.4); }
                .vjs-theme-city .vjs-play-progress { background: #00E5A3; }
                .video-js { width: 100% !important; height: 100% !important; border-radius: 24px; }
                /* Hide the technical English error message from the player UI */
                .vjs-error-display { display: none !important; }
                .vjs-modal-dialog-content { display: none !important; }
            `}</style>
        </div>
    );
};

// Premium Dacast Iframe Player Wrapper & Standby Mode
const DacastPlayer = ({ status, stream_url, streamMode, viewerCount, hideBadge = false }) => {
    const [playerError, setPlayerError] = React.useState(false);
    const isHLS = stream_url?.toLowerCase().includes('.m3u8');
    const hasSignal = !!stream_url;

    // Reset error when URL changes
    React.useEffect(() => {
        setPlayerError(false);
    }, [stream_url]);

    if (streamMode === 'STANDBY' || playerError || (status !== 'LIVE' && !hasSignal)) {
        return (
          <div key="dacast-standby" style={{ 
              position: 'relative', width: '100%', paddingBottom: '56.25%', 
              background: 'linear-gradient(145deg, #121824 0%, #0a0d14 100%)',
              borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)'
          }}>
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%', zIndex: 11, padding: '0 16px' }}>
                <Title level={2} style={{ 
                    color: '#fff', 
                    margin: 0, 
                    fontWeight: 800, 
                    letterSpacing: '2px', 
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 'clamp(18px, 3.5vw, 30px)',
                    textTransform: 'uppercase'
                }}>
                    COLISEO ANGEL CRUZ
                </Title>
                <div style={{ width: 40, height: 2, background: '#10b981', margin: '12px auto', borderRadius: 2 }} />
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {playerError ? 'Reconectando señal...' : status !== 'LIVE' && !hasSignal ? 'Esperando señal de transmisión' : 'Transmisión en breve'}
                </Text>
             </div>
          </div>
        );
    }

    const isDirectVideo = stream_url?.match(/\.(mp4|webm|mov|ogg)$/i) || stream_url?.includes('/storage/v1/object/public/');

    if (isHLS) {
        return (
            <div key="dacast-hls" style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                {!hideBadge && (
                    <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, display: 'flex', gap: 8 }}>
                        <div style={{ background: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, animation: 'blink 1.5s infinite' }}>
                            <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse-live 2s infinite' }} />
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>EN VIVO</Text>
                        </div>
                    </div>
                )}
                <HLSVideoPlayer url={stream_url} onError={() => setPlayerError(true)} />
            </div>
        );
    }

    return (
        <div key="dacast-standard-container" style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a0a' }}>
            {!hideBadge && (
                <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, display: 'flex', gap: 8 }}>
                    <div style={{ background: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, animation: 'blink 1.5s infinite' }}>
                        <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse-live 2s infinite' }} />
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>EN VIVO</Text>
                    </div>
                </div>
            )}

            {isDirectVideo ? (
                <video 
                    key="dacast-video"
                    src={stream_url} 
                    controls 
                    autoPlay 
                    muted 
                    playsInline
                    webkit-playsinline="true"
                    onError={() => setPlayerError(true)}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
            ) : (
                <iframe 
                    key="dacast-iframe"
                    src={stream_url || "https://iframe.dacast.com/live/55197822-2232-7fde-fcf0-9369fe4022fb/013bad74-e5d5-4478-824f-893cedb06b66"} 
                    width="100%" height="100%" frameBorder="0" scrolling="no" allow="autoplay; encrypted-media" allowFullScreen 
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
            )}
            <style>{`
                @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
                @keyframes pulse-live {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 255, 255, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }
            `}</style>
        </div>
    );
};

const UserLiveView = ({ userBalance, setUserBalance, currentUser, setCurrentView }) => {
  const { message: msg } = AntApp.useApp();
  const { play, preload } = useSound();
  
  // Interaction State
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectionFight, setSelectionFight] = useState(null);
  const [betSide, setBetSide] = useState(null);
  const [betAmount, setBetAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [showRoosterStrike, setShowRoosterStrike] = useState(false);
  
  // Real-time Presence State
  const [viewerCount, setViewerCount] = useState(1);
  const sessionUuid = useRef(Math.random().toString(36).substring(2, 12)).current;
  
  // User & Chat State
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [todayProgram, setTodayProgram] = useState([]);
  const [carteleraFilter, setCarteleraFilter] = useState('ALL'); // 'ALL', 'PENDING', 'FINISHED'
  const [chatInput, setChatInput] = useState('');
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [globalStream, setGlobalStream] = useState('');
  const [showCartelera, setShowCartelera] = useState(true);
  const [streamMode, setStreamMode] = useState('LIVE');
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const chatEndRef = useRef(null);
  const channelRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Fight State
  const [fightInfo, setFightInfo] = useState({
    id: null,
    gallo_a_name: 'Gallo Azul',
    gallo_b_name: 'Gallo Blanco',
    gallo_a_weight: '3.2 lbs',
    gallo_b_weight: '3.1 lbs',
    post_number: '1',
    gallo_a_odds: 1.90,
    gallo_b_odds: 1.90,
    status: 'PENDING'
  });

  const [betTimerSeconds, setBetTimerSeconds] = useState(null);

  // Live betting countdown calculator (3-minute window from status change)
  useEffect(() => {
    if (!fightInfo.id || fightInfo.status !== 'LIVE') {
      setBetTimerSeconds(null);
      return;
    }

    const updateBetTimer = () => {
      const refTimeStr = fightInfo.updated_at || fightInfo.created_at;
      const refTime = refTimeStr ? new Date(refTimeStr).getTime() : Date.now();
      const now = Date.now();
      const elapsedSec = Math.max(0, Math.floor((now - refTime) / 1000));
      const BETTING_WINDOW_SEC = 180; // 3 minutes window
      const rem = Math.max(0, BETTING_WINDOW_SEC - elapsedSec);
      setBetTimerSeconds(rem);
    };

    updateBetTimer();
    const interval = setInterval(updateBetTimer, 1000);
    return () => clearInterval(interval);
  }, [fightInfo.id, fightInfo.status, fightInfo.updated_at, fightInfo.created_at]);

  const formatBetTimer = (totalSec) => {
    if (totalSec === null || isNaN(totalSec)) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Draggable / Resizable Scoreboard Overlay State
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayPos, setOverlayPos] = useState({ x: 12, y: 12 });
  const [overlaySize, setOverlaySize] = useState({ w: 340, h: 'auto' });
  const overlayRef = useRef(null);
  const dragState = useRef(null);    // { startX, startY, startPosX, startPosY }
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [isFbFullscreen, setIsFbFullscreen] = useState(false);
  const [fbActiveTab, setFbActiveTab] = useState('chat'); // 'chat' | 'cartelera'
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [fbChatInput, setFbChatInput] = useState('');
  const fbChatContainerRef = useRef(null);

  // Live Scoreboard Clock State & Sync (Matching RelojView exact UI layout)
  const [clockElapsedTime, setClockElapsedTime] = useState(0);
  const [clockTimeLeft, setClockTimeLeft] = useState(600);
  const [clockSubTimeLeft, setClockSubTimeLeft] = useState(null);
  const [scoreboardStyle, setScoreboardStyle] = useState(() => localStorage.getItem('scoreboard_style') || 'modern');
  const [bettingCountdown, setBettingCountdown] = useState(120);

  useEffect(() => {
    const calcBettingTime = () => {
      if (fightInfo && fightInfo.status === 'LIVE') {
        const started = fightInfo.updated_at ? new Date(fightInfo.updated_at).getTime() : Date.now();
        const elapsed = Math.floor((Date.now() - started) / 1000);
        const remaining = Math.max(0, 120 - elapsed);
        setBettingCountdown(remaining);
      } else {
        setBettingCountdown(0);
      }
    };

    calcBettingTime();
    const interval = setInterval(calcBettingTime, 1000);
    return () => clearInterval(interval);
  }, [fightInfo]);

  useEffect(() => {
    const syncClock = () => {
      const isRun = localStorage.getItem('clock_running') === 'true';
      const startedAt = parseInt(localStorage.getItem('clock_started_at') || '0', 10);
      const totalDuration = parseInt(localStorage.getItem('clock_total_duration') || '600', 10);
      const elapsedPaused = parseInt(localStorage.getItem('clock_elapsed_paused') || '0', 10);
      const subLeft = localStorage.getItem('sub_timer_left');

      if (subLeft) {
        setClockSubTimeLeft(parseInt(subLeft, 10));
      } else {
        setClockSubTimeLeft(null);
      }

      if (isRun && startedAt > 0) {
        const now = Date.now();
        const delta = Math.floor((now - startedAt) / 1000);
        const currentElapsed = Math.min(totalDuration, elapsedPaused + delta);
        setClockElapsedTime(currentElapsed);
        setClockTimeLeft(Math.max(0, totalDuration - currentElapsed));
      } else {
        setClockElapsedTime(elapsedPaused);
        setClockTimeLeft(Math.max(0, totalDuration - elapsedPaused));
      }
    };

    syncClock();
    const interval = setInterval(syncClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatClockTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (fbChatContainerRef.current) {
      fbChatContainerRef.current.scrollTo({
        top: fbChatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages.length, isFbFullscreen]);

  const triggerReaction = (emoji) => {
    try { play('NOTIFY'); } catch(e){}
    const id = Math.random().toString(36).substring(2, 9);
    const randomLeft = Math.floor(Math.random() * 25) + 65; // 65% - 90%
    setFloatingReactions(prev => [...prev, { id, emoji, left: randomLeft }]);

    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2200);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'live_reaction',
        payload: { emoji, user_id: userId }
      });
    }
  };
  const handleOverlayMouseDown = (e) => {
    // Only drag from the header bar (not from resize handle)
    if (e.target.closest('[data-resize]')) return;
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, startPosX: overlayPos.x, startPosY: overlayPos.y };
    const onMove = (ev) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setOverlayPos({ x: dragState.current.startPosX + dx, y: dragState.current.startPosY + dy });
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startW = overlayRef.current?.offsetWidth || 340;
    resizeState.current = { startX: e.clientX, startW };
    const onMove = (ev) => {
      if (!resizeState.current) return;
      const dx = ev.clientX - resizeState.current.startX;
      const newW = Math.max(200, Math.min(700, resizeState.current.startW + dx));
      setOverlaySize(prev => ({ ...prev, w: newW }));
    };
    const onUp = () => {
      resizeState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
        });
    }
  };

  useEffect(() => {
    if (isReplayModalOpen && selectedReplay && !selectedReplay.stream_url) {
        setIsVideoLoading(false);
    }
  }, [isReplayModalOpen, selectedReplay]);
  useEffect(() => {
    const unlockAudio = () => {
      preload();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // 1. Auth Sync
  useEffect(() => {
    window.sessionStartTime = Date.now();
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email);
      }
    };
    checkAuth();
  }, []);

  // 2. Data & Real-time Sync
  useEffect(() => {
    const initData = async () => {
      try {

        // Fetch current active fight (LIVE or CLOSED). Ignore FINISHED for the main top display.
        const activeEvents = await rawFetch(`events?select=*&status=in.(LIVE,CLOSED)&order=updated_at.desc&limit=1`);
        if (activeEvents && activeEvents[0]) {
            setFightInfo(activeEvents[0]);
        } else {
            // Default empty fight if nothing is active
            setFightInfo(prev => ({ ...prev, id: null, status: 'PENDING' }));
        }

        // Fetch matched cartelera fights and events, then merge them
        const cartelera = await rawFetch('cartelera_fights?select=*&order=numero_pelea.asc');
        const events = await rawFetch('events?select=*&order=post_number.asc');
        
        if (cartelera) {
          const merged = cartelera.map(f => {
            const ev = events ? events.find(e => parseInt(e.post_number) === f.numero_pelea) : null;
            if (ev) {
              return {
                ...ev,
                gallo_a_name: ev.gallo_a_name || f.traba_a,
                gallo_b_name: ev.gallo_b_name || f.traba_b,
                gallo_a_weight: ev.gallo_a_weight || JSON.stringify({ weight: `${f.peso_libras_a}-${f.peso_onzas_a}.${f.peso_puntos_a}`, color: f.color_a, marca: f.marca_a, clase: f.clase_a, turno: f.turno_a }),
                gallo_b_weight: ev.gallo_b_weight || JSON.stringify({ weight: `${f.peso_libras_b}-${f.peso_onzas_b}.${f.peso_puntos_b}`, color: f.color_b, marca: f.marca_b, clase: f.clase_b, turno: f.turno_b }),
              };
            }
            return {
              id: f.id,
              post_number: f.numero_pelea.toString(),
              gallo_a_name: f.traba_a,
              gallo_b_name: f.traba_b,
              gallo_a_weight: JSON.stringify({ weight: `${f.peso_libras_a}-${f.peso_onzas_a}.${f.peso_puntos_a}`, color: f.color_a, marca: f.marca_a, clase: f.clase_a, turno: f.turno_a }),
              gallo_b_weight: JSON.stringify({ weight: `${f.peso_libras_b}-${f.peso_onzas_b}.${f.peso_puntos_b}`, color: f.color_b, marca: f.marca_b, clase: f.clase_b, turno: f.turno_b }),
              gallo_a_odds: 1.9,
              gallo_b_odds: 1.9,
              status: 'PENDING'
            };
          });
          setTodayProgram(merged);
        } else if (events) {
          setTodayProgram(events);
        }

        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const initialMsgs = await rawFetch(`messages?select=*&created_at=gte.${oneHourAgo}&order=created_at.desc&limit=100`);
        if (initialMsgs && Array.isArray(initialMsgs)) {
            setChatMessages(initialMsgs.reverse());
        }

        const settings = await rawFetch(`settings`);
        if (settings) {
            const stream = settings.find(s => s.id === 'live_stream_url');
            const cartelera = settings.find(s => s.id === 'show_cartelera');
            const mode = settings.find(s => s.id === 'stream_logic_mode');
            const styleSetting = settings.find(s => s.id === 'scoreboard_style');
            if (stream) setGlobalStream(stream.value);
            if (cartelera) setShowCartelera(cartelera.value === 'true');
            if (mode) setStreamMode(mode.value);
            if (styleSetting && styleSetting.value) {
              setScoreboardStyle(styleSetting.value);
              localStorage.setItem('scoreboard_style', styleSetting.value);
            }
        }
      } catch (err) {
        console.error('Core Sync Err:', err);
      }
    };

    initData();
  }, []);

  // 3. Real-time Engine
  useEffect(() => {
    // Join Broadcast & Change Channel
    const channel = supabase.channel('chat_live', {
        config: {
            broadcast: { self: true },
        },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'live_reaction' }, ({ payload }) => {
          if (payload && payload.emoji) {
              const id = Math.random().toString(36).substring(2, 9);
              const randomLeft = Math.floor(Math.random() * 25) + 65;
              setFloatingReactions(prev => [...prev, { id, emoji: payload.emoji, left: randomLeft }]);
              setTimeout(() => {
                  setFloatingReactions(prev => prev.filter(r => r.id !== id));
              }, 2200);
          }
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          setChatMessages(prev => {
              // Deduplicate by content and user in a short window
              const isDuplicate = prev.some(m => 
                  m.text === payload.text && 
                  m.user_id === payload.user_id && 
                  Math.abs(Date.now() - new Date(m.created_at).getTime()) < 2000
              );
              if (isDuplicate) return prev;
              
              if (payload.user_id !== userId) play('NOTIFY');
              return [...prev, payload];
          });
      })
      .on('broadcast', { event: 'scoreboard_style_sync' }, ({ payload }) => {
          if (payload && payload.style) {
              setScoreboardStyle(payload.style);
              localStorage.setItem('scoreboard_style', payload.style);
          }
      })
      .on('broadcast', { event: 'clock_sync' }, ({ payload }) => {
          if (payload) {
            if (payload.clock_running !== undefined) localStorage.setItem('clock_running', payload.clock_running ? 'true' : 'false');
            if (payload.clock_started_at !== undefined) localStorage.setItem('clock_started_at', payload.clock_started_at.toString());
            if (payload.clock_elapsed_paused !== undefined) localStorage.setItem('clock_elapsed_paused', payload.clock_elapsed_paused.toString());
            if (payload.clock_total_duration !== undefined) localStorage.setItem('clock_total_duration', payload.clock_total_duration.toString());
            if (payload.sub_timer_left !== undefined) {
              if (payload.sub_timer_left !== null) localStorage.setItem('sub_timer_left', payload.sub_timer_left.toString());
              else localStorage.removeItem('sub_timer_left');
            }
          }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
          if (payload.new) {
              if (payload.new.id === 'scoreboard_style') {
                  setScoreboardStyle(payload.new.value);
                  localStorage.setItem('scoreboard_style', payload.new.value);
              }
              if (payload.new.id === 'clock_state') {
                  try {
                    const cState = typeof payload.new.value === 'string' ? JSON.parse(payload.new.value) : payload.new.value;
                    if (cState.clock_running !== undefined) localStorage.setItem('clock_running', cState.clock_running ? 'true' : 'false');
                    if (cState.clock_started_at !== undefined) localStorage.setItem('clock_started_at', cState.clock_started_at.toString());
                    if (cState.clock_elapsed_paused !== undefined) localStorage.setItem('clock_elapsed_paused', cState.clock_elapsed_paused.toString());
                    if (cState.clock_total_duration !== undefined) localStorage.setItem('clock_total_duration', cState.clock_total_duration.toString());
                    if (cState.sub_timer_left !== undefined) {
                      if (cState.sub_timer_left !== null) localStorage.setItem('sub_timer_left', cState.sub_timer_left.toString());
                      else localStorage.removeItem('sub_timer_left');
                    }
                  } catch(e){}
              }
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          if (payload.new) {
              setChatMessages(prev => {
                  const exists = prev.some(m => m.id === payload.new.id || (m.text === payload.new.text && m.user_id === payload.new.user_id && Math.abs(Date.now() - new Date(m.created_at).getTime()) < 3000));
                  if (exists) return prev;
                  if (payload.new.user_id !== userId) play('NOTIFY');
                  return [...prev, payload.new];
              });
          }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        if (payload.eventType === 'DELETE') {
            setTodayProgram(prev => prev.filter(e => e.id !== payload.old.id));
            // If the current active fight was deleted, we should probably clear it or wait for the next update
            setFightInfo(prev => {
                if (prev.id === payload.old.id) {
                    return { id: null, status: 'PENDING', gallo_a_name: 'Gallo Azul', gallo_b_name: 'Gallo Blanco' };
                }
                return prev;
            });
            return;
        }
        
        if (payload.new) {
            // Only update fightInfo if this event is actually the active (LIVE/CLOSED) fight
            setFightInfo(prev => {
                if (payload.new.status === 'LIVE' || payload.new.status === 'CLOSED') {
                    // This event just became active — show it
                    return payload.new;
                } else if (payload.new.status === 'FINISHED' || payload.new.status === 'PENDING') {
                    // If it was the active fight and just finished or reset to pending, clear it
                    if (prev.id === payload.new.id || parseInt(prev.post_number) === parseInt(payload.new.post_number)) {
                        return { id: null, status: 'PENDING', gallo_a_name: 'Gallo Azul', gallo_b_name: 'Gallo Blanco' };
                    }
                }
                return prev;
            });

            // Update program list in real-time
            setTodayProgram(prev => {
                const index = prev.findIndex(e => parseInt(e.post_number) === parseInt(payload.new.post_number));
                if (index > -1) {
                    const newProg = [...prev];
                    newProg[index] = {
                        ...newProg[index],
                        ...payload.new,
                        gallo_a_name: payload.new.gallo_a_name || newProg[index].gallo_a_name,
                        gallo_b_name: payload.new.gallo_b_name || newProg[index].gallo_b_name,
                        gallo_a_weight: payload.new.gallo_a_weight || newProg[index].gallo_a_weight,
                        gallo_b_weight: payload.new.gallo_b_weight || newProg[index].gallo_b_weight
                    };
                    return newProg;
                }
                return [...prev, payload.new].sort((a, b) => {
                    const numA = parseInt((a.post_number || '0').replace(/\D/g, '')) || 0;
                    const numB = parseInt((b.post_number || '0').replace(/\D/g, '')) || 0;
                    return numA - numB;
                });
            });
            if (payload.new.status === 'LIVE' && payload.old?.status !== 'LIVE') play('STRIKE');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        // Only load if not already in state from Broadcast
        setChatMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            // If it's a message from someone else that we didn't get via broadcast
            if (prev.some(m => m.text === payload.new.text && m.user_id === payload.new.user_id)) return prev;
            return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, payload => {
          if (payload.new) {
              if (payload.new.id === 'live_stream_url') setGlobalStream(payload.new.value);
              if (payload.new.id === 'show_cartelera') setShowCartelera(payload.new.value === 'true');
              if (payload.new.id === 'stream_logic_mode') setStreamMode(payload.new.value);
              if (payload.new.id === 'scoreboard_style') {
                  setScoreboardStyle(payload.new.value);
                  localStorage.setItem('scoreboard_style', payload.new.value);
              }
              if (payload.new.id === 'clock_state') {
                  try {
                    const cState = typeof payload.new.value === 'string' ? JSON.parse(payload.new.value) : payload.new.value;
                    if (cState.clock_running !== undefined) localStorage.setItem('clock_running', cState.clock_running ? 'true' : 'false');
                    if (cState.clock_started_at !== undefined) localStorage.setItem('clock_started_at', cState.clock_started_at.toString());
                    if (cState.clock_elapsed_paused !== undefined) localStorage.setItem('clock_elapsed_paused', cState.clock_elapsed_paused.toString());
                    if (cState.clock_total_duration !== undefined) localStorage.setItem('clock_total_duration', cState.clock_total_duration.toString());
                    if (cState.sub_timer_left !== undefined) {
                      if (cState.sub_timer_left !== null) localStorage.setItem('sub_timer_left', cState.sub_timer_left.toString());
                      else localStorage.removeItem('sub_timer_left');
                    }
                  } catch(e){}
              }
          }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log('🛡️ CANAL HÍBRIDO ASEGURADO: Realtime + Broadcast Activo');
          }
      });

    // 4. Arena Realtime Broadcast Channel (Fight status & bet resolution)
    const arenaChannel = supabase.channel('arena_realtime', {
        config: { broadcast: { self: true } }
    });

    arenaChannel
      .on('broadcast', { event: 'fight_status_change' }, ({ payload }) => {
        if (!payload) return;
        const { post_number, status, id } = payload;
        
        if (status === 'CLOSED' || status === 'FINISHED') {
          setIsBetModalOpen(prev => {
            if (prev) msg.warning(`⚔️ Apuestas cerradas para Pelea #${post_number}`);
            return false;
          });
          setIsSelectionModalOpen(false);
        }

        setFightInfo(prev => {
          if (parseInt(prev.post_number) === parseInt(post_number) || prev.id === id) {
            return { ...prev, status };
          }
          return prev;
        });

        setTodayProgram(prev => prev.map(item => {
          if (parseInt(item.post_number) === parseInt(post_number) || item.id === id) {
            return { ...item, status };
          }
          return item;
        }));
      })
      .on('broadcast', { event: 'bets_resolved' }, async ({ payload }) => {
        if (userId) {
          try {
            const userRes = await rawFetch(`users?select=balance&id=eq.${userId}`);
            if (userRes && userRes[0]) {
              const newBal = parseFloat(userRes[0].balance);
              setUserBalance(prev => {
                if (newBal > prev) {
                  play('WIN');
                  msg.success('🎉 ¡Apuesta liquidada con éxito! Saldo acreditado.');
                }
                return newBal;
              });
            }
          } catch(e){}
        }
      })
      .subscribe();

    // 5. Presence Engine: track active connections
    const presenceChannel = supabase.channel('online_viewers', {
        config: {
            presence: {
                key: userId || 'anonymous',
            },
        },
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const total = Object.values(state).reduce((acc, presences) => acc + presences.length, 0);
            setViewerCount(total > 0 ? total : 1);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    id: sessionUuid,
                    online_at: new Date().toISOString(),
                });
            }
        });

    return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(arenaChannel);
        supabase.removeChannel(presenceChannel);
    };
  }, [userId]);

  // 3b. Fast-poll: active fight & balance every 3s to stay 100% in sync
  useEffect(() => {
    const syncAll = async () => {
      try {
        // 1. Sync active fight
        const active = await rawFetch(`events?select=*&status=in.(LIVE,CLOSED)&order=updated_at.desc&limit=1`);
        if (active && active[0]) {
          const fresh = active[0];
          setFightInfo(prev => {
            if (prev.id === fresh.id && prev.status !== fresh.status) {
              if (fresh.status === 'CLOSED' || fresh.status === 'FINISHED') {
                setIsBetModalOpen(false);
                setIsSelectionModalOpen(false);
              }
            }
            return fresh;
          });
        } else {
          setFightInfo(prev => {
            if (prev.status === 'LIVE' || prev.status === 'CLOSED') {
              return { id: null, status: 'PENDING', gallo_a_name: 'Gallo Azul', gallo_b_name: 'Gallo Blanco' };
            }
            return prev;
          });
        }

        // 2. Sync cartelera list statuses
        const events = await rawFetch('events?select=*&order=post_number.asc');
        if (events) {
          setTodayProgram(prev => prev.map(item => {
            const ev = events.find(e => parseInt(e.post_number) === parseInt(item.post_number));
            if (ev) {
              return {
                ...item,
                ...ev,
                gallo_a_name: ev.gallo_a_name || item.gallo_a_name,
                gallo_b_name: ev.gallo_b_name || item.gallo_b_name,
                gallo_a_weight: ev.gallo_a_weight || item.gallo_a_weight,
                gallo_b_weight: ev.gallo_b_weight || item.gallo_b_weight,
              };
            }
            return item;
          }));
        }

        // 3. Sync user balance
        if (userId) {
          const userRes = await rawFetch(`users?select=balance&id=eq.${userId}`);
          if (userRes && userRes[0]) {
            const freshBal = parseFloat(userRes[0].balance);
            setUserBalance(prev => {
              if (freshBal > prev) {
                play('WIN');
              }
              return freshBal;
            });
          }
        }

        // 4. Sync scoreboard style & clock state
        const settings = await rawFetch('settings');
        if (settings && Array.isArray(settings)) {
          const styleSetting = settings.find(s => s.id === 'scoreboard_style');
          if (styleSetting && styleSetting.value) {
            setScoreboardStyle(styleSetting.value);
            localStorage.setItem('scoreboard_style', styleSetting.value);
          }
          const clockSetting = settings.find(s => s.id === 'clock_state');
          if (clockSetting && clockSetting.value) {
            try {
              const cState = typeof clockSetting.value === 'string' ? JSON.parse(clockSetting.value) : clockSetting.value;
              if (cState.clock_running !== undefined) localStorage.setItem('clock_running', cState.clock_running ? 'true' : 'false');
              if (cState.clock_started_at !== undefined) localStorage.setItem('clock_started_at', cState.clock_started_at.toString());
              if (cState.clock_elapsed_paused !== undefined) localStorage.setItem('clock_elapsed_paused', cState.clock_elapsed_paused.toString());
              if (cState.clock_total_duration !== undefined) localStorage.setItem('clock_total_duration', cState.clock_total_duration.toString());
              if (cState.sub_timer_left !== undefined) {
                if (cState.sub_timer_left !== null) localStorage.setItem('sub_timer_left', cState.sub_timer_left.toString());
                else localStorage.removeItem('sub_timer_left');
              }
            } catch(e){}
          }
        }
      } catch (_) {}
    };
    const interval = setInterval(syncAll, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  const [lastMessageCount, setLastMessageCount] = useState(0);

  // 🕒 EPHEMERAL CHAT ENGINE: Strict 1-Hour Autodestruct (Screen & DB Cleanup)
  useEffect(() => {
    const cleanExpiredMessages = async () => {
      const now = Date.now();
      const cutoff = now - 3600000; // 1 Hour (3,600,000 ms)
      const cutoffIso = new Date(cutoff).toISOString();
      
      // 1. Immediate screen memory cleanup
      setChatMessages(prev => prev.filter(msg => {
        return new Date(msg.created_at).getTime() > cutoff;
      }));

      // 2. Database cleanup (delete messages older than 1 hour)
      try {
        await supabase.from('messages').delete().lt('created_at', cutoffIso);
      } catch (_) {}
    };

    cleanExpiredMessages();
    const ticker = setInterval(cleanExpiredMessages, 60000); // Check every 60 seconds
    return () => clearInterval(ticker);
  }, []);

  // SMART SCROLL: Only jump to bottom if count increases
  useEffect(() => {
    if (chatMessages.length > lastMessageCount) {
        scrollToBottom();
    }
    setLastMessageCount(chatMessages.length);
  }, [chatMessages.length]);

  // INITIAL FOCUS: Show top header and video on mount smoothly
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openBetSelectionModal = (fight) => {
    if (!currentUser) return setCurrentView('login');
    if (fight && (fight.status === 'CLOSED' || fight.status === 'FINISHED')) {
      return msg.warning(`Las apuestas para la Pelea #${fight.post_number} están CERRADAS`);
    }
    setSelectionFight(fight);
    setIsSelectionModalOpen(true);
  };

  const openBetModal = (side, targetFight = fightInfo) => {
    if (!currentUser) return setCurrentView('login');
    const f = targetFight || fightInfo;
    if (f && f.status !== 'LIVE') return msg.warning('APUESTAS CERRADAS');
    setBetSide(side);
    setIsBetModalOpen(true);
  };

  const handleBetConfirm = async () => {
    if (!userId || !fightInfo.id || loading) return;
    if (betAmount > userBalance) return msg.error('SALDO INSUFICIENTE');
    
    setLoading(true);
    try {
      // 🛡️ RE-VERIFY: Check if market is still open before taking money
      const freshFights = await rawFetch(`events?select=status&id=eq.${fightInfo.id}`);
      if (!freshFights[0] || freshFights[0].status !== 'LIVE') throw new Error('MERCADO CERRADO');

      const amount = parseFloat(betAmount);
      const newBalance = (parseFloat(userBalance) - amount).toFixed(2);
      
      // 1. DEDUCT: Take money first (Atomic principle)
      await rawFetch(`users?id=eq.${userId}`, { method: 'PATCH', body: { balance: newBalance } });
      
      // 2. LOG DEDUCTION: Performance Audit
      await rawFetch('transactions', {
        method: 'POST',
        body: {
          user_id: userId,
          amount_change: -amount,
          type: 'BET_PLACED',
          description: `Apuesta Pelea #${fightInfo.post_number} (Gallo ${betSide === 'A' ? 'AZUL' : 'BLANCO'})`
        }
      });

      // 3. RECORD BET: Capture odds at the moment of betting
      await rawFetch('bets', {
        method: 'POST',
        body: {
          user_id: userId, 
          event_id: fightInfo.id, 
          selected_side: betSide, 
          amount: amount,
          odds_at_bet: betSide === 'A' ? fightInfo.gallo_a_odds : fightInfo.gallo_b_odds
        }
      });

      play('BET');
      setUserBalance(newBalance);
      setIsBetModalOpen(false);
      
      // 🐓 TRIGGER: THE GOLDEN ROOSTER STRIKE
      setShowRoosterStrike(true);
      setTimeout(() => setShowRoosterStrike(false), 2500);

      msg.success('¡JUGADA REGISTRADA CON ÉXITO!');
    } catch (e) {
      msg.error(e.message === 'MERCADO CERRADO' ? 'El combate ya ha comenzado' : 'Error en la jugada');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customText) => {
    if (!currentUser) return setCurrentView('login');

    const text = (typeof customText === 'string' ? customText : chatInput).trim();
    if (!text) return;

    if (typeof customText !== 'string') {
      setChatInput('');
    }

    const senderId = userId || sessionUuid;
    const senderEmail = userEmail ? userEmail.split('@')[0] : 'Usuario';

    const messagePayload = {
        id: `br_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: senderId,
        user_email: senderEmail,
        text,
        type: 'USER',
        created_at: new Date().toISOString()
    };

    // Immediately update local chat state so user sees comment INSTANTLY!
    setChatMessages(prev => {
        const exists = prev.some(m => m.id === messagePayload.id || (m.text === messagePayload.text && m.user_id === messagePayload.user_id && Math.abs(Date.now() - new Date(m.created_at).getTime()) < 2000));
        if (exists) return prev;
        return [...prev, messagePayload];
    });

    // 1. BROADCAST: Send to everyone immediately
    if (channelRef.current) {
        channelRef.current.send({
            type: 'broadcast',
            event: 'chat_message',
            payload: messagePayload
        });
    }

    try {
        // 2. PERSIST: Save to DB in the background
        await supabase.from('messages').insert({
            user_id: senderId,
            user_email: senderEmail,
            text,
            type: 'USER'
        });
    } catch (e) {
        console.error('Chat Persist Err:', e);
    }
  };

  const handleDownload = async (url, postNumber) => {
    const hide = msg.loading('Preparando descarga...', 0);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Pelea_${postNumber}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      msg.success('Descarga iniciada');
    } catch (err) {
      window.open(url, '_blank');
      msg.warning('Iniciando descarga en nueva pestaña');
    } finally {
      hide();
    }
  };

  const handleShare = async (event) => {
    if (!event) return;
    const nameA = (event.gallo_a_name || '').replace('[ARCHIVED] ', '');
    const nameB = (event.gallo_b_name || '');
    const winnerName = (event.winner_side === 'A' ? nameA : nameB).replace('[ARCHIVED] ', '');
    
    const shareData = {
      title: `Coliseo Ángel Cruz - Pelea #${event.post_number || ''}`,
      text: `¡Mira esta pelea! Pelea #${event.post_number || ''}: ${nameA} vs ${nameB}. Ganador: ${winnerName}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share Error:', err);
      }
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
      window.open(waUrl, '_blank');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    msg.success('Enlace copiado al portapapeles');
  };

  const cleanWeight = (val) => {
    if (!val) return '-';
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object') {
        return parsed.weight || '-';
      }
    } catch (e) {}
    return val;
  };

  const sortedCartelera = React.useMemo(() => {
    const list = [...todayProgram];
    list.sort((a, b) => {
      const aIsActive = fightInfo.id && a.id === fightInfo.id;
      const bIsActive = fightInfo.id && b.id === fightInfo.id;
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      const aIsFinished = a.status === 'FINISHED';
      const bIsFinished = b.status === 'FINISHED';
      if (!aIsFinished && bIsFinished) return -1;
      if (aIsFinished && !bIsFinished) return 1;

      const numA = parseInt(String(a.post_number || '0').replace(/[^0-9]/g, ''), 10) || 0;
      const numB = parseInt(String(b.post_number || '0').replace(/[^0-9]/g, ''), 10) || 0;
      return numA - numB;
    });
    return list;
  }, [todayProgram, fightInfo.id]);

  const formatWeight = (val) => {
    if (!val) return '';
    if (typeof val === 'object') {
      return val.weight || val.peso || val.lbs || '';
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          return parsed.weight || parsed.peso || parsed.lbs || trimmed;
        } catch(_) {}
      }
      return trimmed;
    }
    return String(val);
  };

  const activeProgItem = todayProgram.find(p => (fightInfo.id && p.id === fightInfo.id) || (p.post_number && parseInt(p.post_number) === parseInt(fightInfo.post_number)));
  const rawWeightA = fightInfo.gallo_a_weight || fightInfo.peso_a || activeProgItem?.gallo_a_weight || activeProgItem?.peso_a || activeProgItem?.peso;
  const rawWeightB = fightInfo.gallo_b_weight || fightInfo.peso_b || activeProgItem?.gallo_b_weight || activeProgItem?.peso_b;
  const weightA = formatWeight(rawWeightA);
  const weightB = formatWeight(rawWeightB);

  return (
    <div style={{ background: 'var(--obsidian)', minHeight: '100vh', padding: '16px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      {/* PRIMARY BATTLE ZONE: Centered Stream Player & Reloj Scoreboard */}
      <div style={{ maxWidth: 900, margin: '0 auto 24px auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Stream Player Container */}
        <div className="player-container" style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DacastPlayer 
            status={fightInfo.status} 
            stream_url={fightInfo.stream_url || globalStream} 
            streamMode={streamMode}
            viewerCount={viewerCount}
          />

          {/* Premium Glassmorphism Fullscreen Button */}
          <div style={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            zIndex: 40, 
            display: 'flex', 
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            padding: '3px 4px',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)'
          }}>
            <button
              onClick={() => setIsFbFullscreen(true)}
              style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                border: '1px solid rgba(147, 197, 253, 0.4)',
                borderRadius: 20, 
                color: '#ffffff', 
                fontWeight: 900,
                fontSize: 11, 
                padding: '6px 14px', 
                cursor: 'pointer',
                letterSpacing: '0.5px',
                fontFamily: 'Outfit, sans-serif',
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                boxShadow: '0 4px 14px rgba(29, 78, 216, 0.45)',
                transition: 'transform 0.2s ease'
              }}
            >
              📺 Fullscreen Live
            </button>
          </div>
        </div>

        {/* OFFICIAL RELOJ / SCOREBOARD CARD (DYNAMICALLY SYNCED WITH ADMIN SELECTED DESIGN STYLE) */}
        {overlayVisible && (
          <div style={{ width: '100%' }}>
            {/* LIVE BETTING COUNTDOWN BANNER ON RELOJ SCOREBOARD */}
            {fightInfo.status === 'LIVE' && (
              <div style={{
                width: '100%',
                marginTop: 14,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.15) 100%)',
                border: '1.5px solid #10b981',
                borderRadius: 12,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                boxShadow: '0 0 25px rgba(16,185,129,0.35)',
                animation: 'pulse-active-fight 2.5s infinite ease-in-out',
                fontFamily: 'Outfit, sans-serif'
              }}>
                <div style={{ color: '#10b981', fontWeight: 900, fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="live-dot" style={{ background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                  🟢 APUESTAS ABIERTAS — ¡HAZ TU JUGADA AHORA!
                </div>
                <div style={{ background: '#10b981', color: '#090d14', padding: '6px 14px', borderRadius: 8, fontWeight: 900, fontSize: 14, fontFamily: 'Outfit, sans-serif', letterSpacing: '0.5px' }}>
                  ⏱️ CIERRE EN: {formatClockTime(bettingCountdown)}
                </div>
              </div>
            )}

            {scoreboardStyle === 'broadcast' ? (
            /* STYLE 3: OSD COMPACTO (TIRA) */
            <div style={{
              marginTop: 14,
              width: '100%',
              background: 'linear-gradient(135deg, #111111 0%, #070707 100%)', 
              border: '2px solid #222222', 
              borderRadius: 16, 
              padding: 12, 
              boxShadow: '0 20px 45px rgba(0,0,0,0.9)',
              fontFamily: 'Outfit, sans-serif'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Combate # Badge */}
                <div style={{ background: '#1d1d1d', borderLeft: '4px solid #ef4444', borderRadius: 6, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontWeight: 900, fontSize: 9, letterSpacing: 0.5, lineHeight: 1 }}>COMBATE</div>
                  <div style={{ color: '#ffffff', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>#{fightInfo.post_number || '1'}</div>
                </div>

                {/* Gallo Azul Pill */}
                <div 
                  onClick={() => fightInfo.status === 'LIVE' && openBetModal('A')}
                  style={{ 
                    flex: 1,
                    minWidth: 140,
                    background: '#1d4ed8', 
                    color: '#ffffff', 
                    borderRadius: 8, 
                    padding: '8px 12px',
                    borderLeft: '5px solid #93c5fd',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 9, color: '#93c5fd', fontWeight: 900, letterSpacing: 0.5 }}>LADO AZUL</span>
                    {weightA && (
                      <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.35)', color: '#bfdbfe', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>
                        ⚖️ {weightA}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fightInfo.gallo_a_name || 'LADO AZUL'}
                  </div>
                </div>

                {/* Clocks Panel */}
                <div style={{ 
                  background: 'linear-gradient(180deg, #101010 0%, #050505 100%)', 
                  borderRadius: 10, 
                  border: '1px solid #333333', 
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#10b981', fontSize: 24, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1 }}>
                      {formatClockTime(clockElapsedTime)}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 900, marginTop: 2 }}>ELAPSED</div>
                  </div>

                  <div style={{ textAlign: 'center', borderLeft: '1px solid #2d2d2d', borderRight: '1px solid #2d2d2d', padding: '0 12px' }}>
                    <div style={{ color: '#ef4444', fontSize: 24, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1 }}>
                      {clockSubTimeLeft !== null ? clockSubTimeLeft.toString().padStart(2, '0') : '00'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 900, marginTop: 2 }}>CAREO</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f59e0b', fontSize: 30, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1 }}>
                      {formatClockTime(clockTimeLeft)}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 900, marginTop: 2 }}>RESTANTE</div>
                  </div>
                </div>

                {/* Gallo Blanco Pill */}
                <div 
                  onClick={() => fightInfo.status === 'LIVE' && openBetModal('B')}
                  style={{ 
                    flex: 1,
                    minWidth: 140,
                    background: '#ffffff', 
                    color: '#111111', 
                    borderRadius: 8, 
                    padding: '8px 12px',
                    borderRight: '5px solid #0f3dd1',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 9, color: '#0f3dd1', fontWeight: 900, letterSpacing: 0.5 }}>LADO BLANCO</span>
                    {weightB && (
                      <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.08)', color: '#1e40af', padding: '1px 6px', borderRadius: 4, fontWeight: 900 }}>
                        ⚖️ {weightB}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 16, textTransform: 'uppercase', color: '#111111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fightInfo.gallo_b_name || 'LADO BLANCO'}
                  </div>
                </div>
              </div>
            </div>
          ) : scoreboardStyle === 'arena' ? (
            /* STYLE 2: VS ARENA (LADOS) */
            <div style={{
              marginTop: 14,
              width: '100%',
              background: '#161616', 
              border: '1px solid #2a2a2a', 
              borderRadius: 12, 
              padding: 14, 
              boxShadow: '0 20px 45px rgba(0,0,0,0.6)',
              fontFamily: 'Outfit, sans-serif'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 10, alignItems: 'center' }}>
                {/* Left Azul */}
                <div 
                  onClick={() => fightInfo.status === 'LIVE' && openBetModal('A')}
                  style={{ background: '#1d4ed8', color: '#ffffff', borderRadius: 8, padding: 12, textAlign: 'center', cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default' }}
                >
                  <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 900 }}>LADO AZUL</div>
                  <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase', margin: '4px 0' }}>
                    {fightInfo.gallo_a_name || 'LADO AZUL'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: '#bfdbfe' }}>
                    {weightA && <span>⚖️ {weightA}</span>}
                    <span>x{fightInfo.gallo_a_odds?.toFixed(2) || '1.90'}</span>
                  </div>
                </div>
                {/* Center Timers */}
                <div style={{ background: '#111111', borderRadius: 8, padding: 10, textAlign: 'center', border: '1px solid #222' }}>
                  <div style={{ color: '#ef4444', fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>PELEA #{fightInfo.post_number || '1'}</div>
                  <div style={{ color: '#f59e0b', fontSize: 32, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1, margin: '4px 0' }}>
                    {formatClockTime(clockTimeLeft)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 11, color: '#10b981', fontWeight: 800, borderTop: '1px solid #222', paddingTop: 4 }}>
                    <span>T: {formatClockTime(clockElapsedTime)}</span>
                    <span style={{ color: '#ef4444' }}>C: {clockSubTimeLeft !== null ? clockSubTimeLeft.toString().padStart(2, '0') : '00'}</span>
                  </div>
                </div>
                {/* Right Blanco */}
                <div 
                  onClick={() => fightInfo.status === 'LIVE' && openBetModal('B')}
                  style={{ background: '#ffffff', color: '#111111', borderRadius: 8, padding: 12, textAlign: 'center', cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default' }}
                >
                  <div style={{ fontSize: 10, color: '#0f3dd1', fontWeight: 900 }}>LADO BLANCO</div>
                  <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase', margin: '4px 0' }}>
                    {fightInfo.gallo_b_name || 'LADO BLANCO'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 900, color: '#1d4ed8' }}>
                    {weightB && <span>⚖️ {weightB}</span>}
                    <span>x{fightInfo.gallo_b_odds?.toFixed(2) || '1.90'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STYLE 1: CLÁSICO */
            <div style={{
              marginTop: 14,
              width: '100%',
              background: 'linear-gradient(180deg, #090d14 0%, #0c121d 100%)',
              border: '1px solid rgba(212, 175, 55, 0.45)',
              borderRadius: 14,
              padding: '16px 20px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.85)',
              fontFamily: 'Outfit, sans-serif'
            }}>
              {/* Header Title & Logos */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
                <img src="/official_logo.png" style={{ height: 28, borderRadius: '50%', border: '1px solid #d4af37' }} alt="Logo" />
                <span style={{ color: '#f3f4f6', fontSize: 16, fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase' }}>
                  COLISEO ANGEL CRUZ
                </span>
                <img src="/official_logo.png" style={{ height: 28, borderRadius: '50%', border: '1px solid #d4af37', transform: 'scaleX(-1)' }} alt="Logo" />
              </div>

              {/* Tri-Timer Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1fr', background: '#0a0a0a', padding: '12px 8px', borderRadius: 10, border: '1px solid #222222', marginBottom: 12, textAlign: 'center' }}>
                <div style={{ borderRight: '1px solid #222222', padding: '4px 6px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 800, letterSpacing: 1.5 }}>TIEMPO TRANSCURRIDO</div>
                  <div style={{ color: '#10b981', fontSize: 'clamp(24px, 4.5vw, 38px)', fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1 }}>
                    {formatClockTime(clockElapsedTime)}
                  </div>
                </div>
                <div style={{ borderRight: '1px solid #222222', padding: '4px 6px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 800, letterSpacing: 1.5 }}>CAREO / TIERRA</div>
                  <div style={{ color: '#ef4444', fontSize: 'clamp(24px, 4.5vw, 38px)', fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1 }}>
                    {clockSubTimeLeft !== null ? clockSubTimeLeft.toString().padStart(2, '0') : '00'}
                  </div>
                </div>
                <div style={{ padding: '4px 6px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 800, letterSpacing: 1.5 }}>TIEMPO RESTANTE</div>
                  <div style={{ color: '#f59e0b', fontSize: 'clamp(24px, 4.5vw, 38px)', fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1 }}>
                    {formatClockTime(clockTimeLeft)}
                  </div>
                </div>
              </div>

              {/* Active Combatant Stacked Banner */}
              <div style={{ display: 'flex', border: '1px solid #2d2d2d', borderRadius: 10, overflow: 'hidden', background: '#111111' }}>
                <div style={{ width: '22%', background: '#181818', borderRight: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
                  <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 11, letterSpacing: 2 }}>PELEA</span>
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 32, lineHeight: 1 }}>{fightInfo.post_number || '1'}</span>
                </div>
                <div style={{ width: '78%', display: 'flex', flexDirection: 'column' }}>
                  <div 
                    onClick={() => fightInfo.status === 'LIVE' && openBetModal('B')}
                    style={{
                      background: '#ffffff', color: '#111111', padding: '10px 16px', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default', borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <span>
                      {fightInfo.gallo_b_name || 'LADO BLANCO'}
                      {weightB && <span style={{ fontSize: 13, color: '#4b5563', marginLeft: 8, fontWeight: 800 }}>(⚖️ {weightB})</span>}
                    </span>
                    <span style={{ color: '#1d4ed8', fontSize: 14, fontWeight: 900 }}>x{fightInfo.gallo_b_odds?.toFixed(2) || '1.90'}</span>
                  </div>
                  <div 
                    onClick={() => fightInfo.status === 'LIVE' && openBetModal('A')}
                    style={{
                      background: '#1d4ed8', color: '#ffffff', padding: '10px 16px', fontWeight: 900, fontSize: 16, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default'
                    }}
                  >
                    <span>
                      {fightInfo.gallo_a_name || 'LADO AZUL'}
                      {weightA && <span style={{ fontSize: 13, color: '#bfdbfe', marginLeft: 8, fontWeight: 800 }}>(⚖️ {weightA})</span>}
                    </span>
                    <span style={{ color: '#93c5fd', fontSize: 14, fontWeight: 900 }}>x{fightInfo.gallo_a_odds?.toFixed(2) || '1.90'}</span>
                  </div>
                </div>
              </div>

              {/* Ticker footer */}
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, textAlign: 'center', marginTop: 10, letterSpacing: 1 }}>
                ••• COLISEO ANGEL CRUZ [ MARCA: {fightInfo.post_number || '1'} • EN VIVO ] •••
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* NEW PROMINENT PROGRAM SECTION UNDERNEATH */}
      {showCartelera && (
          <div style={{ marginTop: 40, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ThunderboltFilled style={{ color: '#10b981', fontSize: 20 }} />
                    <Title level={4} style={{ color: '#fff', margin: 0, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>CARTELERA DE HOY</Title>
                 </div>
                 <div style={{ flex: 1, minWidth: 20, height: '1px', background: 'linear-gradient(90deg, rgba(16,185,129,0.3) 0%, transparent 100%)' }} />
              </div>
    
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sortedCartelera.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', background: 'var(--glass)', borderRadius: 12, border: '1px dashed var(--glass-border)' }}>
                    <Text style={{ color: 'var(--text-muted)' }}>No hay combates en esta categoría de momento.</Text>
                  </div>
                ) : (
                  sortedCartelera.map((event) => {
                    let aData = { weight: event.gallo_a_weight || '0-0.0' };
                    let bData = { weight: event.gallo_b_weight || '0-0.0' };
                    try { 
                      const pA = JSON.parse(event.gallo_a_weight); 
                      if (pA && typeof pA === 'object') aData = pA;
                    } catch(e){}
                    try { 
                      const pB = JSON.parse(event.gallo_b_weight); 
                      if (pB && typeof pB === 'object') bData = pB;
                    } catch(e){}

                    const isActive = fightInfo.id && event.id === fightInfo.id;
                    const activeStatus = isActive ? fightInfo.status : null;
                    const isBettingOpen = isActive && activeStatus === 'LIVE';

                    let tagColor = 'default';
                    let tagLabel = '⏳ PROGRAMADA';
                    if (event.status === 'FINISHED') {
                      tagColor = 'gold'; 
                      tagLabel = '🏁 FINALIZADA';
                    } else if (isActive && activeStatus === 'CLOSED') {
                      tagLabel = null; // User requested to remove "EN COMBATE" tag from the top right
                    } else if (isActive && activeStatus === 'LIVE') {
                      tagColor = 'green'; 
                      tagLabel = '🟢 APUESTAS ABIERTAS';
                    }

                    return (
                      <div 
                        key={event.id}
                        onClick={() => {
                          if (event.status !== 'FINISHED') {
                            setFightInfo(event);
                            const player = document.querySelector('.player-container');
                            player?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className={`cart-card-premium ${isActive ? 'active-match' : ''}`}
                        style={{
                          cursor: event.status === 'FINISHED' ? 'default' : 'pointer'
                        }}
                      >
                        {/* Card Header */}
                        <div className="cart-card-header">
                          <span className="cart-fight-number">PELEA {event.post_number}</span>
                          {tagLabel && (
                            <Tag 
                              color={tagColor} 
                              onClick={(e) => {
                                if (isBettingOpen) {
                                  e.stopPropagation();
                                  openBetSelectionModal(event);
                                }
                              }}
                              style={{ 
                                fontSize: 10, 
                                borderRadius: 6, 
                                margin: 0, 
                                padding: '4px 10px', 
                                fontWeight: 900,
                                cursor: isBettingOpen ? 'pointer' : 'default',
                                border: 'none',
                                letterSpacing: '0.5px'
                              }}
                            >
                              {tagLabel}
                            </Tag>
                          )}
                        </div>

                        {/* Card Content (Fighters) */}
                        <div className="cart-card-content">
                          {/* Left Fighter (A - Azul) */}
                          <div className="cart-fighter-column left">
                            <div className="fighter-title-row">
                              {aData.clase === 'P' && <span className="fighter-badge-p">P</span>}
                              <span className="fighter-name" style={{ color: '#60a5fa' }}>{event.gallo_a_name}</span>
                            </div>
                            <div className="fighter-meta-row">
                              {aData.turno && <span className="meta-tag">T: {aData.turno}</span>}
                              {aData.marca && <span className="meta-tag">M: {aData.marca}</span>}
                              <span className="weight-tag">{aData.weight}</span>
                            </div>
                          </div>

                          {/* VS Divider */}
                          <div className="cart-vs-column">
                            <div className="vs-circle">VS</div>
                          </div>

                          {/* Right Fighter (B - Blanco) */}
                          <div className="cart-fighter-column right">
                            <div className="fighter-title-row">
                              <span className="fighter-name" style={{ color: '#ffffff' }}>{event.gallo_b_name}</span>
                              {bData.clase === 'P' && <span className="fighter-badge-p">P</span>}
                            </div>
                            <div className="fighter-meta-row">
                              <span className="weight-tag">{bData.weight}</span>
                              {bData.color && <span className="meta-tag color-badge">{bData.color}</span>}
                              {bData.marca && <span className="meta-tag">M: {bData.marca}</span>}
                              {bData.turno && <span className="meta-tag">T: {bData.turno}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Live Betting Banner & Action Buttons (ONLY when fight is active & betting is OPEN) */}
                        {isBettingOpen ? (
                          <>
                            <div style={{
                              background: 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.1) 100%)',
                              border: '1px solid rgba(16,185,129,0.4)',
                              borderRadius: 10,
                              padding: '8px 12px',
                              textAlign: 'center',
                              marginTop: 2
                            }}>
                              <div style={{ color: '#10b981', fontSize: 11, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                                🟢 APUESTAS ABIERTAS — ¡SELECCIONA TU GANADOR!
                              </div>
                            </div>

                            <Row gutter={10} style={{ width: '100%', marginTop: 4 }}>
                              <Col span={12}>
                                <Button
                                  block
                                  size="large"
                                  type="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openBetSelectionModal(event);
                                  }}
                                  style={{
                                    height: 48,
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                                    borderColor: '#2563eb',
                                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1.2,
                                    padding: '4px 8px'
                                  }}
                                >
                                  <span style={{ fontSize: 10, fontWeight: 900, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    AZUL ({event.gallo_a_name || 'LADO A'})
                                  </span>
                                  <span style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                                    APOSTAR x{event.gallo_a_odds?.toFixed(2) || '1.90'}
                                  </span>
                                </Button>
                              </Col>
                              <Col span={12}>
                                <Button
                                  block
                                  size="large"
                                  type="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openBetSelectionModal(event);
                                  }}
                                  style={{
                                    height: 48,
                                    borderRadius: 12,
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                                    borderColor: '#ffffff',
                                    boxShadow: '0 6px 20px rgba(255, 255, 255, 0.3)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1.2,
                                    padding: '4px 8px'
                                  }}
                                >
                                  <span style={{ fontSize: 10, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    BLANCO ({event.gallo_b_name || 'LADO B'})
                                  </span>
                                  <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>
                                    APOSTAR x{event.gallo_b_odds?.toFixed(2) || '1.90'}
                                  </span>
                                </Button>
                              </Col>
                            </Row>
                          </>
                        ) : (isActive && activeStatus === 'CLOSED') ? (
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 10,
                            padding: '8px 12px',
                            textAlign: 'center',
                            marginTop: 4
                          }}>
                            <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                              ⚔️ PELEA EN COMBATE — APUESTAS CERRADAS
                            </div>
                          </div>
                        ) : null}

                        {/* Winner Footer */}
                        {event.status === 'FINISHED' && (
                          <div style={{
                            marginTop: 10,
                            borderRadius: 10,
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            fontWeight: 900,
                            fontSize: 13,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                            ...( (event.winner_side === 'A' || event.winner_side === 'AZUL') ? {
                              background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                              border: '1px solid #3b82f6',
                              color: '#ffffff'
                            } : (event.winner_side === 'B' || event.winner_side === 'BLANCO') ? {
                              background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
                              border: '1px solid #ffffff',
                              color: '#0f172a'
                            } : {
                              background: 'rgba(245, 158, 11, 0.2)',
                              border: '1px solid rgba(245, 158, 11, 0.5)',
                              color: '#f59e0b'
                            } )
                          }}>
                            <TrophyOutlined style={{ fontSize: 16, color: (event.winner_side === 'B' || event.winner_side === 'BLANCO') ? '#b45309' : '#fbbf24' }} />
                            <span>
                              {(event.winner_side === 'D' || event.winner_side === 'DRAW') 
                                ? 'NULO / TABLAS (EMPATE)' 
                                : `GANADOR: ${(event.winner_side === 'A' || event.winner_side === 'AZUL') ? (event.gallo_a_name || 'LADO AZUL') : (event.gallo_b_name || 'LADO BLANCO')}`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
          </div>
      )}

      <Modal zIndex={100001} open={isBetModalOpen} onCancel={() => !loading && setIsBetModalOpen(false)} footer={null} centered width={360} styles={{ body: { padding: 0 } }}>
        <div style={{ backgroundColor: 'var(--charcoal)', padding: '24px 20px', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Title level={4} style={{ color: '#10b981', margin: 0, fontWeight: 700, textTransform: 'uppercase' }}>{betSide === 'A' ? fightInfo.gallo_a_name : fightInfo.gallo_b_name}</Title>
            <Text style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '1px' }}>CONFIRMAR JUGADA</Text>
          </div>
          <InputNumber 
            min={1} 
            max={userBalance} 
            value={betAmount} 
            onChange={setBetAmount} 
            controls={false}
            className="premium-bet-input"
            style={{ 
                width: '100%', 
                height: 56, 
                fontSize: 24, 
                fontWeight: 600, 
                background: '#050505', 
                border: '1px solid rgba(16,185,129,0.5)', 
                color: '#10b981',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Outfit',
                boxShadow: 'none'
            }} 
          />
          
          <style>{`
            .premium-bet-input .ant-input-number-input {
                text-align: center !important;
                height: 56px !important;
                color: #10b981 !important;
            }
            .osd-fighter-row-live {
                cursor: pointer !important;
            }
            .osd-fighter-row-live:hover {
                transform: scale(1.02);
                filter: brightness(0.95);
            }
          `}</style>
          <Button type="primary" block loading={loading} onClick={handleBetConfirm} style={{ height: 48, marginTop: 24, fontWeight: 600, background: '#10b981', border: 'none', color: '#fff', borderRadius: 8, boxShadow: 'none' }}>ACCIONAR JUGADA</Button>
        </div>
      </Modal>

      {/* MODAL DE SELECCIÓN DE GALLO INTERMEDIO */}
      <Modal 
        zIndex={100001}
        open={isSelectionModalOpen} 
        onCancel={() => setIsSelectionModalOpen(false)} 
        footer={null} 
        centered 
        width={400}
        styles={{ 
          content: { background: '#0a0a0a', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 0 }
        }}
      >
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
            SELECCIONAR JUGADA
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: '1px', display: 'block', marginBottom: 28 }}>
            PELEA #{selectionFight?.post_number} • SELECCIONA TU GALLO
          </div>

          <Row gutter={16}>
            {/* LADO BLANCO */}
            <Col span={12}>
              <div 
                onClick={() => {
                  setIsSelectionModalOpen(false);
                  if (selectionFight) {
                    setFightInfo(selectionFight);
                    openBetModal('B', selectionFight);
                  }
                }}
                style={{
                  background: '#ffffff',
                  borderRadius: 12,
                  padding: '24px 16px',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  boxShadow: '0 8px 20px rgba(255,255,255,0.05)'
                }}
                className="selection-btn-hover"
              >
                <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                  LADO BLANCO
                </div>
                <div style={{ color: '#111827', fontWeight: 900, fontSize: 16, lineHeight: 1.2, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectionFight?.gallo_b_name || 'LADO BLANCO'}
                </div>
                <div style={{ marginTop: 12, background: '#e6f4ea', padding: '4px 12px', borderRadius: 6, display: 'inline-block' }}>
                  <span style={{ color: '#137333', fontWeight: 900, fontSize: 12 }}>Odds: {selectionFight?.gallo_b_odds || '1.90'}</span>
                </div>
              </div>
            </Col>

            {/* LADO AZUL */}
            <Col span={12}>
              <div 
                onClick={() => {
                  setIsSelectionModalOpen(false);
                  if (selectionFight) {
                    setFightInfo(selectionFight);
                    openBetModal('A', selectionFight);
                  }
                }}
                style={{
                  background: '#0f3dd1',
                  borderRadius: 12,
                  padding: '24px 16px',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  boxShadow: '0 8px 20px rgba(15,61,209,0.2)'
                }}
                className="selection-btn-hover"
              >
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                  LADO AZUL
                </div>
                <div style={{ color: '#ffffff', fontWeight: 900, fontSize: 16, lineHeight: 1.2, minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectionFight?.gallo_a_name || 'LADO AZUL'}
                </div>
                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 6, display: 'inline-block' }}>
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 12 }}>Odds: {selectionFight?.gallo_a_odds || '1.90'}</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>
        <style>{`
          .selection-btn-hover {
            border: 2px solid transparent;
            transition: all 0.2s ease-in-out;
          }
          .selection-btn-hover:hover {
            transform: translateY(-4px) !important;
            border-color: #10b981 !important;
          }
        `}</style>
      </Modal>

      {/* 🐓 DUAL ROOSTER CLASH CINEMATIC OVERLAY */}
      {showRoosterStrike && (
        <div style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(5, 5, 5, 0.98)', 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            overflow: 'hidden',
            animation: 'screenShake 0.4s ease-in-out infinite'
        }}>
           {/* Gallo Izquierdo */}
           <div className="rooster-dash-left" style={{ position: 'absolute', left: '10%' }}>
              <img 
                src="/golden_rooster_transparent.png" 
                style={{ width: 220, height: 'auto', filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.6))' }} 
                alt="Rooster Left"
              />
           </div>

           {/* Gallo Derecho (Mirrored) */}
           <div className="rooster-dash-right" style={{ position: 'absolute', right: '10%' }}>
              <img 
                src="/golden_rooster_transparent.png" 
                style={{ width: 220, height: 'auto', filter: 'drop-shadow(0 0 30px rgba(16,185,129,0.6))', transform: 'scaleX(-1)' }} 
                alt="Rooster Right"
              />
           </div>

           {/* Impact / Clash Light */}
           <div className="clash-burst" />
           
           <Title level={4} style={{ 
              color: '#10b981', 
              position: 'absolute',
              bottom: '15%',
              fontWeight: 900, 
              letterSpacing: '8px', 
              textTransform: 'uppercase', 
              animation: 'textReveal 2.5s ease-out forwards' 
           }}>¡JUGADA CONFIRMADA!</Title>
           
           <style>{`
                @keyframes dashLeft {
                    0% { left: -300px; transform: rotate(15deg); opacity: 0; }
                    80% { left: 45%; transform: rotate(-5deg); opacity: 1; }
                    100% { left: 42%; transform: rotate(0deg); }
                }
                @keyframes dashRight {
                    0% { right: -300px; transform: rotate(-15deg); opacity: 0; }
                    80% { right: 45%; transform: rotate(5deg); opacity: 1; }
                    100% { right: 42%; transform: rotate(0deg); }
                }
                @keyframes screenShake {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(-5px, 5px); }
                    75% { transform: translate(5px, -5px); }
                }
                @keyframes clashGlow {
                    0% { transform: scale(0.1); opacity: 0; }
                    90% { transform: scale(2); opacity: 1; filter: blur(20px); }
                    100% { transform: scale(5); opacity: 0; }
                }
                @keyframes textReveal {
                    0% { opacity: 0; letter-spacing: 20px; }
                    50% { opacity: 1; letter-spacing: 8px; }
                    100% { opacity: 1; }
                }
                .rooster-dash-left { animation: dashLeft 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                .rooster-dash-right { animation: dashRight 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
                .clash-burst {
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    background: radial-gradient(circle, #10b981 0%, transparent 70%);
                    animation: clashGlow 1s ease-out forwards;
                    animation-delay: 0.6s;
                    z-index: 10;
                    opacity: 0;
                }
                @keyframes pulse-green {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16,185,129,0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0); }
                }
                .pulse-dot { animation: pulse-green 2s infinite; }
                .premium-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
                .premium-btn:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
                .premium-btn:active { transform: translateY(-1px); }
            `}</style>
        </div>
      )}

      {/* FACEBOOK LIVE FULLSCREEN OVERLAY */}
      {isFbFullscreen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            background: '#070a11',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'Outfit, sans-serif'
          }}
        >
          {/* 1. Top Facebook Live Navigation Header (Fixed) */}
          <div style={{
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(10, 14, 23, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setIsFbFullscreen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36, height: 36,
                  color: '#fff', fontSize: 16, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>

              <div style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#fff', fontWeight: 900, fontSize: 11,
                padding: '4px 12px', borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 6,
                textTransform: 'uppercase',
                boxShadow: '0 0 14px rgba(239, 68, 68, 0.5)'
              }}>
                <span style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse-live 1.5s infinite' }} />
                EN VIVO
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#fff', fontWeight: 800, fontSize: 11,
                padding: '4px 12px', borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <EyeOutlined style={{ fontSize: 13, color: '#38bdf8' }} />
                <span>{viewerCount}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* WALLET BALANCE BADGE */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                fontWeight: 900,
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', gap: 5,
                backdropFilter: 'blur(16px)',
                letterSpacing: '0.5px'
              }}>
                <span style={{ fontSize: 12 }}>💰</span>
                <span>${(userBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <button
                onClick={() => setFbActiveTab(tab => tab === 'cartelera' ? 'chat' : 'cartelera')}
                style={{
                  background: fbActiveTab === 'cartelera' ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.12)',
                  border: fbActiveTab === 'cartelera' ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 20, color: fbActiveTab === 'cartelera' ? '#10b981' : '#fff', fontWeight: 800,
                  fontSize: 11, padding: '5px 12px', cursor: 'pointer'
                }}
              >
                <span>📊</span> TABLERO
              </button>
            </div>
          </div>

          {/* 2. Top Region: Video Stream Player (100% UNBLOCKED & CLEAR) */}
          <div style={{ position: 'relative', width: '100%', background: '#000', flexShrink: 0 }}>
            <DacastPlayer 
              status={fightInfo.status} 
              stream_url={fightInfo.stream_url || globalStream} 
              streamMode={streamMode}
              viewerCount={viewerCount}
              hideBadge={true}
            />

            {/* Floating Flying Reactions Layer */}
            {floatingReactions.map(item => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: `${item.left}%`,
                  bottom: 20,
                  fontSize: 34,
                  zIndex: 60,
                  pointerEvents: 'none',
                  animation: 'float-up-reaction 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }}
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* OFFICIAL RELOJ CARD (POSITIONED DIRECTLY BELOW THE VIDEO TRANSMISSION FRAME!) */}
          {overlayVisible && (
            <div style={{
              padding: '10px 14px',
              background: '#090d14',
              borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
              flexShrink: 0
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #0f1a10 0%, #111d12 100%)',
                borderRadius: '10px 10px 0 0', padding: '6px 12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                border: '1px solid rgba(212,175,55,0.4)', borderBottom: 'none'
              }}>
                <img src="/official_logo.png" style={{ height: 16, borderRadius: '50%', border: '1px solid #d4af37' }} alt="Logo" />
                <span style={{ color: '#d4af37', fontSize: 11, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
                  COLISEO ANGEL CRUZ
                </span>
                <img src="/official_logo.png" style={{ height: 16, borderRadius: '50%', border: '1px solid #d4af37', transform: 'scaleX(-1)' }} alt="Logo" />
              </div>

              <div style={{
                background: 'rgba(8,12,9,0.95)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(212,175,55,0.3)', borderTop: 'none',
                borderRadius: '0 0 10px 10px', padding: '8px 10px'
              }}>
                {/* Tri-Timer Grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 0.7fr 1fr',
                  background: '#111111', padding: '6px 2px', borderRadius: 6,
                  border: '1px solid #222222', marginBottom: 6, textAlign: 'center'
                }}>
                  <div style={{ borderRight: '1px solid #222', padding: '2px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 800 }}>TRANSCURRIDO</div>
                    <div style={{ color: '#10b981', fontSize: 18, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1 }}>
                      {formatClockTime(clockElapsedTime)}
                    </div>
                  </div>
                  <div style={{ borderRight: '1px solid #222', padding: '2px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 800 }}>CAREO/TIERRA</div>
                    <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1 }}>
                      {clockSubTimeLeft !== null ? clockSubTimeLeft.toString().padStart(2, '0') : '00'}
                    </div>
                  </div>
                  <div style={{ padding: '2px' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 800 }}>RESTANTE</div>
                    <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 900, fontFamily: 'Outfit', lineHeight: 1.1 }}>
                      {formatClockTime(clockTimeLeft)}
                    </div>
                  </div>
                </div>

                {/* Active Combatant Stacked Banner */}
                <div style={{ display: 'flex', border: '1px solid #2d2d2d', borderRadius: 6, overflow: 'hidden', background: '#111' }}>
                  <div style={{ width: '25%', background: '#181818', borderRight: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 8, letterSpacing: 1 }}>PELEA</span>
                    <span style={{ color: '#ffffff', fontWeight: 900, fontSize: 20, lineHeight: 1 }}>{fightInfo.post_number || '1'}</span>
                  </div>
                  <div style={{ width: '75%', display: 'flex', flexDirection: 'column' }}>
                    <div 
                      onClick={() => fightInfo.status === 'LIVE' && openBetModal('B')}
                      style={{
                        background: '#ffffff', color: '#111111', padding: '4px 8px', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default', borderBottom: '1px solid #ddd'
                      }}
                    >
                      <span>{fightInfo.gallo_b_name || 'LADO BLANCO'}</span>
                      <span style={{ color: '#1d4ed8', fontSize: 11, fontWeight: 900 }}>x{fightInfo.gallo_b_odds?.toFixed(2) || '1.90'}</span>
                    </div>
                    <div 
                      onClick={() => fightInfo.status === 'LIVE' && openBetModal('A')}
                      style={{
                        background: '#1d4ed8', color: '#ffffff', padding: '4px 8px', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default'
                      }}
                    >
                      <span>{fightInfo.gallo_a_name || 'LADO AZUL'}</span>
                      <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 900 }}>x{fightInfo.gallo_a_odds?.toFixed(2) || '1.90'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Facebook Live Quick Betting Bar */}
          {fightInfo.id && fightInfo.status === 'LIVE' ? (
            <div style={{
              padding: '10px 14px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 90
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#10b981', fontSize: 11, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', animation: 'pulse-live 1.5s infinite' }} />
                  🟢 APUESTAS ABIERTAS — PELEA #{fightInfo.post_number || '?'}
                </span>

                {/* BETTING COUNTDOWN TIMER BADGE */}
                {betTimerSeconds !== null && (
                  <div style={{
                    background: betTimerSeconds <= 30 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.2)',
                    border: `1px solid ${betTimerSeconds <= 30 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.5)'}`,
                    color: betTimerSeconds <= 30 ? '#ef4444' : '#f59e0b',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    boxShadow: betTimerSeconds <= 30 ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
                  }}>
                    <span>⏱️</span>
                    <span>{formatBetTimer(betTimerSeconds)}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => openBetModal('A', fightInfo)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                    border: '1px solid rgba(147, 197, 253, 0.4)',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(29, 78, 216, 0.4)',
                    textTransform: 'uppercase'
                  }}
                >
                  <span>AZUL</span>
                  <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                    x{fightInfo.gallo_a_odds?.toFixed(2) || '1.90'}
                  </span>
                </button>

                <button
                  onClick={() => openBetModal('B', fightInfo)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    color: '#0f172a',
                    fontWeight: 900,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 4px 12px rgba(255, 255, 255, 0.2)',
                    textTransform: 'uppercase'
                  }}
                >
                  <span>BLANCO</span>
                  <span style={{ background: 'rgba(15, 23, 42, 0.1)', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#0f172a' }}>
                    x{fightInfo.gallo_b_odds?.toFixed(2) || '1.90'}
                  </span>
                </button>
              </div>
            </div>
          ) : fightInfo.id && fightInfo.status === 'CLOSED' ? (
            <div style={{
              padding: '8px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              textAlign: 'center',
              zIndex: 90
            }}>
              <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                ⚔️ PELEA EN COMBATE — APUESTAS CERRADAS
              </span>
            </div>
          ) : null}

          {/* View Tab Selector Bar: Chat vs Cartelera */}
          <div style={{
            display: 'flex',
            background: '#090d14',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '4px 10px',
            gap: 8,
            zIndex: 90
          }}>
            <button
              onClick={() => setFbActiveTab('chat')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 8,
                background: fbActiveTab === 'chat' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: fbActiveTab === 'chat' ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                color: fbActiveTab === 'chat' ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span>💬 CHAT EN VIVO</span>
            </button>

            <button
              onClick={() => setFbActiveTab('cartelera')}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: 8,
                background: fbActiveTab === 'cartelera' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                border: fbActiveTab === 'cartelera' ? '1px solid rgba(16, 185, 129, 0.4)' : 'none',
                color: fbActiveTab === 'cartelera' ? '#10b981' : 'rgba(255, 255, 255, 0.5)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span>⚡ CARTELERA ({sortedCartelera.length})</span>
            </button>
          </div>

          {/* 3. Bottom Region: Live Chat OR Cartelera Table */}
          {fbActiveTab === 'chat' ? (
            <>
              <div 
                ref={fbChatContainerRef}
                style={{
                  flex: 1,
                  background: '#070a11',
                  padding: '10px 14px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                {chatMessages.slice(-30).map((m, idx) => {
                  const isMe = m.user_id === userId;
                  const authorName = (m.user_email || 'Usuario').split('@')[0];
                  return (
                    <div 
                      key={m.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: 14,
                        padding: '6px 12px',
                        maxWidth: '88%',
                        alignSelf: 'flex-start'
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: isMe ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {authorName.charAt(0).toUpperCase()}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: isMe ? '#10b981' : '#38bdf8', fontSize: 12, fontWeight: 700 }}>
                          {authorName}
                        </span>
                        <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 400, lineHeight: 1.3 }}>
                          {m.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 4. Minimalist Fixed Bottom Comment & Reaction Bar */}
              <div style={{
                padding: '10px 14px',
                background: '#090d14',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                zIndex: 100
              }}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (fbChatInput.trim()) {
                      handleSendMessage(fbChatInput.trim());
                      setFbChatInput('');
                    }
                  }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 9999, padding: '3px 10px', height: 40 }}
                >
                  <input
                    type="text"
                    placeholder="Comentar..."
                    value={fbChatInput}
                    onChange={(e) => setFbChatInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 400
                    }}
                  />
                  <button
                    type="submit"
                    style={{ background: '#10b981', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <SendOutlined style={{ fontSize: 12 }} />
                  </button>
                </form>

                {/* Glass Reaction Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => triggerReaction('👍')}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.18)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      color: '#fff', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => triggerReaction('❤️')}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.18)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#fff', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    ❤️
                  </button>
                  <button
                    onClick={() => triggerReaction('🔥')}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'rgba(245, 158, 11, 0.18)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#fff', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    🔥
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* CARTELERA DE HOY TABLE VIEW */
            <div style={{
              flex: 1,
              background: '#070a11',
              padding: '12px 14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ThunderboltFilled style={{ color: '#10b981', fontSize: 14 }} />
                  CARTELERA DE HOY
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700 }}>
                  {sortedCartelera.length} COMBATES
                </span>
              </div>

              {sortedCartelera.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  No hay peleas en esta categoría de momento.
                </div>
              ) : (
                sortedCartelera.map((event) => {
                  let aData = { weight: event.gallo_a_weight || '0-0.0' };
                  let bData = { weight: event.gallo_b_weight || '0-0.0' };
                  try { const pA = JSON.parse(event.gallo_a_weight); if (pA && typeof pA === 'object') aData = pA; } catch(e){}
                  try { const pB = JSON.parse(event.gallo_b_weight); if (pB && typeof pB === 'object') bData = pB; } catch(e){}

                  const isActive = fightInfo.id && event.id === fightInfo.id;
                  const isBettingOpen = isActive && fightInfo.status === 'LIVE';

                  let statusColor = 'rgba(255,255,255,0.08)';
                  let statusTextColor = 'rgba(255,255,255,0.5)';
                  let statusLabel = '⏳ PROGRAMADA';

                  if (event.status === 'FINISHED') {
                    statusColor = 'rgba(245, 158, 11, 0.15)';
                    statusTextColor = '#f59e0b';
                    statusLabel = `🏁 GANÓ ${event.winner || 'FINALIZADA'}`;
                  } else if (isActive && fightInfo.status === 'CLOSED') {
                    statusColor = 'rgba(239, 68, 68, 0.15)';
                    statusTextColor = '#ef4444';
                    statusLabel = '⚔️ EN COMBATE';
                  } else if (isActive && fightInfo.status === 'LIVE') {
                    statusColor = 'rgba(16, 185, 129, 0.15)';
                    statusTextColor = '#10b981';
                    statusLabel = '🟢 APUESTAS ABIERTAS';
                  }

                  return (
                    <div 
                      key={event.id}
                      style={{
                        background: isActive ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(10, 14, 23, 0.95) 100%)' : 'rgba(255, 255, 255, 0.03)',
                        border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>
                          PELEA #{event.post_number}
                        </span>
                        <span style={{ background: statusColor, color: statusTextColor, fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, border: `1px solid ${statusTextColor}40` }}>
                          {statusLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8 }}>
                        {/* Azul */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#60a5fa', fontSize: 12, fontWeight: 800 }}>
                            {event.gallo_a_name || 'Gallo Azul'}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                            Peso: {aData.weight || event.gallo_a_weight}
                          </span>
                        </div>

                        <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: 11 }}>VS</span>

                        {/* Blanco */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ color: '#ffffff', fontSize: 12, fontWeight: 800 }}>
                            {event.gallo_b_name || 'Gallo Blanco'}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                            Peso: {bData.weight || event.gallo_b_weight}
                          </span>
                        </div>
                      </div>

                      {isBettingOpen && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <button
                            onClick={() => openBetModal('A', event)}
                            style={{ flex: 1, background: '#1d4ed8', border: 'none', borderRadius: 6, color: '#fff', padding: '6px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                          >
                            AZUL (x{event.gallo_a_odds?.toFixed(2) || '1.90'})
                          </button>
                          <button
                            onClick={() => openBetModal('B', event)}
                            style={{ flex: 1, background: '#ffffff', border: 'none', borderRadius: 6, color: '#0f172a', padding: '6px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                          >
                            BLANCO (x{event.gallo_b_odds?.toFixed(2) || '1.90'})
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserLiveView;
