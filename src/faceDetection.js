import { DETECTION_OPTIONS, MODEL_URL } from './config.js';

function getFaceApi(faceapi = window.faceapi) {
    if (!faceapi) {
        throw new Error('face-api.js is not available.');
    }

    return faceapi;
}

export async function loadFaceApiModels(faceapi = window.faceapi) {
    const api = getFaceApi(faceapi);

    await readyTensorflowBackend(api);

    await Promise.all([
        api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        api.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
    ]);
}

export async function detectFaces(image, faceapi = window.faceapi) {
    const api = getFaceApi(faceapi);
    const options = new api.SsdMobilenetv1Options(DETECTION_OPTIONS);

    return api.detectAllFaces(image, options).withFaceLandmarks();
}

export function resizeDetections(detections, dimensions, faceapi = window.faceapi) {
    return getFaceApi(faceapi).resizeResults(detections, dimensions);
}

async function readyTensorflowBackend(api) {
    if (!api.tf?.ready || !api.tf.setBackend) {
        return;
    }

    try {
        // Prefer WebGL for normal browsers, but fall back cleanly for environments where it is unavailable.
        await api.tf.setBackend('webgl');
        await api.tf.ready();
    } catch (error) {
        await api.tf.setBackend('cpu');
        await api.tf.ready();
    }
}
