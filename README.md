ScalableSemanticSegmentation
====

ScalableSemanticSegmentation can segment objects in picture with tuning balance between speed and accuracy.
This architecture is best suitable for small device with low peformance smart phone.

## Description
ScalableSemanticSegmentation can segment objects in picture with tuning balance between speed and accuracy. The basic idea is splitting the image and infering it to improve accuracy. And splitting number can be changed depends on the device performance.

### Features
- split image and infer each peices.
- split number can be changed
- the margin, that is the overlap area can be customized.

## Demo
https://scalable-ss-demo.herokuapp.com/index.html

<p align="center">
<img src="./doc/movie.gif" width="600" />
</p>


## Usage
### Sample Code

https://github.com/dannadori/ScalableSemanticSegmentationjs_demo

## Install
```
npm install scalable-semantic-segmentation-js
node node_modules/scalable-semantic-segmentation-js/bin/install_worker.js <web_root>
```
"web_root" is the root of web. Most case "web_root" may be public when you use react.

```
node node_modules/scalable-semantic-segmentation-js/bin/install_worker.js public

```
## Contribution

## Licence

Apache-2.0

## Author

Wataru Okada

- Medium: https://medium.com/@dannadori
- Qiita(Japanese): https://qiita.com/wok
