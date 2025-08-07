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
//const ADMIN_UID = "XVoI7gzRTwNHfSMoTeDYwWuvE9Q2";

//auto-login
auth.onAuthStateChanged(user => {
  if (user) {
    const email = user.email.toLowerCase();

    db.collection("admins")
      .where("email", "==", email)
      .get()
      .then(snapshot => {
        if (!snapshot.empty) {
          showDashboard(); // ✅ Logged in + admin verified
        } else {
          auth.signOut(); // 🚫 Not an admin, force logout
        }
      })
      .catch(error => {
        console.error("Auto-login check failed:", error.message);
      });
  }
});

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
      db.collection("admins")
  .where("email", "==", userCredential.user.email)
  .get()
  .then(snapshot => {
    if (!snapshot.empty) {
      showDashboard();
    } else {
      auth.signOut();
      showErrorModal("❌ Unauthorized user. Admin access only.");
    }
  });
    })
    .catch(error => {
      let friendlyMessage = error.message;

if (error.code === "auth/invalid-email") {
  friendlyMessage = "Please enter a valid email address (e.g., example@email.com).";
} else if (error.code === "auth/user-not-found") {
  friendlyMessage = "No account found with this email.";
} else if (error.code === "auth/wrong-password") {
  friendlyMessage = "Incorrect password. Please try again.";
}

showErrorModal(friendlyMessage);
    });
}
function showErrorModal(message) {
  document.getElementById("errorModalMessage").textContent = message;
  document.getElementById("errorModal").classList.remove("hidden");
}

function closeErrorModal() {
  document.getElementById("errorModal").classList.add("hidden");
}

function resetPassword() {
  const email = document.getElementById("email").value.trim();

  if (!email) {
    showResetPasswordModal("⚠️ Please enter your email address.");
    return;
  }

  db.collection("admins")
    .where("email", "==", email)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        return auth.sendPasswordResetEmail(email);
      } else {
        throw new Error("unauthorized");
      }
    })
    .then(() => {
      showResetPasswordModal("✅ A password reset link has been sent to your admin email.");
    })
    .catch((error) => {
      let message = "An error occurred. Please try again.";
      if (error.message === "unauthorized") {
        message = "❌ This email is not authorized for admin access.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/user-not-found") {
        message = "No admin account found with this email.";
      }
      showResetPasswordModal(message);
      console.error(error);
    });
}

function showResetPasswordModal(message) {
  document.getElementById("resetPasswordMessage").textContent = message;
  document.getElementById("resetPasswordModal").classList.remove("hidden");
}

function closeResetPasswordModal() {
  document.getElementById("resetPasswordModal").classList.add("hidden");
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
      const startDate = data.startDate.toDate();
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
  start: data.startDate.toDate(),
  expires: data.expiresAt.toDate(),
  daysLeft,
  isExpired,
  photoURL: data.photoURL || "assets/default.jpg" // optional fallback
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
  const typeFilter = document.getElementById("typeFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;

  const activeMembers = [];
  const expiredMembers = [];

  displayedMembers.forEach(member => {
    // Apply search filter
    if (!member.name.toLowerCase().includes(search)) return;

    // Apply type filter
    if (typeFilter && member.type !== typeFilter) return;

    // Apply status filter
    const status = member.isExpired ? "expired" : "active";
    if (statusFilter && status !== statusFilter) return;

    const statusTag = member.isExpired
      ? `<span style="background: #f8d7da; color: #721c24; padding: 2px 6px; border-radius: 4px;">🛑 Expired</span>`
      : `<span style="background: #d4edda; color: #155724; padding: 2px 6px; border-radius: 4px;">⏳ ${member.daysLeft} day${member.daysLeft !== 1 ? "s" : ""} left</span>`;

const card = `
  <div class="member-card">
    <div class="member-image"  onclick="triggerImageUpload('${member.id}')" style="display: block; cursor: pointer;">
  <img src="${member.photoURL}" alt="${member.name}" />
  </div>
 
    <div class="member-details">
      <strong>${member.name}</strong><br>
      Type: ${member.type}<br>
      Price: ₱${member.price}<br>
      Start: ${new Date(member.start).toLocaleString()}<br>
      Expires: ${new Date(member.expires).toLocaleString()}<br>
      ${statusTag}<br>

      <div class="button-row">
        <button class="edit-btn" onclick="editMember('${member.id}')">Edit</button>
      <button class="renew-btn" onclick="openRenewModal('${member.id}')">Renew</button>
      </div>
    </div>
  </div>
`;
  (member.isExpired ? expiredMembers : activeMembers).push(card);
  });

  list.innerHTML = activeMembers.join("") + expiredMembers.join("");
}


// Global reference to track which member's photo we're uploading
let selectedMemberId = null;

// Trigger hidden input when clicking the image icon
function triggerImageUpload(memberId) {
  selectedMemberId = memberId;
  document.getElementById('memberImageInput').click();
}

// Handle image selection and upload
document.getElementById('memberImageInput').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file || !selectedMemberId) return;

  try {
    const imageUrl = await uploadImageToCloudinary(file);

    await db.collection("members").doc(selectedMemberId).update({
      photoURL: imageUrl
    });

    showImageUploadModal("Profile picture updated!");
    loadMemberData(); // Refresh UI
  } catch (error) {
    showImageUploadModal("❌ Failed to upload image: " + error.message);
  }

  // Reset for next upload
  this.value = "";
  selectedMemberId = null;
});


function showImageUploadModal(message) {
  document.getElementById("imageUploadMessage").textContent = message;
  document.getElementById("imageUploadModal").classList.remove("hidden");
}

function closeImageUploadModal() {
  document.getElementById("imageUploadModal").classList.add("hidden");
}


async function uploadImageToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/dtafradfb/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "members_photos");

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  if (!response.ok) throw new Error("Image upload failed");

  const data = await response.json();
  return data.secure_url;
}


function renewMember(memberId, days = 30) {
  const member = displayedMembers.find(m => m.id === memberId);
  if (!member) return;

  const now = new Date();
  const newStart = now;
  const newExpires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const newStatus = "active";
  const newPrice = member.type === "Regular" ? 600 : 500;

  db.collection("members").doc(memberId).update({
    startDate: firebase.firestore.Timestamp.fromDate(newStart),
    expiresAt: firebase.firestore.Timestamp.fromDate(newExpires),
    price: newPrice,
    status: newStatus
  })
  .then(() => {
    closeRenewModal();
    loadMemberData(); // reload members
  })
  .catch(err => {
    alert("❌ Failed to renew member: " + err.message);
  });
}


let renewTargetId = null;

function openRenewModal(memberId) {
  renewTargetId = memberId;
  document.getElementById("renewModal").classList.remove("hidden");
}

function closeRenewModal() {
  document.getElementById("renewModal").classList.add("hidden");
  renewTargetId = null;
}

function confirmRenew() {
  const periodDays = parseInt(document.getElementById("renewPeriod").value) || 30;
  if (renewTargetId) {
    renewMember(renewTargetId, periodDays); // pass days to renewMember
    closeRenewModal();
  }
}

function filterMembers() {
  renderFilteredMembers();
}

function confirmDeleteMember() {
  if (!editingMemberId) return;
  document.getElementById("deleteModal").classList.remove("hidden");
}
// delete member
async function deleteMember(id) {
  if (confirm("Are you sure you want to delete this member?")) {
    const docRef = db.collection("members").doc(id);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const photoURL = data.photoURL;
      if (photoURL) {
        // Extract public_id from the URL for Cloudinary deletion
        const matches = photoURL.match(/\/upload\/(?:v\d+\/)?([^\.\/]+)\./);
        if (matches) {
          const publicId = matches[1];
          try {
            await fetch("https://us-central1-gainz-960eb.cloudfunctions.net/api/deleteImage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ publicId })
            });
          } catch (err) {
            console.error("Failed to delete image from Cloudinary:", err);
          }
        }
      }
    }
    // Delete member from Firestore
    docRef.delete()
      .then(() => {
        alert("Member deleted.");
        loadMemberData();
      })
      .catch(err => alert("Failed to delete: " + err.message));
  }
}

async function deleteConfirmed() {
  if (!editingMemberId) return;
  const docRef = db.collection("members").doc(editingMemberId);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    const data = docSnap.data();
    const photoURL = data.photoURL;
    if (photoURL) {
      // Extract public_id from the URL for Cloudinary deletion
      const matches = photoURL.match(/\/upload\/(?:v\d+\/)?([^\.\/]+)\./);
      if (matches) {
        const publicId = matches[1];
        try {
          await fetch("https://us-central1-gainz-960eb.cloudfunctions.net/api/deleteImage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicId })
          });
        } catch (err) {
          console.error("Failed to delete image from Cloudinary:", err);
        }
      }
    }
  }
  // Delete member from Firestore
  docRef.delete()
    .then(() => {
      closeEditModal();
      closeDeleteModal();
      showDeleteResultModal("✅ Member deleted successfully.");
      loadMemberData();
    })
    .catch(err => {
      closeDeleteModal();
      showDeleteResultModal("❌ Failed to delete member: " + err.message);
    });
}
function showDeleteResultModal(message) {
  document.getElementById("deleteResultMessage").textContent = message;
  document.getElementById("deleteResultModal").classList.remove("hidden");
}

function closeDeleteResultModal() {
  document.getElementById("deleteResultModal").classList.add("hidden");
}
function closeDeleteModal() {
  document.getElementById("deleteModal").classList.add("hidden");
}

//edit member
let editingId = null;
let editingMemberId = null;
function editMember(id) {
    editingMemberId = id;
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

async function removeMemberImage() {
  if (!editingMemberId) {
    alert("No member selected.");
    return;
  }

  const docRef = firebase.firestore().collection("members").doc(editingMemberId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    alert("Member not found.");
    return;
  }

  const data = docSnap.data();
  const photoURL = data.photoURL;

  if (!photoURL) {
    alert("No image to remove.");
    return;
  }

  // Extract public_id from the URL for Cloudinary deletion
  const matches = photoURL.match(/\/upload\/(?:v\d+\/)?([^\.\/]+)\./);
  if (!matches) {
    alert("Invalid Cloudinary URL.");
    return;
  }

  const publicId = matches[1];

  try {
    // 1. Call your Cloud Function or backend to delete image from Cloudinary
    const response = await fetch(`https://us-central1-gainz-960eb.cloudfunctions.net/api/deleteImage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId })  // send public_id
    });

    const result = await response.json();
    if (!result.success) throw new Error("Cloudinary deletion failed");

    // 2. Update Firestore to remove the photoURL field
    await docRef.update({ photoURL: firebase.firestore.FieldValue.delete() });

    alert("Image removed successfully.");
    closeEditModal(); // Optional: close the modal if open
    loadMemberData(); // Refresh the member list
  } catch (error) {
    console.error("Failed to remove image:", error);
    alert("Failed to remove image. Check console.");
  }
}


// Auto-login handling
//auth.onAuthStateChanged(user => {
// if (user && user.uid === ADMIN_UID) {
//    showDashboard();
//  }
//});

function showTab(tab) {
  const tabs = ['members', 'add', 'admin'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.add('hidden');
  });
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  // Highlight active tab button
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
      showTab('members');
      loadMemberData(); // refresh list
    })
    .catch(err => {
      message.textContent = "❌ Failed to add member: " + err.message;
    });
}

function addAdmin() {
  const emailInput = document.getElementById("adminEmail");
  const passwordInput = document.getElementById("adminPassword");
  const message = document.getElementById("adminMessage");

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();

  if (!email || !email.includes("@")) {
    message.textContent = "❗ Please enter a valid email address.";
    return;
  }

  if (!password || password.length < 6) {
    message.textContent = "❗ Password must be at least 6 characters.";
    return;
  }

  // First, create the actual user in Firebase Auth
  auth.createUserWithEmailAndPassword(email, password)
  .then((userCredential) => {
    const uid = userCredential.user.uid;
    // Use UID as the document ID in Firestore
    return db.collection("admins").doc(uid).set({ email });
  })
  .then(() => {
    message.textContent = "✅ Admin created and saved successfully!";
    emailInput.value = "";
    passwordInput.value = "";
  })
  .catch((err) => {
    message.textContent = "❌ Failed to add admin: " + err.message;
  });
}

