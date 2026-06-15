const express = require('express');
const { getConfig, updateConfig } = require('../controllers/banerConfigController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/banner-config', getConfig);
router.put('/banner-config', authMiddleware, updateConfig);

module.exports = router;