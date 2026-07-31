import React, { useState, useEffect } from 'react';
import { Typography, Space, Card, Row, Col, Modal, Button, Skeleton, Input, Select, message, Popconfirm, Form } from 'antd';
import { PlayCircleOutlined, PlayCircleFilled, HistoryOutlined, ThunderboltFilled, TrophyFilled, VideoCameraOutlined, DownloadOutlined, ShareAltOutlined, WhatsAppOutlined, CopyOutlined, DeleteOutlined, EditOutlined, CloseOutlined, CalendarOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';

const { Title, Text } = Typography;

const parseWeight = (rawWeight) => {
  if (!rawWeight) return '';
  try {
    const obj = JSON.parse(rawWeight);
    return obj.weight || rawWeight;
  } catch (e) {
    return rawWeight;
  }
};

const ReplaysView = ({ currentUser }) => {
  const [replays, setReplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingReplay, setEditingReplay] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [form] = Form.useForm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const fetchReplays = async () => {
    try {
      const data = await rawFetch(`events?select=*&status=eq.FINISHED&order=created_at.desc&limit=100`);
      if (data) {
        setReplays(data);
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
        await rawFetch(`bets?event_id=eq.${id}`, { method: 'DELETE' });
        await rawFetch(`events?id=eq.${id}`, { method: 'DELETE' });
        message.success('Pelea eliminada correctamente');
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
      form.setFieldsValue({ stream_url: event.stream_url });
  };

  const handleUpdateReplay = async (values) => {
    setLoading(true);
    try {
      await rawFetch(`events?id=eq.${editingReplay.id}`, { 
        method: 'PATCH', 
        body: { stream_url: values.stream_url } 
      });
      message.success('Repetición actualizada');
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

  // Extract all distinct dates for dropdown filter
  const availableDatesMap = (replays || []).reduce((acc, event) => {
    if (!event || !event.created_at) return acc;
    const dateObj = new Date(event.created_at);
    const dStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!acc[dStr]) acc[dStr] = { dateStr: dStr, count: 0, timestamp: dateObj.getTime() };
    acc[dStr].count += 1;
    return acc;
  }, {});

  const availableDatesList = Object.values(availableDatesMap).sort((a, b) => b.timestamp - a.timestamp);

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
        
        if (selectedDateFilter !== 'ALL') {
          const dStr = new Date(event.created_at || Date.now()).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
          if (dStr !== selectedDateFilter) return false;
        }

        return matchesSearch;
    })
    .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === 'number-asc') return parseInt(a.post_number || 0) - parseInt(b.post_number || 0);
        if (sortBy === 'number-desc') return parseInt(b.post_number || 0) - parseInt(a.post_number || 0);
        return 0;
    });

  // Group filtered replays by formatted date for clean section layout
  const groupedByDate = (filteredReplays || []).reduce((acc, event) => {
    if (!event) return acc;
    const dateObj = new Date(event.created_at || Date.now());
    const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const fullDateTitle = dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    if (!acc[dateStr]) {
      acc[dateStr] = { dateStr, fullTitle: fullDateTitle, timestamp: dateObj.getTime(), events: [] };
    }
    acc[dateStr].events.push(event);
    return acc;
  }, {});

  const dateGroupsList = Object.values(groupedByDate).sort((a, b) => {
    if (sortBy === 'oldest') return a.timestamp - b.timestamp;
    return b.timestamp - a.timestamp;
  });

  const openReplay = (event) => {
    setSelectedReplay(event);
    setIsVideoLoading(true);
    const newUrl = `${window.location.origin}${window.location.pathname}?replay=${event.id}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const closeReplay = () => {
    setSelectedReplay(null);
    setIsVideoLoading(false);
    const newUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const handleDownload = async (url, postNumber) => {
    if (!url) return message.error('URL de video no válida');

    const filename = `Combate_${postNumber || 'Gallos'}.mp4`;
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(filename)}`;
    const hide = message.loading('Descargando video...', 0);

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const blob = await response.blob();
      if (blob.size === 0) throw new Error('El archivo está vacío');

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
      message.success(`Descargado "${filename}"`);
    } catch (err) {
      hide();
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      if (isYouTube) {
        window.open(url, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
      title: `Coliseo Ángel Cruz - Pelea #${event.post_number || ''}`,
      text: `Pelea #${event.post_number || ''}: ${nameA} vs ${nameB}. Ganador: ${winnerName}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) {}
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
      window.open(waUrl, '_blank');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    message.success('Enlace copiado');
  };

  const getShareUrl = (event) => {
    if (!event) return window.location.href;
    return `${window.location.origin}${window.location.pathname}?replay=${event.id}`;
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1200, margin: '0 auto', minHeight: '100vh', paddingBottom: 80 }}>
      {/* Simple Header */}
      <div style={{ marginBottom: 24, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ color: '#ffffff', margin: 0, fontWeight: 900, fontFamily: 'Outfit, sans-serif', fontSize: 26, letterSpacing: '-0.5px' }}>
            📹 REPETICIONES DE COMBATE
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600 }}>
            Peleas concluidas del Coliseo Ángel Cruz ({filteredReplays.length} peleas)
          </Text>
        </div>
      </div>

      {/* Clean Single Filter Bar */}
      <div style={{ 
        marginBottom: 28, 
        background: 'rgba(255,255,255,0.03)', 
        border: '1px solid rgba(255,255,255,0.08)', 
        borderRadius: 12, 
        padding: '12px 14px' 
      }}>
        <Row gutter={[10, 10]} align="middle">
          {/* Search */}
          <Col xs={24} sm={10} md={12}>
            <Input 
              placeholder="Buscar por gallo o pelea #..." 
              value={searchTerm} 
              prefix={<SearchOutlined style={{ color: '#10b981' }} />}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, height: 40 }}
              allowClear
            />
          </Col>

          {/* Date Selector Dropdown */}
          <Col xs={12} sm={7} md={6}>
            <Select 
              placeholder="Filtrar por fecha"
              value={selectedDateFilter}
              onChange={val => setSelectedDateFilter(val)}
              style={{ width: '100%', height: 40 }}
              className="clean-select"
              options={[
                { label: `📅 TODAS LAS FECHAS (${replays.length})`, value: 'ALL' },
                ...availableDatesList.map(d => ({
                  label: `📅 FECHA: ${d.dateStr} (${d.count})`,
                  value: d.dateStr
                }))
              ]}
            />
          </Col>

          {/* Sort Selector */}
          <Col xs={12} sm={7} md={6}>
            <Select 
              placeholder="Ordenar"
              value={sortBy}
              onChange={val => setSortBy(val)}
              style={{ width: '100%', height: 40 }}
              className="clean-select"
              options={[
                { label: 'Más Recientes primero', value: 'newest' },
                { label: 'Más Antiguos primero', value: 'oldest' },
                { label: 'Pelea # (Ascendente)', value: 'number-asc' },
                { label: 'Pelea # (Descendente)', value: 'number-desc' }
              ]}
            />
          </Col>
        </Row>
      </div>

      {/* Date Groups Rows */}
      {loading ? (
        <Row gutter={[16, 16]}>
          {Array(6).fill(0).map((_, idx) => (
            <Col xs={24} sm={12} md={8} lg={6} key={idx}>
              <Skeleton.Button active style={{ width: '100%', height: 220, borderRadius: 14 }} />
            </Col>
          ))}
        </Row>
      ) : dateGroupsList.length > 0 ? (
        dateGroupsList.map((group) => (
          <div key={group.dateStr} style={{ marginBottom: 32 }}>
            {/* Simple Minimalist Date Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 8,
              marginBottom: 16,
              borderBottom: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: '#10b981', fontSize: 15 }} />
                <Text style={{ color: '#ffffff', fontWeight: 900, fontSize: 15, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {group.fullTitle} ({group.dateStr})
                </Text>
              </div>

              <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800, background: 'rgba(16,185,129,0.1)', padding: '2px 10px', borderRadius: 12 }}>
                {group.events.length} {group.events.length === 1 ? 'pelea' : 'peleas'}
              </span>
            </div>

            {/* Cards Grid */}
            <Row gutter={[16, 16]}>
              {group.events.map((event) => {
                const nameA = (event.gallo_a_name || 'Gallo Azul').replace('[ARCHIVED] ', '');
                const nameB = (event.gallo_b_name || 'Gallo Blanco');
                const weightA = parseWeight(event.gallo_a_weight);
                const weightB = parseWeight(event.gallo_b_weight);

                return (
                  <Col xs={24} sm={12} md={8} lg={6} key={event.id}>
                    <div 
                      className="simple-replay-card"
                      onClick={() => openReplay(event)}
                      style={{ 
                        background: 'linear-gradient(135deg, #11161d 0%, #0b0f17 100%)', 
                        borderRadius: 14, 
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}
                    >
                      {/* Top Header: PELEA # + Winner */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 900 }}>
                          PELEA #{event.post_number}
                        </div>

                        <div style={{
                          fontSize: 9,
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: 6,
                          textTransform: 'uppercase',
                          ...(event.winner_side === 'A' || event.winner_side === 'Azul'
                            ? { background: 'rgba(29, 78, 216, 0.85)', color: '#fff' }
                            : event.winner_side === 'B' || event.winner_side === 'Blanco'
                            ? { background: 'rgba(241, 245, 249, 0.9)', color: '#0f172a' }
                            : { background: 'rgba(180, 83, 9, 0.85)', color: '#fff' }
                          )
                        }}>
                          🏆 {event.winner_side === 'A' ? nameA : event.winner_side === 'B' ? nameB : 'TABLAS'}
                        </div>
                      </div>

                      {/* Fighters Info */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 8, color: '#3b82f6', fontWeight: 900 }}>AZUL</div>
                            <div style={{ fontSize: 12, color: '#fff', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameA}</div>
                            {weightA && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{weightA}</div>}
                          </div>

                          <div style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>VS</div>

                          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                            <div style={{ fontSize: 8, color: '#e2e8f0', fontWeight: 900 }}>BLANCO</div>
                            <div style={{ fontSize: 12, color: '#fff', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameB}</div>
                            {weightB && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{weightB}</div>}
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 }}>
                        <Button 
                          size="small"
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={(e) => { e.stopPropagation(); openReplay(event); }}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 900,
                            height: 28,
                            flex: 1,
                            marginRight: 6
                          }}
                        >
                          VER REPETICIÓN
                        </Button>

                        <Button 
                          size="small"
                          type="text"
                          icon={<ShareAltOutlined style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} />}
                          onClick={(e) => { e.stopPropagation(); handleShare(event); }}
                          style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 28, width: 28, padding: 0 }}
                        />

                        {currentUser?.role === 'admin' && (
                          <Space size={4} onClick={e => e.stopPropagation()} style={{ marginLeft: 4 }}>
                            <Button size="small" type="text" icon={<EditOutlined style={{ fontSize: 11, color: '#38bdf8' }} />} onClick={(e) => { e.stopPropagation(); openEditor(event); }} style={{ padding: 0, width: 20, height: 28 }} />
                            <Popconfirm title="¿Eliminar?" onConfirm={() => handleDeleteReplay(event.id)} okText="Sí" cancelText="No">
                              <Button size="small" type="text" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} onClick={e => e.stopPropagation()} style={{ padding: 0, width: 20, height: 28 }} />
                            </Popconfirm>
                          </Space>
                        )}
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
          <HistoryOutlined style={{ fontSize: 36, color: 'rgba(255,255,255,0.1)', marginBottom: 12 }} />
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700 }}>No hay repeticiones disponibles para el filtro seleccionado</Text>
        </div>
      )}

      {/* Video Modal Player */}
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
            body: { padding: 0, overflow: 'hidden', background: '#040806', borderRadius: 20, border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 0 50px rgba(0,0,0,0.7)' },
            mask: { backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.92)' }
        }}
      >
        {selectedReplay && (
          <div style={{ position: 'relative' }}>
              <div 
                onClick={closeReplay}
                style={{ 
                    position: 'absolute', top: 16, right: 16, zIndex: 1000, 
                    width: 38, height: 38, background: 'rgba(0,0,0,0.75)', 
                    borderRadius: '50%', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: 16
                }}
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
                          <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 900, letterSpacing: '2px' }}>CARGANDO VIDEO...</Text>
                      </div>
                  )}
               {(() => {
                  const url = selectedReplay.stream_url || '';
                  if (!url) return <div style={{ padding: 100, textAlign: 'center', width: '100%' }}><Text style={{ color: 'rgba(255,255,255,0.3)' }}>VIDEO NO DISPONIBLE</Text></div>;
                  
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

              {/* Modal Details Section */}
              <div style={{ padding: '24px', background: '#040806' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                     <div>
                        <Text style={{ color: '#10b981', fontSize: 11, fontWeight: 900, display: 'block', marginBottom: 4 }}>
                           PELEA #{selectedReplay.post_number} — {new Date(selectedReplay.created_at).toLocaleDateString('es-ES')}
                        </Text>
                        <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 900, fontFamily: 'Outfit, sans-serif' }}>
                           {(selectedReplay.gallo_a_name || 'Gallo Azul').replace('[ARCHIVED] ', '')} vs {selectedReplay.gallo_b_name || 'Gallo Blanco'}
                        </Title>
                     </div>

                     <Space size={8}>
                        <Button icon={<WhatsAppOutlined />} onClick={() => handleShare(selectedReplay)} style={{ background: '#25D366', border: 'none', color: '#fff', fontWeight: 800, borderRadius: 8 }}>Compartir</Button>
                        {selectedReplay.stream_url && (
                          <Button icon={<DownloadOutlined />} onClick={() => handleDownload(selectedReplay.stream_url, selectedReplay.post_number)} style={{ background: '#10b981', border: 'none', color: '#fff', fontWeight: 800, borderRadius: 8 }}>Descargar</Button>
                        )}
                        <Button icon={<CloseOutlined />} onClick={closeReplay} style={{ borderRadius: 8 }}>Cerrar</Button>
                     </Space>
                  </div>
               </div>
            </div>
         )}
      </Modal>

      <style>{`
        .clean-select .ant-select-selector {
           background: rgba(0,0,0,0.3) !important;
           border: 1px solid rgba(255,255,255,0.1) !important;
           color: #fff !important;
           border-radius: 8px !important;
           height: 40px !important;
           display: flex !important;
           align-items: center !important;
        }
        .clean-select .ant-select-selection-item { color: #fff !important; font-weight: 700 !important; }
        .clean-select .ant-select-arrow { color: rgba(255,255,255,0.4) !important; }
        .simple-replay-card:hover {
           transform: translateY(-3px);
           border-color: rgba(16,185,129,0.4) !important;
           box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
        }
      `}</style>
       
       <Modal
          title={<Text style={{ color: "#10b981", fontWeight: 900, fontSize: 12 }}>EDITAR REPETICIÓN</Text>}
          open={isAdminOpen}
          onCancel={() => { setIsAdminOpen(false); setEditingReplay(null); }}
          footer={null}
          centered
          width={400}
          styles={{ body: { background: '#040806', padding: '24px' } }}
       >
          <Form form={form} layout="vertical" onFinish={handleUpdateReplay}>
              <Form.Item name="stream_url" label={<Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900 }}>URL DEL VIDEO</Text>}>
                  <Input style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, height: 40 }} placeholder="https://..." />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, background: '#10b981', border: 'none', fontWeight: 900, borderRadius: 8 }}>ACTUALIZAR</Button>
          </Form>
       </Modal>
    </div>
  );
};

export default ReplaysView;
