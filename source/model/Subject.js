const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    credits: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Subject", subjectSchema);

