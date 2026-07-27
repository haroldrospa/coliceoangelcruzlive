import React, { useState, useEffect } from 'react';
import { Card, Typography, Switch, Button, Divider, Space, App as AntApp, Avatar } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  BellOutlined, 
  SoundOutlined, 
  LockOutlined, 
  CustomerServiceOutlined, 
  LogoutOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;

const UserSettingsView = ({ onLogout }) => {
  const { message } = AntApp.useApp();
  const [userData, setUserData] = useState({ email: 'Cargando...', id: '' });
  const [loading, setLoading] = useState(false);

  // Settings State 
  const [settings, setSettings] = useState({
    notifications: true,
    sounds: true,
    highQualityVideo: true
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserData({ email: user.email, id: user.id });
      }
    };
    fetchProfile();
  }, []);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    message.success('Preferencia actualizada');
  };

  const handleLogoutPress = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    onLogout();
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: 700, margin: '0 auto', background: 'var(--obsidian)', minHeight: '100vh', paddingBottom: 100 }}>
      {/* Settings Header */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <Title level={4} className="outfit" style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>CONFIGURACIÓN</Title>
        <Text style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Panel de Control Principal</Text>
      </div>

      {/* Profile Card */}
      <Card className="glass-panel" style={{ marginBottom: 24, padding: 0 }} styles={{ body: { padding: 24 } }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Avatar size={64} style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }} icon={<UserOutlined />} />
          <div style={{ flex: 1 }}>
            <Title level={5} style={{ color: '#fff', margin: 0, fontWeight: 700, fontSize: 15 }}>{userData.email.split('@')[0]}</Title>
            <Text style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginTop: 4 }}>{userData.email}</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <SafetyCertificateOutlined style={{ color: '#10b981', fontSize: 12 }} />
              <Text style={{ color: '#10b981', fontSize: 9, fontWeight: 800, letterSpacing: '1px' }}>CUENTA VERIFICADA SSL</Text>
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences Section */}
      <Title level={5} style={{ color: '#fff', fontSize: 12, textTransform: 'uppercase', marginBottom: 16, letterSpacing: '1.5px', paddingLeft: 8 }}>Preferencias del Coliseo</Title>
      <Card className="glass-panel" style={{ marginBottom: 24 }} styles={{ body: { padding: '12px 20px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <BellOutlined style={{ color: '#10b981', fontSize: 18 }} />
                <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Notificaciones Push</Text>
             </div>
             <Text style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginLeft: 30, marginTop: 4 }}>Alertas de inicio de evento y saldo</Text>
          </div>
          <Switch checked={settings.notifications} onChange={() => handleToggle('notifications')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SoundOutlined style={{ color: '#10b981', fontSize: 18 }} />
                <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Audio Táctico Global</Text>
             </div>
             <Text style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginLeft: 30, marginTop: 4 }}>Sonidos de sistema y alertas de apuestas</Text>
          </div>
          <Switch checked={settings.sounds} onChange={() => handleToggle('sounds')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SettingOutlined style={{ color: '#10b981', fontSize: 18 }} />
                <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Transmisión Alta Calidad</Text>
             </div>
             <Text style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginLeft: 30, marginTop: 4 }}>Reproducción de Dacast a máxima resolución</Text>
          </div>
          <Switch checked={settings.highQualityVideo} onChange={() => handleToggle('highQualityVideo')} />
        </div>
      </Card>

      {/* Security Section */}
      <Title level={5} style={{ color: '#fff', fontSize: 12, textTransform: 'uppercase', marginBottom: 16, letterSpacing: '1.5px', paddingLeft: 8 }}>Seguridad y Soporte</Title>
      <Card className="glass-panel" style={{ marginBottom: 32 }} styles={{ body: { padding: '12px 20px' } }}>
        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }} onClick={() => message.info('Acceso restringido: Contacte soporte para cambiar contraseña')}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LockOutlined style={{ color: '#fff', opacity: 0.6, fontSize: 18 }} />
              <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Cambiar Código Secreto</Text>
           </div>
        </div>
        <div style={{ padding: '12px 0', cursor: 'pointer' }} onClick={() => message.success('Abriendo canal de soporte técnico...')}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CustomerServiceOutlined style={{ color: '#fff', opacity: 0.6, fontSize: 18 }} />
              <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Contactar Administración</Text>
           </div>
        </div>
      </Card>

      {/* Logout Action */}
      <Button 
        block 
        danger 
        type="primary"
        ghost
        icon={<LogoutOutlined />} 
        loading={loading}
        onClick={handleLogoutPress}
        style={{ height: 48, fontSize: 12, fontWeight: 600, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.3)' }}
      >
        CERRAR SESIÓN DE FORMA SEGURA
      </Button>

      <div style={{ textAlign: 'center', marginTop: 40, opacity: 0.2 }}>
         <Text style={{ color: '#fff', fontSize: 8, letterSpacing: '2px', fontWeight: 700 }}>COLISEO ANGEL CRUZ • v2.0.0 (GREEN EDITION)</Text>
         <Text style={{ color: '#fff', fontSize: 7, letterSpacing: '1px', display: 'block', marginTop: 4 }}>&copy; 2026 TODOS LOS DERECHOS RESERVADOS.</Text>
      </div>
    </div>
  );
};

export default UserSettingsView;
