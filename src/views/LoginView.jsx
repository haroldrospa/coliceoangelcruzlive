import React, { useState } from 'react';
import { Card, Input, Button, Typography, Space, App as AntApp, Divider, Badge } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateFilled } from '@ant-design/icons';
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
      minHeight: 'calc(100vh - 74px)',
      background: 'radial-gradient(circle at 50% 30%, rgba(0, 229, 163, 0.12) 0%, rgba(18, 23, 31, 0.98) 70%, #0d1117 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '24px 16px 100px 16px'
    }}>
      <style>{`
        .login-card-container {
           width: 100%;
           max-width: 440px;
           background: rgba(24, 29, 39, 0.85) !important;
           backdrop-filter: blur(24px) !important;
           -webkit-backdrop-filter: blur(24px) !important;
           border: 1px solid rgba(255, 255, 255, 0.08) !important;
           border-radius: 32px !important;
           box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.6) !important;
           padding: 32px 28px !important;
           transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        body.light-theme .login-card-container {
           background: rgba(255, 255, 255, 0.9) !important;
           border-color: rgba(0, 0, 0, 0.08) !important;
           box-shadow: 0 24px 60px -12px rgba(18, 38, 43, 0.12) !important;
        }

        .login-input .ant-input-affix-wrapper {
           background: rgba(255, 255, 255, 0.04) !important;
           border: 1px solid rgba(255, 255, 255, 0.1) !important;
           border-radius: 9999px !important;
           padding: 8px 18px !important;
           height: 48px;
           transition: all 0.25s ease;
           box-shadow: none !important;
        }

        body.light-theme .login-input .ant-input-affix-wrapper {
           background: #ffffff !important;
           border-color: #cbd5e1 !important;
        }

        .login-input .ant-input-affix-wrapper:hover {
           border-color: rgba(0, 229, 163, 0.5) !important;
        }
        .login-input .ant-input-affix-wrapper:focus-within {
           background: rgba(0, 229, 163, 0.04) !important;
           border-color: #00E5A3 !important;
           box-shadow: 0 0 0 3px rgba(0, 229, 163, 0.2) !important;
        }
        .login-input input { 
           background: transparent !important; 
           color: var(--text-main) !important; 
           font-family: 'Outfit', sans-serif;
           font-size: 14px !important;
           font-weight: 500;
        }
        .login-input input::placeholder { color: var(--text-muted) !important; font-weight: 400; }

        .action-btn-primary {
           background: linear-gradient(135deg, #00E5A3 0%, #00B884 100%) !important;
           border: none !important;
           color: #0b1117 !important;
           font-weight: 800 !important;
           font-size: 14px !important;
           border-radius: 9999px !important;
           height: 50px !important;
           box-shadow: 0 10px 28px -4px rgba(0, 229, 163, 0.4) !important;
           transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .action-btn-primary:hover {
           transform: translateY(-2px) !important;
           box-shadow: 0 14px 32px -4px rgba(0, 229, 163, 0.5) !important;
           opacity: 0.95 !important;
        }
      `}</style>

      <div className="login-card-container">
        {/* Sleek Logo Emblem */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 229, 163, 0.25) 0%, rgba(24, 29, 39, 0.9) 100%)',
            border: '2px solid rgba(0, 229, 163, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 32px rgba(0, 229, 163, 0.3)',
            margin: '0 auto 16px auto',
            padding: 8
          }}>
            <img src="/Logominiatura.png" style={{ height: 54, width: 54, objectFit: 'contain' }} alt="Coliseo Logo" />
          </div>

          <Title level={3} style={{ 
            color: 'var(--text-main)', 
            margin: '0 0 4px 0', 
            fontSize: 20, 
            fontWeight: 900,
            letterSpacing: '1px',
            fontFamily: 'Outfit',
            textTransform: 'uppercase'
          }}>
             COLISEO ANGEL CRUZ
          </Title>

          <div style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0, 229, 163, 0.1)',
            border: '1px solid rgba(0, 229, 163, 0.25)',
            borderRadius: 9999,
            padding: '3px 12px',
            marginTop: 4
          }}>
             <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A3' }} />
             <Text style={{ color: '#00E5A3', fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                ACCESO PLATINUM
             </Text>
          </div>
        </div>

        {/* Input Form Fields */}
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div className="login-input">
            <Input 
              prefix={<UserOutlined style={{ color: '#00E5A3', fontSize: 16, marginRight: 8 }} />} 
              placeholder="Correo electrónico o usuario" 
              size="large"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login-input">
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#00E5A3', fontSize: 16, marginRight: 8 }} />} 
              placeholder="Contraseña" 
              size="large"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button 
            className="action-btn-primary"
            type="primary" 
            block 
            onClick={handleAuth}
            loading={loading}
          >
            {isRegistering ? 'Crear cuenta' : 'Entrar al sistema'}
          </Button>

          <Button 
            type="text" 
            block 
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ 
              color: 'var(--text-dim)', 
              fontSize: 12, 
              fontWeight: 600, 
              marginTop: 4,
              borderRadius: 9999
            }}
          >
            {isRegistering ? '¿Ya tienes cuenta? Iniciar Sesión' : '¿Nuevo usuario? Registrarse aquí'}
          </Button>
        </Space>

        <Divider style={{ borderColor: 'var(--glass-border)', margin: '24px 0 18px 0' }} />
        
        {/* Footer info */}
        <div style={{ textAlign: 'center' }}>
           <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}>
              <SafetyCertificateFilled style={{ color: '#00E5A3', fontSize: 12 }} />
              SEGURIDAD SSL & ENCRIPCIÓN PLATINUM
           </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
