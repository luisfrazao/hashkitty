import { Sequelize,DataTypes } from "sequelize";
import db from "../db.js";
import middleware from "./middleware.model.js";

const node = db.define("node", {
    uuid: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    ram: {
        type: DataTypes.STRING,
        allowNull: false
    },
    cpu: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('Up', 'Down'),
        defaultValue: 'Down',
        allowNull: false
    },
    validation: {
        type: DataTypes.ENUM('Rejected', 'Pending', 'Accepted'),
        defaultValue: 'Pending',
        allowNull: false
    },
    middleware_UUID: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'middleware',
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
    },
    cpu_status: {
        type: DataTypes.ENUM('Working','Available'),
        allowNull: true
    },
},{
    timestamps: true,
    paranoid: true,
    freezeTableName: true,
    tableName: 'node'
});


export default node;