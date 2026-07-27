import React, { useState, useEffect } from 'react';
import { Typography, Space, Card, Row, Col, Modal, Button, Skeleton, Badge, Input, DatePicker, Select, message, Popconfirm, Form, Divider } from 'antd';
import { PlayCircleOutlined, PlayCircleFilled, HistoryOutlined, ThunderboltFilled, TrophyOutlined, TrophyFilled, VideoCameraOutlined, DownloadOutlined, ShareAltOutlined, WhatsAppOutlined, CopyOutlined, DeleteOutlined, EditOutlined, InboxOutlined, CloseOutlined } from '@ant-design/icons';
import { supabase, rawFetch, supabaseAnonKey, supabaseUrl } from '../lib/supabase';

const { Title, Text } = Typography;

const ReplaysView = ({ currentUser }) => {
  const [replays, setReplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingReplay, setEditingReplay] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, number-asc, number-desc
  const [form] = Form.useForm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const fetchReplays = async () => {
    try {
      // Fetch finished events 
      const data = await rawFetch(`events?select=*&status=eq.FINISHED&order=created_at.desc&limit=50`);
      if (data) {
        setReplays(data);
        
        // Auto-open replay if ID in URL
        const params = new URLSearchParams(window.location.search);
        const replayId = params.get('replay');
        if (replayId) {
          const replay = data.find(r => r.id === replayId);
          if (replay) {
            setSelectedReplay(replay);
            setIsVideoLoading(true);
          }
        }
      }
    } catch (err) {
      console.error('Replays Fetch Err:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplays();
    return () => setSelectedReplay(null);
  }, []);

  const handleDeleteReplay = async (id) => {
     try {
        setIsDeleting(true);
        // First delete bets associated with this event to avoid FK issues
        await rawFetch(`bets?event_id=eq.${id}`, { method: 'DELETE' });
        await rawFetch(`events?id=eq.${id}`, { method: 'DELETE' });
        message.success('PELEA ELIMINADA DEFINTIVAMENTE');
        fetchReplays();
     } catch (err) {
        message.error('Error al eliminar: ' + err.message);
     } finally {
        setIsDeleting(false);
     }
  };

  const openEditor = (event) => {
      setEditingReplay(event);
      setIsAdminOpen(true);
      form.setFieldsValue({
          stream_url: event.stream_url
      });
  };

  const handleUpdateReplay = async (values) => {
    setLoading(true);
    try {
      await rawFetch(`events?id=eq.${editingReplay.id}`, { 
        method: 'PATCH', 
        body: { stream_url: values.stream_url } 
      });
      
      message.success('REPETICIÓN ACTUALIZADA');
      setIsAdminOpen(false);
      setEditingReplay(null);
      form.resetFields();
      fetchReplays();
    } catch (e) {
      message.error('Error al actualizar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReplays = (replays || [])
    .filter(event => {
        if (!event) return false;
        
        const galloA = (event.gallo_a_name || '').toLowerCase();
        const galloB = (event.gallo_b_name || '').toLowerCase();
        const post = (event.post_number || '').toString();
        const term = (searchTerm || '').toLowerCase();

        const matchesSearch = 
            galloA.includes(term) || 
            galloB.includes(term) ||
            post.includes(term);
        
        if (!selectedDate) return matchesSearch;

        try {
            const eventDate = new Date(event.created_at).setHours(0, 0, 0, 0);
            const filterDate = selectedDate.toDate().setHours(0, 0, 0, 0);
            return matchesSearch && eventDate === filterDate;
        } catch (e) {
            return matchesSearch;
        }
    })
    .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === 'number-asc') return parseInt(a.post_number || 0) - parseInt(b.post_number || 0);
        if (sortBy === 'number-desc') return parseInt(b.post_number || 0) - parseInt(a.post_number || 0);
        return 0;
    });

  const openReplay = (event) => {
    setSelectedReplay(event);
    setIsVideoLoading(true);
    
    // Update URL
    const newUrl = `${window.location.origin}${window.location.pathname}?replay=${event.id}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const closeReplay = () => {
    setSelectedReplay(null);
    setIsVideoLoading(false);
    
    // Clear URL
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const handleDownload = async (url, postNumber) => {
    if (!url) return message.error('URL de video no válida');

    const filename = `Combate_${postNumber || 'Gallos'}.mp4`;

    // Route through local Vite dev proxy to bypass CORS
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;

    const hide = message.loading('Descargando video al dispositivo...', 0);
    try {
      const response = await fetch(proxyUrl);

      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      const blob = await response.blob();

      if (blob.size === 0) throw new Error('El archivo recibido está vacío');

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 200);

      hide();
      message.success(`✅ "${filename}" descargado correctamente`);

    } catch (err) {
      hide();
      console.error('[Download] Error:', err.message);

      // Fallback: detect URL type and give clear guidance
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const isBunnyPlayer = url.includes('player.mediadelivery.net');

      if (isYouTube) {
        message.warning('YouTube no permite descarga directa. Abre el video en YouTube.');
        window.open(url, '_blank');
      } else if (isBunnyPlayer) {
        message.error('Este es un enlace de reproductor. En Bunny.net, ve al video → Downloads → copia el enlace .mp4 directo y actualízalo aquí.');
      } else {
        // Last resort: direct link
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        message.info('Iniciando descarga directa...');
      }
    }
  };


  const handleShare = async (event) => {
    if (!event) return;
    const nameA = (event.gallo_a_name || '').replace('[ARCHIVED] ', '');
    const nameB = (event.gallo_b_name || '');
    const winnerName = (event.winner_side === 'A' ? nameA : nameB).replace('[ARCHIVED] ', '');
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?replay=${event.id}`;
    
    const shareData = {
      title: `Coliseo Ãngel Cruz - Pelea #${event.post_number || ''}`,
      text: `¡Mira esta pelea! Pelea #${event.post_number || ''}: ${nameA} vs ${nameB}. Ganador: ${winnerName}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Share Error:', err);
      }
    } else {
      // Fallback: Open WhatsApp
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
      window.open(waUrl, '_blank');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('Enlace copiado al portapapeles');
  };

  const getShareUrl = (event) => {
    if (!event) return window.location.href;
    return `${window.location.origin}${window.location.pathname}?replay=${event.id}`;
  };

  return (
    <div style={{ padding: '30px 20px', maxWidth: 1200, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Dynamic Header */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '4px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: 20, border: '1px solid rgba(16,185,129,0.2)' }}>
          <HistoryOutlined style={{ color: '#10b981', fontSize: 14 }} />
          <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>Historial de Combates</Text>
        </div>
        <Title level={1} style={{ color: '#fff', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, margin: 0, fontFamily: 'Outfit', letterSpacing: '-1px' }}>
          CÃMARA DE <span style={{ color: '#10b981' }}>REPETICIONES</span>
        </Title>
      </div>

      {/* Filter Controls */}
      <Card 
        styles={{ body: { padding: '24px' } }} 
        style={{ marginBottom: 44, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 24, backdropFilter: 'blur(10px)' }}
      >
        <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={10}>
                <Input 
                    placeholder="Buscar por gallo o pelea (#)..." 
                    value={searchTerm} 
                    prefix={<HistoryOutlined style={{ color: 'rgba(255,255,255,0.2)' }} />}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 12, height: 50 }}
                    allowClear
                />
            </Col>
            <Col xs={12} md={7}>
                <DatePicker 
                    placeholder="Filtrar por fecha" 
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 12, height: 50 }}
                    onChange={date => setSelectedDate(date)}
                    format="DD/MM/YYYY"
                    allowClear
                />
            </Col>
            <Col xs={12} md={7}>
                <Select 
                    placeholder="Ordenar por..."
                    value={sortBy}
                    onChange={val => setSortBy(val)}
                    style={{ width: '100%', height: 50 }}
                    className="premium-select"
                    options={[
                        { label: 'Más Recientes', value: 'newest' },
                        { label: 'Más Antiguos', value: 'oldest' },
                        { label: 'Pelea (Menor a Mayor)', value: 'number-asc' },
                        { label: 'Pelea (Mayor a Menor)', value: 'number-desc' }
                    ]}
                />
            </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {loading ? (
            Array(6).fill(0).map((_, idx) => (
                <Col xs={24} sm={12} md={8} lg={6} key={idx}>
                    <Skeleton.Button active style={{ width: '100%', height: 280, borderRadius: 24 }} />
                </Col>
            ))
        ) : filteredReplays.length > 0 ? (
          filteredReplays.map((event) => (
            <Col xs={24} sm={12} md={8} lg={6} key={event.id}>
                <div 
                  className="premium-replay-card fade-up"
                  onClick={() => openReplay(event)}
                  style={{ 
                    position: 'relative', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: 20, 
                    padding: '16px',
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}
                >
                  {/* Top Row: IDs & Play */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ background: 'rgba(16,185,129,0.08)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                          <Text style={{ color: '#10b981', fontSize: 9, fontWeight: 900, letterSpacing: '1px' }}>PELEA #{event.post_number}</Text>
                      </div>
                      <div className="card-play-icon" style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)', transition: '0.3s' }}>
                          <PlayCircleFilled style={{ color: '#10b981', fontSize: 13 }} />
                      </div>
                  </div>

                  {/* Main Content: Names */}
                  <div style={{ flex: 1 }}>
                      <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 14, fontWeight: 800, fontFamily: 'Outfit', lineHeight: 1.2 }}>
                         {(event.gallo_a_name || 'Gallo A').replace('[ARCHIVED] ', '')}
                         <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 10, fontWeight: 400, margin: '0 8px' }}>VS</span>
                         {(event.gallo_b_name || 'Gallo B')}
                      </Title>
                  </div>

                  {/* Bottom Row: Results & Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12 }}>
                      <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                             <TrophyFilled style={{ color: '#10b981', fontSize: 9 }} />
                             <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                                {((event.winner_side === 'A' ? event.gallo_a_name : (event.winner_side === 'B' ? event.gallo_b_name : 'TABLAS')) || '').replace('[ARCHIVED] ', '').substring(0, 15)}
                                {((event.winner_side === 'A' ? event.gallo_a_name : (event.winner_side === 'B' ? event.gallo_b_name : 'TABLAS')) || '').length > 15 ? '...' : ''}
                             </Text>
                          </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9 }}>{new Date(event.created_at).toLocaleDateString('es-ES')}</Text>
                          {currentUser?.role === 'admin' && (
                            <Space size={4} onClick={e => e.stopPropagation()}>
                               <Button size="small" type="text" icon={<EditOutlined style={{ fontSize: 12 }} />} onClick={(e) => { e.stopPropagation(); openEditor(event); }} style={{ color: 'rgba(255,255,255,0.1)', padding: 0, width: 22 }} />
                               <Popconfirm title="ELIMINAR?" onConfirm={() => handleDeleteReplay(event.id)} okText="SÃ" cancelText="NO"><Button size="small" type="text" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />} onClick={e => e.stopPropagation()} style={{ opacity: 0.2, padding: 0, width: 22 }} /></Popconfirm>
                            </Space>
                          )}
                      </div>
                  </div>
                </div>
            </Col>
          ))
        ) : (
          <Col span={24}>
              <div style={{ textAlign: 'center', padding: '120px 0', background: 'rgba(255,255,255,0.02)', borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)' }}>
                 <HistoryOutlined style={{ fontSize: 56, color: 'rgba(255,255,255,0.05)', marginBottom: 24 }} />
                 <br />
                 <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, letterSpacing: '2px', fontWeight: 700 }}>SIN REPETICIONES DISPONIBLES</Text>
              </div>
          </Col>
        )}
      </Row>

      <Modal
        open={!!selectedReplay}
        onCancel={closeReplay}
        footer={null}
        width="min(95%, 900px)"
        centered
        zIndex={9999}
        destroyOnHidden={true}
        closable={false}
        styles={{ 
            body: { padding: 0, overflow: 'hidden', background: '#040806', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 50px rgba(0,0,0,0.5)' },
            mask: { backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.92)' }
        }}
      >
        {selectedReplay && (
          <div style={{ position: 'relative' }}>
              {/* Botón Cerrar Flotante Premium */}
              <div 
                onClick={closeReplay}
                style={{ 
                    position: 'absolute', top: 20, right: 20, zIndex: 1000, 
                    width: 44, height: 44, background: 'rgba(0,0,0,0.65)', 
                    borderRadius: '50%', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(12px)', color: '#fff', fontSize: 20, transition: 'all 0.3s ease',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}
                className="close-float-btn"
              >
                ✕
              </div>

              <div style={{ position: 'relative', width: '100%', background: '#000', minHeight: 400, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                  {isVideoLoading && (
                      <div style={{ 
                          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
                          zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          background: '#040806', gap: 15
                      }}>
                          <div className="loader-ring" />
                          <Text style={{ color: '#10b981', fontSize: 9, fontWeight: 900, letterSpacing: '4px', textTransform: 'uppercase' }}>Analizando Jugada...</Text>
                      </div>
                  )}
               {(() => {
                  const url = selectedReplay.stream_url || '';
                  if (!url) return <div style={{ padding: 100, textAlign: 'center', width: '100%' }}><Text style={{ color: 'rgba(255,255,255,0.2)' }}>VIDEO NO DISPONIBLE</Text></div>;
                  
                  const isDirectVideo = url.match(/\.(mp4|webm|ogg|mov)$/i) || url.includes('/storage/v1/object/public/');
                  let finalUrl = url;
                  if (url.includes('youtube.com/watch?v=')) finalUrl = url.replace('watch?v=', 'embed/');
                  else if (url.includes('youtu.be/')) finalUrl = `https://www.youtube.com/embed/${url.split('/').pop()}`;
                  
                  if (isDirectVideo) {
                    return (
                        <video 
                            src={url} 
                            controls 
                            autoPlay 
                            onLoadedData={() => setIsVideoLoading(false)}
                            style={{ width: '100%', display: 'block', opacity: isVideoLoading ? 0 : 1, transition: 'opacity 0.8s' }} 
                        />
                    );
                  }

                  return (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, width: '100%', opacity: isVideoLoading ? 0 : 1, transition: 'opacity 0.8s' }}>
                        <iframe 
                            src={finalUrl} 
                            width="100%" height="100%" 
                            frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen 
                            onLoad={() => setIsVideoLoading(false)}
                            style={{ position: 'absolute', top: 0, left: 0 }} 
                        />
                    </div>
                  );
               })()}
              </div>
              <div style={{ padding: '40px', background: 'linear-gradient(180deg, #060c09 0%, #040806 100%)', borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                  <Row gutter={[40, 40]} align="middle">
                     <Col xs={24} lg={15}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                           <div style={{ width: 32, height: 1, background: 'linear-gradient(90deg, #10b981, transparent)' }} />
                           <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 900, letterSpacing: '3px', textTransform: 'uppercase' }}>Veredicto de Arena</Text>
                        </div>
                        
                        <div style={{ marginBottom: 32 }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                              <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 900, fontFamily: 'Outfit', fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-1px' }}>
                                 {(selectedReplay.gallo_a_name || '').replace('[ARCHIVED] ', '')}
                              </Title>
                              <div style={{ 
                                 width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', 
                                 display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                 background: 'rgba(255,255,255,0.03)', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.2)'
                              }}>VS</div>
                              <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 900, fontFamily: 'Outfit', fontSize: 'clamp(28px, 4vw, 42px)', letterSpacing: '-1px' }}>
                                 {selectedReplay.gallo_b_name || ''}
                              </Title>
                           </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                           <div style={{ 
                              background: 'rgba(16,185,129,0.03)', 
                              border: '1px solid rgba(16,185,129,0.15)', 
                              padding: '20px', 
                              borderRadius: 16,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 16
                           }}>
                              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <TrophyFilled style={{ color: '#10b981', fontSize: 20 }} />
                              </div>
                              <div>
                                 <Text style={{ color: 'rgba(16,185,129,0.5)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', display: 'block', letterSpacing: '1.5px' }}>Ganador</Text>
                                 <Text style={{ color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'Outfit' }}>
                                    {((selectedReplay.winner_side === 'A' ? selectedReplay.gallo_a_name : (selectedReplay.winner_side === 'B' ? selectedReplay.gallo_b_name : 'TABLAS')) || '').replace('[ARCHIVED] ', '').toUpperCase()}
                                 </Text>
                              </div>
                           </div>
                           
                           <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <ThunderboltFilled style={{ color: 'rgba(255,255,255,0.2)', fontSize: 20 }} />
                              </div>
                              <div>
                                 <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', display: 'block', letterSpacing: '1.5px' }}>Fecha</Text>
                                 <Text style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 15 }}>
                                    {selectedReplay.created_at ? new Date(selectedReplay.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                 </Text>
                              </div>
                           </div>
                        </div>
                     </Col>
                     
                     <Col xs={24} lg={9}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.05)' }}>
                           <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginBottom: 16, textAlign: 'center' }}>Acciones de Combate</Text>
                           <Space direction="vertical" style={{ width: '100%' }} size={12}>
                              <Button block icon={<WhatsAppOutlined />} onClick={() => handleShare(selectedReplay)} className="premium-btn whatsapp" style={{ height: 50, borderRadius: 12, border: 'none', background: '#25D366', color: '#fff', fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px' }}>Compartir</Button>
                              
                              <Row gutter={12}>
                                 <Col span={selectedReplay.stream_url ? 12 : 24}>
                                    <Button block icon={<CopyOutlined />} onClick={() => copyToClipboard(getShareUrl(selectedReplay))} className="premium-btn copy" style={{ height: 50, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontWeight: 800, fontSize: 10, textTransform: 'uppercase' }}>Enlace</Button>
                                 </Col>
                                 {selectedReplay.stream_url && (
                                    <Col span={12}>
                                       <Button block icon={<DownloadOutlined />} onClick={() => handleDownload(selectedReplay.stream_url, selectedReplay.post_number)} className="premium-btn download" style={{ height: 50, borderRadius: 12, border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, fontSize: 10, textTransform: 'uppercase' }}>Descargar</Button>
                                    </Col>
                                 )}
                              </Row>

                              <Button block icon={<CloseOutlined />} onClick={closeReplay} className="premium-btn close" style={{ height: 50, borderRadius: 12, border: "1px solid rgba(255,77,79,0.2)", background: "rgba(255,77,79,0.05)", color: "#ff4d4f", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", marginTop: 8 }}>Cerrar Galería</Button>
                           </Space>
                        </div>
                     </Col>
                  </Row>
               </div>
            </div>
         )}
      </Modal>

      <style>{`
        @keyframes pulse-green {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(16,185,129,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        .premium-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .premium-btn:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 10px 20px rgba(0,0,0,0.3); }
        .premium-btn:active { transform: translateY(-1px); }
        .close-float-btn:hover {
           background: rgba(16,185,129,0.2) !important;
           border-color: #10b981 !important;
           transform: scale(1.1);
           box-shadow: 0 0 20px rgba(16,185,129,0.4);
        }
        .premium-replay-card:hover { 
           transform: translateY(-5px); 
           background: rgba(255,255,255,0.04) !important; 
           border-color: rgba(16,185,129,0.4) !important;
           box-shadow: 0 15px 35px rgba(0,0,0,0.4), 0 0 15px rgba(16,185,129,0.1); 
        }
        .premium-replay-card:hover .card-play-icon {
           background: #10b981 !important;
           border-color: #10b981 !important;
        }
        .premium-replay-card:hover .card-play-icon * {
           color: #fff !important;
        }
        .replay-box:hover { transform: translateY(-8px); border-color: rgba(16,185,129,0.3) !important; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
        .replay-box:hover .thumb-img { transform: scale(1.1); opacity: 0.8 !important; }
        .replay-box:hover .play-btn-center { transform: scale(1.2); }
        .replay-box .play-btn-center { transition: 0.3s; }
        .loader-ring { width: 40px; height: 40px; border: 3px solid rgba(16,185,129,0.1); border-radius: 50%; border-top-color: #10b981; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .premium-select .ant-select-selector {
           background: rgba(0,0,0,0.3) !important;
           border: 1px solid rgba(255,255,255,0.1) !important;
           color: #fff !important;
           border-radius: 12px !important;
           height: 50px !important;
           padding: 0 15px !important;
           display: flex !important;
           align-items: center !important;
        }
        .premium-select .ant-select-selection-item { color: #fff !important; font-weight: 600 !important; }
        .premium-select .ant-select-arrow { color: rgba(255,255,255,0.2) !important; }
      `}</style>
       
       <Modal
          title={<Text style={{ color: "#10b981", fontWeight: 900, letterSpacing: "2px", fontSize: 12 }}>🛠️ EDITAR REPETICIÓN</Text>}
          open={isAdminOpen}
          onCancel={() => { setIsAdminOpen(false); setEditingReplay(null); }}
          footer={null}
          centered
          width={400}
          styles={{ body: { background: '#040806', padding: '24px' } }}
       >
          <Form form={form} layout="vertical" onFinish={handleUpdateReplay}>
              <Form.Item name="stream_url" label={<Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900 }}>URL DEL VIDEO</Text>}>
                  <Input style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 10, height: 44 }} placeholder="https://..." />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 48, background: '#10b981', border: 'none', fontWeight: 900, borderRadius: 12 }}>ACTUALIZAR</Button>
          </Form>
       </Modal>
    </div>
  );
};

export default ReplaysView;
