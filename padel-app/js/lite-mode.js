import { getState } from './store.js';

// Flipped to true only in the separate "beta test" APK build (see
// build-apk-beta.sh), which flips this via sed before packaging - same
// codebase, no parallel app to maintain. In lite mode the app skips
// community/events/login entirely and opens straight on the scoreboard, so
// beta testers only see what they need to test remotes/tags without the
// rest of the app being visible.
export const LITE_MODE = false;

// Runtime equivalent, toggleable in-app from Home ("Modalità Interfaccia
// Light") and stored in settings.liteModeUser, so it persists across
// restarts until the player turns it off again - see js/screens/home.js and
// js/screens/scoreboard.js. Every place that used to read the static
// LITE_MODE constant should call isLiteMode() instead so it reacts on the
// very next render, no app restart required.
export function isLiteMode() {
  return LITE_MODE || !!getState().settings.liteModeUser;
}

// Only the user-toggled flavor can be turned back off from inside the app -
// the beta-build constant is intentionally permanent for the lifetime of
// that APK (see build-apk-beta.sh), so an "exit" button must never appear
// for it.
export function canExitLiteMode() {
  return !LITE_MODE && !!getState().settings.liteModeUser;
}
