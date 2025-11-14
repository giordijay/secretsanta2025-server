const express = require('express');
const Wish = require('../models/wish');
const User = require('../models/user');
const router = express.Router();

// GET /api/wishes - Get all wishes
router.get('/', async (req, res) => {
  try {
    const wishes = await Wish.findAll({
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    res.json(wishes);
  } catch (error) {
    console.error('Error fetching wishes:', error);
    res.status(500).json({ error: 'Failed to fetch wishes' });
  }
});

// GET /api/wishes/user/:userId - Get wishes for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const wishes = await Wish.findAll({
      where: { userId },
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    res.json(wishes);
  } catch (error) {
    console.error('Error fetching user wishes:', error);
    res.status(500).json({ error: 'Failed to fetch user wishes' });
  }
});

// POST /api/wishes - Create a new wish
router.post('/', async (req, res) => {
  try {
    const { wish, userId } = req.body;
    
    if (!wish || !userId) {
      return res.status(400).json({ error: 'Wish and userId are required' });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newWish = await Wish.create({ wish, userId });
    
    // Return the wish with user info
    const wishWithUser = await Wish.findByPk(newWish.id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    
    res.status(201).json(wishWithUser);
  } catch (error) {
    console.error('Error creating wish:', error);
    res.status(500).json({ error: 'Failed to create wish' });
  }
});

// PUT /api/wishes/:id - Update a wish
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { wish } = req.body;
    
    if (!wish) {
      return res.status(400).json({ error: 'Wish is required' });
    }

    const wishRecord = await Wish.findByPk(id);
    if (!wishRecord) {
      return res.status(404).json({ error: 'Wish not found' });
    }

    await wishRecord.update({ wish });
    
    // Return updated wish with user info
    const updatedWish = await Wish.findByPk(id, {
      include: [{
        model: User,
        attributes: ['id', 'name', 'username']
      }]
    });
    
    res.json(updatedWish);
  } catch (error) {
    console.error('Error updating wish:', error);
    res.status(500).json({ error: 'Failed to update wish' });
  }
});

// DELETE /api/wishes/:id - Delete a wish
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const wish = await Wish.findByPk(id);
    if (!wish) {
      return res.status(404).json({ error: 'Wish not found' });
    }

    await wish.destroy();
    res.json({ message: 'Wish deleted successfully' });
  } catch (error) {
    console.error('Error deleting wish:', error);
    res.status(500).json({ error: 'Failed to delete wish' });
  }
});

module.exports = router;