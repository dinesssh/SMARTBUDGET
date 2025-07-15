function navigateTo(page) {
  alert("Navigating to " + page);
  // You can later replace this with window.location.href = `${page}.html`;
}

function filterTransactions() {
  const input = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.getElementById("transactionTable").getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName("td");
    let match = false;

    for (let j = 0; j < cells.length - 1; j++) {
      if (cells[j].textContent.toLowerCase().includes(input)) {
        match = true;
        break;
      }
    }

    rows[i].style.display = match ? "" : "none";
  }
}

function saveSettings() {
  alert("Settings saved!");
}
