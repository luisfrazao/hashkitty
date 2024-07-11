import { Sequelize, DataTypes } from "sequelize";
import db from "../db.js";
import node from "./node.model.js";
import job from "./job.model.js";

export default db.define(
  "jobCpu",
  {
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: job,
        key: "id",
      },
    },
    cpu_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: node,
        key: "uuid",
      },
    },
  },
  {
    timestamps: false,
    freezeTableName: true,
    tableName: "jobCpu",
  }
);
