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
const nikonZfDark = loadLogo("/maker/dark/nikon_zf.png");
const nikonLogoLight = loadLogo("/maker/light/nikon.png");
const nikonLogoDark = loadLogo("/maker/dark/nikon.png");

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

// Measure text width including inline logo
const measureTextWithLogo = (
  context: CanvasRenderingContext2D,
  text: string,
  fontSize: number
): number => {
  const LOGO_PLACEHOLDER = '\x00ZF\x00';
  if (!text.includes(LOGO_PLACEHOLDER)) {
    return context.measureText(text).width;
  }

  const parts = text.split(LOGO_PLACEHOLDER);
  let width = 0;
  for (const part of parts) {
    width += context.measureText(part).width;
  }
  // Add logo width
  const zfLogo = nikonZfLight;
  if (zfLogo && zfLogo.complete && zfLogo.naturalWidth > 0) {
    const logoHeight = fontSize * 0.85;
    const logoWidth = (zfLogo.naturalWidth / zfLogo.naturalHeight) * logoHeight;
    width += logoWidth;
  }
  return width;
};

const processTemplate = (
  template: string,
  photo: Photo,
  store: Store
): string => {
  // Preserve {NIKON_ZF_LOGO} through the template processing
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

const NIKON_ZF_OPTIONS: ThemeOption[] = [
  { id: 'ARTIST', type: 'string', default: '', description: 'your name' },
  { id: 'DARK_MODE', type: 'boolean', default: false, description: 'enable to use dark mode' },
  { id: 'SECONDARY_TEXT_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 300, description: '100 - 900' },
  { id: 'PADDING_TOP', type: 'number', default: 0, description: 'px' },
  { id: 'PADDING_BOTTOM', type: 'number', default: 0, description: 'px' },
  { id: 'PADDING_LEFT', type: 'number', default: 0, description: 'px' },
  { id: 'PADDING_RIGHT', type: 'number', default: 0, description: 'px' },
  { id: 'TEMPLATE1', type: 'string', default: 'Nikon {NIKON_ZF_LOGO} + {LENS}' },
  { id: 'TEMPLATE2', type: 'string', default: '{ISO}{MM}{F}{SEC}' },
  { id: 'TEMPLATE3', type: 'string', default: '{TAKEN_AT}' },
  { id: 'TEMPLATE4', type: 'string', default: '@_xsling_' },
  { id: 'RIGHT_SECTION_ALIGN', type: 'select', default: 'left', options: ['left', 'right'], description: 'align right section left or right' },
];

const NIKON_ZF_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const ARTIST = (input.get('ARTIST') as string).trim();
  const DARK_MODE = input.get('DARK_MODE') as boolean;
  const SECONDARY_TEXT_FONT_WEIGHT = input.get('SECONDARY_TEXT_FONT_WEIGHT') as number;
  const PADDING_TOP = input.get('PADDING_TOP') as number;
  const PADDING_BOTTOM = (input.get('PADDING_BOTTOM') as number) + 300;
  const PADDING_LEFT = input.get('PADDING_LEFT') as number;
  const PADDING_RIGHT = input.get('PADDING_RIGHT') as number;
  const TEMPLATE1 = (input.get('TEMPLATE1') as string).trim();
  const TEMPLATE2 = (input.get('TEMPLATE2') as string).trim();
  const TEMPLATE3 = (input.get('TEMPLATE3') as string).trim();
  const TEMPLATE4 = (input.get('TEMPLATE4') as string).trim();
  const RIGHT_SECTION_ALIGN = (input.get('RIGHT_SECTION_ALIGN') ?? 'left') as string;
  const FONT_SIZE = 70;
  const BACKGROUND_COLOR = DARK_MODE ? '#000000' : '#ffffff';
  const PRIMARY_TEXT_COLOR = DARK_MODE ? '#ffffff' : '#000000';
  const SECONDARY_TEXT_COLOR = DARK_MODE ? '#888888' : '#333333';

  const text1 = processTemplate(TEMPLATE1, photo, store);
  const text2 = processTemplate(TEMPLATE2, photo, store);
  const text3 = processTemplate(TEMPLATE3, photo, store);
  const text4 = processTemplate(TEMPLATE4, photo, store);

  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: BACKGROUND_COLOR,
    padding: { top: PADDING_TOP, right: PADDING_RIGHT, bottom: PADDING_BOTTOM, left: PADDING_LEFT },
  });
  const context = canvas.getContext('2d')!;
  context.textBaseline = 'middle';

  // LEFT FIRST
  context.textAlign = 'left';

  // Line 1 (top left) - supports inline Zf logo
  context.font = `normal 500 ${FONT_SIZE}px Barlow`;
  context.fillStyle = PRIMARY_TEXT_COLOR;

  drawTextWithInlineLogo(context, text1, FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 - FONT_SIZE / 2, DARK_MODE, FONT_SIZE);

  // Line 2 (bottom left)
  if (ARTIST) {
    context.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SIZE}px Barlow`;
    context.fillStyle = SECONDARY_TEXT_COLOR;
    context.fillText(`Shot by © ${ARTIST}`, FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE / 2);
  } else {
    context.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SIZE}px Barlow`;
    context.fillStyle = SECONDARY_TEXT_COLOR;
    drawTextWithInlineLogo(context, text3, FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE / 2, DARK_MODE, FONT_SIZE);
  }

  // RIGHT SECOND
  const isRightAlign = RIGHT_SECTION_ALIGN === 'right';

  // Measure text widths
  context.fillStyle = PRIMARY_TEXT_COLOR;
  context.font = `normal 500 ${FONT_SIZE}px Barlow`;
  const makerModelText = text2;
  const topWidth = measureTextWithLogo(context, makerModelText, FONT_SIZE);

  context.fillStyle = SECONDARY_TEXT_COLOR;
  context.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SIZE}px Barlow`;
  const lensModelText = text4;
  const bottomWidth = measureTextWithLogo(context, lensModelText, FONT_SIZE);

  const maxTextWidth = Math.max(topWidth, bottomWidth);

  if (isRightAlign) {
    context.textAlign = 'right';
    context.fillStyle = PRIMARY_TEXT_COLOR;
    context.font = `normal 500 ${FONT_SIZE}px Barlow`;
    context.fillText(makerModelText, canvas.width - FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 - FONT_SIZE / 2);
    context.fillStyle = SECONDARY_TEXT_COLOR;
    context.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SIZE}px Barlow`;
    context.fillText(lensModelText, canvas.width - FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE / 2);
    const lineX = canvas.width - maxTextWidth - FONT_SIZE * 2;
    context.beginPath();
    context.moveTo(lineX, canvas.height - PADDING_BOTTOM / 2 - FONT_SIZE);
    context.lineTo(lineX, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE);
  } else {
    const lineX = canvas.width - maxTextWidth - FONT_SIZE * 2;
    context.textAlign = 'left';
    context.fillStyle = PRIMARY_TEXT_COLOR;
    context.font = `normal 500 ${FONT_SIZE}px Barlow`;
    drawTextWithInlineLogo(context, makerModelText, lineX + FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 - FONT_SIZE / 2, DARK_MODE, FONT_SIZE);
    context.fillStyle = SECONDARY_TEXT_COLOR;
    context.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SIZE}px Barlow`;
    drawTextWithInlineLogo(context, lensModelText, lineX + FONT_SIZE, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE / 2, DARK_MODE, FONT_SIZE);
    context.beginPath();
    context.moveTo(lineX, canvas.height - PADDING_BOTTOM / 2 - FONT_SIZE);
    context.lineTo(lineX, canvas.height - PADDING_BOTTOM / 2 + FONT_SIZE);
  }
  context.strokeStyle = SECONDARY_TEXT_COLOR;
  context.lineWidth = 2;
  context.stroke();

  // DRAW Nikon LOGO (left of the divider line)
  const nikonLogo = DARK_MODE ? nikonLogoDark : nikonLogoLight;
  let TARGET_LOGO_HEIGHT = FONT_SIZE * 2;
  const TARGET_LOGO_WIDTH = 400;

  if (nikonLogo && nikonLogo.complete && nikonLogo.naturalWidth > 0) {
    let LOGO_WIDTH = (nikonLogo.naturalWidth / nikonLogo.naturalHeight) * TARGET_LOGO_HEIGHT;
    if (LOGO_WIDTH > TARGET_LOGO_WIDTH) {
      LOGO_WIDTH = TARGET_LOGO_WIDTH;
      TARGET_LOGO_HEIGHT = (nikonLogo.naturalHeight / nikonLogo.naturalWidth) * TARGET_LOGO_WIDTH;
    }
    const lineX = canvas.width - maxTextWidth - FONT_SIZE * 2;
    context.drawImage(
      nikonLogo,
      lineX - FONT_SIZE - LOGO_WIDTH,
      canvas.height - PADDING_BOTTOM / 2 - TARGET_LOGO_HEIGHT / 2,
      LOGO_WIDTH,
      TARGET_LOGO_HEIGHT
    );
  }

  return canvas;
};

export { NIKON_ZF_FUNC, NIKON_ZF_OPTIONS };
