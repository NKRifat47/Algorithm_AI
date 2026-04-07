import { NewTaskService } from "./new_task.service.js";
import httpStatus from "http-status";
import DevBuildError from "../../../lib/DevBuildError.js";

const parseIfJsonString = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const first = trimmed[0];
  if (first !== "{" && first !== "[") return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const createNewTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { prompt, projectId, title } = req.body;

    const result = await NewTaskService.handleNewTask(userId, {
      prompt,
      projectId,
      title,
    });

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Task created and AI responded successfully",
      data: {
        taskId: result.id,
        status: result.status,
        prompt: result.prompt,
        aiResponse: parseIfJsonString(result.content),
        aiResponseRaw: typeof result.content === "string" ? result.content : null,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error("createNewTask error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to process task",
    });
  }
};

const getNewTaskData = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await NewTaskService.getNewTaskData(userId);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getNewTaskData error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch dashboard data",
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await NewTaskService.getTaskById(userId, id);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Task fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("getTaskById error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to fetch task",
    });
  }
};

const continueTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const result = await NewTaskService.continueTask(userId, id, prompt);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "AI response received and conversation updated",
      data: {
        ...result,
        content: parseIfJsonString(result.content),
        contentRaw: typeof result.content === "string" ? result.content : null,
      },
    });
  } catch (error) {
    console.error("continueTask error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to continue conversation",
    });
  }
};

export const NewTaskController = {
  createNewTask,
  getNewTaskData,
  getTaskById,
  continueTask,
};
