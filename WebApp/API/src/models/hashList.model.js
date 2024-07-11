import { Sequelize, DataTypes } from "sequelize";
import db from "../db.js";
import user from "./user.model.js";

export default db.define(
  "hashList",
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: user,
        key: "id",
      },
    },
    algorithm: {
      type: DataTypes.ENUM("MD5", "SHA-256", "WPA2"),
      allowNull: false,
    },
    list: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    freezeTableName: true,
    tableName: "hashList",
  }
);
