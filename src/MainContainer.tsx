import React from 'react';
import { RecordArea } from './components/RecordArea';
import FileArea from './components/FileArea';
import { RecordProvider } from './contexts/RecordProvider';
import InfoPlane from './components/InfoPlane';
import LayerTreeComponent from './components/LayerTreeComponent';

const MainContainer: React.FC = () => {
    return (
        <RecordProvider>
            <MainContainerContent />
        </RecordProvider>
    );
};

const MainContainerContent: React.FC = () => {
    return (
        <div>
            <RecordArea />
            <FileArea />
            <InfoPlane />
            <LayerTreeComponent />
        </div>
    );
};

export default MainContainer;