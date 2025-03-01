// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    const imageUpload = document.getElementById('imageUpload');
    const uploadedImage = document.getElementById('uploadedImage');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const manualControls = document.getElementById('manualControls');
    const drawModeButton = document.getElementById('drawMode');
    const finishDrawingButton = document.getElementById('finishDrawing');
    const imageContainer = document.querySelector('.image-container');

    // Drawing state variables
    let isDrawing = false;
    let startX, startY;
    let drawingMode = false;
    let currentCanvas = null;
    let drawnRectangles = [];
    let lastDetections = [];
    let isDeletionMode = false;

    // Load the required face-api.js models
    const MODEL_URL = 'lib/face-api/models/';
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
        ]);
    } catch (error) {
        console.error('Error loading models:', error);
        return;
    }

    // Handle image upload
    imageUpload.addEventListener('change', async (event) => {
        if (event.target.files.length === 0) return;

        // Reset everything
        if (currentCanvas) {
            currentCanvas.remove();
        }
        drawnRectangles = [];
        lastDetections = [];

        const file = event.target.files[0];
        uploadedImage.src = URL.createObjectURL(file);
        uploadedImage.style.display = 'block';
        loadingSpinner.style.display = 'block'; // Show loading spinner

        uploadedImage.onload = async () => {
            try {
                // Create canvas
                currentCanvas = document.createElement('canvas');
                
                // Match canvas size to displayed image size
                currentCanvas.width = uploadedImage.clientWidth;
                currentCanvas.height = uploadedImage.clientHeight;
                currentCanvas.style.width = uploadedImage.clientWidth + 'px';
                currentCanvas.style.height = uploadedImage.clientHeight + 'px';
                
                currentCanvas.style.position = 'absolute';
                currentCanvas.style.top = '0';
                currentCanvas.style.left = '0';
                imageContainer.appendChild(currentCanvas);

                // Add mouse event listeners
                currentCanvas.addEventListener('mousedown', startDrawing);
                currentCanvas.addEventListener('mousemove', draw);
                currentCanvas.addEventListener('mouseup', stopDrawing);

                // Add touch event listeners for mobile
                currentCanvas.addEventListener('touchstart', handleTouchStart);
                currentCanvas.addEventListener('touchmove', handleTouchMove);
                currentCanvas.addEventListener('touchend', handleTouchEnd);

                // Prevent scrolling while drawing
                currentCanvas.addEventListener('touchmove', function(e) {
                    if (isDrawing) {
                        e.preventDefault();
                    }
                }, { passive: false });

                // Detect faces
                const detections = await faceapi
                    .detectAllFaces(uploadedImage, new faceapi.SsdMobilenetv1Options({
                        minConfidence: 0.3,
                        maxResults: 100
                    }))
                    .withFaceLandmarks();

                lastDetections = faceapi.resizeResults(detections, {
                    width: currentCanvas.width,
                    height: currentCanvas.height
                });

                // Draw detections
                const ctx = currentCanvas.getContext('2d');
                drawAllRectangles(ctx);
                manualControls.style.display = 'block';

                // Show download button after processing
                showDownloadButton();
            } catch (error) {
                console.error('Error processing image:', error);
            } finally {
                loadingSpinner.style.display = 'none'; // Hide loading spinner
            }
        };
    });

    function drawAllRectangles(ctx) {
        ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
        
        // Remove existing overlays
        document.querySelectorAll('.rectangle-overlay').forEach(el => el.remove());
        
        let allRectangles = [];

        // Draw detected faces
        lastDetections.forEach((detection, index) => {
            const box = detection.detection.box;  // SsdMobilenetv1 format
            const padding = {
                x: box.width * 0.2,
                y: box.height * 0.2
            };
            const rect = {
                x: box.x - padding.x,
                y: box.y - padding.y,
                width: box.width + (padding.x * 2),
                height: box.height + (padding.y * 2),
                isAutoDetected: true,
                index: index
            };
            allRectangles.push(rect);
            ctx.fillStyle = 'black';
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            
            // Add overlay with delete button
            addOverlay(rect);
        });

        // Draw manual rectangles
        drawnRectangles.forEach((rect, index) => {
            rect.isAutoDetected = false;
            rect.index = index;
            allRectangles.push(rect);
            ctx.fillStyle = 'black';
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
            
            // Add overlay with delete button
            addOverlay(rect);
        });

        return allRectangles;
    }

    function addOverlay(rect) {
        const overlay = document.createElement('div');
        overlay.className = 'rectangle-overlay';
        overlay.style.position = 'absolute';
        overlay.style.left = `${rect.x / currentCanvas.width * 100}%`;
        overlay.style.top = `${rect.y / currentCanvas.height * 100}%`;
        overlay.style.width = `${rect.width / currentCanvas.width * 100}%`;
        overlay.style.height = `${rect.height / currentCanvas.height * 100}%`;

        // Add delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-button';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Delete';
        
        // Handle both click and touch for delete button
        const handleDelete = (e) => {
            e.stopPropagation();
            if (rect.isAutoDetected) {
                lastDetections.splice(rect.index, 1);
            } else {
                drawnRectangles.splice(rect.index, 1);
            }
            const ctx = currentCanvas.getContext('2d');
            drawAllRectangles(ctx);
        };
        
        deleteBtn.onclick = handleDelete;
        deleteBtn.ontouchend = handleDelete;

        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'rectangle-tooltip';
        tooltip.textContent = 'Click × to delete';

        overlay.appendChild(deleteBtn);
        overlay.appendChild(tooltip);
        imageContainer.appendChild(overlay);
    }

    function startDrawing(e) {
        if (!drawingMode) return;
        isDrawing = true;
        const rect = currentCanvas.getBoundingClientRect();
        const scaleX = currentCanvas.width / rect.width;
        const scaleY = currentCanvas.height / rect.height;
        startX = (e.clientX - rect.left) * scaleX;
        startY = (e.clientY - rect.top) * scaleY;
    }

    function draw(e) {
        if (!isDrawing || !drawingMode) return;

        const rect = currentCanvas.getBoundingClientRect();
        const scaleX = currentCanvas.width / rect.width;
        const scaleY = currentCanvas.height / rect.height;
        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        const ctx = currentCanvas.getContext('2d');
        drawAllRectangles(ctx);

        ctx.fillStyle = 'black';
        ctx.fillRect(
            Math.min(startX, currentX),
            Math.min(startY, currentY),
            Math.abs(currentX - startX),
            Math.abs(currentY - startY)
        );
    }

    function stopDrawing(e) {
        if (!isDrawing || !drawingMode) return;

        const rect = currentCanvas.getBoundingClientRect();
        const scaleX = currentCanvas.width / rect.width;
        const scaleY = currentCanvas.height / rect.height;
        const endX = (e.clientX - rect.left) * scaleX;
        const endY = (e.clientY - rect.top) * scaleY;

        const newRect = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY),
            isAutoDetected: false,
            index: drawnRectangles.length
        };

        drawnRectangles.push(newRect);
        isDrawing = false;

        // Redraw everything including the new rectangle and its overlay
        const ctx = currentCanvas.getContext('2d');
        drawAllRectangles(ctx);
    }

    // Touch event handlers
    function handleTouchStart(e) {
        if (!drawingMode) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = currentCanvas.getBoundingClientRect();
        const scaleX = currentCanvas.width / rect.width;
        const scaleY = currentCanvas.height / rect.height;
        
        isDrawing = true;
        startX = (touch.clientX - rect.left) * scaleX;
        startY = (touch.clientY - rect.top) * scaleY;
    }

    function handleTouchMove(e) {
        if (!isDrawing || !drawingMode) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = currentCanvas.getBoundingClientRect();
        const scaleX = currentCanvas.width / rect.width;
        const scaleY = currentCanvas.height / rect.height;
        
        const currentX = (touch.clientX - rect.left) * scaleX;
        const currentY = (touch.clientY - rect.top) * scaleY;

        const ctx = currentCanvas.getContext('2d');
        drawAllRectangles(ctx);

        ctx.fillStyle = 'black';
        ctx.fillRect(
            Math.min(startX, currentX),
            Math.min(startY, currentY),
            Math.abs(currentX - startX),
            Math.abs(currentY - startY)
        );
    }

    function handleTouchEnd(e) {
        if (!isDrawing || !drawingMode) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        const rect = currentCanvas.getBoundingClientRect();
        const scaleX = currentCanvas.width / rect.width;
        const scaleY = currentCanvas.height / rect.height;
        
        const endX = (touch.clientX - rect.left) * scaleX;
        const endY = (touch.clientY - rect.top) * scaleY;

        const newRect = {
            x: Math.min(startX, endX),
            y: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY),
            isAutoDetected: false,
            index: drawnRectangles.length
        };

        // Only add rectangle if it has a meaningful size
        if (newRect.width > 5 && newRect.height > 5) {
            drawnRectangles.push(newRect);
        }
        
        isDrawing = false;

        // Redraw everything including the new rectangle and its overlay
        const ctx = currentCanvas.getContext('2d');
        drawAllRectangles(ctx);
    }

    // Manual drawing controls
    drawModeButton.addEventListener('click', () => {
        drawingMode = true;
        drawModeButton.style.display = 'none';
        finishDrawingButton.style.display = 'inline-block';
        imageContainer.style.cursor = 'crosshair';
    });

    finishDrawingButton.addEventListener('click', () => {
        drawingMode = false;
        drawModeButton.style.display = 'inline-block';
        finishDrawingButton.style.display = 'none';
        imageContainer.style.cursor = 'default';
    });

    // Update the instructions in your HTML
    const instructions = document.querySelector('.instructions');
    instructions.textContent = 'Click and drag to draw rectangles. Hover over any rectangle to delete it.';

    function showDownloadButton() {
        document.getElementById('downloadControls').style.display = 'block';
    }

    function downloadImage() {
        // Create a new canvas that includes the image and rectangles
        const downloadCanvas = document.createElement('canvas');
        const ctx = downloadCanvas.getContext('2d');
        
        // Set canvas size to match the image
        downloadCanvas.width = uploadedImage.clientWidth;
        downloadCanvas.height = uploadedImage.clientHeight;
        
        // Draw the original image
        ctx.drawImage(uploadedImage, 0, 0, downloadCanvas.width, downloadCanvas.height);
        
        // Draw all rectangles
        lastDetections.forEach(detection => {
            const box = detection.detection.box;
            const padding = {
                x: box.width * 0.2,
                y: box.height * 0.2
            };
            ctx.fillStyle = 'black';
            ctx.fillRect(
                box.x - padding.x,
                box.y - padding.y,
                box.width + (padding.x * 2),
                box.height + (padding.y * 2)
            );
        });

        // Draw manual rectangles
        drawnRectangles.forEach(rect => {
            ctx.fillStyle = 'black';
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        });

        // Create download link with metadata-stripped PNG
        const link = document.createElement('a');
        link.download = 'redacted-image.png';
        
        // Convert to PNG and strip metadata by using toDataURL
        // PNG format is used because it's lossless and doesn't store metadata like JPEG does
        link.href = downloadCanvas.toDataURL('image/png');
        
        link.click();
    }

    // Add this with your other event listeners
    document.getElementById('downloadButton').addEventListener('click', downloadImage);
}); 