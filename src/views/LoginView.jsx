import React, { useState } from 'react';
import { Card, Input, Button, Typography, Space, App as AntApp, Divider, Badge, Row, Col } from 'antd';
import { UserOutlined, LockOutlined, RocketFilled, ChromeFilled, ExperimentOutlined, ThunderboltFilled, SafetyCertificateFilled, ArrowRightOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;

const LoginView = ({ onLogin }) => {
  const { message } = AntApp.useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      return message.warning('Por favor completa todos los campos');
    }
    setLoading(true);
    const loginTimeout = setTimeout(() => {
        setLoading(false);
        message.error('LATENCIA ALTA: El servidor no responde. Reintenta en unos segundos.');
    }, 12000);

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: email.includes('admin') ? 'admin' : 'user' }
          }
        });
        clearTimeout(loginTimeout);
        if (error) throw error;
        if (data.session) {
           const role = data.user.user_metadata?.role || 'user';
           onLogin({ email: data.user.email, role: role, id: data.user.id });
           message.success('Acceso inmediato habilitado');
        } else {
           message.success('Registro exitoso. Inicie sesión para continuar.');
           setIsRegistering(false);
        }
      } else {
        // Limpiar sesión previa para evitar conflictos
        await supabase.auth.signOut().catch(() => {});
        
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        clearTimeout(loginTimeout);
        
        if (error) throw error;
        const user = data.user;
        const role = user.user_metadata?.role || 'user';
        onLogin({ email: user.email, role: role, id: user.id });
        message.success(`Bienvenido, ${user.email}`);
      }
    } catch (error) {
      clearTimeout(loginTimeout);
      message.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh', 
      background: '#040806', // Flat ultra-dark crisp background
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      <style>{`
        .login-wrapper {
           display: flex;
           flex-direction: column;
           width: 100%;
           max-width: 420px;
           position: relative;
           align-items: center;
        }
        .login-branding-panel { display: none !important; }
        .form-mobile-header { display: flex !important; margin-bottom: clamp(16px, 3dvh, 32px); flex-direction: column; align-items: center; }
        
        .premium-input .ant-input-affix-wrapper {
           background: rgba(255,255,255,0.04) !important;
           border: 1px solid rgba(255,255,255,0.08) !important;
           border-radius: 16px !important;
           padding: 6px 14px;
           transition: all 0.25s ease;
           box-shadow: none !important;
        }
        .premium-input .ant-input-affix-wrapper:hover {
           border-color: rgba(0, 229, 163, 0.4) !important;
        }
        .premium-input .ant-input-affix-wrapper:focus-within {
           background: rgba(0, 229, 163, 0.04) !important;
           border-color: #00E5A3 !important;
           box-shadow: 0 0 0 3px rgba(0, 229, 163, 0.15) !important;
        }
        .premium-input input { 
           background: transparent !important; 
           color: #fff !important; 
           font-family: 'Outfit', sans-serif;
           font-size: 14px !important;
        }
        .premium-input input::placeholder { color: rgba(255,255,255,0.4) !important; font-weight: 400; }

        .magic-btn {
           background: linear-gradient(135deg, #00E5A3 0%, #00B884 100%) !important;
           border: none !important;
           color: #0b1117 !important;
           font-weight: 800 !important;
           border-radius: 9999px !important;
           box-shadow: 0 10px 24px -4px rgba(0, 229, 163, 0.4) !important;
           transition: all 0.25s ease !important;
        }
        .magic-btn:hover {
           transform: translateY(-2px) !important;
           box-shadow: 0 14px 28px -4px rgba(0, 229, 163, 0.5) !important;
           opacity: 0.95 !important;
        }

        @media (min-width: 768px) {
           .login-wrapper {
              flex-direction: row;
              max-width: 780px;
              align-items: center; 
              justify-content: center;
           }
           .login-branding-panel { 
              display: flex !important; 
              flex: 0 0 clamp(280px, 32vw, 340px); 
              height: 500px;
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              padding: 32px; 
              z-index: 10;
              background: #181d27;
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 28px;
              box-shadow: 0 24px 48px rgba(0,0,0,0.5);
              position: relative;
              overflow: hidden;
           }
           .login-form-card { 
                flex: 1; 
                height: 440px; 
                border-radius: 28px !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                background: #12161f !important;
                backdrop-filter: blur(20px) !important;
                z-index: 5 !important;
                padding-left: 20px; 
                margin-left: -16px; 
           }
           .form-mobile-header { display: none !important; }
        }
      `}</style>

      {/* Dynamic Background Mesh */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'transparent', zIndex: 0 }} />
      
      {/* OVERARCHING WRAPPER */}
      <div className="login-wrapper">

      {/* LEFT BRANDING PANEL */}
      <div className="login-branding-panel">
         <img src="/official_logo.png" style={{ 
            height: 'clamp(250px, 40vh, 500px)', 
            position: 'absolute',
            opacity: 0.05,
            right: '-15%',
            bottom: '-10%',
            transform: 'rotate(-15deg)',
            filter: 'blur(3px)',
            clipPath: 'circle(46%)',
            pointerEvents: 'none'
         }} alt="" aria-hidden="true" />
         
         <img src="/official_logo.png" style={{ 
            height: 180,
            marginBottom: 32,
            zIndex: 2,
            opacity: 1,
            clipPath: 'circle(46%)'
         }} alt="Main Logo" />
         
         <div style={{ textAlign: 'center', zIndex: 2 }}>
             <Title level={4} style={{ 
                color: 'rgba(255,255,255,0.7)', 
                margin: 0, 
                fontFamily: 'Outfit', 
                fontWeight: 400, 
                letterSpacing: '4px', 
                fontSize: 12
             }}>
                COLISEO
             </Title>
             <Title level={2} style={{ 
                margin: '2px 0 0 0', 
                fontFamily: 'Outfit', 
                fontWeight: 800,
                textTransform: 'uppercase', 
                color: '#00E5A3', 
                letterSpacing: '1px', 
                fontSize: 22
             }}>
                ANGEL CRUZ
             </Title>
             <div style={{ width: 32, height: 3, background: '#00E5A3', margin: '14px auto', borderRadius: 9999 }} />
             <Text style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: 11, 
                fontWeight: 700, 
                letterSpacing: '4px', 
                textTransform: 'uppercase'
             }}>
                Élite y Combate Táctico
             </Text>
         </div>
      </div>

      <Card 
        className="glass-panel login-form-card" 
        style={{ 
            width: '100%', 
            borderRadius: '28px', 
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)', 
            border: '1px solid rgba(0, 229, 163, 0.15)',
            background: '#181d27', 
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden'
        }}
        styles={{ body: { padding: 'clamp(24px, 5vh, 40px) 32px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' } }}
      >
        <div className="form-mobile-header" style={{ textAlign: 'center' }}>
          <img src="/official_logo.png" style={{ 
            height: 72, 
            marginBottom: 16,
            clipPath: 'circle(46%)'
          }} alt="Login Logo" />
          <Title level={5} style={{ 
            color: 'var(--brand-green)', 
            fontSize: 10, 
            letterSpacing: '3px', 
            textTransform: 'uppercase',
            fontWeight: 800,
            margin: 0,
          }}>
             COLISEO ANGEL CRUZ
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '2px', display: 'block', marginTop: 4 }}>
             Acceso de Nivel Platinum
          </Text>
        </div>

        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 8 }}>
          <div className="premium-input">
            <Input 
              prefix={<UserOutlined style={{ color: '#00E5A3', opacity: 0.9, marginRight: 8 }} />} 
              placeholder="ID de Usuario / Email" 
              size="middle"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ height: '46px' }}
            />
          </div>

          <div className="premium-input">
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#00E5A3', opacity: 0.9, marginRight: 8 }} />} 
              placeholder="Código Secreto" 
              size="middle"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ height: '46px' }}
            />
          </div>

          <Button 
            className="magic-btn"
            type="primary" 
            block 
            size="middle" 
            onClick={handleAuth}
            loading={loading}
            style={{ 
                height: '48px', 
                fontSize: '14px', 
                fontWeight: '800',
                letterSpacing: '0.5px',
                marginTop: '12px',
                borderRadius: '9999px'
            }}
          >
            {isRegistering ? 'Crear cuenta' : 'Entrar al sistema'}
          </Button>

          <Button 
            type="text" 
            block 
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '500', marginTop: '-4px' }}
          >
            {isRegistering ? '¿Ya tienes acceso? Entrar' : '¿Requisito de sistema? Registrar'}
          </Button>
        </Space>

        <Divider style={{ borderColor: 'rgba(16,185,129,0.06)', margin: 'clamp(16px, 3dvh, 24px) 0' }} />
        
        <div style={{ textAlign: 'center', opacity: 0.4 }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700 }}>
              <SafetyCertificateFilled style={{ color: '#22c55e', fontSize: 10 }} />
              SISTEMA DE SEGURIDAD FINTECH SSL
           </div>
           <div style={{ margin: '12px 0 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: '1px' }}>
              &copy; 2026 COLISEO ANGEL CRUZ. TODOS LOS DERECHOS RESERVADOS.
           </div>
        </div>
      </Card>
      
      {/* Close Wrapper */}
      </div>

    </div>
  );
};

export default LoginView;
