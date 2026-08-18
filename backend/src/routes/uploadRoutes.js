import express from "express";
import {
  uploadProfileAvatar,
  uploadNoteEditorImage,
} from "../controllers/uploadController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  uploadProfileImage,
  uploadNoteImage,
} from "../config/cloudinary.js";

const router = express.Router();

router.use(protect);

router.post("/profile", uploadProfileImage, uploadProfileAvatar);
router.post("/note-image", uploadNoteImage, uploadNoteEditorImage);

export default router;
