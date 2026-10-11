// bisiyata dishmaya, leharbot ahava biyisral
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getDirection, getLocale } from '@/i18n';
import { AppRoot } from './AppRoot';
import '@/ui/tokens.css';

document.documentElement.lang = getLocale();
document.documentElement.dir = getDirection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
);
