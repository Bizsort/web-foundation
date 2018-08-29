import { ImageType } from '../model/foundation'
import { Image as ImageSettings } from '../settings'
export { ImageType, ImageSettings }

interface ImageSize {
    Width: number;
    Height: number;
}

export class ImageHelper {
    src: string;
    type: ImageType;
    preserveFormat: boolean;
    minSze: ImageSize;
    maxSize: ImageSize;

    constructor(imgData, minSze?: ImageSize, maxSize?: ImageSize) {
        this.src = imgData.src;
        this.type = imgData.type || ImageType.Jpeg;
        this.preserveFormat = imgData.preserveFormat !== undefined ? imgData.preserveFormat : false;

        /*this.minSze = minSze || ImageSettings.Thumbnail;
        this.maxSize = maxSize || (this.entity == ImageEntity.Person ? ImageSettings.XtraSmall : ImageSettings.Medium);
        if (this.entity == ImageEntity.Business && !minSze) {
            this.minSze = ImageSettings.WideThumbnail;
            this.maxSize.Height = this.maxSize.Width;
            this.maxSize.Width *= 2;
        }*/
        this.minSze = minSze || ImageSettings.Thumbnail;
        this.maxSize = maxSize || ImageSettings.Medium;
    }

    process(callback) {
        //https://github.com/Microsoft/TypeScript/issues/4166 global namespace
        var image = new Image()/*document.createElement("img")*/;
        image.style.display = "none";
        image.setAttribute('crossOrigin', 'anonymous'); //img.crossOrigin = "";
        image.onload = () => {
            var width = 0, height = 0, resized, preview;

            var sizedImage = this.resize(image, this.maxSize, false);
            if (!sizedImage) {
                var bounds = this.getBounds(image, this.minSze);
                if (this.fitsThreshold(image, bounds, ImageSettings.SizeThreshold))
                    sizedImage = this.render(image, image.width, image.height);
            }

            if (sizedImage) {
                if (!(this.type == ImageType.Jpeg || this.type == ImageType.Png || this.type == ImageType.Gif)) {
                    this.type = ImageType.Jpeg;

                    if (this.preserveFormat)
                        this.preserveFormat = false;
                }

                resized = {
                    Type: this.type,
                    Width: sizedImage.width,
                    Height: sizedImage.height,
                    Content: this.getDataURL(sizedImage, this.type, ImageSettings.JpegQuality / 100)
                };

                sizedImage = this.resize(image, ImageSettings.Small, true);
                if (sizedImage) {
                    preview = {
                        Width: sizedImage.width,
                        Height: sizedImage.height,
                        Content: this.getDataURL(sizedImage, this.type)
                    };
                }

                callback(resized, preview);
            }
        };
        image.onerror = () => {
            callback(false);
        };
        image.src = this.src;
    }

    resize (image, target, preview) {
        var bounds = this.getBounds(image, target);
        if (image.width > bounds.width || image.height > bounds.height) {
            var width = image.width;
            var height = image.height;

            //Foundation.Image.Resize
            var newWidth = width;
            var widthD = newWidth / 1000;
            var newHeight = height;
            var heightD = newHeight / 1000;
            while (newWidth > bounds.width || newHeight > bounds.height) {
                newWidth -= widthD;
                newHeight -= heightD;
            }

            var scaleX = 1;
            var scaleY = 1;

            if (width > newWidth)
                scaleX = newWidth / width;
            if (height > newHeight)
                scaleY = newHeight / height;

            var scale = Math.min(scaleX, scaleY);

            height = height * scale;
            width = width * scale;
        }
        else if (this.fitsThreshold(image, bounds, ImageSettings.SizeThreshold) || preview) {
            width = image.width;
            height = image.height;
            //return image; //Image doesn't have toDataURL method that is used to convert to Jpeg, so preview may not be accurate
        }
        else
            return;

        return this.render(image, width, height);
    }

    getBounds (image, target) {
        var maxWidth, maxHeight;
        if (target.Width > target.Height || image.width > image.height) {
            maxWidth = target.Width;
            maxHeight = target.Height || target.Width;
        }
        else {
            maxHeight = target.Width;
            maxWidth = target.Height || target.Width;
        }

        return {
            width: maxWidth,
            height: maxHeight
        }
    }

    /*getBounds (image, target) {
        var maxWidth, maxHeight;
        if (target.Orientation == ImageOrientation.Landscape || image.width > image.height) {
            maxWidth = target.Size;
            maxHeight = target.Size / target.AspectRatio;
        }
        else {
            maxHeight = target.Size;
            maxWidth = target.Size / target.AspectRatio;
        }

        return {
            width: maxWidth,
            height: maxHeight
        }
    }*/

    fitsThreshold (image, bounds, threshold) {
        return (image.width / bounds.width * 100) >= threshold || (image.height / bounds.height * 100) >= threshold ? true : false;
    }

    render (image, width, height) {
        //http://www.codeforest.net/html5-image-upload-resize-and-crop
        var renderedImage = document.createElement("canvas");
        renderedImage.style.display = "none";
        renderedImage.width = width;
        renderedImage.height = height;
        var ctx = renderedImage.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        return renderedImage;  //ctx.getImageData(0, 0, width, height);
    }

    getDataURL (image, format, quality?) {
        if (image.toDataURL) {
            return image.toDataURL(this.getFileType(format), quality);
        }
        else if (image instanceof Image)
            return image.src;
    }

    getFileType (format) {
        switch (format) {
            case ImageType.Png:
                return "image/png";
            case ImageType.Gif:
                return "image/gif";
            default:
                return "image/jpeg";
        }
    }
}

