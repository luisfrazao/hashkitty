import { Sequelize, DataTypes } from "sequelize";
import db from "../db.js";
import gpu from "./gpu.model.js";
import job from "./job.model.js";

export default db.define(
  "jobGpu",
  {
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: job,
        key: "id",
      },
    },
    gpu_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: gpu,
        key: "id",
      },
    },
  },
  {
    timestamps: false,
    freezeTableName: true,
    tableName: "jobGpu",
  }
);
