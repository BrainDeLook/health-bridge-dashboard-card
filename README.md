# Health Bridge Dashboard Card

![Health Bridge Dashboard Card preview](images/preview.svg)

A responsive, dependency-free Home Assistant dashboard card for
[Health Bridge](https://github.com/gregt1993/Health_Bridge). It automatically
discovers Health Bridge sensors and displays current health metrics, a step-goal
progress bar, the latest workout, and Recorder-backed charts for activity, sleep,
and heart rate.

The card includes English and Russian labels and works without ApexCharts,
Mushroom, card-mod, or any other frontend dependency.

> This is an independent community project and is not affiliated with the
> Health Bridge or Health Assistant Link authors.

## Features

- Automatic profile and entity discovery
- Compact layout that adapts to the card's own width in Masonry and Sections views
- Current activity, sleep, cardiovascular, and body-composition metrics
- Seven-day activity chart
- Stacked sleep-stage chart
- 24-hour heart-rate chart
- Configurable step goal and visible sections
- Tap any metric to open the Home Assistant more-info dialog
- Manual entity overrides for renamed sensors
- Native Home Assistant theme colors

## Requirements

- Home Assistant 2024.11 or newer
- [Health Bridge](https://github.com/gregt1993/Health_Bridge), synced at least once
- Recorder history enabled for charts
- HACS for the recommended installation method

## Install with HACS as a custom repository

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=BrainDeLook&repository=health-bridge-dashboard-card&category=plugin)

If the button is not available:

1. Open **HACS** in Home Assistant.
2. Open the three-dot menu and select **Custom repositories**.
3. Add `https://github.com/BrainDeLook/health-bridge-dashboard-card`.
4. Select **Dashboard** as the category.
5. Download **Health Bridge Dashboard Card**.
6. Refresh the browser. If necessary, clear the frontend cache once.

No pull request to the default HACS repository is required for custom-repository
installation.

## Add the card

Add a **Manual** card to a Home Assistant dashboard:

```yaml
type: custom:health-bridge-dashboard-card
```

For a Russian dashboard with common options:

```yaml
type: custom:health-bridge-dashboard-card
title: Здоровье
language: ru
days: 7
step_goal: 10000
show_activity: true
show_sleep: true
show_heart_rate: true
show_body: true
```

The card automatically uses the first discovered Health Bridge profile. If
several people sync data to the same Home Assistant instance, specify the entity
suffix:

```yaml
type: custom:health-bridge-dashboard-card
user_id: daniil
```

For `sensor.steps_daniil`, the `user_id` is `daniil`.

## Configuration

| Option | Type | Default | Description |
|---|---:|---:|---|
| `title` | string | localized | Card title |
| `language` | `en` or `ru` | HA language | Interface language |
| `user_id` | string | auto | Health Bridge entity suffix |
| `days` | number | `7` | Activity and sleep history, from 2 to 31 days |
| `step_goal` | number | `10000` | Daily step target |
| `show_activity` | boolean | `true` | Activity chart |
| `show_sleep` | boolean | `true` | Sleep-stage chart |
| `show_heart_rate` | boolean | `true` | 24-hour heart-rate chart |
| `show_body` | boolean | `true` | Body-composition metrics |
| `entities` | mapping | `{}` | Explicit metric-to-entity overrides |

Example with renamed entities:

```yaml
type: custom:health-bridge-dashboard-card
entities:
  steps: sensor.my_steps
  heart_rate: sensor.my_heart_rate
  sleep_duration: sensor.my_sleep
```

## Supported Health Bridge metrics

The card uses whichever supported sensors are available. Missing sensors are
simply omitted.

- Activity: steps, distance, active calories, exercise time, latest workout
- Sleep: total, deep, core, and REM sleep
- Heart and breathing: heart rate, resting heart rate, HRV, SpO₂, respiratory rate
- Body: weight, body fat, lean body mass, VO₂ max, cardio recovery
- Status: last Health Bridge synchronization

## Troubleshooting

### The card says that no sensors were found

Sync Health Assistant Link at least once. Then open **Developer tools → States**
and confirm that an entity such as `sensor.steps_<user_id>` exists. If entities
were renamed, configure them explicitly with `entities:`.

### Current values work, but graphs are empty

Graphs require Home Assistant Recorder history. Confirm that the relevant sensors
are not excluded from Recorder and allow time for history to accumulate.

### More than one person uses Health Bridge

Set `user_id` separately on each card. The value is the suffix following the
metric name in the entity ID.

## Development

The distributable is intentionally plain JavaScript with no build step:

```text
dist/health-bridge-dashboard-card.js
```

Validate its syntax with:

```bash
node --check dist/health-bridge-dashboard-card.js
```

## License

[MIT](LICENSE)
