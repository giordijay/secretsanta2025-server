const express = require('express');
const Draft = require('../models/draft');
const User = require('../models/user');
const router = express.Router();

// GET /api/drafts - Get all drafts (Secret Santa assignments)
router.get('/', async (req, res) => {
  try {
    const drafts = await Draft.findAll({
      include: [
        {
          model: User,
          as: 'Giver',
          attributes: ['id', 'name', 'username', 'picture']
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'name', 'username', 'picture']
        }
      ]
    });
    res.json(drafts);
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ error: 'Failed to fetch drafts' });
  }
});

// GET /api/drafts/user/:userId - Get draft assignment for a specific user (who they're buying for)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const draft = await Draft.findOne({
      where: { from: userId },
      include: [
        {
          model: User,
          as: 'Giver',
          attributes: ['id', 'name', 'username', 'picture']
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'name', 'username', 'picture']
        }
      ]
    });
    
    if (!draft) {
      return res.status(404).json({ error: 'No assignment found for this user' });
    }
    
    res.json(draft);
  } catch (error) {
    console.error('Error fetching user draft:', error);
    res.status(500).json({ error: 'Failed to fetch user draft' });
  }
});

// POST /api/drafts - Create a new draft assignment
router.post('/', async (req, res) => {
  try {
    const { from, who } = req.body;
    
    if (!from || !who) {
      return res.status(400).json({ error: 'Both from and who are required' });
    }

    if (from === who) {
      return res.status(400).json({ error: 'User cannot be assigned to themselves' });
    }

    // Check if users exist
    const giver = await User.findByPk(from);
    const receiver = await User.findByPk(who);
    
    if (!giver || !receiver) {
      return res.status(404).json({ error: 'One or both users not found' });
    }

    // Check if assignment already exists
    const existingDraft = await Draft.findOne({ where: { from } });
    if (existingDraft) {
      return res.status(400).json({ error: 'User already has an assignment' });
    }

    const newDraft = await Draft.create({ from, who });
    
    // Return the draft with user info
    const draftWithUsers = await Draft.findByPk(newDraft.id, {
      include: [
        {
          model: User,
          as: 'Giver',
          attributes: ['id', 'name', 'username', 'picture']
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'name', 'username', 'picture']
        }
      ]
    });
    
    res.status(201).json(draftWithUsers);
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

// PUT /api/drafts/:id - Update a draft assignment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { who } = req.body;
    
    if (!who) {
      return res.status(400).json({ error: 'Who is required' });
    }

    const draft = await Draft.findByPk(id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    if (draft.from === who) {
      return res.status(400).json({ error: 'User cannot be assigned to themselves' });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(who);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver user not found' });
    }

    await draft.update({ who });
    
    // Return updated draft with user info
    const updatedDraft = await Draft.findByPk(id, {
      include: [
        {
          model: User,
          as: 'Giver',
          attributes: ['id', 'name', 'username', 'picture']
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'name', 'username', 'picture']
        }
      ]
    });
    
    res.json(updatedDraft);
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

// DELETE /api/drafts/:id - Delete a draft assignment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const draft = await Draft.findByPk(id);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    await draft.destroy();
    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

// POST /api/drafts/generate - Generate random Secret Santa assignments
router.post('/generate', async (req, res) => {
  try {
    // Get all users
    const users = await User.findAll({
      attributes: ['id', 'name', 'username', 'picture']
    });

    if (users.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 users to generate assignments' });
    }

    // Clear existing drafts
    await Draft.destroy({ where: {} });

    // Create array of user IDs and shuffle
    const userIds = users.map(user => user.id);
    const shuffled = [...userIds];
    
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Create assignments - each user gives to the next in the shuffled array
    const assignments = [];
    for (let i = 0; i < shuffled.length; i++) {
      const from = shuffled[i];
      const who = shuffled[(i + 1) % shuffled.length]; // Wrap around to first user
      assignments.push({ from, who });
    }

    // Save all assignments
    const createdDrafts = await Draft.bulkCreate(assignments);

    // Fetch and return all drafts with user info
    const draftsWithUsers = await Draft.findAll({
      include: [
        {
          model: User,
          as: 'Giver',
          attributes: ['id', 'name', 'username', 'picture']
        },
        {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'name', 'username', 'picture']
        }
      ]
    });

    res.status(201).json(draftsWithUsers);
  } catch (error) {
    console.error('Error generating drafts:', error);
    res.status(500).json({ error: 'Failed to generate assignments' });
  }
});

// DELETE /api/drafts - Clear all assignments
router.delete('/', async (req, res) => {
  try {
    await Draft.destroy({ where: {} });
    res.json({ message: 'All assignments cleared successfully' });
  } catch (error) {
    console.error('Error clearing drafts:', error);
    res.status(500).json({ error: 'Failed to clear assignments' });
  }
});

module.exports = router;