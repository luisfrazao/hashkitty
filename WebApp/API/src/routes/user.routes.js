import express from "express";
import passport from "passport";
import user from "../controllers/user.controller.js";
import { checkBlacklist, getUserFromToken } from "../auth.js";

const router = express.Router();

/**
 * @api {post} /register Register a new user
 * @apiName RegisterUser
 * @apiGroup User
 *
 * @apiParam {String} username User's username
 * @apiParam {String} password User's password
 *
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} user User object
 */
router.post('/register', user.register);

/**
 * @api {post} /login User login
 * @apiName UserLogin
 * @apiGroup User
 *
 * @apiParam {String} username User's username
 * @apiParam {String} password User's password
 *
 * @apiSuccess {String} token Authentication token
 * @apiSuccess {Object} user User object
 */
router.post('/login', user.login);

/**
 * @api {post} /login/totp Verify 2FA
 * @apiName VerifyTotp
 * @apiGroup User
 * 
 * @apiParam {String} username User's username
 * @apiParam {String} token User's 2FA token
 * 
 * @apiSuccess {String} message Success message
 */
router.post('/login/totp', user.verifyTotp);

/**
 * @api {post} /profile/totp Add TOTP
 * @apiName AddTotp
 * @apiGroup User
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiSuccess {String} message Success message
 */
router.post('/profile/totp', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.addTotp);

/**
 * @api {post} /profile/totp/verify Verify TOTP
 * @apiName VerifyTotp
 * @apiGroup User
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiParam {String} token User's 2FA token
 * 
 * @apiSuccess {Boolean} valid Token validity
 */

router.post('/profile/totp/verify', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.firstVerifyTotp);

/**
 * @api {delete} /profile/totp Remove TOTP
 * @apiName RemoveTotp
 * @apiGroup User
 * 
 * @apiHeader {String} Authorization User's authentication token
 * 
 * @apiSuccess {String} message Success message
 */
router.delete('/profile/totp', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.removeTotp);

/**
 * @api {get} /profile Get user profile
 * @apiName GetUserProfile
 * @apiGroup User
 *
 * @apiHeader {String} Authorization User's authentication token
 *
 * @apiSuccess {Object} user User object
 */
router.get('/profile', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.profile);

/**
 * @api {get} /users Get all users
 * @apiName GetAllUsers
 * @apiGroup User
 *
 * @apiHeader {String} Authorization User's authentication token
 *
 * @apiSuccess {Object[]} users Array of user objects
 */
router.get('/users', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.getAllUsers);

/**
 * @api {delete} /profile/:id Delete user
 * @apiName DeleteUser
 * @apiGroup User
 *
 * @apiHeader {String} Authorization User's authentication token
 *
 * @apiParam {String} id User's ID
 *
 * @apiSuccess {String} message Success message
 */
router.delete('/profile/:id', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.deleteUser);

/**
 * @api {put} /profile/password Change user password
 * @apiName ChangePassword
 * @apiGroup User
 *
 * @apiHeader {String} Authorization User's authentication token
 *
 * @apiParam {String} currentPassword User's current password
 * @apiParam {String} newPassword User's new password
 *
 * @apiSuccess {String} message Success message
 */
router.put('/profile/password', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.changePassword);

//router.put('/profile', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.updateUser);

/**
 * @api {post} /logout User logout
 * @apiName UserLogout
 * @apiGroup User
 *
 * @apiHeader {String} Authorization User's authentication token
 *
 * @apiSuccess {String} message Success message
 */
router.post('/logout', passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, user.logout);

export default router;