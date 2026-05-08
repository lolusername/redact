// Rectangles are stored as normalized 0..1 coordinates so overlays and canvas fills survive responsive resizing.
export function clamp(value, min = 0, max = 1) {
    return Math.min(Math.max(value, min), max);
}

export function addPadding(rect, paddingRatio) {
    const paddingX = rect.width * paddingRatio;
    const paddingY = rect.height * paddingRatio;

    return {
        x: rect.x - paddingX,
        y: rect.y - paddingY,
        width: rect.width + paddingX * 2,
        height: rect.height + paddingY * 2
    };
}

export function clipPixelRect(rect, dimensions) {
    // Padding can push face boxes outside the image; clip before normalization to keep every rect drawable.
    const left = clamp(rect.x, 0, dimensions.width);
    const top = clamp(rect.y, 0, dimensions.height);
    const right = clamp(rect.x + rect.width, 0, dimensions.width);
    const bottom = clamp(rect.y + rect.height, 0, dimensions.height);

    return {
        x: left,
        y: top,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top)
    };
}

export function normalizePixelRect(rect, dimensions) {
    if (!dimensions.width || !dimensions.height) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    const clipped = clipPixelRect(rect, dimensions);

    return {
        x: clipped.x / dimensions.width,
        y: clipped.y / dimensions.height,
        width: clipped.width / dimensions.width,
        height: clipped.height / dimensions.height
    };
}

export function denormalizeRect(rect, dimensions) {
    return {
        x: rect.x * dimensions.width,
        y: rect.y * dimensions.height,
        width: rect.width * dimensions.width,
        height: rect.height * dimensions.height
    };
}

export function rectangleFromPoints(start, end) {
    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y)
    };
}

export function isMeaningfulRectangle(rect, dimensions, minSize) {
    // Apply the threshold in displayed pixels so accidental taps and zero-size drags are ignored.
    return rect.width * dimensions.width > minSize && rect.height * dimensions.height > minSize;
}

export function normalizedPointFromClient(clientX, clientY, bounds) {
    return {
        x: clamp((clientX - bounds.left) / bounds.width),
        y: clamp((clientY - bounds.top) / bounds.height)
    };
}

export function detectionToRectangle(detection, dimensions, options) {
    const box = detection.detection.box;
    const paddedBox = addPadding(box, options.paddingRatio);
    const normalizedBox = normalizePixelRect(paddedBox, dimensions);

    return {
        id: options.id,
        source: 'detected',
        ...normalizedBox
    };
}

export function removeRectangleById(rectangles, id) {
    return rectangles.filter((rect) => rect.id !== id);
}
