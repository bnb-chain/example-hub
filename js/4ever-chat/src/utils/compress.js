import Compressor from "compressorjs";

export async function compressImg(file, options) {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.7,
      ...options,
      success(result) {
        resolve(result);
      },
      error(err) {
        reject(err);
      },
    });
  });
}
