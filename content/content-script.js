// content/content-script.js
(async () => {
  console.log(
    "🚀 content-script chargé dans",
    window.location.hostname,
    window.location.href,
    window.self === window.top ? "frame principale" : "iframe"
  );

  // Variables configurables
  let targetQuantity = 1; // Nombre total de tickets à obtenir
  let currentQuantity = 0; // Compteur actuel
  let baseUrl = ""; // URL de base pour revenir à la page principale
  let selectedTime = "9:40 AM"; // Horaire par défaut, sera mis à jour par le popup
  let ticketsPerIteration = 1; // Nombre de tickets à ajouter à chaque itération
  let totalTicketsAdded = 0; // Nombre total de tickets ajoutés (tous lots confondus)

  // Fonction pour compter les tickets dans le panier
  async function countCartItems() {
    try {
      console.log("🧮 Comptage des tickets dans le panier");

      // Vérifier d'abord le sélecteur exact indiqué par l'utilisateur
      const cartIndicator = document.querySelector("span.cart-item.has-item");
      if (cartIndicator) {
        // Extraire le nombre du texte
        const itemCount = parseInt(cartIndicator.textContent.trim());
        if (!isNaN(itemCount)) {
          console.log(
            `🧮 ${itemCount} articles trouvés avec le sélecteur exact span.cart-item.has-item`
          );

          // Mettre à jour le compteur interne pour correspondre au panier
          if (itemCount !== currentQuantity) {
            console.log(
              `🧮 Mise à jour du compteur: ${currentQuantity} → ${itemCount}`
            );
            currentQuantity = itemCount;
            chrome.storage.local.set({ currentQuantity: itemCount });
          }

          return itemCount;
        }
      }

      // Chercher des sélecteurs spécifiques au panier d'Alcatraz
      const specificSelectors = [
        "span.cart-item",
        "[class*='cart-item']",
        "[class*='cartItem']",
        ".cart-count",
        ".cart-quantity",
        "span.count",
        "[class*='cart'] .count",
        "[class*='cart'] .quantity",
      ];

      for (const selector of specificSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent.trim();
          // Chercher un nombre dans le texte
          const match = text.match(/\d+/);
          if (match && match[0]) {
            const count = parseInt(match[0]);
            if (!isNaN(count)) {
              console.log(
                `🧮 ${count} articles trouvés avec le sélecteur spécifique: ${selector}`
              );

              // Mettre à jour le compteur
              if (count !== currentQuantity) {
                console.log(
                  `🧮 Mise à jour du compteur: ${currentQuantity} → ${count}`
                );
                currentQuantity = count;
                chrome.storage.local.set({ currentQuantity: count });
              }

              return count;
            }
          }
        }
      }

      // Si aucun des sélecteurs spécifiques ne fonctionne, continuer avec les sélecteurs génériques
      const selectors = [
        // Sélecteurs génériques pour les articles du panier
        ".cart-item",
        ".item-row",
        ".line-item",
        // Pour les titres des articles qui contiennent généralement "Alcatraz"
        "h3:contains('Alcatraz')",
        "div[class*='cart'] h3",
        ".cart-product-name",
        // Pour les compteurs de quantité
        ".quantity-selector",
        "input[name*='quantity']",
        "[data-quantity]",
        // Lignes génériques du panier
        "tr.cart-item",
        "div[class*='cartItem']",
        "li[class*='cart-item']",
      ];

      let itemCount = 0;
      let itemSelector = "";

      // Tester chaque sélecteur
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          itemCount = elements.length;
          itemSelector = selector;
          console.log(
            `🧮 ${itemCount} articles trouvés avec le sélecteur: ${selector}`
          );
          break;
        }
      }

      // Si aucun sélecteur ne fonctionne, rechercher par texte
      if (itemCount === 0) {
        console.log("🧮 Recherche d'articles par texte");

        // Chercher des textes qui pourraient indiquer un produit Alcatraz
        const textNodes = document.querySelectorAll(
          "h1, h2, h3, h4, h5, p, span, div"
        );
        const keywords = [
          "Alcatraz",
          "City Cruises",
          "Day Tour",
          "tour",
          "ticket",
          "admission",
        ];

        for (const node of textNodes) {
          const text = node.textContent.toLowerCase();

          if (
            keywords.some((keyword) => text.includes(keyword.toLowerCase()))
          ) {
            // Trouver l'élément parent qui pourrait être un article du panier
            let parent = node.parentElement;
            for (let i = 0; i < 5; i++) {
              // Remonter jusqu'à 5 niveaux
              if (
                parent &&
                (parent.classList.contains("cart-item") ||
                  parent.classList.contains("line-item") ||
                  parent.id.includes("cart") ||
                  parent.className.includes("cart"))
              ) {
                itemCount++;
                break;
              }
              if (parent) parent = parent.parentElement;
            }
          }
        }

        console.log(`🧮 ${itemCount} articles trouvés par recherche de texte`);
      }

      // Si toujours aucun article trouvé, essayer de lire les quantités numériques
      if (itemCount === 0) {
        // Chercher des éléments qui pourraient contenir des chiffres de quantité
        const quantityElements = document.querySelectorAll(
          "input[type='number'], .quantity, .qty"
        );

        for (const el of quantityElements) {
          if (el.tagName === "INPUT" && el.value) {
            itemCount += parseInt(el.value) || 0;
          } else if (el.textContent) {
            const match = el.textContent.match(/\d+/);
            if (match) {
              itemCount += parseInt(match[0]) || 0;
            }
          }
        }

        console.log(`🧮 ${itemCount} articles trouvés en lisant les quantités`);
      }

      // Fallback: si on ne trouve toujours rien, utiliser le compteur interne
      if (itemCount === 0) {
        console.log(
          "🧮 Impossible de détecter les articles, utilisation du compteur interne"
        );
        return currentQuantity;
      }

      console.log(`🧮 Total: ${itemCount} tickets dans le panier`);

      // Mettre à jour le compteur interne pour correspondre au panier
      if (itemCount !== currentQuantity) {
        console.log(
          `🧮 Mise à jour du compteur: ${currentQuantity} → ${itemCount}`
        );
        currentQuantity = itemCount;
        chrome.storage.local.set({ currentQuantity: itemCount });
      }

      return itemCount;
    } catch (error) {
      console.error("❌ Erreur lors du comptage des articles:", error);
      return currentQuantity; // En cas d'erreur, utiliser le compteur interne
    }
  }

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

      // Compter les articles dans le panier et mettre à jour le compteur
      (async () => {
        const cartCount = await countCartItems();

        chrome.storage.local.get(
          ["targetQuantity", "baseUrl", "selectedTime", "ticketsPerIteration"],
          function (result) {
            console.log(
              "🧪 DEBUG: Résultat récupération pour sortie anticipée:",
              result
            );

            const storedTarget = result.targetQuantity || 1;
            if (result.selectedTime) selectedTime = result.selectedTime;
            if (result.ticketsPerIteration)
              ticketsPerIteration = result.ticketsPerIteration;

            console.log(
              `🧪 DEBUG: Progression réelle: ${cartCount}/${storedTarget} (${selectedTime}, ${ticketsPerIteration}/itération)`
            );
            sendNote(
              `🛒 Panier: ${cartCount}/${storedTarget} tickets (${selectedTime})`
            );

            if (cartCount < storedTarget && result.baseUrl) {
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
              }, 500);
            } else {
              console.log(
                "🧪 DEBUG: Pas de continuation nécessaire ou possible depuis sortie anticipée"
              );
            }
          }
        );
      })();
    }

    return; // Sortir immédiatement pour éviter les rafraîchissements infinis
  }

  // Extraire l'URL de base sans les paramètres pour pouvoir y revenir
  if (window.location.href.includes("?date=")) {
    // Capturer l'URL complète, mais nettoyer les paramètres inutiles
    baseUrl = window.location.href.replace(/[&?]continueShopping=true/, "");
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
    [
      "targetQuantity",
      "currentQuantity",
      "baseUrl",
      "selectedTime",
      "ticketsPerIteration",
      "totalTicketsAdded",
    ],
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
      if (result.selectedTime) {
        selectedTime = result.selectedTime;
        console.log("🕒 Horaire sélectionné:", selectedTime);
      }
      if (result.ticketsPerIteration) {
        ticketsPerIteration = result.ticketsPerIteration;
        console.log("🎟️ Tickets par itération:", ticketsPerIteration);
      }
      if (result.totalTicketsAdded !== undefined) {
        totalTicketsAdded = result.totalTicketsAdded;
        console.log("📊 Tickets ajoutés jusqu'ici:", totalTicketsAdded);
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

      // Récupérer d'abord les valeurs du stockage pour s'assurer qu'elles sont à jour
      await new Promise((resolve) => {
        chrome.storage.local.get(
          ["targetQuantity", "currentQuantity", "baseUrl", "selectedTime"],
          function (result) {
            console.log(
              "🧪 DEBUG: Valeurs récupérées avant incrémentation:",
              result
            );

            if (result.targetQuantity) targetQuantity = result.targetQuantity;
            if (result.currentQuantity !== undefined)
              currentQuantity = result.currentQuantity;
            if (result.baseUrl) baseUrl = result.baseUrl;
            if (result.selectedTime) selectedTime = result.selectedTime;

            resolve();
          }
        );
      });

      // Incrémenter le compteur et mettre à jour le stockage
      currentQuantity++;
      await new Promise((resolve) => {
        chrome.storage.local.set(
          { currentQuantity: currentQuantity },
          function () {
            console.log(
              "🧪 DEBUG: currentQuantity mis à jour:",
              currentQuantity
            );
            resolve();
          }
        );
      });

      console.log("📄 page principale load reçue");
      sendNote(`▶️ Automatisation (${currentQuantity}/${targetQuantity})`);

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
      await new Promise((r) => setTimeout(r, 1000)); // Réduit de 2000 à 1000ms

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
      await new Promise((r) => setTimeout(r, 500)); // Réduit de 1000 à 500ms
      console.log("⌛ 0.5s avant Check Availability");
      sendNote("⌛ Check Availability");

      // 3) Cliquer sur Check Availability - méthode améliorée
      const checkBtn = findBookingButton();

      if (checkBtn) {
        console.log("🎯 Bouton de réservation trouvé:", checkBtn);

        // Faire défiler jusqu'au bouton pour assurer qu'il est visible
        checkBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise((r) => setTimeout(r, 700)); // Réduit de 1000 à 700ms

        // Cliquer sur le bouton
        checkBtn.click();
        console.log("✅ Bouton de réservation cliqué");
        sendNote("✅ Bouton de réservation cliqué");

        // Attendre que l'iframe se charge
        await new Promise((r) => setTimeout(r, 3000)); // Réduit de 5000 à 3000ms

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

        // Compter les tickets dans le panier
        const cartCount = await countCartItems();

        // S'assurer que l'URL de base est sauvegardée dans le stockage
        if (baseUrl) {
          console.log(
            "🧪 DEBUG: Sauvegarde de baseUrl dans le panier:",
            baseUrl
          );

          await new Promise((resolve) => {
            // Sauvegarder à la fois baseUrl et la progression actuelle
            chrome.storage.local.set(
              {
                baseUrl: baseUrl,
                currentQuantity: cartCount,
                selectedTime: selectedTime,
                targetQuantity: targetQuantity,
                ticketsPerIteration: ticketsPerIteration,
              },
              function () {
                console.log("🧪 DEBUG: variables sauvegardées avec succès", {
                  baseUrl,
                  currentQuantity: cartCount,
                  selectedTime,
                  targetQuantity,
                  ticketsPerIteration,
                });
                resolve();
              }
            );
          });

          sendNote(
            `🔗 URL sauvegardée (${cartCount}/${targetQuantity}, ${selectedTime})`
          );
        } else {
          console.warn("⚠️ Pas d'URL de base à sauvegarder dans le panier");
          sendNote("⚠️ Pas d'URL de base disponible");
        }

        // Attendre un peu plus pour que la page se charge complètement
        await new Promise((r) => setTimeout(r, 1000));
        return true;
      }
      await new Promise((r) => setTimeout(r, 300));
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

        // Utiliser un délai pour s'assurer que tout est prêt
        setTimeout(() => {
          const continueUrl = baseUrl.includes("?")
            ? baseUrl + "&continueShopping=true"
            : baseUrl + "?continueShopping=true";

          console.log(
            "🧪 DEBUG: Redirection depuis continueShopping vers:",
            continueUrl
          );
          window.location.href = continueUrl;
        }, 1000);

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
        setTimeout(() => {
          const continueUrl = baseUrl.includes("?")
            ? baseUrl + "&continueShopping=true"
            : baseUrl + "?continueShopping=true";

          console.log("🧪 DEBUG: Redirection de secours vers:", continueUrl);
          window.location.href = continueUrl;
        }, 1000);
        return true;
      }
      return false;
    }
  }

  if (window.self === window.top) {
    // === Code qui tourne dans la page parente ===
    window.addEventListener("load", async () => {
      // Vérifier si le panier est déjà ouvert
      const isCart =
        window.location.href.includes("/checkout") ||
        window.location.href.includes("cart=1");

      // Continuation depuis le panier détectée
      const isContinuation = window.location.href.includes(
        "continueShopping=true"
      );

      console.log("🧪 DEBUG: Détection de contexte:", {
        isCart,
        isContinuation,
      });

      // Vérifier si on est sur la page du panier et qu'on doit continuer les achats
      if (isCart) {
        console.log("🧪 DEBUG: Détection du panier", {
          baseUrl,
          currentQuantity,
          selectedTime,
          targetQuantity,
          ticketsPerIteration,
          url: window.location.href,
        });
        sendNote("🧪 DEBUG: Page panier détectée");

        // Compter les tickets dans le panier - Vérification double avec comptage forcé
        const cartCount = await countCartItems();

        // Récupérer les données actuelles du stockage
        chrome.storage.local.get(
          ["targetQuantity", "baseUrl", "selectedTime", "ticketsPerIteration"],
          async function (result) {
            console.log("🧪 DEBUG: Valeurs récupérées du stockage:", result);

            if (result.targetQuantity) targetQuantity = result.targetQuantity;
            if (result.baseUrl) baseUrl = result.baseUrl;
            if (result.selectedTime) selectedTime = result.selectedTime;
            if (result.ticketsPerIteration)
              ticketsPerIteration = result.ticketsPerIteration;

            console.log("📊 État dans le panier: ", {
              baseUrl,
              cartCount,
              selectedTime,
              targetQuantity,
              ticketsPerIteration,
            });
            sendNote(
              `📊 Panier: ${cartCount}/${targetQuantity} tickets (${selectedTime})`
            );

            // Vérification stricte: si le panier a au moins autant de tickets que notre cible, terminer
            if (cartCount >= targetQuantity) {
              console.log(
                "✅ Quantité cible atteinte ou dépassée dans le panier:",
                cartCount
              );
              sendNote(
                `✅ Terminé! ${cartCount}/${targetQuantity} tickets ajoutés au panier (${selectedTime})`
              );

              // Réinitialiser le compteur pour la prochaine fois
              chrome.storage.local.set({
                currentQuantity: 0,
                // Enregistrer le nombre réel d'articles pour référence
                lastCompletedRun: {
                  count: cartCount,
                  date: new Date().toISOString(),
                  targetQuantity: targetQuantity,
                  ticketsPerIteration: ticketsPerIteration,
                  time: selectedTime,
                },
              });

              return; // Sortir immédiatement
            }

            // Si nous n'avons pas encore atteint la cible
            if (cartCount < targetQuantity) {
              // On est sur la page du panier mais on n'a pas fini
              console.log(
                "🛒 Sur la page du panier, tentative de continuer les achats"
              );
              sendNote(`🔄 Continuation (${cartCount}/${targetQuantity})`);

              // Délai pour s'assurer que tout est chargé
              await new Promise((r) => setTimeout(r, 800));

              // Si baseUrl est défini, naviguer directement
              if (baseUrl) {
                console.log("🧪 DEBUG: Redirection directe avec baseUrl");
                const continueUrl = baseUrl.includes("?")
                  ? baseUrl + "&continueShopping=true"
                  : baseUrl + "?continueShopping=true";

                window.location.href = continueUrl;
              } else {
                // Sinon, essayer de continuer via les boutons
                const result = await continueShopping();
                console.log("🧪 DEBUG: Résultat de continueShopping:", result);
              }
            } else {
              console.log(
                "✅ Automatisation terminée, reste sur la page du panier"
              );
              sendNote(
                `✅ Terminé! ${targetQuantity} tickets ajoutés au panier (${selectedTime})`
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
          [
            "baseUrl",
            "currentQuantity",
            "targetQuantity",
            "selectedTime",
            "ticketsPerIteration",
          ],
          function (result) {
            console.log("🧪 DEBUG: Données récupérées dans l'iframe:", result);

            if (result.baseUrl) {
              baseUrl = result.baseUrl;
              console.log("🔗 URL de base récupérée dans l'iframe:", baseUrl);
            }

            if (result.currentQuantity)
              currentQuantity = result.currentQuantity;
            if (result.targetQuantity) targetQuantity = result.targetQuantity;
            if (result.selectedTime) selectedTime = result.selectedTime;
            if (result.ticketsPerIteration)
              ticketsPerIteration = result.ticketsPerIteration;

            console.log("🧪 DEBUG: État dans l'iframe:", {
              baseUrl,
              currentQuantity,
              selectedTime,
              targetQuantity,
              ticketsPerIteration,
            });

            resolve();
          }
        );
      });

      // délai pour que les créneaux apparaissent
      await new Promise((r) => setTimeout(r, 1000));

      // Afficher les créneaux disponibles
      const slotButtons = getAllTimeSlotButtons();
      if (slotButtons.length) {
        const slotsText = slotButtons
          .map((btn) => btn.innerText.replace(/\n/g, " | "))
          .join(" || ");
        sendNote("Créneaux trouvés : " + slotsText);

        // Afficher les créneaux disponibles dans la console pour débogage
        slotButtons.forEach((btn, index) => {
          console.log(`Créneau ${index + 1}:`, btn.innerText.trim());
        });
      } else {
        sendNote("Aucun bouton de créneau horaire trouvé");

        // Log tous les boutons pour voir ce qui est disponible
        const allButtons = Array.from(document.querySelectorAll("button"));
        console.log("🔍 Tous les boutons dans l'iframe:", allButtons.length);
        allButtons.forEach((btn, index) => {
          console.log(`- Bouton iframe ${index}:`, btn.textContent.trim(), btn);
        });
      }

      // Attendre et cliquer sur l'horaire sélectionné
      try {
        console.log(`⏳ Recherche du créneau '${selectedTime}'...`);
        const slotBtn = await waitForButtonWithText(selectedTime, 15000, 300);
        slotBtn.click();
        console.log(`✅ Bouton '${selectedTime}' cliqué (iframe)`);
        sendNote(`✅ Bouton '${selectedTime}' cliqué (iframe)`);

        // Attendre puis incrémenter le nombre de tickets selon ticketsPerIteration
        await new Promise((r) => setTimeout(r, 1000));

        // Trouver le bouton d'incrément
        const incBtnIframe = document.querySelector(
          'button.jss1250.jss1337.jss1339.btnBackgroundColor.quantityIconStyle.jss1330[data-bdd="increment-button"]'
        );

        if (incBtnIframe) {
          // Cliquer sur le bouton d'incrément le nombre de fois spécifié
          // Modification: incrémenter exactement le nombre de fois spécifié par ticketsPerIteration
          // au lieu de soustraire 1 (considérant qu'un ticket est déjà sélectionné par défaut)
          const clicksNeeded = ticketsPerIteration;

          if (clicksNeeded > 0) {
            console.log(`🎟️ Incrémentation de ${clicksNeeded} tickets...`);
            sendNote(
              `🎟️ Ajout de ${ticketsPerIteration} tickets à cette itération`
            );

            // Cliquer sur le bouton d'incrément le nombre de fois nécessaire
            for (let i = 0; i < clicksNeeded; i++) {
              incBtnIframe.click();
              await new Promise((r) => setTimeout(r, 300)); // Court délai entre les clics
            }

            console.log(
              `✅ ${ticketsPerIteration} tickets sélectionnés (${clicksNeeded} clics sur +)`
            );
          } else {
            console.log("✅ Conservation du ticket unique par défaut");
          }

          console.log("✅ Sélection de quantité effectuée (iframe)");
          sendNote(`✅ ${ticketsPerIteration} ticket(s) sélectionné(s)`);

          // Attendre puis cliquer sur "Continue"
          await new Promise((r) => setTimeout(r, 1000));
          const continueClicked = await findAndClickButtonByText(
            "Continue",
            8000
          );

          if (continueClicked) {
            // Attendre que la page se charge avant de chercher "Add to Cart"
            await new Promise((r) => setTimeout(r, 2000));

            // Vérifier et sauvegarder l'URL de base dans le stockage si elle n'est pas vide
            if (baseUrl) {
              console.log(
                "🧪 DEBUG: Sauvegarde baseUrl avant Add to Cart:",
                baseUrl
              );

              await new Promise((resolve) => {
                chrome.storage.local.set(
                  {
                    baseUrl: baseUrl,
                    selectedTime: selectedTime,
                    ticketsPerIteration: ticketsPerIteration,
                  },
                  function () {
                    console.log(
                      "🧪 DEBUG: variables sauvegardées avant Add to Cart"
                    );
                    resolve();
                  }
                );
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
              8000
            );

            // Alternatives si "Add to Cart" n'est pas trouvé
            if (!addToCartClicked) {
              if (!(await findAndClickButtonByText("Add to cart", 800))) {
                if (!(await findAndClickButtonByText("Add to Bag", 800))) {
                  await findAndClickButtonByText("Purchase", 800);
                }
              }
            }

            // Ajouter un délai plus court après le clic sur "Add to Cart"
            await new Promise((r) => setTimeout(r, 3000));

            // Vérifier s'il y a une alerte de chevauchement de temps et la gérer
            await handleTimeOverlapAlert(10000);

            // Attendre que le panier se charge avec un délai plus court
            const cartLoaded = await waitForCart(12000);
            console.log("🧪 DEBUG: Résultat de waitForCart:", cartLoaded);

            // Vérifier s'il faut continuer les achats
            if (currentQuantity < targetQuantity) {
              console.log("🧪 DEBUG: Continuation nécessaire depuis iframe:", {
                baseUrl,
                currentQuantity,
                selectedTime,
                targetQuantity,
                ticketsPerIteration,
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
                    selectedTime: selectedTime,
                    targetQuantity: targetQuantity,
                    ticketsPerIteration: ticketsPerIteration,
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
              }, 1500);
            } else {
              console.log("🧪 DEBUG: Quantité cible atteinte dans iframe", {
                currentQuantity,
                selectedTime,
                targetQuantity,
                ticketsPerIteration,
              });
            }

            // Incrémenter le compteur totalTicketsAdded
            totalTicketsAdded += ticketsPerIteration;
            await new Promise((resolve) => {
              chrome.storage.local.set({ totalTicketsAdded }, resolve);
            });
            console.log(
              `🎟️ Total tickets ajoutés: ${totalTicketsAdded}/${targetQuantity}`
            );
            sendNote(
              `🎟️ Total tickets ajoutés: ${totalTicketsAdded}/${targetQuantity}`
            );
          }
        }
      } catch (err) {
        console.warn(
          `❌ Créneau '${selectedTime}' non trouvé après 15s (iframe)`
        );
        sendNote(`❌ Créneau '${selectedTime}' non trouvé après 15s (iframe)`);

        // Essayer de trouver n'importe quel créneau disponible comme fallback
        try {
          console.log(
            "🔍 Tentative de trouver n'importe quel créneau disponible..."
          );
          const anySlotButton = slotButtons.find((btn) => !btn.disabled);

          if (anySlotButton) {
            const fallbackTime = anySlotButton.innerText.trim().split("\n")[0];
            console.log(
              `⚠️ Utilisation du créneau alternatif: ${fallbackTime}`
            );
            sendNote(`⚠️ Utilisation du créneau alternatif: ${fallbackTime}`);

            anySlotButton.click();
            // Continuer avec le reste du processus...
          } else {
            console.error("❌ Aucun créneau disponible trouvé");
            sendNote("❌ Aucun créneau disponible trouvé");
          }
        } catch (fallbackErr) {
          console.error(
            "❌ Échec de la recherche de créneaux alternatifs:",
            fallbackErr
          );
        }
      }
    });
  }

  // Écouter les messages du popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SET_PARAMS") {
      targetQuantity = message.quantity;
      if (message.selectedTime) {
        selectedTime = message.selectedTime;
      }
      if (message.ticketsPerIteration) {
        ticketsPerIteration = message.ticketsPerIteration;
      }

      // Réinitialiser le compteur quand on définit une nouvelle quantité
      currentQuantity = 0;
      totalTicketsAdded = 0;
      chrome.storage.local.set({
        currentQuantity: 0,
        selectedTime: selectedTime,
        targetQuantity: message.quantity,
        ticketsPerIteration: ticketsPerIteration,
        totalTicketsAdded: 0,
      });
      console.log(
        `📊 Paramètres mis à jour: ${targetQuantity} tickets à ${selectedTime} (${ticketsPerIteration}/itération)`
      );
      sendResponse({ success: true });
    }
  });
})();
