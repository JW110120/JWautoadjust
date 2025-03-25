import React, { useMemo } from 'react';
import { Layer } from 'photoshop';
import { app } from 'photoshop';
import { useLayerTree } from '../contexts/LayerTreeContext';
import { FaChevronDown, FaFolder } from 'react-icons/fa';
import { useScrollPosition } from '../utils/ScrollUtils';

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
                // 使用 layer.id 作为唯一标识，而不是路径
                const uniqueKey = `${layer.id}`;
                const currentPath = parentPath ? `${parentPath}/${layer.id}` : `${layer.id}`;
                
                if (layer.kind === 'group') {
                    return (
                        <div key={uniqueKey} className="group-container">
                            <div 
                                className="group-header"
                                onClick={() => toggleGroup(layer.id)} // 直接使用 layer.id
                            >
                                <FaChevronDown 
                                    className={`toggle-icon ${collapsedGroups[layer.id] ? 'collapsed' : 'expanded'}`}
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
                            {!collapsedGroups[layer.id] && ( // 直接使用 layer.id
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
                                id={`checkbox-${layer.id}`} // 添加 id 属性
                                checked={!!selectedLayerPaths[layer.id]}
                                onChange={() => handleLayerCheckboxChange(layer)}
                                className="layer-checkbox"
                            />
                            <label 
                                htmlFor={`checkbox-${layer.id}`} // 使用 htmlFor 关联 checkbox
                                className={`layer-name ${selectedLayerPaths[layer.id] ? 'selected' : ''}`}
                            >
                                {layer.name}
                            </label>
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