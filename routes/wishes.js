const express = require('express');
const Wish = require('../models/wish');
const User = require('../models/user');
const sequelize = require('../config/database');
const router = express.Router();

// Helper function to execute Turso queries
async function executeQuery(sql, params = []) {
  if (sequelize.tursoClient) {
    console.log('Executing Turso query:', sql, params);
    const result = await sequelize.tursoClient.execute({ sql, args: params });
    return result.rows;
  } else {
    const [results] = await sequelize.query(sql, { 
      replacements: params,
      type: sequelize.QueryTypes.SELECT 
    });
    return results;
  }
}

async function executeUpdate(sql, params = []) {
  if (sequelize.tursoClient) {
    console.log('Executing Turso update:', sql, params);
    const result = await sequelize.tursoClient.execute({ sql, args: params });
    return result;
  } else {
    return await sequelize.query(sql, { 
      replacements: params,
      type: sequelize.QueryTypes.UPDATE
    });
  }
}

// GET /api/wishes - Get all wishes
router.get('/', async (req, res) => {
  try {
    // Use raw SQL query for Turso compatibility
    const wishes = await executeQuery(`
      SELECT 
        w.id, w.wish, w.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Wishes w
      JOIN Users u ON w.userId = u.id
      ORDER BY w.id
    `);
    
    // Transform to match expected format
    const formattedWishes = wishes.map(wish => ({
      id: wish.id,
      wish: wish.wish,
      userId: wish.userId,
      User: {
        id: wish.user_id,
        name: wish.user_name,
        username: wish.user_username
      }
    }));
    
    res.json(formattedWishes);
  } catch (error) {
    console.error('Error fetching wishes:', error);
    res.status(500).json({ error: 'Failed to fetch wishes' });
  }
});

// GET /api/wishes/user/:userId - Get wishes for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Use raw SQL query for Turso compatibility
    const wishes = await executeQuery(`
      SELECT 
        w.id, w.wish, w.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Wishes w
      JOIN Users u ON w.userId = u.id
      WHERE w.userId = ?
      ORDER BY w.id
    `, [userId]);
    
    // Transform to match expected format
    const formattedWishes = wishes.map(wish => ({
      id: wish.id,
      wish: wish.wish,
      userId: wish.userId,
      User: {
        id: wish.user_id,
        name: wish.user_name,
        username: wish.user_username
      }
    }));
    
    res.json(formattedWishes);
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
    const users = await executeQuery(
      'SELECT id FROM Users WHERE id = ?', 
      [userId]
    );
    
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create the wish
    await executeUpdate(
      'INSERT INTO Wishes (wish, userId, createdAt, updatedAt) VALUES (?, ?, datetime(\"now\"), datetime(\"now\"))',
      [wish, userId]
    );
    
    // Get the created wish with user info
    const createdWishes = await executeQuery(`
      SELECT 
        w.id, w.wish, w.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Wishes w
      JOIN Users u ON w.userId = u.id
      WHERE w.userId = ? 
      ORDER BY w.id DESC 
      LIMIT 1
    `, [userId]);
    
    if (createdWishes && createdWishes.length > 0) {
      const wishData = createdWishes[0];
      res.status(201).json({
        id: wishData.id,
        wish: wishData.wish,
        userId: wishData.userId,
        User: {
          id: wishData.user_id,
          name: wishData.user_name,
          username: wishData.user_username
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve created wish' });
    }
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

    // Check if wish exists
    const wishes = await executeQuery(
      'SELECT id FROM Wishes WHERE id = ?', 
      [id]
    );
    
    if (!wishes || wishes.length === 0) {
      return res.status(404).json({ error: 'Wish not found' });
    }

    // Update the wish
    await executeUpdate(
      'UPDATE Wishes SET wish = ?, updatedAt = datetime("now") WHERE id = ?',
      [wish, id]
    );
    
    // Get updated wish with user info
    const updatedWishes = await executeQuery(`
      SELECT 
        w.id, w.wish, w.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Wishes w
      JOIN Users u ON w.userId = u.id
      WHERE w.id = ?
    `, [id]);
    
    if (updatedWishes && updatedWishes.length > 0) {
      const wishData = updatedWishes[0];
      res.json({
        id: wishData.id,
        wish: wishData.wish,
        userId: wishData.userId,
        User: {
          id: wishData.user_id,
          name: wishData.user_name,
          username: wishData.user_username
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve updated wish' });
    }
  } catch (error) {
    console.error('Error updating wish:', error);
    res.status(500).json({ error: 'Failed to update wish' });
  }
});

// DELETE /api/wishes/:id - Delete a wish
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if wish exists
    const wishes = await executeQuery(
      'SELECT id FROM Wishes WHERE id = ?', 
      [id]
    );
    
    if (!wishes || wishes.length === 0) {
      return res.status(404).json({ error: 'Wish not found' });
    }

    // Delete the wish
    await executeUpdate(
      'DELETE FROM Wishes WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Wish deleted successfully' });
  } catch (error) {
    console.error('Error deleting wish:', error);
    res.status(500).json({ error: 'Failed to delete wish' });
  }
});

module.exports = router;