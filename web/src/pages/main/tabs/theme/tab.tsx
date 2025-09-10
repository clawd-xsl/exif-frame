import { Navbar, Segmented, SegmentedButton } from 'konsta/react';
import { useTranslation } from 'react-i18next';
import { useThemeTabIndexStore } from '../../state/theme-tab-index.store';
import { LibraryTab } from './tabs/library/tab';
import { SearchTab } from './tabs/search/tab';
import { UploadTab } from './tabs/upload/tab';

export const ThemeTab = () => {
  const { t } = useTranslation();

  const { themeTabIndex, setThemeTabIndex } = useThemeTabIndexStore();

  return (
    <>
      <Navbar
        title={t('theme')}
        subnavbar={
          <Segmented strong>
            <SegmentedButton strong active={themeTabIndex === 0} onClick={() => setThemeTabIndex(0)}>
              {t('library')}
            </SegmentedButton>
            <SegmentedButton strong active={themeTabIndex === 1} onClick={() => setThemeTabIndex(1)}>
              {t('search')}
            </SegmentedButton>
            <SegmentedButton strong active={themeTabIndex === 2} onClick={() => setThemeTabIndex(2)}>
              {t('upload')}
            </SegmentedButton>
          </Segmented>
        }
      />

      {themeTabIndex === 0 && <LibraryTab />}
      {themeTabIndex === 1 && <SearchTab />}
      {themeTabIndex === 2 && <UploadTab />}
    </>
  );
};
