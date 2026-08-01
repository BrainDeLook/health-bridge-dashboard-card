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

await import("../dist/health-bridge-dashboard-card.js");

const Card = customElements.get("health-bridge-dashboard-card");
assert.ok(Card, "the custom element should be registered");

const card = new Card();
card.setConfig({ language: "en", step_goal: 10000 });
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
assert.deepEqual(card.getGridOptions(), { columns: 12, min_columns: 4 });
assert.equal(window.customCards[0].type, "health-bridge-dashboard-card");

console.log("Smoke test passed");
