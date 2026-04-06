import { ProjectService } from "./project.service.js";
import httpStatus from "http-status";
import DevBuildError from "../../../lib/DevBuildError.js";

const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;

    const result = await ProjectService.createProject(userId, {
      name,
      description,
    });

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Project created successfully",
      data: result,
    });
  } catch (error) {
    console.error("createProject error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to create project",
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await ProjectService.getProjectById(userId, id);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Project fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getProjectById error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch project",
    });
  }
};

export const ProjectController = {
  createProject,
  getProjectById,
};
