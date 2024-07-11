import express from "express";
import passport from "passport";
import middlewareController from "../controllers/middleware.controller.js";
import { checkBlacklist, getUserFromToken } from "../auth.js";

const router = express.Router();

/**
 * @api {post} /middleware Create a new middleware
 * @apiName CreateMiddleware
 * @apiGroup Middleware
 *
 * @apiSuccess {Object} middleware The created middleware object.
 */
router.post("/middleware", middlewareController.createMiddleware);

/**
 * @api {post} /middleware/login Login as a middleware
 * @apiName LoginMiddleware
 * @apiGroup Middleware
 *
 * @apiSuccess {Object} middleware The logged in middleware object.
 */
router.post("/middleware/login", middlewareController.loginMiddleware);

/**
 * @api {put} /middleware/:uuid Update a middleware by ID
 * @apiName UpdateMiddlewareById
 * @apiGroup Middleware
 *
 * @apiParam {String} uuid The ID of the middleware to update.
 *
 * @apiSuccess {Object} middleware The updated middleware object.
 */
router.put("/middleware/:uuid", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, middlewareController.updateMiddlewareById);

/**
 * @api {delete} /middleware/:uuid Delete a middleware by ID
 * @apiName DeleteMiddlewareById
 * @apiGroup Middleware
 *
 * @apiParam {String} uuid The ID of the middleware to delete.
 *
 * @apiSuccess {String} message A success message.
 */
router.delete("/middleware/:uuid", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, middlewareController.deleteMiddlewareById);

/**
 * @api {get} /middleware Get all middlewares
 * @apiName GetAllMiddlewares
 * @apiGroup Middleware
 *
 * @apiSuccess {Object[]} middlewares An array of middleware objects.
 */
router.get("/middleware", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, middlewareController.getAllMiddlewares);

/**
 * @api {get} /middleware/:uuid Get a middleware by ID
 * @apiName GetMiddlewareById
 * @apiGroup Middleware
 *
 * @apiParam {String} uuid The ID of the middleware to retrieve.
 *
 * @apiSuccess {Object} middleware The retrieved middleware object.
 */
router.get("/middleware/:uuid", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, middlewareController.getMiddlewareById);

export default router;