const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { getNotifications, respondToNotification } = require('../controllers/notifications');

router.use(authenticateJWT);

router.get('/notifications', getNotifications);
router.post('/notifications/respond', respondToNotification);

module.exports = router; 