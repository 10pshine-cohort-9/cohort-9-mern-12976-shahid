import express from "express";
import { body } from "express-validator";

import {
  createNote,
  getAllNotes,
  getSingleNote,
  updateNote,
  deleteNote,
} from "../controllers/noteController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Validation Rules
|--------------------------------------------------------------------------
*/
const createNoteValidation = [
  body("title").trim().notEmpty().withMessage("Title is required."),
  body("content").trim().notEmpty().withMessage("Content is required."),
];

const updateNoteValidation = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty."),
  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Content cannot be empty."),
];

/*
|--------------------------------------------------------------------------
| Notes Routes (all protected)
|--------------------------------------------------------------------------
*/
router.use(protect);

router.route("/").get(getAllNotes).post(createNoteValidation, createNote);

router
  .route("/:id")
  .get(getSingleNote)
  .put(updateNoteValidation, updateNote)
  .delete(deleteNote);

export default router;
