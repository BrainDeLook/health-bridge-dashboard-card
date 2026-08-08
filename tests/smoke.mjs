import assert from "node:assert/strict";

const registry = new Map();

globalThis.HTMLElement = class {
  attachShadow() {
    this.shadowRoot = {
      innerHTML: "",
      querySelectorAll: () => [],
    };
    return this.shadowRoot;
  }

  dispatchEvent() {}
};

globalThis.customElements = {
  define: (name, constructor) => registry.set(name, constructor),
  get: (name) => registry.get(name),
};

globalThis.window = { customCards: [] };
globalThis.localStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, value); },
};

await import("../dist/health-bridge-dashboard-card.js");

const Card = customElements.get("health-bridge-dashboard-card");
assert.ok(Card, "the custom element should be registered");
const configForm = Card.getConfigForm();
const entityPanel = configForm.schema.find((field) => field.name === "entities");
assert.ok(entityPanel, "the graphical editor should include an entity mapping panel");
assert.ok(entityPanel.schema.some((field) => field.name === "heart_rate"));
assert.ok(entityPanel.schema.some((field) => field.name === "steps"));
assert.equal(Card.getStubConfig().calorie_goal, 600);

const card = new Card();
card.setConfig({ language: "en", step_goal: 10000 });
globalThis.localStorage.setItem("health-bridge-dashboard-card:expanded:alice", "none");
card.hass = {
  language: "en",
  states: {
    "sensor.steps_alice": {
      state: "8426",
      attributes: { unit_of_measurement: "steps" },
    },
    "sensor.active_calories_alice": {
      state: "513",
      attributes: { unit_of_measurement: "kcal" },
    },
    "sensor.heart_rate_alice": {
      state: "72",
      attributes: { unit_of_measurement: "bpm" },
    },
    "sensor.last_sync_time_alice": {
      state: new Date().toISOString(),
      attributes: {},
    },
  },
  callApi: async () => [],
};

await new Promise((resolve) => setTimeout(resolve, 0));

assert.match(card.shadowRoot.innerHTML, /Health overview/);
assert.match(card.shadowRoot.innerHTML, /8,426/);
assert.match(card.shadowRoot.innerHTML, /Profile: alice/);
assert.match(card.shadowRoot.innerHTML, /container-type:inline-size/);
assert.match(card.shadowRoot.innerHTML, /@container \(max-width:430px\)/);
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="activity" aria-expanded="true"/);
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="heart" aria-expanded="false"/);
assert.match(card.shadowRoot.innerHTML, /data-axis="calories"/);
assert.match(card.shadowRoot.innerHTML, /data-axis="steps"[^>]+fill:var\(--hb-blue\)/);
assert.match(card.shadowRoot.innerHTML, /class="chart-sample activity-step"/);
assert.match(card.shadowRoot.innerHTML, /class="chart-sample activity-calorie"/);
assert.match(card.shadowRoot.innerHTML, /\.axis \{ fill:var\(--secondary-text-color\); font-size:12px/);
card._toggleChart("heart");
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="activity" aria-expanded="false"/);
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="heart" aria-expanded="true"/);
assert.match(card.shadowRoot.innerHTML, /viewBox="0 0 720 270"/);
assert.match(card.shadowRoot.innerHTML, /data-current-only="true"/);
assert.match(card.shadowRoot.innerHTML, />72 bpm<\/text>/);
card._history["sensor.heart_rate_alice"] = [
  { t: Date.now() - 7200000, v: 84 },
  { t: Date.now() - 3600000, v: 100 },
];
card._render();
assert.match(card.shadowRoot.innerHTML, /data-current-only="false"/);
assert.match(card.shadowRoot.innerHTML, /class="heart-point"/);
assert.match(card.shadowRoot.innerHTML, /class="chart-tooltip"/);
assert.match(card.shadowRoot.innerHTML, /Received:/);
assert.match(card.shadowRoot.innerHTML, /class="chart-sample heart-sample" tabindex="0"/);
assert.match(card.shadowRoot.innerHTML, /class="heart-center"/);
assert.match(card.shadowRoot.innerHTML, /class="heart-trace"/);
assert.doesNotMatch(card.shadowRoot.innerHTML, /<polyline[^>]+stroke="var\(--hb-red\)"/);
assert.match(card.shadowRoot.innerHTML, />84 bpm<\/text>/);
assert.match(card.shadowRoot.innerHTML, />100 bpm<\/text>/);
let requestedHistoryPath = "";
card._hass.callApi = async (_method, path) => {
  requestedHistoryPath = path;
  return [[
    { entity_id: "sensor.heart_rate_alice", s: "84", lu: (Date.now() - 7200000) / 1000 },
    { s: "100", lu: (Date.now() - 3600000) / 1000 },
  ]];
};
await card._loadHistory(["sensor.heart_rate_alice"], "heart-test");
assert.match(requestedHistoryPath, /end_time=/);
assert.deepEqual(card._history["sensor.heart_rate_alice"].map((point) => point.v), [84, 100]);
assert.equal(globalThis.localStorage.getItem("health-bridge-dashboard-card:expanded:alice"), "heart");
card._toggleChart("heart");
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="activity" aria-expanded="true"/);
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="heart" aria-expanded="false"/);
assert.equal(globalThis.localStorage.getItem("health-bridge-dashboard-card:expanded:alice"), "activity");
card._toggleChart("activity");
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="activity" aria-expanded="false"/);
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="heart" aria-expanded="true"/);
card.setConfig({ language: "en", show_activity: false });
card._toggleChart("heart");
assert.match(card.shadowRoot.innerHTML, /data-chart-toggle="heart" aria-expanded="true"/);

let renderCount = 0;
const render = card._render.bind(card);
card._render = () => { renderCount += 1; return render(); };
card.hass = {
  ...card._hass,
  states: {
    ...card._hass.states,
    "sensor.unrelated_temperature": { state: "21", attributes: { unit_of_measurement: "°C" } },
  },
};
assert.equal(renderCount, 0, "unrelated Home Assistant state changes must not rerender the card");
card.hass = {
  ...card._hass,
  states: {
    ...card._hass.states,
    "sensor.heart_rate_alice": { state: "73", attributes: { unit_of_measurement: "bpm" } },
  },
};
assert.equal(renderCount, 1, "a displayed Health Bridge value change must rerender the card");
assert.deepEqual(card.getGridOptions(), { columns: 12, min_columns: 4 });
assert.equal(window.customCards[0].type, "health-bridge-dashboard-card");

console.log("Smoke test passed");
