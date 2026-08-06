import express from "express";

import {
  createNote,
  getAllNotes,
  getSingleNote,
  updateNote,
  deleteNote,
} from "../controllers/notesController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getAllNotes).post(createNote);

router.route("/:id").get(getSingleNote).put(updateNote).delete(deleteNote);

export default router;
