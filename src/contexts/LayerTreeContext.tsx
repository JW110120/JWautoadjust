import React, { createContext, useContext, useState, useCallback } from 'react';
import { Layer } from 'photoshop';

interface LayerTreeContextType {
    selectedLayers: Layer[];
    selectedLayerPaths: Record<string, boolean>;
    collapsedGroups: Record<string, boolean>;
    handleLayerCheckboxChange: (layer: Layer) => void;
    toggleGroup: (path: string) => void;
}

const LayerTreeContext = createContext<LayerTreeContextType>({
    selectedLayers: [],
    selectedLayerPaths: {},
    collapsedGroups: {},
    handleLayerCheckboxChange: () => {},
    toggleGroup: () => {}
});

export const useLayerTree = () => useContext(LayerTreeContext);

export const LayerTreeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedLayers, setSelectedLayers] = useState<Layer[]>([]);
    const [selectedLayerPaths, setSelectedLayerPaths] = useState<Record<string, boolean>>({});
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const handleLayerCheckboxChange = useCallback((layer: Layer) => {
        const isSelected = !selectedLayerPaths[layer.id];
        
        setSelectedLayerPaths(prev => ({
            ...prev,
            [layer.id]: isSelected
        }));
        
        setSelectedLayers(prev => 
            isSelected 
                ? [...prev, layer]
                : prev.filter(l => l.id !== layer.id)
        );
    }, [selectedLayerPaths]);

    const toggleGroup = useCallback((path: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [path]: !prev[path]
        }));
    }, []);

    return (
        <LayerTreeContext.Provider value={{
            selectedLayers,
            selectedLayerPaths,
            collapsedGroups,
            handleLayerCheckboxChange,
            toggleGroup
        }}>
            {children}
        </LayerTreeContext.Provider>
    );
};