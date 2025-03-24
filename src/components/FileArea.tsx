import React from 'react';
import { DocumentInfoProvider } from '../contexts/DocumentInfoContext';
import { LayerTreeProvider } from '../contexts/LayerTreeContext';
import { LayerProcessProvider } from '../contexts/LayerProcessContext';
import LayerTreeComponent from './LayerTreeComponent';

const FileArea = () => {
    return (
        <DocumentInfoProvider>
            <LayerTreeProvider>
                <LayerProcessProvider>
                    <LayerTreeComponent />
                </LayerProcessProvider>
            </LayerTreeProvider>
        </DocumentInfoProvider>
    );
};

export default FileArea;