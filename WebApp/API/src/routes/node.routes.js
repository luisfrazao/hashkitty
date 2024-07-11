import express from "express";
import passport from "passport";
import nodeController from "../controllers/node.controller.js";
import { checkBlacklist, getUserFromToken } from "../auth.js";

const router = express.Router();

/**
 * @api {get} /nodes Get all nodes
 * @apiName GetNodes
 * @apiGroup Node
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiSuccess {Object[]} nodes List of nodes.
 */

router.get("/nodes", passport.authenticate('jwt', { session: false }), nodeController.getNodes);

/**
 * @api {get} /pendingNodes Get all pending nodes
 * @apiName GetPendingNodes
 * @apiGroup Node
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiSuccess {Object[]} pendingNodes List of pending nodes.
 */

router.get("/pendingNodes", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, nodeController.getPendingNodes);

/**
 * @api {get} /node/:uuid Get node by UUID
 * @apiName GetNodeByUuid
 * @apiGroup Node
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiParam {String} uuid Node's UUID.
 *
 * @apiSuccess {Object} node Node object.
 */

router.get("/node/:uuid", passport.authenticate('jwt', { session: false }), nodeController.getNodeByUuid);

/**
 * @api {post} /node Create a new node
 * @apiName CreateNode
 * @apiGroup Node
 *
 * @apiParam {String} name Node's name.
 * @apiParam {String} description Node's description.
 *
 * @apiSuccess {Object} node Created node object.
 */

router.post("/node", nodeController.createNode);

/**
 * @api {put} /node/:uuid Update a node
 * @apiName UpdateNode
 * @apiGroup Node
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiParam {String} uuid Node's UUID.
 * @apiParam {String} name Updated node's name.
 * @apiParam {String} description Updated node's description.
 *
 * @apiSuccess {Object} node Updated node object.
 */

router.put("/node/:uuid", nodeController.updateNode);

/**
 * @api {put} /node/:uuid/validation Update node validation
 * @apiName UpdateNodeValidation
 * @apiGroup Node
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiParam {String} uuid Node's UUID.
 *
 * @apiSuccess {Object} node Updated node object.
 */

router.put("/node/:uuid/validation", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, nodeController.updateNodeValidation);

/**
 * @api {delete} /node/:uuid Delete a node
 * @apiName DeleteNode
 * @apiGroup Node
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiParam {String} uuid Node's UUID.
 *
 * @apiSuccess {String} message Success message.
 */

router.delete("/node/:uuid", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, nodeController.deleteNode);

export default router;
