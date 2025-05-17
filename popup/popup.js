document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ popup.js chargé"); // <- on doit voir ce message

  const goBtn = document.getElementById("go");
  if (!goBtn) {
    console.error("❌ Bouton #go introuvable");
    return;
  }

  // Charger les valeurs enregistrées
  chrome.storage.local.get(["targetQuantity", "selectedTime"], (data) => {
    if (data.targetQuantity) {
      document.getElementById("quantityInput").value = data.targetQuantity;
    }
    if (data.selectedTime) {
      const timeSelect = document.getElementById("timeSelect");
      // Trouver l'option correspondante ou utiliser la valeur par défaut
      const option = Array.from(timeSelect.options).find(
        (opt) => opt.value === data.selectedTime
      );
      if (option) {
        timeSelect.value = data.selectedTime;
      }
    }
  });

  // Affichage des notes d'état
  setInterval(() => {
    chrome.storage.local.get("lastNote", (data) => {
      if (data.lastNote) {
        document.getElementById("status").textContent = data.lastNote;
      }
    });
  }, 500);

  goBtn.addEventListener("click", () => {
    console.log("🔘 Clic détecté");

    const input = document.getElementById("dateInput").value.trim();
    console.log("Valeur saisie:", input);

    // Obtenir la quantité
    const quantity = parseInt(
      document.getElementById("quantityInput").value,
      10
    );

    // Obtenir l'horaire sélectionné
    const selectedTime = document.getElementById("timeSelect").value;
    console.log("Horaire sélectionné:", selectedTime);

    // Valider la quantité
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
      console.warn("Quantité invalide");
      document.getElementById("status").textContent =
        "Quantité doit être entre 1 et 10";
      return;
    }

    // Enregistrer la quantité et l'horaire
    chrome.storage.local.set({
      selectedTime: selectedTime,
      targetQuantity: quantity,
    });
    console.log("Paramètres enregistrés:", { quantity, selectedTime });

    if (!/^\d{6}$/.test(input)) {
      console.warn("Format invalide");
      document.getElementById("status").textContent = "Format de date invalide";
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

    console.log(
      `→ Ouvrir onglet: ${url} (Quantité: ${quantity}, Horaire: ${selectedTime})`
    );
    document.getElementById(
      "status"
    ).textContent = `Lancement automatisation: ${quantity} tickets à ${selectedTime}...`;

    chrome.tabs.create({ url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Erreur chrome.tabs.create:", chrome.runtime.lastError);
      } else {
        console.log("✅ Onglet créé:", tab.id);

        // Après création de l'onglet, attendre qu'il soit complètement chargé
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === "complete") {
            // Envoyer les paramètres au content script
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                quantity: quantity,
                selectedTime: selectedTime,
                type: "SET_PARAMS",
              });
            }, 1000);

            // Supprimer l'écouteur une fois utilisé
            chrome.tabs.onUpdated.removeListener(listener);
          }
        });
      }
    });
  });
});
