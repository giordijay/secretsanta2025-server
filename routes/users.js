const express = require('express');
const User = require('../models/user');
const Wish = require('../models/wish');
const Notneed = require('../models/notneed');
const router = express.Router();

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'username', 'picture'], // Exclude password
      include: [
        {
          model: Wish,
          attributes: ['id', 'wish']
        },
        {
          model: Notneed,
          attributes: ['id', 'hate']
        }
      ]
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get a specific user
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'username', 'picture'], // Exclude password
      include: [
        {
          model: Wish,
          attributes: ['id', 'wish']
        },
        {
          model: Notneed,
          attributes: ['id', 'hate']
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/:id - Update a user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, picture } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow updating name and picture, not username or password
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (picture !== undefined) updateData.picture = picture;

    await user.update(updateData);
    
    // Return updated user without password
    const updatedUser = await User.findByPk(id, {
      attributes: ['id', 'name', 'username', 'picture']
    });
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Note: Due to foreign key constraints, associated wishes and notneeds 
    // should be deleted automatically (CASCADE)
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/users/:id/profile - Get user profile (without sensitive data)
router.get('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'username', 'picture'],
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/users/:id/wishes-and-notneeds - Get user's wishes and notneeds only
router.get('/:id/wishes-and-notneeds', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if user exists
    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'username', 'picture']
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch wishes and notneeds separately for more control
    const wishes = await Wish.findAll({
      where: { userId: id },
      attributes: ['id', 'wish']
    });

    const notneeds = await Notneed.findAll({
      where: { userId: id },
      attributes: ['id', 'hate']
    });
    console.log('Notneeds found:', notneeds);

    res.json({
      wishes,
      notneeds
    });
  } catch (error) {
    console.error('Error fetching user wishes and notneeds:', error);
    res.status(500).json({ error: 'Failed to fetch user wishes and notneeds' });
  }
});

module.exports = router;