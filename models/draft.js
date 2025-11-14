const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Draft = sequelize.define("Draft", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  from: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // Each user can give only one gift
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  who: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // Each user can receive only one gift
    references: {
      model: 'Users',
      key: 'id'
    }
  }
});

module.exports = Draft;