import '@mediapipe/drawing_utils';
import '@mediapipe/hands';

export const drawHandSkeleton = (ctx, results) => {
  if (!results.multiHandLandmarks) return;

  const drawConnectors = window.drawConnectors;
  const drawLandmarks = window.drawLandmarks;
  const HAND_CONNECTIONS = window.HAND_CONNECTIONS;

  for (const landmarks of results.multiHandLandmarks) {
    if (drawConnectors && HAND_CONNECTIONS) {
      drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 5
      });
    }
    if (drawLandmarks) {
      drawLandmarks(ctx, landmarks, {
        color: '#FF0000',
        lineWidth: 2
      });
    }
  }
};

export const drawLine = (ctx, start, end, color, width) => {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
};
