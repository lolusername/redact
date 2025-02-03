# Redact - Privacy-First Face Detection Tool

## What is Redact?

Redact is a privacy-focused web tool that helps protect people's identities in photos by automatically detecting and covering faces with black rectangles. It's designed for activists, journalists, community organizers, and anyone who needs to protect privacy in visual documentation.

### Key Features

- 🔒 **100% Private**: All processing happens in your browser - no images are ever uploaded to any server
- 🤖 **Automatic Face Detection**: Instantly detects faces in photos
- ✏️ **Manual Controls**: Add additional rectangles to cover other identifying information
- 🧹 **Metadata Removal**: Strips out all metadata (location, device info, timestamps) from images
- 💻 **Works Offline**: Can be used without an internet connection after initial load
- 🎯 **Easy to Use**: Simple, intuitive interface for both technical and non-technical users

## For Activists & Organizers

### Why Use Redact?

- **Protect Identities**: Keep participants safe when documenting actions and events
- **No Technical Knowledge Required**: Simple point-and-click interface
- **Complete Privacy**: Your sensitive images never leave your device
- **Quick Processing**: Instantly process photos during time-sensitive situations
- **Additional Protection**: Manually cover badges, signs, or other identifying features

### How to Use

1. Click "Choose an image" to select your photo
2. Wait for automatic face detection
3. Use "Draw Additional Rectangles" to cover other identifying information
4. Click "Download Redacted Image" to save the protected version

## For Developers & Technical Users

### Technical Stack

- Pure JavaScript implementation using Face-API.js
- Face detection powered by SSD MobileNet v1 neural network
- Face landmark detection for improved accuracy
- Canvas-based image manipulation
- No backend dependencies - everything runs client-side

### Key Components

- `face-api.js`: Provides face detection and landmark recognition
- HTML5 Canvas: Handles image manipulation and rectangle drawing
- Client-side image processing: Strips EXIF data during download

### Privacy Features

- No server communication after initial page load
- All image processing occurs in-browser
- Automatic cleanup of processed data when tab is closed
- No caching or storage of uploaded images

## Getting Started

1. Clone the repository
2. Open `index.html` in a modern web browser
3. Start using immediately - no build process required

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- JavaScript ES6+
- WebGL (for face detection)

## Contributing

Contributions are welcome! Key areas for improvement:
- Additional privacy features
- Performance optimizations
- Accessibility improvements
- Mobile responsiveness
- Offline-first enhancements

## License

[Add your chosen license here]

## Privacy Policy

This tool is designed with privacy as the primary concern:
- No data collection
- No analytics
- No cookies
- No server communication
- No data storage

## Support

[Add contact information or support channels here] 