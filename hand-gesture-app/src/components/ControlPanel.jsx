
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
    saveImage,
    viewMode,
    setViewMode,
    isNeon,
    setIsNeon,
    showGrid,
    setShowGrid,
    export3D
}) => {

    return (
        <div className="control-panel glassmorphism">
            <div className="panel-header">
                <h2>Air Draw <span>Pro</span></h2>
            </div>

            <div className="control-group">
                <h3>View Mode</h3>
                <div className="toggle-buttons">
                    <button
                        className={viewMode === '2d' ? 'active' : ''}
                        onClick={() => setViewMode('2d')}
                    >
                        2D View
                    </button>
                    <button
                        className={viewMode === '3d' ? 'active' : ''}
                        onClick={() => setViewMode('3d')}
                    >
                        3D View
                    </button>
                </div>
            </div>

            <div className="control-group">
                <h3>Tool</h3>
                <div className="tool-buttons">
                    <button
                        className={activeTool === 'freehand' ? 'active' : ''}
                        onClick={() => setActiveTool('freehand')}
                    >
                        Freehand
                    </button>
                    <button
                        className={activeTool === 'shape' ? 'active' : ''}
                        onClick={() => setActiveTool('shape')}
                        disabled={viewMode === '3d'}
                    >
                        Shape
                    </button>
                </div>
            </div>

            <div className="control-group">
                <h3>Color Palette</h3>
                <div className="color-picker">
                    {['#00FF00', '#FF007F', '#00D4FF', '#FFEA00', '#FFFFFF', '#121212'].map(color => (
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
                <h3>Brush Size</h3>
                <div className="size-control">
                    <input
                        type="range"
                        min="1"
                        max="30"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                        disabled={isDynamicSize}
                    />
                    <span className="size-value">{brushSize}px</span>
                </div>
                <label className="checkbox-container">
                    <input
                        type="checkbox"
                        checked={isDynamicSize}
                        onChange={(e) => setIsDynamicSize(e.target.checked)}
                    />
                    <span>Dynamic Depth Size</span>
                </label>
            </div>

            <div className="control-group">
                <h3>Visualization</h3>
                <label className="checkbox-container">
                    <input
                        type="checkbox"
                        checked={showSkeleton}
                        onChange={(e) => setShowSkeleton(e.target.checked)}
                    />
                    <span>Show Hand Skeleton</span>
                </label>
                {viewMode === '3d' && (
                    <>
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={isNeon}
                                onChange={(e) => setIsNeon(e.target.checked)}
                            />
                            <span>Neon Glow</span>
                        </label>
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={showGrid}
                                onChange={(e) => setShowGrid(e.target.checked)}
                            />
                            <span>Show Grid</span>
                        </label>
                    </>
                )}
            </div>

            <div className="action-buttons">
                <button onClick={undo} className="btn-secondary">Undo</button>
                <button onClick={clearCanvas} className="btn-danger">Clear</button>
                <button onClick={saveImage} className="btn-primary">Save Image</button>
                {viewMode === '3d' && (
                    <button onClick={export3D} className="btn-success">Export 3D (.glb)</button>
                )}
            </div>
        </div>
    );
};

export default React.memo(ControlPanel);
