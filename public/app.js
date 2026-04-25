let currentStep = 0;

const stepButtons = [...document.querySelectorAll("[data-step-jump]")];
const formSteps = [...document.querySelectorAll(".form-step")];
const nextStep = document.getElementById("nextStep");
const prevStep = document.getElementById("prevStep");
const submitRegister = document.getElementById("submitRegister");
const formNote = document.getElementById("formNote");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const loginNote = document.getElementById("loginNote");
const siteHeader = document.getElementById("siteHeader");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

  registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
    const formData = new FormData(registerForm);
  const data = {
    personal: {
      fullName: formData.get("fullName"),
      mobileNumber: formData.get("mobile"),
      age: formData.get("age"),
      gender: formData.get("gender"),
      state: formData.get("state"),
      district: formData.get("district"),
      village: formData.get("village"),
      language: formData.get("language")
    },
    farm: {
      landSize: formData.get("landSize"),
      ownership: formData.get("ownership"),
      soilType: formData.get("soilType"),
      irrigation: formData.get("irrigation"),
      latitude: formData.get("latitude"),
      longitude: formData.get("longitude")
    },
    crop: {
      primaryCrop: formData.get("primaryCrop"),
      season: formData.get("season"),
      sowingDate: formData.get("sowingDate"),
      fertilizer: formData.get("fertilizer"),
      problem: formData.get("problem"),
      harvest: formData.get("harvest")
    },
    access: {
      aadhaar: formData.get("aadhaar"),
      bank: formData.get("bank"),
      pmkisan: formData.get("pmkisan"),
      internet: formData.get("internet")
    }
  };

  try {
    const res = await fetch("http://127.0.0.1:5000/api/farmers/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok) {
      saveRegistration(registerForm); // localStorage save
      formNote.innerText = result.message;
      registerForm.reset();
    } else {
      formNote.innerText = result.error;
    }

  } catch (err) {
    console.error(err);
    formNote.innerText = "Server error. Try again.";
  }
});

function updateRegisterStep(nextIndex) {
  if (!formSteps.length) return;
  currentStep = Math.max(0, Math.min(nextIndex, formSteps.length - 1));
  formSteps.forEach((step, index) => step.classList.toggle("active", index === currentStep));
  stepButtons.forEach((button, index) => button.classList.toggle("active", index === currentStep));
  if (prevStep) prevStep.disabled = currentStep === 0;
  nextStep?.classList.toggle("hidden", currentStep === formSteps.length - 1);
  submitRegister?.classList.toggle("hidden", currentStep !== formSteps.length - 1);
}

function animateCounters() {
  const counters = document.querySelectorAll("[data-counter]");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const node = entry.target;
        const target = Number(node.dataset.counter);
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / 1200, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          node.textContent = `${Math.floor(target * eased).toLocaleString("en-IN")}+`;
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        observer.unobserve(node);
      });
    },
    { threshold: 0.35 }
  );
  counters.forEach((counter) => observer.observe(counter));
}

function saveRegistration(form) {
  const profile = Object.fromEntries(new FormData(form).entries());
  const stateLang = profile.state ? kgLanguageForState(profile.state) : kgActiveLanguage;
  profile.language = profile.language || stateLang;
  localStorage.setItem("krishigyaanFarmerProfile", JSON.stringify(profile));
  localStorage.setItem("krishigyaanRegistered", "true");
  localStorage.setItem("krishigyaanLanguage", profile.language);
  kgApplyLanguage(profile.language);
  formNote.textContent = (KG_TRANSLATIONS[kgActiveLanguage] || KG_EN).registerSuccess;
  kgSpeak(formNote.textContent, kgActiveLanguage);
  document.getElementById("login")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function loginFarmer(form) {
  const registered = localStorage.getItem("krishigyaanRegistered") === "true";
  const profile = JSON.parse(localStorage.getItem("krishigyaanFarmerProfile") || "{}");
  const data = Object.fromEntries(new FormData(form).entries());
  const normalizedInput = (data.mobile || "").replace(/\D/g, "");
  const normalizedSaved = (profile.mobile || "").replace(/\D/g, "");

  if (!registered) {
    loginNote.textContent = (KG_TRANSLATIONS[kgActiveLanguage] || KG_EN).loginMissing;
    kgSpeak(loginNote.textContent, kgActiveLanguage);
    return;
  }

  if (normalizedSaved && normalizedInput && !normalizedSaved.endsWith(normalizedInput.slice(-10))) {
    loginNote.textContent = "Mobile number does not match the registered farmer profile.";
    kgSpeak(loginNote.textContent, kgActiveLanguage);
    return;
  }

  const lang = data.loginLanguage || profile.language || kgActiveLanguage;
  localStorage.setItem("krishigyaanLoggedIn", "true");
  localStorage.setItem("krishigyaanLanguage", lang);
  kgApplyLanguage(lang);
  loginNote.textContent = (KG_TRANSLATIONS[kgActiveLanguage] || KG_EN).loginSuccess;
  kgSpeak(loginNote.textContent, kgActiveLanguage);
  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 700);
}

function openProtectedFeature(card) {
  const loggedIn = localStorage.getItem("krishigyaanLoggedIn") === "true";
  if (loggedIn) {
    window.location.href = card.dataset.featureLink || "dashboard.html";
    return;
  }
  const message = (KG_TRANSLATIONS[kgActiveLanguage] || KG_EN).lockedMessage;
  kgSpeak(message, kgActiveLanguage);
  document.getElementById("login")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

window.addEventListener("scroll", () => siteHeader?.classList.toggle("scrolled", window.scrollY > 12));
navToggle?.addEventListener("click", () => navLinks?.classList.toggle("open"));
navLinks?.addEventListener("click", (event) => {
  if (event.target.tagName === "A") navLinks.classList.remove("open");
});

nextStep?.addEventListener("click", (event) => {
  const activeStep = formSteps[currentStep];
  const fields = [...activeStep.querySelectorAll("input, select, textarea")];
  const invalid = fields.find((field) => !field.checkValidity());
  if (invalid) {
    event.preventDefault();
    invalid.reportValidity();
    return;
  }
  updateRegisterStep(currentStep + 1);
});
prevStep?.addEventListener("click", () => updateRegisterStep(currentStep - 1));
stepButtons.forEach((button) => button.addEventListener("click", () => updateRegisterStep(Number(button.dataset.stepJump))));

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  loginFarmer(loginForm);
});

document.querySelectorAll(".locked-feature").forEach((card) => {
  card.addEventListener("click", () => openProtectedFeature(card));
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") openProtectedFeature(card);
  });
});

document.getElementById("demoBtn")?.addEventListener("click", () => {
  kgSpeak("KrishiGyaan registers a farmer, detects local language from location, then opens a secure dashboard with crop health, weather, schemes, soil guidance, AI chat, and voice support.", kgActiveLanguage);
});

kgInitShared({ askLocation: true });
updateRegisterStep(0);
animateCounters();
