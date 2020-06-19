
import * as tf from '@tensorflow/tfjs';
import {  WorkerCommand, WorkerResponse, SplitCanvasMetaData } from './const';


const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals


let model:tf.GraphModel|null
let splitMargin =0.2
let modelWidth=300
let modelHeight=300



const predictByImageBitmaps = async (model:tf.GraphModel, bms:ImageBitmap[]) : Promise<number[][][] | null> =>{
  let mapDatas:number[][][]|null = null
  tf.engine().startScope()            
  const bm_num = bms.length

  const canvasTensors = []
  for(let i =0;i<bm_num;i++){
      const offscreen = new OffscreenCanvas(bms[i].width, bms[i].height)
      const ctx = offscreen.getContext('2d')!
      ctx.drawImage(bms[i], 0, 0, bms[i].width, bms[i].height)
      const img = ctx.getImageData(0, 0, bms[i].width, bms[i].height)

      const box_tensor = tf.browser.fromPixels(img).resizeNearestNeighbor([modelWidth, modelHeight])
      canvasTensors.push(box_tensor)
  }

  const inputTensor = tf.stack(canvasTensors)
  //推論実行
  // console.log('execute')
  let res = tf.squeeze(model.execute(inputTensor) as tf.Tensor)
  if(bm_num===1){
      res = res.expandDims()
  }

  mapDatas = await res.array() as number[][][]
  res.dispose()
  tf.engine().endScope()

  return mapDatas!
}


const drawMask = (boxMetadata:SplitCanvasMetaData[], maskParts: number[][][], split_margin:number): ImageData =>{
  const col_num = boxMetadata[0].col_num
  const row_num = boxMetadata[0].row_num
  const sizeWithMargin = 1.0 + split_margin


  const mergedMapWidth  = Math.ceil((maskParts[0].length    * col_num) / sizeWithMargin)
  const mergedMapHeight = Math.ceil((maskParts[0][0].length * row_num) / sizeWithMargin)
  const pixelData = new Uint8ClampedArray(mergedMapWidth * mergedMapHeight * 4)

  const canvas_num = maskParts.length

  for (let i = 0; i < canvas_num; i++) {
      const maskPart  = maskParts[i]
      const box       = boxMetadata[i]

      const width     = maskPart.length
      const height    = maskPart[0].length

      const x_offset = Math.ceil(mergedMapWidth  * box.minX)
      const y_offset = Math.ceil(mergedMapHeight * box.minY)
      // マスクビットマップ作成
      for (let rowIndex = 0; rowIndex < height; ++rowIndex) {
          for (let columnIndex = 0; columnIndex < width; ++columnIndex) {
              const pix_offset = ( (rowIndex + y_offset) * mergedMapWidth + (columnIndex + x_offset)) * 4
              if(pixelData[pix_offset + 0] !== 0){
                  continue
              }

              let color = 0
              if (maskPart![rowIndex][columnIndex] === 0) {
                  color = 0
              } else {
                  color = 128
              }

              pixelData[pix_offset + 0] = color
              pixelData[pix_offset + 1] = color
              pixelData[pix_offset + 2] = color
              pixelData[pix_offset + 3] = 128
          }
      }
  }
  const imageData = new ImageData(pixelData, mergedMapWidth, mergedMapHeight);
  return imageData
}




onmessage = async (event) => {
  // console.log("event", event)
  //// セマンティックセグメンテーション設定
  if(event.data.message === WorkerCommand.INITIALIZE){
    const modelPath = event.data.modelPath
    modelWidth = event.data.modelWidth
    modelHeight = event.data.modelHeight
    splitMargin = event.data.splitMargin


    tf.loadGraphModel(modelPath).then((res)=>{
      model=res
      // console.log("tf model loaded")
      ctx.postMessage({ message: WorkerResponse.INITIALIZED})
    })
  }else if(event.data.message === WorkerCommand.PREDICT_AREA){
      // console.log("requested predict area")
    const boxMetadata = event.data.boxMetadata
    const images:ImageBitmap[] = event.data.images
    const maskParts = await predictByImageBitmaps(model!, images)
    const maskImageData = drawMask(boxMetadata, maskParts!, splitMargin)
    const offscreen = new OffscreenCanvas(maskImageData.width, maskImageData.height)
    offscreen.getContext("2d")!.putImageData(maskImageData, 0, 0)
    const maskBitmap = offscreen.transferToImageBitmap()
   ctx.postMessage({message:WorkerResponse.PREDICTED_AREA, maskBitmap:maskBitmap}, [maskBitmap])

//    ctx.postMessage({message:WorkerResponse.PREDICTED_AREA, maskParts:maskParts, boxMetadata:boxMetadata})
//    ctx.postMessage({message:WorkerResponse.PREDICTED_AREA})

    for(let i =0;i<images.length;i++){
      images[i].close()
    }
    event.data.boxMetadata = null
    event.data.images      = null
  }
} 

export default onmessage
