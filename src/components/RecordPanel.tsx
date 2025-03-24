import React from 'react';
import { useRecordProvider } from '../contexts/RecordProvider';
import { useScrollPosition } from '../utils/ScrollUtils';

export const RecordPanel: React.FC = () => {
    const {
        adjustmentSteps,
        selectedIndex,
        setSelectedIndex
    } = useRecordProvider();

    const { ref: listRef } = useScrollPosition();

    return (
        <div className="scrollable-area" ref={listRef}>
            {adjustmentSteps.map((step, index) => (
                <div
                    key={index}
                    className={`list-item ${selectedIndex === index ? 'selected' : ''}`}
                    onClick={() => setSelectedIndex(index)}
                >
                    <span className="step-number">{index + 1}.</span>
                    <span className="step-content">{step}</span>
                </div>
            ))}
        </div>
    );
};