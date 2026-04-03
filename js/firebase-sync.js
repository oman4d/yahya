// js/firebase-sync.js

// 1) إعداد Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD0gZcYvbUDTokSICbfAdYf0aQC8ZnFEvo",
  authDomain: "bashir-points.firebaseapp.com",
  databaseURL: "https://bashir-points-default-rtdb.firebaseio.com",
  projectId: "bashir-points",
  storageBucket: "bashir-points.firebasestorage.app",
  messagingSenderId: "465651080170",
  appId: "1:465651080170:web:4b285720b55605390e7093"
};

firebase.initializeApp(firebaseConfig);

// مسار قاعدة البيانات
const dbRootRef = firebase.database().ref("bashirLeaderboard");

// 🔥 دالة لتحويل أسماء الصفوف: (التاسع/1) → (التاسع_1)
function encodeKeys(originalDB) {
  const newDB = {};
  for (let key in originalDB) {
    const safeKey = key.replace(/\//g, "_");  // استبدال "/" بـ "_"
    newDB[safeKey] = originalDB[key];
  }
  return newDB;
}

// 🔥 دالة عكسية لإرجاع الأسماء كما هي في موقعك
function decodeKeys(firebaseDB) {
  const newDB = {};
  for (let key in firebaseDB) {
    const safeKey = key.replace(/_/g, "/");
    newDB[safeKey] = firebaseDB[key];
  }
  return newDB;
}

// 2) تحميل من السحابة
async function cloudLoadData() {
  try {
    const snapshot = await dbRootRef.child("DB").get();
    if (snapshot.exists()) {
      const decoded = decodeKeys(snapshot.val());
      return decoded;
    }
    return null;
  } catch (e) {
    console.warn("Cloud load error:", e);
    return null;
  }
}

// 3) حفظ في السحابة
async function cloudSaveData(DB) {
  try {
    const encoded = encodeKeys(DB);
    await dbRootRef.child("DB").set(encoded);
  } catch (e) {
    console.warn("Cloud save error:", e);
  }
}
