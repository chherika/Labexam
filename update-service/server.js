const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/studentdb';

// Same schema as the registration service (same "students" collection)
const Student = mongoose.model('Student', new mongoose.Schema({
  Student_id: Number,
  Student_name: String,
  student_mobile: String,
  student_email: String,
  student_password: String,
}));

async function connectDb() {
  for (let i = 1; i <= 30; i++) {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
      console.log('MongoDB connected');
      return;
    } catch (e) {
      console.log(`DB not ready (attempt ${i}): ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}

// PUT /students/:id/mobile   body: { "student_mobile": "9999999999" }
app.put('/students/:id/mobile', async (req, res) => {
  const { student_mobile } = req.body;
  if (!student_mobile) return res.status(400).json({ error: 'student_mobile is required' });
  try {
    const r = await Student.updateOne(
      { Student_id: Number(req.params.id) }, { $set: { student_mobile } });
    if (!r.matchedCount) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Mobile number updated successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /students/:id/password   body: { "student_password": "newpass" }
app.put('/students/:id/password', async (req, res) => {
  const { student_password } = req.body;
  if (!student_password) return res.status(400).json({ error: 'student_password is required' });
  try {
    const hash = await bcrypt.hash(student_password, 10);
    const r = await Student.updateOne(
      { Student_id: Number(req.params.id) }, { $set: { student_password: hash } });
    if (!r.matchedCount) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Password updated successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

connectDb().then(() => app.listen(3002, () => console.log('Update service on port 3002')));