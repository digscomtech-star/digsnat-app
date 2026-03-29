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
