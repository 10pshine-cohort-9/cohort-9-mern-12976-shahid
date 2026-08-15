import User from "../models/User.js";
import { cloudinary } from "../config/cloudinary.js";
import logger from "../config/logger.js";
import { serializeUser } from "../utils/serializeUser.js";

const uploadProfileAvatar = async (req, res, next) => {
  try {
    if (!req.file?.path) {
      res.status(400);
      throw new Error("Please upload an image.");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User not found.");
    }

    const previousAvatarPublicId = user.avatarPublicId;
    user.avatarUrl = req.file.path;
    user.avatarPublicId = req.file.filename || "";

    await user.save();

    if (
      previousAvatarPublicId &&
      previousAvatarPublicId !== user.avatarPublicId
    ) {
      cloudinary.uploader
        .destroy(previousAvatarPublicId, {
          resource_type: "image",
          invalidate: true,
        })
        .catch(() => {
          logger.warn({
            event: "DELETE_OLD_AVATAR_FAILED",
            publicId: previousAvatarPublicId,
            userId: user._id,
          });
        });
    }

    logger.info({
      event: "UPLOAD_PROFILE_AVATAR_SUCCESS",
      userId: user._id,
      avatarPublicId: user.avatarPublicId,
    });

    res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully.",
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error({
      event: "UPLOAD_PROFILE_AVATAR_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

const uploadNoteEditorImage = async (req, res, next) => {
  try {
    if (!req.file?.path) {
      res.status(400);
      throw new Error("Please upload an image.");
    }

    logger.info({
      event: "UPLOAD_NOTE_IMAGE_SUCCESS",
      userId: req.user._id,
      imagePublicId: req.file.filename,
    });

    res.status(200).json({
      success: true,
      message: "Note image uploaded successfully.",
      url: req.file.path,
    });
  } catch (error) {
    logger.error({
      event: "UPLOAD_NOTE_IMAGE_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

export { uploadProfileAvatar, uploadNoteEditorImage };
