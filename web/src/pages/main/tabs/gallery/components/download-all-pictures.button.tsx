import { Button } from 'konsta/react';
import { IoDownloadOutline } from 'react-icons/io5';
import { useLoadingStore } from '../../../state/loading.store';
import { usePictureStore } from '../../../state/picture.store';
import { useSettingStore } from '../../../state/setting.store';
import { useThemeStore } from '../../../state/theme.store';
import { dumpExifMetadata, replaceExifMetadata } from 'exif-curator';
import { SvgConverter } from '../../../core/svg/converter';
import download from '../../../core/download';
import { useTranslation } from 'react-i18next';

export const DownloadAllPicturesButton = () => {
  const { t } = useTranslation();
  const { pictures } = usePictureStore();
  const { svg, assets } = useThemeStore();
  const { webpMode, maintainExifMetadata } = useSettingStore();
  const { setLoading } = useLoadingStore();

  const handleClick = async () => {
    if (!pictures || pictures.length === 0) return;
    if (!svg || svg.trim().length === 0) {
      alert(t('please-select-theme-in-library'));
      return;
    }
    setLoading(true);
    try {
      const fileExtension = webpMode ? 'webp' : 'jpeg';
      let failed = 0;
      for (const picture of pictures) {
        try {
          // Try to dump EXIF; if it fails, skip restore for this picture
          let dumpedExifMetadata: unknown = null;
          if (maintainExifMetadata) {
            try {
              dumpedExifMetadata = await dumpExifMetadata(await picture.loadDataUrl());
            } catch (e) {
              console.warn('No EXIF or dump failed; skipping restore for', picture.file.name, e);
              dumpedExifMetadata = null;
            }
          }
          const convertedImage = webpMode ? await SvgConverter.toWebp(svg, picture, assets) : await SvgConverter.toJpeg(svg, picture, assets);
          let payload: BlobPart = convertedImage as BlobPart;
          if (dumpedExifMetadata) {
            try {
              payload = (await replaceExifMetadata(convertedImage, dumpedExifMetadata as any)) as BlobPart;
            } catch (e) {
              console.warn('Replacing EXIF failed; using converted image as-is for', picture.file.name, e);
              payload = convertedImage as BlobPart;
            }
          }
          const blob = new Blob([payload], { type: `image/${fileExtension}` });
          const url = URL.createObjectURL(blob);
          const baseName = picture.file.name.replace(/\.[^.]+$/, '');
          await download(`exif_frame_${baseName}.${fileExtension}`, url);
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('convert failed for', picture.file.name, err);
          failed++;
          continue;
        }
      }
      if (failed > 0) {
        alert(t('N-photos-failed').replace('{N}', String(failed)));
      }
    } catch (err) {
      console.error(err);
      alert(t('photo-conversion-error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button clear onClick={handleClick} disabled={!pictures || pictures.length === 0}>
        <IoDownloadOutline size={18} />
        <div style={{ width: 4 }} />
        {t('download-all')}
      </Button>
    </>
  );
};
