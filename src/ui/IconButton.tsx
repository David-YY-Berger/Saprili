// bisiyata dishmaya, leharbot ahava biyisral
import type { ReactNode } from 'react';
import { Tooltip } from './Tooltip';

interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
  type?: 'button' | 'submit';
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  disabledReason,
  type = 'button',
}: IconButtonProps) {
  const hint = disabled && disabledReason ? `${label}: ${disabledReason}` : label;
  return (
    <Tooltip content={hint}>
      <button
        aria-label={label}
        className="icon-button"
        disabled={disabled}
        onClick={onClick}
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
