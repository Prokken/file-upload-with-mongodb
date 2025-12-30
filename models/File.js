const mongoose = require("mongoose");

class FileModel {
  constructor() {
    this.bucket = null;
    this.initBucket();
  }

  initBucket() {
    mongoose.connection.on("connected", () => {
      this.bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "uploads",
      });
    });
  }

  getBucket() {
    return this.bucket;
  }

  async getAllFiles() {
    return await this.bucket.find().toArray();
  }

  async getFileById(fileId) {
    return await this.bucket
      .find({ _id: new mongoose.Types.ObjectId(fileId) })
      .toArray();
  }

  async renameFile(fileId, newFilename) {
    await this.bucket.rename(
      new mongoose.Types.ObjectId(fileId),
      newFilename
    );
  }

  async deleteFile(fileId) {
    await this.bucket.delete(new mongoose.Types.ObjectId(fileId));
  }

  openDownloadStream(fileId) {
    return this.bucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId)
    );
  }
}

module.exports = new FileModel();
