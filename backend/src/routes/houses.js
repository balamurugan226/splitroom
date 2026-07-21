'use strict';

const express = require('express');
const router = express.Router();
const {
  createHouse,
  getMyHouse,
  getHouseById,
  updateHouse,
  joinHouse,
  leaveHouse,
  getHouseMembers,
  removeMember,
  updateMemberRole,
  regenerateInviteCode,
  getNotices,
  createNotice,
  deleteNotice,
} = require('../controllers/houseController');

// All house routes require auth (applied in app.js)

router.get('/my-house', getMyHouse);
router.post('/create', createHouse);
router.post('/join', joinHouse);

router.get('/notices', getNotices);
router.post('/notices', createNotice);
router.delete('/notices/:id', deleteNotice);

router.get('/:id', getHouseById);
router.put('/:id', updateHouse);
router.delete('/:id/leave', leaveHouse);

router.get('/:id/members', getHouseMembers);
router.delete('/:id/members/:memberId', removeMember);
router.put('/:id/members/:memberId/role', updateMemberRole);

router.post('/:id/regenerate-invite', regenerateInviteCode);

module.exports = router;
