const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getThreads,
  createThread,
  getThreadMessages,
  sendMessage,
  getNotifications,
  markNotificationRead,
  getAppointments,
  bookAppointment,
  updateAppointmentStatus
} = require('../controllers/communicationsController');

router.use(protect);

router.get('/threads', getThreads);
router.post('/threads', createThread);
router.get('/threads/:threadId/messages', getThreadMessages);
router.post('/threads/:threadId/messages', sendMessage);

router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

router.get('/appointments', getAppointments);
router.post('/appointments', bookAppointment);
router.put('/appointments/:id/status', updateAppointmentStatus);

module.exports = router;
