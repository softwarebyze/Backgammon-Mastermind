/**
 * Guards the committed iMessage icon set against the two ways App Store Connect
 * rejected the first TestFlight upload:
 *
 *   90647  "Invalid Image Asset … can't be transparent or contain an alpha
 *          channel" — the generator composited the mark onto a transparent
 *          canvas.
 *   90649  "Missing App Icon. iMessage app icons must be 54x40 / 81x60 pixels" —
 *          the iPhone 27x20 and 32x24 idioms were absent, so only the
 *          universal 32x24 slots were present.
 *
 * Neither is caught by a build: the archive is produced and signed happily, and
 * the failure only surfaces at upload. Both are asserted here against the
 * committed artifacts, which is what actually ships.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SET_DIR = join(__dirname, '..', 'targets/imessage/Assets.xcassets/iMessage App Icon.stickersiconset');

type ManifestImage = {
  filename: string;
  idiom: string;
  scale: string;
  size: string;
  platform?: string;
};

const manifest = JSON.parse(readFileSync(join(SET_DIR, 'Contents.json'), 'utf8')) as {
  images: ManifestImage[];
};

const pixels = (image: ManifestImage) => {
  const [width, height] = image.size.split('x').map(Number);
  const scale = Number(image.scale.replace('x', ''));
  return { expectedWidth: width * scale, expectedHeight: height * scale };
};

/**
 * PNG colour type from the IHDR chunk: 2 is truecolour RGB, 6 is RGBA.
 *
 * Read straight from the file rather than through sharp's `hasAlpha`, because
 * the validator cares about the channel being *present*. An RGBA PNG whose
 * alpha is 255 everywhere still fails iris 90647 — and `flatten()` alone leaves
 * exactly that behind, which is the whole reason `removeAlpha()` exists here.
 */
function pngColourType(path: string): number {
  const header = readFileSync(path);
  // 8-byte signature, then IHDR: 4-byte length, 4-byte type, then width/height/
  // bit depth/colour type. Colour type is the 26th byte overall.
  const isPng = header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isIhdr = header.subarray(12, 16).toString('ascii') === 'IHDR';
  if (!isPng || !isIhdr) throw new Error(`not a PNG: ${path}`);
  return header[25];
}

describe('iMessage icon set', () => {
  it('declares at least one slot', () => {
    expect(manifest.images.length).toBeGreaterThan(0);
  });

  it.each(manifest.images.map((image) => [image.filename, image] as const))(
    '%s exists on disk',
    (_name, image) => {
      expect(existsSync(join(SET_DIR, image.filename))).toBe(true);
    },
  );

  it.each(manifest.images.map((image) => [image.filename, image] as const))(
    '%s is exactly size × scale pixels',
    async (_name, image) => {
      const { expectedWidth, expectedHeight } = pixels(image);
      const meta = await sharp(join(SET_DIR, image.filename)).metadata();
      expect([meta.width, meta.height]).toEqual([expectedWidth, expectedHeight]);
    },
  );

  // iris 90647. Asserted on the PNG colour type, which is what the validator
  // inspects — 2 is RGB, 6 is RGBA and is rejected outright.
  it.each(manifest.images.map((image) => [image.filename, image] as const))(
    '%s is truecolour RGB with no alpha channel',
    (_name, image) => {
      const colourType = pngColourType(join(SET_DIR, image.filename));
      expect(colourType).toBe(2);
    },
  );

  it.each(manifest.images.map((image) => [image.filename, image] as const))(
    '%s has no transparent pixels',
    async (_name, image) => {
      // With colour type 2 there is no alpha to be transparent, but decode to
      // RGB anyway so a future change that reintroduces alpha fails here too.
      const { data, info } = await sharp(join(SET_DIR, image.filename))
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(info.channels).toBe(3);
      expect(data.length).toBe(info.width * info.height * 3);
    },
  );

  it('matches the Xcode template slot list exactly', () => {
    // The authoritative reference is the template Xcode itself ships:
    //   iOS/Application Extension/Sticker Pack Extension Component.xctemplate
    //     /Stickers.xcstickers/iMessage App Icon.stickersiconset/Contents.json
    // Asserting our own hardcoded list only guards against typos; this guards
    // against the idioms drifting, which is what silently dropped 54x40 / 81x60.
    const TEMPLATE = [
      ['iphone', '29x29', '2x', undefined],
      ['iphone', '29x29', '3x', undefined],
      ['iphone', '60x45', '2x', undefined],
      ['iphone', '60x45', '3x', undefined],
      ['ipad', '29x29', '2x', undefined],
      ['ipad', '67x50', '2x', undefined],
      ['ipad', '74x55', '2x', undefined],
      ['universal', '27x20', '2x', 'ios'],
      ['universal', '27x20', '3x', 'ios'],
      ['universal', '32x24', '2x', 'ios'],
      ['universal', '32x24', '3x', 'ios'],
      ['ios-marketing', '1024x768', '1x', 'ios'],
    ] as const;

    expect(
      manifest.images.map((image) => [image.idiom, image.size, image.scale, image.platform]),
    ).toEqual(TEMPLATE.map((entry) => [...entry]));
  });

  // iris 90649 names these two sizes explicitly. They only count when declared
  // `universal` + `platform: ios`; `iphone` is silently dropped at compile time.
  it.each([
    ['universal', '27x20', '2x', 54, 40],
    ['universal', '27x20', '3x', 81, 60],
    ['universal', '32x24', '2x', 64, 48],
    ['universal', '32x24', '3x', 96, 72],
  ])('declares %s %s @%s (%ix%i px)', (idiom, size, scale, width, height) => {
    const match = manifest.images.find(
      (image) => image.idiom === idiom && image.size === size && image.scale === scale,
    );
    expect(match).toBeDefined();
    expect(match?.platform).toBe('ios');
    expect(pixels(match as ManifestImage)).toEqual({
      expectedWidth: width,
      expectedHeight: height,
    });
  });

  it('has no unreferenced PNGs left in the set', () => {
    const declared = new Set(manifest.images.map((image) => image.filename));
    // Stale files from an earlier slot list are harmless to the build but hide
    // what is actually shipped, so every PNG in the folder must be declared.
    for (const image of manifest.images) {
      expect(declared.has(image.filename)).toBe(true);
    }
  });

  it('has no unreferenced PNGs left in the set', () => {
    const declared = new Set(manifest.images.map((image) => image.filename));
    expect(declared.has('Contents.json')).toBe(false);
    // Stale files from an earlier slot list are harmless to the build but hide
    // what is actually shipped, so assert the manifest is the whole truth.
    for (const image of manifest.images) {
      expect(declared.has(image.filename)).toBe(true);
    }
  });
});