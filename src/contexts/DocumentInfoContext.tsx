import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { app } from 'photoshop';

interface DocumentInfo {
    fileName: string;
    groupCount: number;
    pixelLayerCount: number;
}

interface DocumentInfoContextType {
    documentInfo: DocumentInfo;
    updateDocumentInfo: () => void;
}

const initialDocumentInfo: DocumentInfo = {
    fileName: '无活动文档',
    groupCount: 0,
    pixelLayerCount: 0
};

const DocumentInfoContext = createContext<DocumentInfoContextType>({
    documentInfo: initialDocumentInfo,
    updateDocumentInfo: () => {}
});

export const useDocumentInfo = () => useContext(DocumentInfoContext);

export const DocumentInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [documentInfo, setDocumentInfo] = useState<DocumentInfo>(initialDocumentInfo);

    const countPixelLayers = useCallback((layers) => {
        let count = 0;
        layers.forEach(layer => {
            if (layer.kind === 'pixel') {
                count++;
            } else if (layer.kind === 'group') {
                count += countPixelLayers(layer.layers);
            }
        });
        return count;
    }, []);

    const updateDocumentInfo = useCallback(() => {
        try {
            const doc = app.activeDocument;
            if (doc) {
                const groups = doc.layers.filter(layer => layer.kind === 'group');
                const pixelLayers = countPixelLayers(doc.layers);
                setDocumentInfo({
                    fileName: doc.name,
                    groupCount: groups.length,
                    pixelLayerCount: pixelLayers
                });
            } else {
                setDocumentInfo(initialDocumentInfo);
            }
        } catch (error) {
            console.error('更新文档信息失败:', error);
            setDocumentInfo(initialDocumentInfo);
        }
    }, [countPixelLayers]);

    useEffect(() => {
        updateDocumentInfo();
        const interval = setInterval(updateDocumentInfo, 2000);
        return () => clearInterval(interval);
    }, [updateDocumentInfo]);

    return (
        <DocumentInfoContext.Provider value={{ documentInfo, updateDocumentInfo }}>
            {children}
        </DocumentInfoContext.Provider>
    );
};