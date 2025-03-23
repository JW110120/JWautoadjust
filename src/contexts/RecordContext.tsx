import React, { createContext, useContext, useState, useRef } from 'react';

const RecordContext = createContext(null);

export const RecordProvider = ({ children }) => {
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);

    const value = {
        isRecording,
        setIsRecording,
        isRecordingRef
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