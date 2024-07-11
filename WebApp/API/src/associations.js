import gpu from "./models/gpu.model.js";
import node from "./models/node.model.js";
import middleware from "./models/middleware.model.js";

node.hasMany(gpu, { as: 'gpus', foreignKey: 'node_id' });
gpu.belongsTo(node, { foreignKey: 'node_id' });

middleware.hasMany(node, { as: 'nodes', foreignKey: 'middleware_UUID' });
node.belongsTo(middleware, { foreignKey: 'middleware_UUID' });