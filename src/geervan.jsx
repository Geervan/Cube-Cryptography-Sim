import React from 'react';
import { createRoot } from 'react-dom/client';
import { GeervanApp } from './GeervanApp.jsx';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<GeervanApp />);
}
