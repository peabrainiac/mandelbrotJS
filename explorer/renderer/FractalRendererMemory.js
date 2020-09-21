/**
 * A constant representing iteration counts that have not yet been computed.
 */
export const ITERATIONS_NOT_YET_KNOWN = -Infinity;
export const RENDER_GRID_SIZES = [64,16,4,1];

export const sharedArrayBuffersSupported = (()=>{
	if (self.crossOriginIsolated===false){
		console.warn("SharedArrayBuffers are supported by this browser, but inaccessible as this page is currently not cross-origin-isolated.");
		return false;
	}else if (self.SharedArrayBuffer===undefined){
		console.warn("SharedArrayBuffers are not supported by this browser.");
		return false;
	}else{
		return true;
	}
})();

/**
 * A class representing the memory needed to render a fractal image.
 */
export default class FractalRendererMemory {
	/**
	 * @param {number} width 
	 * @param {number} height 
	 * @param {Uint32Array} colorsArray 
	 * @param {Float64Array} iterationsArray 
	 * @param {ImageData} imageData 
	 */
	constructor(width=8,height=8){
		this.reset(width,height);
	}

	/**
	 * @param {number} width
	 * @param {number} height
	 */
	reset(width,height){
		if (this._imageWidth!==width||this._imageHeight!==height){
			this._imageWidth = width;
			this._imageHeight = height;
			this._colorsArray = new Uint32Array(width*height);
			this._iterationsArray = FractalRendererMemory.createIterationsArray(width,height);
			this._imageData = new ImageData(new Uint8ClampedArray(this._colorsArray.buffer),width);
		}else{
			this._colorsArray.fill(0xff000000);
			this._iterationsArray.fill(ITERATIONS_NOT_YET_KNOWN);
		}
		this._pixelsCalculated = 0;
	}

	/**
	 * Returns the computed iteration count for a pixel, or, if that specific pixel hasn't been computed yet, the iteration count for the nearest already computed pixel in one of the larger grid sizes.
	 * @param {number} x
	 * @param {number} y
	 */
	getIterations(x,y){
		const w = this._imageWidth;
		const h = this._imageHeight;
		for (let i=RENDER_GRID_SIZES.length-1;i>=0;i--){
			let pixelSize = RENDER_GRID_SIZES[i];
			let cx = (Math.round(w*0.5/pixelSize)-1)*pixelSize;
			let cy = Math.round(h*0.5/pixelSize)*pixelSize;
			let px = cx+pixelSize*Math.floor((x-cx)/pixelSize);
			let py = cy+pixelSize*Math.floor((y-cy)/pixelSize);
			let px2 = Math.max(0,Math.min(w-1,Math.floor(px+pixelSize/2)));
			let py2 = Math.max(0,Math.min(h-1,Math.floor(py+pixelSize/2)));
			let iterations = this._iterationsArray[px2+py2*w];
			if (iterations!=ITERATIONS_NOT_YET_KNOWN){
				return iterations;
			}
		}
		return ITERATIONS_NOT_YET_KNOWN;
	}
	
	/**
	 * Renders a single pixel in the given grid size (unless already has been rendered as part of one of the larger grid sizes; in that case, rendering it isn't necessary anymore).
	 * @param {number} x
	 * @param {number} y
	 * @param {number} pixelSize
	 * @param {(x:number,y:number)=>number} iterationsCallback function to compute the iteration count given the coordinates of the pixel's center.
	 * @param {(iterations:number)=>number} colorCallback function to compute the color as a 32-bit abgr integer based on the iteration count.
	 */
	renderPixel(x,y,pixelSize,iterationsCallback,colorCallback){
		const w = this._imageWidth;
		const h = this._imageHeight;
		if (x+pixelSize>0&&y+pixelSize>0&&x<w&&y<h){
			let px = Math.max(0,Math.min(w-1,Math.floor(x+pixelSize/2)));
			let py = Math.max(0,Math.min(h-1,Math.floor(y+pixelSize/2)));
			let index = px+py*w;
			if (this._iterationsArray[index]==ITERATIONS_NOT_YET_KNOWN){
				let iterations = iterationsCallback(px,py);
				let color = colorCallback(iterations);
				this._iterationsArray[index] = iterations;
				this._colorsArray[index] = color;
				this.incrementPixelsCalculated();
				if (pixelSize>1){
					for (let x2=Math.max(0,x),x3=Math.min(w,x+pixelSize);x2<x3;x2++){
						for (let y2=Math.max(0,y),y3=Math.min(h,y+pixelSize);y2<y3;y2++){
							if (this._iterationsArray[x2+y2*w]==ITERATIONS_NOT_YET_KNOWN){
								this._colorsArray[x2+y2*w] = color;
							}
						}
					}
				}
			}
		}
	}

	/** @readonly */
	get colorsArray(){
		return this._colorsArray;
	}

	/** @readonly */
	get iterationsArray(){
		return this._iterationsArray;
	}

	/** @readonly */
	get imageData(){
		return this._imageData;
	}

	get pixelsCalculated(){
		return this._pixelsCalculated;
	}

	/**
	 * Increases the value of `pixelsCalculated` by one.
	 */
	incrementPixelsCalculated(){
		this._pixelsCalculated++;
	}

	/**
	 * Creates and returns a new iterations array of a given size.
	 * @param {number} widt
	 * @param {number} height
	 */
	static createIterationsArray(width,height){
		const array = new Float64Array(width*height);
		array.fill(ITERATIONS_NOT_YET_KNOWN);
		return array;
	}
}
/**
 * A `FractalRendererMemory` that can be shared across threads/workers.
 */
export class FractalRendererSharedMemory extends FractalRendererMemory {
	/**
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	constructor(width=8,height=8,sharedArrayBuffer){
		super(width,height);
		this.reset(width,height,sharedArrayBuffer);
	}

	reset(width,height,buffer=FractalRendererSharedMemory.createBuffer(width,height)){
		if (this._imageWidth!==width||this._imageHeight!==height||this.buffer!==buffer){
			this._imageWidth = width;
			this._imageHeight = height;
			this._sharedArrayBuffer = buffer;
			this._colorsArray = FractalRendererSharedMemory.getColorsArray(width,height,this._sharedArrayBuffer);
			this._iterationsArray = FractalRendererSharedMemory.getIterationsArray(width,height,this._sharedArrayBuffer);
			this._imageData = new ImageData(width,height);
			this._variablesArray = FractalRendererSharedMemory.getVariablesArray(width,height,this._sharedArrayBuffer);
			/** temporary workaround because `ImageData.data` color arrays can't be shared */
			this._secondaryColorsArray = new Uint8ClampedArray(this._sharedArrayBuffer,0,width*height*4);
		}else{
			this._colorsArray.fill(0xff000000);
			this._iterationsArray.fill(ITERATIONS_NOT_YET_KNOWN);
			this._variablesArray[0] = 0;
		}
	}

	/** @readonly */
	get imageData(){
		this._imageData.data.set(this._secondaryColorsArray,0);
		return this._imageData;
	}

	/** @readonly */
	get buffer(){
		return this._sharedArrayBuffer;
	}

	/** @inheritdoc */
	get pixelsCalculated(){
		return this._variablesArray[0];
	}

	/** @inheritdoc */
	incrementPixelsCalculated(){
		Atomics.add(this._variablesArray,0,1);
	}

	/**
	 * Reconstructs a `FractalRendererSharedMemory` that has been serialized and deserialized using the structured cloning algorithm used by, for example, `postMessage()`.
	 */
	static fromStructuredClone(clone){
		return new FractalRendererSharedMemory(clone._imageWidth,clone._imageHeight,clone._sharedArrayBuffer);
	}

	/**
	 * Creates a new SharedArrayBuffer.
	 * @param {number} width
	 * @param {number} height
	 */
	static createBuffer(width,height){
		let buffer = new SharedArrayBuffer(width*height*12+4);
		let iterationsArray = FractalRendererSharedMemory.getIterationsArray(width,height,buffer);
		iterationsArray.fill(ITERATIONS_NOT_YET_KNOWN);
		return buffer;
	}

	/**
	 * Returns the `colorsArray` slice of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getColorsArray(width,height,sharedArrayBuffer){
		return new Uint32Array(sharedArrayBuffer,0,width*height);
	}

	/**
	 * Returns the `iterationsArray` slice of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getIterationsArray(width,height,sharedArrayBuffer){
		return new Float64Array(sharedArrayBuffer,width*height*4,width*height);
	}

	/**
	 * Returns the `variablesArray` part of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getVariablesArray(width,height,sharedArrayBuffer){
		return new Uint32Array(sharedArrayBuffer,width*height*12,1);
	}
}