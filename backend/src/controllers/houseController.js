'use strict';

const House = require('../models/House');
const User = require('../models/User');

function generateInviteCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function uniqueInviteCode() {
  let code;
  let tries = 0;
  do {
    code = generateInviteCode(8);
    const existing = await House.findOne({ invite_code: code });
    if (!existing) return code;
    tries++;
  } while (tries < 10);
  throw new Error('Failed to generate a unique invite code after 10 attempts.');
}

/**
 * POST /api/houses/create
 */
async function createHouse(req, res) {
  try {
    const userId = req.user.id;
    const { name, address, monthly_rent, security_deposit } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'House name is required.' });
    }
    if (monthly_rent === undefined || monthly_rent === null || isNaN(Number(monthly_rent))) {
      return res.status(400).json({ success: false, message: 'monthly_rent is required and must be a number.' });
    }

    const invite_code = await uniqueInviteCode();

    const house = new House({
      name: name.trim(),
      address: address ? address.trim() : null,
      monthly_rent: Number(monthly_rent),
      security_deposit: security_deposit ? Number(security_deposit) : 0,
      invite_code,
      createdBy: userId,
      members: [userId]
    });

    await house.save();
    const populatedHouse = await House.findById(house._id).populate('members', 'name email avatar phone');

    return res.status(201).json({
      success: true,
      message: 'House created successfully.',
      house: populatedHouse,
    });
  } catch (err) {
    console.error('[createHouse]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/houses/my-house
 */
async function getMyHouse(req, res) {
  try {
    const userId = req.user.id;
    const houses = await House.find({ members: userId }).populate('members', 'name email avatar phone');

    if (houses.length === 0) {
      return res.status(200).json({ success: true, houses: [] });
    }

    const formattedHouses = houses.map(h => {
      const obj = h.toObject();
      obj.member_count = obj.members.length;
      return obj;
    });

    return res.status(200).json({ success: true, houses: formattedHouses });
  } catch (err) {
    console.error('[getMyHouse]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/houses/:id
 */
async function getHouseById(req, res) {
  try {
    const userId = req.user.id;
    const houseId = req.params.id;

    const house = await House.findOne({ _id: houseId, members: userId }).populate('members', 'name email avatar phone');
    if (!house) {
      return res.status(404).json({ success: false, message: 'House not found or you are not a member.' });
    }

    const obj = house.toObject();
    obj.member_count = obj.members.length;

    return res.status(200).json({
      success: true,
      house: obj,
    });
  } catch (err) {
    console.error('[getHouseById]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * PUT /api/houses/:id
 */
async function updateHouse(req, res) {
  try {
    const userId = req.user.id;
    const houseId = req.params.id;
    const { name, address, monthly_rent, security_deposit } = req.body;

    const house = await House.findOne({ _id: houseId, members: userId });
    if (!house) {
      return res.status(404).json({ success: false, message: 'House not found or you are not a member.' });
    }

    if (house.createdBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only owner can update the house.' });
    }

    if (name) house.name = name.trim();
    if (address !== undefined) house.address = address;
    if (monthly_rent !== undefined) house.monthly_rent = Number(monthly_rent);
    if (security_deposit !== undefined) house.security_deposit = Number(security_deposit);

    await house.save();

    return res.status(200).json({
      success: true,
      message: 'House updated successfully.',
      house,
    });
  } catch (err) {
    console.error('[updateHouse]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * POST /api/houses/join
 */
async function joinHouse(req, res) {
  try {
    const userId = req.user.id;
    const { invite_code } = req.body;

    if (!invite_code || !invite_code.trim()) {
      return res.status(400).json({ success: false, message: 'Invite code is required.' });
    }

    const house = await House.findOne({ invite_code: invite_code.trim().toUpperCase() });
    if (!house) {
      return res.status(404).json({ success: false, message: 'Invalid invite code. House not found.' });
    }

    // Fix: use .some() with .toString() for proper ObjectId comparison
    if (house.members.some(m => m.toString() === userId)) {
      return res.status(409).json({ success: false, message: 'You are already a member of this house.' });
    }

    house.members.push(userId);
    await house.save();

    const populatedHouse = await House.findById(house._id).populate('members', 'name email avatar phone');

    return res.status(200).json({
      success: true,
      message: `Successfully joined house "${house.name}".`,
      house: populatedHouse,
    });
  } catch (err) {
    console.error('[joinHouse]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * DELETE /api/houses/:id/leave
 */
async function leaveHouse(req, res) {
  try {
    const userId = req.user.id;
    const houseId = req.params.id;

    const house = await House.findById(houseId);
    if (!house) {
      return res.status(404).json({ success: false, message: 'House not found.' });
    }

    // Fix: use .some() with .toString() for proper ObjectId comparison
    if (!house.members.some(m => m.toString() === userId)) {
      return res.status(404).json({ success: false, message: 'You are not a member of this house.' });
    }

    if (house.createdBy.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot leave the house. Transfer ownership or delete the house first.',
      });
    }

    house.members = house.members.filter(m => m.toString() !== userId);
    await house.save();

    return res.status(200).json({
      success: true,
      message: `You have successfully left the house "${house.name}".`,
    });
  } catch (err) {
    console.error('[leaveHouse]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * GET /api/houses/:id/members
 */
async function getHouseMembers(req, res) {
  try {
    const userId = req.user.id;
    const houseId = req.params.id;

    const house = await House.findOne({ _id: houseId, members: userId }).populate('members', 'name email avatar phone');
    if (!house) {
      return res.status(403).json({ success: false, message: 'You are not a member of this house.' });
    }

    const members = house.members.map(m => {
      const obj = m.toObject();
      obj.role = house.createdBy.toString() === m._id.toString() ? 'owner' : 'member';
      return obj;
    });

    return res.status(200).json({
      success: true,
      members,
      count: members.length,
    });
  } catch (err) {
    console.error('[getHouseMembers]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * DELETE /api/houses/:id/members/:memberId
 */
async function removeMember(req, res) {
  try {
    const userId = req.user.id;
    const houseId = req.params.id;
    const targetUserId = req.params.memberId;

    const house = await House.findOne({ _id: houseId, members: userId });
    if (!house) {
      return res.status(403).json({ success: false, message: 'You are not a member of this house.' });
    }
    if (house.createdBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only owner can remove members.' });
    }

    // Fix: use .some() with .toString() for proper ObjectId comparison
    if (!house.members.some(m => m.toString() === targetUserId)) {
      return res.status(404).json({ success: false, message: 'Member not found in this house.' });
    }

    if (house.createdBy.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the owner of the house.' });
    }

    house.members = house.members.filter(m => m.toString() !== targetUserId);
    await house.save();

    return res.status(200).json({
      success: true,
      message: 'Member has been removed from the house.',
    });
  } catch (err) {
    console.error('[removeMember]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * PUT /api/houses/:id/members/:memberId/role
 */
async function updateMemberRole(req, res) {
  try {
    return res.status(400).json({ success: false, message: 'Roles are simplified in this version.' });
  } catch (err) {
    console.error('[updateMemberRole]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

/**
 * POST /api/houses/:id/regenerate-invite
 */
async function regenerateInviteCode(req, res) {
  try {
    const userId = req.user.id;
    const houseId = req.params.id;

    const house = await House.findOne({ _id: houseId, members: userId });
    if (!house) {
      return res.status(403).json({ success: false, message: 'You are not a member of this house.' });
    }
    if (house.createdBy.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Only owner can regenerate the invite code.' });
    }

    const newCode = await uniqueInviteCode();
    house.invite_code = newCode;
    await house.save();

    return res.status(200).json({
      success: true,
      message: 'Invite code regenerated successfully.',
      invite_code: newCode,
    });
  } catch (err) {
    console.error('[regenerateInviteCode]', err);
    return res.status(500).json({ success: false, message: 'Server error.', error: err.message });
  }
}

module.exports = {
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
};
