const mongoose = require("mongoose");
const archiver = require("archiver");
const { Transform } = require("stream");
const FileModel = require("../models/File");

class FileController {
  // Upload single file
  async uploadFile(req, res) {
    try {
      res.status(201).json({ 
        text: "File uploaded successfully !",
        file: req.file
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        error: { text: "Unable to upload the file", error },
      });
    }
  }

  // Upload multiple files
  async uploadFiles(req, res) {
    try {
      res.status(201).json({ 
        text: "Files uploaded successfully !",
        files: req.files
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        error: { text: `Unable to upload files`, error },
      });
    }
  }

  // Get all files
  async getAllFiles(req, res) {
    try {
      const files = await FileModel.getAllFiles();
      res.status(200).json(files);
    } catch (error) {
      console.log(error);
      res.status(400).json({
        error: { text: `Unable to retrieve files`, error },
      });
    }
  }

  // Download a single file by id
  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;

      // Check if file exists
      const file = await FileModel.getFileById(fileId);
      if (file.length === 0) {
        return res.status(404).json({ error: { text: "File not found" } });
      }

      // Set the headers
      res.set("Content-Type", file[0].contentType);
      res.set("Content-Disposition", `attachment; filename=${file[0].filename}`);

      // Create a stream to read from the bucket
      const downloadStream = FileModel.openDownloadStream(fileId);

      // Pipe the stream to the response
      downloadStream.pipe(res);
    } catch (error) {
      console.log(error);
      res.status(400).json({ error: { text: `Unable to download file`, error } });
    }
  }

  // Download multiple files in a zip file
  async downloadFilesZip(req, res) {
    try {
      const files = await FileModel.getAllFiles();
      if (files.length === 0) {
        return res.status(404).json({ error: { text: "No files found" } });
      }

      res.set("Content-Type", "application/zip");
      res.set("Content-Disposition", `attachment; filename=files.zip`);
      res.set("Access-Control-Allow-Origin", "*");

      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      archive.pipe(res);

      files.forEach((file) => {
        const downloadStream = FileModel.openDownloadStream(file._id);
        archive.append(downloadStream, { name: file.filename });
      });

      archive.finalize();
    } catch (error) {
      console.log(error);
      res.status(400).json({
        error: { text: `Unable to download files`, error },
      });
    }
  }

  // Download multiple files in base64 format
  async downloadFilesBase64(req, res) {
    try {
      const files = await FileModel.getAllFiles();

      const filesData = await Promise.all(
        files.map((file) => {
          return new Promise((resolve, _reject) => {
            FileModel.openDownloadStream(file._id).pipe(
              (() => {
                const chunks = [];
                return new Transform({
                  transform(chunk, encoding, done) {
                    chunks.push(chunk);
                    done();
                  },
                  flush(done) {
                    const fbuf = Buffer.concat(chunks);
                    const fileBase64String = fbuf.toString("base64");
                    resolve({
                      filename: file.filename,
                      contentType: file.contentType,
                      data: fileBase64String,
                      size: file.length,
                      uploadDate: file.uploadDate
                    });
                    done();
                  },
                });
              })()
            );
          });
        })
      );
      res.status(200).json(filesData);
    } catch (error) {
      console.log(error);
      res.status(400).json({
        error: { text: `Unable to retrieve files`, error },
      });
    }
  }

  // Rename a file
  async renameFile(req, res) {
    try {
      const { fileId } = req.params;
      const { filename } = req.body;
      await FileModel.renameFile(fileId, filename);
      res.status(200).json({ text: "File renamed successfully !" });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        error: { text: `Unable to rename file`, error },
      });
    }
  }

  // Delete a file
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      await FileModel.deleteFile(fileId);
      res.status(200).json({ text: "File deleted successfully !" });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        error: { text: `Unable to delete file`, error },
      });
    }
  }
}

module.exports = new FileController();
