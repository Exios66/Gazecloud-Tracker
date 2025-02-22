# Eye Tracking Recorder & Analysis Dashboard

A web-based eye tracking application using the GazeCloud API for real-time gaze tracking, data collection, and visualization.

## Features

- Real-time eye tracking using webcam
- Live data visualization with charts
- Session recording and playback
- Data export functionality
- Debug logging
- Responsive design
- Dark/light theme support

## Requirements

- Modern web browser (Chrome, Firefox, Edge recommended)
- Webcam access
- JavaScript enabled
- Stable internet connection

## Usage

1. Visit the [live demo](https://[your-username].github.io/Gazecloud-Tracker/)
2. Allow camera access when prompted
3. Click "Start Tracking" to begin
4. Follow the calibration process
5. View real-time tracking data and visualizations
6. Use "Stop Tracking" to end the session
7. Export data as needed

## Development

### Project Structure

```
.
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Stylesheet
├── js/
│   └── gazetracker.js     # Main application logic
└── .github/
    └── workflows/
        └── pages.yml      # GitHub Pages deployment
```

### Dependencies

- [GazeCloud API](https://api.gazerecorder.com/)
- [Chart.js](https://www.chartjs.org/)
- [PapaParse](https://www.papaparse.com/)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/[your-username]/Gazecloud-Tracker.git
   ```

2. Open `index.html` in your browser or use a local server:
   ```bash
   python -m http.server 8000
   ```

3. Visit `http://localhost:8000` in your browser

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari (limited support)

## Privacy Notice

This application:
- Requires camera access for eye tracking
- Stores data locally in your browser
- Does not send data to external servers (except for eye tracking processing)
- Can be used offline after initial load

## License

MIT License - feel free to use and modify for your own projects.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 