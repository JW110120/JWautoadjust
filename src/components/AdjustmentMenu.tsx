import React, { useState, useEffect } from 'react';
import { adjustmentMenuItems } from '../constants';

interface AdjustmentMenuProps {
    isRecording: boolean;
    onAdjustmentClick: (item: any) => void;
}

export const AdjustmentMenu: React.FC<AdjustmentMenuProps> = ({ isRecording, onAdjustmentClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };
    
    const handleMenuItemClick = (item: any, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!isRecording) {
            onAdjustmentClick(item);
        }
        setIsMenuOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen && !(event.target as Element).closest('.dropdown')) {
                setIsMenuOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <div className="dropdown">
            <button 
                onClick={toggleMenu}
                style={{ 
                    backgroundColor: '#444',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                <span style={{ marginRight: '5px' }}>+</span> 新增
            </button>
            {isMenuOpen && (
                <div 
                    className="dropdown-content"
                    style={{
                        display: 'block',
                        bottom: '100%',
                        top: 'auto',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {adjustmentMenuItems.map(item => (
                        <a 
                            key={item.id} 
                            onClick={(e) => handleMenuItemClick(item, e)}
                            style={{ opacity: isRecording ? 0.5 : 1 }}
                        >
                            {item.name}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};