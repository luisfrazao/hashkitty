import express from "express";
import passport from "passport";
import hashList from "../controllers/hashList.controller.js";
import { checkBlacklist, getUserFromToken } from "../auth.js";

const router = express.Router();

/**
 * @api {get} /hashLists Get all hash lists
 * @apiName GetHashLists
 * @apiGroup HashList
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiSuccess {Object[]} hashLists Array of hash lists.
 */
router.get("/hashLists", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, hashList.getHashLists);

/**
 * @api {get} /hashList/:id Get hash list by ID
 * @apiName GetHashListById
 * @apiGroup HashList
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiParam {String} id Hash list ID.
 *
 * @apiSuccess {Object} hashList Hash list object.
 */
router.get("/hashList/:id", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, hashList.getHashListById);

/**
 * @api {post} /hashList Create a new hash list
 * @apiName CreateHashList
 * @apiGroup HashList
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiParam {Object} hashList Hash list object.
 *
 * @apiSuccess {Object} createdHashList Created hash list object.
 */
router.post("/hashList", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, hashList.createHashList);

/**
 * @api {delete} /hashList/:id Delete hash list by ID
 * @apiName DeleteHashList
 * @apiGroup HashList
 * @apiPermission authenticated user
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiParam {String} id Hash list ID.
 *
 * @apiSuccess {String} message Success message.
 */
router.delete("/hashList/:id", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, hashList.deleteHashList);

export default router;
