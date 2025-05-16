// content/content-script.js
(async () => {
  console.log(
    "🚀 content-script chargé dans",
    window.location.hostname,
    window.location.href,
    window.self === window.top ? "frame principale" : "iframe"
  );

  function sendNote(note) {
    chrome.runtime.sendMessage({ note, type: "NOTE" });
  }

  async function waitForButtonWithText(text, timeout = 1000, interval = 500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const btn of buttons) {
        if (btn.textContent.includes(text)) {
          return btn;
        }
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error("timeout");
  }

  function getAllTimeSlotButtons() {
    const container = document.querySelector(
      "div.jss786.jss825.jss839.jss847.jss709"
    );
    return container ? Array.from(container.querySelectorAll("button")) : [];
  }

  // Fonction auxiliaire pour trouver le bouton de réservation
  function findBookingButton() {
    // Liste de sélecteurs potentiels par ordre de priorité
    const selectors = [
      "a.ce-book-now-action",
      "a.ce-check-availability",
      ".ce-btn-container a",
      "a[href*='booking']",
      "a.btn-book-now",
      "a.btn-primary",
      ".check-availability",
      "#check-availability",
      "button.check-availability",
      "a[href*='check-availability']",
    ];

    // Essayer chaque sélecteur jusqu'à en trouver un qui fonctionne
    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn) {
        console.log(`✅ Bouton trouvé avec le sélecteur: ${selector}`);
        return btn;
      }
    }

    // Si aucun sélecteur ne fonctionne, chercher par texte
    const textOptions = [
      "check availability",
      "book now",
      "book tickets",
      "buy now",
      "buy tickets",
    ];
    const allButtons = Array.from(
      document.querySelectorAll("a, button, div.btn")
    );

    for (const btn of allButtons) {
      const text = btn.textContent.toLowerCase().trim();
      for (const option of textOptions) {
        if (text.includes(option)) {
          console.log(`✅ Bouton trouvé avec le texte: ${text}`);
          return btn;
        }
      }
    }

    return null;
  }

  if (window.self === window.top) {
    // === Code qui tourne dans la page parente ===
    window.addEventListener("load", async () => {
      console.log("📄 page principale load reçue");
      sendNote("▶️ Contexte parent");

      // délai initial
      await new Promise((r) => setTimeout(r, 2000));

      // Log tous les boutons de la page
      console.log("🔍 Recherche de tous les boutons et liens pertinents:");
      const allButtons = Array.from(
        document.querySelectorAll(
          "button, a.btn, a[class*='book'], a.ce-book-now-action"
        )
      );
      allButtons.forEach((btn, index) => {
        console.log(`Bouton ${index}:`, btn.textContent.trim(), btn);
      });
      sendNote(`🔍 ${allButtons.length} boutons/liens trouvés`);

      // 1) Rejeter les cookies
      const rejectBtn = document.getElementById("onetrust-reject-all-handler");
      if (rejectBtn) {
        rejectBtn.click();
        console.log("✅ Cookies rejetés");
        sendNote("✅ Cookies rejetés");
      }

      // 2) Attendre avant Check Availability
      await new Promise((r) => setTimeout(r, 1000));
      console.log("⌛ 1 s avant Check Availability");
      sendNote("⌛ 1 s avant Check Availability");

      // 3) Cliquer sur Check Availability - méthode améliorée
      const checkBtn = findBookingButton();

      if (checkBtn) {
        console.log("🎯 Bouton de réservation trouvé:", checkBtn);

        // Faire défiler jusqu'au bouton pour assurer qu'il est visible
        checkBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise((r) => setTimeout(r, 1000)); // attendre la fin du défilement

        // Cliquer sur le bouton
        checkBtn.click();
        console.log("✅ Bouton de réservation cliqué");
        sendNote("✅ Bouton de réservation cliqué");

        // Attendre que l'iframe se charge
        await new Promise((r) => setTimeout(r, 5000));

        // Log pour débugger - vérifier le domaine de l'iframe
        const iframe = document.querySelector("iframe");
        if (iframe) {
          // Ne pas accéder au contenu, juste log l'élément et son src
          console.log("📋 Iframe trouvée:", iframe);
          console.log("🔗 Iframe src:", iframe.src);
          sendNote("ℹ️ Iframe URL: " + iframe.src);
        } else {
          sendNote("❌ Aucune iframe trouvée après le clic");

          // Vérifier s'il y a une action de suivi à faire (comme choisir une date)
          const dateInputs = document.querySelectorAll(
            "input[type='date'], [data-testid='date-picker']"
          );
          if (dateInputs.length) {
            console.log(
              "📅 Champ de date trouvé, tentative de sélection de date"
            );
            sendNote("📅 Sélection de date requise");
          }
        }
      } else {
        console.warn("⚠️ Bouton de réservation introuvable");
        sendNote("⚠️ Bouton de réservation introuvable");

        // Capture une capture d'écran HTML pour diagnostic
        const htmlSnapshot = document.documentElement.outerHTML.substring(
          0,
          5000
        ); // Premiers 5000 caractères
        console.log("📸 Capture HTML:", htmlSnapshot);
        return;
      }
    });
  } else {
    // === Code qui tourne DANS l'iframe ===
    window.addEventListener("load", async () => {
      console.log("📄 iframe load reçue");
      console.log("📋 Context iframe:", window.location.href);
      sendNote("▶️ Contexte iframe: " + window.location.href);

      // délai pour que les créneaux apparaissent
      await new Promise((r) => setTimeout(r, 2000));

      // Afficher les créneaux disponibles
      const slotButtons = getAllTimeSlotButtons();
      if (slotButtons.length) {
        const slotsText = slotButtons
          .map((btn) => btn.innerText.replace(/\n/g, " | "))
          .join(" || ");
        sendNote("Créneaux trouvés : " + slotsText);
      } else {
        sendNote("Aucun bouton de créneau horaire trouvé");

        // Log tous les boutons pour voir ce qui est disponible
        const allButtons = Array.from(document.querySelectorAll("button"));
        console.log("🔍 Tous les boutons dans l'iframe:", allButtons.length);
        allButtons.forEach((btn, index) => {
          console.log(`- Bouton iframe ${index}:`, btn.textContent.trim(), btn);
        });
      }

      // Attendre et cliquer sur "10:10 AM"
      try {
        console.log("⏳ Recherche du créneau '10:10 AM'...");
        const slotBtn = await waitForButtonWithText("10:10 AM", 20000, 500);
        slotBtn.click();
        console.log("✅ Bouton '10:10 AM' cliqué (iframe)");
        sendNote("✅ Bouton '10:10 AM' cliqué (iframe)");

        // attendre puis incrémenter (si besoin)
        await new Promise((r) => setTimeout(r, 2000));
        const incBtnIframe = document.querySelector(
          'button.jss1250.jss1337.jss1339.btnBackgroundColor.quantityIconStyle.jss1330[data-bdd="increment-button"]'
        );
        if (incBtnIframe) {
          incBtnIframe.click();
          console.log("✅ Bouton d'incrément cliqué (iframe)");
          sendNote("✅ Bouton d'incrément cliqué (iframe)");
        }
      } catch (err) {
        console.warn("❌ Créneau '10:10 AM' non trouvé après 20 s (iframe)");
        sendNote("❌ Créneau '10:10 AM' non trouvé après 20 s (iframe)");
      }
    });
  }
})();
