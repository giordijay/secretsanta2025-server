const { Sequelize } = require("sequelize");
const { createClient } = require("@libsql/client");

// Check if we're using Turso or local SQLite
const useTurso = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;
let sequelize;

if (useTurso) {
  // Turso configuration
  console.log('Using Turso database');
  
  // Create Turso client
  const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // For Turso, we need to use a custom dialect or raw queries
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: ":memory:", // Placeholder, we'll use Turso
    logging: console.log,
    define: {
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  });

  // Add Turso client to sequelize instance for manual queries
  sequelize.tursoClient = tursoClient;

} else {
  // Local SQLite configuration
  console.log('Using local SQLite database');
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: "./database.sqlite",
    logging: console.log
  });
}

module.exports = sequelize;