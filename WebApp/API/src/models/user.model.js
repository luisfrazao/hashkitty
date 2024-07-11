import { Sequelize, DataTypes } from "sequelize";
import db from "../db.js";
import argon2 from "argon2";

export default db.define(
  "user",
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_type:{
      type: DataTypes.ENUM('admin', 'user'),
      allowNull: false,
      defaultValue: 'user'
    },
    totpSecret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    freezeTableName: true,
    tableName: "user",
    paranoid: true,
    hooks: {
      beforeCreate: async (user) => {
        user.password = await argon2.hash(user.password, {
          type: argon2.argon2id,
          timeCost: 8,
          memoryCost: 2 ** 19,
          parallelism: 6,
        });
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await argon2.hash(user.password, {
            type: argon2.argon2id,
            timeCost: 8,
            memoryCost: 2 ** 19,
            parallelism: 6,
          });
        }
      },
    },
  }
);
