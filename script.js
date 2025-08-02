// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAUoL3XRvqUcierRsKxAO2Ozeydz8wscKE",
  authDomain: "gainz-960eb.firebaseapp.com",
  projectId: "gainz-960eb",
  storageBucket: "gainz-960eb.firebasestorage.app",
  messagingSenderId: "1009972978961",
  appId: "1:1009972978961:web:d61367cd8e63f8a89ad8b0",
  measurementId: "G-E2SCGTLEXM"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Your admin UID (replace this with actual one)
const ADMIN_UID = "XVoI7gzRTwNHfSMoTeDYwWuvE9Q2";

// Format Firestore Timestamp to readable string
function formatDateTime(date) {
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("error-message");

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      if (userCredential.user.uid === ADMIN_UID) {
        showDashboard();
      } else {
        auth.signOut();
        errorMessage.textContent = "Unauthorized user.";
      }
    })
    .catch(error => {
      errorMessage.textContent = error.message;
    });
}

function logout() {
  auth.signOut().then(() => {
    document.getElementById("dashboard-container").classList.add("hidden");
    document.getElementById("login-container").classList.remove("hidden");
  });
}
let allMembers = [];
let displayedMembers = []; // Add this at the top, outside any function
function showDashboard() {
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("dashboard-container").classList.remove("hidden");
  loadMemberData();
}

function loadMemberData() {
  const list = document.getElementById("member-list");
  list.innerHTML = "<p>Loading members...</p>";
  displayedMembers = [];

  db.collection("members").get().then(snapshot => {
    const now = new Date();
    const updates = [];
    const tempMembers = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const id = doc.id;

      const expiresDate = data.expiresAt.toDate();
      const timeDiff = expiresDate - now;
      const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      const isExpired = timeDiff < 0;

      const currentStatus = isExpired ? "expired" : "active";
      if (data.status !== currentStatus) {
        updates.push(db.collection("members").doc(id).update({ status: currentStatus }));
      }

      tempMembers.push({
        id,
        name: data.name,
        type: data.type,
        price: data.price,
        expires: formatDateTime(expiresDate),
        daysLeft,
        isExpired
      });
    });

    Promise.all(updates)
      .then(() => {
        displayedMembers = tempMembers;
        renderFilteredMembers();
      })
      .catch(err => {
        displayedMembers = tempMembers;
        renderFilteredMembers();
        console.error("Status update error:", err);
      });
  });
}

function renderFilteredMembers() {
  const list = document.getElementById("member-list");
  const search = document.getElementById("searchInput").value.trim().toLowerCase();

  const activeMembers = [];
  const expiredMembers = [];

  displayedMembers.forEach(member => {
    if (!member.name.toLowerCase().includes(search)) return;

    const statusTag = member.isExpired
      ? `<span style="background: #f8d7da; color: #721c24; padding: 2px 6px; border-radius: 4px;">🛑 Expired</span>`
      : `<span style="background: #d4edda; color: #155724; padding: 2px 6px; border-radius: 4px;">⏳ ${member.daysLeft} day${member.daysLeft !== 1 ? "s" : ""} left</span>`;

  const card = `
  <div class="member-card">
    <div class="member-image">
      <img src="${member.photoURL || 'default.png'}" alt="${member.name}" />
    </div>
    <div class="member-details">
      <strong>${member.name}</strong><br>
      Type: ${member.type}<br>
      Price: ₱${member.price}<br>
      Expires: ${member.expires}<br>
      Status: ${statusTag}<br><br>
      <button class="edit-btn" onclick="editMember('${member.id}')">
  <i data-feather="edit-2"></i> Edit
</button>
<button class="delete-btn" onclick="deleteMember('${member.id}')">
  <i data-feather="trash-2"></i> Delete
</button>


    </div>
  </div>
`;


    (member.isExpired ? expiredMembers : activeMembers).push(card);
  });

  list.innerHTML = activeMembers.join("") + expiredMembers.join("");
}

function filterMembers() {
  renderFilteredMembers();
}


// delete member
function deleteMember(id) {
  if (confirm("Are you sure you want to delete this member?")) {
    db.collection("members").doc(id).delete()
      .then(() => {
        alert("Member deleted.");
        loadMemberData();
      })
      .catch(err => alert("Failed to delete: " + err.message));
  }
}
function editMember(id) {
  alert("Edit functionality coming soon for member ID: " + id);
}

//edit member
let editingId = null;

function editMember(id) {
  db.collection("members").doc(id).get().then(doc => {
    if (!doc.exists) return alert("Member not found.");

    const data = doc.data();
    editingId = id;

    document.getElementById("editName").value = data.name;
    document.getElementById("editType").value = data.type;
    document.getElementById("editStart").value = toLocalDatetimeString(data.startDate.toDate());
    document.getElementById("editExpires").value = toLocalDatetimeString(data.expiresAt.toDate());
    document.getElementById("editModal").classList.remove("hidden");
  });
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
  document.getElementById("editMessage").textContent = "";
  editingId = null;
}

function saveEdit() {
  const name = document.getElementById("editName").value.trim();
  const type = document.getElementById("editType").value;
  const start = new Date(document.getElementById("editStart").value);
  const expires = new Date(document.getElementById("editExpires").value);
  const message = document.getElementById("editMessage");

  if (!name || isNaN(start) || isNaN(expires)) {
    message.textContent = "❗ Please fill in all fields correctly.";
    return;
  }

  const price = type === "Regular" ? 600 : 500;
  const status = expires < new Date() ? "expired" : "active";

  db.collection("members").doc(editingId).update({
    name,
    type,
    price,
    startDate: firebase.firestore.Timestamp.fromDate(start),
    expiresAt: firebase.firestore.Timestamp.fromDate(expires),
    status
  })
    .then(() => {
      closeEditModal();
      loadMemberData();
    })
    .catch(err => {
      message.textContent = "❌ " + err.message;
    });
}


// Auto-login handling
auth.onAuthStateChanged(user => {
  if (user && user.uid === ADMIN_UID) {
    showDashboard();
  }
});

function showTab(tab) {
  const tabs = ['members', 'add'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
  });
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  // Highlight active tab button (horizontal)
  document.querySelectorAll('.tab-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = Array.from(document.querySelectorAll('.tab-item')).find(btn => btn.textContent.toLowerCase().includes(tab));
  if (activeBtn) activeBtn.classList.add('active');
}

// Format local datetime string for datetime-local input
function toLocalDatetimeString(date) {
  const pad = n => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function updateMembershipDetails() {
  const type = document.getElementById("memberType").value;
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(now.getMonth() + 1);

  document.getElementById("startDate").value = toLocalDatetimeString(now);
  document.getElementById("expiresAt").value = toLocalDatetimeString(nextMonth);

  document.getElementById("priceDisplay").textContent = type === "Regular" ? "600" : "500";
}

// Run once on load to set defaults
window.addEventListener("load", updateMembershipDetails);

function addMember() {
  const name = document.getElementById("newName").value.trim();
  const type = document.getElementById("memberType").value;
  const price = type === "Regular" ? 600 : 500;

  const startDate = new Date(document.getElementById("startDate").value);
  const expiresAt = new Date(document.getElementById("expiresAt").value);

  const message = document.getElementById("addMessage");

  if (!name || isNaN(startDate) || isNaN(expiresAt)) {
    message.textContent = "❗ Please fill in all fields correctly.";
    return;
  }

  const doc = {
    name: name,
    type: type,
    price: price,
    startDate: firebase.firestore.Timestamp.fromDate(startDate),
    expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
    status: "active"
  };

  db.collection("members").add(doc)
    .then(() => {
      message.textContent = "✅ Member added successfully!";
      document.getElementById("newName").value = "";
      updateMembershipDetails();
      
      loadMemberData(); // refresh list
    })
    .catch(err => {
      message.textContent = "❌ Failed to add member: " + err.message;
    });
}
