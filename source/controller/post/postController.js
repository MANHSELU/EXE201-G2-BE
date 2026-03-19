const Post = require("../../model/Post");
const User = require("../../model/Users");
const { pushNotification } = require("../notification/notificationController");

// ===== SHARED (student + lecturer) =====

// GET approved posts feed
const getFeed = async (req, res) => {
  try {
    const posts = await Post.find({ status: "APPROVED" })
      .populate("authorId", "fullName role")
      .populate("comments.authorId", "fullName role")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ data: posts });
  } catch (err) {
    res.status(500).json({ message: "Lỗi tải bảng tin", error: err.message });
  }
};

// POST create post (status: PENDING)
const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: "Nội dung không được để trống" });
    const images = req.files ? req.files.map((f) => `/uploads/post-images/${f.filename}`) : [];
    const post = await Post.create({ authorId: req.userId, content: content.trim(), images });
    res.status(201).json({ message: "Bài viết đã gửi, chờ duyệt", data: post });
  } catch (err) {
    res.status(500).json({ message: "Lỗi tạo bài viết", error: err.message });
  }
};

// DELETE own post
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    if (post.authorId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Không có quyền xóa bài viết này" });
    }
    await post.deleteOne();
    // Emit feed update
    req.app.get("io").emit("feed-update");
    res.json({ message: "Đã xóa bài viết" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi xóa bài viết", error: err.message });
  }
};

// POST toggle like
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== "APPROVED") return res.status(404).json({ message: "Không tìm thấy bài viết" });
    const uid = req.userId.toString();
    const idx = post.likes.findIndex((l) => l.toString() === uid);
    if (idx === -1) post.likes.push(req.userId);
    else post.likes.splice(idx, 1);
    await post.save();

    // Emit feed update
    req.app.get("io").emit("feed-update");

    // Notify post author on like (not unlike)
    if (idx === -1 && post.authorId.toString() !== uid) {
      const fromUser = await User.findById(req.userId).select("fullName");
      pushNotification(req, {
        userId: post.authorId,
        fromUserId: req.userId,
        type: "LIKE",
        postId: post._id,
        message: `${fromUser.fullName} đã thích bài viết của bạn`,
      });
    }

    res.json({ liked: idx === -1, likeCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

// POST add comment (supports reply via parentCommentId)
const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.status !== "APPROVED") return res.status(404).json({ message: "Không tìm thấy bài viết" });
    const { content, parentCommentId, replyToName } = req.body;
    const commentImages = req.files ? req.files.map((f) => `/uploads/post-images/${f.filename}`) : [];
    if ((!content || !content.trim()) && commentImages.length === 0) return res.status(400).json({ message: "Nội dung bình luận không được để trống" });
    post.comments.push({
      authorId: req.userId,
      content: (content || "").trim(),
      images: commentImages,
      parentCommentId: parentCommentId || null,
      replyToName: replyToName || "",
    });
    await post.save();
    const updated = await Post.findById(post._id).populate("comments.authorId", "fullName role");
    const newComment = updated.comments[updated.comments.length - 1];

    // Emit feed update
    req.app.get("io").emit("feed-update");

    // Notify post author and/or parent comment author
    const fromUser = await User.findById(req.userId).select("fullName");
    const notifiedUsers = new Set();

    // If replying, notify the parent comment author first
    if (parentCommentId) {
      const parentComment = post.comments.find((c) => c._id.toString() === parentCommentId);
      if (parentComment && parentComment.authorId.toString() !== req.userId.toString()) {
        pushNotification(req, {
          userId: parentComment.authorId,
          fromUserId: req.userId,
          type: "COMMENT",
          postId: post._id,
          message: `${fromUser.fullName} đã trả lời bình luận của bạn: "${content.trim().slice(0, 50)}"`,
        });
        notifiedUsers.add(parentComment.authorId.toString());
      }
    }

    // Notify post author (if not already notified as parent comment author)
    if (post.authorId.toString() !== req.userId.toString() && !notifiedUsers.has(post.authorId.toString())) {
      pushNotification(req, {
        userId: post.authorId,
        fromUserId: req.userId,
        type: "COMMENT",
        postId: post._id,
        message: `${fromUser.fullName} đã bình luận bài viết của bạn: "${content.trim().slice(0, 50)}"`,
      });
    }

    res.status(201).json({ data: newComment });
  } catch (err) {
    res.status(500).json({ message: "Lỗi bình luận", error: err.message });
  }
};

// POST toggle like on a comment
const toggleCommentLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Không tìm thấy bình luận" });
    const uid = req.userId.toString();
    const idx = comment.likes.findIndex((l) => l.toString() === uid);
    if (idx === -1) comment.likes.push(req.userId);
    else comment.likes.splice(idx, 1);
    await post.save();
    req.app.get("io").emit("feed-update");
    res.json({ liked: idx === -1, likeCount: comment.likes.length });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

// GET my posts (including PENDING/REJECTED)
const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.userId })
      .populate("comments.authorId", "fullName role")
      .sort({ createdAt: -1 });
    res.json({ data: posts });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

// ===== ADMIN =====

// GET all posts (all statuses) for moderation
const adminGetPosts = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const posts = await Post.find(filter)
      .populate("authorId", "fullName email role")
      .populate("comments.authorId", "fullName role")
      .sort({ createdAt: -1 });
    res.json({ data: posts });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

// PATCH approve post
const approvePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { status: "APPROVED", rejectedReason: "" }, { new: true });
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // Emit feed update so everyone sees new post
    req.app.get("io").emit("feed-update");

    // Notify author
    pushNotification(req, {
      userId: post.authorId,
      fromUserId: req.userId,
      type: "POST_APPROVED",
      postId: post._id,
      message: "Bài viết của bạn đã được duyệt và hiển thị trên bảng tin",
    });

    res.json({ message: "Đã duyệt bài viết", data: post });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

// PATCH reject post
const rejectPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findByIdAndUpdate(req.params.id, { status: "REJECTED", rejectedReason: reason || "" }, { new: true });
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // Notify author
    pushNotification(req, {
      userId: post.authorId,
      fromUserId: req.userId,
      type: "POST_REJECTED",
      postId: post._id,
      message: `Bài viết của bạn đã bị từ chối${reason ? ": " + reason : ""}`,
    });

    res.json({ message: "Đã từ chối bài viết", data: post });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

// DELETE post (admin)
const adminDeletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    req.app.get("io").emit("feed-update");
    res.json({ message: "Đã xóa bài viết" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi", error: err.message });
  }
};

module.exports = {
  getFeed, createPost, deletePost, toggleLike, addComment, toggleCommentLike, getMyPosts,
  adminGetPosts, approvePost, rejectPost, adminDeletePost,
};
