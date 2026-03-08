const ADMIN_ID = "kitti";
const ADMIN_PASSWORD = "1269900";

const API_BASE =
  "https://script.google.com/macros/s/AKfycbxSrUs8E3hSQeXJmX8kPzQSc8wVvCc9Hf5aNOv95jNIZEDtrTJ6-w-9tUj8kiDtx74IIQ/exec";

const STORAGE_KEYS = {
  app: "roseAtelierAppDataV3",
  adminLoggedIn: "roseAtelierAdminLoggedInV3"
};

const FLOWER_TYPES = [
  "กุหลาบ ไม่ใส่กลิตเตอร์",
  "ทานตะวัน",
  "เดซี่",
  "ไฮเดรนเยีย",
  "ลิลลี่",
  "กุหลาบ กลิตเตอร์"
];

const DEFAULT_FLOWER_COLORS = [
  "ชมพูกะปิ",
  "น้ำเงิน",
  "แดง",
  "ฟ้าสว่าง",
  "กำ",
  "ขาว",
  "น้ำเงินเข้ม",
  "ชมพูนม",
  "เบจ",
  "แชมเปญ",
  "เขียวมิ้นต์"
];

const DEFAULT_BOUQUET_COLORS = [
  "ขาว",
  "ม่วง",
  "ชมพู",
  "ดำ",
  "แดง",
  "น้ำเงิน",
  "คิดตี้"
];

const ORDER_STATUSES = [
  "รอตรวจสอบสลิป",
  "รับออเดอร์",
  "กำลังจัดช่อ",
  "รอจัดส่ง",
  "จัดส่งแล้ว",
  "จัดส่งแล้ว(ไปรษณี)"
];

const PRICE_MAP_1_TO_40 = {
  1: 69, 2: 99, 3: 129, 4: 159, 5: 189,
  6: 219, 7: 249, 8: 279, 9: 309, 10: 339,
  11: 369, 12: 389, 13: 409, 14: 419, 15: 439,
  16: 459, 17: 479, 18: 499, 19: 519, 20: 539,
  21: 559, 22: 579, 23: 599, 24: 619, 25: 639,
  26: 659, 27: 679, 28: 699, 29: 719, 30: 739,
  31: 759, 32: 779, 33: 799, 34: 819, 35: 839,
  36: 859, 37: 879, 38: 899, 39: 919, 40: 939
};

const DEFAULT_QR = "https://promptpay.io/0628894582.png";

const DEFAULT_GALLERY = [
  "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1526397751294-331021109fbd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?auto=format&fit=crop&w=900&q=80"
];

const BANNED_WORDS = [
  "เหี้ย", "ห่า", "สัส", "สัตว์", "เชี่ย", "ควย", "หี", "เย็ด", "แม่ง", "fuck", "shit", "bitch"
];

const state = {
  app: null,
  currentPage: "page-home",
  orderDraft: null,
  paymentSlipDataUrl: "",
  pendingGalleryUpload: "",
  pendingQrUpload: "",
  lastCreatedOrderId: "",
  toastTimer: null,
  loadingRequest: false
};

function createDefaultAppData() {
  return {
    settings: {
      fluffyPrice: 50,
      crownPrice: 20,
      shipping: {
        range1to10: 50,
        range11to19: 80,
        range20to30: 150,
        range31to40: 200,
        range41to50: 230
      },
      payment: {
        bankName: "กสิกรไทย",
        accountName: "กิตติศักดิ์ โชติวราพัฒนสกุล",
        accountNumber: "062-8-89458-2",
        qrUrl: DEFAULT_QR
      },
      flowerColors: [...DEFAULT_FLOWER_COLORS],
      bouquetColors: [...DEFAULT_BOUQUET_COLORS]
    },
    gallery: DEFAULT_GALLERY.map((url, index) => ({
      id: `default-gallery-${index + 1}`,
      title: "",
      imageUrl: url,
      sortOrder: index + 1,
      isActive: true
    })),
    orders: [],
    costs: []
  };
}

function saveCache(data = state.app) {
  localStorage.setItem(STORAGE_KEYS.app, JSON.stringify(data));
}

function loadCache() {
  const raw = localStorage.getItem(STORAGE_KEYS.app);
  if (!raw) return createDefaultAppData();

  try {
    const parsed = JSON.parse(raw);
    return mergeAppData(parsed);
  } catch {
    return createDefaultAppData();
  }
}

function mergeAppData(data = {}) {
  const defaults = createDefaultAppData();

  return {
    ...defaults,
    ...data,
    settings: {
      ...defaults.settings,
      ...(data.settings || {}),
      shipping: {
        ...defaults.settings.shipping,
        ...(data.settings?.shipping || {})
      },
      payment: {
        ...defaults.settings.payment,
        ...(data.settings?.payment || {})
      },
      flowerColors: Array.isArray(data.settings?.flowerColors) && data.settings.flowerColors.length
        ? data.settings.flowerColors
        : [...defaults.settings.flowerColors],
      bouquetColors: Array.isArray(data.settings?.bouquetColors) && data.settings.bouquetColors.length
        ? data.settings.bouquetColors
        : [...defaults.settings.bouquetColors]
    },
    gallery: Array.isArray(data.gallery) ? data.gallery : [...defaults.gallery],
    orders: Array.isArray(data.orders) ? data.orders : [],
    costs: Array.isArray(data.costs) ? data.costs : []
  };
}

async function apiRequest(method, action, data = null) {
  const url = new URL(API_BASE);
  url.searchParams.set("action", action);

  const options = {
    method,
    headers: {}
  };

  if (method === "POST") {
    options.headers["Content-Type"] = "text/plain;charset=utf-8";
    options.body = JSON.stringify(data || {});
  } else if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), options);
  const text = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("API ตอบกลับไม่ใช่ JSON");
  }

  if (!parsed.ok) {
    throw new Error(parsed.message || "API request failed");
  }

  return parsed;
}

function apiGet(action, params = {}) {
  return apiRequest("GET", action, params);
}

function apiPost(action, payload = {}) {
  return apiRequest("POST", action, payload);
}

function formatBaht(value) {
  return `${Number(value || 0).toLocaleString("th-TH")} บาท`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("th-TH");
}

function generateCostId() {
  return `COST-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 999)}`;
}

function getTodayKey(dateInput = new Date()) {
  const d = new Date(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthKey(dateInput = new Date()) {
  const d = new Date(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function getYearKey(dateInput = new Date()) {
  return String(new Date(dateInput).getFullYear());
}

function matchesToday(dateValue) {
  if (!dateValue) return false;
  return getTodayKey(dateValue) === getTodayKey(new Date());
}

function matchesMonth(dateValue) {
  if (!dateValue) return false;
  return getMonthKey(dateValue) === getMonthKey(new Date());
}

function matchesYear(dateValue) {
  if (!dateValue) return false;
  return getYearKey(dateValue) === getYearKey(new Date());
}

function getFlowerBasePrice(count) {
  const safeCount = Math.max(1, Math.min(100, Number(count || 0)));
  if (safeCount <= 40) return PRICE_MAP_1_TO_40[safeCount];
  return PRICE_MAP_1_TO_40[40] + (safeCount - 40) * 20;
}

function getShippingInfo(count, isPickup) {
  if (!count) return { shippingCost: 0, note: "-" };
  if (isPickup) return { shippingCost: 0, note: "นัดรับสินค้า ไม่มีค่าส่ง" };
  if (count >= 1 && count <= 10) return { shippingCost: state.app.settings.shipping.range1to10, note: "ค่าส่งตามเรต 1-10 ดอก" };
  if (count >= 11 && count <= 19) return { shippingCost: state.app.settings.shipping.range11to19, note: "ค่าส่งตามเรต 11-19 ดอก" };
  if (count >= 20 && count <= 30) return { shippingCost: state.app.settings.shipping.range20to30, note: "ค่าส่งตามเรต 20-30 ดอก" };
  if (count >= 31 && count <= 40) return { shippingCost: state.app.settings.shipping.range31to40, note: "ค่าส่งตามเรต 31-40 ดอก" };
  if (count >= 41 && count <= 50) return { shippingCost: state.app.settings.shipping.range41to50, note: "ค่าส่งตามเรต 41-50 ดอก" };
  return { shippingCost: 0, note: "ค่าส่งตามน้ำหนัก(กรุณารอแอดมินแจ้งค่าส่ง)" };
}

function getDefaultDraft() {
  return {
    step: 1,
    customer: {
      name: "",
      phone: "",
      address: ""
    },
    bouquet: {
      count: 0,
      bouquetColor: "",
      compositions: [],
      extras: {
        fluffy: false,
        crown: false,
        pickup: false
      },
      note: ""
    }
  };
}

function getCompositionTotal() {
  return state.orderDraft.bouquet.compositions.reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function getSelectedTypesText() {
  const uniqueTypes = [...new Set(state.orderDraft.bouquet.compositions.map(item => item.type).filter(Boolean))];
  return uniqueTypes.length ? uniqueTypes.join(", ") : "-";
}

function calculateDraftSummary() {
  const count = Number(state.orderDraft.bouquet.count || 0);
  const basePrice = count ? getFlowerBasePrice(count) : 0;
  const fluffyPrice = state.orderDraft.bouquet.extras.fluffy ? Number(state.app.settings.fluffyPrice || 0) : 0;
  const crownPrice = state.orderDraft.bouquet.extras.crown ? Number(state.app.settings.crownPrice || 0) : 0;
  const shippingInfo = getShippingInfo(count, state.orderDraft.bouquet.extras.pickup);
  const total = basePrice + fluffyPrice + crownPrice + shippingInfo.shippingCost;

  return {
    count,
    basePrice,
    fluffyPrice,
    crownPrice,
    shippingCost: shippingInfo.shippingCost,
    shippingNote: shippingInfo.note,
    total
  };
}

function isAdminLoggedIn() {
  return localStorage.getItem(STORAGE_KEYS.adminLoggedIn) === "true";
}

function setAdminLoggedIn(status) {
  localStorage.setItem(STORAGE_KEYS.adminLoggedIn, status ? "true" : "false");
}

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function sanitizeText(text) {
  if (!text) return "";
  let result = String(text);

  BANNED_WORDS.forEach(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    result = result.replace(regex, "***");
  });

  return result;
}

function attachProfanityFilter(selector) {
  const el = qs(selector);
  if (!el) return;

  el.addEventListener("input", () => {
    const original = el.value;
    const sanitized = sanitizeText(original);
    if (original !== sanitized) {
      el.value = sanitized;
      showToast("ระบบกรองคำไม่เหมาะสมให้อัตโนมัติแล้ว");
    }
  });
}

function setBodyLock(locked) {
  document.body.classList.toggle("body-lock", !!locked);
}

function updateBodyLockState() {
  const mobileNavOpen = !qs("#mobile-nav")?.classList.contains("hidden");
  const modalOpen = !qs("#slip-modal")?.classList.contains("hidden");
  setBodyLock(mobileNavOpen || modalOpen);
}

function showToast(message) {
  const toast = qs("#toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  if (state.toastTimer) {
    clearTimeout(state.toastTimer);
  }

  state.toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function setBusy(status) {
  state.loadingRequest = !!status;
  const submitBtn = qs("#submit-order-btn");
  if (submitBtn) {
    submitBtn.disabled = !!status;
  }
}

function normalizeOrder(serverOrder) {
  const compositions = Array.isArray(serverOrder.compositions)
    ? serverOrder.compositions
    : [];

  const extras = {
    fluffy: !!serverOrder.extras?.fluffy,
    crown: !!serverOrder.extras?.crown,
    pickup: !!serverOrder.extras?.pickup
  };

  return {
    id: serverOrder.orderId || serverOrder.id || "",
    createdAt: serverOrder.createdAt || "",
    status: serverOrder.orderStatus || serverOrder.status || "รอตรวจสอบสลิป",
    trackingNumber: serverOrder.trackingNumber || "",
    customer: {
      name: serverOrder.customerName || "",
      phone: serverOrder.phone || "",
      address: serverOrder.address || ""
    },
    bouquet: {
      count: Number(serverOrder.quantity || 0),
      bouquetColor: serverOrder.bouquetColor || "",
      note: serverOrder.comment || "",
      extras,
      compositions
    },
    pricing: {
      basePrice: Number(serverOrder.basePrice || 0),
      fluffyPrice: Number(serverOrder.fluffyPrice || 0),
      crownPrice: Number(serverOrder.crownPrice || 0),
      shippingCost: Number(serverOrder.shippingCost || 0),
      shippingNote: serverOrder.shippingNote || "-",
      total: Number(serverOrder.totalPrice || 0)
    },
    payment: {
      slipImage: serverOrder.slipFileUrl || ""
    }
  };
}

function normalizeGallery(serverGallery = []) {
  return serverGallery.map((item, index) => ({
    id: item.galleryId || item.id || item.imageFileId || `gallery-${index + 1}`,
    title: item.title || "",
    imageUrl: item.imageUrl || item.url || "",
    sortOrder: Number(item.sortOrder || index + 1),
    isActive: String(item.isActive).toUpperCase() !== "FALSE"
  }));
}

function normalizeCosts(serverCosts = []) {
  return serverCosts.map(item => ({
    id: item.costId || generateCostId(),
    name: item.name || "",
    amount: Number(item.amount || 0),
    date: item.date || "",
    note: item.note || "",
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || ""
  }));
}

function normalizeSettings(serverSettings = {}) {
  const defaults = createDefaultAppData().settings;

  return {
    ...defaults,
    ...serverSettings,
    shipping: {
      ...defaults.shipping,
      ...(serverSettings.shipping || {})
    },
    payment: {
      ...defaults.payment,
      ...(serverSettings.payment || {})
    },
    flowerColors: Array.isArray(serverSettings.flowerColors) && serverSettings.flowerColors.length
      ? serverSettings.flowerColors
      : [...defaults.flowerColors],
    bouquetColors: Array.isArray(serverSettings.bouquetColors) && serverSettings.bouquetColors.length
      ? serverSettings.bouquetColors
      : [...defaults.bouquetColors]
  };
}

function normalizeAppData(serverApp = {}) {
  return mergeAppData({
    settings: normalizeSettings(serverApp.settings || {}),
    gallery: normalizeGallery(serverApp.gallery || []),
    orders: (serverApp.orders || []).map(normalizeOrder),
    costs: normalizeCosts(serverApp.costs || [])
  });
}

async function syncAppFromServer(showErrorToast = false) {
  try {
    const result = await apiGet("getBootstrap");
    state.app = normalizeAppData(result.data || {});
    saveCache(state.app);
    return state.app;
  } catch (error) {
    state.app = loadCache();
    if (showErrorToast) {
      showToast(`โหลดข้อมูลจากเซิร์ฟเวอร์ไม่สำเร็จ: ${error.message}`);
    }
    return state.app;
  }
}

function setPage(pageId) {
  state.currentPage = pageId;

  qsa(".page-section").forEach(section => {
    section.classList.toggle("active", section.id === pageId);
  });

  if (pageId === "page-home") {
    renderGallery();
  }

  if (pageId === "page-admin") {
    if (!isAdminLoggedIn()) {
      setPage("page-admin-login");
      return;
    }
    renderAdminDashboard();
  }

  closeMobileNav();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function openMobileNav() {
  const nav = qs("#mobile-nav");
  const toggle = qs("#menu-toggle");
  if (!nav || !toggle) return;

  nav.classList.remove("hidden");
  toggle.setAttribute("aria-expanded", "true");
  updateBodyLockState();
}

function closeMobileNav() {
  const nav = qs("#mobile-nav");
  const toggle = qs("#menu-toggle");
  if (!nav || !toggle) return;

  nav.classList.add("hidden");
  toggle.setAttribute("aria-expanded", "false");
  updateBodyLockState();
}

function toggleMobileNav() {
  const nav = qs("#mobile-nav");
  if (!nav) return;

  if (nav.classList.contains("hidden")) {
    openMobileNav();
  } else {
    closeMobileNav();
  }
}

function navigateToSection(target) {
  closeMobileNav();

  if (target === "gallery") {
    setPage("page-home");
    setTimeout(() => {
      qs("#gallery-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return;
  }

  if (target === "status") {
    setPage("page-status");
    return;
  }

  if (target === "order") {
    beginNewOrder(true);
    return;
  }

  if (target === "admin-login") {
    setPage(isAdminLoggedIn() ? "page-admin" : "page-admin-login");
  }
}

function beginNewOrder(reset = true) {
  if (reset || !state.orderDraft) {
    state.orderDraft = getDefaultDraft();
    state.paymentSlipDataUrl = "";
    state.lastCreatedOrderId = "";
  }
  renderOrderForm();
  setPage("page-order");
}

function syncStepHeader() {
  const step = state.orderDraft.step;
  const title = qs("#wizard-title");
  const subtitle = qs("#wizard-subtitle");
  const stepIndicators = qsa(".step-item");

  stepIndicators.forEach((item, index) => {
    item.classList.toggle("active", index + 1 === step);
  });

  if (step === 1) {
    title.textContent = "กรอกข้อมูลลูกค้า";
    subtitle.textContent = "ขั้นตอนที่ 1 จาก 3";
  } else if (step === 2) {
    title.textContent = "เลือกดอกไม้";
    subtitle.textContent = "ขั้นตอนที่ 2 จาก 3";
  } else {
    title.textContent = "ชำระเงิน";
    subtitle.textContent = "ขั้นตอนที่ 3 จาก 3";
  }
}

function renderOrderForm() {
  syncStepHeader();

  qs("#order-step-1").classList.toggle("active", state.orderDraft.step === 1);
  qs("#order-step-2").classList.toggle("active", state.orderDraft.step === 2);
  qs("#order-step-3").classList.toggle("active", state.orderDraft.step === 3);

  qs("#customer-name").value = state.orderDraft.customer.name;
  qs("#customer-phone").value = state.orderDraft.customer.phone;
  qs("#customer-address").value = state.orderDraft.customer.address;

  renderQuickCounts();
  renderCompositionRows();
  renderBouquetColors();
  renderBuilderSummary();
  renderStep3Summary();
  renderPaymentInfo();

  qs("#order-note").value = state.orderDraft.bouquet.note;
  qs("#extra-fluffy").checked = !!state.orderDraft.bouquet.extras.fluffy;
  qs("#extra-crown").checked = !!state.orderDraft.bouquet.extras.crown;
  qs("#extra-pickup").checked = !!state.orderDraft.bouquet.extras.pickup;
  qs("#selected-count-text").textContent = `${state.orderDraft.bouquet.count || 0} ดอก`;
  qs("#composition-progress-text").textContent = `${getCompositionTotal()} / ${state.orderDraft.bouquet.count || 0} ดอก`;

  if (state.orderDraft.step !== 3) {
    qs("#payment-section").classList.add("hidden");
  }
}

function renderQuickCounts() {
  const wrap = qs("#count-quick-grid");
  wrap.innerHTML = "";

  for (let i = 1; i <= 20; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quick-count-btn";
    if (Number(state.orderDraft.bouquet.count) === i) btn.classList.add("active");
    btn.textContent = i;
    btn.addEventListener("click", () => setBouquetCount(i));
    wrap.appendChild(btn);
  }
}

function renderBouquetColors() {
  const wrap = qs("#bouquet-color-grid");
  wrap.innerHTML = "";

  state.app.settings.bouquetColors.forEach(color => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-pill";
    if (state.orderDraft.bouquet.bouquetColor === color) btn.classList.add("active");
    btn.textContent = color;
    btn.addEventListener("click", () => {
      state.orderDraft.bouquet.bouquetColor = color;
      renderBouquetColors();
      renderBuilderSummary();
    });
    wrap.appendChild(btn);
  });
}

function renderCompositionRows() {
  const wrap = qs("#composition-list");
  wrap.innerHTML = "";

  if (!state.orderDraft.bouquet.compositions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "ยังไม่มีรายการดอก / สี กด “เพิ่มรายการดอก / สี” เพื่อเริ่มเลือก";
    wrap.appendChild(empty);
    return;
  }

  state.orderDraft.bouquet.compositions.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = "composition-row";
    item.innerHTML = `
      <div class="composition-row__grid">
        <div class="field-group">
          <label>ประเภทดอก</label>
          <select data-field="type">
            <option value="">เลือกประเภทดอก</option>
            ${FLOWER_TYPES.map(type => `<option value="${type}" ${row.type === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </div>

        <div class="field-group">
          <label>สี</label>
          <select data-field="color" ${!row.type ? "disabled" : ""}>
            <option value="">เลือกสี</option>
            ${state.app.settings.flowerColors.map(color => `<option value="${color}" ${row.color === color ? "selected" : ""}>${color}</option>`).join("")}
          </select>
        </div>

        <div class="field-group">
          <label>จำนวน</label>
          <input type="number" data-field="qty" min="0" max="100" value="${row.qty || ""}" placeholder="0" />
        </div>

        <button type="button" class="composition-row__remove">ลบ</button>
      </div>
    `;

    const typeEl = item.querySelector('select[data-field="type"]');
    const colorEl = item.querySelector('select[data-field="color"]');
    const qtyEl = item.querySelector('input[data-field="qty"]');
    const removeEl = item.querySelector(".composition-row__remove");

    typeEl.addEventListener("change", (e) => {
      state.orderDraft.bouquet.compositions[index].type = e.target.value;
      if (!e.target.value) state.orderDraft.bouquet.compositions[index].color = "";
      renderCompositionRows();
      renderBuilderSummary();
    });

    colorEl.addEventListener("change", (e) => {
      state.orderDraft.bouquet.compositions[index].color = e.target.value;
      renderBuilderSummary();
    });

    qtyEl.addEventListener("input", (e) => {
      const totalAllowed = Number(state.orderDraft.bouquet.count || 0);
      const currentRows = state.orderDraft.bouquet.compositions;
      const otherRowsTotal = currentRows.reduce((sum, itemRow, idx) => {
        if (idx === index) return sum;
        return sum + Number(itemRow.qty || 0);
      }, 0);

      let newQty = Number(e.target.value || 0);
      if (newQty < 0) newQty = 0;

      const maxAllowedForThisRow = Math.max(0, totalAllowed - otherRowsTotal);
      if (newQty > maxAllowedForThisRow) {
        newQty = maxAllowedForThisRow;
      }

      state.orderDraft.bouquet.compositions[index].qty = newQty;
      e.target.value = newQty;

      renderBuilderSummary();
      qs("#composition-progress-text").textContent = `${getCompositionTotal()} / ${state.orderDraft.bouquet.count || 0} ดอก`;
    });

    removeEl.addEventListener("click", () => {
      state.orderDraft.bouquet.compositions.splice(index, 1);
      renderOrderForm();
    });

    wrap.appendChild(item);
  });
}

function renderBuilderSummary() {
  const summary = calculateDraftSummary();
  const compositions = state.orderDraft.bouquet.compositions.filter(item => item.type && item.color && Number(item.qty) > 0);

  qs("#summary-count").textContent = `${summary.count || 0} ดอก`;
  qs("#summary-base-price").textContent = formatBaht(summary.basePrice);
  qs("#summary-types").textContent = getSelectedTypesText();
  qs("#summary-bouquet-color").textContent = state.orderDraft.bouquet.bouquetColor || "-";
  qs("#summary-extra-fluffy").textContent = formatBaht(summary.fluffyPrice);
  qs("#summary-extra-crown").textContent = formatBaht(summary.crownPrice);
  qs("#summary-shipping").textContent = formatBaht(summary.shippingCost);
  qs("#summary-total-price").textContent = formatBaht(summary.total);
  qs("#shipping-note").textContent = summary.shippingNote || "-";

  qs("#selected-count-text").textContent = `${state.orderDraft.bouquet.count || 0} ดอก`;
  qs("#composition-progress-text").textContent = `${getCompositionTotal()} / ${state.orderDraft.bouquet.count || 0} ดอก`;

  const miniList = qs("#summary-composition-items");
  miniList.innerHTML = "";

  if (!compositions.length) {
    miniList.innerHTML = `<div class="summary-mini-item"><span>รายการดอก</span><strong>-</strong></div>`;
  } else {
    compositions.forEach(item => {
      const row = document.createElement("div");
      row.className = "summary-mini-item";
      row.innerHTML = `<span>${item.type} / ${item.color}</span><strong>${item.qty} ดอก</strong>`;
      miniList.appendChild(row);
    });
  }
}

function renderStep3Summary() {
  const wrap = qs("#confirmation-summary");
  const summary = calculateDraftSummary();
  const compositions = state.orderDraft.bouquet.compositions.filter(item => item.type && item.color && Number(item.qty) > 0);

  wrap.innerHTML = `
    <div class="confirmation-block">
      <h4>ข้อมูลลูกค้า</h4>
      <div class="confirmation-row"><span>ชื่อ</span><strong>${state.orderDraft.customer.name || "-"}</strong></div>
      <div class="confirmation-row"><span>เบอร์</span><strong>${state.orderDraft.customer.phone || "-"}</strong></div>
      <div class="confirmation-row"><span>ที่อยู่</span><strong>${state.orderDraft.customer.address || "-"}</strong></div>
    </div>

    <div class="confirmation-block">
      <h4>รายละเอียดช่อ</h4>
      <div class="confirmation-row"><span>จำนวน</span><strong>${summary.count || 0} ดอก</strong></div>
      <div class="confirmation-row"><span>ประเภท</span><strong>${getSelectedTypesText()}</strong></div>
      <div class="confirmation-row"><span>สีช่อ</span><strong>${state.orderDraft.bouquet.bouquetColor || "-"}</strong></div>
      <div class="confirmation-row"><span>รายละเอียดเพิ่มเติม</span><strong>${state.orderDraft.bouquet.note || "-"}</strong></div>
      ${compositions.map(item => `<div class="confirmation-row"><span>${item.type} / ${item.color}</span><strong>${item.qty} ดอก</strong></div>`).join("")}
    </div>

    <div class="confirmation-block">
      <h4>ยอดชำระ</h4>
      <div class="confirmation-row"><span>ราคาดอกไม้</span><strong>${formatBaht(summary.basePrice)}</strong></div>
      <div class="confirmation-row"><span>ช่อฟู</span><strong>${formatBaht(summary.fluffyPrice)}</strong></div>
      <div class="confirmation-row"><span>มงกุฏ</span><strong>${formatBaht(summary.crownPrice)}</strong></div>
      <div class="confirmation-row"><span>ค่าส่ง</span><strong>${formatBaht(summary.shippingCost)}</strong></div>
      <div class="confirmation-row"><span>รวม</span><strong>${formatBaht(summary.total)}</strong></div>
      <div class="confirmation-row"><span>หมายเหตุค่าส่ง</span><strong>${summary.shippingNote}</strong></div>
    </div>
  `;
}

function renderPaymentInfo() {
  const qrImg = qs("#payment-qr-image");
  const qrSrc = state.app.settings.payment.qrUrl || DEFAULT_QR;

  if (qrImg) {
    qrImg.src = qrSrc;
    qrImg.onerror = () => {
      qrImg.onerror = null;
      qrImg.src = DEFAULT_QR;
    };
  }

  qs("#payment-bank-info").innerHTML = `
    <div class="confirmation-row"><span>ธนาคาร</span><strong>${state.app.settings.payment.bankName}</strong></div>
    <div class="confirmation-row"><span>ชื่อบัญชี</span><strong>${state.app.settings.payment.accountName}</strong></div>
    <div class="confirmation-row"><span>เลขบัญชี</span><strong>${state.app.settings.payment.accountNumber}</strong></div>
    <div class="confirmation-row"><span>ยอดที่ต้องชำระ</span><strong>${formatBaht(calculateDraftSummary().total)}</strong></div>
  `;
}

function setBouquetCount(count) {
  const safeCount = Math.max(1, Math.min(100, Number(count || 0)));
  state.orderDraft.bouquet.count = safeCount;

  if (getCompositionTotal() > safeCount) {
    trimCompositionsToCount(safeCount);
  }

  renderOrderForm();
}

function trimCompositionsToCount(maxCount) {
  let running = 0;
  const trimmed = [];

  for (const item of state.orderDraft.bouquet.compositions) {
    if (running >= maxCount) break;
    const remaining = maxCount - running;
    const qty = Math.min(Number(item.qty || 0), remaining);

    if (qty > 0) {
      trimmed.push({ ...item, qty });
      running += qty;
    }
  }

  state.orderDraft.bouquet.compositions = trimmed;
}

function validateStep1() {
  const name = qs("#customer-name").value.trim();
  const phone = qs("#customer-phone").value.trim();
  const address = qs("#customer-address").value.trim();

  if (!name || !phone || !address) {
    qs("#customer-form-error").textContent = "กรุณากรอกชื่อ - นามสกุล เบอร์โทร และที่อยู่จัดส่งให้ครบ";
    return false;
  }

  state.orderDraft.customer.name = sanitizeText(name);
  state.orderDraft.customer.phone = phone;
  state.orderDraft.customer.address = sanitizeText(address);
  qs("#customer-form-error").textContent = "";
  return true;
}

function validateStep2() {
  const count = Number(state.orderDraft.bouquet.count || 0);
  const bouquetColor = state.orderDraft.bouquet.bouquetColor;
  const compositionTotal = getCompositionTotal();
  const validRows = state.orderDraft.bouquet.compositions.filter(item => item.type && item.color && Number(item.qty) > 0);

  if (!count) {
    qs("#builder-error").textContent = "กรุณาเลือกจำนวนดอกไม้ก่อน";
    return false;
  }

  if (!validRows.length) {
    qs("#builder-error").textContent = "กรุณาเพิ่มรายการดอก / สีอย่างน้อย 1 รายการ";
    return false;
  }

  if (compositionTotal !== count) {
    qs("#builder-error").textContent = `จำนวนดอกที่เลือกสีรวมกันต้องเท่ากับ ${count} ดอก ตอนนี้เลือกไป ${compositionTotal} ดอก`;
    return false;
  }

  if (!bouquetColor) {
    qs("#builder-error").textContent = "กรุณาเลือกสีช่อ";
    return false;
  }

  qs("#builder-error").textContent = "";
  return true;
}

function buildOrderPayload() {
  const summary = calculateDraftSummary();

  return {
    customerName: sanitizeText(state.orderDraft.customer.name),
    phone: state.orderDraft.customer.phone,
    address: sanitizeText(state.orderDraft.customer.address),
    quantity: Number(state.orderDraft.bouquet.count || 0),
    bouquetColor: sanitizeText(state.orderDraft.bouquet.bouquetColor),
    comment: sanitizeText(state.orderDraft.bouquet.note || ""),
    flowerType: sanitizeText(getSelectedTypesText()),
    flowerColor: sanitizeText(
      state.orderDraft.bouquet.compositions
        .filter(item => item.type && item.color && Number(item.qty) > 0)
        .map(item => `${item.color}(${item.qty})`)
        .join(", ")
    ),
    totalPrice: summary.total,
    basePrice: summary.basePrice,
    fluffyPrice: summary.fluffyPrice,
    crownPrice: summary.crownPrice,
    shippingCost: summary.shippingCost,
    shippingNote: summary.shippingNote,
    paymentMethod: "โอน",
    paymentStatus: "รอตรวจสอบสลิป",
    orderStatus: "รอตรวจสอบสลิป",
    slipImageBase64: state.paymentSlipDataUrl || "",
    extras: {
      fluffy: !!state.orderDraft.bouquet.extras.fluffy,
      crown: !!state.orderDraft.bouquet.extras.crown,
      pickup: !!state.orderDraft.bouquet.extras.pickup
    },
    compositions: state.orderDraft.bouquet.compositions
      .filter(item => item.type && item.color && Number(item.qty) > 0)
      .map(item => ({
        type: sanitizeText(item.type),
        color: sanitizeText(item.color),
        qty: Number(item.qty)
      }))
  };
}

async function submitOrder() {
  const fileInput = qs("#payment-slip-input");

  if (!fileInput.files?.[0] || !state.paymentSlipDataUrl) {
    qs("#payment-error").textContent = "กรุณาอัปโหลดสลิปก่อนส่งคำสั่งซื้อ";
    return;
  }

  qs("#payment-error").textContent = "";
  setBusy(true);

  try {
    const payload = buildOrderPayload();
    const result = await apiPost("createOrder", payload);

    await syncAppFromServer(false);

    const order = state.app.orders.find(item => item.id === result.orderId);
    state.lastCreatedOrderId = result.orderId;

    if (order) {
      showSuccessPage(order);
    } else {
      showSuccessPage({
        id: result.orderId
      });
    }

    renderAdminDashboard();
    showToast("ส่งคำสั่งซื้อเรียบร้อยแล้ว");
  } catch (error) {
    qs("#payment-error").textContent = error.message || "ส่งคำสั่งซื้อไม่สำเร็จ";
  } finally {
    setBusy(false);
  }
}

function showSuccessPage(order) {
  qs("#success-order-id").textContent = order.id || "-";
  qs("#success-order-message").textContent = "โปรดเก็บเลขออเดอร์นี้ไว้สำหรับตรวจสอบสถานะ";
  setPage("page-success");
}

function renderGallery() {
  const wrap = qs("#gallery-grid");
  if (!wrap) return;

  wrap.innerHTML = "";

  const galleryItems = [...(state.app.gallery || [])]
    .filter(item => {
      if (typeof item === "string") return true;
      return String(item.isActive).toUpperCase() !== "FALSE";
    })
    .sort((a, b) => {
      const aOrder = typeof a === "string" ? 0 : Number(a.sortOrder || 0);
      const bOrder = typeof b === "string" ? 0 : Number(b.sortOrder || 0);
      return aOrder - bOrder;
    });

  if (!galleryItems.length) {
    wrap.innerHTML = `<div class="empty-state">ยังไม่มีรูปในแกลเลอรี่</div>`;
    return;
  }

  galleryItems.forEach((item, index) => {
    const src = typeof item === "string" ? item : item.imageUrl;
    const title = typeof item === "string" ? "" : (item.title || "");
    const safeAlt = title || `Rose Atelier Gallery ${index + 1}`;

    const card = document.createElement("figure");
    card.className = "gallery-item";
    card.innerHTML = `
      <img src="${src}" alt="${safeAlt}" loading="lazy" />
      ${title ? `<figcaption>${title}</figcaption>` : ""}
    `;

    wrap.appendChild(card);
  });
}

function getCustomerStatusText(order) {
  if (order.status === "จัดส่งแล้ว(ไปรษณี)") {
    return order.trackingNumber
      ? `จัดส่งแล้ว(ไปรษณี) - ${order.trackingNumber}`
      : "จัดส่งแล้ว(ไปรษณี)";
  }
  return order.status;
}

function renderStatusResult(order) {
  const wrap = qs("#status-result");

  if (!order) {
    wrap.classList.remove("hidden");
    wrap.innerHTML = `<div class="empty-state">ไม่พบเลขออเดอร์นี้ กรุณาตรวจสอบอีกครั้ง</div>`;
    return;
  }

  const compositions = order.bouquet.compositions
    .map(item => `<div class="confirmation-row"><span>${item.type} / ${item.color}</span><strong>${item.qty} ดอก</strong></div>`)
    .join("");

  wrap.classList.remove("hidden");
  wrap.innerHTML = `
    <div class="status-current ${order.status === "จัดส่งแล้ว(ไปรษณี)" ? "status-postal" : order.status === "จัดส่งแล้ว" ? "status-ok" : ""}">
      สถานะ: ${getCustomerStatusText(order)}
    </div>

    <div class="status-info-grid">
      <div class="confirmation-block">
        <h4>ข้อมูลคำสั่งซื้อ</h4>
        <div class="confirmation-row"><span>เลขออเดอร์</span><strong>${order.id}</strong></div>
        <div class="confirmation-row"><span>วันที่สั่งซื้อ</span><strong>${formatDateTime(order.createdAt)}</strong></div>
        <div class="confirmation-row"><span>ชื่อ</span><strong>${order.customer.name}</strong></div>
        <div class="confirmation-row"><span>เบอร์</span><strong>${order.customer.phone}</strong></div>
        <div class="confirmation-row"><span>ที่อยู่</span><strong>${order.customer.address}</strong></div>
      </div>

      <div class="confirmation-block">
        <h4>รายละเอียดช่อ</h4>
        <div class="confirmation-row"><span>จำนวน</span><strong>${order.bouquet.count} ดอก</strong></div>
        <div class="confirmation-row"><span>สีช่อ</span><strong>${order.bouquet.bouquetColor}</strong></div>
        <div class="confirmation-row"><span>หมายเหตุ</span><strong>${order.bouquet.note || "-"}</strong></div>
        ${compositions}
      </div>

      <div class="confirmation-block">
        <h4>ยอดและการจัดส่ง</h4>
        <div class="confirmation-row"><span>ยอดรวม</span><strong>${formatBaht(order.pricing.total)}</strong></div>
        <div class="confirmation-row"><span>ค่าส่ง</span><strong>${formatBaht(order.pricing.shippingCost)}</strong></div>
        <div class="confirmation-row"><span>หมายเหตุค่าส่ง</span><strong>${order.pricing.shippingNote || "-"}</strong></div>
      </div>
    </div>
  `;
}

function getSalesCostProfitSummary() {
  const orders = state.app.orders || [];
  const costs = state.app.costs || [];

  const totalSales = orders.reduce((sum, order) => sum + Number(order.pricing?.total || 0), 0);
  const totalCosts = costs.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const dailySales = orders
    .filter(order => matchesToday(order.createdAt))
    .reduce((sum, order) => sum + Number(order.pricing?.total || 0), 0);

  const monthlySales = orders
    .filter(order => matchesMonth(order.createdAt))
    .reduce((sum, order) => sum + Number(order.pricing?.total || 0), 0);

  const yearlySales = orders
    .filter(order => matchesYear(order.createdAt))
    .reduce((sum, order) => sum + Number(order.pricing?.total || 0), 0);

  const dailyCost = costs
    .filter(item => matchesToday(item.date))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const monthlyCost = costs
    .filter(item => matchesMonth(item.date))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const yearlyCost = costs
    .filter(item => matchesYear(item.date))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    totalSales,
    totalCosts,
    totalProfit: totalSales - totalCosts,
    dailySales,
    monthlySales,
    yearlySales,
    dailyCost,
    monthlyCost,
    yearlyCost,
    dailyProfit: dailySales - dailyCost,
    monthlyProfit: monthlySales - monthlyCost,
    yearlyProfit: yearlySales - yearlyCost
  };
}

function renderAdminKpis() {
  const orders = state.app.orders;
  const pendingSlip = orders.filter(order => order.status === "รอตรวจสอบสลิป").length;
  const arranging = orders.filter(order => order.status === "กำลังจัดช่อ").length;
  const report = getSalesCostProfitSummary();

  qs("#kpi-total-sales").textContent = formatBaht(report.totalSales);
  qs("#kpi-total-orders").textContent = orders.length.toLocaleString("th-TH");
  qs("#kpi-pending-slip").textContent = pendingSlip.toLocaleString("th-TH");
  qs("#kpi-arranging").textContent = arranging.toLocaleString("th-TH");

  qs("#kpi-sales-daily").textContent = formatBaht(report.dailySales);
  qs("#kpi-sales-monthly").textContent = formatBaht(report.monthlySales);
  qs("#kpi-sales-yearly").textContent = formatBaht(report.yearlySales);
  qs("#kpi-net-profit").textContent = formatBaht(report.totalProfit);

  qs("#report-daily-sales").textContent = formatBaht(report.dailySales);
  qs("#report-daily-cost").textContent = formatBaht(report.dailyCost);
  qs("#report-daily-profit").textContent = formatBaht(report.dailyProfit);

  qs("#report-monthly-sales").textContent = formatBaht(report.monthlySales);
  qs("#report-monthly-cost").textContent = formatBaht(report.monthlyCost);
  qs("#report-monthly-profit").textContent = formatBaht(report.monthlyProfit);

  qs("#report-yearly-sales").textContent = formatBaht(report.yearlySales);
  qs("#report-yearly-cost").textContent = formatBaht(report.yearlyCost);
  qs("#report-yearly-profit").textContent = formatBaht(report.yearlyProfit);
}

function renderAdminSettings() {
  const settings = state.app.settings;
  qs("#setting-bank-name").value = settings.payment.bankName;
  qs("#setting-account-name").value = settings.payment.accountName;
  qs("#setting-account-number").value = settings.payment.accountNumber;
  qs("#setting-fluffy-price").value = settings.fluffyPrice;
  qs("#setting-crown-price").value = settings.crownPrice;
  qs("#setting-flower-colors").value = settings.flowerColors.join(", ");
  qs("#setting-bouquet-colors").value = settings.bouquetColors.join(", ");
  qs("#setting-shipping-1-10").value = settings.shipping.range1to10;
  qs("#setting-shipping-11-19").value = settings.shipping.range11to19;
  qs("#setting-shipping-20-30").value = settings.shipping.range20to30;
  qs("#setting-shipping-31-40").value = settings.shipping.range31to40;
  qs("#setting-shipping-41-50").value = settings.shipping.range41to50;
  qs("#setting-qr-file").value = "";
}

function renderAdminGallery() {
  const wrap = qs("#admin-gallery-grid");
  if (!wrap) return;

  wrap.innerHTML = "";

  if (!state.app.gallery.length) {
    wrap.innerHTML = `<div class="empty-state">ยังไม่มีรูปในแกลเลอรี่</div>`;
    return;
  }

  const sortedGallery = [...state.app.gallery].sort((a, b) => {
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });

  sortedGallery.forEach((item, index) => {
    const src = item.imageUrl || "";
    const galleryId = item.id || `gallery-${index + 1}`;

    const card = document.createElement("div");
    card.className = "admin-gallery-item";
    card.innerHTML = `
      <img src="${src}" alt="gallery-${index}" loading="lazy" />
      <div class="admin-gallery-item__footer">
        <button class="delete-row-btn" type="button">ลบรูปนี้</button>
      </div>
    `;

    card.querySelector(".delete-row-btn").addEventListener("click", async () => {
      const confirmed = window.confirm("ต้องการลบรูปนี้ใช่หรือไม่");
      if (!confirmed) return;

      try {
        await apiPost("deleteGalleryItem", { galleryId });
        await syncAppFromServer(false);
        renderGallery();
        renderAdminGallery();
        showToast("ลบรูปเรียบร้อยแล้ว");
      } catch (error) {
        alert(error.message || "ลบรูปไม่สำเร็จ");
      }
    });

    wrap.appendChild(card);
  });
}

function renderAdminCosts() {
  const tbody = qs("#admin-costs-body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!state.app.costs.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">ยังไม่มีรายการต้นทุน</div></td></tr>`;
    return;
  }

  state.app.costs.forEach((cost) => {
    const tr = document.createElement("tr");
    tr.className = "cost-edit-row";

    tr.innerHTML = `
      <td><input type="text" value="${cost.name || ""}" class="cost-name-input" /></td>
      <td><input type="number" value="${cost.amount || 0}" class="cost-amount-input" /></td>
      <td><input type="date" value="${cost.date || ""}" class="cost-date-input" /></td>
      <td><textarea rows="2" class="cost-note-input">${cost.note || ""}</textarea></td>
      <td>
        <div class="inline-action-group">
          <button type="button" class="inline-btn inline-btn--save">บันทึก</button>
          <button type="button" class="inline-btn inline-btn--delete">ลบ</button>
        </div>
      </td>
    `;

    const nameInput = tr.querySelector(".cost-name-input");
    const amountInput = tr.querySelector(".cost-amount-input");
    const dateInput = tr.querySelector(".cost-date-input");
    const noteInput = tr.querySelector(".cost-note-input");
    const saveBtn = tr.querySelector(".inline-btn--save");
    const deleteBtn = tr.querySelector(".inline-btn--delete");

    saveBtn.addEventListener("click", async () => {
      try {
        await apiPost("updateCost", {
          costId: cost.id,
          name: sanitizeText(nameInput.value.trim()),
          amount: Number(amountInput.value || 0),
          date: dateInput.value || "",
          note: sanitizeText(noteInput.value.trim())
        });
        await syncAppFromServer(false);
        renderAdminDashboard();
        showToast("บันทึกเรียบร้อยแล้ว");
      } catch (error) {
        alert(error.message || "บันทึกต้นทุนไม่สำเร็จ");
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const confirmed = window.confirm("ต้องการลบรายการต้นทุนนี้ใช่หรือไม่");
      if (!confirmed) return;

      try {
        await apiPost("deleteCost", { costId: cost.id });
        await syncAppFromServer(false);
        renderAdminDashboard();
        showToast("ลบต้นทุนเรียบร้อยแล้ว");
      } catch (error) {
        alert(error.message || "ลบต้นทุนไม่สำเร็จ");
      }
    });

    tbody.appendChild(tr);
  });
}

async function addCostItem() {
  const name = qs("#cost-name")?.value.trim() || "";
  const amount = Number(qs("#cost-amount")?.value || 0);
  const date = qs("#cost-date")?.value || "";
  const note = qs("#cost-note")?.value.trim() || "";

  if (!name || !amount || !date) {
    alert("กรุณากรอกชื่อรายการต้นทุน จำนวนเงิน และวันที่ซื้อให้ครบ");
    return;
  }

  try {
    await apiPost("addCost", {
      name: sanitizeText(name),
      amount,
      date,
      note: sanitizeText(note)
    });

    qs("#cost-name").value = "";
    qs("#cost-amount").value = "";
    qs("#cost-date").value = "";
    qs("#cost-note").value = "";

    await syncAppFromServer(false);
    renderAdminDashboard();
    showToast("เพิ่มต้นทุนเรียบร้อยแล้ว");
  } catch (error) {
    alert(error.message || "เพิ่มต้นทุนไม่สำเร็จ");
  }
}

function getOrderTypesDisplay(order) {
  return [...new Set(order.bouquet.compositions.map(item => item.type))].join(", ");
}

function getOrderFlowerColorsDisplay(order) {
  return order.bouquet.compositions.map(item => `${item.color}(${item.qty})`).join(", ");
}

function renderAdminOrders() {
  const tbody = qs("#admin-orders-body");
  tbody.innerHTML = "";

  if (!state.app.orders.length) {
    tbody.innerHTML = `<tr><td colspan="13"><div class="empty-state">ยังไม่มีคำสั่งซื้อ</div></td></tr>`;
    return;
  }

  state.app.orders.forEach((order) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${order.id}</td>
      <td>${order.customer.name}</td>
      <td>${order.customer.phone}</td>
      <td>${order.bouquet.count}</td>
      <td>${getOrderTypesDisplay(order)}</td>
      <td>${getOrderFlowerColorsDisplay(order)}</td>
      <td>${order.bouquet.bouquetColor}</td>
      <td>${formatBaht(order.pricing.total)}</td>
      <td>
        <select class="admin-status-select">
          ${ORDER_STATUSES.map(status => `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
      <td>
        <input class="admin-tracking-input" type="text" value="${order.trackingNumber || ""}" placeholder="กรอกเลขแท็ค" ${order.status !== "จัดส่งแล้ว(ไปรษณี)" ? "disabled" : ""} />
      </td>
      <td>
        ${
          order.payment.slipImage
            ? `<button class="slip-thumb-btn" type="button">ดูสลิป</button>`
            : `<span>-</span>`
        }
      </td>
      <td>
        <textarea class="admin-note-input" rows="3">${order.bouquet.note || ""}</textarea>
      </td>
      <td>
        <div class="admin-action-stack">
          <button class="save-row-btn" type="button">บันทึก</button>
          <button class="delete-row-btn" type="button">ลบ</button>
        </div>
      </td>
    `;

    const statusSelect = tr.querySelector(".admin-status-select");
    const trackingInput = tr.querySelector(".admin-tracking-input");
    const noteInput = tr.querySelector(".admin-note-input");
    const saveBtn = tr.querySelector(".save-row-btn");
    const deleteBtn = tr.querySelector(".delete-row-btn");
    const slipBtn = tr.querySelector(".slip-thumb-btn");

    statusSelect.addEventListener("change", () => {
      trackingInput.disabled = statusSelect.value !== "จัดส่งแล้ว(ไปรษณี)";
      if (trackingInput.disabled) trackingInput.value = "";
    });

    saveBtn.addEventListener("click", async () => {
      try {
        await apiPost("updateStatus", {
          orderId: order.id,
          orderStatus: statusSelect.value,
          trackingNumber: statusSelect.value === "จัดส่งแล้ว(ไปรษณี)" ? trackingInput.value.trim() : "",
          comment: sanitizeText(noteInput.value.trim())
        });

        await syncAppFromServer(false);
        renderAdminDashboard();
        showToast("บันทึกเรียบร้อยแล้ว");
      } catch (error) {
        alert(error.message || "บันทึกออเดอร์ไม่สำเร็จ");
      }
    });

    deleteBtn.addEventListener("click", async () => {
      const confirmed = window.confirm(`ต้องการลบออเดอร์ ${order.id} ใช่หรือไม่`);
      if (!confirmed) return;

      try {
        await apiPost("deleteOrder", { orderId: order.id });
        await syncAppFromServer(false);
        renderAdminDashboard();
        showToast("ลบออเดอร์เรียบร้อยแล้ว");
      } catch (error) {
        alert(error.message || "ลบออเดอร์ไม่สำเร็จ");
      }
    });

    if (slipBtn) {
      slipBtn.addEventListener("click", () => openSlipModal(order.payment.slipImage));
    }

    tbody.appendChild(tr);
  });
}

function renderAdminDashboard() {
  if (!isAdminLoggedIn()) return;
  renderAdminKpis();
  renderAdminSettings();
  renderAdminGallery();
  renderAdminCosts();
  renderAdminOrders();
}

function openSlipModal(src) {
  qs("#slip-modal-image").src = src;
  qs("#slip-modal").classList.remove("hidden");
  qs("#slip-modal").setAttribute("aria-hidden", "false");
  updateBodyLockState();
}

function closeSlipModal() {
  qs("#slip-modal").classList.add("hidden");
  qs("#slip-modal").setAttribute("aria-hidden", "true");
  qs("#slip-modal-image").src = "";
  updateBodyLockState();
}

async function saveSettingsFromAdmin() {
  const settings = {
    fluffyPrice: Number(qs("#setting-fluffy-price").value || 0),
    crownPrice: Number(qs("#setting-crown-price").value || 0),
    shipping: {
      range1to10: Number(qs("#setting-shipping-1-10").value || 0),
      range11to19: Number(qs("#setting-shipping-11-19").value || 0),
      range20to30: Number(qs("#setting-shipping-20-30").value || 0),
      range31to40: Number(qs("#setting-shipping-31-40").value || 0),
      range41to50: Number(qs("#setting-shipping-41-50").value || 0)
    },
    payment: {
      bankName: sanitizeText(qs("#setting-bank-name").value.trim()),
      accountName: sanitizeText(qs("#setting-account-name").value.trim()),
      accountNumber: qs("#setting-account-number").value.trim(),
      qrUrl: state.pendingQrUpload || state.app.settings.payment.qrUrl || DEFAULT_QR
    },
    flowerColors: qs("#setting-flower-colors").value
      .split(",")
      .map(item => sanitizeText(item.trim()))
      .filter(Boolean),
    bouquetColors: qs("#setting-bouquet-colors").value
      .split(",")
      .map(item => sanitizeText(item.trim()))
      .filter(Boolean)
  };

  try {
    await apiPost("saveSettings", settings);
    state.pendingQrUpload = "";
    await syncAppFromServer(false);
    renderGallery();
    renderAdminDashboard();
    showToast("บันทึกเรียบร้อยแล้ว");
  } catch (error) {
    alert(error.message || "บันทึกการตั้งค่าไม่สำเร็จ");
  }
}

async function addGalleryImageFromPending() {
  if (!state.pendingGalleryUpload) {
    alert("กรุณาเลือกรูปก่อน");
    return;
  }

  try {
    await apiPost("addGallery", {
      title: "",
      imageBase64: state.pendingGalleryUpload,
      sortOrder: state.app.gallery.length + 1
    });

    state.pendingGalleryUpload = "";
    qs("#gallery-upload-input").value = "";

    await syncAppFromServer(false);
    renderGallery();
    renderAdminGallery();
    showToast("เพิ่มรูปเข้าระบบเรียบร้อยแล้ว");
  } catch (error) {
    alert(error.message || "เพิ่มรูปไม่สำเร็จ");
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function validateImageFileToDataUrl(file) {
  if (!file) {
    throw new Error("ไม่พบไฟล์รูป");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ");
  }

  const dataUrl = await readFileAsDataURL(file);

  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    throw new Error("แปลงไฟล์รูปไม่สำเร็จ");
  }

  if (dataUrl.length < 1000) {
    throw new Error("ไฟล์รูปผิดปกติหรือว่างเปล่า");
  }

  return dataUrl;
}

function setupSlipDropzone() {
  const dropzone = qs("#payment-slip-dropzone");
  const input = qs("#payment-slip-input");
  if (!dropzone || !input) return;

  ["dragenter", "dragover"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", async (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    try {
      state.paymentSlipDataUrl = await validateImageFileToDataUrl(file);
      qs("#payment-slip-name").textContent = file.name;

      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;

      qs("#payment-error").textContent = "";
    } catch (error) {
      state.paymentSlipDataUrl = "";
      qs("#payment-slip-name").textContent = "ยังไม่ได้เลือกไฟล์";
      qs("#payment-error").textContent = error.message || "อัปโหลดรูปสลิปไม่สำเร็จ";
    }
  });
}

function bindResponsiveHelpers() {
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) {
      closeMobileNav();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMobileNav();
      closeSlipModal();
    }
  });

  document.addEventListener("click", (e) => {
    const header = qs(".site-header");
    const nav = qs("#mobile-nav");
    const toggle = qs("#menu-toggle");

    if (!header || !nav || !toggle) return;
    if (nav.classList.contains("hidden")) return;

    const isInsideHeader = header.contains(e.target);
    if (!isInsideHeader) {
      closeMobileNav();
    }
  });
}

function bindGlobalEvents() {
  qs("#go-home").addEventListener("click", () => setPage("page-home"));
  qs("#start-order-home").addEventListener("click", () => beginNewOrder(true));

  qsa("[data-nav-target]").forEach(btn => {
    btn.addEventListener("click", () => navigateToSection(btn.dataset.navTarget));
  });

  qs("#menu-toggle").addEventListener("click", toggleMobileNav);

  qs("#back-home-from-order").addEventListener("click", () => setPage("page-home"));
  qs("#cancel-order-btn").addEventListener("click", () => setPage("page-home"));
  qs("#back-home-from-success").addEventListener("click", () => setPage("page-home"));
  qs("#go-home-from-success-2").addEventListener("click", () => setPage("page-home"));
  qs("#back-home-from-status").addEventListener("click", () => setPage("page-home"));
  qs("#back-home-from-admin-login").addEventListener("click", () => setPage("page-home"));

  qs("#customer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    state.orderDraft.step = 2;
    renderOrderForm();
  });

  qs("#back-to-step-1").addEventListener("click", () => {
    state.orderDraft.step = 1;
    renderOrderForm();
  });

  qs("#go-to-step-3").addEventListener("click", () => {
    state.orderDraft.bouquet.note = sanitizeText(qs("#order-note").value.trim());
    state.orderDraft.bouquet.extras.fluffy = qs("#extra-fluffy").checked;
    state.orderDraft.bouquet.extras.crown = qs("#extra-crown").checked;
    state.orderDraft.bouquet.extras.pickup = qs("#extra-pickup").checked;

    if (!validateStep2()) return;
    state.orderDraft.step = 3;
    renderOrderForm();
  });

  qs("#back-to-step-2").addEventListener("click", () => {
    qs("#payment-section").classList.add("hidden");
    state.orderDraft.step = 2;
    renderOrderForm();
  });

  qs("#show-payment-section").addEventListener("click", () => {
    qs("#payment-section").classList.remove("hidden");
  });

  qs("#submit-order-btn").addEventListener("click", submitOrder);

  qs("#apply-custom-count").addEventListener("click", () => {
    const value = Number(qs("#custom-count").value || 0);
    if (!value || value < 1 || value > 100) {
      qs("#builder-error").textContent = "กรุณากรอกจำนวนดอกระหว่าง 1 - 100";
      return;
    }
    qs("#builder-error").textContent = "";
    setBouquetCount(value);
  });

  qs("#add-composition-row").addEventListener("click", () => {
    state.orderDraft.bouquet.compositions.push({
      type: "",
      color: "",
      qty: 1
    });
    renderOrderForm();
  });

  qs("#extra-fluffy").addEventListener("change", () => {
    state.orderDraft.bouquet.extras.fluffy = qs("#extra-fluffy").checked;
    renderBuilderSummary();
  });

  qs("#extra-crown").addEventListener("change", () => {
    state.orderDraft.bouquet.extras.crown = qs("#extra-crown").checked;
    renderBuilderSummary();
  });

  qs("#extra-pickup").addEventListener("change", () => {
    state.orderDraft.bouquet.extras.pickup = qs("#extra-pickup").checked;
    renderBuilderSummary();
  });

  qs("#order-note").addEventListener("input", () => {
    qs("#order-note").value = sanitizeText(qs("#order-note").value);
    state.orderDraft.bouquet.note = qs("#order-note").value.trim();
  });

  qs("#payment-slip-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      state.paymentSlipDataUrl = "";
      qs("#payment-slip-name").textContent = "ยังไม่ได้เลือกไฟล์";
      return;
    }

    try {
      state.paymentSlipDataUrl = await validateImageFileToDataUrl(file);
      qs("#payment-slip-name").textContent = file.name;
      qs("#payment-error").textContent = "";
    } catch (error) {
      state.paymentSlipDataUrl = "";
      e.target.value = "";
      qs("#payment-slip-name").textContent = "ยังไม่ได้เลือกไฟล์";
      qs("#payment-error").textContent = error.message || "อัปโหลดรูปสลิปไม่สำเร็จ";
    }
  });

  qs("#copy-order-id").addEventListener("click", async () => {
    const text = qs("#success-order-id").textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      showToast("คัดลอกเลขออเดอร์แล้ว");
    } catch {
      alert("คัดลอกไม่สำเร็จ กรุณาคัดลอกด้วยตนเอง");
    }
  });

  qs("#go-status-from-success").addEventListener("click", async () => {
    qs("#status-order-id-input").value = state.lastCreatedOrderId || "";
    setPage("page-status");

    if (!state.lastCreatedOrderId) {
      renderStatusResult(null);
      return;
    }

    try {
      const result = await apiGet("getOrderByOrderId", { orderId: state.lastCreatedOrderId });
      renderStatusResult(normalizeOrder(result.data));
    } catch {
      renderStatusResult(null);
    }
  });

  qs("#search-order-status").addEventListener("click", async () => {
    const id = qs("#status-order-id-input").value.trim();
    if (!id) {
      qs("#status-result").classList.remove("hidden");
      qs("#status-result").innerHTML = `<div class="empty-state">กรุณากรอกเลขออเดอร์</div>`;
      return;
    }

    try {
      const result = await apiGet("getOrderByOrderId", { orderId: id });
      renderStatusResult(normalizeOrder(result.data));
    } catch {
      renderStatusResult(null);
    }
  });

  qs("#admin-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = qs("#admin-id").value.trim();
    const password = qs("#admin-password").value.trim();

    if (id !== ADMIN_ID || password !== ADMIN_PASSWORD) {
      qs("#admin-login-error").textContent = "ID หรือ Password ไม่ถูกต้อง";
      return;
    }

    qs("#admin-login-error").textContent = "";
    setAdminLoggedIn(true);
    setPage("page-admin");
  });

  qs("#admin-logout-btn").addEventListener("click", () => {
    setAdminLoggedIn(false);
    setPage("page-home");
  });

  qs("#save-settings-btn").addEventListener("click", saveSettingsFromAdmin);

  qs("#gallery-upload-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      state.pendingGalleryUpload = "";
      return;
    }

    try {
      state.pendingGalleryUpload = await validateImageFileToDataUrl(file);
      showToast("เลือกรูปแกลเลอรี่แล้ว");
    } catch (error) {
      e.target.value = "";
      state.pendingGalleryUpload = "";
      alert(error.message || "เลือกรูปไม่สำเร็จ");
    }
  });

  qs("#setting-qr-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      state.pendingQrUpload = "";
      return;
    }

    try {
      state.pendingQrUpload = await validateImageFileToDataUrl(file);
      showToast("เลือกรูป QR Code แล้ว");
    } catch (error) {
      e.target.value = "";
      state.pendingQrUpload = "";
      alert(error.message || "เลือกรูป QR Code ไม่สำเร็จ");
    }
  });

  qs("#add-gallery-image-btn").addEventListener("click", addGalleryImageFromPending);
  qs("#add-cost-btn")?.addEventListener("click", addCostItem);

  qs("#close-slip-modal").addEventListener("click", closeSlipModal);
  qsa("[data-close-modal]").forEach(el => el.addEventListener("click", closeSlipModal));

  setupSlipDropzone();
  bindResponsiveHelpers();

  attachProfanityFilter("#customer-name");
  attachProfanityFilter("#customer-address");
  attachProfanityFilter("#order-note");
}

function initLoading() {
  const loadingScreen = qs("#loading-screen");
  const hideLoadingScreen = () => {
    if (!loadingScreen) return;
    loadingScreen.classList.add("is-hidden");
    setTimeout(() => {
      loadingScreen.remove();
    }, 500);
  };

  window.addEventListener("load", () => {
    setTimeout(hideLoadingScreen, 1100);
  });
}

async function boot() {
  state.app = loadCache();
  state.orderDraft = getDefaultDraft();

  bindGlobalEvents();
  renderGallery();
  initLoading();

  await syncAppFromServer(false);
  renderGallery();

  if (isAdminLoggedIn()) {
    renderAdminDashboard();
  }

  setPage("page-home");
  updateBodyLockState();
}

document.addEventListener("DOMContentLoaded", boot);