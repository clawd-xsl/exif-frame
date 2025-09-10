import { List, ListInput, BlockTitle } from 'konsta/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDownloadsStore, isModified, type DownloadedThemeEntry } from '../../../../../../state/downloads.store';
import { useThemeStore } from '../../../../state/theme.store';

export const LibraryTab = () => {
  const { t } = useTranslation();
  const { svg, setSvg, setAssets } = useThemeStore();
  const downloads = useDownloadsStore((s) => s.entries);
  const updateLocal = useDownloadsStore((s) => s.updateLocal);

  const downloadedList = useMemo(() => Object.values(downloads) as DownloadedThemeEntry[], [downloads]);
  const selectedIdStore = useDownloadsStore((s) => s.selectedId);
  const setSelectedIdStore = useDownloadsStore((s) => s.setSelectedId);
  const [selectedId, setSelectedId] = useState<number | ''>(selectedIdStore ?? '');
  const [assetsText, setAssetsText] = useState('');
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Initialize selection when list appears/disappears
  useEffect(() => {
    if (downloadedList.length === 0) {
      setSelectedId('');
      setAssetsText('');
      setAssetsError(null);
      setSelectedIdStore(null);
      return;
    }
    if (selectedId === '') {
      const first = downloadedList[0];
      setSelectedId(first.original.id);
      setSvg(first.local.svg ?? '');
      const nextAssets = first.local.assets ?? '';
      setAssetsText(nextAssets);
      setAssets(nextAssets);
      setAssetsError(null);
      setSelectedIdStore(first.original.id);
    }
  }, [downloadedList.length]);

  // When selection changes, sync current SVG/Assets from store
  useEffect(() => {
    if (selectedId === '') return;
    const found = downloadedList.find((e) => e.original.id === selectedId);
    if (!found) {
      setSelectedId('');
      setAssetsText('');
      setAssetsError(null);
      return;
    }
    setSvg(found.local.svg ?? '');
    const nextAssets = found.local.assets ?? '';
    setAssetsText(nextAssets);
    setAssets(nextAssets);
    setAssetsError(null);
  }, [selectedId]);

  const onChangeSelection: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const id = Number(e.target.value);
    setSelectedId(id);
    setSelectedIdStore(id);
    const entry = downloadedList.find((x) => x.original.id === id);
    if (entry && entry.local.svg) setSvg(entry.local.svg);
    if (entry) setAssets(entry.local.assets ?? '');
  };

  const onChangeSvg: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const value = e.target.value;
    setSvg(value);
    if (selectedId !== '') {
      updateLocal(selectedId, (prev) => ({ ...prev, svg: value }));
    }
  };

  const onChangeAssets: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const value = e.target.value;
    setAssetsText(value);
    // Validate JSON if not empty
    if (value.trim().length > 0) {
      try {
        JSON.parse(value);
        setAssetsError(null);
      } catch {
        setAssetsError(t('assets-invalid-json'));
      }
    } else {
      setAssetsError(null);
    }
    setAssets(value);
    if (selectedId !== '') {
      updateLocal(selectedId, (prev) => ({ ...prev, assets: value }));
    }
  };

  return (
    <>
      <BlockTitle>{t('downloaded-themes')}</BlockTitle>
      <List strongIos inset>
        <ListInput label={t('downloaded-themes')} type="select" dropdown value={selectedId === '' ? '' : String(selectedId)} onChange={onChangeSelection}>
          <option value="" disabled>
            {t('select')}
          </option>
          {downloadedList.map((e) => {
            const modified = isModified(e);
            return (
              <option key={e.original.id} value={e.original.id}>
                {e.original.title} {modified ? `(${t('modified')})` : ''}
              </option>
            );
          })}
        </ListInput>
      </List>

      <BlockTitle>{t('svg')}</BlockTitle>
      <div className="p-4 mt-2">
        <textarea
          value={svg}
          onChange={onChangeSvg}
          placeholder="Paste or edit SVG here"
          wrap="off"
          className="w-full h-[30vh] block resize-vertical p-3 font-mono text-xs overflow-x-auto rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:ring-neutral-700"
        />
      </div>

      <BlockTitle>{t('assets')}</BlockTitle>
      <div className="p-4 mt-2">
        <textarea
          value={assetsText}
          onChange={onChangeAssets}
          placeholder="Assets JSON"
          wrap="off"
          className="w-full h-[30vh] block resize-vertical p-3 font-mono text-xs overflow-x-auto rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:ring-neutral-700"
        />
        {assetsError ? <div>{assetsError}</div> : null}
      </div>
    </>
  );
};
