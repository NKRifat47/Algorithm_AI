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

  // 2. Create the initial user message (chat history)
  await prisma.message.create({
    data: {
      taskId: task.id,
      role: "user",
      content: prompt,
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
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
        status: "COMPLETED",
      },
    });

    // 4. Create the final AI message (chat history)
    await prisma.message.create({
      data: {
        taskId: task.id,
        role: "assistant",
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
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

const getTaskById = async (userId, taskId) => {
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) {
    throw new Error("Task not found");
  }

  return task;
};

const continueTask = async (userId, taskId, newPrompt) => {
  // 1. Validating the task exists and belongs to the user
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  if (!existingTask) {
    throw new Error("Task not found or unauthorized");
  }

  // 2. Formatting the context for the AI Engine
  // Note: Existing messages are fetched in desc order, so we reverse it
  const contextHistory = existingTask.messages
    .reverse()
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
    )
    .join("\n");

  const combinedPrompt = `${contextHistory}\nUser: ${newPrompt}`;

  // 3. Updating task status to RUNNING
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "RUNNING" },
  });

  // 4. Save the new user prompt as a Message
  await prisma.message.create({
    data: {
      taskId,
      role: "user",
      content: newPrompt,
    },
  });

  try {
    const aiEngineUrl = envVars.AI_ENGINE_URL || "http://localhost:8000";

    const response = await axios.post(`${aiEngineUrl}/api/generate`, {
      prompt: combinedPrompt,
    });

    const aiContent = response.data;

    // 5. Update Task with latest AI response and status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
        status: "COMPLETED",
      },
    });

    // 6. Save AI's response message
    await prisma.message.create({
      data: {
        taskId,
        role: "assistant",
        content:
          typeof aiContent === "string" ? aiContent : JSON.stringify(aiContent),
      },
    });

    return updatedTask;
  } catch (error) {
    console.error(
      "AI Engine Error (Continue):",
      error.response?.data || error.message,
    );

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "FAILED" },
    });

    throw new Error(
      error.response?.data?.detail ||
        error.message ||
        "Failed to get response from AI Engine",
    );
  }
};

const getProjectById = async (userId, projectId) => {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId,
    },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
};

export const NewTaskService = {
  handleNewTask,
  getNewTaskData,
  getTaskById,
  getProjectById,
  continueTask,
};
