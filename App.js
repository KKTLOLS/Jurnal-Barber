```javascript
const STORAGE = "jurnal-barber-v1";

const defaultData = {
  services: [
    { id: 1, name: "Fade", price: 80 },
    { id: 2, name: "Tuns clasic", price: 70 },
    { id: 3, name: "Tuns + barbă", price: 100 }
  ],
  entries: [],
  rule: {
    threshold: 200,
    fixedMine: 100
  }
};

let data = loadData();
let selectedDate = new Date();
let calendarDate = new Date();
let editingEntryId = null;
let selectedPeriod = "week";

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE);
    return saved ? JSON.parse(saved) : structuredClone(defaultData);
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE, JSON.stringify(data));
}

function money(value) {
  return `${Number(value || 0).toFixed(0)} lei`;
}

function dateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return dateKey(new Date());
}

function formatDate(key) {
  const [y, m, d] = key.split("-");
  const date = new Date(y, m - 1, d);

  return date.toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

function split(price) {
  const threshold = Number(data.rule.threshold);
  const fixedMine = Number(data.rule.fixedMine);

  let mine;
  let boss;

  if (price <= threshold) {
    mine = Math.min(fixedMine, price);
    boss = Math.max(0, price - mine);
  } else {
    mine = price / 2;
    boss = price / 2;
  }

  return {
    mine,
    boss
  };
}

function calculateTotals(entries) {
  let cuts = 0;
  let tips = 0;
  let mine = 0;
  let boss = 0;

  entries.forEach(entry => {
    const price = Number(entry.price) || 0;
    const tip = Number(entry.tips) || 0;
    const result = split(price);

    cuts += price;
    tips += tip;
    mine += result.mine + tip;
    boss += result.boss;
  });

  return {
    cuts,
    tips,
    total: cuts + tips,
    mine,
    boss
  };
}


/* NAVIGAȚIE */

document.querySelectorAll(".nav-btn").forEach(button => {
  button.addEventListener("click", () => {
    showScreen(button.dataset.screen);
  });
});

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });

  document.getElementById(screenId).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.screen === screenId
    );
  });

  if (screenId === "homeScreen") renderHome();
  if (screenId === "calendarScreen") renderCalendar();
  if (screenId === "historyScreen") renderHistory();
  if (screenId === "profileScreen") renderProfile();
}


/* HOME */

function renderHome() {
  const key = dateKey(selectedDate);

  const entries = data.entries.filter(
    entry => entry.date === key
  );

  const totals = calculateTotals(entries);

  document.getElementById("todayCuts").textContent = money(totals.cuts);
  document.getElementById("todayTips").textContent = money(totals.tips);
  document.getElementById("todayTotal").textContent = money(totals.total);

  document.getElementById("todayMine").textContent = money(totals.mine);
  document.getElementById("todayBoss").textContent = money(totals.boss);

  const container = document.getElementById("todayEntries");
  container.innerHTML = "";

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty">
        Niciun tuns în această zi.
      </div>
    `;
    return;
  }

  entries
    .slice()
    .reverse()
    .forEach(entry => {
      const result = split(Number(entry.price));
      const item = document.createElement("div");

      item.className = "entry";

      item.innerHTML = `
        <div class="entry-left">
          <strong>${escapeHtml(entry.service)}</strong>
          <small>
            ${money(entry.price)}
            ${entry.tips ? ` + ${money(entry.tips)} tips` : ""}
          </small>
        </div>

        <div class="entry-right">
          <strong>${money(Number(entry.price) + Number(entry.tips || 0))}</strong>
          <small>Tu: ${money(result.mine + Number(entry.tips || 0))}</small>
        </div>
      `;

      item.addEventListener("click", () => {
        openCutModal(entry.id);
      });

      container.appendChild(item);
    });
}


/* ADAUGĂ / EDITEAZĂ TUNS */

document.getElementById("addCutBtn").addEventListener("click", () => {
  openCutModal();
});

function populateServiceSelect() {
  const select = document.getElementById("serviceSelect");

  select.innerHTML = "";

  data.services.forEach(service => {
    const option = document.createElement("option");

    option.value = service.id;
    option.textContent = `${service.name} — ${money(service.price)}`;

    select.appendChild(option);
  });
}

function openCutModal(entryId = null) {
  editingEntryId = entryId;

  populateServiceSelect();

  const modal = document.getElementById("cutModal");
  const title = document.getElementById("cutModalTitle");
  const priceInput = document.getElementById("priceInput");
  const tipsInput = document.getElementById("tipsInput");
  const serviceSelect = document.getElementById("serviceSelect");

  if (entryId) {
    const entry = data.entries.find(e => e.id === entryId);

    if (!entry) return;

    title.textContent = "Editează tuns";

    priceInput.value = entry.price;
    tipsInput.value = entry.tips || "";

    const service = data.services.find(
      s => s.name === entry.service
    );

    if (service) {
      serviceSelect.value = service.id;
    }
  } else {
    title.textContent = "Adaugă tuns";

    const service = data.services[0];

    if (service) {
      serviceSelect.value = service.id;
      priceInput.value = service.price;
    } else {
      priceInput.value = "";
    }

    tipsInput.value = "";
  }

  modal.classList.add("show");
}

document.getElementById("closeCutModal").addEventListener("click", closeCutModal);

document.getElementById("cutModal").addEventListener("click", event => {
  if (event.target.id === "cutModal") {
    closeCutModal();
  }
});

function closeCutModal() {
  document.getElementById("cutModal").classList.remove("show");
  editingEntryId = null;
}

document.getElementById("serviceSelect").addEventListener("change", event => {
  if (editingEntryId) return;

  const service = data.services.find(
    s => String(s.id) === String(event.target.value)
  );

  if (service) {
    document.getElementById("priceInput").value = service.price;
  }
});

document.getElementById("saveCutBtn").addEventListener("click", () => {
  const serviceSelect = document.getElementById("serviceSelect");
  const priceInput = document.getElementById("priceInput");
  const tipsInput = document.getElementById("tipsInput");

  const service = data.services.find(
    s => String(s.id) === String(serviceSelect.value)
  );

  const price = Number(priceInput.value);
  const tips = Number(tipsInput.value) || 0;

  if (!service || !price || price < 0) {
    alert("Completează un preț valid.");
    return;
  }

  if (editingEntryId) {
    const entry = data.entries.find(
      e => e.id === editingEntryId
    );

    if (entry) {
      entry.service = service.name;
      entry.price = price;
      entry.tips = tips;
    }
  } else {
    data.entries.push({
      id: Date.now(),
      date: dateKey(selectedDate),
      service: service.name,
      price,
      tips
    });
  }

  saveData();
  closeCutModal();
  renderHome();
});


/* CALENDAR */

document.getElementById("prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  document.getElementById("calendarMonth").textContent =
    new Date(year, month, 1).toLocaleDateString("ro-RO", {
      month: "long",
      year: "numeric"
    });

  const grid = document.getElementById("calendarGrid");

  grid.innerHTML = "";

  const names = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

  names.forEach(name => {
    const el = document.createElement("div");
    el.className = "calendar-day-name";
    el.textContent = name;
    grid.appendChild(el);
  });

  const firstDay = new Date(year, month, 1);
  let offset = firstDay.getDay();

  offset = offset === 0 ? 6 : offset - 1;

  for (let i = 0; i < offset; i++) {
    grid.appendChild(document.createElement("div"));
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(new Date(year, month, day));

    const entries = data.entries.filter(
      entry => entry.date === key
    );

    const totals = calculateTotals(entries);

    const el = document.createElement("div");

    el.className = "calendar-day";

    if (entries.length) {
      el.classList.add("has-money");
    }

    if (key === todayKey()) {
      el.classList.add("today");
    }

    el.innerHTML = `
      ${day}
      ${
        entries.length
          ? `<span class="money">${money(totals.total)}</span>`
          : ""
      }
    `;

    el.addEventListener("click", () => {
      selectedDate = new Date(year, month, day);
      showScreen("homeScreen");
    });

    grid.appendChild(el);
  }

  renderPeriodStats();
}


/* SĂPTĂMÂNĂ / LUNĂ */

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => {
      t.classList.remove("active");
    });

    tab.classList.add("active");

    selectedPeriod = tab.dataset.period;

    renderPeriodStats();
  });
});

function renderPeriodStats() {
  let entries = [];

  if (selectedPeriod === "month") {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    entries = data.entries.filter(entry => {
      const d = new Date(entry.date);

      return (
        d.getFullYear() === year &&
        d.getMonth() === month
      );
    });
  } else {
    const current = new Date();

    const day = current.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;

    const monday = new Date(current);
    monday.setDate(current.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    entries = data.entries.filter(entry => {
      const d = new Date(entry.date);

      return d >= monday && d <= sunday;
    });
  }

  const totals = calculateTotals(entries);

  document.getElementById("periodCuts").textContent = money(totals.cuts);
  document.getElementById("periodTips").textContent = money(totals.tips);
  document.getElementById("periodMine").textContent = money(totals.mine);
  document.getElementById("periodBoss").textContent = money(totals.boss);
}


/* ISTORIC */

function renderHistory() {
  const container = document.getElementById("historyEntries");

  container.innerHTML = "";

  if (!data.entries.length) {
    container.innerHTML = `
      <div class="empty">
        Nu ai încă încasări.
      </div>
    `;
    return;
  }

  const grouped = {};

  data.entries.forEach(entry => {
    if (!grouped[entry.date]) {
      grouped[entry.date] = [];
    }

    grouped[entry.date].push(entry);
  });

  Object.keys(grouped)
    .sort()
    .reverse()
    .forEach(date => {
      const entries = grouped[date];
      const totals = calculateTotals(entries);

      const day = document.createElement("div");

      day.className = "history-day";

      day.innerHTML = `
        <div class="history-day-header">
          <strong>${formatDate(date)}</strong>
          <span>${money(totals.total)}</span>
        </div>
      `;

      entries
        .slice()
        .reverse()
        .forEach(entry => {
          const result = split(Number(entry.price));

          const item = document.createElement("div");

          item.className = "history-item";

          item.innerHTML = `
            <div>
              <strong>${escapeHtml(entry.service)}</strong><br>
              <small>
                ${money(entry.price)}
                ${entry.tips ? ` + ${money(entry.tips)} tips` : ""}
              </small>
            </div>

            <div style="text-align:right">
              <strong>${money(result.mine + Number(entry.tips || 0))}</strong>
              <br>
              <small>Tu</small>
            </div>
          `;

          item.addEventListener("click", () => {
            selectedDate = new Date(entry.date);
            openCutModal(entry.id);
          });

          day.appendChild(item);
        });

      container.appendChild(day);
    });
}


/* PROFIL */

function renderProfile() {
  const container = document.getElementById("servicesList");

  container.innerHTML = "";

  data.services.forEach(service => {
    const item = document.createElement("div");

    item.className = "service-item";

    item.innerHTML = `
      <div class="service-info">
        <strong>${escapeHtml(service.name)}</strong>
        <small>${money(service.price)}</small>
      </div>

      <div class="service-actions">
        <button class="icon-btn edit-service">✎</button>
        <button class="icon-btn delete delete-service">×</button>
      </div>
    `;

    item.querySelector(".edit-service").addEventListener("click", () => {
      editService(service.id);
    });

    item.querySelector(".delete-service").addEventListener("click", () => {
      deleteService(service.id);
    });

    container.appendChild(item);
  });

  document.getElementById("thresholdInput").value =
    data.rule.threshold;

  document.getElementById("fixedMineInput").value =
    data.rule.fixedMine;
}

document.getElementById("addServiceBtn").addEventListener("click", () => {
  const name = prompt("Numele serviciului:");

  if (!name || !name.trim()) return;

  const price = Number(
    prompt("Prețul implicit:")
  );

  if (!Number.isFinite(price) || price < 0) return;

  data.services.push({
    id: Date.now(),
    name: name.trim(),
    price
  });

  saveData();
  renderProfile();
});

function editService(id) {
  const service = data.services.find(s => s.id === id);

  if (!service) return;

  const name = prompt(
    "Numele serviciului:",
    service.name
  );

  if (!name || !name.trim()) return;

  const price = Number(
    prompt("Prețul implicit:", service.price)
  );

  if (!Number.isFinite(price) || price < 0) return;

  service.name = name.trim();
  service.price = price;

  saveData();
  renderProfile();
}

function deleteService(id) {
  const service = data.services.find(s => s.id === id);

  if (!service) return;

  if (
    !confirm(
      `Ștergi serviciul "${service.name}"?`
    )
  ) {
    return;
  }

  data.services = data.services.filter(
    s => s.id !== id
  );

  saveData();
  renderProfile();
}

document.getElementById("saveRuleBtn").addEventListener("click", () => {
  const threshold = Number(
    document.getElementById("thresholdInput").value
  );

  const fixedMine = Number(
    document.getElementById("fixedMineInput").value
  );

  if (
    !Number.isFinite(threshold) ||
    !Number.isFinite(fixedMine) ||
    threshold < 0 ||
    fixedMine < 0
  ) {
    alert("Introdu valori valide.");
    return;
  }

  data.rule.threshold = threshold;
  data.rule.fixedMine = fixedMine;

  saveData();

  renderHome();
  renderCalendar();
  renderHistory();

  alert("Regula a fost salvată.");
});


/* BUTONUL AZI */

document.getElementById("todayBtn").addEventListener("click", () => {
  selectedDate = new Date();
  calendarDate = new Date();

  showScreen("homeScreen");
});


/* ȘTERGERE TUNS - LONG PRESS */

let pressTimer = null;

document.addEventListener("contextmenu", event => {
  const entryElement = event.target.closest(".entry, .history-item");

  if (!entryElement) return;

  event.preventDefault();
});


/* PROTECȚIE TEXT */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* SERVICE WORKER */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .catch(() => {});
  });
}


/* PORNIRE */

renderHome();
renderCalendar();
renderHistory();
renderProfile();
```
