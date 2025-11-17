const express = require('express');
const Notneed = require('../models/notneed');
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

// GET /api/notneeds - Get all notneeds
router.get('/', async (req, res) => {
  try {
    // Use raw SQL query for Turso compatibility
    const notneeds = await executeQuery(`
      SELECT 
        n.id, n.hate, n.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Notneeds n
      JOIN Users u ON n.userId = u.id
      ORDER BY n.id
    `);
    
    // Transform to match expected format
    const formattedNotneeds = notneeds.map(notneed => ({
      id: notneed.id,
      hate: notneed.hate,
      userId: notneed.userId,
      User: {
        id: notneed.user_id,
        name: notneed.user_name,
        username: notneed.user_username
      }
    }));
    
    res.json(formattedNotneeds);
  } catch (error) {
    console.error('Error fetching notneeds:', error);
    res.status(500).json({ error: 'Failed to fetch notneeds' });
  }
});

// GET /api/notneeds/user/:userId - Get notneeds for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Use raw SQL query for Turso compatibility
    const notneeds = await executeQuery(`
      SELECT 
        n.id, n.hate, n.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Notneeds n
      JOIN Users u ON n.userId = u.id
      WHERE n.userId = ?
      ORDER BY n.id
    `, [userId]);
        
    // Transform to match expected format
    const formattedNotneeds = notneeds.map(notneed => ({
      id: notneed.id,
      hate: notneed.hate,
      userId: notneed.userId,
      User: {
        id: notneed.user_id,
        name: notneed.user_name,
        username: notneed.user_username
      }
    }));
    
    res.json(formattedNotneeds);
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
    const users = await executeQuery(
      'SELECT id FROM Users WHERE id = ?', 
      [userId]
    );
    
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create the notneed
    await executeUpdate(
      'INSERT INTO Notneeds (hate, userId, createdAt, updatedAt) VALUES (?, ?, datetime(\"now\"), datetime(\"now\"))',
      [hate, userId]
    );
    
    // Get the created notneed with user info
    const createdNotneeds = await executeQuery(`
      SELECT 
        n.id, n.hate, n.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Notneeds n
      JOIN Users u ON n.userId = u.id
      WHERE n.userId = ? 
      ORDER BY n.id DESC 
      LIMIT 1
    `, [userId]);
    
    if (createdNotneeds && createdNotneeds.length > 0) {
      const notneedData = createdNotneeds[0];
      res.status(201).json({
        id: notneedData.id,
        hate: notneedData.hate,
        userId: notneedData.userId,
        User: {
          id: notneedData.user_id,
          name: notneedData.user_name,
          username: notneedData.user_username
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve created notneed' });
    }
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

    // Check if notneed exists
    const notneeds = await executeQuery(
      'SELECT id FROM Notneeds WHERE id = ?', 
      [id]
    );
    
    if (!notneeds || notneeds.length === 0) {
      return res.status(404).json({ error: 'Notneed not found' });
    }

    // Update the notneed
    await executeUpdate(
      'UPDATE Notneeds SET hate = ?, updatedAt = datetime(\"now\") WHERE id = ?',
      [hate, id]
    );
    
    // Get updated notneed with user info
    const updatedNotneeds = await executeQuery(`
      SELECT 
        n.id, n.hate, n.userId,
        u.id as user_id, u.name as user_name, u.username as user_username
      FROM Notneeds n
      JOIN Users u ON n.userId = u.id
      WHERE n.id = ?
    `, [id]);
    
    if (updatedNotneeds && updatedNotneeds.length > 0) {
      const notneedData = updatedNotneeds[0];
      res.json({
        id: notneedData.id,
        hate: notneedData.hate,
        userId: notneedData.userId,
        User: {
          id: notneedData.user_id,
          name: notneedData.user_name,
          username: notneedData.user_username
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve updated notneed' });
    }
  } catch (error) {
    console.error('Error updating notneed:', error);
    res.status(500).json({ error: 'Failed to update notneed' });
  }
});

// DELETE /api/notneeds/:id - Delete a notneed
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if notneed exists
    const notneeds = await executeQuery(
      'SELECT id FROM Notneeds WHERE id = ?', 
      [id]
    );
    
    if (!notneeds || notneeds.length === 0) {
      return res.status(404).json({ error: 'Notneed not found' });
    }

    // Delete the notneed
    await executeUpdate(
      'DELETE FROM Notneeds WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Notneed deleted successfully' });
  } catch (error) {
    console.error('Error deleting notneed:', error);
    res.status(500).json({ error: 'Failed to delete notneed' });
  }
});

module.exports = router;