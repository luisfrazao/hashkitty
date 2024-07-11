import { Sequelize,DataTypes } from "sequelize";
import argon2 from "argon2";
import db from "../db.js";

const middleware = db.define("middleware", {
    uuid: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    IP: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            isIP: true
        },
        unique: true
    },
    status: {
        type: DataTypes.ENUM('Rejected', 'Pending', 'Accepted'),
        defaultValue: 'Pending',
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
      }
},{
    timestamps: true,
    freezeTableName: true,
    tableName: 'middleware',
    hooks:{
        beforeUpdate: async (middleware) => {
            if (middleware.changed("status") && middleware.status == "Accepted") {
              middleware.password = await argon2.hash(middleware.password, {
                type: argon2.argon2id,
                timeCost: 8,
                memoryCost: 2 ** 19,
                parallelism: 6,
              });
            }
          },
    }
});


export default middleware;