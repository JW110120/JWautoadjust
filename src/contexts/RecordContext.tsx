import React, { createContext, useContext, useState, useRef } from 'react';

interface RecordContextType {
    isRecording: boolean;
    setIsRecording: (value: boolean) => void;
    isRecordingRef: React.RefObject<boolean>;
}

const RecordContext = createContext<RecordContextType | null>(null);

export const RecordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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