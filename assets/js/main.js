(function () {
  const backdrop = document.querySelector("[data-modal-close].theme-modal-backdrop");
  const modalTriggers = document.querySelectorAll("[data-open-modal]");
  const closeButtons = document.querySelectorAll("[data-modal-close]");

  function getModal(id) {
    return document.getElementById(id);
  }

  function closeModal() {
    document.querySelectorAll(".theme-modal").forEach(function (modal) {
      modal.hidden = true;
    });
    if (backdrop) {
      backdrop.hidden = true;
    }
    document.body.classList.remove("theme-modal-open");
  }

  function openModal(id) {
    const modal = getModal(id);
    if (!modal) {
      return;
    }
    closeModal();
    if (backdrop) {
      backdrop.hidden = false;
    }
    modal.hidden = false;
    document.body.classList.add("theme-modal-open");
    const firstField = modal.querySelector("input, textarea, select, button, a");
    if (firstField) {
      firstField.focus();
    }
  }

  modalTriggers.forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      openModal(trigger.getAttribute("data-open-modal"));
    });
  });

  closeButtons.forEach(function (button) {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  document.querySelectorAll("[data-question-mailto]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(form);
      const name = formData.get("name") || "";
      const category = formData.get("category") || "";
      const message = formData.get("message") || "";
      const subject = encodeURIComponent("Vijećničko pitanje za Dragicu Pršo");
      const body = encodeURIComponent(
        "Ime / nadimak: " + name + "\n" +
        "Kategorija: " + category + "\n\n" +
        "Pitanje ili problem:\n" + message
      );
      window.location.href = "mailto:dragica.prso@gmail.com?subject=" + subject + "&body=" + body;
      closeModal();
    });
  });

  const speakButton = document.querySelector("[data-speak-post]");
  if (speakButton && "speechSynthesis" in window) {
    speakButton.addEventListener("click", function () {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
      }

      const content = document.querySelector(".gh-content");
      if (!content) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(content.textContent || "");
      utterance.lang = "hr-HR";
      window.speechSynthesis.speak(utterance);
    });
  }
})();
