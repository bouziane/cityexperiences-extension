document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ popup.js chargé"); // <- on doit voir ce message

  const goBtn = document.getElementById("go");
  if (!goBtn) {
    console.error("❌ Bouton #go introuvable");
    return;
  }

  goBtn.addEventListener("click", () => {
    console.log("🔘 Clic détecté");

    const input = document.getElementById("dateInput").value.trim();
    console.log("Valeur saisie:", input);

    if (!/^\d{6}$/.test(input)) {
      console.warn("Format invalide");
      document.getElementById("status").textContent = "Format invalide";
      return;
    }

    // parsing DDMMYY → MM/DD/YYYY
    const day = input.slice(0, 2),
      month = input.slice(2, 4),
      year = input.slice(4, 6);
    const date = new Date(`20${year}`, month - 1, day);

    if (isNaN(date)) {
      console.warn("Date invalide");
      document.getElementById("status").textContent = "Date invalide";
      return;
    }

    const mm = String(date.getMonth() + 1).padStart(2, "0"),
      dd = String(date.getDate()).padStart(2, "0"),
      yyyy = date.getFullYear();
    const url = `https://www.cityexperiences.com/san-francisco/city-cruises/alcatraz/tour-options/alcatraz-day-tour/?date=${mm}/${dd}/${yyyy}`;

    console.log("→ Ouvrir onglet:", url);
    chrome.tabs.create({ url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Erreur chrome.tabs.create:", chrome.runtime.lastError);
      } else {
        console.log("✅ Onglet créé:", tab.id);
      }
    });
  });
});
