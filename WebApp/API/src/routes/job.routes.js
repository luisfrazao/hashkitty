import express from "express";
import passport from "passport";
import job from "../controllers/job.controller.js";
import { checkBlacklist, getUserFromToken } from "../auth.js";

const router = express.Router();

/**
 * @api {get} /jobs Get all jobs
 * @apiName GetJobs
 * @apiGroup Job
 * @apiPermission authenticated user
 * @apiHeader {String} Authorization User's JWT token.
 * @apiSuccess {Object[]} jobs List of jobs.
 */
router.get("/jobs", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, job.getJobs);

/**
 * @api {get} /job/:id Get job by ID
 * @apiName GetJobById
 * @apiGroup Job
 * @apiPermission authenticated user
 * @apiHeader {String} Authorization User's JWT token.
 * @apiParam {String} id Job's ID.
 * @apiSuccess {Object} job Job object.
 */
router.get("/job/:id", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, job.getJobById);

/**
 * @api {post} /job Create a new job
 * @apiName CreateJob
 * @apiGroup Job
 * @apiPermission authenticated user
 * @apiHeader {String} Authorization User's JWT token.
 * @apiParam {Object} options Job's options.
 * @apiParam {String} hash_list_id Job's hash list ID.
 * @apiParam {String[]} gpus Job's GPUs.
 * @apiSuccess {Object} job Created job object.
 */
router.post("/job", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, job.createJob);

/**
 * @api {put} /job/:id Update job
 * @apiName UpdateJob
 * @apiGroup Job
 * @apiPermission authenticated user or middleware
 * @apiHeader {String} Authorization User's JWT token.
 * @apiParam {String} id Job's ID.
 * @apiParam {Object} options Job's options.
 * @apiParam {String} hash_list_id Job's hash list ID.
 * @apiParam {String[]} gpus Job's GPUs.
 * @apiSuccess {Object} job Updated job object.
 */

router.put("/job/:id", passport.authenticate('jwt', { session: false }), checkBlacklist, getUserFromToken, job.updateJob);

export default router;