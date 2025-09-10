import { Block, BlockTitle, Button, Card, List, ListItem, Navbar, NavbarBackLink, Page, Preloader } from 'konsta/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchTheme, incrementDownload, ThemeRecord } from '../../../api/themes';
import { RiImageLine } from 'react-icons/ri';
import { useDownloadsStore, isModified } from '../../../state/downloads.store';

const ThemePublicPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const id = Number(params.id);

  const [theme, setTheme] = useState<ThemeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloads = useDownloadsStore((s) => s.entries);
  const setDownloaded = useDownloadsStore((s) => s.setDownloaded);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchTheme(id);
      setTheme(res.theme);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Page>
      <Navbar title={theme ? theme.title : t('loading')} left={<NavbarBackLink text={t('back')} onClick={() => navigate(-1)} />} />

      {loading ? (
        <Block strong inset>
          <Preloader />
        </Block>
      ) : null}

      {error ? (
        <Block strong inset>
          {error}
        </Block>
      ) : null}

      {theme ? (
        <>
          {theme.previewImageUrl ? (
            <Card className="m-4">
              <img src={theme.previewImageUrl} alt="preview" style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }} />
            </Card>
          ) : (
            <Card className="m-4">
              <RiImageLine size={64} />
            </Card>
          )}

          <Block strong inset>
            {(() => {
              const entry = downloads[theme.id];
              const downloaded = !!entry;
              const modified = entry ? isModified(entry) : false;
              const outdated = downloaded ? theme.updatedAt > (entry!.original.updatedAt || 0) : false;
              if (!downloaded) {
                return (
                  <Button
                    large
                    onClick={async () => {
                      try {
                        const res = await incrementDownload(theme.id);
                        setTheme({ ...theme, downloadCount: res.downloadCount });
                      } catch (error) {
                        console.log(error);
                      }
                      setDownloaded(theme);
                    }}
                  >
                    {t('download')}
                  </Button>
                );
              }
              return (
                <>
                  <Button large disabled>
                    {modified && outdated ? `${t('downloaded-modified')} · ${t('update-available')}` : modified ? t('downloaded-modified') : outdated ? t('update-available') : t('downloaded')}
                  </Button>
                  {outdated ? (
                    <Button
                      large
                      clear
                      onClick={async () => {
                        try {
                          const inc = await incrementDownload(theme.id);
                          const latest = await fetchTheme(theme.id);
                          setTheme({ ...latest.theme, downloadCount: inc.downloadCount });
                          setDownloaded(latest.theme);
                        } catch (error) {
                          console.log(error);
                        }
                      }}
                    >
                      {t('update-to-latest')}
                    </Button>
                  ) : modified ? (
                    <Button
                      large
                      clear
                      onClick={async () => {
                        try {
                          const inc = await incrementDownload(theme.id);
                          const latest = await fetchTheme(theme.id);
                          setTheme({ ...latest.theme, downloadCount: inc.downloadCount });
                          setDownloaded(latest.theme);
                        } catch (error) {
                          console.log(error);
                        }
                      }}
                    >
                      {t('restore-original')}
                    </Button>
                  ) : null}
                  <Button large clear onClick={() => useDownloadsStore.getState().remove(theme.id)}>
                    {t('remove-download')}
                  </Button>
                </>
              );
            })()}
          </Block>

          <BlockTitle>{t('creator')}</BlockTitle>
          <List strongIos inset>
            <ListItem title={theme.ownerNickname || '-'} />
          </List>

          <BlockTitle>{t('description')}</BlockTitle>
          <List strongIos inset>
            <ListItem title={theme.description || '-'} />
          </List>

          <BlockTitle>{t('details')}</BlockTitle>
          <List strongIos inset>
            <ListItem title={`ID #${theme.id}`} />
            <ListItem title={`Downloads: ${theme.downloadCount}`} />
            <ListItem title={`Updated: ${new Date(theme.updatedAt).toLocaleString()}`} />
          </List>
        </>
      ) : null}
    </Page>
  );
};

export default ThemePublicPage;
