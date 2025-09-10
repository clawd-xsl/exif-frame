import { Block, BlockTitle, Button, List, ListItem, Fab, Preloader } from 'konsta/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { fetchMyThemes, ThemeRecord } from '../../../../../../api/themes';
import { useAuthStore } from '../../../../../../state/auth.store';
import { RiAddFill, RiImageLine } from 'react-icons/ri';

export const UploadTab = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [themes, setThemes] = useState<ThemeRecord[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [total, setTotal] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const inFlightKeyRef = useRef<string | null>(null);
  const pageRef = useRef(page);
  const totalRef = useRef(total);
  const themesRef = useRef<ThemeRecord[]>(themes);
  const loadingInitialRef = useRef(loadingInitial);
  const loadingMoreRef = useRef(loadingMore);

  useEffect(() => { pageRef.current = page; }, [page]);
  useEffect(() => { totalRef.current = total; }, [total]);
  useEffect(() => { themesRef.current = themes; }, [themes]);
  useEffect(() => { loadingInitialRef.current = loadingInitial; }, [loadingInitial]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);

  const load = async (pageToLoad = 1, append = false) => {
    const key = `${pageToLoad}`;
    if (inFlightKeyRef.current === key) return;
    inFlightKeyRef.current = key;
    if (!token) return;
    try {
      if (append) setLoadingMore(true);
      else setLoadingInitial(true);
      setError(null);
      const res = await fetchMyThemes(token, { page: pageToLoad, pageSize });
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <>
        <Block strong inset>
          {t('login-required')}
        </Block>
        <Block inset>
          <Button onClick={() => navigate('/login')}>{t('login')}</Button>
        </Block>
      </>
    );
  }

  // const hasMore = themes.length < total;
  const openDetail = (id: number) => navigate(`/my/themes/${id}`);

  // Infinite scroll observer (attach once per token)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const hasMoreCurrent = themesRef.current.length < totalRef.current;
        if (entry.isIntersecting && !loadingMoreRef.current && !loadingInitialRef.current && hasMoreCurrent) {
          load(pageRef.current + 1, true);
        }
      },
      { root: null, rootMargin: '200px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      <BlockTitle>{t('my-themes')}</BlockTitle>
      {error ? (
        <Block strong inset>
          {error}
        </Block>
      ) : null}

      <List strongIos inset>
        {loadingInitial && themes.length === 0 ? <ListItem title={t('loading')} after={<Preloader />} /> : null}
        {themes.length === 0 && !loadingInitial ? <ListItem title={t('no-themes')} /> : null}
        {themes.map((th) => (
          <ListItem
            key={th.id}
            media={th.previewImageUrl ? <img src={th.previewImageUrl} alt="preview" width={44} height={44} /> : <RiImageLine size={28} />}
            title={th.title}
            subtitle={th.description || undefined}
            link
            onClick={() => openDetail(th.id)}
          />
        ))}
        {loadingMore ? <ListItem title={t('loading')} after={<Preloader />} /> : null}
        <div ref={sentinelRef} />
      </List>

      <Fab className="fixed right-4 bottom-24 z-10" icon={<RiAddFill />} onClick={() => navigate('/themes/new')} />
    </>
  );
};
