import express from "express";
import routes from "./src/routes/index.js";
import db from "./src/db.js"
import models from "./src/models/index.js";
const { gpu, node, user, hashList, job, jobGpu, jobCpu } = models;
import './src/associations.js';
import passport  from "./src/passport.js";
import userSeeder from "./src/seeders/demo-user.seeder.js";
import middlewareSeeder from "./src/seeders/demo-middleware.seeder.js";
import cors from "cors"
import { startServer } from './src/socket.js';


const app = express();


app.set('trust proxy', true);
app.use(cors());

app.use(express.json());
app.use(passport.initialize());

app.use("/api-docs", express.static("apidoc"));

app.use('/api', routes.nodeRoutes)
app.use('/api', routes.userRoutes)
app.use('/api', routes.middlewareRoutes)
app.use('/api', routes.jobRoutes)
app.use('/api', routes.hashListRoutes)
app.use('/api', routes.statisticsRoutes)



db.sync({ force: true })
    .then(() => {
    userSeeder.up(db.queryInterface, db.Sequelize);
    middlewareSeeder.up(db.queryInterface, db.Sequelize);
    console.log(`Database & tables created!`);
  })
  .catch((err) => { console.log(err) });


const server = app.listen(3000, '0.0.0.0',() => console.log("Servidor iniciado na porta 3000"));
const wsServer = startServer(server);


process.on('SIGINT', cleanDBAndExit);
process.on('SIGTERM', cleanDBAndExit);

function cleanDBAndExit() {
  db.drop()
    .then(() => {
      console.log('Database cleaned!');
      wsServer.close(() => {
        console.log('WebSocket server stopped');
        server.close(() => {
          console.log('HTTP server stopped');
          process.exit();
        });
      });
    })
    .catch((err) => {
      console.error('Error cleaning database:', err);
      server.close(() => {
        console.log('Server stopped');
        process.exit();
      });
    });
}