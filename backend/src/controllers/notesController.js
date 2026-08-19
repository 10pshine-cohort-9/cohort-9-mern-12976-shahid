import mongoose from "mongoose";
import Note from "../models/Notes.js";
import logger from "../config/logger.js";


const createNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      res.status(400);
      throw new Error("Title and content are required.");
    }

    const note = await Note.create({
      title,
      content,
      userId: req.user._id,
    });

    logger.info({
      event: "CREATE_NOTE",
      noteId: note._id,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Note created successfully.",
      note,
    });
  } catch (error) {
    logger.error({
      event: "CREATE_NOTE_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};


const getAllNotes = async (req, res, next) => {
  try {
    const { search } = req.query;

    const baseQuery = { userId: req.user._id };

    if (search && String(search).trim()) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      baseQuery.$or = [{ title: re }, { content: re }];
    }

    const notes = await Note.find(baseQuery).sort({ updatedAt: -1 });

    logger.info({
      event: "GET_ALL_NOTES",
      userId: req.user._id,
      total: notes.length,
    });

    res.status(200).json({
      success: true,
      total: notes.length,
      notes,
    });
  } catch (error) {
    logger.error({
      event: "GET_ALL_NOTES_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

const getSingleNote = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      res.status(400);
      throw new Error("Invalid note ID.");
    }

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      res.status(404);
      throw new Error("Note not found.");
    }

    logger.info({
      event: "GET_NOTE",
      noteId: note._id,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      note,
    });
  } catch (error) {
    logger.error({
      event: "GET_NOTE_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};


const updateNote = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      res.status(400);
      throw new Error("Invalid note ID.");
    }

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      res.status(404);
      throw new Error("Note not found.");
    }

    note.title = title ?? note.title;
    note.content = content ?? note.content;

    await note.save();

    logger.info({
      event: "UPDATE_NOTE",
      noteId: note._id,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "Note updated successfully.",
      note,
    });
  } catch (error) {
    logger.error({
      event: "UPDATE_NOTE_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      res.status(400);
      throw new Error("Invalid note ID.");
    }

    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!note) {
      res.status(404);
      throw new Error("Note not found.");
    }

    await note.deleteOne();

    logger.info({
      event: "DELETE_NOTE",
      noteId: note._id,
      userId: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "Note deleted successfully.",
    });
  } catch (error) {
    logger.error({
      event: "DELETE_NOTE_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};


export { createNote, getAllNotes, getSingleNote, updateNote, deleteNote };
