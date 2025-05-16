// content/content-script.js
(async () => {
  console.log("🚀 content-script chargé");

  window.addEventListener("load", async () => {
    console.log("📄 page load event reçu");

    function sendNote(note) {
      chrome.runtime.sendMessage({ note, type: "NOTE" });
    }
    await new Promise((r) => setTimeout(r, 10000));

    // 1) Rejeter les cookies si présents
    const rejectBtn = document.getElementById("onetrust-reject-all-handler");
    if (rejectBtn) {
      rejectBtn.click();
      console.log("✅ Cookies rejetés");
      sendNote("✅ Cookies rejetés");
    }

    // 2) Petit délai pour être sûr que le bouton Check Availability est rendu
    await new Promise((r) => setTimeout(r, 1000));
    console.log("⌛ 1 s de délai avant de cliquer sur Check Availability");
    sendNote("⌛ 1 s de délai avant de cliquer sur Check Availability");

    // 3) Cliquer sur Check Availability
    const checkBtn = document.querySelector("a.ce-book-now-action");
    if (checkBtn) {
      checkBtn.click();
      console.log("✅ 'Check Availability' cliqué");
      sendNote("✅ 'Check Availability' cliqué");
      // Attendre 2 secondes puis cliquer sur le bouton d'incrément
      await new Promise((r) => setTimeout(r, 4000));
      const incrementBtn = document.querySelector(
        'button.jss1250.jss1337.jss1339.btnBackgroundColor.quantityIconStyle.jss1330[data-bdd="increment-button"]'
      );
      if (incrementBtn) {
        incrementBtn.click();
        console.log("✅ Bouton d'incrément cliqué");
        sendNote("✅ Bouton d'incrément cliqué");
      } else {
        console.warn("❌ Bouton d'incrément introuvable");
        sendNote("❌ Bouton d'incrément introuvable");
      }
    } else {
      console.warn("⚠️ Bouton 'Check Availability' introuvable");
      sendNote("⚠️ Bouton 'Check Availability' introuvable");
      return;
    }

    // 4) Fonction utilitaire pour attendre un élément
    async function waitForSlot(text, timeout = 15000, interval = 5000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        // on cherche les <p> de créneau
        const slot = Array.from(
          document.querySelectorAll("p.jss943.jss951")
        ).find((p) => p.textContent.trim() === text);
        if (slot) return slot;
        await new Promise((r) => setTimeout(r, interval));
      }
      throw new Error("timeout");
    }

    // 5) Attendre et cliquer sur "9:40 AM - 1 remaining"
    async function waitForButtonWithText(text, timeout = 5000, interval = 500) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        // Cherche tous les boutons visibles
        const buttons = Array.from(document.querySelectorAll("button"));
        for (const btn of buttons) {
          const span = btn.querySelector("span");
          if (span && span.textContent.includes(text)) {
            return btn;
          }
        }
        await new Promise((r) => setTimeout(r, interval));
      }
      throw new Error("timeout");
    }

    // Fonction pour récupérer tous les boutons de créneaux horaires
    function getAllTimeSlotButtons() {
      const container = document.querySelector(
        "div.jss786.jss825.jss839.jss847.jss709"
      );
      if (!container) return [];
      return Array.from(container.querySelectorAll("button"));
    }

    try {
      console.log("⏳ Recherche du créneau '9:40 AM ' (jusqu'à 5 s)...");
      const slotBtn = await waitForButtonWithText("9:40 AM");
      slotBtn.click();
      console.log("✅ Bouton '9:40 AM ' cliqué");
      // Attendre 2 secondes puis cliquer sur le bouton d'incrément
      await new Promise((r) => setTimeout(r, 2000));
      const incrementBtn = document.querySelector(
        'button.jss1250.jss1337.jss1339.btnBackgroundColor.quantityIconStyle.jss1330[data-bdd="increment-button"]'
      );
      if (incrementBtn) {
        incrementBtn.click();
        console.log("✅ Bouton d'incrément cliqué");
        sendNote("✅ Bouton d'incrément cliqué");
      } else {
        console.warn("❌ Bouton d'incrément introuvable");
        sendNote("❌ Bouton d'incrément introuvable");
      }
    } catch (err) {
      console.warn("❌ Créneau '9:40 AM - 1 remaining' non trouvé après 20 s");
      sendNote("❌ Créneau '9:40 AM - 1 remaining' non trouvé après 20 s");
    }

    // Juste avant d'appeler waitForButtonWithText
    // Afficher les créneaux trouvés
    const slotButtons = getAllTimeSlotButtons();
    if (slotButtons.length > 0) {
      const slotsText = slotButtons
        .map((btn) => btn.innerText.replace(/\n/g, " | "))
        .join(" || ");
      sendNote("Créneaux trouvés : " + slotsText);
    } else {
      sendNote("Aucun bouton de créneau horaire trouvé");
    }
  });
})();

// class="jss1250 jss1224 jss1235 jss1236 jss1238 jss1239 jss1248 timeSlotStyle"
// class="jss1250 jss1224 jss1235 jss1236 jss1238 jss1239 jss1248 timeSlotStyle"
