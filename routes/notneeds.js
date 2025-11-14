const express = require('express');
const Notneed = require('../models/notneed');
const User = require('../models/user');
const router = express.Router();

// GET /api/notneeds - Get all notneeds
router.get('/', async (req, res) => {
  try {
    const notneeds = await Notneed.findAll({
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    res.json(notneeds);
  } catch (error) {
    console.error('Error fetching notneeds:', error);
    res.status(500).json({ error: 'Failed to fetch notneeds' });
  }
});

// GET /api/notneeds/user/:userId - Get notneeds for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notneeds = await Notneed.findAll({
      where: { userId },
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    res.json(notneeds);
  } catch (error) {
    console.error('Error fetching user notneeds:', error);
    res.status(500).json({ error: 'Failed to fetch user notneeds' });
  }
});

// POST /api/notneeds - Create a new notneed
router.post('/', async (req, res) => {
  try {
    const { hate, userId } = req.body;
    
    if (!hate || !userId) {
      return res.status(400).json({ error: 'Hate and userId are required' });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newNotneed = await Notneed.create({ hate, userId });
    
    // Return the notneed with user info
    const notneedWithUser = await Notneed.findByPk(newNotneed.id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    
    res.status(201).json(notneedWithUser);
  } catch (error) {
    console.error('Error creating notneed:', error);
    res.status(500).json({ error: 'Failed to create notneed' });
  }
});

// PUT /api/notneeds/:id - Update a notneed
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hate } = req.body;
    
    if (!hate) {
      return res.status(400).json({ error: 'Hate is required' });
    }

    const notneedRecord = await Notneed.findByPk(id);
    if (!notneedRecord) {
      return res.status(404).json({ error: 'Notneed not found' });
    }

    await notneedRecord.update({ hate });
    
    // Return updated notneed with user info
    const updatedNotneed = await Notneed.findByPk(id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    
    res.json(updatedNotneed);
  } catch (error) {
    console.error('Error updating notneed:', error);
    res.status(500).json({ error: 'Failed to update notneed' });
  }
});

// DELETE /api/notneeds/:id - Delete a notneed
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const notneed = await Notneed.findByPk(id);
    if (!notneed) {
      return res.status(404).json({ error: 'Notneed not found' });
    }

    await notneed.destroy();
    res.json({ message: 'Notneed deleted successfully' });
  } catch (error) {
    console.error('Error deleting notneed:', error);
    res.status(500).json({ error: 'Failed to delete notneed' });
  }
});

module.exports = router;