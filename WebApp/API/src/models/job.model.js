import { Sequelize, DataTypes } from "sequelize";
import db from "../db.js";
import hashList from "./hashList.model.js";
import user from "./user.model.js";

export default db.define(
  "job",
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    mode: {
      type: DataTypes.ENUM("D", "R", "C", "B"),
      allowNull: false,
    },
    rules:{
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    lists: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    status: {
      type: DataTypes.ENUM("Pending", "Running", "Completed", "Failed"),
      allowNull: false,
    },
    result: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      defaultValue: "",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    runtime: {
      type: DataTypes.ENUM("1h","12h", "1d"),
      allowNull: false
    },
    hash_list_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: hashList,
        key: "id",
      },
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: user,
        key: "id",
      },
    },
  },
  {
    timestamps: true,
    freezeTableName: true,
    paranoid: true,
    tableName: "job",
  }
);
