const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/studentdb';

// Schema: Student_id, Student_name, student_mobile, student_email, student_password
const studentSchema = new mongoose.Schema({
  Student_id: { type: Number, unique: true },
  Student_name: { type: String, required: true },
  student_mobile: { type: String, required: true },
  student_email: { type: String, required: true, unique: true },
  student_password: { type: String, required: true },
});
const Student = mongoose.model('Student', studentSchema);

// Counter collection for auto-increment Student_id
const Counter = mongoose.model('Counter', new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
}));

async function nextId() {
  const c = await Counter.findOneAndUpdate(
    { _id: 'student' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}

// Connect with retry (waits for MongoDB pod to start)
async function connectDb() {
  for (let i = 1; i <= 30; i++) {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
      await Student.init(); // make sure unique indexes exist
      console.log('MongoDB connected');
      return;
    } catch (e) {
      console.log(`DB not ready (attempt ${i}): ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

// POST /register
app.post('/register', async (req, res) => {
  const { student_name, student_mobile, student_email, student_password } = req.body;
  if (!student_name || !student_mobile || !student_email || !student_password)
    return res.status(400).json({ error: 'All fields are required' });
  try {
    const hash = await bcrypt.hash(student_password, 10);
    const id = await nextId();
    await Student.create({
      Student_id: id,
      Student_name: student_name,
      student_mobile,
      student_email,
      student_password: hash,
    });
    res.status(201).json({ message: 'Student registered', student_id: id });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

// GET /students
app.get('/students', async (req, res) => {
  const rows = await Student.find({}, { _id: 0, __v: 0, student_password: 0 });
  res.json(rows);
});

// GET /students/:id
app.get('/students/:id', async (req, res) => {
  const s = await Student.findOne(
    { Student_id: Number(req.params.id) }, { _id: 0, __v: 0, student_password: 0 });
  if (!s) return res.status(404).json({ error: 'Student not found' });
  res.json(s);
});

connectDb().then(() => app.listen(3001, () => console.log('Registration service on port 3001')));