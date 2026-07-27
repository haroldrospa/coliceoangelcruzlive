import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConfigProvider, theme } from 'antd'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#00E5A3',
          colorBgBase: '#12161f',
          fontFamily: "'Outfit', 'Inter', system-ui, -apple-system, sans-serif",
          borderRadius: 20,
          colorLink: '#00E5A3',
          colorSuccess: '#00E5A3',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          colorTextBase: '#FFFFFF',
        },
        components: {
          Button: {
            colorPrimary: '#00E5A3',
            colorPrimaryHover: '#00C88F',
            controlHeight: 46,
            fontWeight: 700,
            borderRadius: 9999,
          },
          Card: {
            colorBgContainer: '#1a1f29',
            borderRadiusLG: 24,
          },
          Table: {
            colorBgContainer: '#1a1f29',
            borderRadius: 16,
          },
          Input: {
            borderRadius: 16,
          },
          Modal: {
            contentBg: '#1a1f29',
            borderRadiusLG: 24,
          }
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
