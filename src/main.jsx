import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

window.requestAnimationFrame(() => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.style.transition = 'opacity 220ms ease';
    splash.style.opacity = '0';
    window.setTimeout(() => splash.remove(), 220);
  }
  document.documentElement.style.overflowY = 'scroll';
});
