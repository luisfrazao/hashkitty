import { Sequelize,DataTypes } from "sequelize";
import db from "../db.js";
import node from "./node.model.js";

export default db.define("gpu", {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    vendor: {
        type: DataTypes.ENUM('NVIDIA Corporation','Advanced Micro Devices, Inc.','GenuineIntel'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    vram: {
        type: DataTypes.STRING,
        allowNull: false
    },
    device_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Working','Available'),
        allowNull: false,
        defaultValue: 'Available'
    },
    node_id: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: node, 
          key: 'uuid'
        }
    },
    md5_benchmark: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sha256_benchmark: {
        type: DataTypes.STRING,
        allowNull: true
    },
    wifi_benchmark: {
        type: DataTypes.STRING,
        allowNull: true
    }
},{
    timestamps: true,
    paranoid: true,
    freezeTableName: true,
    tableName: 'gpu'
});