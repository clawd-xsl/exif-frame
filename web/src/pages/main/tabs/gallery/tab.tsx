import { Navbar, Toolbar, List, ListItem, Button } from 'konsta/react';
import { DownloadAllPicturesButton } from './components/download-all-pictures.button';
import { UploadPicturesButton } from './components/upload-pictures.button';
import { PicturesGrid } from './components/pictures.grid';
import { usePictureStore } from '../../state/picture.store';
import { useTranslation } from 'react-i18next';
import { useDownloadsStore } from '../../../../state/downloads.store';
import { useTabIndexStore } from '../../state/tab-index.store';
import { useThemeTabIndexStore } from '../../state/theme-tab-index.store';

export const GalleryTab = () => {
  const { t } = useTranslation();
  const { pictures } = usePictureStore();
  const entries = useDownloadsStore((s) => s.entries);
  const selectedId = useDownloadsStore((s) => s.selectedId);
  const setMainTab = useTabIndexStore((s) => s.setTabIndex);
  const setThemeSubTab = useThemeTabIndexStore((s) => s.setThemeTabIndex);

  const selected = selectedId != null ? entries[selectedId] : undefined;

  return (
    <>
      <Navbar title={t('gallery')} />

      {/* Floating selected theme info above tabbar/toolbars */}
      <div className="fixed left-0 right-0 bottom-24 z-10 px-4 pointer-events-none">
        <div className="pointer-events-auto">
          <List strongIos inset>
          <ListItem
              title={t('selected-theme')}
              subtitle={selected ? selected.original.title : t('none')}
              after={<Button small clear onClick={() => { setMainTab(1); setThemeSubTab(0); }}>{t('edit-in-library')}</Button>}
            />
          </List>
        </div>
      </div>

      <PicturesGrid />

      {pictures.length === 0 ? (
        <div className="flex items-center justify-center py-2">
          <div className="text-neutral-500 dark:text-neutral-400 text-sm font-medium select-none">{t('please-upload-the-photo')}</div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-2">
          <div className="text-neutral-500 dark:text-neutral-400 text-sm font-medium select-none">{t('N-photos-have-been-loaded').replace('{N}', pictures.length.toLocaleString())}</div>
        </div>
      )}

      <Toolbar className="bottom-12 fixed">
        <UploadPicturesButton />
        <DownloadAllPicturesButton />
      </Toolbar>
    </>
  );
};
