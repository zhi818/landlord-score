import { useEffect, useState } from 'react';
import { THEME } from './constants';
import { loadTheme, saveTheme } from './lib/storage';
import { isMobile, getUrlParams } from './lib/device';
import HostView from './components/pc/HostView';
import PhoneRoot from './components/phone/PhoneRoot';
import ModePicker from './views/ModePicker';
import LocalGameView from './views/LocalGameView';

function getInitialTheme() {
  const saved = loadTheme();
  if (saved === THEME.LIGHT || saved === THEME.DARK) return saved;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEME.DARK;
  }
  return THEME.LIGHT;
}

function PhoneHost() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [params, setParams] = useState(() => getUrlParams());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === THEME.DARK ? THEME.LIGHT : THEME.DARK));
  }

  function resetSlot() {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('player');
    window.history.replaceState({}, '', url.toString());
    setParams({ room: null, player: null });
  }

  return (
    <div className="phone-shell">
      <button
        className="theme-toggle phone-theme-toggle"
        onClick={toggleTheme}
        aria-label="切换主题"
      >
        {theme === THEME.DARK ? '☀' : '☾'}
      </button>
      <PhoneRoot
        roomCode={params.room}
        playerSlot={params.player}
        onResetSlot={resetSlot}
      />
    </div>
  );
}

function PcHost() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === THEME.DARK ? THEME.LIGHT : THEME.DARK));
  }

  return <HostView theme={theme} onToggleTheme={toggleTheme} />;
}

function useModeRoute() {
  const [mode, setMode] = useState(() => {
    const m = new URLSearchParams(window.location.search).get('mode');
    if (m === 'online' || m === 'local') return m;
    return null;
  });
  useEffect(() => {
    const onPop = () => {
      const m = new URLSearchParams(window.location.search).get('mode');
      setMode(m === 'online' || m === 'local' ? m : null);
    };
    window.addEventListener('popstate', onPop);
    // 也监听自己 dispatch 的 popstate
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return mode;
}

function Shell({ children }) {
  // 在 mode picker 时,主题也要跟随系统/已保存的设置
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveTheme(theme);
  }, [theme]);
  return children(theme, () => setTheme((t) => (t === THEME.DARK ? THEME.LIGHT : THEME.DARK)));
}

export default function App() {
  const mode = useModeRoute();

  if (mode === 'local') {
    return (
      <Shell>
        {(theme, toggle) => <LocalGameView theme={theme} onToggleTheme={toggle} />}
      </Shell>
    );
  }

  if (mode === 'online') {
    const mobile = isMobile();
    const params = getUrlParams();
    const phoneMode = mobile || !!params.room;
    return phoneMode ? <PhoneHost /> : <PcHost />;
  }

  // 默认:模式选择
  return <ModePicker />;
}