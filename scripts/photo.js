// Node.js example script that uses OpenCV, Smartcrop.js, and Sharp to crop and
// resize images to 500x500 pixel squares.
// @see {@link https://github.com/jwagner/smartcrop.js#node}
// @see {@link https://github.com/jwagner/smartcrop-sharp}
// @see {@link https://github.com/lovell/sharp}

const sharp = require('sharp');
const smartcrop = require('smartcrop-sharp');

/**
 * Detects faces using OpenCV and returns the coordinates of each face so that
 * Smartcrop.js can make sure to include them in the final crop.
 * @see {@link https://github.com/jwagner/smartcrop-cli/blob/master/smartcrop-cli.js}
 * @see {@link https://github.com/jwagner/smartcrop.js#face-detection}
 * @see {@link https://github.com/peterbraden/node-opencv}
 * @param src - The source filename.
 * @return Promise that resolves to the `boost` Smartcrop.js configuration
 * option. Should be used with the desired `width` and `height` when cropping.
 * @todo Debug the system wide OpenCV requirements and ensure that Vercel has
 * them installed before implementing this in production.
 */
function detect(src) {
  const cv = require('opencv');
  return new Promise((resolve, reject) => {
    cv.readImage(src, (err, image) => {
      if (err) return reject(err);
      image.detectObject(cv.FACE_CASCADE, {}, (err, faces) => {
        if (err) return reject(err);
        resolve(
          faces.map((face) => ({
            x: face.x,
            y: face.y,
            width: face.width,
            height: face.height,
            weight: 1.0,
          }))
        );
      });
    });
  });
}

async function crop(src, dest, width, height) {
  return smartcrop.crop(src, { width, height }).then((result) => {
    const crop = result.topCrop;
    return sharp(src)
      .extract({
        width: crop.width,
        height: crop.height,
        left: crop.x,
        top: crop.y,
      })
      .resize(width, height)
      .toFile(dest);
  });
}

crop('sophia.webp', 'sophia-square.webp', 500, 500);
