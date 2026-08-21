import express from "express";

import {
  createNote,
  getAllNotes,
  getSingleNote,
  updateNote,
  deleteNote,
} from "../controllers/notesController.js";

import { protect } from "../middleware/authMiddleware.js";
import { body } from "express-validator";
import validate from "../middleware/validationMiddleware.js";

const router = express.Router();

const noteValidation = [
  body("title")
    .optional({ values: "undefined" })
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty.")
    .isLength({ max: 200 })
    .withMessage("Title must be 200 characters or fewer."),
  body("content")
    .optional({ values: "undefined" })
    .notEmpty()
    .withMessage("Content cannot be empty."),
  validate,
];

router.use(protect);

router.route("/").get(getAllNotes).post(noteValidation, createNote);

router
  .route("/:id")
  .get(getSingleNote)
  .put(noteValidation, updateNote)
  .delete(deleteNote);

export default router;
