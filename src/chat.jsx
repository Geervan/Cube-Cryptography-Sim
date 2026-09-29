import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatApp } from './ChatApp';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ChatApp />
    </React.StrictMode>
  );
}
