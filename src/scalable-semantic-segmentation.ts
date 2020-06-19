import { WorkerResponse, WorkerCommand, SplitCanvasMetaData } from "./const"


export class ScalableSemanticSegmentation{
    private initializedListeners     :(()=>void)[] = []
    private maskPredictedListeners   :((maskBitmap:ImageBitmap)=>void)[] = []
    private workerSS:Worker|null = null
    private _girdDrawCanvas:HTMLCanvasElement|null = null
    private _previewCanvas:HTMLCanvasElement|null = null

 
    addInitializedListener = (f:(()=>void)) =>{
        this.initializedListeners.push(f)
    }

    addMaskPredictedListeners = (f:((maskBitmap:ImageBitmap)=>void)) =>{
        this.maskPredictedListeners.push(f)
    }

    set girdDrawCanvas(val:HTMLCanvasElement|null){
        this._girdDrawCanvas=val
    }
    set previewCanvas(val:HTMLCanvasElement|null){
        if(val===null && this._previewCanvas !== null){
            this.clearMask()
        }
        this._previewCanvas=val
    }

    
    init(modelPath:string, modelWidth:number, modelHeight:number, splitMargin:number){
        // console.log("SSS Worker initializing... ")
        // SemanticSegmentation 用ワーカー
        this.workerSS = new Worker('./workerSS.ts', { type: 'module' })
        this.workerSS.onmessage = (event) => {
            if (event.data.message === WorkerResponse.INITIALIZED) {
                console.log("WORKERSS INITIALIZED")
                this.initializedListeners.map(f=>f())
            }else if(event.data.message === WorkerResponse.PREDICTED_AREA){
                // console.log("MASK PREDICTED", event)
                const maskBitmap = event.data.maskBitmap as ImageBitmap
                if(this._previewCanvas !== null){
                    this.previewMask(maskBitmap)
                }
                this.maskPredictedListeners.map(f=>f(maskBitmap))
            }
        }
        this.workerSS!.postMessage({ 
            message: WorkerCommand.INITIALIZE, 
            modelPath:modelPath, 
            modelWidth:modelWidth, 
            modelHeight:modelHeight, 
            splitMargin:splitMargin
        })
    }



    predict(captureCanvas:HTMLCanvasElement, col_num:number, row_num:number, split_margin:number){
        const boxMetadata   = this.splitCanvasToBoxes(captureCanvas, col_num, row_num, split_margin)
        if(this._girdDrawCanvas !== null){
            this.drawBoxGrid(this._girdDrawCanvas, boxMetadata)
        }
        const images        = this.getBoxImageBitmap(captureCanvas, boxMetadata)
        this.workerSS!.postMessage({ message: WorkerCommand.PREDICT_AREA, boxMetadata: boxMetadata, images: images}, images)

    }


    previewMask = (maskImage:ImageBitmap) =>{
        const maskMonitor  = this._previewCanvas!
        const ctx2 = maskMonitor.getContext("2d")!
        this.clearMask()
        ctx2.drawImage(maskImage, 0, 0, maskMonitor.width, maskMonitor.height)
    }
    clearMask = () =>{
        const maskMonitor  = this._previewCanvas!
        const ctx2 = maskMonitor.getContext("2d")!
        ctx2.clearRect(0, 0, maskMonitor.width, maskMonitor.height)
    }

    private drawBoxGrid = (canvas:HTMLCanvasElement, boxMetadata:SplitCanvasMetaData[]) =>{
        const ctx = canvas.getContext('2d')!
        ctx.strokeStyle  = "#aaaaaa";
        ctx.lineWidth    = 1;
        const font       = "16px sans-serif";
        ctx.font         = font;
        ctx.textBaseline = "top";
        ctx.fillStyle = "#00ccccee";
        for(let i = 0; i < boxMetadata.length; i++){
            const box = boxMetadata[i]
            ctx.strokeRect(
                Math.floor(box.minX * canvas.width), 
                Math.floor(box.minY * canvas.height), 
                Math.floor(box.maxX * canvas.width  - box.minX * canvas.width), 
                Math.floor(box.maxY * canvas.height - box.minY * canvas.height))
        }
    }

    private splitCanvasToBoxes = (originaCanvas: HTMLCanvasElement, col_num:number, row_num:number, split_margin:number): SplitCanvasMetaData[] => {
        const tile_num = col_num * row_num
        const sizeWithMargin = 1.0 + split_margin
        const margin = split_margin
    
        const resultBoxes = []
        for (let i = 0; i < tile_num; i++) {
            const col = i % col_num
            const row = Math.floor(i / col_num)
    
    
            const minX = (sizeWithMargin / col_num) * col - (margin / col_num) * col
            const minY = (sizeWithMargin / row_num) * row - (margin / row_num) * row
            const maxX = minX + (sizeWithMargin / col_num)
            const maxY = minY + (sizeWithMargin / row_num)
    
            let box: SplitCanvasMetaData = {
                minY: minY, // 割合
                minX: minX, // 割合
                maxY: maxY, // 割合
                maxX: maxX, // 割合
                col_num: col_num,
                row_num: row_num,
            }
            resultBoxes.push(box)
        }
        return resultBoxes
    }

    // getBoxImages = (canvas:HTMLCanvasElement, boxMetadata:SplitCanvasMetaData[]) =>{
    //     const ctx = canvas.getContext('2d')!
    //     const res = []
    //     for(let i = 0; i < boxMetadata.length; i++){
    //         const box = boxMetadata[i]
    //         const start_x = Math.floor(box.minX * canvas.width)
    //         const start_y = Math.floor(box.minY * canvas.height)
    //         const width   = Math.floor(box.maxX * canvas.width  - box.minX * canvas.width) 
    //         const height  = Math.floor(box.maxY * canvas.height - box.minY * canvas.height)
    //         const image = ctx.getImageData(start_x, start_y, width, height)
    //         res.push(image)
    //     }
    //     return res
    // }

    private getBoxImageBitmap = (canvas:HTMLCanvasElement,  boxMetadata:SplitCanvasMetaData[]): ImageBitmap[] => {
        const res = []
        for(let i = 0; i < boxMetadata.length; i++){
            const box = boxMetadata[i]
            const start_x = Math.floor(box.minX * canvas.width)
            const start_y = Math.floor(box.minY * canvas.height)
            const width   = Math.floor(box.maxX * canvas.width  - box.minX * canvas.width) 
            const height  = Math.floor(box.maxY * canvas.height - box.minY * canvas.height)

            if (width === 0 || height === 0){ // イメージがまだ準備しきれていない段階。
                return []
            }
            const offscreen = new OffscreenCanvas(width, height)

            const offctx    = offscreen.getContext("2d")!
            offctx.drawImage(canvas, start_x, start_y, width, height, 0, 0, width, height)
            const imageBitmap = offscreen.transferToImageBitmap()
            res.push(imageBitmap)
        }
        return res
    }



}
