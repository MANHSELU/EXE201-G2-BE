/**
 * ============================================================
 *  SEED DATA - TRUNG TÂM TIẾNG ANH "BRIGHT ENGLISH CENTER"
 * ============================================================
 *
 *  HƯỚNG DẪN CHẠY:
 *  ────────────────
 *  1. Mở terminal, cd vào thư mục BE:
 *       cd exe-app-be
 *
 *  2. KHÔNG CẦN chạy server BE. Chỉ cần MongoDB đang chạy.
 *
 *  3. Chạy seed script:
 *       node seed-english-center.js
 *
 *  4. Đợi script chạy xong (~5-10 giây), kiểm tra log không có lỗi đỏ.
 *
 *  5. Khởi động server BE:
 *       npm run dev
 *
 *  6. Vào trang admin để kiểm tra dữ liệu:
 *       http://localhost:5173/admin/dashboard
 *
 *  LƯU Ý:
 *  ──────
 *  - Script sẽ XÓA SẠCH toàn bộ database rồi tạo lại từ đầu
 *  - Tự tạo Role + Admin + tất cả dữ liệu trực tiếp vào MongoDB
 *  - KHÔNG cần server BE đang chạy
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/EXE_TEST";

// ╔══════════════════════════════════════════╗
// ║  CẤU HÌNH TÀI KHOẢN ADMIN              ║
// ║  (sửa nếu admin của bạn khác)           ║
// ╚══════════════════════════════════════════╝
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";
const ADMIN_FULLNAME = "Admin Bright English";

// ╔══════════════════════════════════════════╗
// ║  DỮ LIỆU SEED                           ║
// ╚══════════════════════════════════════════╝

// ── GIẢNG VIÊN (5 người) ──
const LECTURERS = [
  { fullName: "Trần Minh Khoa",       email: "khoa.tran@brightenglish.edu.vn",    password: "123456" },
  { fullName: "Nguyễn Thị Lan Anh",   email: "lananh.nguyen@brightenglish.edu.vn", password: "123456" },
  { fullName: "Phạm Hoàng Nam",       email: "nam.pham@brightenglish.edu.vn",      password: "123456" },
  { fullName: "Lê Thị Phương Thảo",   email: "thao.le@brightenglish.edu.vn",       password: "123456" },
  { fullName: "Đặng Quốc Việt",       email: "viet.dang@brightenglish.edu.vn",     password: "123456" },
];

// ── SINH VIÊN (20 người) ──
const STUDENTS = [
  { fullName: "Lê Văn Hùng",       email: "hung.le@student.brightenglish.vn",     password: "123456" },
  { fullName: "Nguyễn Thị Mai",     email: "mai.nguyen@student.brightenglish.vn",  password: "123456" },
  { fullName: "Trần Đức Anh",       email: "anh.tran@student.brightenglish.vn",    password: "123456" },
  { fullName: "Phạm Thị Hương",     email: "huong.pham@student.brightenglish.vn",  password: "123456" },
  { fullName: "Hoàng Văn Tùng",     email: "tung.hoang@student.brightenglish.vn",  password: "123456" },
  { fullName: "Đỗ Thị Ngọc",        email: "ngoc.do@student.brightenglish.vn",     password: "123456" },
  { fullName: "Bùi Minh Quân",      email: "quan.bui@student.brightenglish.vn",    password: "123456" },
  { fullName: "Vũ Thị Linh",        email: "linh.vu@student.brightenglish.vn",     password: "123456" },
  { fullName: "Ngô Đình Khôi",      email: "khoi.ngo@student.brightenglish.vn",    password: "123456" },
  { fullName: "Lý Thị Thanh",       email: "thanh.ly@student.brightenglish.vn",    password: "123456" },
  { fullName: "Trịnh Văn Đạt",      email: "dat.trinh@student.brightenglish.vn",   password: "123456" },
  { fullName: "Đinh Thị Yến",       email: "yen.dinh@student.brightenglish.vn",    password: "123456" },
  { fullName: "Cao Bá Thiện",       email: "thien.cao@student.brightenglish.vn",   password: "123456" },
  { fullName: "Dương Thị Hà",       email: "ha.duong@student.brightenglish.vn",    password: "123456" },
  { fullName: "Tạ Quang Huy",       email: "huy.ta@student.brightenglish.vn",      password: "123456" },
  { fullName: "Phan Thị Kim Ngân",  email: "ngan.phan@student.brightenglish.vn",   password: "123456" },
  { fullName: "Lương Văn Phú",      email: "phu.luong@student.brightenglish.vn",   password: "123456" },
  { fullName: "Hồ Thị Mỹ Duyên",   email: "duyen.ho@student.brightenglish.vn",    password: "123456" },
  { fullName: "Châu Minh Trí",      email: "tri.chau@student.brightenglish.vn",    password: "123456" },
  { fullName: "Võ Thị Bích Trâm",   email: "tram.vo@student.brightenglish.vn",     password: "123456" },
];

// ── MÔN HỌC (10 môn) ──
const SUBJECTS = [
  { code: "ENG101",   name: "English Starter (A1)" },
  { code: "ENG201",   name: "English Elementary (A2)" },
  { code: "ENG301",   name: "English Pre-Intermediate (B1)" },
  { code: "ENG401",   name: "English Intermediate (B2)" },
  { code: "IELTS01",  name: "IELTS Foundation 4.0-5.0" },
  { code: "IELTS02",  name: "IELTS Intermediate 5.0-6.5" },
  { code: "IELTS03",  name: "IELTS Advanced 6.5-7.5" },
  { code: "TOEIC01",  name: "TOEIC 450-600" },
  { code: "TOEIC02",  name: "TOEIC 600-800" },
  { code: "COMM01",   name: "English Communication & Speaking" },
];

// ── PHÒNG HỌC (7 phòng) ──
const ROOMS = [
  { name: "Room 101", capacity: 25 },
  { name: "Room 102", capacity: 25 },
  { name: "Room 201", capacity: 30 },
  { name: "Room 202", capacity: 30 },
  { name: "Room 301", capacity: 20 },
  { name: "Lab Speaking A", capacity: 15 },
  { name: "Lab Speaking B", capacity: 15 },
];

// ── LỚP HỌC (8 lớp) ──
const CLASSES = [
  { name: "IELTS 6.5 - Lớp A",   courseYear: 2026 },
  { name: "IELTS 6.5 - Lớp B",   courseYear: 2026 },
  { name: "IELTS 7.5 - Lớp A",   courseYear: 2026 },
  { name: "TOEIC 600 - Lớp A",   courseYear: 2026 },
  { name: "TOEIC 800 - Lớp A",   courseYear: 2026 },
  { name: "Giao tiếp A2 - Lớp 1", courseYear: 2026 },
  { name: "Giao tiếp B1 - Lớp 1", courseYear: 2026 },
  { name: "Starter A1 - Lớp 1",   courseYear: 2026 },
];

// ── KÌ HỌC (3 kì, bắt đầu từ hiện tại) ──
const SEMESTERS = [
  { name: "Kì Xuân 2026",  startDate: "2026-03-16", endDate: "2026-06-14" },  // 13 tuần
  { name: "Kì Hè 2026",    startDate: "2026-06-22", endDate: "2026-08-30" },  // 10 tuần
  { name: "Kì Thu 2026",   startDate: "2026-09-07", endDate: "2026-12-06" },  // 13 tuần
];

// ── LỊCH DẠY TUẦN (15 template) ──
// dayOfWeek: 2=T2, 3=T3, 4=T4, 5=T5, 6=T6, 7=T7, 1=CN
const TEACHING_SCHEDULES = [
  // === GV Trần Minh Khoa (IELTS chuyên sâu) ===
  { lecturerIdx: 0, subjectIdx: 5, dayOfWeek: 2, startTime: "08:00", endTime: "10:00" },  // IELTS Inter - T2 sáng
  { lecturerIdx: 0, subjectIdx: 5, dayOfWeek: 4, startTime: "08:00", endTime: "10:00" },  // IELTS Inter - T4 sáng
  { lecturerIdx: 0, subjectIdx: 6, dayOfWeek: 6, startTime: "08:00", endTime: "10:00" },  // IELTS Adv - T6 sáng
  { lecturerIdx: 0, subjectIdx: 6, dayOfWeek: 7, startTime: "08:00", endTime: "10:00" },  // IELTS Adv - T7 sáng

  // === GV Nguyễn Thị Lan Anh (TOEIC) ===
  { lecturerIdx: 1, subjectIdx: 7, dayOfWeek: 3, startTime: "13:30", endTime: "15:30" },  // TOEIC 450 - T3 chiều
  { lecturerIdx: 1, subjectIdx: 7, dayOfWeek: 5, startTime: "13:30", endTime: "15:30" },  // TOEIC 450 - T5 chiều
  { lecturerIdx: 1, subjectIdx: 8, dayOfWeek: 7, startTime: "13:30", endTime: "15:30" },  // TOEIC 600 - T7 chiều

  // === GV Phạm Hoàng Nam (Communication & Speaking) ===
  { lecturerIdx: 2, subjectIdx: 9, dayOfWeek: 2, startTime: "15:30", endTime: "17:30" },  // Comm - T2 chiều
  { lecturerIdx: 2, subjectIdx: 9, dayOfWeek: 5, startTime: "15:30", endTime: "17:30" },  // Comm - T5 chiều
  { lecturerIdx: 2, subjectIdx: 1, dayOfWeek: 3, startTime: "08:00", endTime: "10:00" },  // Elementary - T3 sáng

  // === GV Lê Thị Phương Thảo (General English) ===
  { lecturerIdx: 3, subjectIdx: 2, dayOfWeek: 4, startTime: "13:30", endTime: "15:30" },  // Pre-Inter - T4 chiều
  { lecturerIdx: 3, subjectIdx: 0, dayOfWeek: 6, startTime: "13:30", endTime: "15:30" },  // Starter - T6 chiều
  { lecturerIdx: 3, subjectIdx: 2, dayOfWeek: 2, startTime: "10:15", endTime: "12:15" },  // Pre-Inter - T2 trưa

  // === GV Đặng Quốc Việt (IELTS Foundation) ===
  { lecturerIdx: 4, subjectIdx: 4, dayOfWeek: 3, startTime: "10:15", endTime: "12:15" },  // IELTS Found - T3 trưa
  { lecturerIdx: 4, subjectIdx: 4, dayOfWeek: 6, startTime: "10:15", endTime: "12:15" },  // IELTS Found - T6 trưa
];

// ── GENERATE LỊCH HỌC CẢ KỲ ──
// [teachingScheduleIdx, semesterIdx, classIdx, roomIdx]
const GENERATE_CONFIG = [
  // Kì Xuân 2026
  [0,  0, 0, 0],   // IELTS Inter T2 → IELTS 6.5 A → Room 101
  [1,  0, 0, 0],   // IELTS Inter T4 → IELTS 6.5 A → Room 101
  [2,  0, 2, 1],   // IELTS Adv T6 → IELTS 7.5 A → Room 102
  [3,  0, 2, 1],   // IELTS Adv T7 → IELTS 7.5 A → Room 102
  [4,  0, 3, 2],   // TOEIC 450 T3 → TOEIC 600 A → Room 201
  [5,  0, 3, 2],   // TOEIC 450 T5 → TOEIC 600 A → Room 201
  [6,  0, 4, 3],   // TOEIC 600 T7 → TOEIC 800 A → Room 202
  [7,  0, 5, 5],   // Comm T2 → Giao tiếp A2 → Lab Speaking A
  [8,  0, 6, 6],   // Comm T5 → Giao tiếp B1 → Lab Speaking B
  [9,  0, 5, 4],   // Elementary T3 → Giao tiếp A2 → Room 301
  [10, 0, 6, 4],   // Pre-Inter T4 → Giao tiếp B1 → Room 301
  [11, 0, 7, 3],   // Starter T6 → Starter A1 → Room 202
  [12, 0, 1, 0],   // Pre-Inter T2 → IELTS 6.5 B → Room 101
  [13, 0, 1, 1],   // IELTS Found T3 → IELTS 6.5 B → Room 102
  [14, 0, 1, 1],   // IELTS Found T6 → IELTS 6.5 B → Room 102

  // Kì Hè 2026
  [0,  1, 0, 0],   // IELTS Inter T2 → IELTS 6.5 A → Room 101
  [1,  1, 0, 0],   // IELTS Inter T4 → IELTS 6.5 A → Room 101
  [4,  1, 3, 2],   // TOEIC 450 T3 → TOEIC 600 A → Room 201
  [5,  1, 3, 2],   // TOEIC 450 T5 → TOEIC 600 A → Room 201
  [7,  1, 5, 5],   // Comm T2 → Giao tiếp A2 → Lab Speaking A
  [8,  1, 6, 6],   // Comm T5 → Giao tiếp B1 → Lab Speaking B
];

// ── PHÂN BỔ SINH VIÊN VÀO LỚP ──
// [classIdx, [studentIdx, ...]]
const CLASS_STUDENTS = [
  [0, [0, 1, 2, 3, 4, 10, 11]],              // IELTS 6.5 A: 7 SV
  [1, [5, 6, 7, 12, 13]],                     // IELTS 6.5 B: 5 SV
  [2, [8, 9, 14, 15]],                        // IELTS 7.5 A: 4 SV
  [3, [0, 1, 2, 16, 17, 18]],                 // TOEIC 600 A: 6 SV
  [4, [3, 4, 5, 19]],                         // TOEIC 800 A: 4 SV
  [5, [6, 7, 8, 9, 10, 11, 12]],              // Giao tiếp A2: 7 SV
  [6, [13, 14, 15, 16, 17]],                  // Giao tiếp B1: 5 SV
  [7, [18, 19, 0, 1]],                        // Starter A1: 4 SV
];

// ╔══════════════════════════════════════════╗
// ║  SCRIPT LOGIC (KHÔNG CẦN SỬA)          ║
// ╚══════════════════════════════════════════╝

// Import tất cả models
const Role = require("./source/model/Role");
const User = require("./source/model/Users");
const Subject = require("./source/model/Subject");
const Room = require("./source/model/Room");
const Class = require("./source/model/Class");
const ClassStudent = require("./source/model/ClassStudent");
const Semester = require("./source/model/Semester");
const TeachingSchedule = require("./source/model/TeachingSchedule");
const ScheduleSlot = require("./source/model/ScheduleSlot");

const DAY_NAMES = ["", "CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// Hàm tạo tất cả ngày trong kì theo dayOfWeek
function getDatesForDayOfWeek(startDate, endDate, dayOfWeek) {
  // dayOfWeek trong model: 1=CN, 2=T2, 3=T3, 4=T4, 5=T5, 6=T6, 7=T7
  // JS getDay(): 0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7
  const jsDay = dayOfWeek === 1 ? 0 : dayOfWeek - 1;
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  // Tìm ngày đầu tiên khớp dayOfWeek
  while (current.getDay() !== jsDay) {
    current.setDate(current.getDate() + 1);
  }

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return dates;
}

async function seed() {
  console.log("════════════════════════════════════════════");
  console.log("  BRIGHT ENGLISH CENTER - SEED DATA SCRIPT");
  console.log("════════════════════════════════════════════\n");

  const startTime = Date.now();

  // ───── Kết nối MongoDB ─────
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Kết nối MongoDB: ${MONGO_URI}\n`);

  // ───── Xóa sạch database ─────
  console.log("━━━ Bước 0: Xóa sạch database ━━━");
  await mongoose.connection.db.dropDatabase();
  console.log("  ✅ Đã xóa sạch toàn bộ database\n");

  // ───── 1. TẠO ROLES ─────
  console.log("━━━ Bước 1/9: Tạo roles ━━━");
  const roleAdmin = await Role.create({ name: "ADMIN", description: "Quản trị viên hệ thống" });
  const roleLecturer = await Role.create({ name: "LECTURER", description: "Giảng viên" });
  const roleStudent = await Role.create({ name: "STUDENT", description: "Sinh viên" });
  console.log("  ✅ ADMIN, LECTURER, STUDENT");

  // ───── 2. TẠO ADMIN ─────
  console.log("\n━━━ Bước 2/9: Tạo admin ━━━");
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({ email: ADMIN_EMAIL, password: adminHash, fullName: ADMIN_FULLNAME, roleId: roleAdmin._id });
  console.log(`  ✅ ${ADMIN_FULLNAME} <${ADMIN_EMAIL}>`);

  // ───── 3. TẠO GIẢNG VIÊN ─────
  console.log("\n━━━ Bước 3/9: Tạo giảng viên ━━━");
  const lecturerIds = [];
  for (const l of LECTURERS) {
    const hashed = await bcrypt.hash(l.password, 10);
    const user = await User.create({ email: l.email, password: hashed, fullName: l.fullName, roleId: roleLecturer._id });
    lecturerIds.push(user._id);
    console.log(`  ✅ ${l.fullName} <${l.email}>`);
  }

  // ───── 4. TẠO SINH VIÊN ─────
  console.log("\n━━━ Bước 4/9: Tạo sinh viên ━━━");
  const studentIds = [];
  for (const s of STUDENTS) {
    const hashed = await bcrypt.hash(s.password, 10);
    const user = await User.create({ email: s.email, password: hashed, fullName: s.fullName, roleId: roleStudent._id });
    studentIds.push(user._id);
    console.log(`  ✅ ${s.fullName} <${s.email}>`);
  }

  // ───── 5. TẠO MÔN HỌC ─────
  console.log("\n━━━ Bước 5/9: Tạo môn học ━━━");
  const subjectIds = [];
  for (const s of SUBJECTS) {
    const doc = await Subject.create(s);
    subjectIds.push(doc._id);
    console.log(`  ✅ ${s.code} - ${s.name}`);
  }

  // ───── 6. TẠO PHÒNG HỌC + LỚP HỌC + KÌ HỌC ─────
  console.log("\n━━━ Bước 6/9: Tạo phòng học, lớp học, kì học ━━━");
  const roomIds = [];
  for (const r of ROOMS) {
    const doc = await Room.create(r);
    roomIds.push(doc._id);
    console.log(`  ✅ Phòng: ${r.name} (${r.capacity} chỗ)`);
  }

  const classIds = [];
  for (const c of CLASSES) {
    const doc = await Class.create(c);
    classIds.push(doc._id);
    console.log(`  ✅ Lớp: ${c.name}`);
  }

  const semesterIds = [];
  for (const s of SEMESTERS) {
    const doc = await Semester.create(s);
    semesterIds.push(doc._id);
    console.log(`  ✅ Kì: ${s.name} (${s.startDate} → ${s.endDate})`);
  }

  // ───── 7. PHÂN BỔ SINH VIÊN VÀO LỚP ─────
  console.log("\n━━━ Bước 7/9: Thêm sinh viên vào lớp ━━━");
  for (const [classIdx, sIdxs] of CLASS_STUDENTS) {
    for (const sIdx of sIdxs) {
      await ClassStudent.create({ classId: classIds[classIdx], studentId: studentIds[sIdx] });
    }
    console.log(`  ✅ ${CLASSES[classIdx].name}: ${sIdxs.length} sinh viên`);
  }

  // ───── 8. TẠO LỊCH DẠY TUẦN ─────
  console.log("\n━━━ Bước 8/9: Tạo lịch dạy tuần ━━━");
  const tsIds = [];
  for (const ts of TEACHING_SCHEDULES) {
    const doc = await TeachingSchedule.create({
      teacherId: lecturerIds[ts.lecturerIdx],
      subjectId: subjectIds[ts.subjectIdx],
      dayOfWeek: ts.dayOfWeek,
      startTime: ts.startTime,
      endTime: ts.endTime,
    });
    tsIds.push(doc._id);
    console.log(`  ✅ ${LECTURERS[ts.lecturerIdx].fullName} | ${SUBJECTS[ts.subjectIdx].code} | ${DAY_NAMES[ts.dayOfWeek]} ${ts.startTime}-${ts.endTime}`);
  }

  // ───── 9. GENERATE LỊCH HỌC CẢ KỲ ─────
  console.log("\n━━━ Bước 9/9: Generate lịch học cả kỳ ━━━");
  let totalCreated = 0;
  for (const [tsIdx, semIdx, classIdx, roomIdx] of GENERATE_CONFIG) {
    const ts = TEACHING_SCHEDULES[tsIdx];
    const semester = SEMESTERS[semIdx];
    const dates = getDatesForDayOfWeek(semester.startDate, semester.endDate, ts.dayOfWeek);

    let created = 0;
    for (const date of dates) {
      await ScheduleSlot.create({
        semesterId: semesterIds[semIdx],
        classId: classIds[classIdx],
        roomId: roomIds[roomIdx],
        teacherId: lecturerIds[ts.lecturerIdx],
        subjectId: subjectIds[ts.subjectIdx],
        date: date,
        startTime: ts.startTime,
        endTime: ts.endTime,
      });
      created++;
    }
    totalCreated += created;
    console.log(`  ✅ ${SUBJECTS[ts.subjectIdx].code} ${DAY_NAMES[ts.dayOfWeek]} → ${CLASSES[classIdx].name} | ${SEMESTERS[semIdx].name} | ${created} buổi`);
  }

  // ───── KẾT QUẢ ─────
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n════════════════════════════════════════════");
  console.log("  SEED DATA HOÀN TẤT!");
  console.log("════════════════════════════════════════════");
  console.log(`  Thời gian: ${duration}s`);
  console.log(`  Giảng viên: ${LECTURERS.length}`);
  console.log(`  Sinh viên:  ${STUDENTS.length}`);
  console.log(`  Môn học:    ${SUBJECTS.length}`);
  console.log(`  Phòng học:  ${ROOMS.length}`);
  console.log(`  Lớp học:    ${CLASSES.length}`);
  console.log(`  Kì học:     ${SEMESTERS.length}`);
  console.log(`  Lịch dạy:   ${TEACHING_SCHEDULES.length} template`);
  console.log(`  Buổi học:   ${totalCreated} buổi`);

  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│  TÀI KHOẢN ĐĂNG NHẬP                                      │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  Admin:  ${ADMIN_EMAIL.padEnd(48)}│`);
  console.log("├─────────────────────────────────────────────────────────────┤");
  for (const l of LECTURERS) {
    console.log(`│  GV: ${l.email.padEnd(52)}│`);
  }
  console.log("├─────────────────────────────────────────────────────────────┤");
  for (const s of STUDENTS) {
    console.log(`│  SV: ${s.email.padEnd(52)}│`);
  }
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log("│  Tất cả mật khẩu: 123456                                  │");
  console.log("└─────────────────────────────────────────────────────────────┘");

  await mongoose.disconnect();
  console.log("\n✅ Đã ngắt kết nối MongoDB. Giờ hãy chạy server BE: npm run dev");
}

seed().catch(async (err) => {
  console.error("\n❌ Lỗi khi chạy seed script:");
  console.error(err.message);
  console.error("\nKiểm tra:");
  console.error("  1. MongoDB đang chạy?");
  console.error("  2. MONGO_URI đúng? (kiểm tra file .env)");
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
