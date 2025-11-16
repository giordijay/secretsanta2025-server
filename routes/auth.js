const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const sequelize = require("../config/database");
require("dotenv").config();

const router = express.Router();

// Helper function to execute Turso queries
async function executeQuery(sql, params = []) {
  if (sequelize.tursoClient) {
    // Use Turso client
    console.log('Executing Turso query:', sql, params);
    const result = await sequelize.tursoClient.execute({ sql, args: params });
    return result.rows;
  } else {
    // Use Sequelize for local SQLite
    const [results] = await sequelize.query(sql, { 
      replacements: params,
      type: sequelize.QueryTypes.SELECT 
    });
    return results;
  }
}

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password, name } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    // Check if user already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM Users WHERE username = ?', 
      [username]
    );
    
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    // Hash password
    const hashed = password; // Store password as plain text for study purposes
    
    // Create user
    const result = await executeQuery(
      'INSERT INTO Users (username, password, name, createdAt, updatedAt) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
      [username, hashed, name || username]
    );
    
    // Get the created user
    const newUsers = await executeQuery(
      'SELECT id, username, name FROM Users WHERE username = ?',
      [username]
    );
    
    const user = newUsers[0];
    
    res.json({ 
      message: "User registered successfully", 
      user: {
        id: user.id,
        username: user.username,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    // Find user in database using raw query
    const users = await executeQuery(
      'SELECT id, username, name, password, picture FROM Users WHERE username = ?', 
      [username]
    );
    
    if (!users || users.length === 0) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    
    const user = users[0];

    // Verify password (plain text comparison for study purposes)
    const valid = password === user.password;
    if (!valid) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Create JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    res.json({ 
      message: "Login successful", 
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        picture: user.picture
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
