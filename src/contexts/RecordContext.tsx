import React, { createContext, useContext, useState, useRef } from 'react';

const RecordContext = createContext(null);

export const RecordProvider = ({ children }) => {
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);

    // 新增：当前样本图层时间戳与上一次时间戳
    const [currentSampleTs, setCurrentSampleTs] = useState<string | null>(null);
    const [previousSampleTs, setPreviousSampleTs] = useState<string | null>(null);

    const value = {
        isRecording,
        setIsRecording,
        isRecordingRef,
        currentSampleTs,
        setCurrentSampleTs,
        previousSampleTs,
        setPreviousSampleTs,
    };

    return (
        <RecordContext.Provider value={value}>
            {children}
        </RecordContext.Provider>
    );
};

export const useRecordContext = () => {
    const context = useContext(RecordContext);
    if (!context) {
        throw new Error('useRecordContext must be used within a RecordProvider');
    }
    return context;
};