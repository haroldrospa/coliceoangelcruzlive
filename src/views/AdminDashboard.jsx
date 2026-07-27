import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, InputNumber, Space, Typography, Row, Col, Divider, App as AntApp, Tabs, Image, Select, Badge, Popconfirm } from 'antd';
import { PlusOutlined, ThunderboltFilled, TrophyOutlined, SignalFilled, SettingOutlined, EyeOutlined, CheckCircleFilled, WalletOutlined, DollarOutlined, VideoCameraOutlined, InboxOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { supabase, rawFetch, supabaseAnonKey, supabaseUrl } from '../lib/supabase';
import { scanScoreboardWithGroq } from '../lib/groq';

const { Title, Text } = Typography;

const AdminDashboard = () => {
  const { message, modal } = AntApp.useApp();
  const [activeTab, setActiveTab] = useState('1');
  const [events, setEvents] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalStream, setGlobalStream] = useState('');
  const [showCartelera, setShowCartelera] = useState(true);
  const [streamMode, setStreamMode] = useState('LIVE');
  const [isSavingStream, setIsSavingStream] = useState(false);
  const [isSavingMode, setIsSavingMode] = useState(false);
  const [form] = Form.useForm();
  const [isScanning, setIsScanning] = useState(false);
  const [groqKey, setGroqKey] = useState('');
  const [isSavingGroq, setIsSavingGroq] = useState(false);

  const fetchData = async () => {
    try {
      if (activeTab === '1') {
        // Filter out [ARCHIVED] fights to keep the list clean. 
        // We use a prefix because the 'status' column is an Enum in the database.
        const data = await rawFetch(`events?select=*&gallo_a_name=not.ilike.[ARCHIVED]*&order=created_at.desc`);
        if (data) setEvents(data);
        
        // Fetch Global Settings from DB
        const settings = await rawFetch(`settings`);
        if (settings) {
            const stream = settings.find(s => s.id === 'live_stream_url');
            const cartelera = settings.find(s => s.id === 'show_cartelera');
            const mode = settings.find(s => s.id === 'stream_logic_mode');
            const groq = settings.find(s => s.id === 'groq_api_key');
            if (stream) setGlobalStream(stream.value);
            if (cartelera) setShowCartelera(cartelera.value === 'true');
            if (mode) setStreamMode(mode.value);
            if (groq) setGroqKey(groq.value);
        }
      } else {
        const deps = await rawFetch(`deposits?select=*,users(email)&order=created_at.desc`);
        if (deps) setDeposits(deps);
      }
    } catch (err) {
      console.error('Admin Fetch Err:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
          if (payload.new) {
              if (payload.new.id === 'live_stream_url') setGlobalStream(payload.new.value);
              if (payload.new.id === 'show_cartelera') setShowCartelera(payload.new.value === 'true');
              if (payload.new.id === 'stream_logic_mode') setStreamMode(payload.new.value);
          }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeTab]);

  const handleCreateEvent = async (values) => {
    setLoading(true);
    try {
      const payload = { 
        ...values, 
        status: 'LIVE', 
        stream_url: values.stream_url || globalStream 
      };
      await rawFetch('events', { method: 'POST', body: payload });
      message.success('PELEA PROGRAMADA CON ÉXITO');
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e) { message.error(e.message); }
    finally { setLoading(false); }
  };

  const handleCreateReplay = async (values) => {
    setLoading(true);
    try {
      await rawFetch('events', { 
        method: 'POST', 
        body: { 
            ...values, 
            status: 'FINISHED',
            post_number: parseInt(values.post_number, 10),
            gallo_a_odds: parseFloat(values.gallo_a_odds || 1.9),
            gallo_b_odds: parseFloat(values.gallo_b_odds || 1.9)
        } 
      });
      message.success('REPETICIÓN REGISTRADA CON ÉXITO');
      setIsReplayModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e) { 
        message.error('Error al guardar repetición: ' + e.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const handleUpdateReplay = async (values) => {
    setLoading(true);
    try {
      await rawFetch(`events?id=eq.${editingEvent.id}`, { 
        method: 'PATCH', 
        body: {
            ...values,
            post_number: parseInt(values.post_number, 10),
            gallo_a_odds: parseFloat(values.gallo_a_odds || editingEvent.gallo_a_odds || 1.9),
            gallo_b_odds: parseFloat(values.gallo_b_odds || editingEvent.gallo_b_odds || 1.9)
        } 
      });
      message.success('REPETICIÓN ACTUALIZADA');
      setIsReplayModalOpen(false);
      setEditingEvent(null);
      form.resetFields();
      fetchData();
    } catch (e) {
      message.error('Error al actualizar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openReplayEditor = (event) => {
      setEditingEvent(event);
      setIsReplayModalOpen(true);
      form.setFieldsValue(event);
  };

  const processScoreboardImage = async (file) => {
    if (!file) return;

    setIsScanning(true);
    const hide = message.loading('IA ANALIZANDO CAPTURA PEGADA...', 0);
    
    try {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
        
        const base64 = await base64Promise;
        const data = await scanScoreboardWithGroq(base64);
        
        if (data) {
            form.setFieldsValue({
                post_number: data.post_number || '',
                gallo_a_name: data.gallo_a_name || '',
                gallo_b_name: data.gallo_b_name || ''
            });
            message.success('CAPTURA PROCESADA CON ÉXITO');
        }
    } catch (err) {
        console.error('Scan Error:', err);
        message.error('FALLO AL EXTRAER DATOS: ' + err.message);
    } finally {
        setIsScanning(false);
        hide();
    }
  };

  const handleScanImage = async (e) => {
    const file = e.target.files[0];
    await processScoreboardImage(file);
    e.target.value = ''; // Clean input
  };

  useEffect(() => {
    const handlePaste = (event) => {
        if (!isReplayModalOpen) return;
        
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                processScoreboardImage(blob);
                break;
            }
        }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isReplayModalOpen]);

  const handleBulkCreate = async (values) => {
    setLoading(true);
    try {
        const lines = values.bulkText.split('\n').filter(line => line.trim().length > 5);
        const newEvents = lines.map(line => {
            const [post, a, b] = line.split(',').map(s => s.trim());
            return {
                post_number: post || '0',
                gallo_a_name: a || 'Gallo Azul',
                gallo_b_name: b || 'Gallo Blanco',
                status: 'PENDING',
                stream_url: globalStream,
                gallo_a_odds: 1.9,
                gallo_b_odds: 1.9
            };
        });

        if (newEvents.length === 0) throw new Error('Formato inválido. Usa: Poste, Gallo A, Gallo B');

        await rawFetch('events', { method: 'POST', body: newEvents });
        message.success(`${newEvents.length} PELEAS CARGADAS AL PROGRAMA`);
        setIsBulkModalOpen(false);
        form.resetFields();
        fetchData();
    } catch (e) {
        message.error('Error en carga masiva: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveGlobalStream = async () => {
    setIsSavingStream(true);
    try {
        await rawFetch(`settings?id=eq.live_stream_url`, {
            method: 'PATCH',
            body: { value: globalStream }
        });
        message.success('URL DE TRANSMISIÓN ACTUALIZADA');
    } catch (e) {
        message.error('Error al guardar URL: ' + e.message);
    } finally {
        setIsSavingStream(false);
    }
  };

  const handleToggleCartelera = async (checked) => {
     try {
         await rawFetch(`settings?id=eq.show_cartelera`, {
             method: 'PATCH',
             body: { value: String(checked) }
         });
         setShowCartelera(checked);
         message.success(checked ? 'CARTELERA VISIBLE PARA USUARIOS' : 'CARTELERA OCULTA PARA USUARIOS');
     } catch (e) {
      message.error('Error al actualizar cartelera');
    }
  };

  const handleToggleStreamMode = async (val) => {
    try {
      setIsSavingMode(true);
      setStreamMode(val);
      await rawFetch(`settings?id=eq.stream_logic_mode`, { 
        method: 'PATCH', 
        body: { value: val } 
      });
      message.success(`SISTEMA EN MODO: ${val === 'LIVE' ? 'TRANSMISIÓN' : 'LOGO PUBLICITARIO'}`);
    } catch (e) {
      message.error('Error al cambiar modo de transmisión');
    } finally {
      setIsSavingMode(false);
    }
  };

  const handleSaveGroqKey = async () => {
    setIsSavingGroq(true);
    try {
        const payload = { id: 'groq_api_key', value: groqKey };
        // Check if exists
        const currentSettings = await rawFetch('settings');
        const exists = currentSettings.find(s => s.id === 'groq_api_key');

        if (exists) {
            await rawFetch(`settings?id=eq.groq_api_key`, { 
                method: 'PATCH', 
                body: { value: groqKey } 
            });
        } else {
            await rawFetch(`settings`, { 
                method: 'POST', 
                body: payload 
            });
        }
        message.success('API KEY GUARDADA EN BASE DE DATOS');
        fetchData();
    } catch (e) {
        console.error('Save Key Error:', e);
        message.error('Error al guardar llave en DB');
    } finally {
        setIsSavingGroq(false);
    }
  };

  const handleClearChat = async () => {
    try {
      setLoading(true);
      await rawFetch('messages', { 
        method: 'DELETE', 
        query: 'id=not.is.null' 
      });
      message.success('CHAT VACIADO CORRECTAMENTE');
    } catch (e) {
      console.error('Clear Chat Err:', e);
      message.error('Error al vaciar el chat');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (deposit) => {
    modal.confirm({
        title: 'CONFIRMAR ACREDITACIÓN',
        content: `¿Deseas acreditar $${deposit.amount} a la cuenta de ${deposit.users?.email}?`,
        onOk: async () => {
            setLoading(true);
            try {
                const userArr = await rawFetch(`users?select=balance&id=eq.${deposit.user_id}`);
                const currentBalance = parseFloat(userArr[0]?.balance || 0);
                const newBalance = (currentBalance + parseFloat(deposit.amount)).toFixed(2);
                await rawFetch(`users?id=eq.${deposit.user_id}`, { method: 'PATCH', body: { balance: newBalance } });
                await rawFetch(`deposits?id=eq.${deposit.id}`, { method: 'PATCH', body: { status: 'APPROVED' } });
                await rawFetch('transactions', { method: 'POST', body: { user_id: deposit.user_id, amount_change: deposit.amount, type: 'DEPOSIT', description: `Carga aprobada vía ${deposit.method}` } });
                message.success('SALDO ACREDITADO');
                fetchData();
            } catch (e) { message.error('Error'); }
            finally { setLoading(false); }
        }
    });
  };

  const updateStatus = async (id, status) => {
    try {
      await rawFetch(`events?id=eq.${id}`, { method: 'PATCH', body: { status } });
      message.info(`ESTADO: ${status}`);
      fetchData();
    } catch (e) { message.error(e.message); }
  };

  const handleFixStorage = async () => {
    setLoading(true);
    try {
        const { error } = await supabase.storage.createBucket('media', { public: true });
        if (error) {
            if (error.message.includes('already exists')) {
                message.success('LA CARPETA "media" YA EXISTE');
            } else {
                throw error;
            }
        } else {
            message.success('CARPETA "media" CREADA CON ÉXITO');
        }
    } catch (e) {
        Modal.error({
            title: 'ACCIÓN REQUERIDA EN SUPABASE',
            content: (
                <div>
                    <p>Por seguridad, Supabase no permite que las aplicaciones creen carpetas automáticamente.</p>
                    <p>Sigue estos pasos rápidos:</p>
                    <ol>
                        <li>Abre tu panel de <b>Supabase</b> (https://supabase.com).</li>
                        <li>Entra a la sección <b>Storage</b> en el menú izquierdo.</li>
                        <li>Haz clic en <b>New Bucket</b>.</li>
                        <li>Escribe <b>media</b> en el nombre.</li>
                        <li>Marca la casilla <b>Public bucket</b>.</li>
                        <li><b>IMPORTANTE:</b> Busca la opción <b>Maximum File Size</b> y cámbiala de 50MB a <b>1000MB</b> (1GB) para permitir videos pesados.</li>
                        <li>Haz clic en <b>Save</b>.</li>
                        <li>(Opcional) Ve a Policies y permite "Insert" para la carpeta "media".</li>
                    </ol>
                </div>
            )
        });
        console.error('Error al crear bucket:', e);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteEvent = async (event) => {
    setLoading(true);
    try {
      if (event.status === 'FINISHED') {
        // SOFT DELETE: Prefix name with [ARCHIVED] to hide it from admin dashboard but keep replay
        const newName = `[ARCHIVED] ${event.gallo_a_name}`;
        await rawFetch(`events?id=eq.${event.id}`, { 
          method: 'PATCH', 
          body: { gallo_a_name: newName } 
        });
        message.success('PELEA ARCHIVADA (REPETICIÓN PRESERVADA)');
      } else {
        // HARD DELETE: For non-finished fights
        await rawFetch(`bets?event_id=eq.${event.id}`, { method: 'DELETE' });
        await rawFetch(`events?id=eq.${event.id}`, { method: 'DELETE' });
        message.success('PELEA ELIMINADA');
      }
      fetchData();
    } catch (e) { 
        console.error('Delete Error:', e);
        message.error('Error al procesar: ' + e.message); 
    } finally {
        setLoading(false);
    }
  };

  const setWinnerAndPayout = async (event, winnerSide) => {
    const winnerName = winnerSide === 'D' ? 'TABLAS / EMPATE' : (winnerSide === 'A' ? event.gallo_a_name : event.gallo_b_name);
    modal.confirm({
        title: 'LIQUIDACIÓN DE MERCADO',
        content: `¿Declarar ganador a: ${winnerName.toUpperCase()}? ${winnerSide === 'D' ? 'Se reembolsarán todas las apuestas.' : 'Se iniciará la acreditación masiva de premios.'}`,
        onOk: async () => {
            setLoading(true);
            try {
                // 1. Finalize the Event
                await rawFetch(`events?id=eq.${event.id}`, { method: 'PATCH', body: { status: 'FINISHED', winner_side: winnerSide } });

                // 2. Resolve all Bets for this fight
                const allBets = await rawFetch(`bets?select=*&event_id=eq.${event.id}&status=eq.PENDING`);
                
                if (allBets && allBets.length > 0) {
                    const payoutsByUser = {};

                    for (const bet of allBets) {
                        let isWinner = false;
                        let payoutAmount = 0;

                        if (winnerSide === 'D') {
                           // Refund the original amount
                           isWinner = true; 
                           payoutAmount = parseFloat(bet.amount);
                        } else if (bet.selected_side === winnerSide) {
                           // Calculate win payout
                           isWinner = true;
                           payoutAmount = parseFloat(bet.amount) * parseFloat(bet.odds_at_bet);
                        }

                        if (isWinner) {
                            if (!payoutsByUser[bet.user_id]) {
                                payoutsByUser[bet.user_id] = { totalPayout: 0 };
                            }
                            payoutsByUser[bet.user_id].totalPayout += payoutAmount;
                            
                            // Mark bet as WON (or REFUNDED)
                            await rawFetch(`bets?id=eq.${bet.id}`, { method: 'PATCH', body: { status: 'WON' } });

                            // Log Transaction (Audit)
                            await rawFetch('transactions', {
                                method: 'POST',
                                body: {
                                    user_id: bet.user_id,
                                    amount_change: payoutAmount.toFixed(2),
                                    type: 'BET_PAYOUT',
                                    description: winnerSide === 'DRAW' ? `Reembolso Tablas Pelea #${event.post_number}` : `Premio Pelea #${event.post_number} (Gallo ${winnerSide === 'A' ? 'AZUL' : 'BLANCO'})`
                                }
                            });
                        } else {
                            // Mark bet as LOST
                            await rawFetch(`bets?id=eq.${bet.id}`, { method: 'PATCH', body: { status: 'LOST' } });
                        }
                    }

                    // PROCESS BULK USER BALANCES
                    for (const userId of Object.keys(payoutsByUser)) {
                        const totalPayout = payoutsByUser[userId].totalPayout;
                        const userArr = await rawFetch(`users?select=balance&id=eq.${userId}`);
                        
                        if (userArr && userArr[0]) {
                            const newBalance = (parseFloat(userArr[0].balance) + totalPayout).toFixed(2);
                            await rawFetch(`users?id=eq.${userId}`, { method: 'PATCH', body: { balance: newBalance } });
                        }
                    }
                }

                message.success(winnerSide === 'DRAW' ? 'PELEA DECLARADA COMO TABLAS' : `LIQUIDACIÓN COMPLETADA: GALLO ${winnerSide === 'A' ? 'AZUL' : 'BLANCO'}`);
                fetchData();
            } catch (e) { 
                message.error('Fallo en el motor de pagos: ' + e.message); 
            } finally {
                setLoading(false);
            }
        }
    });
  };

  const eventColumns = [
    { title: 'PELEA #', dataIndex: 'post_number', key: 'post', render: (t) => <Text style={{ color: 'var(--champagne)', fontWeight: 900 }}>{t}</Text> },
    { title: 'GALLOS', key: 'ga', render: (_, r) => <div style={{ color: '#fff' }}>{r.gallo_a_name.replace('[ARCHIVED] ', '')} vs {r.gallo_b_name}</div> },
    { title: 'GANADOR', key: 'winner', render: (_, r) => {
        if (r.status !== 'FINISHED' && r.status !== 'CLOSED') return <Text style={{ color: 'rgba(255,255,255,0.1)' }}>-</Text>;
        if (r.winner_side === 'D') return <Tag color="orange" style={{ fontWeight: 800 }}>TABLAS</Tag>;
        return <Tag color={r.winner_side === 'A' ? 'blue' : 'default'} style={{ fontWeight: 800 }}>{r.winner_side === 'A' ? 'AZUL' : 'BLANCO'}</Tag>;
    }},
    { title: 'ESTADO', dataIndex: 'status', key: 'status', render: (s, r) => {
      if (s === 'LIVE') return <Tag color="green">VIVO</Tag>;
      if (s === 'FINISHED') {
         const hasReplay = r.stream_url && (r.stream_url.includes('/storage/') || r.stream_url.match(/\.(mp4|webm|mov|ogg)$/i));
         return (
           <Space>
             <Tag color="cyan">TERMINADA</Tag>
             {!hasReplay && <Badge count="SIN VIDEO" style={{ backgroundColor: '#ff4d4f', fontSize: 9, fontWeight: 900, borderRadius: 4, height: 16, lineHeight: '16px', boxShadow: '0 0 8px rgba(255,77,79,0.5)' }} className="pulse-warning" />}
           </Space>
         );
      }
      return <Tag>{s}</Tag>;
    }},
    { title: 'ACCIONES', key: 'actions', render: (_, r) => (
      <Space>
        {r.status === 'LIVE' && <Button size="small" onClick={() => updateStatus(r.id, 'CLOSED')}>CERRAR</Button>}
        {r.status === 'CLOSED' && (
          <Space>
            <Button size="small" type="primary" style={{ background: '#10b981' }} onClick={() => setWinnerAndPayout(r, 'A')}>PAGAR AZUL</Button>
            <Button size="small" type="primary" style={{ background: '#d4af37' }} onClick={() => setWinnerAndPayout(r, 'B')}>PAGAR BLANCO</Button>
            <Button size="small" type="default" onClick={() => setWinnerAndPayout(r, 'D')}>TABLAS</Button>
          </Space>
        )}
        {r.status === 'FINISHED' && (
          <Badge dot={!(r.stream_url && (r.stream_url.includes('/storage/') || r.stream_url.match(/\.(mp4|webm|mov|ogg)$/i)))} color="#ff4d4f" offset={[-2, 2]}>
            <Button 
                size="small" 
                icon={<VideoCameraOutlined />} 
                onClick={() => openReplayEditor(r)}
                style={{ color: '#d4af37', borderColor: '#d4af37' }}
            >
                REPETICIÓN
            </Button>
          </Badge>
        )}
        <div onClick={e => e.stopPropagation()}>
          <Popconfirm
            title="¿ELIMINAR PELEA?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleDeleteEvent(r)}
            okText="SÍ, ELIMINAR"
            cancelText="NO"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </Space>
    )}
  ];

  const depositColumns = [
      { title: 'USUARIO', dataIndex: ['users', 'email'], key: 'email' },
      { title: 'MONTO', dataIndex: 'amount', key: 'amount', render: (a) => <Text style={{ color: '#22c55e' }}>${a}</Text> },
      { title: 'RECIBO', dataIndex: 'proof_url', key: 'proof', render: (url) => url && <Image src={url} width={30} /> },
      { title: 'GESTIÓN', key: 'ops', render: (_, r) => r.status === 'PENDING' && (
          <Button type="primary" size="small" onClick={() => handleApproveDeposit(r)}>APROBAR</Button>
      )}
  ];

  const tabItems = [
    { key: '1', label: <span>PELEAS</span>, children: (
        <div className="responsive-table-container">
            <Table 
                columns={eventColumns} 
                dataSource={events} 
                pagination={false} 
                rowKey="id" 
                scroll={{ x: 800 }}
                onRow={(record) => ({
                    onClick: () => {
                        if (record.status === 'FINISHED') openReplayEditor(record);
                    }
                })}
                rowClassName={(record) => record.status === 'FINISHED' ? 'clickable-row' : ''}
            />
        </div>
    )},
    { key: '2', label: <span>TESORERÍA</span>, children: (
        <div className="responsive-table-container">
            <Table columns={depositColumns} dataSource={deposits} pagination={false} rowKey="id" scroll={{ x: 600 }} />
        </div>
    )}
  ];

  return (
    <>

    <div style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh' }}>
      
      {/* 🚀 PREMIUM ACTION PANEL: JORNADA DE HOY */}
      <div style={{ 
          background: 'linear-gradient(135deg, rgba(30,30,30,0.5) 0%, rgba(10,10,10,0.8) 100%)', 
          padding: 'clamp(20px, 4vw, 36px)', 
          borderRadius: 24, 
          marginBottom: 44, 
          border: '1px solid rgba(212,175,55,0.15)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.7)',
          position: 'relative',
          overflow: 'hidden',
          backdropFilter: 'blur(20px)'
      }}>
         {/* Subliminal Decor */}
         <ThunderboltFilled style={{ position: 'absolute', right: -30, top: -30, fontSize: 180, color: '#d4af37', opacity: 0.03, transform: 'rotate(15deg)' }} />

         <Row gutter={[32, 24]} align="middle">
            <Col xs={24} lg={10}>
               <Space direction="vertical" size={4}>
                  <Title level={3} style={{ color: '#fff', margin: 0, letterSpacing: '1px', fontWeight: 800 }}>JORNADA ESTRATÉGICA</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Control maestro de señal y despliegue táctico</Text>
               </Space>
            </Col>

            <Col xs={24} lg={14}>
               <div style={{ background: 'rgba(0,0,0,0.3)', padding: 'clamp(16px, 3vw, 28px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)' }}>
                  <Row gutter={[24, 24]} align="bottom">
                     <Col xs={24} md={12}>
                        <Text style={{ color: 'var(--gold)', fontSize: 10, fontWeight: 900, letterSpacing: '3px', display: 'block', marginBottom: 10, textTransform: 'uppercase' }}>SEÑAL GLOBAL MASTER</Text>
                        <Input 
                           placeholder="DACAST / HLS / M3U8" 
                           value={globalStream} 
                           onChange={e => setGlobalStream(e.target.value)}
                           style={{ 
                              background: '#050505', 
                              border: '1px solid rgba(212,175,55,0.2)', 
                              color: '#fff',
                              height: 48,
                              borderRadius: 12,
                              fontSize: 14,
                              fontWeight: 600,
                              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                           }}
                           suffix={
                              <Button 
                                 type="text" 
                                 size="small" 
                                 icon={<CheckCircleFilled style={{ color: isSavingStream ? '#fff' : 'var(--gold)', fontSize: 20 }} />} 
                                 onClick={handleSaveGlobalStream}
                                 loading={isSavingStream}
                                 style={{ background: isSavingStream ? 'transparent' : 'rgba(212,175,55,0.1)', width: 36, height: 36, borderRadius: 10, marginLeft: 8 }}
                              />
                           }
                        />
                     </Col>

                     <Col xs={12} md={6}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900, letterSpacing: '1px', display: 'block', marginBottom: 10, textTransform: 'uppercase' }}>SISTEMA LIVE</Text>
                        <Select 
                           value={streamMode} 
                           onChange={handleToggleStreamMode}
                           loading={isSavingMode}
                           size="large"
                           style={{ width: '100%' }}
                           options={[
                              { value: 'LIVE', label: <span style={{ color: '#10b981', fontWeight: 900, fontSize: 12 }}>🔵 TRANSMISIÓN</span> },
                              { value: 'STANDBY', label: <span style={{ color: 'var(--gold)', fontWeight: 900, fontSize: 12 }}>🟠 STANDBY</span> }
                           ]}
                        />
                     </Col>

                     <Col xs={12} md={6}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900, letterSpacing: '1px', display: 'block', marginBottom: 10, textTransform: 'uppercase' }}>CARTELERA</Text>
                        <Select 
                           value={showCartelera} 
                           onChange={handleToggleCartelera}
                           size="large"
                           style={{ width: '100%' }}
                           options={[
                              { value: true, label: <span style={{ fontWeight: 900, fontSize: 12 }}>VISIBLE</span> },
                              { value: false, label: <span style={{ fontWeight: 900, fontSize: 12, opacity: 0.5 }}>OCULTA</span> }
                           ]}
                        />
                     </Col>
                  </Row>
               </div>
            </Col>
         </Row>

         <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />

         {/* Maintenance Actions Grouped at the Bottom */}
         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>

            <Popconfirm
               title="¿VACIAR TODO EL CHAT?"
               description="Limpiar historial de mensajes global."
               onConfirm={handleClearChat}
               okText="Sí, vaciar"
               cancelText="No"
               okButtonProps={{ danger: true }}
            >
               <Button 
                  danger 
                  type="text"
                  icon={<DeleteOutlined />} 
                  style={{ 
                     background: 'rgba(255,77,79,0.05)', 
                     height: 38,
                     borderRadius: 10,
                     fontSize: 11,
                     fontWeight: 700,
                     textTransform: 'uppercase'
                  }}
               >
                  Limpiar Chat
               </Button>
            </Popconfirm>
         </div>

         <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />

         <Row gutter={[24, 24]} align="middle">
             <Col xs={24} md={18}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Text style={{ color: '#10b981', fontSize: 10, fontWeight: 900, letterSpacing: '2px' }}>CONFIGURACIÓN IA (GROQ API KEY)</Text>
                    <Input.Password 
                        placeholder="gsk_..." 
                        value={groqKey} 
                        onChange={e => setGroqKey(e.target.value)}
                        style={{ background: '#000', border: '1px solid rgba(16,185,129,0.2)', color: '#fff', borderRadius: 8, height: 40 }}
                    />
                </Space>
             </Col>
             <Col xs={24} md={6}>
                 <Button 
                    type="primary" 
                    block 
                    onClick={handleSaveGroqKey} 
                    loading={isSavingGroq}
                    style={{ background: '#10b981', borderRadius: 8, height: 40, fontWeight: 700, marginTop: 15 }}
                >
                    GUARDAR LLAVE
                </Button>
             </Col>
          </Row>
      </div>


      <div style={{ textAlign: 'center', margin: '48px 0 36px' }}>
         <div style={{ display: 'inline-flex', alignItems: 'center', gap: 20, marginBottom: 12 }}>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, var(--gold))' }} />
            <Title level={2} style={{ color: '#fff', margin: 0, letterSpacing: '6px', fontSize: 28, fontWeight: 900, fontFamily: 'Outfit' }}>ESTRATEGIA CENTRAL</Title>
            <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
         </div>
         <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 900, letterSpacing: '4px', display: 'block', textTransform: 'uppercase' }}>GESTIÓN OPERATIVA DE ALTO NIVEL</Text>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={tabItems} 
        tabBarStyle={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}
        tabBarExtraContent={activeTab === '1' && (
        <Space size={12}>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            icon={<PlusOutlined />}
            style={{ 
                height: 40, 
                borderRadius: 10, 
                fontWeight: 700, 
                background: '#10b981', 
                color: '#fff', 
                border: 'none',
                boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
            }}
          >
            NUEVA PELEA
          </Button>

          <Button 
            onClick={() => setIsBulkModalOpen(true)} 
            icon={<TrophyOutlined />}
            style={{ 
                height: 40, 
                borderRadius: 10, 
                fontWeight: 700, 
                background: 'rgba(16,185,129,0.1)', 
                color: '#10b981', 
                border: '1px solid rgba(16,185,129,0.2)'
            }}
          >
            CARGA MASIVA
          </Button>

          <Button 
            onClick={() => {
                setEditingEvent(null);
                setIsReplayModalOpen(true);
                form.resetFields();
            }} 
            icon={<VideoCameraOutlined />} 
            style={{ 
                height: 40, 
                borderRadius: 10, 
                fontWeight: 700, 
                background: 'rgba(212,175,55,0.1)', 
                color: '#d4af37', 
                border: '1px solid rgba(212,175,55,0.2)'
            }}
          >
            CARGAR REPETICIÓN
          </Button>
        </Space>
      )} />

      <Modal open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} centered width={600}>
        <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 12 }}>
          <Title level={3} style={{ color: '#fff', textAlign: 'center', fontFamily: 'Outfit' }}>Nueva Pelea en Vivo</Title>
          <Form form={form} layout="vertical" onFinish={handleCreateEvent} initialValues={{ gallo_a_odds: 1.9, gallo_b_odds: 1.9 }}>
            <Form.Item name="post_number" label={<Text style={{ color: '#fff' }}>PELEA #</Text>} rules={[{required: true}]}><Input /></Form.Item>
            <Row gutter={16}>
                <Col span={12}><Form.Item name="gallo_a_name" label={<Text style={{ color: '#fff' }}>GALLO AZUL</Text>} rules={[{required: true}]}><Input /></Form.Item></Col>
                <Col span={12}><Form.Item name="gallo_b_name" label={<Text style={{ color: '#fff' }}>GALLO BLANCO</Text>} rules={[{required: true}]}><Input /></Form.Item></Col>
            </Row>
            <Button type="primary" block onClick={() => form.submit()} loading={loading}>INICIAR COMBATE</Button>
          </Form>
        </div>
      </Modal>

      <Modal 
        open={isReplayModalOpen} 
        onCancel={() => {
            setIsReplayModalOpen(false);
            setEditingEvent(null);
        }} 
        footer={null} 
        centered 
        width={500}
      >
        <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 12, border: '1px solid rgba(212,175,55,0.2)' }}>
          <Title level={3} style={{ color: '#d4af37', textAlign: 'center', fontFamily: 'Outfit', marginBottom: 24 }}>
            {editingEvent ? 'Actualizar Repetición' : 'Registrar Repetición'}
          </Title>

          {!editingEvent && (
             <div style={{ marginBottom: 30, textAlign: 'center' }}>
                <input 
                    type="file" 
                    id="scoreboard-scanner" 
                    hidden 
                    accept="image/*" 
                    onChange={handleScanImage} 
                />
                <Button 
                    icon={<ThunderboltFilled />} 
                    loading={isScanning}
                    onClick={() => document.getElementById('scoreboard-scanner').click()}
                    style={{ 
                        height: 54, 
                        width: '100%',
                        background: 'rgba(16,185,129,0.1)', 
                        color: '#10b981', 
                        borderColor: '#10b981', 
                        borderRadius: 12,
                        fontWeight: 900,
                        fontSize: 13,
                        letterSpacing: '1px',
                        boxShadow: '0 0 15px rgba(16,185,129,0.1)'
                    }}
                >
                    {isScanning ? 'PROCESANDO CON IA...' : '⚡ ESCANEAR DESDE CAPTURA (IA)'}
                </Button>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, display: 'block', marginTop: 10 }}>Sube una foto del marcador para auto-rellenar los nombres</Text>
             </div>
          )}

          <Form 
            form={form} 
            layout="vertical" 
            onFinish={editingEvent ? handleUpdateReplay : handleCreateReplay}
          >
            <Form.Item name="stream_url" label={<Text style={{ color: '#fff' }}>ENLACE DE VIDEO (YouTube / Dacast / Externo)</Text>} rules={[{required: true, message: 'Ingresa el link del video'}]}>
                <Input placeholder="https://www.youtube.com/watch?v=..." style={{ background: '#000', border: '1px solid var(--gold)', color: '#fff', height: 45, borderRadius: 8 }} />
            </Form.Item>
            
            <Form.Item name="post_number" label={<Text style={{ color: '#fff' }}>Nº DE PELEA</Text>} rules={[{required: true}]}><Input disabled={!!editingEvent} /></Form.Item>
            <Row gutter={16}>
                <Col span={12}><Form.Item name="gallo_a_name" label={<Text style={{ color: '#fff' }}>GALLO AZUL</Text>} rules={[{required: true}]}><Input disabled={!!editingEvent} /></Form.Item></Col>
                <Col span={12}><Form.Item name="gallo_b_name" label={<Text style={{ color: '#fff' }}>GALLO BLANCO</Text>} rules={[{required: true}]}><Input disabled={!!editingEvent} /></Form.Item></Col>
            </Row>
            
            {!editingEvent && (
                <Form.Item name="winner_side" label={<Text style={{ color: '#fff' }}>GANADOR</Text>} rules={[{required: true}]}>
                    <Select placeholder="Seleccionar Ganador" style={{ width: '100%' }}>
                        <Select.Option value="A">GALLO AZUL</Select.Option>
                        <Select.Option value="B">GALLO BLANCO</Select.Option>
                        <Select.Option value="D">TABLAS</Select.Option>
                    </Select>
                </Form.Item>
            )}

            <Button type="primary" block onClick={() => form.submit()} loading={loading} style={{ background: '#d4af37', border: 'none', height: 50, fontWeight: 700, borderRadius: 10, marginTop: 10 }}>
                {editingEvent ? 'ACTUALIZAR REPETICIÓN' : 'GUARDAR REPETICIÓN'}
            </Button>
          </Form>
        </div>
      </Modal>


      <Modal open={isBulkModalOpen} onCancel={() => setIsBulkModalOpen(false)} footer={null} centered width={700}>
        <div style={{ background: 'var(--charcoal)', padding: 30, borderRadius: 12, border: '1px solid #10b981' }}>
          <Title level={3} style={{ color: '#fff', textAlign: 'center', fontFamily: 'Outfit' }}>Programa de Jornada (Carga en Bloque)</Title>
          <Text style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 20, textAlign: 'center' }}>
            Pega tu programa aquí. Formato: <span style={{ color: '#10b981' }}>Pelea, Gallo A, Gallo B</span> (una por línea)
          </Text>
          <Form form={form} layout="vertical" onFinish={handleBulkCreate}>
            <Form.Item name="bulkText" rules={[{required: true, message: 'Ingresa al menos una pelea'}]}>
                <Input.TextArea 
                    placeholder="Ejemplo:&#10;1, El Rayo, Malandro&#10;2, Centella, Capìtan&#10;3, Espartaco, Gladiador" 
                    rows={10} 
                    style={{ background: '#000', border: '1px solid var(--glass-border)', color: '#fff', fontFamily: 'monospace', fontSize: 13 }}
                />
            </Form.Item>
            <div style={{ padding: '10px 0', textAlign: 'center', marginBottom: 20 }}>
                <Badge status="processing" color="#10b981" text={<Text style={{ color: 'var(--text-muted)' }}>Todas heredarán el Stream Global: {globalStream || 'SIN CONFIGURAR'}</Text>} />
            </div>
            <Button type="primary" block onClick={() => form.submit()} loading={loading} style={{ height: 45, fontWeight: 700 }}>GENERAR PROGRAMA COMPLETO</Button>
          </Form>
        </div>
      </Modal>
    </div>
      <style>{`
        .clickable-row { cursor: pointer; }
        .clickable-row:hover { background: rgba(212,175,55,0.03) !important; }
        .pulse-warning { animation: pulseAnim 2s infinite; }
        @keyframes pulseAnim {
           0% { opacity: 1; transform: scale(1); }
           50% { opacity: 0.7; transform: scale(0.95); }
           100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
};

export default AdminDashboard;
