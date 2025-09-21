import { CSSProperties } from 'react';

export interface ButtonStyleProps {
  isDisabled: boolean;
}

export const getButtonStyle = (isDisabled: boolean): CSSProperties => ({
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  backgroundColor: isDisabled ? 'var(--bg-sb)' : 'var(--bg-sb)',
  color: isDisabled ? 'var(--text-muted, #8b8b8b)' : 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '4px 10px',
  minWidth: 96,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  transition: 'background-color 120ms ease, color 120ms ease, opacity 120ms ease',
  opacity: 1,
  // 不要阻断事件，使用点击守卫控制逻辑，避免出现只有局部可点击的问题
});

export const handleMouseOver = (e: React.MouseEvent<HTMLElement>, isDisabled: boolean) => {
  if (!isDisabled) {
    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
  }
};

export const handleMouseOut = (e: React.MouseEvent<HTMLElement>) => {
  const el = e.currentTarget as HTMLElement;
  const isDisabled = el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled');
  el.style.backgroundColor = 'var(--bg-sb)';
  el.style.color = isDisabled ? 'var(--text-muted, #8b8b8b)' : 'var(--text)';
};