import React, { useEffect, useState } from 'react';
import { Typography, Progress } from 'antd';

const { Title, Text } = Typography;

const SplashScreen = ({ isReady, theme }) => {
  const [percent, setPercent] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timer;
    if (percent < 90) {
      timer = setInterval(() => {
        setPercent(prev => prev + (Math.random() * 10));
      }, 200);
    }
    
    if (isReady) {
      setPercent(100);
      setTimeout(() => setVisible(false), 500);
    }

    return () => clearInterval(timer);
  }, [percent, isReady]);

  if (!visible) return null;

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1c1e24' : '#ffffff';
  const logoSrc = isDark ? '/Logominiatura.png' : '/LogominiaturaBlanco.png';
  const textColorMain = isDark ? '#ffffff' : '#111827';
  const textColorMuted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(17,24,39,0.5)';
  const progressTrailColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      backgroundColor: bgColor,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      transition: 'opacity 0.8s ease, background-color 0.3s ease',
      opacity: isReady && percent === 100 ? 0 : 1,
      pointerEvents: 'none'
    }}>
      <div style={{ textAlign: 'center', animation: 'pulse 2s infinite', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src={logoSrc} style={{ 
            height: 100, 
            marginBottom: 20, 
            borderRadius: 8
        }} alt="Logo Oficial" />
        <Title level={2} style={{ 
          color: textColorMain, 
          margin: 0, 
          fontWeight: 900, 
          letterSpacing: '6px', 
          fontFamily: 'Outfit',
          fontSize: 22,
          textShadow: isDark ? '0 0 10px rgba(255,255,255,0.05)' : 'none'
        }}>
          COLISEO ANGEL CRUZ
        </Title>
        <Text style={{ 
          color: textColorMuted, 
          fontSize: 9, 
          letterSpacing: '3px', 
          fontWeight: 700,
          textTransform: 'uppercase',
          marginTop: 6,
          display: 'block'
        }}>
          Plataforma Táctica de Combate
        </Text>
      </div>

      <div style={{ width: 200, marginTop: 40 }}>
        <Progress 
          percent={percent} 
          showInfo={false} 
          strokeColor="#10b981" 
          trailColor={progressTrailColor}
          size="small"
        />
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
