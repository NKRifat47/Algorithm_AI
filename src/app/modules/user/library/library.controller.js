import httpStatus from "http-status";
import DevBuildError from "../../../lib/DevBuildError.js";
import { sendResponse } from "../../../utils/sendResponse.js";
import { LibraryService } from "./library.service.js";

const listTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await LibraryService.listTemplates(userId, req.query);

    return sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Library templates fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  } catch (error) {
    console.error("listTemplates error:", error);
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch templates",
    });
  }
};

const listFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await LibraryService.listTemplates(userId, {
      ...req.query,
      favoritesOnly: true,
    });

    return sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Favourite templates fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  } catch (error) {
    console.error("listFavorites error:", error);
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch favourites",
    });
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId } = req.params;
    const result = await LibraryService.toggleFavorite(userId, templateId);

    return sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: result.isFavorite
        ? "Added to favourites"
        : "Removed from favourites",
      data: result,
    });
  } catch (error) {
    console.error("toggleFavorite error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to update favourite",
    });
  }
};

export const LibraryController = {
  listTemplates,
  listFavorites,
  toggleFavorite,
};
