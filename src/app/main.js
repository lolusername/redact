import { createRedactedDataUrl, drawRedactions, getImageDisplaySize, syncCanvasToImage } from '../canvas.js';
import { DOWNLOAD_FILENAME, FACE_PADDING_RATIO, MIN_RECTANGLE_SIZE } from '../config.js';
import { detectFaces, loadFaceApiModels, resizeDetections } from '../faceDetection.js';
import {
    detectionToRectangle,
    isMeaningfulRectangle,
    normalizedPointFromClient,
    rectangleFromPoints,
    removeRectangleById
} from '../geometry.js';
import { createStore } from '../store.js';

const initialState = {
    imageUrl: null,
    isLoading: false,
    isReady: false,
    isDrawingMode: false,
    drawStart: null,
    draftRectangle: null,
    rectangles: []
};

let nextManualId = 1;

export async function startApp() {
    const elements = getElements();
    const canvas = document.createElement('canvas');
    let activeObjectUrl = null;
    // Guards the async upload pipeline so a stale detection result cannot overwrite a newer image.
    let uploadToken = 0;
    let store;

    elements.imageContainer.appendChild(canvas);

    const deleteRectangle = (id) => {
        store.setState((state) => ({
            ...state,
            rectangles: removeRectangleById(state.rectangles, id)
        }));
    };

    store = createStore(initialState, (state) => {
        render(elements, canvas, state, deleteRectangle);
    });

    // Start model loading once; uploads await the same promise when they reach face detection.
    const modelsReady = loadFaceApiModels();
    modelsReady.catch((error) => {
        console.error('Error loading models:', error);
    });

    elements.imageUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];

        if (!file) {
            return;
        }

        const token = uploadToken + 1;
        uploadToken = token;

        if (activeObjectUrl) {
            URL.revokeObjectURL(activeObjectUrl);
        }

        activeObjectUrl = URL.createObjectURL(file);
        elements.uploadedImage.src = activeObjectUrl;

        store.setState({
            imageUrl: activeObjectUrl,
            isLoading: true,
            isReady: false,
            isDrawingMode: false,
            drawStart: null,
            draftRectangle: null,
            rectangles: []
        });

        try {
            await waitForImage(elements.uploadedImage);

            // Image decode, model loading, and detection can each finish out of order after rapid uploads.
            if (token !== uploadToken) {
                return;
            }

            const dimensions = syncCanvasToImage(canvas, elements.uploadedImage);
            await modelsReady;

            if (token !== uploadToken) {
                return;
            }

            const detections = await detectFaces(elements.uploadedImage);
            const resizedDetections = resizeDetections(detections, dimensions);
            const rectangles = resizedDetections.map((detection, index) => detectionToRectangle(detection, dimensions, {
                id: `detected-${token}-${index}`,
                paddingRatio: FACE_PADDING_RATIO
            }));

            if (token !== uploadToken) {
                return;
            }

            store.setState({
                isLoading: false,
                isReady: true,
                rectangles
            });
        } catch (error) {
            if (token === uploadToken) {
                console.error('Error processing image:', error);
                store.setState({
                    isLoading: false,
                    isReady: false
                });
            }
        }
    });

    elements.drawModeButton.addEventListener('click', () => {
        store.setState({
            isDrawingMode: true,
            drawStart: null,
            draftRectangle: null
        });
    });

    elements.finishDrawingButton.addEventListener('click', () => {
        store.setState({
            isDrawingMode: false,
            drawStart: null,
            draftRectangle: null
        });
    });

    canvas.addEventListener('pointerdown', (event) => {
        const state = store.getState();

        if (!state.isDrawingMode || !state.isReady) {
            return;
        }

        event.preventDefault();
        // Keeps drawing coherent if the pointer leaves the canvas before pointerup.
        canvas.setPointerCapture(event.pointerId);

        store.setState({
            drawStart: getPointerPoint(event, canvas),
            draftRectangle: null
        });
    });

    canvas.addEventListener('pointermove', (event) => {
        const state = store.getState();

        if (!state.isDrawingMode || !state.drawStart) {
            return;
        }

        event.preventDefault();
        store.setState({
            draftRectangle: rectangleFromPoints(state.drawStart, getPointerPoint(event, canvas))
        });
    });

    canvas.addEventListener('pointerup', (event) => {
        completeDrawing(event, canvas, store);
    });

    canvas.addEventListener('pointercancel', (event) => {
        completeDrawing(event, canvas, store);
    });

    elements.downloadButton.addEventListener('click', () => {
        downloadImage(elements.uploadedImage, store.getState().rectangles);
    });

    // Rectangles are normalized, so a resize only needs to resync the canvas and redraw.
    const resizeObserver = new ResizeObserver(() => {
        const state = store.getState();

        if (state.imageUrl) {
            render(elements, canvas, state, deleteRectangle);
        }
    });

    resizeObserver.observe(elements.uploadedImage);

    window.addEventListener('beforeunload', () => {
        if (activeObjectUrl) {
            URL.revokeObjectURL(activeObjectUrl);
        }
    });

    render(elements, canvas, store.getState(), deleteRectangle);
}

function getElements() {
    return {
        imageUpload: document.getElementById('imageUpload'),
        uploadedImage: document.getElementById('uploadedImage'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        manualControls: document.getElementById('manualControls'),
        downloadControls: document.getElementById('downloadControls'),
        drawModeButton: document.getElementById('drawMode'),
        finishDrawingButton: document.getElementById('finishDrawing'),
        downloadButton: document.getElementById('downloadButton'),
        imageContainer: document.querySelector('.image-container')
    };
}

function waitForImage(image) {
    if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const cleanUp = () => {
            image.removeEventListener('load', handleLoad);
            image.removeEventListener('error', handleError);
        };
        const handleLoad = () => {
            cleanUp();
            resolve();
        };
        const handleError = () => {
            cleanUp();
            reject(new Error('Image failed to load.'));
        };

        image.addEventListener('load', handleLoad);
        image.addEventListener('error', handleError);
    });
}

function render(elements, canvas, state, onDelete) {
    const hasImage = Boolean(state.imageUrl);

    // Keep DOM visibility and canvas output derived from the store instead of scattered mutations.
    elements.uploadedImage.style.display = hasImage ? 'block' : 'none';
    elements.loadingSpinner.style.display = state.isLoading ? 'block' : 'none';
    elements.manualControls.style.display = state.isReady ? 'block' : 'none';
    elements.downloadControls.style.display = state.isReady ? 'block' : 'none';
    elements.drawModeButton.style.display = state.isDrawingMode ? 'none' : 'inline-block';
    elements.finishDrawingButton.style.display = state.isDrawingMode ? 'inline-block' : 'none';
    elements.imageContainer.style.cursor = state.isDrawingMode ? 'crosshair' : 'default';

    if (hasImage) {
        syncCanvasToImage(canvas, elements.uploadedImage);
    }

    drawRedactions(canvas, state.rectangles, state.draftRectangle);
    renderOverlays(elements.imageContainer, state.rectangles, onDelete);
}

function renderOverlays(imageContainer, rectangles, onDelete) {
    imageContainer.querySelectorAll('.rectangle-overlay').forEach((overlay) => overlay.remove());

    rectangles.forEach((rect) => {
        const overlay = document.createElement('div');
        const deleteButton = document.createElement('div');
        const tooltip = document.createElement('div');

        overlay.className = 'rectangle-overlay';
        overlay.style.left = `${rect.x * 100}%`;
        overlay.style.top = `${rect.y * 100}%`;
        overlay.style.width = `${rect.width * 100}%`;
        overlay.style.height = `${rect.height * 100}%`;

        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '\u00d7';
        deleteButton.title = 'Delete';

        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            onDelete(rect.id);
        });

        tooltip.className = 'rectangle-tooltip';
        tooltip.textContent = 'Click \u00d7 to delete';

        overlay.appendChild(deleteButton);
        overlay.appendChild(tooltip);
        imageContainer.appendChild(overlay);
    });
}

function getPointerPoint(event, canvas) {
    return normalizedPointFromClient(event.clientX, event.clientY, canvas.getBoundingClientRect());
}

function completeDrawing(event, canvas, store) {
    const state = store.getState();

    if (!state.isDrawingMode || !state.drawStart) {
        return;
    }

    event.preventDefault();

    if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }

    const rectangle = rectangleFromPoints(state.drawStart, getPointerPoint(event, canvas));
    const dimensions = getImageDisplaySize(canvas);
    const nextRectangle = {
        id: `manual-${nextManualId}`,
        source: 'manual',
        ...rectangle
    };

    nextManualId += 1;

    store.setState((currentState) => ({
        ...currentState,
        drawStart: null,
        draftRectangle: null,
        rectangles: isMeaningfulRectangle(rectangle, dimensions, MIN_RECTANGLE_SIZE)
            ? [...currentState.rectangles, nextRectangle]
            : currentState.rectangles
    }));
}

function downloadImage(image, rectangles) {
    const link = document.createElement('a');
    link.download = DOWNLOAD_FILENAME;
    link.href = createRedactedDataUrl(image, rectangles);
    link.click();
}
