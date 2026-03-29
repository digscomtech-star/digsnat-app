async function verifyUser() {
  const email = localStorage.getItem("customer_email");
  const name = document.getElementById("name").value;

  const idFile = document.getElementById("idUpload").files[0];
  const faceFile = document.getElementById("faceUpload").files[0];

  const idPath = "ids/" + Date.now() + "_" + idFile.name;
  await supabase.storage.from("user-ids").upload(idPath, idFile);

  const facePath = "faces/" + Date.now() + "_" + faceFile.name;
  await supabase.storage.from("user-faces").upload(facePath, faceFile);

  // CHECK if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (!existingUser) {
    // CREATE NEW USER
    await supabase.from("users").insert([
      {
        email,
        full_name: name,
        role: "customer",
        id_image: idPath,
        face_image: facePath,
        verified: true
      }
    ]);
  }

  alert("Verification complete!");
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
