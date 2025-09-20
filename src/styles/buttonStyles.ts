import { CSSProperties } from 'react';

export interface ButtonStyleProps {
    isDisabled: boolean;
}

export const getButtonStyle = (isDisabled: boolean): CSSProperties => ({
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    color: 'var(--text)',
    backgroundColor: 'var(--bg)',
    transition: 'background-color 0.2s, color 0.2s',
    padding: '15px',
    height: '32px',      // 调整按钮总高度
    pointerEvents: isDisabled ? 'none' as any : 'auto' as any
});

export const handleMouseOver = (e: React.MouseEvent<HTMLElement>, isDisabled: boolean) => {
    if (!isDisabled) {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
        (e.currentTarget as HTMLElement).style.color = 'var(--text-hover)';
    }
};

export const handleMouseOut = (e: React.MouseEvent<HTMLElement>) => {
    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg)';
    (e.currentTarget as HTMLElement).style.color = 'var(--text)';
};