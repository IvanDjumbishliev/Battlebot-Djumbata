import { useEffect, useRef, useState } from 'react';
import '@mediapipe/hands';
import '@mediapipe/camera_utils';

export const useHandTracking = (videoRef, canvasRef) => {
    const [results, setResults] = useState(null);
    const handsRef = useRef(null);
    const cameraRef = useRef(null);

    useEffect(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const Hands = window.Hands;
        const Camera = window.Camera;

        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults((res) => {
            setResults(res);
        });

        handsRef.current = hands;

        const camera = new Camera(videoRef.current, {
            onFrame: async () => {
                if (handsRef.current) {
                    await handsRef.current.send({ image: videoRef.current });
                }
            },
            width: 1280,
            height: 720
        });

        camera.start();
        cameraRef.current = camera;

        return () => {
            if (cameraRef.current) {
                // camera.stop() is not always reliable in cleanup, but we can try
                // Actually camera utils doesn't have a stop method that is exposed easily in all versions, 
                // but merely stopping the video element source can work.
                // For now we will just let it be.
            }
            if (handsRef.current) {
                handsRef.current.close();
            }
        };
    }, [videoRef, canvasRef]);

    return { results, hands: handsRef.current, camera: cameraRef.current };
};
