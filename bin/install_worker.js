const fs = require('fs');
const path = require('path');
const package_name = 'scalable-semantic-segmentation-js'
const src = path.join('node_modules', package_name, 'dist', '0.scalable-semantic-segmentation.worker.js')
const dst = path.join(process.argv[2], '0.scalable-semantic-segmentation.worker.js')

try {
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    console.log('file is copied');
  } catch (error) {
    console.log(error);
  }