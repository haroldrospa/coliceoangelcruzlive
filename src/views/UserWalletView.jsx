import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Space, Button, Modal, Form, InputNumber, Input, Select, Tag, Row, Col, App as AntApp } from 'antd';
import { WalletOutlined, PlusOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, TransactionOutlined, SearchOutlined, InfoCircleOutlined, HistoryOutlined, TrophyOutlined } from '@ant-design/icons';
import { supabase, rawFetch } from '../lib/supabase';

const { Title, Text } = Typography;
const { Option } = Select;

const UserWalletView = ({ balance, setBalance, currentUser }) => {
  const { message } = AntApp.useApp();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form] = Form.useForm();

  const fetchWalletData = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch user balance from profile/users table
      const profile = await rawFetch(`users?select=balance&id=eq.${currentUser.id}`);
      if (profile && profile[0]) {
        setBalance(parseFloat(profile[0].balance));
      }

      // 2. Fetch transaction history
      const txData = await rawFetch(`transactions?select=*&user_id=eq.${currentUser.id}&order=created_at.desc&limit=50`);
      if (txData) setTransactions(txData);

      // 3. Fetch deposit request history
      const depData = await rawFetch(`deposits?select=*&user_id=eq.${currentUser.id}&order=created_at.desc&limit=50`);
      if (depData) setDeposits(depData);

    } catch (err) {
      console.error('Wallet Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchWalletData();

    // Listen to real-time updates for user balance, transactions and deposits
    const channel = supabase.channel('wallet-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${currentUser?.id}` }, fetchWalletData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${currentUser?.id}` }, fetchWalletData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${currentUser?.id}` }, fetchWalletData)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser]);

  const handleDepositSubmit = async (values) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const payload = {
        user_id: currentUser.id,
        amount: parseFloat(values.amount),
        status: 'PENDING',
        proof_url: values.reference || ''
      };

      await rawFetch('deposits', {
        method: 'POST',
        body: payload
      });

      message.success('Solicitud de recarga enviada con éxito. Pendiente de aprobación.');
      setIsDepositModalOpen(false);
      form.resetFields();
      fetchWalletData();
    } catch (e) {
      message.error('Error al registrar recarga: ' + e.message);
    } finally {
      setLoading(false);
    }
  };


  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery) return true;
    const desc = (tx.description || '').toLowerCase();
    const type = (tx.type || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return desc.includes(q) || type.includes(q);
  });

  const handleWithdrawClick = () => {
    Modal.info({
      title: 'SOLICITUD DE RETIRO',
      content: (
        <div style={{ padding: '8px 0' }}>
          <Text style={{ color: 'var(--text-main)', fontSize: 13, display: 'block', marginBottom: 8 }}>
            Por motivos de seguridad, los retiros se procesan de manera presencial o contactando directamente a un administrador autorizado.
          </Text>
          <Text style={{ color: '#10b981', fontWeight: 700, fontSize: 11, display: 'block' }}>
            Contáctenos para coordinar tu retiro táctico.
          </Text>
        </div>
      ),
      okText: 'ENTENDIDO',
      centered: true,
      styles: {
        body: { background: 'var(--charcoal)' }
      }
    });
  };

  const scrollToTransactions = () => {
    const el = document.getElementById('movimientos-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ padding: '24px clamp(16px, 4vw, 40px)', maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: 'var(--obsidian)' }}>
      {/* HEADER ZONE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <Title level={4} style={{ color: 'var(--text-main)', margin: 0, fontWeight: 900, letterSpacing: '1px', fontFamily: 'Outfit' }}>BILLETERA</Title>
          <Text style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase' }}>Crédito y Transacciones</Text>
        </div>
      </div>

      {/* PREMIUM CARD DE BALANCE */}
      <div style={{ 
        background: '#121214',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        borderRadius: 28,
        padding: '32px 24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Decorative Rings */}
        <div style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 140,
          height: 140,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.02)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.015)',
          pointerEvents: 'none'
        }} />

        {/* Balance Content */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            SALDO DISPONIBLE
          </Text>
          <Title level={1} style={{ color: '#ffffff', margin: '8px 0 0 0', fontSize: 'clamp(36px, 7vw, 44px)', fontWeight: 800, fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
            ${balance.toFixed(2)}
          </Title>
        </div>

        {/* Horizontal Action Panel */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 20,
          padding: '12px 8px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          border: '1px solid rgba(255,255,255,0.03)'
        }}>
          {/* Action 1: Deposit */}
          <div 
            onClick={() => setIsDepositModalOpen(true)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}
          >
            <div className="wallet-action-icon-circle">
              <PlusOutlined style={{ fontSize: 18 }} />
            </div>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 10, fontWeight: 700, marginTop: 6 }}>Recargar</Text>
          </div>

          {/* Action 2: Withdraw */}
          <div 
            onClick={handleWithdrawClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}
          >
            <div className="wallet-action-icon-circle">
              <ArrowUpOutlined style={{ fontSize: 18 }} />
            </div>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 10, fontWeight: 700, marginTop: 6 }}>Retirar</Text>
          </div>

          {/* Action 3: Movements (Lime Green Highlighted) */}
          <div 
            onClick={scrollToTransactions}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', flex: 1 }}
          >
            <div className="wallet-action-icon-circle active">
              <TransactionOutlined style={{ fontSize: 18, color: '#000000' }} />
            </div>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 10, fontWeight: 700, marginTop: 6 }}>Movimientos</Text>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: 28 }}>
        <Input
          placeholder="Buscar movimientos..."
          prefix={<SearchOutlined style={{ color: 'rgba(255, 255, 255, 0.3)', marginRight: 6 }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="wallet-search-input"
          style={{
            height: 48,
            background: '#121214',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 100,
            color: '#ffffff',
            paddingLeft: 18
          }}
        />
      </div>

      {/* TRANSACTIONS SECTION */}
      <div id="movimientos-section" style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 60 }}>
        {/* Historial de Movimientos */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <HistoryOutlined style={{ color: '#10b981', fontSize: 16 }} />
            <Title level={5} style={{ color: 'var(--text-main)', margin: 0, fontSize: 12, letterSpacing: '1px', fontWeight: 800, textTransform: 'uppercase' }}>Historial de Movimientos</Title>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map(tx => {
                const num = parseFloat(tx.amount_change);
                const isPositive = num > 0;
                
                // Dynamic icons and colors based on transaction type
                let iconComponent = <WalletOutlined style={{ fontSize: 16 }} />;
                let iconBg = 'rgba(244, 63, 94, 0.08)';
                let iconColor = '#f43f5e';
                let txTitle = tx.type;

                if (tx.type === 'BET_PAYOUT') {
                  iconComponent = <TrophyOutlined style={{ fontSize: 16 }} />;
                  iconBg = 'rgba(16, 185, 129, 0.08)';
                  iconColor = '#10b981';
                  txTitle = 'Premio Ganado';
                } else if (tx.type === 'BET_PLACED') {
                  iconComponent = <ArrowDownOutlined style={{ fontSize: 16 }} />;
                  iconBg = 'rgba(244, 63, 94, 0.08)';
                  iconColor = '#f43f5e';
                  txTitle = 'Jugada Realizada';
                } else if (tx.type === 'DEPOSIT') {
                  iconComponent = <PlusOutlined style={{ fontSize: 16 }} />;
                  iconBg = 'rgba(6, 182, 212, 0.08)';
                  iconColor = '#06b6d4';
                  txTitle = 'Recarga Acreditada';
                } else if (tx.type === 'REFUND') {
                  iconComponent = <ArrowUpOutlined style={{ fontSize: 16 }} />;
                  iconBg = 'rgba(59, 130, 246, 0.08)';
                  iconColor = '#3b82f6';
                  txTitle = 'Reembolso';
                }

                // Format Date nicely: DD/MM/YY, HH:MM
                const formattedDate = new Date(tx.created_at).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });

                return (
                  <div key={tx.id} className="transaction-premium-item">
                    {/* Left: Icon & Text Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        background: iconBg, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {React.cloneElement(iconComponent, { style: { color: iconColor, fontSize: 16 } })}
                      </div>
                      
                      <div style={{ minWidth: 0 }}>
                        <Text style={{ color: '#ffffff', fontWeight: 700, fontSize: 13, display: 'block' }}>{txTitle}</Text>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.description}
                        </Text>
                      </div>
                    </div>

                    {/* Right: Amount & Date */}
                    <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                      <Text style={{ 
                        color: isPositive ? '#10b981' : '#f43f5e', 
                        fontWeight: 800, 
                        fontSize: 14, 
                        display: 'block',
                        fontFamily: 'Outfit'
                      }}>
                        {isPositive ? '+' : '-'}${Math.abs(num).toFixed(2)}
                      </Text>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10, display: 'block', marginTop: 2 }}>
                        {formattedDate}
                      </Text>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '36px 0', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 20, border: '1px dashed rgba(255, 255, 255, 0.05)' }}>
                <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin movimientos registrados</Text>
              </div>
            )}
          </div>
        </div>

        {/* Solicitudes de Recarga */}
        {deposits.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ClockCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
              <Title level={5} style={{ color: 'var(--text-main)', margin: 0, fontSize: 12, letterSpacing: '1px', fontWeight: 800, textTransform: 'uppercase' }}>Solicitudes de Recarga</Title>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deposits.map(dep => {
                let statusColor = 'orange';
                let statusLabel = 'PENDIENTE';
                let statusBg = 'rgba(245, 158, 11, 0.1)';

                if (dep.status === 'APPROVED' || dep.status === 'COMPLETED') {
                  statusColor = '#10b981';
                  statusLabel = 'APROBADO';
                  statusBg = 'rgba(16, 185, 129, 0.1)';
                } else if (dep.status === 'REJECTED') {
                  statusColor = '#ef4444';
                  statusLabel = 'RECHAZADO';
                  statusBg = 'rgba(239, 68, 68, 0.1)';
                }

                return (
                  <div key={dep.id} className="transaction-premium-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Round Type Icon */}
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PlusOutlined style={{ color: '#10b981', fontSize: 16 }} />
                      </div>
                      
                      {/* Method and Date */}
                      <div>
                        <Text style={{ color: '#ffffff', fontWeight: 700, fontSize: 12, display: 'block' }}>Recarga Solicitada</Text>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 10 }}>{new Date(dep.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
                      </div>
                    </div>

                    {/* Amount & Status Badge */}
                    <div style={{ textAlign: 'right' }}>
                      <Text style={{ color: '#10b981', fontWeight: 800, fontSize: 13, display: 'block' }}>
                        ${parseFloat(dep.amount).toFixed(2)}
                      </Text>
                      <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 100, background: statusBg, border: `1px solid ${statusColor}33`, marginTop: 2 }}>
                        <span style={{ color: statusColor, fontSize: 8, fontWeight: 900, letterSpacing: '0.5px' }}>{statusLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL SOLICITUD RECARGA */}
      <Modal
        title={
          <div style={{ padding: '8px 0' }}>
            <Title level={4} style={{ color: 'var(--text-main)', margin: 0, letterSpacing: '1px' }}>SOLICITAR RECARGA</Title>
            <Text style={{ color: 'var(--text-muted)', fontSize: 10 }}>REGISTRO DE TRANSFERENCIA O EFECTIVO</Text>
          </div>
        }
        open={isDepositModalOpen}
        onCancel={() => !loading && setIsDepositModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        okText="ENVIAR SOLICITUD"
        centered
        width={380}
        styles={{ 
          content: { background: 'var(--charcoal)', border: '1px solid var(--glass-border)', borderRadius: 16, overflow: 'hidden' },
          header: { background: 'var(--glass)', padding: '20px 24px', margin: 0, borderBottom: '1px solid var(--glass-border)' },
          body: { padding: '24px' },
          footer: { padding: '16px 24px', borderTop: '1px solid var(--glass-border)', background: 'var(--glass)' }
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleDepositSubmit}>
          <Form.Item 
            name="amount" 
            label="CANTIDAD A RECARGAR ($)"
            rules={[
              { required: true, message: 'Ingresa el monto' },
              { type: 'number', min: 1, message: 'El monto mínimo es de $1' }
            ]}
          >
            <InputNumber 
              prefix={<Text style={{ color: '#10b981', fontWeight: 800 }}>$</Text>} 
              style={{ width: '100%', height: 48, fontSize: 18, background: 'var(--obsidian)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item 
            name="reference" 
            label="REFERENCIA DE PAGO / BANCO"
            rules={[{ required: true, message: 'Ingresa la referencia o método de pago' }]}
          >
            <Input 
              placeholder="Ej: Banreservas Ref: 123456" 
              style={{ height: 44, background: 'var(--obsidian)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .wallet-action-icon-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.02);
        }
        .wallet-action-icon-circle:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
        }
        .wallet-action-icon-circle.active {
          background: #a3e635;
          color: #000000;
          box-shadow: 0 4px 14px rgba(163, 230, 53, 0.35);
          border: none;
        }
        .wallet-action-icon-circle.active:hover {
          background: #bef264;
          box-shadow: 0 6px 18px rgba(163, 230, 53, 0.5);
        }
        .wallet-search-input input {
          background: transparent !important;
          color: #ffffff !important;
        }
        .wallet-search-input:focus, .wallet-search-input-focused {
          border-color: #10b981 !important;
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.15) !important;
        }
        .transaction-premium-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .transaction-premium-item:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%);
          border-color: rgba(255, 255, 255, 0.09);
          transform: translateX(4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
        }
        .ant-form-item-label > label { color: var(--text-muted) !important; font-size: 9px !important; font-weight: 800 !important; letter-spacing: 0.5px; }
      `}</style>
    </div>
  );
};

export default UserWalletView;
