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
const DacastPlayer = ({ status, stream_url, streamMode, viewerCount }) => {
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
              background: 'radial-gradient(circle at center, #18202b 0%, #0d1117 100%)',
              borderRadius: 24, border: '1px solid rgba(0, 229, 163, 0.15)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 16px 36px -8px rgba(0,0,0,0.35)'
          }}>
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%', zIndex: 11 }}>
                <Title level={1} style={{ 
                    color: '#fff', 
                    margin: 0, 
                    fontWeight: 900, 
                    letterSpacing: '8px', 
                    fontFamily: 'Outfit',
                    fontSize: 'clamp(20px, 4vw, 36px)',
                    textTransform: 'uppercase',
                    textShadow: '0 0 20px rgba(0, 229, 163, 0.4)'
                }}>
                    COLISEO ANGEL CRUZ
                </Title>
                <div style={{ width: 60, height: 3, background: '#00E5A3', margin: '15px auto', borderRadius: 9999, opacity: 0.8 }} />
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase' }}>
                    {playerError ? 'RECONECTANDO SEÑAL...' : status !== 'LIVE' && !hasSignal ? 'ESPERANDO SEÑAL...' : 'TRANSMISIÓN EN BREVE'}
                </Text>
             </div>
          </div>
        );
    }

    const isDirectVideo = stream_url?.match(/\.(mp4|webm|mov|ogg)$/i) || stream_url?.includes('/storage/v1/object/public/');

    if (isHLS) {
        return (
            <div key="dacast-hls" style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, display: 'flex', gap: 8 }}>
                    <div style={{ background: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, animation: 'blink 1.5s infinite' }}>
                        <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse-live 2s infinite' }} />
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>EN VIVO</Text>
                    </div>
                </div>
                <HLSVideoPlayer url={stream_url} onError={() => setPlayerError(true)} />
            </div>
        );
    }

    return (
        <div key="dacast-standard-container" style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a0a' }}>
            <div style={{ position: 'absolute', top: 15, left: 15, zIndex: 10, display: 'flex', gap: 8 }}>
                <div style={{ background: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, animation: 'blink 1.5s infinite' }}>
                    <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%', animation: 'pulse-live 2s infinite' }} />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>EN VIVO</Text>
                </div>
            </div>

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

  // Draggable / Resizable Scoreboard Overlay State
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayPos, setOverlayPos] = useState({ x: 12, y: 12 });
  const [overlaySize, setOverlaySize] = useState({ w: 340, h: 'auto' });
  const overlayRef = useRef(null);
  const dragState = useRef(null);    // { startX, startY, startPosX, startPosY }
  const resizeState = useRef(null);  // { startX, startW }
  const [showEmojiBar, setShowEmojiBar] = useState(false);
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

        const initialMsgs = await rawFetch(`messages?select=*&order=created_at.desc&limit=50`);
        if (initialMsgs && Array.isArray(initialMsgs)) {
            setChatMessages(initialMsgs.reverse());
        }

        const settings = await rawFetch(`settings`);
        if (settings) {
            const stream = settings.find(s => s.id === 'live_stream_url');
            const cartelera = settings.find(s => s.id === 'show_cartelera');
            const mode = settings.find(s => s.id === 'stream_logic_mode');
            if (stream) setGlobalStream(stream.value);
            if (cartelera) setShowCartelera(cartelera.value === 'true');
            if (mode) setStreamMode(mode.value);
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
          }
      })
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log('🛡️ CANAL HÍBRIDO ASEGURADO: Realtime + Broadcast Activo');
          }
      });

    // 4. Presence Engine: track active connections
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
        supabase.removeChannel(presenceChannel);
    };
  }, [userId]);

  // 3b. Fast-poll: active fight every 3s + cartelera every 3s to stay fully in sync
  useEffect(() => {
    const syncAll = async () => {
      try {
        // 1. Sync active fight
        const active = await rawFetch(`events?select=*&status=in.(LIVE,CLOSED)&order=updated_at.desc&limit=1`);
        setFightInfo(prev => {
          if (active && active[0]) {
            return active[0];
          } else if (prev.status === 'LIVE' || prev.status === 'CLOSED') {
            return { id: null, status: 'PENDING', gallo_a_name: 'Gallo Azul', gallo_b_name: 'Gallo Blanco' };
          }
          return prev;
        });

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
      } catch (_) {}
    };
    const interval = setInterval(syncAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const [lastMessageCount, setLastMessageCount] = useState(0);

  // 🕒 EPHEMERAL ENGINE: Strict 5-minute Autodestruct (Screen & DB Cleanup)
  useEffect(() => {
    const ticker = setInterval(async () => {
      const now = Date.now();
      const cutoff = now - 300000; // 5 Minutes
      
      // SOLO limpieza visual inmediata (No toca la DB para ahorrar Disk IO)
      setChatMessages(prev => prev.filter(msg => {
        return new Date(msg.created_at).getTime() > cutoff;
      }));
    }, 120000); 
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
    setSelectionFight(fight);
    setIsSelectionModalOpen(true);
  };

  const openBetModal = (side) => {
    if (!currentUser) return setCurrentView('login');
    if (fightInfo.status !== 'LIVE') return msg.warning('APUESTAS CERRADAS');
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

  const handleSendMessage = async () => {
    if (!currentUser) return setCurrentView('login');
    if (!chatInput.trim() || !userId) return;
    const text = chatInput.trim();
    setChatInput('');

    const messagePayload = {
        id: `br_${Date.now()}`, // Temporary broadcast ID
        user_id: userId,
        user_email: userEmail.split('@')[0],
        text,
        type: 'USER',
        created_at: new Date().toISOString()
    };

    // 1. BROADCAST: Send to everyone (including self) immediately
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
            user_id: userId,
            user_email: userEmail.split('@')[0],
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

  return (
    <div style={{ background: 'var(--obsidian)', minHeight: '100vh', padding: '16px', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      {/* PRIMARY BATTLE ZONE: Video & Chat Aligned */}
      <Row gutter={[16, 16]} align="stretch" style={{ minHeight: 400 }}>
        <Col xs={24} lg={16} className="player-container" style={{ position: 'relative' }}>
           <DacastPlayer 
                status={fightInfo.status} 
                stream_url={fightInfo.stream_url || globalStream} 
                streamMode={streamMode}
                viewerCount={viewerCount}
           />

           {/* Toggle overlay button */}
           {fightInfo.id && (
             <button
               onClick={() => setOverlayVisible(v => !v)}
               style={{
                 position: 'absolute', top: 8, right: 8, zIndex: 30,
                 background: overlayVisible ? 'rgba(16,185,129,0.85)' : 'rgba(0,0,0,0.6)',
                 border: 'none', borderRadius: 6, color: '#fff', fontWeight: 800,
                 fontSize: 10, padding: '4px 10px', cursor: 'pointer',
                 letterSpacing: 1, backdropFilter: 'blur(4px)'
               }}
             >
               {overlayVisible ? '📊 OCULTAR' : '📊 TABLERO'}
             </button>
           )}

           {/* DRAGGABLE & RESIZABLE SCOREBOARD OVERLAY */}
           {overlayVisible && fightInfo.id && (
             <div
               ref={overlayRef}
               onMouseDown={handleOverlayMouseDown}
               style={{
                 position: 'absolute',
                 left: overlayPos.x,
                 top: overlayPos.y,
                 width: overlaySize.w,
                 zIndex: 20,
                 cursor: 'grab',
                 userSelect: 'none',
                 borderRadius: 10,
                 overflow: 'visible',
                 filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.7))',
               }}
             >
               {/* Header drag bar */}
               <div style={{
                 background: 'linear-gradient(90deg, #0f1a10 0%, #111d12 100%)',
                 borderRadius: '10px 10px 0 0',
                 padding: '5px 10px',
                 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                 border: '1px solid rgba(16,185,129,0.25)',
                 borderBottom: 'none',
               }}>
                 <span style={{ color: '#10b981', fontSize: 9, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
                   ⠿ TABLERO — PELEA #{fightInfo.post_number || '?'}
                 </span>
                 <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>arrastra para mover</span>
               </div>

               {/* Scoreboard body */}
               <div style={{
                 background: 'rgba(8,12,9,0.92)',
                 backdropFilter: 'blur(16px)',
                 border: '1px solid rgba(16,185,129,0.2)',
                 borderTop: 'none',
                 borderRadius: '0 0 10px 10px',
                 padding: '10px 12px',
               }}>
                 {/* Status badge */}
                 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                   {fightInfo.id && (fightInfo.status === 'LIVE' || fightInfo.status === 'CLOSED') ? (
                     <span style={{
                       background: fightInfo.status === 'LIVE' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                       border: `1px solid ${fightInfo.status === 'LIVE' ? '#10b981' : '#ef4444'}`,
                       borderRadius: 4, padding: '2px 8px', fontSize: 9, fontWeight: 900,
                       color: fightInfo.status === 'LIVE' ? '#10b981' : '#ef4444',
                       letterSpacing: 1, textTransform: 'uppercase',
                       animation: fightInfo.status === 'CLOSED' ? 'pulse-live 2s infinite' : 'none',
                       cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default'
                     }}>
                       {fightInfo.status === 'LIVE' ? '🟢 APUESTAS ABIERTAS' : '⚔️ EN COMBATE'}
                     </span>
                   ) : (
                     <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700 }}>SIN PELEA ACTIVA</span>
                   )}
                 </div>

                 {/* Fighter rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Gallo Blanco (White) */}
                    <div 
                      onClick={() => fightInfo.status === 'LIVE' && openBetModal('B')}
                      style={{
                        background: '#ffffff', borderRadius: 6, padding: '6px 10px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default',
                        transition: 'transform 0.1s ease',
                      }}
                      className={fightInfo.status === 'LIVE' ? 'osd-fighter-row-live' : ''}
                    >
                      <span style={{ color: '#111', fontWeight: 900, fontSize: Math.max(10, overlaySize.w / 32), textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {fightInfo.gallo_b_name || 'LADO BLANCO'}
                      </span>
                      <span style={{ color: '#0f3dd1', fontWeight: 800, fontSize: 10 }}>{fightInfo.gallo_b_odds?.toFixed(2) || '1.90'}</span>
                    </div>
                    {/* Divider VS */}
                    <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: 900, fontSize: 9, letterSpacing: 2 }}>VS</div>
                    {/* Gallo Azul (Blue) */}
                    <div 
                      onClick={() => fightInfo.status === 'LIVE' && openBetModal('A')}
                      style={{
                        background: '#0f3dd1', borderRadius: 6, padding: '6px 10px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: fightInfo.status === 'LIVE' ? 'pointer' : 'default',
                        transition: 'transform 0.1s ease',
                      }}
                      className={fightInfo.status === 'LIVE' ? 'osd-fighter-row-live' : ''}
                    >
                      <span style={{ color: '#fff', fontWeight: 900, fontSize: Math.max(10, overlaySize.w / 32), textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {fightInfo.gallo_a_name || 'LADO AZUL'}
                      </span>
                      <span style={{ color: '#a5c8ff', fontWeight: 800, fontSize: 10 }}>{fightInfo.gallo_a_odds?.toFixed(2) || '1.90'}</span>
                    </div>
                  </div>
                </div>

               {/* Right-edge resize handle */}
               <div
                 data-resize="true"
                 onMouseDown={handleResizeMouseDown}
                 style={{
                   position: 'absolute', right: -6, top: 0, bottom: 0,
                   width: 12, cursor: 'ew-resize',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                 }}
               >
                 <div style={{ width: 4, height: 40, background: 'rgba(16,185,129,0.5)', borderRadius: 2 }} />
               </div>
              </div>
            )}
         </Col>

         <Col xs={24} lg={8} style={{ display: 'flex' }}>
            <Card 
              className={`glass-panel chat-card live-chat-card ${isChatMinimized ? 'minimized' : ''}`} 
              styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: isChatMinimized ? 'auto' : '100%', overflow: 'hidden' } }} 
              style={{ 
                width: '100%', 
                border: '1px solid var(--glass-border)', 
                boxShadow: 'var(--shadow-main)',
                height: isChatMinimized ? 'auto' : undefined,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
                 <div 
                   style={{ 
                     padding: '8px 16px', 
                     borderBottom: isChatMinimized ? 'none' : '1px solid var(--glass-border)', 
                     display: 'flex', 
                     justifyContent: 'space-between', 
                     alignItems: 'center', 
                     background: 'var(--glass)',
                     cursor: 'pointer'
                   }}
                   onClick={() => setIsChatMinimized(!isChatMinimized)}
                 >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <Title level={5} style={{ color: 'var(--text-main)', margin: 0, fontSize: 10, letterSpacing: '1.5px', fontWeight: 900 }}>CHAT EN VIVO</Title>
                       <Badge status="processing" color="#00E5A3" text={<Text style={{ fontSize: 8, color: '#00E5A3', fontWeight: 800 }}>LIVE</Text>} />
                    </div>
                    
                    <Button 
                       type="text" 
                       size="small" 
                       icon={isChatMinimized ? <UpOutlined style={{ color: '#00E5A3', fontSize: 11 }} /> : <DownOutlined style={{ color: 'var(--text-dim)', fontSize: 11 }} />}
                       onClick={(e) => { e.stopPropagation(); setIsChatMinimized(!isChatMinimized); }}
                       style={{ 
                         display: 'flex', 
                         alignItems: 'center', 
                         justifyContent: 'center',
                         background: 'rgba(255,255,255,0.06)',
                         borderRadius: '50%',
                         width: 26,
                         height: 26
                       }}
                    />
                 </div>
                 
                 {!isChatMinimized && (
                   <>
                     <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }} className="chat-container" ref={chatContainerRef}>
                        {chatMessages.map((msg) => {
                           const isMe = msg.user_id === userId;
                           return (
                             <div key={msg.id} className="fade-message" style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                                <Text style={{ fontSize: 10, color: '#00E5A3', fontWeight: 800, marginLeft: 8, letterSpacing: '0.3px' }}>{msg.user_email}</Text>
                                <div style={{ 
                                    background: isMe ? 'var(--brand-green)' : 'rgba(255, 255, 255, 0.08)', 
                                    padding: '8px 14px', 
                                    borderRadius: 14, 
                                    color: isMe ? '#0b1117' : '#ffffff', 
                                    fontSize: 14, 
                                    lineHeight: '1.4',
                                    fontWeight: 600, 
                                    marginTop: 3,
                                    border: isMe ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}>{msg.text}</div>
                             </div>
                           )
                        })}
                     </div>
                     
                     <style>{`
                         .chat-container { scroll-behavior: smooth; }
                         .fade-message { animation: fadeIn 0.3s ease-out; }
                         @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                     `}</style>

                     <div style={{ padding: '10px 14px', borderTop: '1px solid var(--glass-border)', background: 'var(--charcoal)' }}>
                        {/* QUICK EMOJI BAR (COLLAPSIBLE) */}
                        {showEmojiBar && (
                          <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', paddingBottom: 2 }} className="hide-scrollbar">
                             {['🐓', '🐔', '🥊', '🏆', '💰', '🔥', '⚡', '🔪', '🚩', '🤝'].map(emoji => (
                                <div 
                                   key={emoji}
                                   onClick={() => setChatInput(prev => prev + emoji)}
                                   style={{ 
                                      cursor: 'pointer', 
                                      fontSize: 16, 
                                      background: 'var(--glass)', 
                                      borderRadius: 6, 
                                      width: 28, 
                                      height: 28, 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      transition: 'all 0.2s',
                                      border: '1px solid var(--glass-border)'
                                   }}
                                   className="emoji-btn"
                                >
                                   {emoji}
                                </div>
                             ))}
                          </div>
                        )}

                        <style>{`
                           .hide-scrollbar::-webkit-scrollbar { display: none; }
                           .emoji-btn:hover { background: rgba(0,229,163,0.2) !important; transform: scale(1.1); border-color: #00E5A3 !important; }
                        `}</style>

                        <div style={{ position: 'relative' }}>
                           {currentUser && (
                             <SmileOutlined 
                               onClick={() => setShowEmojiBar(!showEmojiBar)} 
                               style={{ 
                                  position: 'absolute', 
                                  left: 12, 
                                  top: '50%', 
                                  transform: 'translateY(-50%)', 
                                  color: showEmojiBar ? '#00E5A3' : 'var(--text-muted)', 
                                  cursor: 'pointer',
                                  fontSize: 14,
                                  zIndex: 10
                               }} 
                             />
                           )}
                           <input 
                             value={chatInput} 
                             onChange={e => setChatInput(e.target.value)}
                             onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                             placeholder={currentUser ? "Comenta la jugada..." : "Inicia sesión para chatear"}
                             disabled={!currentUser}
                             style={{ 
                                width: '100%', 
                                background: currentUser ? 'var(--obsidian)' : 'var(--glass)', 
                                border: '1px solid var(--glass-border)', 
                                borderRadius: 12, 
                                padding: currentUser ? '8px 36px 8px 32px' : '8px 36px 8px 12px', 
                                color: 'var(--text-main)', 
                                fontSize: 12,
                                height: 36,
                                cursor: currentUser ? 'text' : 'pointer'
                             }}
                             onClick={() => !currentUser && setCurrentView('login')}
                           />
                           <SendOutlined onClick={handleSendMessage} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: currentUser ? '#00E5A3' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }} />
                        </div>
                     </div>
                   </>
                 )}
            </Card>
         </Col>
      </Row>

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
                {(() => {
                    // Show ALL fights in spectator view regardless of status
                    const filtered = [...todayProgram];
                    
                    filtered.sort((a, b) => {
                        // Priority: active fight (LIVE/CLOSED matching fightInfo) → PENDING/unstarted → FINISHED last
                        const aIsActive = fightInfo.id && a.id === fightInfo.id;
                        const bIsActive = fightInfo.id && b.id === fightInfo.id;
                        if (aIsActive && !bIsActive) return -1;
                        if (!aIsActive && bIsActive) return 1;

                        const aIsFinished = a.status === 'FINISHED';
                        const bIsFinished = b.status === 'FINISHED';
                        if (!aIsFinished && bIsFinished) return -1;
                        if (aIsFinished && !bIsFinished) return 1;

                        // Within same group, sort by fight number ascending
                        const numA = parseInt((a.post_number || '0').replace(/\D/g, '')) || 0;
                        const numB = parseInt((b.post_number || '0').replace(/\D/g, '')) || 0;
                        return numA - numB;
                    });
    
                    
                    if (filtered.length === 0) return (
                        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--glass)', borderRadius: 12, border: '1px dashed var(--glass-border)' }}>
                            <Text style={{ color: 'var(--text-muted)' }}>No hay combates en esta categoría de momento.</Text>
                        </div>
                    );
    
                    return filtered.map((event, index) => {
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

                        let tagColor = 'default';
                        let tagLabel = '⏳ PROGRAMADA';
                        if (event.status === 'FINISHED') {
                          tagColor = 'gold'; 
                          tagLabel = '🏁 FINALIZADA';
                        } else if (isActive && activeStatus === 'CLOSED') {
                          tagColor = 'red'; 
                          tagLabel = '⚔️ EN COMBATE';
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
                             <style>{`
                                .cart-card-premium {
                                  background: #181d27;
                                  border: 1px solid rgba(255, 255, 255, 0.06);
                                  border-radius: 20px;
                                  padding: 16px 20px;
                                  display: flex;
                                  flex-direction: column;
                                  gap: 12px;
                                  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                                  position: relative;
                                  overflow: hidden;
                                  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.25);
                                }
                                .cart-card-premium:hover {
                                  transform: translateY(-2px);
                                  border-color: rgba(0, 229, 163, 0.3);
                                  box-shadow: 0 12px 28px -6px rgba(0, 229, 163, 0.12);
                                }
                                body.light-theme .cart-card-premium {
                                  background: #ffffff;
                                  border-color: rgba(0, 0, 0, 0.06);
                                  box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.06);
                                }
                                .cart-card-premium.active-match {
                                  background: #181d27 !important;
                                  border: 1.5px solid #00E5A3 !important;
                                  box-shadow: 0 0 20px rgba(0, 229, 163, 0.2) !important;
                                }
                                .cart-card-header {
                                  display: flex;
                                  justify-content: space-between;
                                  align-items: center;
                                  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                                  padding-bottom: 8px;
                                }
                                body.light-theme .cart-card-header {
                                  border-bottom-color: rgba(0, 0, 0, 0.05);
                                }
                                .cart-fight-number {
                                  color: var(--text-main);
                                  font-size: 13px;
                                  font-weight: 800;
                                  letter-spacing: 1px;
                                  text-transform: uppercase;
                                  font-family: 'Outfit', sans-serif;
                                }
                                .cart-card-content {
                                  display: flex;
                                  align-items: center;
                                  justify-content: space-between;
                                  gap: 16px;
                                }
                                .cart-fighter-column {
                                  flex: 1;
                                  display: flex;
                                  flex-direction: column;
                                  gap: 4px;
                                }
                                .cart-fighter-column.left {
                                  align-items: flex-end;
                                  text-align: right;
                                }
                                .cart-fighter-column.right {
                                  align-items: flex-start;
                                  text-align: left;
                                }
                                .fighter-title-row {
                                  display: flex;
                                  align-items: center;
                                  gap: 8px;
                                }
                                .fighter-name {
                                  color: var(--text-main);
                                  font-weight: 800;
                                  font-size: 15px;
                                  letter-spacing: 0.3px;
                                  font-family: 'Outfit', sans-serif;
                                  text-transform: uppercase;
                                }
                                .fighter-meta-row {
                                  display: flex;
                                  align-items: center;
                                  flex-wrap: wrap;
                                  gap: 6px;
                                }
                                .cart-fighter-column.left .fighter-meta-row {
                                  justify-content: flex-end;
                                }
                                .cart-fighter-column.right .fighter-meta-row {
                                  justify-content: flex-start;
                                }
                                .meta-tag {
                                  background: rgba(255, 255, 255, 0.06);
                                  border: none;
                                  color: var(--text-dim);
                                  font-size: 10px;
                                  font-weight: 600;
                                  padding: 2px 8px;
                                  border-radius: 9999px;
                                }
                                body.light-theme .meta-tag {
                                  background: #e2e8f0;
                                  color: #475569;
                                }
                                .weight-tag {
                                  background: rgba(0, 229, 163, 0.12);
                                  border: none;
                                  color: #00E5A3;
                                  font-size: 10px;
                                  font-weight: 800;
                                  padding: 2px 8px;
                                  border-radius: 9999px;
                                }
                                .color-badge {
                                  background: rgba(255, 255, 255, 0.08);
                                  color: var(--text-main);
                                  border-radius: 9999px;
                                }
                                .fighter-badge-p {
                                  background: #f59e0b;
                                  color: #000000;
                                  font-size: 9px;
                                  font-weight: 900;
                                  padding: 1px 6px;
                                  border-radius: 9999px;
                                }
                                .cart-vs-column {
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  width: 28px;
                                }
                                .vs-circle {
                                  font-size: 11px;
                                  font-weight: 800;
                                  color: var(--text-muted);
                                  text-transform: uppercase;
                                }
                                .cart-winner-footer {
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  gap: 8px;
                                  background: rgba(0, 229, 163, 0.08);
                                  border: 1px solid rgba(0, 229, 163, 0.2);
                                  padding: 8px 16px;
                                  border-radius: 9999px;
                                  color: #00E5A3;
                                  font-size: 12px;
                                  font-weight: 800;
                                  letter-spacing: 0.5px;
                                  text-transform: uppercase;
                                  margin-top: 2px;
                                }
                                .trophy-icon {
                                  font-size: 13px;
                                  color: #00E5A3;
                                }
                                .cart-live-glow-footer {
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  gap: 6px;
                                  background: rgba(239, 68, 68, 0.1);
                                  border: 1px solid rgba(239, 68, 68, 0.25);
                                  padding: 6px 14px;
                                  border-radius: 9999px;
                                  color: #ef4444;
                                  font-size: 10px;
                                  font-weight: 800;
                                  letter-spacing: 1px;
                                  text-transform: uppercase;
                                }
                                .live-dot {
                                  width: 6px;
                                  height: 6px;
                                  background: #ef4444;
                                  border-radius: 50%;
                                }
                                .cart-odds-row {
                                  display: flex;
                                  gap: 8px;
                                  width: 100%;
                                  margin-top: 4px;
                                }
                                .odds-btn-wrapper {
                                  flex: 1;
                                  background: rgba(0, 229, 163, 0.08);
                                  border: 1px solid rgba(0, 229, 163, 0.2);
                                  border-radius: 9999px;
                                  padding: 6px 14px;
                                  display: flex;
                                  justify-content: space-between;
                                  align-items: center;
                                  cursor: pointer;
                                  transition: all 0.2s ease;
                                }
                                .odds-btn-wrapper:hover {
                                  background: rgba(0, 229, 163, 0.16);
                                  border-color: #00E5A3;
                                }
                                .odds-label {
                                  color: var(--text-dim);
                                  font-size: 9px;
                                  font-weight: 700;
                                  text-transform: uppercase;
                                }
                                .odds-value {
                                  color: #00E5A3;
                                  font-size: 13px;
                                  font-weight: 800;
                                  font-family: 'Outfit', sans-serif;
                                }

                                @media (max-width: 768px) {
                                  .cart-card-premium {
                                    padding: 12px 14px;
                                    gap: 10px;
                                    border-radius: 16px;
                                  }
                                  .fighter-name {
                                    font-size: 13px;
                                  }
                                  .cart-winner-footer {
                                    font-size: 10px;
                                    padding: 6px 12px;
                                  }
                                }
                             `}</style>

                             {/* Card Header */}
                             <div className="cart-card-header">
                                <span className="cart-fight-number">PELEA {event.post_number}</span>
                                <Tag 
                                  color={tagColor} 
                                  onClick={(e) => {
                                    if (isActive && activeStatus === 'LIVE') {
                                      e.stopPropagation();
                                      openBetSelectionModal(event);
                                    }
                                  }}
                                  style={{ 
                                    fontSize: 9, 
                                    borderRadius: 6, 
                                    margin: 0, 
                                    padding: '3px 8px', 
                                    fontWeight: 900,
                                    cursor: (isActive && activeStatus === 'LIVE') ? 'pointer' : 'default',
                                    border: 'none'
                                  }}
                                >
                                  {tagLabel}
                                </Tag>
                             </div>

                             {/* Card Content (Fighters) */}
                             <div className="cart-card-content">
                                {/* Left Fighter (A) */}
                                <div className="cart-fighter-column left">
                                   <div className="fighter-title-row">
                                      {aData.clase === 'P' && <span className="fighter-badge-p">P</span>}
                                      <span className="fighter-name">{event.gallo_a_name}</span>
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

                                {/* Right Fighter (B) */}
                                <div className="cart-fighter-column right">
                                   <div className="fighter-title-row">
                                      <span className="fighter-name">{event.gallo_b_name}</span>
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

                             {/* Odds Buttons Row (Only if not finished) */}
                             {event.status !== 'FINISHED' && (
                               <div className="cart-odds-row">
                                 <div className="odds-btn-wrapper" onClick={(e) => {
                                   if (event.status !== 'FINISHED') {
                                     e.stopPropagation();
                                     openBetSelectionModal(event);
                                   }
                                 }}>
                                   <span className="odds-label">LADO A</span>
                                   <span className="odds-value">{event.gallo_a_odds?.toFixed(2) || '1.90'}</span>
                                 </div>
                                 <div className="odds-btn-wrapper" onClick={(e) => {
                                   if (event.status !== 'FINISHED') {
                                     e.stopPropagation();
                                     openBetSelectionModal(event);
                                   }
                                 }}>
                                   <span className="odds-label">LADO B</span>
                                   <span className="odds-value">{event.gallo_b_odds?.toFixed(2) || '1.90'}</span>
                                 </div>
                               </div>
                             )}

                             {/* Winner Footer */}
                             {event.status === 'FINISHED' && (
                                <div className="cart-winner-footer">
                                   <TrophyOutlined className="trophy-icon" />
                                   <span>
                                      {(event.winner_side === 'D' || event.winner_side === 'DRAW') 
                                        ? 'NULO / TABLAS (EMPATE)' 
                                        : `GANADOR: ${event.winner_side === 'A' ? event.gallo_a_name : event.gallo_b_name}`}
                                   </span>
                                </div>
                             )}

                             {/* Live Glow Footer */}
                             {isActive && event.status !== 'FINISHED' && (
                                <div className="cart-live-glow-footer">
                                   <span className="live-dot" /> EN VIVO 🔥
                                </div>
                             )}
                          </div>
                        );
                    });
                })()}
              </div>
          </div>
      )}

      <Modal open={isBetModalOpen} onCancel={() => !loading && setIsBetModalOpen(false)} footer={null} centered width={360} styles={{ body: { padding: 0 } }}>
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
                  setFightInfo(selectionFight);
                  openBetModal('B');
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
                  setFightInfo(selectionFight);
                  openBetModal('A');
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
    </div>
  );
};

export default UserLiveView;
