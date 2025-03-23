import React from 'react';
import { app } from 'photoshop';

interface InfoPlaneProps {
    adjustmentStepsCount: number;
}

const InfoPlane: React.FC<InfoPlaneProps> = ({ adjustmentStepsCount }) => {
    const doc = app.activeDocument;
    const documentInfo = doc ? {
        fileName: doc.name,
        groupCount: doc.layers.filter(layer => layer.kind === 'group').length,
        pixelLayerCount: countPixelLayers(doc.layers)
    } : {
        fileName: '无活动文档',
        groupCount: 0,
        pixelLayerCount: 0
    };

    function countPixelLayers(layers) {
        let count = 0;
        layers.forEach(layer => {
            if (layer.kind === 'pixel') {
                count++;
            } else if (layer.kind === 'group') {
                count += countPixelLayers(layer.layers);
            }
        });
        return count;
    }

    return (
        <div className="info-section">
            <div className="doc-info">
                当前文件: {documentInfo.fileName}
                <span style={{ margin: '0 16px' }}>|</span>
                {adjustmentStepsCount} 个调整
                <span style={{ margin: '0 16px' }}>|</span>
                {documentInfo.groupCount} 个组
                <span style={{ margin: '0 16px' }}>|</span>
                {documentInfo.pixelLayerCount} 个像素图层
            </div>
            <div className="copyright-info">
               Copyright © Listen2me (JW)
            </div>
        </div>
    );
};

export default InfoPlane;