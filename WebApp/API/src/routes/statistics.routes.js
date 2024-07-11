import express from "express";
import passport from "passport";
import statisticsController from "../controllers/statistics.controller.js";
import { checkBlacklist, getUserFromToken } from "../auth.js";

const router = express.Router();

/**
 * @api {get} /stats Get Admin statistics
 * @apiName GetAdminStatistics
 * @apiGroup Statistics
 * @apiPermission authenticated admin
 *
 * @apiHeader {String} Authorization User's JWT token.
 *
 * @apiSuccess {Object} stats Admin statistics.
 */
router.get("/stats", passport.authenticate("jwt", { session: false }), checkBlacklist, getUserFromToken, statisticsController.getAdminStatistics);

/**
 * @api {get} /stats/user Get User statistics
 * @apiName GetUserStatistics
 * @apiGroup Statistics
 * @apiPermission authenticated user
 * 
 * @apiHeader {String} Authorization User's JWT token.
 * 
 * @apiSuccess {Object} stats User statistics.
 */
router.get("/stats/user", passport.authenticate("jwt", { session: false }), checkBlacklist, getUserFromToken, statisticsController.getUserStatistics);

export default router;