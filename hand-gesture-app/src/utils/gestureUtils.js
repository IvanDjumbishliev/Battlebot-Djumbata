
// Simple geometry helpers
const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const getPathLength = (path) => {
    let len = 0;
    for (let i = 1; i < path.length; i++) {
        len += distance(path[i - 1], path[i]);
    }
    return len;
};

const getBoundingBox = (path) => {
    if (path.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of path) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
};

export const detectShape = (path) => {
    if (path.length < 10) return null; // Not enough points

    const bbox = getBoundingBox(path);
    const pathLen = getPathLength(path);
    const start = path[0];
    const end = path[path.length - 1];

    // Check if closed (start is close to end)
    const closureDist = distance(start, end);
    const isClosed = closureDist < bbox.width * 0.2; // roughly 20% of width

    if (isClosed) {
        // Circle vs Square detection
        // Circle Area = pi * r^2. BBox Area = (2r)^2 = 4r^2. Ratio = pi/4 ~= 0.785
        // But path is just the perimeter.
        // Let's use simpler heuristic: Average distance from center.
        const centerX = bbox.minX + bbox.width / 2;
        const centerY = bbox.minY + bbox.height / 2;
        const center = { x: centerX, y: centerY };

        let totalDist = 0;
        for (const p of path) {
            totalDist += distance(p, center);
        }
        const avgDist = totalDist / path.length;

        // Variance of distance from center
        let variance = 0;
        for (const p of path) {
            variance += Math.pow(distance(p, center) - avgDist, 2);
        }
        variance /= path.length;

        // Normalize variance by radius
        const normalizedVariance = variance / (avgDist * avgDist);

        if (normalizedVariance < 0.1) {
            return 'circle';
        } else {
            // Might be a square or triangle or just mess
            // Square check: Check if points fill roughly the bbox area? No.
            // Check for corners?
            // For now, if not circle and closed, let's call it a square if it has enough corners.
            // But let's just return 'square' as fallback for closed shapes for now, or null.
            return 'rectangle';
        }
    } else {
        // Line check
        // Determine linearity using regression or simply distance(start, end) ~= pathLen
        if (distance(start, end) > pathLen * 0.9) {
            return 'line';
        }
    }

    return null;
};
