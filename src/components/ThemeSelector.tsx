import { useThemeStore, themeInfo, ThemeName } from '../store/themeStore';

const ThemeSelector = () => {
  const { theme, setTheme } = useThemeStore();

  const themes: ThemeName[] = ['default', 'blueprint', 'soft-minimal'];

  return (
    <div className="theme-selector">
      <label className="theme-label">Theme</label>
      <div className="theme-buttons">
        {themes.map((t) => (
          <button
            key={t}
            className={`theme-btn ${theme === t ? 'active' : ''}`}
            onClick={() => setTheme(t)}
            title={themeInfo[t].description}
          >
            <span className={`theme-icon theme-icon-${t}`} />
            <span className="theme-name">{themeInfo[t].name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;
