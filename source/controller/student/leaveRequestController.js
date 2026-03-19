const LeaveRequest = require("../../model/LeaveRequest");
const ScheduleSlot = require("../../model/ScheduleSlot");

// POST /api/student/leave-request
// Sinh viên gửi đơn xin vắng (có thể kèm ảnh bằng chứng)
module.exports.requestLeave = async (req, res) => {
  try {
    const { slotId, reason } = req.body;
    const studentId = req.userId;
    const proofImageUrl = req.file ? req.file.path || req.file.filename : null;

    if (!slotId || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Kiểm tra slot tồn tại và chưa bắt đầu
    const slot = await ScheduleSlot.findById(slotId).populate("teacherId");
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    const now = new Date();
    const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);

    if (slotDateTime <= now) {
      return res
        .status(400)
        .json({ message: "Cannot request leave for a slot that has already started" });
    }

    // Kiểm tra xem sinh viên đã gửi đơn cho slot này chưa
    const existingRequest = await LeaveRequest.findOne({ slotId, studentId });
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "You have already submitted a leave request for this slot" });
    }

    // Tạo đơn xin vắng
    const leaveRequest = await LeaveRequest.create({
      slotId,
      studentId,
      teacherId: slot.teacherId._id,
      reason,
      proofImageUrl,
      status: "PENDING",
      requestDate: now,
    });

    return res.status(201).json({
      data: leaveRequest,
      message: "Leave request submitted successfully",
    });
  } catch (err) {
    console.error("Error requesting leave:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/student/leave-requests
// Lấy danh sách đơn xin vắng của sinh viên
module.exports.getMyLeaveRequests = async (req, res) => {
  try {
    const studentId = req.userId;

    const requests = await LeaveRequest.find({ studentId })
      .populate("slotId", "date startTime endTime subjectId classId")
      .populate("slotId.subjectId", "code name")
      .populate("slotId.classId", "name")
      .populate("teacherId", "name email")
      .sort({ requestDate: -1 });

    return res.status(200).json({
      data: requests,
    });
  } catch (err) {
    console.error("Error fetching leave requests:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/student/leave-requests/:slotId
// Lấy trạng thái đơn xin vắng cho một slot cụ thể
module.exports.getLeaveRequestBySlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const studentId = req.userId;

    const request = await LeaveRequest.findOne({ slotId, studentId })
      .populate("slotId", "date startTime endTime subjectId classId")
      .populate("slotId.subjectId", "code name")
      .populate("slotId.classId", "name");

    return res.status(200).json({
      data: request || null,
    });
  } catch (err) {
    console.error("Error fetching leave request:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/student/leave-request/:requestId
// Hủy đơn xin vắng (chỉ nếu chưa duyệt)
module.exports.cancelLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const studentId = req.userId;

    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (String(request.studentId) !== String(studentId)) {
      return res.status(403).json({ message: "You do not have permission to cancel this request" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "Can only cancel pending requests" });
    }

    await LeaveRequest.findByIdAndDelete(requestId);

    return res.status(200).json({
      message: "Leave request cancelled successfully",
    });
  } catch (err) {
    console.error("Error cancelling leave request:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
