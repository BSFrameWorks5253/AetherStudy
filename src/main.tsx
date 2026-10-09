import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { ThemeProvider } from './context/ThemeContext';
import { registerServiceWorker } from './registerServiceWorker';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import './index.css';

// Initialize PWA Offline Engine
registerServiceWorker();

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <AuthProvider>
          <PomodoroProvider>
            <App />
            <Analytics />
            <SpeedInsights />
          </PomodoroProvider>
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}
