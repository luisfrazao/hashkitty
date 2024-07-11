import models from "../models/index.js";
import { Op, Sequelize } from "sequelize";

const getAdminStatistics = async (req, res) => {
  try {
    if (req.user.user_type !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const numStats = {
      numNodes: await models.node.count(),
      numUpNodes: await models.node.count({ where: { status: "Up" } }),
      numGpus: await models.gpu.count(),
      numWorkingGpus: await models.gpu.count({ where: { status: "Working" } }),
      numJobs: await models.job.count(),
      numActiveJobs: await models.job.count({ where: { status: "Running" } }),
      numCompletedJobs: await models.job.count({
        where: { status: "Completed" },
      }),
      numFailedJobs: await models.job.count({ where: { status: "Failed" } }),
    };

    let startDate;
    if (req.query.time == "lastMonth") {
      startDate = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);
    } else if (req.query.time == "last7days") {
      startDate = new Date(new Date() - 7 * 24 * 60 * 60 * 1000);
    } else if (req.query.time == "last3Months") {
      startDate = new Date(new Date() - 92 * 24 * 60 * 60 * 1000);
    } else if (req.query.time == "today") {
      startDate = new Date(new Date().setHours(0, 0, 0, 0));
    }

    const groupByHour = (req.query.time == "today" || req.query.time == "last7days");

    const jobModes = await models.job.findAll({
      attributes: [
        "mode",
        [Sequelize.fn("COUNT", Sequelize.col("mode")), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate || new Date(0),
        },
      },
      group: ["mode"],
    });

    const completedJobsByTime = await models.job.findAll({
      attributes: [
        groupByHour
          ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H:%i:%s"), "hour"]
          : [Sequelize.literal("DATE(updatedAt)"), "day"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      where: {
        updatedAt: {
          [Op.gte]: startDate || new Date(0),
        },
        status: "Completed",
      },
      group: [groupByHour ? Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H") : "day"],
      order: [groupByHour ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H"), "ASC"] : ["day", "ASC"]],
    });

    const completedJobsByTimeFormatted = completedJobsByTime.map((job) => ({
      time: job.dataValues[groupByHour ? "hour" : "day"],
      count: job.dataValues.count,
    }));

    const failedJobsByTime = await models.job.findAll({
      attributes: [
        groupByHour
          ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H:%i:%s"), "hour"]
          : [Sequelize.literal("DATE(updatedAt)"), "day"],
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      where: {
        updatedAt: {
          [Op.gte]: startDate || new Date(0),
        },
        status: "Failed",
      },
      group: [groupByHour ? Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H") : "day"],
      order: [groupByHour ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H"), "ASC"] : ["day", "ASC"]],
    });

    const failedJobsByTimeFormatted = failedJobsByTime.map((job) => ({
      time: job.dataValues[groupByHour ? "hour" : "day"],
      count: job.dataValues.count,
    }));

    const newNodesByTime = await models.node.findAll({
      attributes: [
        groupByHour
          ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H:%i:%s"), "hour"]
          : [Sequelize.literal("DATE(updatedAt)"), "day"],
        [Sequelize.fn("COUNT", Sequelize.col("uuid")), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate || new Date(0),
        },
      },
      group: [groupByHour ? Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H") : "day"],
      order: [groupByHour ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("updatedAt"), "%Y-%m-%d %H"), "ASC"] : ["day", "ASC"]],
    });

    const newNodesByTimeFormatted = newNodesByTime.map((node) => ({
      time: node.dataValues[groupByHour ? "hour" : "day"],
      count: node.dataValues.count,
    }));

    const jobsByAlgorithm = await models.hashList.findAll({
      attributes: [
        "algorithm",
        [Sequelize.fn("COUNT", Sequelize.col("algorithm")), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate || new Date(0),
        },
      },
      group: ["algorithm"],
    });

    const jobsByAlgorithmFormatted = jobsByAlgorithm.map((hashList) => ({
      algorithm: hashList.dataValues.algorithm,
      count: hashList.dataValues.count,
    }));

    res.status(200).json({
      success: true,
      data: {
        numStats,
        jobModes,
        completedJobsByDay: completedJobsByTimeFormatted,
        failedJobsByDay: failedJobsByTimeFormatted,
        newNodesByDay: newNodesByTimeFormatted,
        jobsByAlgorithm: jobsByAlgorithmFormatted,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "An error occurred while obtaining the statistics: " + error,
    });
  }
};

const getUserStatistics = async (req, res) => {
   try{
      if(req.user.user_type !== "user"){
        return res.status(401).json({message: "Unauthorized"});
      }

      let startDate;
      if (req.query.time == "lastMonth") {
        startDate = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);
      } else if (req.query.time == "last7days") {
        startDate = new Date(new Date() - 7 * 24 * 60 * 60 * 1000);
      } else if (req.query.time == "last3Months") {
        startDate = new Date(new Date() - 92 * 24 * 60 * 60 * 1000);
      } else if (req.query.time == "today") {
        startDate = new Date(new Date().setHours(0, 0, 0, 0));
      }

      const groupByHour = (req.query.time == "today" || req.query.time == "last7days");

      const numStats={
        numJobs: await models.job.count({
          where: {
            user_id: req.user.id,
            createdAt: {
              [Op.gte]: startDate || new Date(0),
            },
          },
        }),
        numActiveJobs: await models.job.count({
          where: {
            user_id: req.user.id,
            status: "Running",
            createdAt: {
              [Op.gte]: startDate || new Date(0),
            },
          },
        }),
        numCompletedJobs: await models.job.count({
          where: {
            user_id: req.user.id,
            status: "Completed",
            createdAt: {
              [Op.gte]: startDate || new Date(0),
            },
          },
        }),
        numFailedJobs: await models.job.count({
          where: {
            user_id: req.user.id,
            status: "Failed",
            createdAt: {
              [Op.gte]: startDate || new Date(0),
            },
          },
        }),
      }

      const jobModes = await models.job.findAll({
        attributes: [
          "mode",
          [Sequelize.fn("COUNT", Sequelize.col("mode")), "count"],
        ],
        where: {
          user_id: req.user.id,
          createdAt: {
            [Op.gte]: startDate || new Date(0),
          },
        },
        group: ["mode"],
      });

      const jobsByAlgorithm = await models.hashList.findAll({
        attributes: [
          "algorithm",
          [Sequelize.fn("COUNT", Sequelize.col("algorithm")), "count"],
        ],
        where: {
          user_id: req.user.id,
          createdAt: {
            [Op.gte]: startDate || new Date(0),
          },
        },
        group: ["algorithm"],
      });

      const jobsByAlgorithmFormatted = jobsByAlgorithm.map((hashList) => ({
        algorithm: hashList.dataValues.algorithm,
        count: hashList.dataValues.count,
      }));

      const jobStatusesOverTime = await models.job.findAll({
        attributes: [
          groupByHour
            ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m-%d %H:%i:%s"), "hour"]
            : [Sequelize.literal("DATE(createdAt)"), "day"],
          "status",
          [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
        ],
        where: {
          user_id: req.user.id,
          createdAt: {
            [Op.gte]: startDate || new Date(0),
          },
        },
        group: [groupByHour ? Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m-%d %H") : "day", "status"],
        order: [groupByHour ? [Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m-%d %H"), "ASC"] : ["day", "ASC"]],
      });

      const jobStatusesOverTimeFormatted = jobStatusesOverTime.map((job) => ({
        time: job.dataValues[groupByHour ? "hour" : "day"] || [],
        status: job.dataValues.status || [],
        count: job.dataValues.count || [],
      }));

      res.status(200).json({
        success: true,
        data: {
          numStats,
          jobModes,
          jobsByAlgorithm: jobsByAlgorithmFormatted,
          jobStatusOverTime: jobStatusesOverTimeFormatted,
        },
      });
   }catch(error){
     res.status(500).json({
       success: false,
       error: "An error occurred while obtaining the statistics: " + error,
     });
   }
};

export default { getAdminStatistics, getUserStatistics };
