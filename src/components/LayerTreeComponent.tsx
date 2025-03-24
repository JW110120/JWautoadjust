import React, { useMemo } from 'react';
import { Layer } from 'photoshop';
import { app } from 'photoshop';
import { useLayerTree } from '../contexts/LayerTreeContext';
import { FaChevronDown, FaFolder } from 'react-icons/fa';
import { useScrollPosition } from '../utils/scrollUtils';

const LayerTreeComponent: React.FC = () => {
    const { ref: layerListRef } = useScrollPosition();
    const {
        selectedLayers,
        selectedLayerPaths,
        collapsedGroups,
        handleLayerCheckboxChange,
        toggleGroup
    } = useLayerTree();

    const renderLayerTree = useMemo(() => {
        const renderLayers = (layers: Layer[], parentPath = '', indent = 0) => {
            return layers.map((layer, index) => {
                const currentPath = parentPath ? `${parentPath}/${layer.name}` : layer.name;
                const uniqueKey = `${currentPath}_${layer.id}`;
                
                if (layer.kind === 'group') {
                    return (
                        <div key={uniqueKey} className="group-container">
                            <div 
                                className="group-header"
                                onClick={() => toggleGroup(currentPath)}
                            >
                                <FaChevronDown 
                                    className={`toggle-icon ${collapsedGroups[currentPath] ? 'collapsed' : 'expanded'}`}
                                    aria-label="toggle"
                                    style={{ color: 'white' }}
                                />
                                <FaFolder 
                                    className="folder-icon"
                                    aria-label="folder"
                                    style={{ color: 'white' }}
                                />
                                <span className="layer-name">{layer.name}</span>
                            </div>
                            {!collapsedGroups[currentPath] && (
                                <div className="group-children" style={{ marginLeft: `${indent + 20}px` }}>
                                    {renderLayers(layer.layers, currentPath, indent + 20)}
                                </div>
                            )}
                        </div>
                    );
                } else if (layer.kind === 'pixel') {
                    return (
                        <div 
                            key={uniqueKey}
                            className="layer-item"
                            style={{ paddingLeft: `${indent + 20}px` }}
                        >
                            <input 
                                type="checkbox" 
                                checked={!!selectedLayerPaths[layer.id]}
                                onChange={() => handleLayerCheckboxChange(layer)}
                                className="layer-checkbox"
                            />
                            <span 
                                onClick={() => handleLayerCheckboxChange(layer)}
                                className={`layer-name ${selectedLayerPaths[layer.id] ? 'selected' : ''}`}
                            >
                                {layer.name}
                            </span>
                        </div>
                    );
                }
                return null;
            });
        };

        return app.activeDocument ? renderLayers(app.activeDocument.layers) : (
            <div className="no-document">
                没有活动文档
            </div>
        );
    }, [collapsedGroups, selectedLayerPaths, handleLayerCheckboxChange, toggleGroup]);

    return (
        <div className="layer-section">
            <div className="layer-header">
                <p className="layer-title">待执行图层</p>
            </div>
            <div className="layer-list-container" ref={layerListRef}>
                {renderLayerTree}
            </div>
        </div>
    );
};

export default LayerTreeComponent;