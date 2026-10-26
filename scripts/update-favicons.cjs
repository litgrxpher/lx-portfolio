const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('public/favicon.png');
const png = fs.readFileSync(srcPath);

// 1. Create favicon.ico
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // icon type
icoHeader.writeUInt16LE(1, 4); // 1 image
icoHeader.writeUInt8(0, 6);    // width (0 = 256)
icoHeader.writeUInt8(0, 7);    // height (0 = 256)
icoHeader.writeUInt8(0, 8);    // color palette
icoHeader.writeUInt8(0, 9);    // reserved
icoHeader.writeUInt16LE(1, 10); // planes
icoHeader.writeUInt16LE(32, 12); // bpp
icoHeader.writeUInt32LE(png.length, 14); // data size
icoHeader.writeUInt32LE(22, 18); // offset
const ico = Buffer.concat([icoHeader, png]);
fs.writeFileSync(path.resolve('public/favicon.ico'), ico);

// 2. Create favicon-mountain.png
fs.copyFileSync(srcPath, path.resolve('public/favicon-mountain.png'));

// 3. Create SVG embedding the mountain PNG
const b64 = png.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${b64}"/></svg>`;
fs.writeFileSync(path.resolve('public/favicon.svg'), svg);

console.log('All favicons updated: .ico, .svg, -mountain.png, .png');

