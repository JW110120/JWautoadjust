import React from 'react';
import { RecordProvider } from '../contexts/RecordProvider';
import { AdjustmentProvider } from '../contexts/AdjustmentProvider';
import { DeleteButtonProvider } from '../contexts/DeleteButtonProvider';
import { RecordButtons } from './RecordButtons';
import { RecordPanel } from './RecordPanel';
import InfoPlane from './InfoPlane';
import { AdjustmentMenu as AdjustmentMenuComponent } from './AdjustmentMenu';

export { DeleteButtonProvider as DeleteButtonWrapper };

// 修改 AdjustmentMenu 组件，使用 Provider 中的逻辑
export const AdjustmentMenu = React.memo(() => {
    return (
        <AdjustmentProvider>
            <AdjustmentMenuComponent />
        </AdjustmentProvider>
    );
});

export const RecordArea = () => {
    return (
        <RecordProvider>
            <AdjustmentProvider>
                <DeleteButtonProvider>
                    <div className="section">
                        <RecordButtons />
                        <RecordPanel />
                        <InfoPlane />
                    </div>
                </DeleteButtonProvider>
            </AdjustmentProvider>
        </RecordProvider>
    );
};
