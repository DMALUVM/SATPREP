import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SatPrepApp from './satprep/SatPrepApp.jsx';
import './index.css';

if (!window.location.pathname.startsWith('/sat-prep')) {
  window.history.replaceState({}, '', '/sat-prep');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SatPrepApp />
  </StrictMode>
);
