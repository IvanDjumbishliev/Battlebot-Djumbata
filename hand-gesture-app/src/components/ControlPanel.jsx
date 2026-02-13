
import React from 'react';
import '../styles/ControlPanel.css';

const ControlPanel = ({
    activeTool,
    setActiveTool,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    isDynamicSize,
    setIsDynamicSize,
    showSkeleton,
    setShowSkeleton,
    clearCanvas,
    undo,
    saveImage
}) => {

    return (
        <div className="control-panel">
            <div className="control-group">
                <h3>Mode</h3>
                <button
                    className={activeTool === 'freehand' ? 'active' : ''}
                    onClick={() => setActiveTool('freehand')}
                >
                    Freehand
                </button>
                <button
                    className={activeTool === 'shape' ? 'active' : ''}
                    onClick={() => setActiveTool('shape')}
                >
                    Shape
                </button>
            </div>

            <div className="control-group">
                <h3>Color</h3>
                <div className="color-picker">
                    {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFFFFF', '#000000'].map(color => (
                        <div
                            key={color}
                            className={`color-swatch ${brushColor === color ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setBrushColor(color)}
                        />
                    ))}
                </div>
            </div>

            <div className="control-group">
                <h3>Size</h3>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    disabled={isDynamicSize}
                />
                <label style={{ display: 'flex', alignItems: 'center', marginTop: '10px', fontSize: '14px' }}>
                    <input
                        type="checkbox"
                        checked={isDynamicSize}
                        onChange={(e) => setIsDynamicSize(e.target.checked)}
                        style={{ width: 'auto', marginRight: '10px' }}
                    />
                    Dynamic (Hand Depth)
                </label>
            </div>

            <div className="control-group">
                <h3>View</h3>
                <label style={{ display: 'flex', alignItems: 'center', marginTop: '10px', fontSize: '14px' }}>
                    <input
                        type="checkbox"
                        checked={showSkeleton}
                        onChange={(e) => setShowSkeleton(e.target.checked)}
                        style={{ width: 'auto', marginRight: '10px' }}
                    />
                    Show Skeleton
                </label>
            </div>

            <div className="control-group action-buttons">
                <button onClick={undo}>Undo</button>
                <button onClick={clearCanvas} className="danger">Clear</button>
                <button onClick={saveImage} className="success">Save</button>
            </div>
        </div>
    );
};

export default React.memo(ControlPanel);
