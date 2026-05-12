import { NewTaskService } from "./new_task.service.js";
import httpStatus from "http-status";
import DevBuildError from "../../../lib/DevBuildError.js";
import prisma from "../../../prisma/client.js";
import {
  chargeCredits,
  refundCredits,
  CREDIT_COSTS,
} from "../../../utils/credits.js";
import { formatAiResponseObject } from "../../../utils/aiResponseFormatter.js";

// ---------- Local Helpers ----------
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

const removeAiEnginePdfPath = (value) => {
  if (!value || typeof value !== "object") return value;

  // We don't want to expose the AI engine's internal file path.
  const cloned = structuredClone(value);
  if (cloned?.data?.result?.pdf_path) {
    delete cloned.data.result.pdf_path;
  }
  return cloned;
};

const mapTaskToStandardStructure = (task, promptOverride) => {
  const responseType = NewTaskService.detectResponseType
    ? NewTaskService.detectResponseType(task.content)?.type
    : "text";

  const codeFiles =
    responseType === "codebase" &&
    NewTaskService.getCodebaseFilesFromAiResponse
      ? NewTaskService.getCodebaseFilesFromAiResponse(task.content)
      : [];

  const latestUserMessage = (task.messages || [])
    .filter((m) => m.role === "user")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return {
    taskId: task.id,
    status: task.status,
    prompt: promptOverride || (latestUserMessage ? latestUserMessage.content : task.prompt),
    session_id: task.session_id,
    aiInitialRoute: task.aiInitialRoute,
    aiResponse: formatAiResponseObject(
      removeAiEnginePdfPath(parseIfJsonString(task.content)),
      { excludeFields: responseType === "codebase" ? ["output"] : [] },
    ),
    aiResponseRaw: typeof task.content === "string" ? task.content : null,
    responseType,
    pdf: {
      generated: false,
      generateUrl: `/api/user/new-task/${task.id}/pdf`,
      downloadUrl: `/api/user/new-task/${task.id}/pdf/download`,
    },
    codebase: {
      generated: false,
      files: codeFiles,
      generateUrl: `/api/user/new-task/${task.id}/codebase`,
      downloadUrl: `/api/user/new-task/${task.id}/codebase/download`,
    },
    preview: {
      previewUrl: `/api/user/new-task/${task.id}/preview`,
      projectPath:
        NewTaskService.extractProjectPathFromAiContent(task.content) ?? null,
    },
    createdAt: task.createdAt,
  };
};

// ---------- Route Handlers ----------
const createNewTask = async (req, res) => {
  req.setTimeout(600_000);
  const userId = req.user.id;
  let charged = false;
  try {
    const { prompt, projectId, title, mode } = req.body;

    await chargeCredits(prisma, userId, {
      amount: CREDIT_COSTS.AI_QUERY,
      reason: "AI_QUERY",
      meta: { endpoint: "new-task:create" },
    });
    charged = true;

    const result = await NewTaskService.handleNewTask(userId, {
      prompt,
      projectId,
      title,
      mode,
    });

    const responseType = NewTaskService.detectResponseType
      ? NewTaskService.detectResponseType(result.content)?.type
      : "text";

    const codeFiles =
      responseType === "codebase" &&
      NewTaskService.getCodebaseFilesFromAiResponse
        ? NewTaskService.getCodebaseFilesFromAiResponse(result.content)
        : [];

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Task created and AI responded successfully",
      data: mapTaskToStandardStructure(result),
    });
  } catch (error) {
    console.error("createNewTask error:", error);

    if (charged) {
      try {
        await refundCredits(prisma, userId, {
          amount: CREDIT_COSTS.AI_QUERY,
          reason: "AI_QUERY_FAILED_REFUND",
          meta: { endpoint: "new-task:create" },
        });
      } catch (refundError) {
        console.error("createNewTask refund error:", refundError);
      }
    }

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
      data: {
        profile: result.profile,
        projects: result.projects,
        tasks: (result.tasks || []).map((task) => mapTaskToStandardStructure(task)),
      },
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
      message: "AI response received and conversation updated",
      data: mapTaskToStandardStructure(result),
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
  req.setTimeout(600_000);
  const userId = req.user.id;
  let charged = false;
  try {
    const { id } = req.params;
    const { prompt, session_id: sessionId } = req.body;

    if (!prompt) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Prompt is required",
      });
    }

    await chargeCredits(prisma, userId, {
      amount: CREDIT_COSTS.AI_QUERY,
      reason: "AI_QUERY",
      meta: { endpoint: "new-task:continue", taskId: id },
    });
    charged = true;

    const result = await NewTaskService.continueTask(
      userId,
      id,
      prompt,
      sessionId,
    );
    const responseType = NewTaskService.detectResponseType
      ? NewTaskService.detectResponseType(result.content)?.type
      : "text";

    const codeFiles =
      responseType === "codebase" &&
      NewTaskService.getCodebaseFilesFromAiResponse
        ? NewTaskService.getCodebaseFilesFromAiResponse(result.content)
        : [];

    return res.status(httpStatus.OK).json({
      success: true,
      message: "AI response received and conversation updated",
      data: mapTaskToStandardStructure(result, prompt),
    });
  } catch (error) {
    console.error("continueTask error:", error);

    if (charged) {
      try {
        await refundCredits(prisma, userId, {
          amount: CREDIT_COSTS.AI_QUERY,
          reason: "AI_QUERY_FAILED_REFUND",
          meta: { endpoint: "new-task:continue" },
        });
      } catch (refundError) {
        console.error("continueTask refund error:", refundError);
      }
    }

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

// ---------- Controller Export ----------
export const NewTaskController = {
  createNewTask,
  getNewTaskData,
  getTaskById,
  continueTask,
  generateTaskPdf: async (req, res) => {
    const userId = req.user.id;
    try {
      const { id: taskId } = req.params;

      const result = await NewTaskService.generateTaskPdf(userId, taskId);

      if (!result.alreadyExisted) {
        await chargeCredits(prisma, userId, {
          amount: CREDIT_COSTS.PDF_EXPORT,
          reason: "PDF_EXPORT",
          meta: { endpoint: "new-task:pdf", taskId },
        });
      }

      return res.status(httpStatus.OK).json({
        success: true,
        message: result.alreadyExisted
          ? "PDF already generated for this task"
          : "PDF generated successfully",
        data: {
          taskId,
          pdf: {
            path: result.pdfPath,
            downloadUrl: `/api/user/new-task/${taskId}/pdf/download`,
          },
        },
      });
    } catch (error) {
      console.error("generateTaskPdf error:", error);

      if (error instanceof DevBuildError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to generate PDF",
      });
    }
  },
  downloadTaskPdf: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id: taskId } = req.params;

      const { absolutePdfPath } = await NewTaskService.getTaskPdfPath(
        userId,
        taskId,
      );

      return res.download(absolutePdfPath, `task-${taskId}.pdf`);
    } catch (error) {
      console.error("downloadTaskPdf error:", error);

      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "PDF not found",
      });
    }
  },
  generateTaskCodebaseZip: async (req, res) => {
    const userId = req.user.id;
    try {
      const { id: taskId } = req.params;

      const result = await NewTaskService.generateTaskCodebaseZip(
        userId,
        taskId,
      );

      if (!result.alreadyExisted) {
        await chargeCredits(prisma, userId, {
          amount: CREDIT_COSTS.CODEBASE_EXPORT,
          reason: "CODEBASE_EXPORT",
          meta: { endpoint: "new-task:codebase", taskId },
        });
      }

      return res.status(httpStatus.OK).json({
        success: true,
        message: result.alreadyExisted
          ? "Codebase ZIP already generated for this task"
          : "Codebase ZIP generated successfully",
        data: {
          taskId,
          filesCount: result.filesCount ?? null,
          codebase: {
            path: result.zipPath,
            downloadUrl: `/api/user/new-task/${taskId}/codebase/download`,
          },
        },
      });
    } catch (error) {
      console.error("generateTaskCodebaseZip error:", error);
      if (error instanceof DevBuildError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to generate codebase ZIP",
      });
    }
  },
  downloadTaskCodebaseZip: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id: taskId } = req.params;

      const { absoluteZipPath } = await NewTaskService.getTaskCodebaseZipPath(
        userId,
        taskId,
      );

      return res.download(absoluteZipPath, `task-${taskId}-codebase.zip`);
    } catch (error) {
      console.error("downloadTaskCodebaseZip error:", error);

      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "ZIP not found",
      });
    }
  },
  previewProject: async (req, res) => {
    try {
      const userId = req.user.id;
      const { id: taskId } = req.params;
      const { project_path: projectPath } = req.body || {};

      const data = await NewTaskService.previewProject(
        userId,
        taskId,
        projectPath,
      );

      return res.status(httpStatus.OK).json({
        success: true,
        message: "Preview retrieved successfully",
        data,
      });
    } catch (error) {
      console.error("previewProject error:", error);

      if (error instanceof DevBuildError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || "Failed to load preview",
      });
    }
  },
};
