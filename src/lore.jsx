import React from 'react';
import ReactDOM from 'react-dom/client';
import { LoreApp } from './LoreApp';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <LoreApp />
    </React.StrictMode>
  );
}
