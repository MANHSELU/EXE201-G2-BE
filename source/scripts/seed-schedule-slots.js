/**
 * Script để tạo dữ liệu mẫu cho ScheduleSlot
 * Chạy: node source/scripts/seed-schedule-slots.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const ScheduleSlot = require("../model/ScheduleSlot");
const Subject = require("../model/Subject");
const ClassModel = require("../model/Class");
const Room = require("../model/Room");
const User = require("../model/Users");
const Role = require("../model/Role");
const ClassStudent = require("../model/ClassStudent");

// Kết nối MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/EXE_TEST";
    console.log("🔗 Kết nối tới:", uri);
    await mongoose.connect(uri);
    console.log("✅ Kết nối MongoDB thành công!");
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err);
    process.exit(1);
  }
};

// Tạo dữ liệu mẫu
const seedData = async () => {
  try {
    console.log("\n🔄 Bắt đầu tạo dữ liệu mẫu...\n");

    // ========== 0. TẠO ROLES ==========
    console.log("🔐 Tạo roles...");
    let lecturerRole = await Role.findOne({ name: "LECTURER" });
    let studentRole = await Role.findOne({ name: "STUDENT" });
    
    if (!lecturerRole) {
      lecturerRole = await Role.create({ name: "LECTURER", description: "Giảng viên" });
    }
    if (!studentRole) {
      studentRole = await Role.create({ name: "STUDENT", description: "Sinh viên" });
    }
    console.log(`   → Roles: LECTURER, STUDENT`);

    // ========== 1. TẠO SUBJECTS ==========
    console.log("📚 Tạo môn học...");
    let subjects = await Subject.find({});
    if (subjects.length === 0) {
      subjects = await Subject.insertMany([
        { code: "WEB101", name: "Lập trình Web", credits: 3 },
        { code: "DB201", name: "Cơ sở dữ liệu", credits: 3 },
        { code: "MOB301", name: "Lập trình Mobile", credits: 3 },
        { code: "AI401", name: "Trí tuệ nhân tạo", credits: 4 },
      ]);
    }
    console.log(`   → ${subjects.length} môn học`);

    // ========== 2. TẠO ROOMS ==========
    console.log("🏫 Tạo phòng học...");
    let rooms = await Room.find({});
    if (rooms.length === 0) {
      rooms = await Room.insertMany([
        { name: "A101", building: "A", capacity: 40 },
        { name: "A102", building: "A", capacity: 40 },
        { name: "B201", building: "B", capacity: 50 },
        { name: "B202", building: "B", capacity: 50 },
        { name: "C301", building: "C", capacity: 30 },
      ]);
    }
    console.log(`   → ${rooms.length} phòng học`);

    // ========== 3. TẠO CLASSES ==========
    console.log("🎓 Tạo lớp học...");
    let classes = await ClassModel.find({});
    if (classes.length === 0) {
      classes = await ClassModel.insertMany([
        { name: "SE1801", courseYear: 2024 },
        { name: "SE1802", courseYear: 2024 },
        { name: "AI1901", courseYear: 2024 },
      ]);
    }
    console.log(`   → ${classes.length} lớp học`);

    // ========== 4. LẤY USERS ==========
    console.log("👥 Lấy danh sách users...");
    let lecturers = await User.find({ roleId: lecturerRole._id }).limit(3);
    let students = await User.find({ roleId: studentRole._id }).limit(10);
    console.log(`   → ${lecturers.length} giảng viên, ${students.length} sinh viên`);

    if (lecturers.length === 0) {
      console.log("⚠️  Không có giảng viên! Tạo giảng viên mẫu...");
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("123456", 10);
      const newLecturers = await User.insertMany([
        { email: "lecturer1@school.edu", password: hashedPassword, fullName: "Nguyễn Văn A", roleId: lecturerRole._id },
        { email: "lecturer2@school.edu", password: hashedPassword, fullName: "Trần Thị B", roleId: lecturerRole._id },
      ]);
      lecturers = newLecturers;
      console.log(`   → Đã tạo ${newLecturers.length} giảng viên mẫu`);
    }

    if (students.length === 0) {
      console.log("⚠️  Không có sinh viên! Tạo sinh viên mẫu...");
      const bcrypt = require("bcryptjs");
      const hashedPassword = await bcrypt.hash("123456", 10);
      const newStudents = await User.insertMany([
        { email: "student1@school.edu", password: hashedPassword, fullName: "Sinh viên 1", roleId: studentRole._id },
        { email: "student2@school.edu", password: hashedPassword, fullName: "Sinh viên 2", roleId: studentRole._id },
        { email: "student3@school.edu", password: hashedPassword, fullName: "Sinh viên 3", roleId: studentRole._id },
      ]);
      students = newStudents;
      console.log(`   → Đã tạo ${newStudents.length} sinh viên mẫu`);
    }

    // ========== 5. GÁN SINH VIÊN VÀO LỚP ==========
    console.log("📋 Gán sinh viên vào lớp...");
    const classStudentData = [];
    students.forEach((student, index) => {
      // Gán sinh viên vào lớp (xoay vòng)
      const classIndex = index % classes.length;
      classStudentData.push({
        classId: classes[classIndex]._id,
        studentId: student._id,
      });
    });
    await ClassStudent.insertMany(classStudentData).catch(() => {});
    console.log(`   → Đã gán ${classStudentData.length} sinh viên`);

    // ========== 6. TẠO SCHEDULE SLOTS ==========
    console.log("📅 Tạo lịch học (ScheduleSlot)...");
    
    // Xóa slots cũ nếu có
    await ScheduleSlot.deleteMany({});
    
    const slots = [];
    const today = new Date();
    
    // Tạo slots cho 2 tuần (quá khứ và tương lai)
    for (let dayOffset = -7; dayOffset <= 14; dayOffset++) {
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      
      // Bỏ qua Chủ nhật
      if (date.getDay() === 0) continue;
      
      // Mỗi ngày có 2-3 slots
      const slotsPerDay = [
        { startTime: "07:30", endTime: "09:30" },
        { startTime: "09:45", endTime: "11:45" },
        { startTime: "13:00", endTime: "15:00" },
        { startTime: "15:15", endTime: "17:15" },
      ];

      // Random chọn 2-3 slots cho mỗi ngày
      const selectedSlots = slotsPerDay.slice(0, Math.floor(Math.random() * 2) + 2);
      
      selectedSlots.forEach((timeSlot, idx) => {
        const subjectIndex = (dayOffset + idx) % subjects.length;
        const classIndex = idx % classes.length;
        const roomIndex = (dayOffset + idx) % rooms.length;
        const lecturerIndex = idx % lecturers.length;

        slots.push({
          subjectId: subjects[subjectIndex < 0 ? 0 : subjectIndex]._id,
          classId: classes[classIndex]._id,
          roomId: rooms[roomIndex < 0 ? 0 : roomIndex]._id,
          teacherId: lecturers[lecturerIndex]._id,
          date: new Date(date),
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          status: "SCHEDULED",
        });
      });
    }

    const insertedSlots = await ScheduleSlot.insertMany(slots);
    console.log(`   → Đã tạo ${insertedSlots.length} buổi học`);

    // ========== 7. THỐNG KÊ ==========
    console.log("\n" + "=".repeat(50));
    console.log("📊 THỐNG KÊ DỮ LIỆU:");
    console.log("=".repeat(50));
    console.log(`   📚 Môn học: ${subjects.length}`);
    console.log(`   🏫 Phòng học: ${rooms.length}`);
    console.log(`   🎓 Lớp học: ${classes.length}`);
    console.log(`   👨‍🏫 Giảng viên: ${lecturers.length}`);
    console.log(`   👨‍🎓 Sinh viên: ${students.length}`);
    console.log(`   📅 Buổi học (ScheduleSlot): ${insertedSlots.length}`);
    console.log("=".repeat(50));

    // In ra một số slots mẫu
    console.log("\n📋 Một số buổi học mẫu:");
    const sampleSlots = await ScheduleSlot.find({})
      .limit(5)
      .populate("subjectId", "code name")
      .populate("classId", "name")
      .populate("roomId", "name")
      .populate("teacherId", "fullName")
      .lean();

    sampleSlots.forEach((slot, i) => {
      const dateStr = new Date(slot.date).toLocaleDateString("vi-VN");
      console.log(`   ${i + 1}. ${dateStr} | ${slot.startTime}-${slot.endTime} | ${slot.subjectId?.name || 'N/A'} | Lớp ${slot.classId?.name || 'N/A'} | Phòng ${slot.roomId?.name || 'N/A'} | GV: ${slot.teacherId?.fullName || 'N/A'}`);
    });

    console.log("\n✅ Hoàn thành tạo dữ liệu mẫu!");

  } catch (err) {
    console.error("❌ Lỗi:", err);
  } finally {
    mongoose.connection.close();
    console.log("\n🔌 Đã đóng kết nối MongoDB.");
  }
};

// Chạy script
connectDB().then(seedData);
