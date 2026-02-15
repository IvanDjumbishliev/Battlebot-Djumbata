import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';
import { drawHandSkeleton, drawLine } from '../utils/drawingUtils';
import { detectShape } from '../utils/gestureUtils';
import ControlPanel from './ControlPanel';
import Scene3D from './Scene3D';
import '../styles/HandCanvas.css';

const HandCanvas = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const { results } = useHandTracking(videoRef, canvasRef);

    // UI State
    const [activeTool, setActiveTool] = useState('freehand'); // 'freehand' | 'shape' | '3d'
    const [brushColor, setBrushColor] = useState('#00FF00');
    const [brushSize, setBrushSize] = useState(5);
    const [isDynamicSize, setIsDynamicSize] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('2d'); // '2d' | '3d'
    const [isNeon, setIsNeon] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const scene3DRef = useRef();

    const handleExport3D = () => {
        if (scene3DRef.current) {
            scene3DRef.current.exportScene();
        }
    };

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPoint, setLastPoint] = useState(null);
    const currentPathRef = useRef([]);
    const [lines3D, setLines3D] = useState([]);
    const [activeLine3D, setActiveLine3D] = useState([]);

    // History for Undo
    const historyRef = useRef([]);

    useEffect(() => {
        if (results) {
            setIsLoading(false);
        }
    }, [results]);

    const saveHistory = () => {
        if (!drawingCanvasRef.current) return;
        const ctx = drawingCanvasRef.current.getContext('2d');
        const width = drawingCanvasRef.current.width;
        const height = drawingCanvasRef.current.height;
        const imageData = ctx.getImageData(0, 0, width, height);

        historyRef.current.push(imageData);
        if (historyRef.current.length > 10) {
            historyRef.current.shift();
        }
    };

    const undo = () => {
        if (viewMode === '3d') {
            setLines3D(prev => prev.slice(0, -1));
            return;
        }

        if (historyRef.current.length === 0 || !drawingCanvasRef.current) return;
        const ctx = drawingCanvasRef.current.getContext('2d');
        const previousState = historyRef.current.pop();
        if (previousState) {
            ctx.putImageData(previousState, 0, 0);
        }
    };

    const clearCanvas = () => {
        if (viewMode === '3d') {
            setLines3D([]);
            setActiveLine3D([]);
            return;
        }
        if (!drawingCanvasRef.current) return;
        saveHistory();
        const ctx = drawingCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, drawingCanvasRef.current.width, drawingCanvasRef.current.height);
    };

    const saveImage = () => {
        if (!drawingCanvasRef.current) return;

        // Create a temporary canvas to composite with background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawingCanvasRef.current.width;
        tempCanvas.height = drawingCanvasRef.current.height;
        const ctx = tempCanvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#1a1a1a'; // Match app background
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the drawing
        ctx.drawImage(drawingCanvasRef.current, 0, 0);

        // Download
        const link = document.createElement('a');
        link.download = `air-draw-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL();
        link.click();
    };

    // Main Loop
    useEffect(() => {
        if (!canvasRef.current || !results || !drawingCanvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        const drawingCtx = drawingCanvasRef.current.getContext('2d');
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        // 1. Draw persistent drawing canvas
        ctx.drawImage(drawingCanvasRef.current, 0, 0, width, height);

        // 2. Draw Hand Skeleton (if enabled)
        if (showSkeleton) {
            drawHandSkeleton(ctx, results);
        }

        // 3. Handle Gestures
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const indexTip = landmarks[8];
            const thumbTip = landmarks[4];

            // Coordinates
            const x = indexTip.x * width;
            const y = indexTip.y * height;

            // Calculate dynamic brush size based on depth (z-coordinate)
            let currentBrushSize = brushSize;

            if (activeTool === 'freehand' && isDynamicSize) {
                const wrist = landmarks[0];
                const middleMCP = landmarks[9];
                // Distance in normalized coordinates (0-1)
                const handSize = Math.sqrt(Math.pow(wrist.x - middleMCP.x, 2) + Math.pow(wrist.y - middleMCP.y, 2));
                // Map handSize to brush size. 
                const minSize = 2;
                const maxSize = 30;
                const minHand = 0.05;
                const maxHand = 0.25;

                const ratio = (handSize - minHand) / (maxHand - minHand);
                const clampedRatio = Math.max(0, Math.min(1, ratio));
                currentBrushSize = minSize + clampedRatio * (maxSize - minSize);
            }

            // Pinch Detection
            const pinchDist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
            const isPinching = pinchDist < 0.08; // Adjusted threshold

            if (isPinching) {
                if (!isDrawing) {
                    setIsDrawing(true);
                    setLastPoint({ x, y });
                    currentPathRef.current = [{ x, y }];

                    if (viewMode === '3d') {
                        // Map 0-1 to something like -10 to 10 for 3D
                        const z = (1 - indexTip.z) * 10 - 5; // z-axis depth
                        const x3d = (indexTip.x - 0.5) * 20;
                        const y3d = (0.5 - indexTip.y) * 20;
                        setActiveLine3D([{ x: x3d, y: y3d, z }]);
                    } else {
                        saveHistory();
                    }
                } else {
                    if (viewMode === '3d') {
                        const z = (1 - indexTip.z) * 10 - 5;
                        const x3d = (indexTip.x - 0.5) * 20;
                        const y3d = (0.5 - indexTip.y) * 20;
                        setActiveLine3D(prev => [...prev, { x: x3d, y: y3d, z }]);
                    } else {
                        if (activeTool === 'freehand') {
                            if (lastPoint) {
                                drawLine(drawingCtx, lastPoint, { x, y }, brushColor, currentBrushSize);
                            }
                        } else if (activeTool === 'shape') {
                            // ... existing shape logic
                        }
                    }

                    setLastPoint({ x, y });
                    currentPathRef.current.push({ x, y });
                }
            } else {
                if (isDrawing) {
                    setIsDrawing(false);
                    setLastPoint(null);

                    if (viewMode === '3d') {
                        setLines3D(prev => [...prev, { points: activeLine3D, color: brushColor, size: brushSize }]);
                        setActiveLine3D([]);
                    } else if (activeTool === 'shape') {
                        // ... existing shape logic
                    }
                    currentPathRef.current = [];
                }
            }

            // Cursor visualization
            ctx.beginPath();
            ctx.arc(x, y, currentBrushSize / 2, 0, 2 * Math.PI);
            ctx.fillStyle = brushColor;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }

        ctx.restore();
    }, [results, isDrawing, lastPoint, activeTool, brushColor, brushSize, isDynamicSize, showSkeleton, viewMode, activeLine3D]);

    // Initialize canvas size
    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && videoRef.current && drawingCanvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
                drawingCanvasRef.current.width = window.innerWidth;
                drawingCanvasRef.current.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    return (
        <div className="hand-canvas-container">
            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner"></div>
                    <p>Loading Hand Tracking Model...</p>
                </div>
            )}

            <video
                ref={videoRef}
                className="video-feed"
                style={{ display: 'none' }}
            />

            <canvas
                ref={drawingCanvasRef}
                className="drawing-canvas hidden"
            />

            <canvas
                ref={canvasRef}
                className="main-canvas"
            />

            <ControlPanel
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                brushColor={brushColor}
                setBrushColor={setBrushColor}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                isDynamicSize={isDynamicSize}
                setIsDynamicSize={setIsDynamicSize}
                showSkeleton={showSkeleton}
                setShowSkeleton={setShowSkeleton}
                clearCanvas={clearCanvas}
                undo={undo}
                saveImage={saveImage}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isNeon={isNeon}
                setIsNeon={setIsNeon}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                export3D={handleExport3D}
            />

            {viewMode === '3d' && (
                <Scene3D
                    ref={scene3DRef}
                    lines={lines3D}
                    activeLine={activeLine3D}
                    brushColor={brushColor}
                    brushSize={brushSize}
                    isNeon={isNeon}
                    showGrid={showGrid}
                />
            )}
        </div>
    );
};

export default HandCanvas;
