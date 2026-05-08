import { REDACTION_COLOR } from './config.js';
import { denormalizeRect } from './geometry.js';

export function getImageDisplaySize(image) {
    return {
        width: image.clientWidth,
        height: image.clientHeight
    };
}

export function syncCanvasToImage(canvas, image) {
    const dimensions = getImageDisplaySize(image);

    // The backing store must match the displayed size; CSS-only sizing would scale the redactions.
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;

    return dimensions;
}

export function drawRedactions(canvas, rectangles, draftRectangle = null) {
    const context = canvas.getContext('2d');
    const dimensions = {
        width: canvas.width,
        height: canvas.height
    };

    context.clearRect(0, 0, dimensions.width, dimensions.height);

    [...rectangles, draftRectangle].filter(Boolean).forEach((rect) => {
        const pixelRect = denormalizeRect(rect, dimensions);
        context.fillStyle = REDACTION_COLOR;
        context.fillRect(pixelRect.x, pixelRect.y, pixelRect.width, pixelRect.height);
    });
}

export function createRedactedDataUrl(image, rectangles) {
    // Rendering through a fresh canvas creates the flattened PNG and strips the source file metadata.
    const canvas = document.createElement('canvas');
    const dimensions = getImageDisplaySize(image);
    const context = canvas.getContext('2d');

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

    rectangles.forEach((rect) => {
        const pixelRect = denormalizeRect(rect, dimensions);
        context.fillStyle = REDACTION_COLOR;
        context.fillRect(pixelRect.x, pixelRect.y, pixelRect.width, pixelRect.height);
    });

    return canvas.toDataURL('image/png');
}
