import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, getSavedTheme } from './lib/themes';
import { App } from './App';
import './styles/index.css';

applyTheme(getSavedTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
