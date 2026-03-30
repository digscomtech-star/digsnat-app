// ==========================
// INIT BUTTON (MAIN PAGE)
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("continueBtn");

  if (btn) {
    btn.addEventListener("click", startBooking);
  }
});

// ==========================
// START BOOKING (INDEX PAGE)
// ==========================
async function startBooking() {
  try {
    const email = document.getElementById("email").value;

    if (!email) {
      alert("Please enter your email");
      return;
    }

    // Save email locally
    localStorage.setItem("customer_email", email);

    // Redirect
    window.location.href = "customer.html";
  } catch (err) {
    console.error("Start booking error:", err);
    alert("Something went wrong");
  }
}

// ==========================
// VERIFY USER (UPLOAD ID + FACE)
// ==========================
async function verifyUser() {
  try {
    const email = localStorage.getItem("customer_email");
    const name = document.getElementById("name").value;

    const idFile = document.getElementById("idUpload").files[0];
    const faceFile = document.getElementById("faceUpload").files[0];

    if (!email || !name || !idFile || !faceFile) {
      alert("Please fill all fields and upload files");
      return;
    }

    // Upload ID
    const idPath = "ids/" + Date.now() + "_" + idFile.name;
    const { error: idError } = await supabase.storage
      .from("user-ids")
      .upload(idPath, idFile);

    if (idError) throw idError;

    // Upload Face
    const facePath = "faces/" + Date.now() + "_" + faceFile.name;
    const { error: faceError } = await supabase.storage
      .from("user-faces")
      .upload(facePath, faceFile);

    if (faceError) throw faceError;

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Create if not exists
    if (!existingUser) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          email,
          full_name: name,
          role: "customer",
          id_image: idPath,
          face_image: facePath,
          verified: true
        }
      ]);

      if (insertError) throw insertError;
    }

    alert("Verification complete!");

  } catch (err) {
    console.error("Verification error:", err);
    alert("Verification failed: " + err.message);
  }
}

// ==========================
// CREATE JOB + AUTO ASSIGN
// ==========================
async function createJob() {
  try {
    const email = localStorage.getItem("customer_email");

    if (!email) {
      alert("Session expired. Please start again.");
      window.location.href = "index.html";
      return;
    }

    const service = document.getElementById("service").value;
    const description = document.getElementById("desc").value;
    const region = document.getElementById("region").value;
    const price = document.getElementById("price").value;

    if (!service || !description || !region || !price) {
      alert("Please fill all job details");
      return;
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      alert("User not found. Please verify first.");
      return;
    }

    // Create job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert([
        {
          customer_id: user.id,
          service,
          description,
          region,
          price
        }
      ])
      .select()
      .single();

    if (jobError) throw jobError;

    // Auto assign worker
    const { error: assignError } = await supabase.rpc("auto_assign_worker", {
      job_uuid: job.id
    });

    if (assignError) throw assignError;

    alert("Job submitted & worker assigned!");

  } catch (err) {
    console.error("Job creation error:", err);
    alert("Error: " + err.message);
  }
}
async function createJob() {
  const email = localStorage.getItem("customer_email");

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  const { data: job } = await supabase
    .from("jobs")
    .insert([
      {
        customer_id: user.id,
        service: document.getElementById("service").value,
        description: document.getElementById("desc").value,
        region: document.getElementById("region").value,
        price: document.getElementById("price").value
      }
    ])
    .select()
    .single();

  // 🔥 CALL AUTO ASSIGN FUNCTION
  await supabase.rpc("auto_assign_worker", {
    job_uuid: job.id
  });

  alert("Job submitted & worker assigned!");
}

async function workerLogin() {
  const email = document.getElementById("workerEmail").value;

  if (!email) {
    alert("Enter email");
    return;
  }

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("role", "worker")
    .maybeSingle();

  if (!user) {
    alert("Worker not found");
    return;
  }

  localStorage.setItem("worker_id", user.id);

  document.getElementById("workerDashboard").style.display = "block";

  loadWorkerJobs();
}

async function loadWorkerJobs() {
  const workerId = localStorage.getItem("worker_id");

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("assigned_to", workerId)
    .neq("status", "completed");

  const container = document.getElementById("jobs");
  container.innerHTML = "";

  jobs.forEach(job => {
    const div = document.createElement("div");

    div.innerHTML = `
      <hr>
      <p><b>Service:</b> ${job.service}</p>
      <p><b>Description:</b> ${job.description}</p>
      <p><b>Region:</b> ${job.region}</p>

      <button onclick="rejectJob('${job.id}')">Reject</button>
      <button onclick="markDone('${job.id}')">Mark Done</button>
    `;

    container.appendChild(div);
  });
}

async function rejectJob(jobId) {
  await supabase.rpc("reject_worker", {
    job_uuid: jobId
  });

  alert("Job rejected. Assigning new worker...");
  loadWorkerJobs();
}

async function markDone(jobId) {
  await supabase.rpc("worker_mark_done", {
    job_uuid: jobId
  });

  alert("Marked as done. Awaiting customer confirmation.");
  loadWorkerJobs();
}

let capturedImage = null;

// START CAMERA
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    document.getElementById("camera").srcObject = stream;
  });

// CAPTURE FACE
function captureFace() {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  canvas.toBlob(blob => {
    capturedImage = blob;
    alert("Face captured!");
  }, "image/jpeg");
}
