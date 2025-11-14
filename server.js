const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");
const User = require("./models/user");
const Wish = require("./models/wish");
const Notneed = require("./models/notneed");
const Draft = require("./models/draft");
const authRoutes = require("./routes/auth");
const wishesRoutes = require("./routes/wishes");
const notneedsRoutes = require("./routes/notneeds");
const usersRoutes = require("./routes/users");
const draftsRoutes = require("./routes/drafts");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Test route for connectivity
app.get("/api/helloworld", (req, res) => {
  res.json({ message: "Hello World! Server is running." });
});

app.use("/api/auth", authRoutes);
app.use("/api/wishes", wishesRoutes);
app.use("/api/notneeds", notneedsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/drafts", draftsRoutes);

// Define relationships
User.hasMany(Wish, { foreignKey: 'userId' });
Wish.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notneed, { foreignKey: 'userId' });
Notneed.belongsTo(User, { foreignKey: 'userId' });

// Draft relationships - 1:1 relationships for Secret Santa
User.hasOne(Draft, { foreignKey: 'from', as: 'GivenAssignment' });
User.hasOne(Draft, { foreignKey: 'who', as: 'ReceivedAssignment' });
Draft.belongsTo(User, { foreignKey: 'from', as: 'Giver' });
Draft.belongsTo(User, { foreignKey: 'who', as: 'Receiver' });

// IMPORTANT: Set force: true only ONCE to recreate tables, then change back to false
const FORCE_RECREATE_TABLES = false; // Set to true only if you need to recreate tables
const PORT = process.env.PORT || 5000;
sequelize.sync({ force: FORCE_RECREATE_TABLES, alter: false }).then(async () => {
  try {
    // Check if tables exist, create them if they don't
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    if (FORCE_RECREATE_TABLES) {
      console.log("⚠️  RECREATING all tables - ALL DATA WILL BE LOST!");
    } else {
      console.log("Using existing tables or creating if they don't exist");
    }
    
    console.log("Database synced");
    
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});
