// bisiyata dishmaya, leharbot ahava biyisral
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Tooltip } from './Tooltip';

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  ref?: Ref<HTMLButtonElement>;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabledReason?: string;
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  disabledReason,
  type = 'button',
  className = '',
  ref,
  ...buttonProps
}: IconButtonProps) {
  const hint = disabled && disabledReason ? `${label}: ${disabledReason}` : label;
  return (
    <Tooltip content={hint}>
      <button
        {...buttonProps}
        aria-label={label}
        className={`icon-button${className ? ` ${className}` : ''}`}
        disabled={disabled}
        onClick={onClick}
        ref={ref}
        title={hint}
        type={type}
      >
        <span aria-hidden="true" className="icon-button__glyph">
          {icon}
        </span>
      </button>
    </Tooltip>
  );
}
