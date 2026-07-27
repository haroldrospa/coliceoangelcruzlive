import React, { useState, useEffect, useRef } from 'react';
import { supabase, ensureUserProfile, rawFetch } from './lib/supabase';
import { Layout, Typography, Badge, Space, Button, App as AntApp } from 'antd';
import { PlayCircleOutlined, ControlOutlined, LogoutOutlined, RocketOutlined, CrownFilled, SettingOutlined, FilePdfOutlined, ClockCircleOutlined, WalletOutlined, SunOutlined, MoonOutlined, HomeOutlined, HomeFilled, WalletFilled, PlayCircleFilled, ClockCircleFilled, ControlFilled, FileTextFilled, FileTextOutlined } from '@ant-design/icons';
import { useSound } from './hooks/useSound';
import UserLiveView from './views/UserLiveView';
import AdminDashboard from './views/AdminDashboard';
import LoginView from './views/LoginView';
import SplashScreen from './components/SplashScreen';
import UserSettingsView from './views/UserSettingsView';
import ReplaysView from './views/ReplaysView';
import AdminCarteleraView from './views/AdminCarteleraView';
import RelojView from './views/RelojView';
import UserWalletView from './views/UserWalletView';


const logo = "/logo.png"; // Fixed local reliable path

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function MainContent({ currentUser, setCurrentUser, currentView, setCurrentView, onLogout, balance, setBalance, theme, toggleTheme }) {
  const { message: msg } = AntApp.useApp();

  const handleLogin = (user) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('live');
    }
  };

  const navItems = [
    { key: 'live', icon: <HomeOutlined />, label: 'EN VIVO', public: true },
    { key: 'wallet', icon: <WalletOutlined />, label: 'BILLETERA', public: false },
    { key: 'replays', icon: <PlayCircleOutlined />, label: 'REPETICIONES', public: false },
  ];

  const adminItems = [
    { key: 'reloj', icon: <ClockCircleOutlined />, label: 'RELOJ', public: false },
    { key: 'admin-dashboard', icon: <ControlOutlined />, label: 'ADMIN PANEL', public: false },
    { key: 'admin-cartelera', icon: <FilePdfOutlined />, label: 'CARTELERA', public: false },
  ];

  const itemsToShow = currentUser 
    ? (currentUser.role === 'admin' ? [...navItems, ...adminItems] : navItems)
    : navItems.filter(item => item.public);

  const getIcon = (key, isActive) => {
    switch (key) {
      case 'live':
        return isActive ? <HomeFilled /> : <HomeOutlined />;
      case 'wallet':
        return isActive ? <WalletFilled /> : <WalletOutlined />;
      case 'replays':
        return isActive ? <PlayCircleFilled /> : <PlayCircleOutlined />;
      case 'reloj':
        return isActive ? <ClockCircleFilled /> : <ClockCircleOutlined />;
      case 'admin-dashboard':
        return isActive ? <ControlFilled /> : <ControlOutlined />;
      case 'admin-cartelera':
        return isActive ? <FileTextFilled /> : <FileTextOutlined />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    // PROTECCIÓN DE RUTAS: Redirigir a live si se intenta acceder a una ruta privada sin login
    const currentItem = [...navItems, ...adminItems].find(i => i.key === currentView);
    if (currentItem && !currentItem.public && !currentUser) {
        return <UserLiveView userBalance={0} setUserBalance={() => {}} currentUser={null} setCurrentView={setCurrentView} />;
    }

    switch (currentView) {
      case 'live': return <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      case 'login': return <LoginView onLogin={handleLogin} />;
      case 'replays': return <ReplaysView currentUser={currentUser} />;
      case 'reloj': return currentUser?.role === 'admin' ? <RelojView /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      case 'wallet': return <UserWalletView balance={balance} setBalance={setBalance} currentUser={currentUser} />;
      case 'settings': return <UserSettingsView onLogout={onLogout} />;
      case 'admin-dashboard': return currentUser?.role === 'admin' ? <AdminDashboard /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      case 'admin-cartelera': return currentUser?.role === 'admin' ? <AdminCarteleraView /> : <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
      default: return <UserLiveView userBalance={balance} setUserBalance={setBalance} currentUser={currentUser} setCurrentView={setCurrentView} />;
    }
  };



  const otherItems = itemsToShow.filter(item => item.key !== 'live');
  const half = Math.ceil(otherItems.length / 2);
  const leftItems = otherItems.slice(0, half);
  const rightItems = otherItems.slice(half);
  const homeItem = itemsToShow.find(item => item.key === 'live');
  const isHomeActive = currentView === 'live';

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--obsidian)' }}>
      {/* Desktop Header */}
      <Header className="desktop-only" style={{ 
        position: 'sticky', top: 0, zIndex: 1001, width: '100%', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 74, background: 'var(--glass)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setCurrentView('live')}>
           <img src={theme === 'dark' ? '/Logominiatura.png' : '/LogominiaturaBlanco.png'} style={{ height: 38 }} alt="Coliseo Logo" />
            <Title level={5} style={{ color: 'var(--text-main)', margin: 0, fontWeight: 800, letterSpacing: '1px', fontFamily: 'Outfit', textTransform: 'uppercase', fontSize: 13 }}>COLISEO ANGEL CRUZ</Title>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {itemsToShow.map(item => {
            const isActive = currentView === item.key;
            return (
              <div 
                key={item.key}
                onClick={() => setCurrentView(item.key)}
                style={{ 
                   cursor: 'pointer', 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: 8, 
                   padding: '8px 20px',
                   borderRadius: 9999,
                   background: isActive ? 'rgba(0, 229, 163, 0.15)' : 'transparent',
                   transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                   border: '1px solid',
                   borderColor: isActive ? 'rgba(0, 229, 163, 0.3)' : 'transparent'
                }}
              >
                <span style={{ color: isActive ? '#00E5A3' : 'var(--text-dim)', fontSize: 16 }}>{getIcon(item.key, isActive)}</span>
                <Text style={{ color: isActive ? '#00E5A3' : 'var(--text-dim)', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{item.label}</Text>
              </div>
            );
          })}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {currentUser ? (
              <Space size={12}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24' }} /> : <MoonOutlined style={{ color: '#4b5563' }} />} 
                    onClick={toggleTheme} 
                    style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                 />
                 <Button 
                    type="text" 
                    icon={<WalletOutlined style={{ color: '#00E5A3', fontSize: 16 }} />} 
                    onClick={() => setCurrentView('wallet')} 
                    style={{ 
                       background: 'rgba(0,229,163,0.12)', 
                       border: '1px solid rgba(0,229,163,0.25)',
                       borderRadius: '9999px', 
                       height: 42, 
                       padding: '0 20px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 8
                    }} 
                 >
                   <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>${parseFloat(balance || 0).toFixed(2)}</span>
                 </Button>
                 <Button 
                    type="text" 
                    icon={<SettingOutlined style={{ color: 'var(--text-main)' }} />} 
                    onClick={() => setCurrentView('settings')} 
                    style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                 />
              </Space>
            ) : (
              <Space size={12}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24' }} /> : <MoonOutlined style={{ color: '#4b5563' }} />} 
                    onClick={toggleTheme} 
                    style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                 />
                 <Button 
                    type="primary" 
                    onClick={() => setCurrentView('login')}
                    style={{ 
                       height: 42, 
                       borderRadius: 9999, 
                       fontWeight: 800, 
                       padding: '0 26px',
                       textTransform: 'uppercase',
                       letterSpacing: '1px',
                       fontSize: 12
                    }}
                 >
                    INICIAR SESIÓN
                 </Button>
              </Space>
            )}
        </div>
      </Header>

      <Header className="mobile-only" style={{ 
        background: 'var(--glass)', 
        backdropFilter: 'blur(20px)',
        padding: '0 16px', 
        height: 64, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1002,
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={theme === 'dark' ? '/Logominiatura.png' : '/LogominiaturaBlanco.png'} style={{ height: 32 }} alt="Logo" />
            <Title level={5} style={{ color: 'var(--text-main)', margin: 0, fontWeight: 900, fontSize: 12, fontFamily: 'Outfit', letterSpacing: '1px' }}>ANGEL CRUZ</Title>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {currentUser ? (
              <Space size={8}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24', fontSize: 14 }} /> : <MoonOutlined style={{ color: '#4b5563', fontSize: 14 }} />} 
                    onClick={toggleTheme} 
                    style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '50%', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                 />
                 <Button 
                    type="text" 
                    icon={<WalletOutlined style={{ color: '#00E5A3', fontSize: 14 }} />} 
                    onClick={() => setCurrentView('wallet')} 
                    style={{ 
                       background: 'rgba(0,229,163,0.12)', 
                       border: '1px solid rgba(0,229,163,0.25)',
                       borderRadius: '9999px', 
                       height: 36, 
                       padding: '0 12px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: 4
                    }} 
                 >
                   <span style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: 11 }}>${parseFloat(balance || 0).toFixed(2)}</span>
                 </Button>
                 <Button 
                   type="text" 
                   icon={<SettingOutlined style={{ color: 'var(--text-main)', fontSize: 16 }} />} 
                   onClick={() => setCurrentView('settings')}
                   style={{ 
                     background: 'rgba(255, 255, 255, 0.06)', 
                     borderRadius: '50%',
                     height: 36,
                     width: 36,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                   }}
                 />
              </Space>
          ) : (
              <Space size={8}>
                 <Button 
                    type="text" 
                    icon={theme === 'dark' ? <SunOutlined style={{ color: '#fbbf24', fontSize: 14 }} /> : <MoonOutlined style={{ color: '#4b5563', fontSize: 14 }} />} 
                    onClick={toggleTheme} 
                    style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '50%', height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                 />
                 <Button 
                    type="primary" 
                    size="small"
                    onClick={() => setCurrentView('login')}
                    style={{ 
                       borderRadius: 9999, 
                       fontWeight: 800,
                       fontSize: 10,
                       height: 34,
                       padding: '0 14px'
                    }}
                 >
                    LOGIN
                 </Button>
              </Space>
          )}
        </div>
      </Header>

      <Content>{renderContent()}</Content>

      <div className="mobile-nav mobile-only">
        {/* Left Side Items */}
        <div className="capsule-side">
          {leftItems.map(item => {
            const isActive = currentView === item.key;
            return (
              <div 
                key={item.key} 
                onClick={() => setCurrentView(item.key)} 
                className={`capsule-item ${isActive ? 'active' : ''}`}
              >
                {getIcon(item.key, isActive)}
                {isActive && <div className="active-indicator-dot" />}
              </div>
            );
          })}
        </div>

        {/* Center Home Button (Larger & Floating) */}
        {homeItem && (
          <div 
            onClick={() => setCurrentView('live')} 
            className={`capsule-home-btn ${isHomeActive ? 'active' : ''}`}
          >
            {getIcon('live', isHomeActive)}
          </div>
        )}

        {/* Right Side Items */}
        <div className="capsule-side">
          {rightItems.map(item => {
            const isActive = currentView === item.key;
            return (
              <div 
                key={item.key} 
                onClick={() => setCurrentView(item.key)} 
                className={`capsule-item ${isActive ? 'active' : ''}`}
              >
                {getIcon(item.key, isActive)}
                {isActive && <div className="active-indicator-dot" />}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('live');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [balance, setBalance] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'dark');
  const balanceRef = useRef(0);
  const { play } = useSound();

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    const syncUser = async (user) => {
      if (!user) return;
      try {
        const profile = await ensureUserProfile(user);
        setCurrentUser({
          email: user.email,
          role: profile?.role || user.user_metadata?.role || 'user',
          id: user.id
        });
        if (profile) {
          setBalance(profile.balance);
          balanceRef.current = profile.balance;
        }
      } catch (err) {
        console.error('Core Sync Err:', err);
      }
    };

    const initApp = async () => {
      // Check for deep links first
      const params = new URLSearchParams(window.location.search);
      if (params.get('replay')) {
        setCurrentView('replays');
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await syncUser(user);
          await rawFetch(`events?select=id&limit=1`);
        }
      } catch (err) {
        console.error('Auth Init Error:', err);
      } finally {
        setIsInitialized(true);
        setTimeout(() => setIsDataReady(true), 2000);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        syncUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setCurrentView('live');
        setBalance(0);
      }
    });

    return () => {
        if (subscription) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Global Real-time Sync for balance & Win Sound
    let balanceChannel;
    if (currentUser?.id) {
       balanceChannel = supabase.channel('global-wallet-sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${currentUser.id}` }, (payload) => {
          if (payload.new) {
              const newBalance = parseFloat(payload.new.balance);
              const oldBalance = parseFloat(balanceRef.current);
              
              console.log('💰 [Sync Realtime] Nuevo Saldo:', newBalance, 'Anterior:', oldBalance);
              
              if (newBalance > oldBalance) {
                console.log('🎉 [Sound] Play WIN');
                play('WIN');
              }
              setBalance(newBalance);
              balanceRef.current = newBalance;
          }
        })
        .subscribe();
    }

    return () => {
       if (balanceChannel) supabase.removeChannel(balanceChannel);
    };
  }, [currentUser?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!isInitialized) return null;

  return (
    <AntApp>
      {!isDataReady && <SplashScreen isReady={isDataReady} theme={theme} />}
      <div style={{ visibility: isDataReady ? 'visible' : 'hidden', opacity: isDataReady ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <MainContent 
          currentUser={currentUser} 
          setCurrentUser={setCurrentUser} 
          currentView={currentView} 
          setCurrentView={setCurrentView}
          onLogout={handleLogout}
          balance={balance}
          setBalance={setBalance}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </div>
    </AntApp>
  );
}

export default App;
