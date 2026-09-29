import React from 'react';
import ReactDOM from 'react-dom/client';
import { LabApp } from './LabApp.jsx';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <LabApp />
    </React.StrictMode>
  );
}
