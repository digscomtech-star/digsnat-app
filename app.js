async function startBooking() {
  const email = document.getElementById("email").value;

  if (!email) {
    alert("Enter email");
    return;
  }

  // Save locally (so it remembers on same phone)
  localStorage.setItem("customer_email", email);

  // Check if exists in DB
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (!data) {
    // NEW USER → go to verification
    window.location.href = "customer.html?new=true";
  } else {
    // EXISTING USER
    window.location.href = "customer.html";
  }
}

async function verifyUser() {
  const email = localStorage.getItem("customer_email");
  const name = document.getElementById("name").value;

  const idFile = document.getElementById("idUpload").files[0];
  const faceFile = document.getElementById("faceUpload").files[0];

  // Upload files
  const idPath = "ids/" + Date.now() + "_" + idFile.name;
  await supabase.storage.from("user-ids").upload(idPath, idFile);

  const facePath = "faces/" + Date.now() + "_" + faceFile.name;
  await supabase.storage.from("user-faces").upload(facePath, faceFile);

  // Save user
  await supabase.from("users").insert([
    {
      email,
      full_name: name,
      role: "customer",
      id_image: idPath,
      face_image: facePath
    }
  ]);

  alert("Verification complete!");
}

async function createJob() {
  const email = localStorage.getItem("customer_email");

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  await supabase.from("jobs").insert([
    {
      customer_id: user.id,
      service: document.getElementById("service").value,
      description: document.getElementById("desc").value,
      region: document.getElementById("region").value,
      price: document.getElementById("price").value
    }
  ]);

  alert("Job submitted!");
}
