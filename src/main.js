import './styles.css';
import { startApp } from './app/main.js';

startApp().catch((error) => {
    console.error('Error starting app:', error);
});
