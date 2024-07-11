import { Sequelize } from "sequelize";
import dotenv from "dotenv/config.js"; 

const dbName = process.env.DB_DATABASE;
const dbUser = process.env.DB_USERNAME;
const dbHost = process.env.DB_HOST;
const dbPassword = process.env.DB_PASSWORD;

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  dialect: "mariadb",
  host: dbHost, 
});


export default sequelize;
