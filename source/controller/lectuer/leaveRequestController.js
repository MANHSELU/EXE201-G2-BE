const LeaveRequest = require("../../model/LeaveRequest");
const AttendanceRecord = require("../../model/AttendanceRecord");
const ScheduleSlot = require("../../model/ScheduleSlot");

// GET /api/lecturer/leave-requests
// Lấy danh sách đơn xin vắng cho các slot của giáo viên
module.exports.getLeaveRequestsForLecturer = async (req, res) => {
  try {
    const teacherId = req.userId;

    const requests = await LeaveRequest.find({ teacherId })
      .populate("slotId", "date startTime endTime subjectId classId")
      .populate("slotId.subjectId", "code name")
      .populate("slotId.classId", "name")
      .populate("studentId", "name email")
      .sort({ requestDate: -1 });

    return res.status(200).json({
      data: requests,
    });
  } catch (err) {
    console.error("Error fetching leave requests:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/lecturer/leave-request/:requestId/approve
// Giáo viên duyệt đơn xin vắng
module.exports.approveLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { responseNote } = req.body;
    const teacherId = req.userId;

    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (String(request.teacherId) !== String(teacherId)) {
      return res.status(403).json({ message: "You do not have permission to respond to this request" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "Can only approve pending requests" });
    }

    // Cập nhật trạng thái request
    request.status = "APPROVED";
    request.responseDate = new Date();
    request.responseNote = responseNote || "Approved";
    await request.save();

    // Tạo bản ghi điểm danh với trạng thái PRESENT + note nghỉ có phép
    // Tìm AttendanceSession cho slot đó
    const slot = await ScheduleSlot.findById(request.slotId);
    
    // Tạo attendance record (nếu chưa có)
    const existingRecord = await AttendanceRecord.findOne({
      slotId: request.slotId,
      studentId: request.studentId,
    });

    if (!existingRecord) {
      await AttendanceRecord.create({
        slotId: request.slotId,
        studentId: request.studentId,
        status: "PRESENT", // Đánh dấu đã điểm danh
        checkinTime: new Date(),
        // Có thể thêm note qua một field khác nếu cần
      });
    }

    return res.status(200).json({
      data: request,
      message: "Leave request approved successfully",
    });
  } catch (err) {
    console.error("Error approving leave request:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/lecturer/leave-request/:requestId/reject
// Giáo viên từ chối đơn xin vắng
module.exports.rejectLeaveRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { responseNote } = req.body;
    const teacherId = req.userId;

    const request = await LeaveRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (String(request.teacherId) !== String(teacherId)) {
      return res.status(403).json({ message: "You do not have permission to respond to this request" });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ message: "Can only reject pending requests" });
    }

    // Cập nhật trạng thái request
    request.status = "REJECTED";
    request.responseDate = new Date();
    request.responseNote = responseNote || "Rejected";
    await request.save();

    return res.status(200).json({
      data: request,
      message: "Leave request rejected successfully",
    });
  } catch (err) {
    console.error("Error rejecting leave request:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Auto-reject pending requests khi slot bắt đầu
// Có thể chạy qua cron job hoặc gọi từ khi điểm danh bắt đầu
module.exports.autoRejectExpiredRequests = async (req, res) => {
  try {
    const now = new Date();

    // Tìm tất cả pending requests cho slots đã bắt đầu
    const slots = await ScheduleSlot.find({}).select("date startTime _id");

    for (const slot of slots) {
      const slotDateTime = new Date(`${slot.date}T${slot.startTime}`);
      
      if (slotDateTime <= now) {
        // Auto-reject all pending requests for this slot
        await LeaveRequest.updateMany(
          { slotId: slot._id, status: "PENDING" },
          { status: "REJECTED", responseDate: now, responseNote: "Auto-rejected: slot has started" },
        );
      }
    }

    return res.status(200).json({
      message: "Expired leave requests updated",
    });
  } catch (err) {
    console.error("Error auto-rejecting requests:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
