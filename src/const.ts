export interface SplitCanvasMetaData {
    minX   : number // 画像全体での開始位置X (ratio)
    minY   : number // 画像全体での開始位置Y (ratio)
    maxX   : number // 画像全体での終了位置X (ratio)
    maxY   : number // 画像全体での終了位置Y (ratio)
    col_num : number // 全体の数(このメタデータのインデックスでないことに注意)
    row_num : number // 全体の数(このメタデータのインデックスでないことに注意)
}

export const WorkerCommand = {
    INITIALIZE   : 'initialize',
    PREDICT_AREA : 'predict_area',
}

export const WorkerResponse = {
    INITIALIZED      : 'initialized',
    PREDICTED_AREA   : 'predicted_area',
}