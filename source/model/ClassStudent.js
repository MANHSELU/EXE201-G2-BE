const mongoose = require("mongoose");

const classStudentSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

classStudentSchema.index({ classId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("ClassStudent", classStudentSchema);

