// bisiyata dishmaya, leharbot ahava biyisral
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { UndoToast } from './UndoToast';

interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastMessage['type']) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastHost');
  return value;
}

export function ToastHost({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now() + Math.random();
    setMessages((current) => [...current, { id, message, type }]);
    setTimeout(() => setMessages((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {messages.length > 0 && (
        <div aria-label="Notifications" className="toast-region" role="region">
          {messages.map((message) => (
            <div
              aria-live={message.type === 'error' ? 'assertive' : 'polite'}
              className={`toast${message.type === 'error' ? ' toast--error' : ''}`}
              key={message.id}
              role={message.type === 'error' ? 'alert' : 'status'}
            >
              {message.message}
            </div>
          ))}
        </div>
      )}
      <UndoToast />
    </ToastContext.Provider>
  );
}
