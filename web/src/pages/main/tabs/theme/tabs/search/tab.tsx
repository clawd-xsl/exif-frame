import { Block, BlockTitle, List, ListItem, Preloader, Searchbar, Segmented, SegmentedButton, Toolbar } from 'konsta/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { searchThemes, ThemeRecord } from '../../../../../../api/themes';
import { RiImageLine, RiDownloadLine } from 'react-icons/ri';
import { useDownloadsStore, isModified } from '../../../../../../state/downloads.store';

export const SearchTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const downloads = useDownloadsStore((s) => s.entries);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'downloaded'>('all');
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const inFlightKeyRef = useRef<string | null>(null);
  const queryRef = useRef(query);
  const pageRef = useRef(page);
  const totalRef = useRef(total);
  const themesRef = useRef<ThemeRecord[]>(themes);
  const loadingInitialRef = useRef(loadingInitial);
  const loadingMoreRef = useRef(loadingMore);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    totalRef.current = total;
  }, [total]);
  useEffect(() => {
    themesRef.current = themes;
  }, [themes]);
  useEffect(() => {
    loadingInitialRef.current = loadingInitial;
  }, [loadingInitial]);
  useEffect(() => {
    loadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  const load = async (q: string, pageToLoad = 1, append = false) => {
    const key = `${q}|${pageToLoad}`;
    if (inFlightKeyRef.current === key) return;
    inFlightKeyRef.current = key;
    try {
      if (append) setLoadingMore(true);
      else setLoadingInitial(true);
      setError(null);
      const res = await searchThemes({ title: q || undefined, page: pageToLoad, pageSize, sort: 'downloadCount', order: 'desc' });
      setTotal(res.total);
      setPage(res.page);
      setThemes((prev) => (append ? dedupeById([...prev, ...res.themes]) : res.themes));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      inFlightKeyRef.current = null;
    }
  };

  useEffect(() => {
    // initial
    load('');
  }, []);

  // Simple debounce
  useEffect(() => {
    const h = setTimeout(() => {
      // reset to first page on new query
      load(query.trim(), 1, false);
    }, 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // const hasMore = themes.length < total;

  // Infinite scroll observer (attach once)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const hasMoreCurrent = themesRef.current.length < totalRef.current;
        if (entry.isIntersecting && !loadingMoreRef.current && !loadingInitialRef.current && hasMoreCurrent) {
          load(queryRef.current.trim(), pageRef.current + 1, true);
        }
      },
      { root: null, rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dedupeById(items: ThemeRecord[]): ThemeRecord[] {
    const seen = new Set<number>();
    const out: ThemeRecord[] = [];
    for (const it of items) {
      if (!seen.has(it.id)) {
        seen.add(it.id);
        out.push(it);
      }
    }
    return out;
  }

  return (
    <>
      <Toolbar top>
        <Searchbar value={query} onChange={(e) => setQuery((e.target as HTMLInputElement).value)} placeholder={t('search')} />
      </Toolbar>

      <Toolbar top>
        <Segmented strong>
          <SegmentedButton strong active={filter === 'all'} onClick={() => setFilter('all')}>
            {t('all')}
          </SegmentedButton>
          <SegmentedButton strong active={filter === 'downloaded'} onClick={() => setFilter('downloaded')}>
            {t('downloaded')}
          </SegmentedButton>
        </Segmented>
      </Toolbar>

      {error ? (
        <Block strong inset>
          {error}
        </Block>
      ) : null}

      <BlockTitle>{t('search-results')}</BlockTitle>
      <List strongIos inset>
        {loadingInitial && themes.length === 0 ? <ListItem title={t('loading')} after={<Preloader />} /> : null}
        {(filter === 'downloaded' ? themes.filter((t) => downloads[t.id]) : themes).length === 0 && !loadingInitial ? <ListItem title={t('no-results')} /> : null}
        {(filter === 'downloaded' ? themes.filter((t) => downloads[t.id]) : themes).map((th) => {
          const entry = downloads[th.id];
          const downloaded = !!entry;
          const modified = entry ? isModified(entry) : false;
          const outdated = downloaded ? th.updatedAt > (entry?.original.updatedAt || 0) : false;
          const status = downloaded
            ? modified && outdated
              ? `${t('downloaded-modified')} · ${t('update-available')}`
              : modified
              ? t('downloaded-modified')
              : outdated
              ? t('update-available')
              : t('downloaded')
            : undefined;
          return (
            <ListItem
              key={th.id}
              media={th.previewImageUrl ? <img src={th.previewImageUrl} alt="preview" width={44} height={44} /> : <RiImageLine size={28} />}
              title={th.title}
              subtitle={(th.ownerNickname ? th.ownerNickname : '') + (th.description ? (th.ownerNickname ? ' · ' : '') + th.description : '') || undefined}
              after={
                <span>
                  <RiDownloadLine size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> {th.downloadCount}
                  {status ? ` · ${status}` : ''}
                </span>
              }
              link
              onClick={() => navigate(`/themes/${th.id}`)}
            />
          );
        })}
        {loadingMore ? <ListItem title={t('loading')} after={<Preloader />} /> : null}
        <div ref={sentinelRef} />
      </List>
    </>
  );
};
