// bisiyata dishmaya, leharbot ahava biyisral
import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { PrintApp } from './PrintApp';
import '@/layout/fonts.css';
import '@/ui/tokens.css';
import './print.css';

createRoot(document.getElementById('root')!).render(
  createElement(StrictMode, null, createElement(PrintApp)),
);
