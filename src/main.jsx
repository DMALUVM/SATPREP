import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SatPrepApp from './satprep/SatPrepApp.jsx';
import './index.css';

if (!window.location.pathname.startsWith('/sat-prep')) {
  window.history.replaceState({}, '', '/sat-prep');
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // eslint-disable-next-line no-console
      console.warn('Service worker registration failed:', error?.message || error);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SatPrepApp />
  </StrictMode>
);
