const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const {submitLeaveRequest, getMyLeaveRequests, getAllLeaveRequests, updateLeaveRequestStatus, getPendingAdjustments, assignSubstituteTeacher, resolveAdjustment, getAvailableTeachers, getRejectedAdjustments, reassignAdjustment, respondToAdjustment} = require('../controllers/handleleave');

router.use(authenticateJWT);
router.post('/leave-request', submitLeaveRequest);
router.get('/my-leave-requests', getMyLeaveRequests);
router.get('/leave-request', getAllLeaveRequests);

router.patch('/leave-request/:id', updateLeaveRequestStatus);
router.get('/adjustments', getPendingAdjustments);
router.post('/adjustments/assign-substitute', assignSubstituteTeacher);
router.patch('/adjustments/:id/resolve', resolveAdjustment);
router.get('/teachers', getAvailableTeachers);
router.get('/rejected-adjustments', getRejectedAdjustments);
router.post('/adjustments/reassign', reassignAdjustment);
router.post('/adjustments/respond', respondToAdjustment);

module.exports = router;
