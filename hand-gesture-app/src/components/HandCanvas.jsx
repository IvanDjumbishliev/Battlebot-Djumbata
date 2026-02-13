import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useHandTracking } from '../hooks/useHandTracking';
import { drawHandSkeleton, drawLine } from '../utils/drawingUtils';
import { detectShape } from '../utils/gestureUtils';
import ControlPanel from './ControlPanel';
import '../styles/HandCanvas.css';

const HandCanvas = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const drawingCanvasRef = useRef(null);
    const { results } = useHandTracking(videoRef, canvasRef);

    // UI State
    const [activeTool, setActiveTool] = useState('freehand'); // 'freehand' | 'shape'
    const [brushColor, setBrushColor] = useState('#00FF00');
    const [brushSize, setBrushSize] = useState(5);
    const [isDynamicSize, setIsDynamicSize] = useState(false);
    const [showSkeleton, setShowSkeleton] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPoint, setLastPoint] = useState(null);
    const currentPathRef = useRef([]); // Use ref to avoid re-renders on every point

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
        if (historyRef.current.length === 0 || !drawingCanvasRef.current) return;
        const ctx = drawingCanvasRef.current.getContext('2d');
        const previousState = historyRef.current.pop();
        if (previousState) {
            ctx.putImageData(previousState, 0, 0);
        }
    };

    const clearCanvas = () => {
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
            const isPinching = pinchDist < 0.1; // Threshold

            if (isPinching) {
                if (!isDrawing) {
                    // Start Drawing
                    setIsDrawing(true);
                    setLastPoint({ x, y });
                    currentPathRef.current = [{ x, y }];
                    saveHistory();
                } else {
                    // Continue Drawing
                    if (activeTool === 'freehand') {
                        if (lastPoint) {
                            drawLine(drawingCtx, lastPoint, { x, y }, brushColor, currentBrushSize);
                        }
                    } else if (activeTool === 'shape') {
                        // Shape visualization
                        ctx.beginPath();
                        ctx.strokeStyle = brushColor;
                        ctx.lineWidth = brushSize;
                        if (currentPathRef.current.length > 0) {
                            const start = currentPathRef.current[0];
                            ctx.moveTo(start.x, start.y);
                            for (let i = 1; i < currentPathRef.current.length; i++) {
                                ctx.lineTo(currentPathRef.current[i].x, currentPathRef.current[i].y);
                            }
                            ctx.stroke();
                        }
                    }

                    setLastPoint({ x, y });
                    currentPathRef.current.push({ x, y });
                }
            } else {
                if (isDrawing) {
                    // Stop Drawing (Release)
                    setIsDrawing(false);
                    setLastPoint(null);

                    if (activeTool === 'shape') {
                        // Detect Shape
                        const shape = detectShape(currentPathRef.current);
                        console.log("Detected Shape:", shape);

                        if (shape) {
                            drawingCtx.beginPath();
                            drawingCtx.strokeStyle = brushColor;
                            drawingCtx.lineWidth = brushSize;

                            // Perfect shape drawing
                            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                            for (const p of currentPathRef.current) {
                                if (p.x < minX) minX = p.x;
                                if (p.x > maxX) maxX = p.x;
                                if (p.y < minY) minY = p.y;
                                if (p.y > maxY) maxY = p.y;
                            }
                            const w = maxX - minX;
                            const h = maxY - minY;
                            const cx = minX + w / 2;
                            const cy = minY + h / 2;

                            if (shape === 'circle') {
                                const radius = Math.max(w, h) / 2;
                                drawingCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
                                drawingCtx.stroke();
                            } else if (shape === 'rectangle') {
                                drawingCtx.strokeRect(minX, minY, w, h);
                            } else if (shape === 'line') {
                                const start = currentPathRef.current[0];
                                const end = currentPathRef.current[currentPathRef.current.length - 1];
                                drawingCtx.moveTo(start.x, start.y);
                                drawingCtx.lineTo(end.x, end.y);
                                drawingCtx.stroke();
                            }
                        } else {
                            // Fallback
                            drawingCtx.beginPath();
                            drawingCtx.strokeStyle = brushColor;
                            drawingCtx.lineWidth = brushSize;
                            if (currentPathRef.current.length > 0) {
                                const start = currentPathRef.current[0];
                                drawingCtx.moveTo(start.x, start.y);
                                for (let i = 1; i < currentPathRef.current.length; i++) {
                                    drawingCtx.lineTo(currentPathRef.current[i].x, currentPathRef.current[i].y);
                                }
                                drawingCtx.stroke();
                            }
                        }
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
    }, [results, isDrawing, lastPoint, activeTool, brushColor, brushSize, isDynamicSize, showSkeleton]);

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
            />
        </div>
    );
};

export default HandCanvas;
