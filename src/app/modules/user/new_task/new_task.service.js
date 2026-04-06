import axios from "axios";
import prisma from "../../../prisma/client.js";
import { envVars } from "../../../config/env.js";

const handleNewTask = async (userId, payload) => {
  const { prompt, projectId, title } = payload;

  // 1. Create the Task in DB
  const task = await prisma.task.create({
    data: {
      userId,
      projectId: projectId || null,
      title: title || prompt.substring(0, 50),
      prompt,
      status: "RUNNING",
    },
  });

  try {
    // 2. Call teammate's AI Engine
    const aiEngineUrl = envVars.AI_ENGINE_URL || "http://localhost:8000";

    const response = await axios.post(`${aiEngineUrl}/api/generate`, {
      prompt,
    });

    const aiContent = response.data;

    // 3. Update Task with AI Content and status
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        content: typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
        status: "COMPLETED",
      },
    });

    return updatedTask;
  } catch (error) {
    console.error("AI Engine Error:", error.response?.data || error.message);

    // Update task to FAILED if AI call fails
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "FAILED" },
    });

    throw new Error(
      error.response?.data?.detail ||
        error.message ||
        "Failed to get response from AI Engine",
    );
  }
};

const getNewTaskData = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      avatar: true,
      credits: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const projects = await prisma.project.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const tasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      status: true,
      prompt: true,
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    profile: {
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      avatar: user.avatar,
      credits: user.credits,
    },
    projects,
    tasks,
  };
};

export const NewTaskService = {
  handleNewTask,
  getNewTaskData,
};
