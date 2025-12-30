const express = require("express");
const { upload } = require("../utils/upload");
const fileController = require("../controllers/fileController");

const router = express.Router();

// Upload a single file
router.post("/upload/file", (req, res, next) => {
  upload().single("file")(req, res, next);
}, fileController.uploadFile);

// Upload multiple files
router.post("/upload/files", (req, res, next) => {
  upload().array("files")(req, res, next);
}, fileController.uploadFiles);

// Get all files
router.get("/files", fileController.getAllFiles);

// Download a file by id
router.get("/download/files/:fileId", fileController.downloadFile);

// Download multiple files in a zip file
router.get("/download/files-zip", fileController.downloadFilesZip);

// Download multiple files in base64 format
router.get("/download/files-base64", fileController.downloadFilesBase64);

// Rename a file
router.put("/rename/file/:fileId", fileController.renameFile);

// Delete a file
router.delete("/delete/file/:fileId", fileController.deleteFile);

module.exports = router;
