export { useThemeStore, type Theme } from './store'
export { ThemeApplier } from './ThemeApplier'
export { CursorSmear } from './CursorSmear'
export {
  THEME_REGISTRY,
  DEFAULT_THEME,
  LEGACY_THEME_MAP,
  getThemeMetadata,
  getSelectableThemes,
  isThemeSelectable,
  resolveTheme,
  type ThemeMetadata,
  type ThemeStatus,
} from './registry'