# Food Logger — Mobile Frontend

An [Expo](https://expo.dev) React Native app for **AI-powered food and calorie logging via natural language**. Describe what you ate in plain English ("two eggs on toast and a latte") and the app estimates calories and macros, organizes them into meals, and tracks your daily totals against a target.

This repository is the **mobile frontend only**. It talks to a separate backend API (see [Configuration](#configuration)).

## Features

- **Natural-language logging** — type a free-form description of your meals; the backend's AI parses it into structured meals with calorie ranges and macros (protein, carbs, fat, fiber).
- **Dashboard** — today / week / month views with summary cards, a daily progress bar, a weekly bar chart, and a monthly calendar grid.
- **Editable day logs** — open any day to review meals, edit individual fields inline, or propose AI-assisted edits via chat (commit/confirm flow). Editing is limited to a 7-day window.
- **Guest mode** — start using the app immediately with an anonymous guest identity (valid for 7 days, limited free analyses per day). Sign up to keep your history.
- **Email/password auth** — JWT-based, stored securely with `expo-secure-store`. Guest history is merged into the account on signup.
- **Light / dark theme** and a configurable daily calorie target, both persisted locally.

## Tech stack

|                |                                                                           |
| -------------- | ------------------------------------------------------------------------- |
| Framework      | Expo SDK 54, React Native 0.81.5, React 19                                |
| Routing        | [expo-router](https://docs.expo.dev/router/introduction/) v6 (file-based) |
| Language       | TypeScript                                                                |
| Auth storage   | `expo-secure-store` (JWT)                                                 |
| Guest identity | `@react-native-async-storage/async-storage` + `expo-crypto` UUID          |
| Local prefs    | `@react-native-async-storage/async-storage` (theme, calorie target)       |
| Graphics       | `react-native-svg` (custom icons, charts)                                 |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- The [Expo Go](https://expo.dev/go) app on your iOS/Android device, or a configured simulator/emulator
- A running instance of the backend API

### Install & run

```bash
npm install
npx expo start
```

If your device and dev machine aren't on the same network (or the LAN QR code won't connect), use a tunnel:

```bash
npx expo start --tunnel
```

Then scan the QR code with Expo Go, or launch a specific platform:

```bash
npx expo start --ios       # iOS simulator
npx expo start --android   # Android emulator
npx expo start --web       # web browser
```


### Navigation notes

- The bottom tabs are **Profile**, **Log**, and **Dashboard**. The Profile tab button is intercepted in `_layout.tsx` to open the drawer rather than navigate.
- The drawer can also be opened by swiping in from the left edge of the screen.

## License

[MIT](LICENSE)
