const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

// URL: http://localhost:5000/api/video/process-ai
router.post('/process-ai', videoController.processSessionAI);

module.exports = router;