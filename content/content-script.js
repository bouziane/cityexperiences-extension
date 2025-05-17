// content/content-script.js
(async () => {
  console.log(
    "🚀 content-script chargé dans",
    window.location.hostname,
    window.location.href,
    window.self === window.top ? "frame principale" : "iframe"
  );

  // Variables configurables
  let targetQuantity = 1; // Nombre par défaut, sera mis à jour par le popup
  let currentQuantity = 0; // Compteur actuel
  let baseUrl = ""; // URL de base pour revenir à la page principale

  // Ne pas exécuter le script sur la page du panier (sauf si on revient pour continuer)
  if (
    (window.location.href.includes("/checkout") ||
      window.location.href.includes("cart=1")) &&
    !window.location.href.includes("continueShopping=true")
  ) {
    console.log("📋 Page de panier détectée, script automatique désactivé");
    console.log(
      "🧪 DEBUG: Sortie anticipée due à la détection du panier sans continueShopping=true"
    );

    // IMPORTANT: même si on ne continue pas l'exécution complète,
    // on doit quand même vérifier si on doit retourner à la page principale
    if (window.self === window.top) {
      console.log(
        "🧪 DEBUG: Vérification de continuation depuis sortie anticipée"
      );

      chrome.storage.local.get(
        ["targetQuantity", "currentQuantity", "baseUrl"],
        function (result) {
          console.log(
            "🧪 DEBUG: Résultat récupération pour sortie anticipée:",
            result
          );

          const storedQuantity = result.currentQuantity || 0;
          const storedTarget = result.targetQuantity || 1;

          if (storedQuantity < storedTarget && result.baseUrl) {
            console.log(
              "🧪 DEBUG: Conditions de continuation satisfaites, continuer les achats"
            );
            // Forcer le rechargement avec continueShopping=true pour contourner la sortie anticipée
            const continueUrl = result.baseUrl.includes("?")
              ? result.baseUrl + "&continueShopping=true"
              : result.baseUrl + "?continueShopping=true";

            console.log("🧪 DEBUG: Redirection forcée vers:", continueUrl);

            setTimeout(() => {
              window.location.href = continueUrl;
            }, 1000);
          } else {
            console.log(
              "🧪 DEBUG: Pas de continuation nécessaire ou possible depuis sortie anticipée"
            );
          }
        }
      );
    }

    return; // Sortir immédiatement pour éviter les rafraîchissements infinis
  }

  // Extraire l'URL de base sans les paramètres pour pouvoir y revenir
  if (window.location.href.includes("?date=")) {
    baseUrl = window.location.href;
    console.log("🔗 URL de base enregistrée:", baseUrl);
    // Sauvegarder immédiatement dans le stockage
    chrome.storage.local.set({ baseUrl: baseUrl }, function () {
      console.log(
        "🧪 DEBUG: baseUrl sauvegardée immédiatement après détection"
      );
    });
  }

  // Essayer de récupérer les valeurs stockées
  chrome.storage.local.get(
    ["targetQuantity", "currentQuantity", "baseUrl"],
    function (result) {
      if (result.targetQuantity) {
        targetQuantity = result.targetQuantity;
        console.log("📊 Quantité cible définie à:", targetQuantity);
      }
      if (result.currentQuantity) {
        currentQuantity = result.currentQuantity;
        console.log("📊 Quantité actuelle:", currentQuantity);
      }
      if (result.baseUrl) {
        baseUrl = result.baseUrl;
        console.log("🔗 URL de base récupérée:", baseUrl);
      }
    }
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

  // Fonction pour trouver un bouton avec un texte spécifique
  async function findAndClickButtonByText(text, timeout = 10000) {
    console.log(`🔍 Recherche du bouton avec texte "${text}"...`);
    try {
      // D'abord, essayer de trouver un bouton qui contient exactement ce texte
      const btn = await waitForButtonWithText(text, timeout, 500);
      btn.click();
      console.log(`✅ Bouton "${text}" trouvé et cliqué`);
      sendNote(`✅ Bouton "${text}" cliqué`);
      return true;
    } catch (err) {
      // Si on ne trouve pas un bouton avec le texte exact, chercher tout élément cliquable
      console.log(
        `⚠️ Pas de bouton exact avec "${text}", recherche élargie...`
      );

      const allClickables = Array.from(
        document.querySelectorAll("button, a, .btn, [role='button']")
      );
      const matchingBtn = allClickables.find((el) =>
        el.textContent.toLowerCase().includes(text.toLowerCase())
      );

      if (matchingBtn) {
        matchingBtn.click();
        console.log(`✅ Bouton contenant "${text}" trouvé et cliqué`);
        sendNote(`✅ Bouton contenant "${text}" cliqué`);
        return true;
      }

      console.warn(
        `❌ Aucun bouton avec "${text}" trouvé après ${timeout / 1000}s`
      );
      sendNote(`❌ Bouton "${text}" introuvable`);
      return false;
    }
  }

  // Fonction pour retourner à la page principale
  function returnToMainPage() {
    console.log("🧪 DEBUG: Entrée dans returnToMainPage", {
      baseUrl,
      currentQuantity,
      targetQuantity,
    });

    if (baseUrl) {
      // Sauvegarder les valeurs avant de naviguer
      console.log("🧪 DEBUG: Sauvegarde des valeurs avant navigation");

      chrome.storage.local.set(
        {
          baseUrl: baseUrl,
          currentQuantity: currentQuantity,
          targetQuantity: targetQuantity,
        },
        function () {
          console.log("🔄 Retour à la page principale:", baseUrl);
          sendNote(
            `🔄 Retour à la page (${currentQuantity}/${targetQuantity})`
          );
          // Ajouter un paramètre pour indiquer qu'on continue depuis le panier
          const continueUrl = baseUrl.includes("?")
            ? baseUrl + "&continueShopping=true"
            : baseUrl + "?continueShopping=true";

          console.log("🧪 DEBUG: Redirection vers:", continueUrl);
          sendNote(
            "📍 Redirection vers: " + continueUrl.substring(0, 30) + "..."
          );

          // Ajouter un délai avant la redirection pour s'assurer que les logs sont envoyés
          setTimeout(() => {
            window.location.href = continueUrl;
          }, 500);
        }
      );
    } else {
      console.error(
        "❌ URL de base non définie, impossible de revenir à la page principale"
      );
      sendNote("❌ Erreur: URL de base manquante");
    }
  }

  // Fonction pour vérifier s'il y a une alerte de chevauchement de temps et la gérer
  async function handleTimeOverlapAlert(maxWaitTime = 20000) {
    try {
      console.log(
        "⏳ Attente et vérification d'alerte de chevauchement de temps pendant 20s..."
      );
      sendNote("⏳ Surveillance des alertes pendant 20s...");

      // Attente initiale plus longue pour que la page se charge complètement
      await new Promise((r) => setTimeout(r, 3000));

      // Alerte de chevauchement de temps
      const alertText = "Please review date and time of item";
      const startTime = Date.now();
      let alertDetected = false;

      // Continuer à vérifier l'alerte pendant la période maxWaitTime
      while (Date.now() - startTime < maxWaitTime) {
        // Vérifier différents types d'éléments qui pourraient contenir l'alerte
        const elements = document.querySelectorAll(
          "div, p, span, alert, .alert, *[role='alert'], .warning, .notification"
        );

        for (const el of elements) {
          if (el.textContent && el.textContent.includes(alertText)) {
            console.log("⚠️ Alerte de chevauchement détectée!", el);
            alertDetected = true;
            sendNote("⚠️ Alerte détectée! Tentative de continuer...");

            // Prendre une capture d'écran de la zone pour debug
            console.log("📸 Contexte de l'alerte:", el.outerHTML);

            // Attendre un peu pour s'assurer que le DOM est stabilisé
            await new Promise((r) => setTimeout(r, 1000));

            // Chercher le bouton ADD TO CART (qui peut avoir différentes variantes)
            const addButtons = Array.from(
              document.querySelectorAll("button, a")
            ).filter((btn) => {
              const txt = btn.textContent.toLowerCase();
              return (
                txt.includes("add to cart") ||
                txt.includes("add to bag") ||
                txt.includes("ajouter au panier") ||
                txt.includes("purchase")
              );
            });

            if (addButtons.length > 0) {
              console.log("✅ Bouton après alerte trouvé:", addButtons[0]);

              // Faire défiler jusqu'au bouton et le cliquer
              addButtons[0].scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
              await new Promise((r) => setTimeout(r, 800));

              addButtons[0].click();
              console.log("✅ Bouton 'ADD TO CART' cliqué après alerte");
              sendNote("✅ Alerte gérée, continuer l'automatisation");

              // Attendre le panier ou une autre alerte
              await new Promise((r) => setTimeout(r, 5000));
              return true;
            } else {
              console.warn(
                "⚠️ Bouton non trouvé après alerte, recherche continue..."
              );
            }
          }
        }

        // Si l'alerte n'est pas encore détectée, attendre un peu avant de revérifier
        if (!alertDetected) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      if (!alertDetected) {
        console.log(
          "✅ Aucune alerte détectée après " + maxWaitTime / 1000 + " secondes"
        );
        return false; // Pas d'alerte, tout est OK
      } else {
        console.warn("⚠️ Alerte détectée mais impossible de gérer");
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur lors de la gestion de l'alerte:", error);
      return false;
    }
  }

  // Fonction principale pour ajouter un article au panier
  async function processMainPage() {
    try {
      console.log("🧪 DEBUG: Entrée dans processMainPage", {
        baseUrl,
        currentQuantity,
        targetQuantity,
        url: window.location.href,
      });

      // Incrémenter le compteur et mettre à jour le stockage
      currentQuantity++;
      chrome.storage.local.set(
        { currentQuantity: currentQuantity },
        function () {
          console.log("🧪 DEBUG: currentQuantity mis à jour:", currentQuantity);
        }
      );

      console.log("📄 page principale load reçue");
      sendNote(`▶️ Contexte parent (${currentQuantity}/${targetQuantity})`);

      // Si on vient du panier (continueShopping=true), récupérer l'URL de base
      if (window.location.href.includes("continueShopping=true")) {
        console.log("🔄 Continuation des achats détectée");
        sendNote("🔄 Continuation des achats en cours...");

        // Récupérer l'URL de base du stockage si nécessaire
        if (!baseUrl) {
          console.log(
            "🧪 DEBUG: baseUrl non définie après continuation, récupération du stockage"
          );

          await new Promise((resolve) => {
            chrome.storage.local.get("baseUrl", function (result) {
              console.log(
                "🧪 DEBUG: Résultat récupération baseUrl après continuation:",
                result
              );
              if (result.baseUrl) {
                baseUrl = result.baseUrl;
                console.log("🔗 URL de base récupérée du stockage:", baseUrl);
                sendNote("🔗 URL récupérée pour continuation");
              } else {
                console.warn(
                  "🧪 DEBUG: Aucune baseUrl dans le stockage après continuation"
                );
                sendNote("⚠️ Aucune URL trouvée pour continuation");
              }
              resolve();
            });
          });
        }
      }

      // Si la cible est atteinte, terminer
      if (currentQuantity > targetQuantity) {
        console.log("✅ Quantité cible atteinte:", targetQuantity);
        sendNote(`✅ Terminé! ${targetQuantity} tickets ajoutés au panier`);
        // Réinitialiser le compteur pour la prochaine fois
        chrome.storage.local.set({ currentQuantity: 0 });
        return;
      }

      // Enregistrer l'URL de base si pas encore fait
      if (!baseUrl && window.location.href.includes("?date=")) {
        // Nettoyer l'URL pour enlever continueShopping=true s'il existe
        baseUrl = window.location.href.replace(/[&?]continueShopping=true/, "");
        console.log(
          "🧪 DEBUG: Sauvegarde baseUrl dans processMainPage:",
          baseUrl
        );

        chrome.storage.local.set({ baseUrl: baseUrl }, function () {
          console.log(
            "🧪 DEBUG: baseUrl sauvegardée avec succès dans processMainPage"
          );
        });
        console.log("🔗 URL de base enregistrée:", baseUrl);
      }

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
        return false;
      }
      return true;
    } catch (error) {
      console.error("❌ Erreur lors du processus:", error);
      sendNote(`❌ Erreur: ${error.message}`);
      return false;
    }
  }

  // Fonction pour attendre que le panier se charge après avoir cliqué sur "Add to Cart"
  async function waitForCart(maxWaitTime = 10000) {
    const startTime = Date.now();

    // Attente initiale pour laisser la page commencer à charger
    await new Promise((r) => setTimeout(r, 1000));

    while (Date.now() - startTime < maxWaitTime) {
      if (
        window.location.href.includes("/checkout") ||
        window.location.href.includes("cart=1")
      ) {
        console.log("🛒 Page de panier détectée");
        // S'assurer que l'URL de base est sauvegardée dans le stockage
        if (baseUrl) {
          console.log(
            "🧪 DEBUG: Sauvegarde de baseUrl dans le panier:",
            baseUrl
          );
          chrome.storage.local.set({ baseUrl: baseUrl }, function () {
            console.log("🧪 DEBUG: baseUrl sauvegardée avec succès");
          });
          sendNote("🔗 URL de navigation enregistrée");
        } else {
          console.warn("⚠️ Pas d'URL de base à sauvegarder dans le panier");
          sendNote("⚠️ Pas d'URL de base disponible");
        }
        // Attendre un peu plus pour que la page se charge complètement
        await new Promise((r) => setTimeout(r, 1500));
        return true;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    console.warn(
      "⚠️ Page de panier non détectée après " + maxWaitTime / 1000 + " secondes"
    );
    return false;
  }

  // Fonction pour continuer les achats depuis le panier
  async function continueShopping() {
    try {
      console.log("🧪 DEBUG: Entrée dans continueShopping", {
        baseUrl,
        currentQuantity,
        targetQuantity,
      });
      sendNote("📝 Tentative de continuation des achats...");

      // Attendre que le panier soit chargé
      await new Promise((r) => setTimeout(r, 2000));

      // D'abord, essayer de récupérer l'URL de base si elle n'est pas déjà définie
      if (!baseUrl) {
        console.log("🧪 DEBUG: baseUrl non définie, tentative de récupération");

        // Utiliser une promesse pour rendre la récupération du stockage synchrone
        await new Promise((resolve) => {
          chrome.storage.local.get("baseUrl", function (result) {
            console.log("🧪 DEBUG: Résultat de récupération baseUrl:", result);
            if (result.baseUrl) {
              baseUrl = result.baseUrl;
              console.log("🔗 URL de base récupérée du stockage:", baseUrl);
              sendNote("🔗 URL récupérée: " + baseUrl.substring(0, 30) + "...");
            } else {
              console.log("🧪 DEBUG: Aucune baseUrl trouvée dans le stockage");
              sendNote("⚠️ Aucune URL enregistrée trouvée");
            }
            resolve();
          });
        });
      }

      // Si on a une URL de base, utiliser directement returnToMainPage
      if (baseUrl) {
        console.log(
          "✅ URL de base disponible, retour direct à la page principale:",
          baseUrl
        );
        sendNote("✅ URL disponible, redirection...");
        returnToMainPage();
        return true;
      }

      // Sinon, chercher un bouton "Continue Shopping" comme fallback
      const continueBtn = Array.from(
        document.querySelectorAll("a, button")
      ).find(
        (el) =>
          el.textContent.toLowerCase().includes("continue shopping") ||
          el.textContent.toLowerCase().includes("continuer") ||
          el.textContent.toLowerCase().includes("retour")
      );

      if (continueBtn) {
        console.log("✅ Bouton 'Continue Shopping' trouvé, clic en cours...");
        continueBtn.click();
        return true;
      } else {
        console.log(
          "⚠️ Bouton 'Continue Shopping' non trouvé et pas d'URL de base disponible"
        );
        sendNote(
          "❌ Impossible de continuer les achats - pas d'URL ou de bouton"
        );
        return false;
      }
    } catch (error) {
      console.error("❌ Erreur lors de la continuation des achats:", error);
      sendNote("❌ Erreur: " + error.message);
      // Fallback: retour direct à l'URL de base si disponible
      if (baseUrl) {
        returnToMainPage();
        return true;
      }
      return false;
    }
  }

  if (window.self === window.top) {
    // === Code qui tourne dans la page parente ===
    window.addEventListener("load", async () => {
      // Vérifier si on est sur la page du panier et qu'on doit continuer les achats
      if (
        window.location.href.includes("/checkout") ||
        window.location.href.includes("cart=1")
      ) {
        console.log("🧪 DEBUG: Détection du panier", {
          baseUrl,
          currentQuantity,
          targetQuantity,
          url: window.location.href,
        });
        sendNote("🧪 DEBUG: Page panier détectée");

        // Récupérer les données actuelles du stockage
        chrome.storage.local.get(
          ["targetQuantity", "currentQuantity", "baseUrl"],
          async function (result) {
            console.log("🧪 DEBUG: Valeurs récupérées du stockage:", result);

            if (result.targetQuantity) targetQuantity = result.targetQuantity;
            if (result.currentQuantity)
              currentQuantity = result.currentQuantity;
            if (result.baseUrl) baseUrl = result.baseUrl;

            console.log("📊 État dans le panier: ", {
              baseUrl,
              currentQuantity,
              targetQuantity,
            });
            sendNote(`📊 Panier: ${currentQuantity}/${targetQuantity}`);

            if (currentQuantity < targetQuantity) {
              // On est sur la page du panier mais on n'a pas fini
              console.log(
                "🛒 Sur la page du panier, tentative de continuer les achats"
              );
              sendNote(
                `🔄 Continuation (${currentQuantity}/${targetQuantity})`
              );
              const result = await continueShopping();
              console.log("🧪 DEBUG: Résultat de continueShopping:", result);
            } else {
              console.log(
                "✅ Automatisation terminée, reste sur la page du panier"
              );
              sendNote(
                `✅ Terminé! ${targetQuantity} tickets ajoutés au panier`
              );
              // Réinitialiser le compteur pour la prochaine fois
              chrome.storage.local.set({ currentQuantity: 0 });
            }
          }
        );
      } else {
        // On est sur la page principale, lancer le processus
        await processMainPage();
      }
    });
  } else {
    // === Code qui tourne DANS l'iframe ===
    window.addEventListener("load", async () => {
      console.log("📄 iframe load reçue");
      console.log("📋 Context iframe:", window.location.href);
      sendNote("▶️ Contexte iframe: " + window.location.href);

      // Récupérer l'URL de base si disponible dans le stockage
      console.log("🧪 DEBUG: Tentative de récupération baseUrl dans l'iframe");

      await new Promise((resolve) => {
        chrome.storage.local.get(
          ["baseUrl", "currentQuantity", "targetQuantity"],
          function (result) {
            console.log("🧪 DEBUG: Données récupérées dans l'iframe:", result);

            if (result.baseUrl) {
              baseUrl = result.baseUrl;
              console.log("🔗 URL de base récupérée dans l'iframe:", baseUrl);
            }

            if (result.currentQuantity)
              currentQuantity = result.currentQuantity;
            if (result.targetQuantity) targetQuantity = result.targetQuantity;

            console.log("🧪 DEBUG: État dans l'iframe:", {
              baseUrl,
              currentQuantity,
              targetQuantity,
            });

            resolve();
          }
        );
      });

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

          // Attendre puis cliquer sur "Continue"
          await new Promise((r) => setTimeout(r, 2000));
          const continueClicked = await findAndClickButtonByText(
            "Continue",
            10000
          );

          if (continueClicked) {
            // Attendre que la page se charge avant de chercher "Add to Cart"
            await new Promise((r) => setTimeout(r, 3000));

            // Vérifier et sauvegarder l'URL de base dans le stockage si elle n'est pas vide
            if (baseUrl) {
              console.log(
                "🧪 DEBUG: Sauvegarde baseUrl avant Add to Cart:",
                baseUrl
              );

              await new Promise((resolve) => {
                chrome.storage.local.set({ baseUrl: baseUrl }, function () {
                  console.log(
                    "🧪 DEBUG: baseUrl sauvegardée avec succès avant Add to Cart"
                  );
                  resolve();
                });
              });
            } else {
              console.warn(
                "🧪 DEBUG: Pas de baseUrl disponible avant Add to Cart"
              );
              sendNote("⚠️ URL manquante avant ajout au panier");
            }

            // Rechercher et cliquer sur "Add to Cart"
            const addToCartClicked = await findAndClickButtonByText(
              "Add to Cart",
              10000
            );

            // Alternatives si "Add to Cart" n'est pas trouvé
            if (!addToCartClicked) {
              if (!(await findAndClickButtonByText("Add to cart", 1000))) {
                if (!(await findAndClickButtonByText("Add to Bag", 1000))) {
                  await findAndClickButtonByText("Purchase", 1000);
                }
              }
            }

            // Vérifier s'il y a une alerte de chevauchement de temps et la gérer
            await handleTimeOverlapAlert();

            // Attendre que le panier se charge
            const cartLoaded = await waitForCart();
            console.log("🧪 DEBUG: Résultat de waitForCart:", cartLoaded);

            // Vérifier s'il faut continuer les achats
            if (currentQuantity < targetQuantity) {
              console.log("🧪 DEBUG: Continuation nécessaire depuis iframe:", {
                baseUrl,
                currentQuantity,
                targetQuantity,
              });

              // Si on n'a pas atteint la quantité cible, retourner à la page principale
              setTimeout(() => {
                console.log(
                  "🧪 DEBUG: Tentative de retour à la page principale depuis iframe"
                );

                // Assurer que currentQuantity et baseUrl sont disponibles dans la page parente
                chrome.storage.local.set(
                  {
                    baseUrl: baseUrl,
                    currentQuantity: currentQuantity,
                    targetQuantity: targetQuantity,
                  },
                  function () {
                    console.log(
                      "🧪 DEBUG: Variables sauvegardées avant redirection iframe"
                    );

                    // Forcer le rechargement de la page parente avec continueShopping=true
                    if (baseUrl) {
                      const continueUrl = baseUrl.includes("?")
                        ? baseUrl + "&continueShopping=true"
                        : baseUrl + "?continueShopping=true";

                      console.log(
                        "🧪 DEBUG: Iframe redirection vers:",
                        continueUrl
                      );
                      // Utilisez top.location pour naviguer la fenêtre parente depuis l'iframe
                      top.location.href = continueUrl;
                    } else {
                      console.warn(
                        "🧪 DEBUG: Pas de baseUrl dans iframe pour redirection"
                      );
                      sendNote("⚠️ URL manquante pour continuer");
                    }
                  }
                );
              }, 2000);
            } else {
              console.log("🧪 DEBUG: Quantité cible atteinte dans iframe", {
                currentQuantity,
                targetQuantity,
              });
            }
          }
        }
      } catch (err) {
        console.warn("❌ Créneau '10:10 AM' non trouvé après 20 s (iframe)");
        sendNote("❌ Créneau '10:10 AM' non trouvé après 20 s (iframe)");
      }
    });
  }

  // Écouter les messages du popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SET_QUANTITY") {
      targetQuantity = message.quantity;
      // Réinitialiser le compteur quand on définit une nouvelle quantité
      currentQuantity = 0;
      chrome.storage.local.set({
        currentQuantity: 0,
        targetQuantity: message.quantity,
      });
      console.log(`📊 Quantité cible mise à jour: ${targetQuantity}`);
      sendResponse({ success: true });
    }
  });
})();
