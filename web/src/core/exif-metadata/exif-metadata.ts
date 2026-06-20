import { Tags } from 'exifreader';

class ExifMetadata {
  public make: string | undefined;
  public model: string | undefined;
  public lensModel: string | undefined;
  public focalLength: string | undefined;
  public focalLengthIn35mm: string | undefined;
  public fNumber: string | undefined;
  public iso: string | undefined;
  public exposureTime: string | undefined;
  public thumbnail: string | undefined;
  public takenAt: string | undefined;

  constructor(metadata: Tags) {
    console.log(metadata);
    this.make = metadata?.Make?.description;
    this.model = metadata?.Model?.description;
    this.lensModel = this.model ? metadata?.LensModel?.description?.replace(this.model, '')?.trim() : metadata?.LensModel?.description;
    this.focalLength = metadata?.FocalLength?.description?.replace(' mm', 'mm');
    this.focalLengthIn35mm = metadata?.FocalLengthIn35mmFilm?.value
      ? `${metadata?.FocalLengthIn35mmFilm?.value}mm`
      : metadata?.UprightFocalLength35mm?.value
      ? metadata.UprightFocalLength35mm.value.includes('.')
        ? `${metadata.UprightFocalLength35mm.value.split('.').shift()}mm`
        : `${metadata.UprightFocalLength35mm.value}mm`
      : undefined;
    this.fNumber = metadata?.FNumber?.description?.substring(0, 5)?.replace('f/', 'F');

    // Fix: ISOSpeedRatings.value can be an array or object in some formats (PNG, etc.)
    if (metadata?.ISOSpeedRatings?.value) {
      const isoVal = metadata.ISOSpeedRatings.value;
      const isoNum = Array.isArray(isoVal) ? isoVal[0] : (typeof isoVal === 'object' ? metadata.ISOSpeedRatings.description : isoVal);
      this.iso = isoNum !== undefined ? 'ISO' + String(isoNum) : undefined;
    } else if (metadata?.ISOSpeedRatings?.description) {
      this.iso = 'ISO' + metadata.ISOSpeedRatings.description;
    }

    this.exposureTime = metadata?.ExposureTime?.description ? metadata?.ExposureTime?.description + 's' : undefined;
    this.thumbnail = metadata?.Thumbnail?.base64 ? 'data:image/jpg;base64,' + metadata?.Thumbnail?.base64 : undefined;

    if (metadata?.DateTimeOriginal?.description) {
      const parts = metadata.DateTimeOriginal.description.split(' ');
      if (parts.length >= 2) {
        const yyyymmdd = parts[0].split(':').join('-');
        const hhmmss = parts[1];
        this.takenAt = `${yyyymmdd} ${hhmmss}`;
      } else {
        this.takenAt = metadata.DateTimeOriginal.description;
      }
    } else if (metadata?.DateTimeOriginal?.value) {
      // Some formats store value as array
      const val = Array.isArray(metadata.DateTimeOriginal.value) ? metadata.DateTimeOriginal.value[0] : metadata.DateTimeOriginal.value;
      if (typeof val === 'string') {
        const parts = val.split(' ');
        if (parts.length >= 2) {
          this.takenAt = parts[0].split(':').join('-') + ' ' + parts[1];
        } else {
          this.takenAt = val;
        }
      }
    } else if (metadata?.DateTime?.description) {
      const parts = metadata.DateTime.description.split(' ');
      if (parts.length >= 2) {
        const yyyymmdd = parts[0].split(':').join('-');
        const hhmmss = parts[1];
        this.takenAt = `${yyyymmdd} ${hhmmss}`;
      }
    }
  }
}

export default ExifMetadata;
