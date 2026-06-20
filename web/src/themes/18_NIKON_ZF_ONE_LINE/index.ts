import Photo from '../../core/photo';
import { Store } from '../../store';
import sandbox from '../../core/drawing/sandbox';
import { ThemeFunc } from '../../core/drawing/theme';
import { ThemeOption, ThemeOptionInput } from '../../pages/theme/types/theme-option';

const loadLogo = (pathname: string): HTMLImageElement => {
  const image = new Image();
  image.src = import.meta.env.BASE_URL + pathname.replace(/^\//, '');
  return image;
};

const nikonZfLight = loadLogo('/maker/light/nikon_zf.png');
const nikonZfDark = loadLogo('/maker/dark/nikon_zf.png');

// Helper: draw text that may contain {NIKON_ZF_LOGO} inline
const drawTextWithInlineLogo = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  darkMode: boolean,
  fontSize: number
): number => {
  const LOGO_PLACEHOLDER = '\x00ZF\x00';
  if (!text.includes(LOGO_PLACEHOLDER)) {
    context.fillText(text, x, y);
    return context.measureText(text).width;
  }

  const parts = text.split(LOGO_PLACEHOLDER);
  const before = parts[0] || '';
  const after = parts.slice(1).join('') || '';

  let curX = x;

  if (before) {
    context.fillText(before, curX, y);
    curX += context.measureText(before).width;
  }

  const zfLogo = darkMode ? nikonZfDark : nikonZfLight;
  if (zfLogo && zfLogo.complete && zfLogo.naturalWidth > 0) {
    const logoHeight = fontSize * 0.85;
    const logoWidth = (zfLogo.naturalWidth / zfLogo.naturalHeight) * logoHeight;
    context.drawImage(zfLogo, curX, y - logoHeight / 2, logoWidth, logoHeight);
    curX += logoWidth;
  }

  if (after) {
    context.fillText(after, curX, y);
    curX += context.measureText(after).width;
  }

  return curX - x;
};

const processTemplate = (
  template: string,
  photo: Photo,
  store: Store
): string => {
  const ZF_SENTINEL = '\x00ZF\x00';
  const tmpl = template.replace(/{NIKON_ZF_LOGO}/g, ZF_SENTINEL);

  const result = tmpl.split('}')
    .map((part) => `${part}}`)
    .map((part) =>
      part
        .replace(/{MAKER}/g, photo.make)
        .replace(/{BODY}/g, photo.model || '')
        .replace(/{LENS}/g, photo.lensModel || '')
        .replace(/{ISO}/g, store.disableExposureMeter ? '' : photo.iso || '')
        .replace(/{MM}/g, store.disableExposureMeter ? '' : photo.focalLength || '')
        .replace(/{F}/g, store.disableExposureMeter ? '' : photo.fNumber || '')
        .replace(/{SEC}/g, store.disableExposureMeter ? '' : photo.exposureTime || '')
        .replace(/{TAKEN_AT}/g, photo.takenAt || '')
        .replace(/}/g, '')
    )
    .filter(Boolean)
    .join(' ');

  return result;
};

const NIKON_ZF_ONE_LINE_OPTIONS: ThemeOption[] = [
  { id: 'ARTIST', type: 'string', default: '@_xsling_', description: 'your name (shown in gray below)' },
  { id: 'DARK_MODE', type: 'boolean', default: false, description: 'enable to use dark mode' },
  { id: 'SECONDARY_TEXT_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 300, description: '100 - 900' },
  { id: 'PADDING_TOP', type: 'number', default: 0, description: 'px' },
  { id: 'PADDING_BOTTOM', type: 'number', default: 0, description: 'px' },
  { id: 'PADDING_LEFT', type: 'number', default: 0, description: 'px' },
  { id: 'PADDING_RIGHT', type: 'number', default: 0, description: 'px' },
  { id: 'TEMPLATE_LEFT', type: 'string', default: 'Nikon {NIKON_ZF_LOGO}  {LENS}' },
  { id: 'TEMPLATE_RIGHT', type: 'string', default: '{ISO}  {MM}  {F}  {SEC}' },
  { id: 'TEMPLATE_ARTIST_RIGHT', type: 'string', default: '{TAKEN_AT}' },
];

const NIKON_ZF_ONE_LINE_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const ARTIST = (input.get('ARTIST') as string).trim();
  const DARK_MODE = input.get('DARK_MODE') as boolean;
  const SECONDARY_TEXT_FONT_WEIGHT = input.get('SECONDARY_TEXT_FONT_WEIGHT') as number;
  const PADDING_TOP = input.get('PADDING_TOP') as number;
  const PADDING_BOTTOM = (input.get('PADDING_BOTTOM') as number) + 300;
  const PADDING_LEFT = input.get('PADDING_LEFT') as number;
  const PADDING_RIGHT = input.get('PADDING_RIGHT') as number;
  const TEMPLATE_LEFT = (input.get('TEMPLATE_LEFT') as string).trim();
  const TEMPLATE_RIGHT = (input.get('TEMPLATE_RIGHT') as string).trim();
  const TEMPLATE_ARTIST_RIGHT = (input.get('TEMPLATE_ARTIST_RIGHT') as string).trim();
  const FONT_SIZE = 70;
  const BACKGROUND_COLOR = DARK_MODE ? '#000000' : '#ffffff';
  const PRIMARY_TEXT_COLOR = DARK_MODE ? '#ffffff' : '#000000';
  const SECONDARY_TEXT_COLOR = DARK_MODE ? '#888888' : '#333333';

  const textLeft = processTemplate(TEMPLATE_LEFT, photo, store);
  const textRight = processTemplate(TEMPLATE_RIGHT, photo, store);
  const textArtistRight = processTemplate(TEMPLATE_ARTIST_RIGHT, photo, store);

  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: BACKGROUND_COLOR,
    padding: { top: PADDING_TOP, right: PADDING_RIGHT, bottom: PADDING_BOTTOM, left: PADDING_LEFT },
  });

  const context = canvas.getContext('2d')!;
  context.textBaseline = 'middle';

  // Row 1 (top): camera info left, exposure right
  // Left
  context.textAlign = 'left';
  context.font = `normal 500 ${FONT_SIZE}px Barlow`;
  context.fillStyle = PRIMARY_TEXT_COLOR;
  drawTextWithInlineLogo(context, textLeft, FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 - FONT_SIZE / 2, DARK_MODE, FONT_SIZE);

  // Right
  context.textAlign = 'right';
  context.font = `normal 500 ${FONT_SIZE}px Barlow`;
  context.fillStyle = PRIMARY_TEXT_COLOR;
  drawTextWithInlineLogo(context, textRight, canvas.width - FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 - FONT_SIZE / 2, DARK_MODE, FONT_SIZE);

  // Row 2 (bottom): artist left, secondary info right — both in gray
  // Left - artist
  context.textAlign = 'left';
  context.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SIZE}px Barlow`;
  context.fillStyle = SECONDARY_TEXT_COLOR;
  if (ARTIST) {
    context.fillText(ARTIST, FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE / 2);
  }

  // Right - secondary info (taken_at etc)
  if (textArtistRight) {
    context.textAlign = 'right';
    context.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SIZE}px Barlow`;
    context.fillStyle = SECONDARY_TEXT_COLOR;
    context.fillText(textArtistRight, canvas.width - FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE / 2);
  }

  return canvas;
};

export { NIKON_ZF_ONE_LINE_FUNC, NIKON_ZF_ONE_LINE_OPTIONS };
