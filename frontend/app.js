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
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const siteHeader = document.getElementById("siteHeader");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const pageName = document.body?.dataset.page || "";

function isFarmerLoggedIn() {
  return localStorage.getItem("krishigyaanLoggedIn") === "true";
}

function redirectLoggedInAuthPages() {
  if ((pageName === "login" || pageName === "register") && isFarmerLoggedIn()) {
    window.location.replace("dashboard.html");
  }
}

function updateLoggedInNavigation() {
  if (!isFarmerLoggedIn()) return;
  document.querySelectorAll('a[href="login.html"], a[href="register.html"]').forEach((link) => {
    link.href = "dashboard.html";
  });
}

redirectLoggedInAuthPages();

const FIELD_RULES = {
  fullName: { test: (value) => /^[A-Za-zÀ-ž\u0900-\u097F\u0A80-\u0AFF\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0A00-\u0A7F .'-]{3,60}$/.test(value), message: "Enter a valid farmer name with at least 3 letters." },
  mobile: { test: (value) => /^[6-9]\d{9}$/.test(value.replace(/\D/g, "")), message: "Enter a valid 10 digit Indian mobile number." },
  age: { test: (value) => Number(value) >= 18 && Number(value) <= 100, message: "Age must be between 18 and 100." },
  state: { test: (value) => /^[A-Za-zÀ-ž\u0900-\u097F\u0A80-\u0AFF\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0A00-\u0A7F .'-]{2,40}$/.test(value), message: "Enter a valid state name." },
  district: { test: (value) => /^[A-Za-zÀ-ž\u0900-\u097F\u0A80-\u0AFF\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0A00-\u0A7F .'-]{2,40}$/.test(value), message: "Enter a valid district name." },
  village: { test: (value) => /^[A-Za-zÀ-ž\u0900-\u097F\u0A80-\u0AFF\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0A00-\u0A7F0-9 .'-]{2,50}$/.test(value), message: "Enter a valid village name." },
  landSize: { test: (value) => {
    const match = value.trim().match(/^([0-9]{1,4}(?:\.[0-9]{1,2})?)(?:\s*(?:acre|acres))?$/i);
    if (!match) return false;
    const acres = Number(match[1]);
    return acres > 0 && acres <= 9999;
  }, message: "Enter land in acres, up to 4 digits and 2 decimals, e.g. 3.5 acres." },
  primaryCrop: { test: (value) => /^[A-Za-zÀ-ž\u0900-\u097F\u0A80-\u0AFF\u0C80-\u0CFF\u0B80-\u0BFF\u0C00-\u0C7F\u0A00-\u0A7F ,'-]{2,40}$/.test(value), message: "Enter a valid crop name." },
  fertilizer: { test: (value) => value.trim().length >= 2 && value.trim().length <= 60, message: "Enter fertilizer or input details." },
  problem: { test: (value) => value.trim().length >= 5 && value.trim().length <= 220, message: "Describe the recent crop problem in at least 5 characters." },
  harvest: { test: (value) => /^[A-Za-z0-9À-ž\u0900-\u097F ./,-]{4,30}$/.test(value.trim()), message: "Enter expected harvest month/year or date." },
  aadhaar: { test: (value) => /^\d{4}$/.test(value), message: "Enter exactly the last 4 digits of Aadhaar." },
  password: { test: (value) => /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(value), message: "Password must be 8-32 characters and include at least one letter and one number." },
  confirmPassword: { test: (value) => value === registerForm?.elements.password?.value, message: "Confirm password must match the password." }
};

function setFieldError(field, message = "") {
  field.setCustomValidity(message);
  field.classList.toggle("field-invalid", Boolean(message));
}

function validateField(field) {
  setFieldError(field);
  const value = field.type === "checkbox" ? field.checked : field.value.trim();
  if (field.required && (field.type === "checkbox" ? !field.checked : !value)) {
    setFieldError(field, "This field is required.");
    return false;
  }
  const rule = FIELD_RULES[field.name];
  if (rule && !rule.test(String(value))) {
    setFieldError(field, rule.message);
    return false;
  }
  if (!field.checkValidity()) return false;
  return true;
}

function validateStep(stepIndex, showMessage = true) {
  const step = formSteps[stepIndex];
  if (!step) return true;
  const fields = [...step.querySelectorAll("input, select, textarea")];
  const invalid = fields.find((field) => !validateField(field));
  if (!invalid) return true;
  if (showMessage) {
    invalid.reportValidity();
    formNote.textContent = invalid.validationMessage || "Please complete this step correctly.";
  }
  return false;
}

function validateAllRegistrationSteps() {
  for (let index = 0; index < formSteps.length; index++) {
    if (!validateStep(index, false)) {
      updateRegisterStep(index);
      validateStep(index, true);
      return false;
    }
  }
  return true;
}

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

function kgApi(path) {
  if (window.location.protocol === "http:" || window.location.protocol === "https:") return path;
  return `http://127.0.0.1:5173${path}`;
}

async function postJson(path, payload) {
  const response = await fetch(kgApi(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed with status ${response.status}`);
  return data;
}

async function saveRegistration(form) {
  if (!validateAllRegistrationSteps()) return;
  const profile = Object.fromEntries(new FormData(form).entries());
  profile.mobile = (profile.mobile || "").replace(/\D/g, "");
  const landMatch = (profile.landSize || "").trim().match(/^([0-9]{1,4}(?:\.[0-9]{1,2})?)/);
  if (landMatch) profile.landSize = `${landMatch[1]} acres`;
  const stateLang = profile.state ? kgLanguageForState(profile.state) : kgActiveLanguage;
  profile.language = profile.language || stateLang;
  submitRegister.disabled = true;
  formNote.textContent = "Creating your farmer account...";
  try {
    const result = await postJson("/api/auth/register", profile);
    localStorage.setItem("krishigyaanFarmerProfile", JSON.stringify(result.profile));
    localStorage.setItem("krishigyaanRegistered", "true");
    localStorage.setItem("krishigyaanLanguage", result.profile.language || profile.language);
    kgApplyLanguage(result.profile.language || profile.language);
    formNote.textContent = (KG_TRANSLATIONS[kgActiveLanguage] || KG_EN).registerSuccess;
    kgSpeak(formNote.textContent, kgActiveLanguage);
    setTimeout(() => {
      window.location.href = "login.html";
    }, 700);
  } catch (error) {
    formNote.textContent = error.message;
    kgSpeak(error.message, kgActiveLanguage);
  } finally {
    submitRegister.disabled = false;
  }
}

async function loginFarmer(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const normalizedInput = (data.mobile || "").replace(/\D/g, "");
  const submitButton = form.querySelector('button[type="submit"]');

  const mobileField = form.elements.mobile;
  setFieldError(mobileField);
  if (!FIELD_RULES.mobile.test(normalizedInput)) {
    setFieldError(mobileField, "Enter a valid 10 digit Indian mobile number.");
    mobileField.reportValidity();
    loginNote.textContent = mobileField.validationMessage;
    return;
  }

  const passwordField = form.elements.password;
  setFieldError(passwordField);
  if (!FIELD_RULES.password.test(data.password || "")) {
    setFieldError(passwordField, "Enter your valid registered password.");
    passwordField.reportValidity();
    loginNote.textContent = passwordField.validationMessage;
    return;
  }

  loginNote.textContent = "Checking your account...";
  if (submitButton) submitButton.disabled = true;
  try {
    const result = await postJson("/api/auth/login", { mobile: normalizedInput, password: data.password });
    const profile = result.profile || {};
    const lang = data.loginLanguage || profile.language || kgActiveLanguage;
    localStorage.setItem("krishigyaanFarmerProfile", JSON.stringify(profile));
    localStorage.setItem("krishigyaanRegistered", "true");
    localStorage.setItem("krishigyaanLoggedIn", "true");
    localStorage.setItem("krishigyaanLanguage", lang);
    kgApplyLanguage(lang);
    loginNote.textContent = (KG_TRANSLATIONS[kgActiveLanguage] || KG_EN).loginSuccess;
    kgSpeak(loginNote.textContent, kgActiveLanguage);
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  } catch (error) {
    loginNote.textContent = error.message;
    kgSpeak(error.message, kgActiveLanguage);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function handleForgotPassword() {
  if (!loginForm) return;
  const mobileField = loginForm.elements.mobile;
  const mobile = (mobileField.value || "").replace(/\D/g, "");
  setFieldError(mobileField);
  if (!FIELD_RULES.mobile.test(mobile)) {
    setFieldError(mobileField, "Enter your registered 10 digit mobile number first.");
    mobileField.reportValidity();
    loginNote.textContent = mobileField.validationMessage;
    return;
  }
  loginNote.textContent = "Checking registered account...";
  try {
    const result = await postJson("/api/auth/forgot-password", { mobile });
    loginNote.textContent = result.message;
    kgSpeak(result.message, kgActiveLanguage);
  } catch (error) {
    loginNote.textContent = error.message;
    kgSpeak(error.message, kgActiveLanguage);
  }
}

function openProtectedFeature(card) {
  if (isFarmerLoggedIn()) {
    window.location.href = card.dataset.featureLink || "dashboard.html";
    return;
  }
  const message = (KG_TRANSLATIONS[kgActiveLanguage] || KG_EN).lockedMessage;
  kgSpeak(message, kgActiveLanguage);
  window.location.href = "login.html";
}

window.addEventListener("scroll", () => siteHeader?.classList.toggle("scrolled", window.scrollY > 12));
navToggle?.addEventListener("click", () => navLinks?.classList.toggle("open"));
navLinks?.addEventListener("click", (event) => {
  if (event.target.tagName === "A") navLinks.classList.remove("open");
});

nextStep?.addEventListener("click", (event) => {
  if (!validateStep(currentStep, true)) {
    event.preventDefault();
    return;
  }
  updateRegisterStep(currentStep + 1);
});
prevStep?.addEventListener("click", () => updateRegisterStep(currentStep - 1));
stepButtons.forEach((button) => button.addEventListener("click", () => {
  const targetStep = Number(button.dataset.stepJump);
  if (targetStep <= currentStep || validateStep(currentStep, true)) updateRegisterStep(targetStep);
}));

registerForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!validateAllRegistrationSteps()) return;
  saveRegistration(registerForm);
});

registerForm?.addEventListener("input", (event) => {
  if (event.target.matches("input, textarea")) validateField(event.target);
});

registerForm?.addEventListener("change", (event) => {
  if (event.target.matches("select, input")) validateField(event.target);
});

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  loginFarmer(loginForm);
});

forgotPasswordBtn?.addEventListener("click", handleForgotPassword);

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
updateLoggedInNavigation();
updateRegisterStep(0);
animateCounters();
