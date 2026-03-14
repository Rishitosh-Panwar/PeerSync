const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const videoController = require('../controllers/videoController');

// URL: http://localhost:5000/api/video/process-ai
=======
// Import the controller logic we wrote earlier
const videoController = require('../controllers/videoController');

// Define the POST route for AI processing
// The full URL will be: http://localhost:5000/api/video/process-ai
>>>>>>> 79673486202ef0ecd46bdb24477c3cf41c718e4b
router.post('/process-ai', videoController.processSessionAI);

module.exports = router;