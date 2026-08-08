/* Health Bridge Dashboard Card v0.5.3
 * A dependency-free Lovelace card for gregt1993/Health_Bridge.
 * MIT License
 */

const HB_VERSION = "0.5.3";
const HB_METRICS = [
  "last_sync_time", "last_apple_workout", "steps", "active_calories",
  "exercise_time", "distance", "sleep_duration", "sleep_deep_hours",
  "sleep_core_hours", "sleep_rem_hours", "resting_heart_rate", "heart_rate",
  "heart_rate_variability", "oxygen_saturation", "respiratory_rate",
  "body_mass", "body_fat_percentage", "lean_body_mass", "vo2_max",
  "cardio_recovery", "mindful_minutes", "time_in_daylight",
];

const HB_TRANSLATIONS = {
  en: {
    title: "Health overview", synced: "Synced", noData: "No Health Bridge sensors found",
    noDataHint: "Sync Health Assistant Link once, or set user_id/entities in the card configuration.",
    activity: "Activity · 7 days", sleep: "Sleep stages · 7 days", heart: "Heart rate · 24 hours",
    steps: "Steps", calories: "Active calories", exercise: "Exercise", distance: "Distance",
    sleepDuration: "Sleep", deep: "Deep", core: "Core", rem: "REM",
    restingHeartRate: "Resting HR", oxygen: "SpO₂", hrv: "HRV", respiratory: "Respiratory rate",
    weight: "Weight", bodyFat: "Body fat", leanMass: "Lean mass", vo2: "VO₂ max",
    recovery: "Cardio recovery", workout: "Latest workout", today: "Today",
    switchChart: "Switch chart",
    historyUnavailable: "History is unavailable. Current values will keep working.", user: "Profile",
  },
  ru: {
    title: "Здоровье", synced: "Синхронизация", noData: "Сенсоры Health Bridge не найдены",
    noDataHint: "Выполните первую синхронизацию Health Assistant Link или задайте user_id/entities в YAML.",
    activity: "Активность · 7 дней", sleep: "Фазы сна · 7 дней", heart: "Пульс · 24 часа",
    steps: "Шаги", calories: "Активные калории", exercise: "Тренировка", distance: "Дистанция",
    sleepDuration: "Сон", deep: "Глубокий", core: "Основной", rem: "REM",
    restingHeartRate: "Пульс в покое", oxygen: "SpO₂", hrv: "HRV", respiratory: "Частота дыхания",
    weight: "Вес", bodyFat: "Жир", leanMass: "Безжировая масса", vo2: "VO₂ max",
    recovery: "Восстановление", workout: "Последняя тренировка", today: "Сегодня",
    switchChart: "Переключить график",
    historyUnavailable: "История недоступна. Текущие значения продолжат работать.", user: "Профиль",
  },
};

const HB_EDITOR_LABELS = {
  en: {
    title: "Title", language: "Language", user_id: "Health Bridge profile suffix",
    days: "History period", step_goal: "Daily step goal", calorie_goal: "Daily active calorie goal",
    show_activity: "Show activity chart", show_sleep: "Show sleep chart",
    show_heart_rate: "Show heart-rate chart", show_body: "Show body metrics",
    last_sync_time: "Last synchronization", last_apple_workout: "Latest workout",
    steps: "Steps", active_calories: "Active calories", exercise_time: "Exercise time",
    distance: "Distance", sleep_duration: "Sleep duration", sleep_deep_hours: "Deep sleep",
    sleep_core_hours: "Core sleep", sleep_rem_hours: "REM sleep",
    resting_heart_rate: "Resting heart rate", heart_rate: "Heart rate",
    heart_rate_variability: "Heart-rate variability", oxygen_saturation: "Oxygen saturation",
    respiratory_rate: "Respiratory rate", body_mass: "Body mass",
    body_fat_percentage: "Body-fat percentage", lean_body_mass: "Lean body mass",
    vo2_max: "VO₂ max", cardio_recovery: "Cardio recovery",
    mindful_minutes: "Mindful minutes", time_in_daylight: "Time in daylight",
  },
  ru: {
    title: "Заголовок", language: "Язык", user_id: "Суффикс профиля Health Bridge",
    days: "Период истории", step_goal: "Дневная цель шагов", calorie_goal: "Дневная цель активных калорий",
    show_activity: "Показывать график активности", show_sleep: "Показывать график сна",
    show_heart_rate: "Показывать график пульса", show_body: "Показывать состав тела",
    last_sync_time: "Последняя синхронизация", last_apple_workout: "Последняя тренировка",
    steps: "Шаги", active_calories: "Активные калории", exercise_time: "Время тренировки",
    distance: "Дистанция", sleep_duration: "Продолжительность сна", sleep_deep_hours: "Глубокий сон",
    sleep_core_hours: "Основной сон", sleep_rem_hours: "REM-сон",
    resting_heart_rate: "Пульс в покое", heart_rate: "Пульс",
    heart_rate_variability: "Вариабельность пульса", oxygen_saturation: "Насыщение кислородом",
    respiratory_rate: "Частота дыхания", body_mass: "Масса тела",
    body_fat_percentage: "Процент жира", lean_body_mass: "Безжировая масса",
    vo2_max: "VO₂ max", cardio_recovery: "Кардиовосстановление",
    mindful_minutes: "Осознанные минуты", time_in_daylight: "Время при дневном свете",
  },
};

class HealthBridgeDashboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._history = {};
    this._historyKey = "";
    this._historyAt = 0;
    this._historyError = false;
    this._loadingHistory = false;
    this._renderSignature = "";
    this._historyDataSignature = "";
    this._liveHeartHistory = [];
    this._expandedChart = null;
    this._chartStateKey = "";
  }

  setConfig(config) {
    this.config = {
      title: undefined,
      user_id: undefined,
      language: undefined,
      days: 7,
      show_activity: true,
      show_sleep: true,
      show_heart_rate: true,
      show_body: true,
      step_goal: 10000,
      calorie_goal: 600,
      entities: {},
      ...config,
    };
    if (!this.config.entities || typeof this.config.entities !== "object") {
      throw new Error("entities must be a mapping of metric names to entity IDs");
    }
    this._historyKey = "";
    this._renderSignature = this._relevantStateSignature();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._captureHeartRate();
    const signature = this._relevantStateSignature();
    if (signature !== this._renderSignature) {
      this._renderSignature = signature;
      this._render();
    }
    this._scheduleHistory();
  }

  static getStubConfig() {
    return {
      title: "Health Bridge", language: "auto", days: 7,
      step_goal: 10000, calorie_goal: 600,
      show_activity: true, show_sleep: true, show_heart_rate: true, show_body: true,
      entities: {},
    };
  }

  static getConfigForm() {
    const lang = (globalThis.navigator?.language || "en").toLowerCase().startsWith("ru") ? "ru" : "en";
    const labels = HB_EDITOR_LABELS[lang];
    const entityFields = HB_METRICS.map((name) => ({
      name,
      selector: { entity: { filter: { domain: "sensor" } } },
    }));
    return {
      schema: [
        { name: "title", selector: { text: {} } },
        {
          name: "language", default: "auto",
          selector: { select: { mode: "dropdown", options: [
            { value: "auto", label: lang === "ru" ? "Автоматически" : "Automatic" },
            { value: "en", label: "English" },
            { value: "ru", label: "Русский" },
          ] } },
        },
        { name: "user_id", selector: { text: {} } },
        {
          type: "grid", name: "", flatten: true, column_min_width: "160px",
          schema: [
            { name: "days", default: 7, selector: { number: { min: 2, max: 31, step: 1, mode: "box", unit_of_measurement: lang === "ru" ? "дн." : "days" } } },
            { name: "step_goal", default: 10000, selector: { number: { min: 1, max: 100000, step: 500, mode: "box", unit_of_measurement: lang === "ru" ? "шагов" : "steps" } } },
            { name: "calorie_goal", default: 600, selector: { number: { min: 1, max: 10000, step: 50, mode: "box", unit_of_measurement: "kcal" } } },
          ],
        },
        {
          type: "expandable", name: "", flatten: true, expanded: true,
          title: lang === "ru" ? "Отображаемые разделы" : "Visible sections", icon: "mdi:view-dashboard-outline",
          schema: [
            { name: "show_activity", default: true, selector: { boolean: {} } },
            { name: "show_sleep", default: true, selector: { boolean: {} } },
            { name: "show_heart_rate", default: true, selector: { boolean: {} } },
            { name: "show_body", default: true, selector: { boolean: {} } },
          ],
        },
        {
          type: "expandable", name: "entities", flatten: false,
          title: lang === "ru" ? "Сущности показателей" : "Metric entities", icon: "mdi:database-edit-outline",
          schema: entityFields,
        },
      ],
      computeLabel: (schema) => labels[schema.name] || schema.name,
      computeHelper: (schema) => schema.name === "user_id"
        ? (lang === "ru" ? "Оставьте пустым для автоматического определения" : "Leave empty for automatic discovery")
        : undefined,
      assertConfig: (config) => {
        if (config.entities !== undefined && (!config.entities || typeof config.entities !== "object" || Array.isArray(config.entities))) {
          throw new Error("entities must be a mapping of metric names to entity IDs");
        }
      },
    };
  }

  getCardSize() { return 12; }

  getGridOptions() {
    return { columns: 12, min_columns: 4 };
  }

  _lang() {
    const configured = this.config?.language;
    const value = ((configured && configured !== "auto" ? configured : this._hass?.language) || "en").toLowerCase();
    return value.startsWith("ru") ? "ru" : "en";
  }

  _t(key) { return HB_TRANSLATIONS[this._lang()][key] || HB_TRANSLATIONS.en[key] || key; }

  _detectUserId() {
    if (this.config?.user_id) return String(this.config.user_id);
    if (!this._hass) return "";
    const priority = ["steps", "last_sync_time", ...HB_METRICS];
    for (const metric of priority) {
      const prefix = `sensor.${metric}_`;
      const id = Object.keys(this._hass.states).find((entityId) => entityId.startsWith(prefix));
      if (id) return id.slice(prefix.length);
    }
    return "";
  }

  _entity(metric) {
    const explicit = this.config?.entities?.[metric];
    if (explicit) return explicit;
    const user = this._detectUserId();
    if (user) {
      const exact = `sensor.${metric}_${user}`;
      if (this._hass?.states?.[exact]) return exact;
    }
    const prefix = `sensor.${metric}_`;
    return Object.keys(this._hass?.states || {}).find((id) => id.startsWith(prefix));
  }

  _state(metric) {
    const id = this._entity(metric);
    return id ? this._hass?.states?.[id] : undefined;
  }

  _numeric(metric) {
    const value = Number(this._state(metric)?.state);
    return Number.isFinite(value) ? value : null;
  }

  _availableMetrics() {
    return HB_METRICS.filter((metric) => this._state(metric));
  }

  _relevantStateSignature() {
    if (!this.config || !this._hass) return "";
    const values = [this._lang()];
    for (const metric of HB_METRICS) {
      const entityId = this._entity(metric) || "";
      const state = entityId ? this._hass.states[entityId] : undefined;
      values.push(entityId, state?.state ?? "", state?.attributes?.unit_of_measurement ?? "");
    }
    return JSON.stringify(values);
  }

  _historySignature(history) {
    return JSON.stringify(Object.keys(history).sort().map((entityId) => [entityId, history[entityId]]));
  }

  _escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  _format(metric) {
    const state = this._state(metric);
    if (!state || ["unknown", "unavailable", "none", ""].includes(state.state)) return "—";
    let value = Number(state.state);
    let unit = state.attributes.unit_of_measurement || "";
    if (!Number.isFinite(value)) return this._escape(state.state);
    if (metric === "distance" && unit === "m" && value >= 1000) {
      value /= 1000; unit = "km";
    }
    const maximumFractionDigits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    const formatted = new Intl.NumberFormat(this._lang(), { maximumFractionDigits }).format(value);
    return `${formatted}${unit ? ` <small>${this._escape(unit)}</small>` : ""}`;
  }

  _relativeDate(raw) {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw || "—";
    const delta = (date.getTime() - Date.now()) / 1000;
    const formatter = new Intl.RelativeTimeFormat(this._lang(), { numeric: "auto" });
    if (Math.abs(delta) < 3600) return formatter.format(Math.round(delta / 60), "minute");
    if (Math.abs(delta) < 86400) return formatter.format(Math.round(delta / 3600), "hour");
    return new Intl.DateTimeFormat(this._lang(), { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  _metric(metric, label, icon, tone) {
    const entity = this._entity(metric);
    if (!entity) return "";
    return `<button class="metric ${tone}" data-entity="${this._escape(entity)}" aria-label="${this._escape(label)}">
      <span class="metric-icon"><ha-icon icon="${icon}"></ha-icon></span>
      <span class="metric-copy"><span class="metric-value">${this._format(metric)}</span><span class="metric-label">${this._escape(label)}</span></span>
    </button>`;
  }

  _styles() {
    return `<style>
      :host { display:block; container-type:inline-size; --hb-blue:#4c8dff; --hb-orange:#ff8a4c; --hb-red:#f05b67; --hb-cyan:#35b9c7; --hb-indigo:#6d66d8; }
      ha-card { overflow:hidden; padding:14px; color:var(--primary-text-color); background:var(--ha-card-background,var(--card-background-color)); }
      * { box-sizing:border-box; }
      .header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:12px; }
      h1 { margin:0; font-size:20px; line-height:1.2; letter-spacing:-.025em; }
      .eyebrow { display:flex; gap:7px; align-items:center; margin-top:5px; color:var(--secondary-text-color); font-size:12px; }
      .sync-dot { width:7px; height:7px; border-radius:50%; background:#4caf72; box-shadow:0 0 0 4px color-mix(in srgb,#4caf72 16%,transparent); }
      .user-chip { padding:6px 9px; border-radius:999px; background:var(--secondary-background-color); color:var(--secondary-text-color); font-size:11px; white-space:nowrap; }
      .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(132px,1fr)); gap:8px; }
      .metric { appearance:none; border:1px solid var(--divider-color); border-radius:13px; min-height:70px; padding:10px; background:color-mix(in srgb,var(--card-background-color) 94%,var(--hb-color)); color:var(--primary-text-color); display:flex; align-items:center; gap:9px; text-align:left; cursor:pointer; font:inherit; transition:transform .15s ease,border-color .15s ease; }
      .metric:hover { transform:translateY(-1px); border-color:color-mix(in srgb,var(--hb-color) 50%,var(--divider-color)); }
      .metric:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
      .metric-icon { width:32px; height:32px; flex:0 0 32px; display:grid; place-items:center; border-radius:10px; color:var(--hb-color); background:color-mix(in srgb,var(--hb-color) 14%,transparent); }
      .metric-copy { min-width:0; display:flex; flex-direction:column; }
      .metric-value { font-size:17px; line-height:1.15; font-weight:700; white-space:nowrap; }
      .metric-value small { font-size:10px; font-weight:600; color:var(--secondary-text-color); }
      .metric-label { margin-top:3px; color:var(--secondary-text-color); font-size:11px; line-height:1.2; overflow-wrap:anywhere; }
      .blue{--hb-color:var(--hb-blue)} .orange{--hb-color:var(--hb-orange)} .red{--hb-color:var(--hb-red)} .cyan{--hb-color:var(--hb-cyan)} .indigo{--hb-color:var(--hb-indigo)} .green{--hb-color:#4caf72}
      .goal { margin:10px 2px 0; }
      .goal-row { display:flex; justify-content:space-between; margin-bottom:5px; color:var(--secondary-text-color); font-size:11px; }
      .goal-track { height:6px; overflow:hidden; border-radius:99px; background:var(--secondary-background-color); }
      .goal-fill { height:100%; border-radius:inherit; background:linear-gradient(90deg,var(--hb-blue),var(--hb-cyan)); transition:width .3s ease; }
      .workout { margin-top:10px; display:flex; align-items:flex-start; gap:9px; border-radius:12px; padding:10px 12px; background:var(--secondary-background-color); }
      .workout ha-icon { color:var(--hb-orange); margin-top:1px; }
      .workout strong { display:block; font-size:12px; margin-bottom:3px; }
      .workout span { color:var(--secondary-text-color); font-size:13px; }
      .charts { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:10px; margin-top:12px; }
      .chart { min-width:0; border:1px solid var(--divider-color); border-radius:13px; padding:11px; }
      .chart.wide { grid-column:1/-1; }
      .chart-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px; font-size:13px; font-weight:700; }
      .chart-toggle { appearance:none; width:100%; margin:0; padding:0; border:0; background:none; color:inherit; font:inherit; text-align:left; cursor:pointer; }
      .chart-toggle:focus-visible { outline:2px solid var(--primary-color); outline-offset:5px; border-radius:5px; }
      .chart-heading { display:flex; align-items:center; gap:7px; min-width:0; }
      .chart-chevron { width:18px; height:18px; flex:0 0 18px; color:var(--secondary-text-color); transition:transform .2s ease; }
      .chart-toggle[aria-expanded="true"] .chart-chevron { transform:rotate(180deg); }
      .chart-body { margin-top:6px; }
      .chart-body[hidden] { display:none; }
      .legend { display:flex; gap:9px; flex-wrap:wrap; color:var(--secondary-text-color); font-size:10px; font-weight:500; }
      .legend i { display:inline-block; width:7px; height:7px; margin-right:4px; border-radius:50%; background:var(--dot); }
      svg { display:block; width:100%; height:auto; overflow:visible; }
      .axis { fill:var(--secondary-text-color); font-size:9px; }
      .grid-line { stroke:var(--divider-color); stroke-width:1; }
      .empty { padding:34px 12px; text-align:center; }
      .empty ha-icon { width:46px; height:46px; color:var(--secondary-text-color); }
      .empty h2 { margin:12px 0 7px; font-size:18px; }
      .empty p,.history-error { color:var(--secondary-text-color); font-size:12px; }
      .history-error { margin-top:12px; text-align:center; }
      @container (max-width:600px) { .charts{grid-template-columns:1fr}.chart.wide{grid-column:auto} }
      @container (max-width:430px) { ha-card{padding:12px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.user-chip{display:none}.metric{min-height:66px;padding:9px}.chart{padding:10px} }
      @container (max-width:300px) { .metrics{grid-template-columns:1fr}.header{display:block} }
    </style>`;
  }

  _render() {
    if (!this.config || !this._hass || !this.shadowRoot) return;
    const metrics = this._availableMetrics();
    if (!metrics.length) {
      this.shadowRoot.innerHTML = `${this._styles()}<ha-card><div class="empty"><ha-icon icon="mdi:heart-pulse"></ha-icon><h2>${this._t("noData")}</h2><p>${this._t("noDataHint")}</p></div></ha-card>`;
      return;
    }
    const sync = this._state("last_sync_time")?.state;
    const user = this._detectUserId();
    const stepValue = this._numeric("steps") || 0;
    const goal = Math.max(1, Number(this.config.step_goal) || 10000);
    const goalPercent = Math.min(100, Math.max(0, stepValue / goal * 100));
    const workout = this._state("last_apple_workout")?.state;
    const cards = [
      this._metric("steps", this._t("steps"), "mdi:walk", "blue"),
      this._metric("active_calories", this._t("calories"), "mdi:fire", "orange"),
      this._metric("exercise_time", this._t("exercise"), "mdi:run-fast", "green"),
      this._metric("distance", this._t("distance"), "mdi:map-marker-distance", "cyan"),
      this._metric("sleep_duration", this._t("sleepDuration"), "mdi:sleep", "indigo"),
      this._metric("resting_heart_rate", this._t("restingHeartRate"), "mdi:heart", "red"),
      this._metric("oxygen_saturation", this._t("oxygen"), "mdi:lungs", "cyan"),
      this._metric("heart_rate_variability", this._t("hrv"), "mdi:waves", "green"),
    ].filter(Boolean).join("");
    const bodyCards = this.config.show_body ? [
      this._metric("body_mass", this._t("weight"), "mdi:weight-kilogram", "blue"),
      this._metric("body_fat_percentage", this._t("bodyFat"), "mdi:human-handsup", "orange"),
      this._metric("lean_body_mass", this._t("leanMass"), "mdi:dumbbell", "green"),
      this._metric("vo2_max", this._t("vo2"), "mdi:lungs", "cyan"),
    ].filter(Boolean).join("") : "";
    const hasActivityChart = this.config.show_activity && (this._entity("steps") || this._entity("active_calories"));
    const hasHeartChart = this.config.show_heart_rate && this._entity("heart_rate");
    this._prepareChartState(user, Boolean(hasActivityChart), Boolean(hasHeartChart));
    const charts = [
      hasActivityChart ? this._activityChart() : "",
      this.config.show_sleep && (this._entity("sleep_deep_hours") || this._entity("sleep_core_hours") || this._entity("sleep_rem_hours")) ? this._sleepChart() : "",
      hasHeartChart ? this._heartChart() : "",
    ].filter(Boolean).join("");
    this.shadowRoot.innerHTML = `${this._styles()}<ha-card>
      <div class="header"><div><h1>${this._escape(this.config.title || this._t("title"))}</h1>
        ${sync && !["unknown","unavailable"].includes(sync) ? `<div class="eyebrow"><i class="sync-dot"></i>${this._t("synced")}: ${this._escape(this._relativeDate(sync))}</div>` : ""}
      </div>${user ? `<div class="user-chip">${this._t("user")}: ${this._escape(user)}</div>` : ""}</div>
      <div class="metrics">${cards}${bodyCards}</div>
      ${this._entity("steps") ? `<div class="goal"><div class="goal-row"><span>${this._t("steps")}</span><span>${new Intl.NumberFormat(this._lang()).format(stepValue)} / ${new Intl.NumberFormat(this._lang()).format(goal)}</span></div><div class="goal-track"><div class="goal-fill" style="width:${goalPercent}%"></div></div></div>` : ""}
      ${workout && !["unknown","unavailable","none"].includes(workout) ? `<div class="workout"><ha-icon icon="mdi:run"></ha-icon><div><strong>${this._t("workout")}</strong><span>${this._escape(workout)}</span></div></div>` : ""}
      ${charts ? `<div class="charts">${charts}</div>` : ""}
      ${this._historyError ? `<div class="history-error">${this._t("historyUnavailable")}</div>` : ""}
    </ha-card>`;
    this.shadowRoot.querySelectorAll("[data-entity]").forEach((element) => {
      element.addEventListener("click", () => this._moreInfo(element.dataset.entity));
    });
    this.shadowRoot.querySelectorAll("[data-chart-toggle]").forEach((element) => {
      element.addEventListener("click", () => this._toggleChart(element.dataset.chartToggle));
    });
  }

  _prepareChartState(user, hasActivity, hasHeart) {
    const key = `health-bridge-dashboard-card:expanded:${user || "default"}`;
    if (key !== this._chartStateKey) {
      this._chartStateKey = key;
      let saved = null;
      try { saved = globalThis.localStorage?.getItem(key); } catch (_) { /* Storage can be disabled. */ }
      this._expandedChart = ["activity", "heart"].includes(saved) ? saved : "activity";
    }
    if (this._expandedChart === "activity" && !hasActivity && hasHeart) this._expandedChart = "heart";
    if (this._expandedChart === "heart" && !hasHeart && hasActivity) this._expandedChart = "activity";
  }

  _toggleChart(chart) {
    if (!["activity", "heart"].includes(chart)) return;
    const hasActivity = this.config.show_activity && (this._entity("steps") || this._entity("active_calories"));
    const hasHeart = this.config.show_heart_rate && this._entity("heart_rate");
    if (!hasActivity || !hasHeart) return;
    this._expandedChart = this._expandedChart === "activity" ? "heart" : "activity";
    try { globalThis.localStorage?.setItem(this._chartStateKey, this._expandedChart); } catch (_) { /* Storage can be disabled. */ }
    this._render();
  }

  _collapsibleChart(kind, title, legend, svg, wide = false) {
    const expanded = this._expandedChart === kind;
    const action = this._t("switchChart");
    return `<section class="chart collapsible${wide ? " wide" : ""}">
      <button type="button" class="chart-title chart-toggle" data-chart-toggle="${kind}" aria-expanded="${expanded}" aria-label="${this._escape(`${action}: ${title}`)}">
        <span class="chart-heading"><span>${title}</span><ha-icon class="chart-chevron" icon="mdi:chevron-down"></ha-icon></span>${legend}
      </button>
      <div class="chart-body"${expanded ? "" : " hidden"}>${svg}</div>
    </section>`;
  }

  _moreInfo(entityId) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } }));
  }

  _historyPoints(metric) {
    const entity = this._entity(metric);
    const points = entity ? [...(this._history[entity] || [])] : [];
    if (metric === "heart_rate") points.push(...this._liveHeartHistory);
    const state = this._state(metric);
    const currentValue = Number(state?.state);
    if (Number.isFinite(currentValue) && (!points.length || points[points.length - 1].v !== currentValue)) {
      points.push({ t: Date.now(), v: currentValue });
    }
    const unique = new Map();
    points
      .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.v))
      .sort((a, b) => a.t - b.t)
      .forEach((point) => unique.set(`${point.t}:${point.v}`, point));
    return [...unique.values()];
  }

  _captureHeartRate() {
    const state = this._state("heart_rate");
    const value = Number(state?.state);
    if (!Number.isFinite(value)) return;
    const rawTime = state.last_changed || state.last_updated;
    const parsedTime = rawTime ? new Date(rawTime).getTime() : Date.now();
    const time = Number.isFinite(parsedTime) ? parsedTime : Date.now();
    const last = this._liveHeartHistory[this._liveHeartHistory.length - 1];
    if (!last || last.v !== value) this._liveHeartHistory.push({ t: time, v: value });
    const cutoff = Date.now() - 86400000;
    this._liveHeartHistory = this._liveHeartHistory.filter((point) => point.t >= cutoff);
  }

  _daily(metric) {
    const days = Math.max(2, Math.min(31, Number(this.config.days) || 7));
    const result = [];
    const index = new Map();
    for (let offset = days - 1; offset >= 0; offset--) {
      const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() - offset);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const item = { date, value: 0, has: false }; index.set(key, item); result.push(item);
    }
    for (const point of this._historyPoints(metric)) {
      const date = new Date(point.t);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const item = index.get(key);
      if (item && Number.isFinite(point.v)) { item.value = item.has ? Math.max(item.value, point.v) : point.v; item.has = true; }
    }
    return result;
  }

  _activityChart() {
    const steps = this._daily("steps"), calories = this._daily("active_calories");
    const width = 560, height = 210, left = 32, right = 34, top = 12, bottom = 28;
    const plotW = width-left-right, plotH = height-top-bottom, slot = plotW/steps.length;
    const stepGoal = Math.max(1, Number(this.config.step_goal) || 10000);
    const calorieGoal = Math.max(1, Number(this.config.calorie_goal) || 600);
    const maxSteps = Math.max(stepGoal, Math.ceil(Math.max(0,...steps.map((x)=>x.value))/1000)*1000);
    const maxCal = Math.max(calorieGoal, Math.ceil(Math.max(0,...calories.map((x)=>x.value))/100)*100);
    const bars = steps.map((item,i)=>{ const h=item.has ? item.value/maxSteps*plotH : 0; return `<rect x="${left+i*slot+slot*.18}" y="${top+plotH-h}" width="${slot*.48}" height="${h}" rx="4" fill="var(--hb-blue)" opacity=".85"><title>${item.value.toFixed(0)} ${this._t("steps")}</title></rect>`; }).join("");
    const linePoints = calories.map((item,i)=>`${left+i*slot+slot*.5},${top+plotH-(item.has?item.value/maxCal*plotH:0)}`).join(" ");
    const dots = calories.map((item,i)=>item.has?`<circle cx="${left+i*slot+slot*.5}" cy="${top+plotH-item.value/maxCal*plotH}" r="3" fill="var(--hb-orange)"><title>${item.value.toFixed(0)} kcal</title></circle>`:"").join("");
    const legend = `<span class="legend"><span><i style="--dot:var(--hb-blue)"></i>${this._t("steps")}</span><span><i style="--dot:var(--hb-orange)"></i>kcal</span></span>`;
    const svg = `<svg viewBox="0 0 ${width} ${height}" role="img">${this._dualGrid(width,height,left,right,top,bottom,maxSteps,maxCal)}${bars}<polyline points="${linePoints}" fill="none" stroke="var(--hb-orange)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dots}${this._dayLabels(steps,width,height,left,right)}</svg>`;
    return this._collapsibleChart("activity", this._t("activity"), legend, svg);
  }

  _sleepChart() {
    const deep=this._daily("sleep_deep_hours"), core=this._daily("sleep_core_hours"), rem=this._daily("sleep_rem_hours");
    const width=560,height=210,left=28,right=12,top=12,bottom=28,plotW=width-left-right,plotH=height-top-bottom,slot=plotW/deep.length;
    const totals=deep.map((x,i)=>(x.has?x.value:0)+(core[i].has?core[i].value:0)+(rem[i].has?rem[i].value:0));
    const max=Math.max(10,Math.ceil(Math.max(...totals)));
    const colors=["#3949ab","#7986cb","#26c6da"];
    let bars="";
    deep.forEach((_,i)=>{ let y=top+plotH; [deep[i],core[i],rem[i]].forEach((item,j)=>{ const h=(item.has?item.value:0)/max*plotH; y-=h; bars+=`<rect x="${left+i*slot+slot*.2}" y="${y}" width="${slot*.6}" height="${Math.max(0,h)}" rx="${j===2?3:0}" fill="${colors[j]}"><title>${item.value.toFixed(1)} h</title></rect>`; }); });
    return `<section class="chart"><div class="chart-title"><span>${this._t("sleep")}</span><span class="legend"><span><i style="--dot:${colors[0]}"></i>${this._t("deep")}</span><span><i style="--dot:${colors[1]}"></i>${this._t("core")}</span><span><i style="--dot:${colors[2]}"></i>${this._t("rem")}</span></span></div><svg viewBox="0 0 ${width} ${height}" role="img">${this._grid(width,height,left,right,top,bottom,max)}${bars}${this._dayLabels(deep,width,height,left,right)}</svg></section>`;
  }

  _heartChart() {
    const points=this._historyPoints("heart_rate").filter((p)=>p.t>=Date.now()-86400000).sort((a,b)=>a.t-b.t);
    if (!points.length) return "";
    // Match the activity chart's 8:3 aspect ratio so both expanded blocks
    // occupy exactly the same responsive height at every card width.
    const width=720,height=270,left=34,right=12,top=12,bottom=26,plotW=width-left-right,plotH=height-top-bottom;
    const values=points.map((p)=>p.v),min=Math.max(30,Math.floor(Math.min(...values)/10)*10-10),max=Math.max(min+20,Math.ceil(Math.max(...values)/10)*10+10);
    const start=Date.now()-86400000,end=Date.now();
    const current=points[points.length-1],currentY=top+plotH-(current.v-min)/(max-min)*plotH;
    const hasHistory=points.length>1;
    const measured=points.map((point)=>({x:left+(point.t-start)/(end-start)*plotW,y:top+plotH-(point.v-min)/(max-min)*plotH}));
    const tracePoints=hasHistory?[...measured,{x:left+plotW,y:currentY}]:[{x:left,y:currentY},{x:left+plotW,y:currentY}];
    const trace=this._heartTracePath(tracePoints);
    const centerY=top+plotH/2;
    const historyMarkers=hasHistory?points.slice(0,-1).map((point)=>{const x=left+(point.t-start)/(end-start)*plotW,y=top+plotH-(point.v-min)/(max-min)*plotH;return `<circle class="heart-point" cx="${x}" cy="${y}" r="4" fill="var(--hb-red)"><title>${point.v.toFixed(0)} bpm</title></circle>`;}).join(""):"";
    const currentMarker=`<circle cx="${left+plotW}" cy="${currentY}" r="5" fill="var(--hb-red)"><title>${current.v.toFixed(0)} bpm</title></circle><text class="axis" x="${left+plotW-8}" y="${Math.max(top+10,currentY-9)}" text-anchor="end" style="fill:var(--hb-red)">${current.v.toFixed(0)} bpm</text>`;
    const legend = `<span class="legend"><span><i style="--dot:var(--hb-red)"></i>bpm</span></span>`;
    const svg = `<svg viewBox="0 0 ${width} ${height}" role="img" data-current-only="${!hasHistory}">${this._grid(width,height,left,right,top,bottom,max,min)}<line class="heart-center" x1="${left}" x2="${left+plotW}" y1="${centerY}" y2="${centerY}" stroke="var(--secondary-text-color)" stroke-width="1.5" stroke-dasharray="5 7" opacity=".5"/><path class="heart-trace" d="${trace}" fill="none" stroke="var(--hb-red)" stroke-width="3" stroke-dasharray="10 7" stroke-linejoin="round" stroke-linecap="round"/>${historyMarkers}${currentMarker}<text class="axis" x="${left}" y="${height-6}">24h</text><text class="axis" x="${left+plotW}" y="${height-6}" text-anchor="end">${this._t("today")}</text></svg>`;
    return this._collapsibleChart("heart", this._t("heart"), legend, svg, true);
  }

  _heartTracePath(points) {
    if (!points.length) return "";
    let path=`M ${points[0].x},${points[0].y}`;
    for(let i=1;i<points.length;i++){
      const previous=points[i-1],next=points[i],middle=(previous.x+next.x)/2;
      const radius=Math.min(10,Math.max(2,(next.x-previous.x)*.08));
      path+=` L ${middle-radius},${previous.y} Q ${middle},${previous.y} ${middle},${(previous.y+next.y)/2} Q ${middle},${next.y} ${middle+radius},${next.y} L ${next.x},${next.y}`;
    }
    return path;
  }

  _grid(width,height,left,right,top,bottom,max,min=0) {
    const plotH=height-top-bottom, parts=[];
    for(let i=0;i<=3;i++){const y=top+plotH*i/3,value=max-(max-min)*i/3;parts.push(`<line class="grid-line" x1="${left}" x2="${width-right}" y1="${y}" y2="${y}"/><text class="axis" x="${left-5}" y="${y+3}" text-anchor="end">${value>=1000?`${(value/1000).toFixed(value>=10000?0:1)}k`:value.toFixed(0)}</text>`);} return parts.join("");
  }

  _dualGrid(width,height,left,right,top,bottom,maxLeft,maxRight) {
    const plotH=height-top-bottom,parts=[];
    for(let i=0;i<=3;i++){
      const y=top+plotH*i/3,leftValue=maxLeft*(1-i/3),rightValue=maxRight*(1-i/3);
      const leftLabel=leftValue>=1000?`${(leftValue/1000).toFixed(leftValue>=10000?0:1)}k`:leftValue.toFixed(0);
      parts.push(`<line class="grid-line" x1="${left}" x2="${width-right}" y1="${y}" y2="${y}"/><text class="axis" data-axis="steps" x="${left-5}" y="${y+3}" text-anchor="end" style="fill:var(--hb-blue)">${leftLabel}</text><text class="axis" data-axis="calories" x="${width-right+5}" y="${y+3}" style="fill:var(--hb-orange)">${rightValue.toFixed(0)}</text>`);
    }
    return parts.join("");
  }

  _dayLabels(days,width,height,left,right) {
    const slot=(width-left-right)/days.length,fmt=new Intl.DateTimeFormat(this._lang(),{weekday:"short"});
    return days.map((item,i)=>`<text class="axis" x="${left+i*slot+slot/2}" y="${height-7}" text-anchor="middle">${this._escape(fmt.format(item.date))}</text>`).join("");
  }

  _scheduleHistory() {
    if (!this._hass || !this.config || this._loadingHistory) return;
    const metrics=["steps","active_calories","sleep_deep_hours","sleep_core_hours","sleep_rem_hours","heart_rate"];
    const entities=[...new Set(metrics.map((m)=>this._entity(m)).filter(Boolean))];
    if (!entities.length) return;
    const key=`${entities.join(",")}|${this.config.days}`;
    if (key===this._historyKey && Date.now()-this._historyAt<300000) return;
    this._loadHistory(entities,key);
  }

  async _loadHistory(entities,key) {
    const hadHistoryError=this._historyError;
    this._loadingHistory=true; this._historyError=false;
    let shouldRender=hadHistoryError;
    try {
      const days=Math.max(2,Math.min(31,Number(this.config.days)||7));
      const start=new Date(Date.now()-days*86400000).toISOString();
      const end=new Date().toISOString();
      const path=`history/period/${encodeURIComponent(start)}?filter_entity_id=${encodeURIComponent(entities.join(","))}&end_time=${encodeURIComponent(end)}&minimal_response&no_attributes`;
      const response=await this._hass.callApi("GET",path);
      const history={};
      (response||[]).forEach((series,index)=>{
        const fallback=entities[index], entity=series?.find((p)=>p.entity_id)?.entity_id||fallback;
        if (!entity) return;
        history[entity]=(series||[]).map((point)=>{
          const rawTime=point.last_changed??point.last_updated??point.lc??point.lu;
          const numericTime=Number(rawTime);
          const t=Number.isFinite(numericTime) ? numericTime*(numericTime<1e12?1000:1) : new Date(rawTime).getTime();
          return { t, v:Number(point.state??point.s) };
        }).filter((point)=>Number.isFinite(point.t)&&Number.isFinite(point.v));
      });
      const signature=this._historySignature(history);
      if(signature!==this._historyDataSignature){this._history=history;this._historyDataSignature=signature;shouldRender=true;}
      this._historyKey=key; this._historyAt=Date.now();
    } catch (error) {
      console.warn("Health Bridge Dashboard Card: unable to load history",error);
      shouldRender=!hadHistoryError; this._historyError=true; this._historyKey=key; this._historyAt=Date.now();
    } finally { this._loadingHistory=false; if(shouldRender)this._render(); }
  }
}

if (!customElements.get("health-bridge-dashboard-card")) {
  customElements.define("health-bridge-dashboard-card", HealthBridgeDashboardCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "health-bridge-dashboard-card",
  name: "Health Bridge Dashboard Card",
  description: "A responsive health dashboard with built-in activity, sleep and heart-rate charts.",
  preview: true,
  documentationURL: "https://github.com/BrainDeLook/health-bridge-dashboard-card",
});

console.info(`%c HEALTH-BRIDGE-DASHBOARD-CARD %c v${HB_VERSION} `,"color:white;background:#4c8dff;font-weight:700","color:#4c8dff;background:#eaf2ff");
