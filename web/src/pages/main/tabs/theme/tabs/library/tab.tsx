import { List, ListInput, BlockTitle } from 'konsta/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDownloadsStore, isModified, type DownloadedThemeEntry } from '../../../../../../state/downloads.store';
import { useThemeStore } from '../../../../state/theme.store';

export const LibraryTab = () => {
  const { t } = useTranslation();
  const { svg, setSvg } = useThemeStore();
  const downloads = useDownloadsStore((s) => s.entries);
  const updateLocal = useDownloadsStore((s) => s.updateLocal);

  const downloadedList = useMemo(() => Object.values(downloads) as DownloadedThemeEntry[], [downloads]);
  const [selectedId, setSelectedId] = useState<number | ''>('');

  // Initialize selection to first downloaded
  useEffect(() => {
    if (downloadedList.length === 0) {
      setSelectedId('');
      return;
    }
    if (selectedId === '') {
      const first = downloadedList[0];
      setSelectedId(first.original.id);
      if (first.local.svg) setSvg(first.local.svg);
    } else {
      const found = downloadedList.find((e) => e.original.id === selectedId);
      if (!found) setSelectedId('');
    }
  }, [downloadedList]);

  const onChangeSelection: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const id = Number(e.target.value);
    setSelectedId(id);
    const entry = downloadedList.find((x) => x.original.id === id);
    if (entry && entry.local.svg) setSvg(entry.local.svg);
  };

  const onChangeSvg: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const value = e.target.value;
    setSvg(value);
    if (selectedId !== '') {
      updateLocal(selectedId, (prev) => ({ ...prev, svg: value }));
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

      <div className="p-4">
        <textarea
          value={svg}
          onChange={onChangeSvg}
          placeholder="Paste or edit SVG here"
          wrap="off"
          className="w-full h-[60vh] block resize-vertical p-3 font-mono text-xs overflow-x-auto rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:ring-neutral-700"
        />
      </div>
    </>
  );
};
