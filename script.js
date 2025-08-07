// Smart Attendance App (Enhanced PWA Version)
const allowedEmails = [
  "student1@college.edu",
  "student2@college.edu",
  "student3@college.edu",
  "student4@college.edu",
  "student5@college.edu",
  "student6@college.edu",
  "student7@college.edu",
  "student8@college.edu",
  "student9@college.edu",
  "student10@college.edu",
  "student11@college.edu",
  "student12@college.edu",
  "student13@college.edu",
  "student14@college.edu",
  "student15@college.edu",
  "student16@college.edu",
  "student17@college.edu",
  "student18@college.edu",
  "student19@college.edu",
  "student20@college.edu",
  "admin@college.edu"
];

const geoFence = {
  lat: 12.9229, // RV College
  lon: 77.4994,
  radius: 3000,
};

let currentUser = null;
let attendanceLogs = JSON.parse(localStorage.getItem("logs") || "[]");

window.addEventListener("DOMContentLoaded", () => {
  initMap();

  const savedUser = localStorage.getItem("currentUser");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    const userInfoEl = document.getElementById("userInfo");
    if (userInfoEl) userInfoEl.innerText = `👤 ${currentUser.email}`;

    const loginPageEl = document.getElementById("loginPage");
    if (loginPageEl) loginPageEl.style.display = "none";

    const appEl = document.getElementById("app");
    if (appEl) appEl.style.display = "flex";

    showView("dashboard");
    updateDashboard();
    updateAttendanceSheet();
  } else {
    const loginPageEl = document.getElementById("loginPage");
    if (loginPageEl) loginPageEl.style.display = "flex";
  }

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
});

function showView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const viewEl = document.getElementById(viewId);
  if (viewEl) viewEl.classList.add("active");

  if (viewId === "scanner") startScanner();
}

function login() {
  const emailInput = document.getElementById("email");
  if (!emailInput) return alert("Email input not found");

  const email = emailInput.value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    alert("Please enter a valid email address.");
    return;
  }

  if (!allowedEmails.includes(email)) {
    alert("This email is not authorized to use the app.");
    return;
  }

  currentUser = { email };
  localStorage.setItem("currentUser", JSON.stringify(currentUser));

  const userInfoEl = document.getElementById("userInfo");
  if (userInfoEl) userInfoEl.innerText = `👤 ${email}`;

  const loginPageEl = document.getElementById("loginPage");
  if (loginPageEl) loginPageEl.style.display = "none";

  const welcomeEl = document.getElementById("welcomeScreen");
  if (welcomeEl) welcomeEl.style.display = "flex";

  setTimeout(() => {
    if (welcomeEl) welcomeEl.style.display = "none";
    const appEl = document.getElementById("app");
    if (appEl) appEl.style.display = "flex";

    showView("dashboard");
    updateDashboard();
    updateAttendanceSheet();

    if (Notification.permission === 'granted') {
      new Notification("✅ Login Successful", {
        body: "Welcome to Smart Attendance",
      });
    }
  }, 2000);
}

function logout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  location.reload();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
}

function startScanner() {
  const qr = new Html5Qrcode("reader");
  qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 200 },
    (decoded) => {
      if (decoded === "attendance123") {
        qr.stop();
        markAttendance();
      } else {
        alert("Invalid QR code ❌");
      }
    },
    (err) => {
      console.warn(err);
    });
}

function markAttendance() {
  if (!currentUser) return;

  if (Notification.permission === 'granted') {
    new Notification("📍 Tracking Location", {
      body: "Please wait while we verify your location for attendance.",
      icon: "https://cdn-icons-png.flaticon.com/512/684/684908.png" // Optional icon URL
    });
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const dist = getDistanceFromLatLonInMeters(latitude, longitude, geoFence.lat, geoFence.lon);
      const isInside = dist <= geoFence.radius;

      const geoStatusEl = document.getElementById("geoStatus");
      if (geoStatusEl) geoStatusEl.innerText = isInside ? "✔ Inside" : "❌ Outside";

      if (!isInside) return alert("You are outside the attendance zone ❌");

      const today = new Date();
      const alreadyMarked = attendanceLogs.some(log => {
        if (log.email !== currentUser.email) return false;
        const logDate = new Date(log.timestamp);
        return isSameDay(logDate, today);
      });

      if (alreadyMarked) {
        return alert("You have already marked attendance today ✅");
      }

      const log = {
        email: currentUser.email,
        timestamp: new Date().toISOString(),
      };

      attendanceLogs.push(log);
      localStorage.setItem("logs", JSON.stringify(attendanceLogs));
      updateDashboard();
      updateAttendanceSheet();

      alert("✅ Attendance marked successfully!");
      if (Notification.permission === 'granted') {
        new Notification("📍 Attendance Marked", {
          body: `Time: ${new Date(log.timestamp).toLocaleString()}`,
          icon: "https://cdn-icons-png.flaticon.com/512/190/190411.png" // Optional icon URL
        });
      }
    },
    () => alert("❌ Location permission denied.")
  );
}

function updateDashboard() {
  const now = new Date();

  const uniqueDays = new Set(attendanceLogs.map(log => (new Date(log.timestamp)).toDateString()));
  const userLogs = attendanceLogs.filter(log => log.email === currentUser.email);
  const userUniqueDays = new Set(userLogs.map(log => (new Date(log.timestamp)).toDateString()));
  const todayLogs = attendanceLogs.filter(log => isSameDay(new Date(log.timestamp), now));
  const userTodayLogs = todayLogs.filter(log => log.email === currentUser.email);

  const totalScansEl = document.getElementById("totalScans");
  if (totalScansEl) totalScansEl.innerText = attendanceLogs.length;

  const todayCountEl = document.getElementById("todayCount");
  if (todayCountEl) todayCountEl.innerText = todayLogs.length;

  const yourTodayCountEl = document.getElementById("yourTodayCount");
  if (yourTodayCountEl) yourTodayCountEl.innerText = userTodayLogs.length;

  const yourAttendanceDaysEl = document.getElementById("yourAttendanceDays");
  if (yourAttendanceDaysEl) yourAttendanceDaysEl.innerText = userUniqueDays.size;

  const totalAttendanceDaysEl = document.getElementById("totalAttendanceDays");
  if (totalAttendanceDaysEl) totalAttendanceDaysEl.innerText = uniqueDays.size;

  const yourPercentEl = document.getElementById("yourPercent");
  if (yourPercentEl) yourPercentEl.innerText = uniqueDays.size === 0 ? "0%" : ((userUniqueDays.size / uniqueDays.size) * 100).toFixed(1) + "%";

  const list = document.getElementById("logList");
  if (list) {
    list.innerHTML = userLogs.map(l => `<li>${new Date(l.timestamp).toLocaleString()}</li>`).join("");
  }
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function updateAttendanceSheet() {
  const summary = {};
  attendanceLogs.forEach(log => {
    if (!summary[log.email]) summary[log.email] = new Set();
    summary[log.email].add((new Date(log.timestamp)).toDateString());
  });

  const totalDays = new Set(attendanceLogs.map(log => (new Date(log.timestamp)).toDateString())).size;

  const tbody = document.querySelector("#attendanceSheet tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  Object.entries(summary).forEach(([email, datesSet]) => {
    const present = datesSet.size;
    const percent = totalDays === 0 ? 0 : ((present / totalDays) * 100).toFixed(1);
    tbody.innerHTML += `<tr><td>${email}</td><td>${totalDays}</td><td>${present}</td><td>${percent}%</td></tr>`;
  });
}

function exportLogs() {
  let csv = "Email,Time\n";
  attendanceLogs.forEach(l => {
    csv += `${l.email},${l.timestamp}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "attendance_logs.csv";
  a.click();
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function initMap() {
  const mapEl = document.getElementById("leafletMap");
  if (!mapEl) return;

  const map = L.map("leafletMap").setView([geoFence.lat, geoFence.lon], 17);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);
  L.marker([geoFence.lat, geoFence.lon]).addTo(map).bindPopup("Attendance Zone");
  L.circle([geoFence.lat, geoFence.lon], {
    color: "blue",
    fillColor: "#0d4ea3",
    fillOpacity: 0.3,
    radius: geoFence.radius,
  }).addTo(map);
}
