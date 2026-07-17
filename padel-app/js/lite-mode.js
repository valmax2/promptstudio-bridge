// Flipped to true only in the separate "beta test" APK build (see
// build-apk-beta.sh), which flips this via sed before packaging - same
// codebase, no parallel app to maintain. In lite mode the app skips
// community/events/login entirely and opens straight on the scoreboard, so
// beta testers only see what they need to test remotes/tags without the
// rest of the app being visible.
export const LITE_MODE = false;
