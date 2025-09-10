import { Page, Tabbar, TabbarLink } from 'konsta/react';
import { GalleryTab } from './tabs/gallery/tab';
import { ThemeTab } from './tabs/theme/tab';
import { SettingTab } from './tabs/setting/tab';
import { useEffect } from 'react';
import { RiGalleryFill, RiSettings3Fill } from 'react-icons/ri';
import { MdDesignServices } from 'react-icons/md';
import { useSettingStore } from './state/setting.store';
import Loading from './components/loading';
import { useDownloadsStore } from '../../state/downloads.store';
import { useThemeStore } from './state/theme.store';
import { useTabIndexStore } from './state/tab-index.store';
import { useTranslation } from 'react-i18next';

export const MainPage = () => {
  const { t } = useTranslation();
  const { tabIndex, setTabIndex } = useTabIndexStore();
  const initializeDarkMode = useSettingStore((state) => state.initializeDarkMode);
  const setSelectedIdStore = useDownloadsStore((s) => s.setSelectedId);
  const downloadsEntries = useDownloadsStore((s) => s.entries);

  useEffect(() => {
    initializeDarkMode();
  }, [initializeDarkMode]);

  // Keep active theme (svg/assets) in sync with currently selected downloaded theme
  const selectedId = useDownloadsStore((s) => s.selectedId);
  const selectedLocal = useDownloadsStore((s) => (s.selectedId ? s.entries[s.selectedId]?.local : null));
  const setSvg = useThemeStore((s) => s.setSvg);
  const setAssets = useThemeStore((s) => s.setAssets);
  useEffect(() => {
    if (selectedId == null || !selectedLocal) return;
    setSvg(selectedLocal.svg ?? '');
    setAssets(selectedLocal.assets ?? '');
  }, [selectedId, selectedLocal?.svg, selectedLocal?.assets, setSvg, setAssets]);

  // Auto-select latest downloaded theme when none is selected
  useEffect(() => {
    if (selectedId !== null) return;
    const list = Object.values(downloadsEntries);
    if (list.length === 0) return;
    const latest = list.reduce((a, b) => (a.downloadedAt >= b.downloadedAt ? a : b));
    setSelectedIdStore(latest.original.id);
  }, [selectedId, downloadsEntries, setSelectedIdStore]);

  return (
    <>
      <Loading />
      <Page style={{ paddingBottom: '10rem' }}>
        {tabIndex === 0 ? <GalleryTab /> : <></>}
        {tabIndex === 1 ? <ThemeTab /> : <></>}
        {tabIndex === 2 ? <SettingTab /> : <></>}

        <Tabbar labels={true} icons={true} className="left-0 bottom-0 fixed">
          <TabbarLink key={1} active={tabIndex == 0} label={t('gallery')} icon={<RiGalleryFill size={24} />} onClick={() => setTabIndex(0)} />
          <TabbarLink key={2} active={tabIndex == 1} label={t('theme')} icon={<MdDesignServices size={24} />} onClick={() => setTabIndex(1)} />
          <TabbarLink key={3} active={tabIndex == 2} label={t('setting')} icon={<RiSettings3Fill size={24} />} onClick={() => setTabIndex(2)} />
        </Tabbar>
      </Page>
    </>
  );
};
