// content/content-script.js
(async () => {
  console.log("🚀 content-script chargé");

  window.addEventListener("load", async () => {
    console.log("📄 page load event reçu");

    // 1) Rejeter les cookies si présents
    const rejectBtn = document.getElementById("onetrust-reject-all-handler");
    if (rejectBtn) {
      rejectBtn.click();
      console.log("✅ Cookies rejetés");
    }

    // 2) Petit délai pour être sûr que le bouton Check Availability est rendu
    await new Promise((r) => setTimeout(r, 1000));
    console.log("⌛ 1 s de délai avant de cliquer sur Check Availability");

    // 3) Cliquer sur Check Availability
    const checkBtn = document.querySelector("a.ce-book-now-action");
    if (checkBtn) {
      checkBtn.click();
      console.log("✅ 'Check Availability' cliqué");
    } else {
      console.warn("⚠️ Bouton 'Check Availability' introuvable");
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

    // 5) Attendre et cliquer sur 10:10 AM
    try {
      console.log("⏳ Recherche du créneau '10:10 AM' (jusqu'à 15 s)...");
      const slotP = await waitForSlot("10:10 AM");
      const slotBtn = slotP.closest("button");
      if (slotBtn) {
        slotBtn.click();
        console.log("✅ Bouton '10:10 AM' cliqué");
      } else {
        console.warn("⚠️ Bouton parent introuvable pour '10:10 AM'");
      }
    } catch (err) {
      console.warn("❌ Créneau '10:10 AM' non trouvé après 15 s");
    }
  });
})();
