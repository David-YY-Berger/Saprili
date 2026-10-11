// bisiyata dishmaya, leharbot ahava biyisral
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const variantClass = variant === 'primary' ? '' : ` button--${variant}`;
  return (
    <button className={`button${variantClass}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </button>
  );
}
