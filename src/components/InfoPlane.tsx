import React, { useContext } from 'react';
import { DocumentInfoContext } from '../contexts/DocumentInfoContext';

interface InfoPlaneProps {
    adjustmentStepsCount: number;
}

const InfoPlane: React.FC<InfoPlaneProps> = ({ adjustmentStepsCount }) => {
    const { documentInfo } = useContext(DocumentInfoContext);

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