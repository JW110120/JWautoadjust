import * as React from'react';
import Record from './Record';
import Adjust from './Adjust';

const MainContainer: React.FC = () => {
    return (
        <div className="spectrum-Body" style={{ display: 'flex', gap: 20, background: '#111', color: '#fff' }}>
            <Record />
            <Adjust />
        </div>
    );
};

export default MainContainer;