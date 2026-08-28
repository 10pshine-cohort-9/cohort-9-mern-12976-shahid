import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import crypto from "node:crypto";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const REQUIRED_CLOUDINARY_ENV_VARS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

function assertCloudinaryConfig() {
  const missing = REQUIRED_CLOUDINARY_ENV_VARS.filter(
    (key) => !process.env[key],
  );

  if (!missing.length) {
    return;
  }

  const error = new Error(
    `Cloudinary is not configured correctly. Missing: ${missing.join(", ")}`,
  );
  error.statusCode = 500;
  throw error;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getSafePublicId(originalName = "image") {
  const lastDotIndex = originalName.lastIndexOf(".");
  const baseName = lastDotIndex > 0 ? originalName.slice(0, lastDotIndex) : originalName;

  const randomPart = crypto.randomBytes(4).toString("hex");

  let safeString = `${Date.now()}-${randomPart}-${baseName}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-{2,}/g, "-");


  let start = 0;
  while (start < safeString.length && safeString[start] === "-") {
    start++;
  }

  let end = safeString.length - 1;
  while (end >= start && safeString[end] === "-") {
    end--;
  }


  return safeString.slice(start, end + 1).slice(0, 80);
}

function imageFileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    const error = new Error("Only JPG, PNG, and WEBP image files are allowed.");
    error.statusCode = 400;
    cb(error);
    return;
  }

  cb(null, true);
}

function createCloudinaryStorage({ folder, transformation }) {
  return new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      assertCloudinaryConfig();

      return {
        folder,
        resource_type: "image",
        public_id: getSafePublicId(file.originalname),
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation,
      };
    },
  });
}

function createImageUpload({ folder, transformation }) {
  return multer({
    storage: createCloudinaryStorage({ folder, transformation }),
    fileFilter: imageFileFilter,
    limits: {
      fileSize: MAX_IMAGE_FILE_SIZE,
      files: 1,
      fields: 10,
      parts: 20,
    },
  });
}

export const uploadProfileImage = createImageUpload({
  folder: "profile_pictures",
  transformation: [
    {
      width: 256,
      height: 256,
      crop: "fill",
      gravity: "face",
    },
  ],
}).single("image");

export const uploadNoteImage = createImageUpload({
  folder: "notes_media",
}).single("image");

export {
  cloudinary,
  MAX_IMAGE_FILE_SIZE,
  ALLOWED_IMAGE_MIME_TYPES,
  assertCloudinaryConfig,
  getSafePublicId,
};
