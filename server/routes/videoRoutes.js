const express = require('express');
const router = express.Router();
// Import the controller logic we wrote earlier
const videoController = require('../controllers/videoController');

// Define the POST route for AI processing
// The full URL will be: http://localhost:5000/api/video/process-ai
router.post('/process-ai', videoController.processSessionAI);

module.exports = router;