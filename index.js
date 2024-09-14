const express = require("express");
const bodyParser = require("body-parser");
const logger = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config");
const mongoose = require("mongoose");
const { upload } = require("./utils/upload");
const archiver = require("archiver");
const { Transform } = require("stream");

dotenv.config();

const app = express();

// Connect to database
connectDB();

// Connect to MongoDB GridFS bucket using mongoose
let bucket;
(() => {
  mongoose.connection.on("connected", () => {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });
  });
})();

// Middleware for parsing request body and logging requests
app.use(bodyParser.json());
app.use(logger("dev"));

/* Routes for API endpoints */
// Upload a single file
app.post("/upload/file", upload().single("file"), async (req, res) => {
  try {
    res.status(201).json({ text: "File uploaded successfully !" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: { text: "Unable to upload the file", error },
    });
  }
});

// Upload multiple files
app.post("/upload/files", upload().array("files"), async (req, res) => {
  try {
    res.status(201).json({ text: "Files uploaded successfully !" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: { text: `Unable to upload files`, error },
    });
  }
});

// Download a file by id
app.get("/download/files/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    // Check if file exists
    const file = await bucket
      .find({ _id: new mongoose.Types.ObjectId(fileId) })
      .toArray();
    if (file.length === 0) {
      return res.status(404).json({ error: { text: "File not found" } });
    }

    // set the headers
    res.set("Content-Type", file[0].contentType);
    res.set("Content-Disposition", `attachment; filename=${file[0].filename}`);

    // create a stream to read from the bucket
    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId)
    );

    // pipe the stream to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: { text: `Unable to download file`, error } });
  }
});

// Download multiple files in a zip file
app.get("/download/files-zip", async (req, res) => {
  try {
    const files = await bucket.find().toArray();
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
      const downloadStream = bucket.openDownloadStream(
        new mongoose.Types.ObjectId(file._id)
      );
      archive.append(downloadStream, { name: file.filename });
    });

    archive.finalize();
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: { text: `Unable to download files`, error },
    });
  }
});

// Download multiple files in base64 format
app.get("/download/files-base64", async (_req, res) => {
  try {
    const cursor = bucket.find();
    const files = await cursor.toArray();

    const filesData = await Promise.all(
      files.map((file) => {
        return new Promise((resolve, _reject) => {
          bucket.openDownloadStream(file._id).pipe(
            (() => {
              const chunks = [];
              return new Transform({
                // transform method will
                transform(chunk, encoding, done) {
                  chunks.push(chunk);
                  done();
                },
                flush(done) {
                  const fbuf = Buffer.concat(chunks);
                  const fileBase64String = fbuf.toString("base64");
                  resolve(fileBase64String);
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
});

// Rename a file
app.put("/rename/file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const { filename } = req.body;
    await bucket.rename(new mongoose.Types.ObjectId(fileId), filename);
    res.status(200).json({ text: "File renamed successfully !" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: { text: `Unable to rename file`, error },
    });
  }
});

// Delete a file
app.delete("/delete/file/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
    res.status(200).json({ text: "File deleted successfully !" });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: { text: `Unable to delete file`, error },
    });
  }
});

// Server listening on port 3000 for incoming requests
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
