// assignBatches.js
import mongoose from "mongoose";
import User from "./models/User.js"; // adjust path

const MONGO_URI = "mongodb+srv://mvigneshwarreddycs_db_user:vignesh@cluster0.5z1ympj.mongodb.net/";
const ROLE = "student";
const GIVE_EXTRA_TO = "Batch-2"; // "Batch-1" or "Batch-2"

async function numericOrStringCompare(a, b) {
  const na = Number(a.username);
  const nb = Number(b.username);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  const nameCmp = (a.name || "").localeCompare(b.name || "");
  if (nameCmp !== 0) return nameCmp;
  return String(a.username || "").localeCompare(String(b.username || ""));
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // get all combinations of semester + section
  const combos = await User.aggregate([
    { $match: { role: ROLE } },
    { $group: { _id: { semester: "$semester", section: "$section" } } },
    { $sort: { "_id.semester": 1, "_id.section": 1 } }
  ]);

  for (const combo of combos) {
    const { semester, section } = combo._id;
    const students = await User.find({ role: ROLE, semester, section }).lean();

    if (students.length === 0) continue;

    // sort by username numerically if possible
    students.sort(numericOrStringCompare);

    const n = students.length;
    let half = Math.floor(n / 2);
    let firstCount = half;
    let secondCount = n - half;

    if (n % 2 === 1) {
      if (GIVE_EXTRA_TO === "Batch-1") {
        firstCount = half + 1;
        secondCount = n - firstCount;
      } else {
        firstCount = half;
        secondCount = n - firstCount;
      }
    }

    const updates = students.map((s, i) => ({
      updateOne: {
        filter: { _id: s._id },
        update: { $set: { batch: i < firstCount ? "Batch-1" : "Batch-2" } }
      }
    }));

    await User.bulkWrite(updates);
    console.log(
      `✅ Semester ${semester} | Section ${section} → total ${n} students | Batch-1: ${firstCount}, Batch-2: ${secondCount}`
    );
  }

  await mongoose.disconnect();
  console.log("🎉 Done dividing batches by semester+section");
}

run().catch(err => {
  console.error("❌ Error:", err);
  mongoose.disconnect();
});
