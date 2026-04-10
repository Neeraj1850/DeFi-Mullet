import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initLiFi } from './api/earn';
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

// Initialise LI.FI SDK before React renders
initLiFi();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
