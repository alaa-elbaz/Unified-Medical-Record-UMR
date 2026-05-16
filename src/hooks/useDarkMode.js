// Re-export the shared dark-mode hook so existing imports of
// `useDarkMode` keep working but route through the single
// DarkModeProvider in App.jsx (no more competing copies of state).
export { useDarkModeContext as useDarkMode } from '../context/DarkModeContext.jsx';
