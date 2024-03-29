/**
 * A constant representing iteration counts that have not yet been computed.
 */
export const ITERATIONS_NOT_YET_KNOWN = -Infinity;
export const RENDER_GRID_SIZES = [64,16,4,1];

/**
 * Whether SharedArrayBuffer objects can be used in the current context.
 */
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
	 */
	constructor(width=0,height=0){
		/** @type {(()=>void)[]} */
		this._onResetCallbacks = [];
		this.reset(width,height);
	}

	/**
	 * Prepares the memory to compute a new image. Resets all buffers, resizes them if necessary and resets the pixel counter.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} [buffer] in the case of shared memories, uses this as the next buffer if given instead of creating a new one. otherwise unused
	 */
	reset(width,height,buffer){
		if (this._imageWidth!==width||this._imageHeight!==height){
			/** @type {number} */
			this._imageWidth = width;
			this._imageHeight = height;
			if (width>0&&height>0){
				this._iterationsArray = FractalRendererMemory.createIterationsArray(width,height);
				let temp = FractalRendererMemory.createIndicesAndPixelSizeArray(width,height);
				this._indicesArray = temp.indicesArray;
				this._pixelSizeArray = temp.pixelSizeArray;
				this._finishedIndicesArray = new Uint32Array(width*height);
			}else{
				this._iterationsArray = null;
				this._indicesArray = null;
				this._pixelSizeArray = null;
				this._finishedIndicesArray = null;
			}
		}else{
			this._iterationsArray.fill(ITERATIONS_NOT_YET_KNOWN);
		}
		this._pixelsCalculated = 0;
		this._callResetCallbacks();
	}

	/**
	 * Registers a callback to be executed after every memory reset.
	 * @param {()=>void} callback
	 */
	onReset(callback){
		this._onResetCallbacks.push(callback);
	}

	/**
	 * Internal method. Executes all callback functions registered using `onReset()`.
	 */
	_callResetCallbacks(){
		this._onResetCallbacks.forEach(callback=>{
			callback();
		});
	}

	/**
	 * Returns the computed iteration count for a pixel, or, if that specific pixel hasn't been computed yet, the iteration count for the nearest already computed pixel in one of the larger grid sizes.
	 * @param {number} x
	 * @param {number} y
	 */
	getIterations(x,y){
		if (this._iterationsArray){
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
		}
		return ITERATIONS_NOT_YET_KNOWN;
	}
	
	/**
	 * Renders a single pixel in the given grid size (unless already has been rendered as part of one of the larger grid sizes; in that case, rendering it isn't necessary anymore).
	 * @param {number} index
	 * @param {(x:number,y:number)=>number} iterationsCallback function to compute the iteration count given the coordinates of the pixel's center.
	 */
	renderPixel(index,iterationsCallback){
		let px = index%this._imageWidth;
		let py = (index-px)/this._imageWidth;
		if (this._iterationsArray[index]==ITERATIONS_NOT_YET_KNOWN){
			let iterations = iterationsCallback(px,py);
			this._iterationsArray[index] = iterations;
			this._finishedIndicesArray[this.incrementPixelsCalculated()] = index;
		}
	}

	/** @readonly */
	get iterationsArray(){
		return this._iterationsArray;
	}

	/** @readonly */
	get indicesArray(){
		return this._indicesArray;
	}

	/** @readonly */
	get pixelSizeArray(){
		return this._pixelSizeArray;
	}

	/** @readonly */
	get finishedIndicesArray(){
		return this._finishedIndicesArray;
	}

	get width(){
		return this._imageWidth;
	}

	get height(){
		return this._imageHeight;
	}

	/**
	 * The number of pixels calculated so far.
	 */
	get pixelsCalculated(){
		return this._pixelsCalculated;
	}

	/**
	 * Increases the value of `pixelsCalculated` by one and returns the old value.
	 */
	incrementPixelsCalculated(){
		return this._pixelsCalculated++;
	}

	/**
	 * Creates and returns a new iterations array of a given size.
	 * @param {number} width
	 * @param {number} height
	 */
	static createIterationsArray(width,height){
		const array = new Float64Array(width*height);
		array.fill(ITERATIONS_NOT_YET_KNOWN);
		console.log("Created new Float64Array.");
		return array;
	}

	/**
	 * Creates (or modifies if given) and returns two arrays, an `indicesArray` and a `pixelSizeArray`.
	 * The `indicesArray` contains all pixel indices in the order that they should be rendered in;
	 * the `pixelSizeArray` contains the size for the pixel at each index.
	 * @param {number} width
	 * @param {number} height
	 * @param {Uint32Array} indicesArray
	 * @param {Uint8Array} pixelSizeArray
	 */
	static createIndicesAndPixelSizeArray(width,height,indicesArray=new Uint32Array(width*height),pixelSizeArray=new Uint8Array(width*height)){
		const w = width;
		const h = height;
		let index = 0;
		/**
		 * @param {number} x
		 * @param {number} y
		 * @param {number} pixelSize
		 */
		let writePixel = (x,y,pixelSize)=>{
			if (x+pixelSize>0&&y+pixelSize>0&&x<w&&y<h){
				let px = Math.max(0,Math.min(width-1,Math.floor(x+pixelSize/2)));
				let py = Math.max(0,Math.min(height-1,Math.floor(y+pixelSize/2)));
				if (pixelSizeArray[px+py*width]===0){
					indicesArray[index++] = px+py*width;
					pixelSizeArray[px+py*width] = pixelSize;
				}
			}
		};
		for (let pixelSizeIndex=0;pixelSizeIndex<RENDER_GRID_SIZES.length;pixelSizeIndex++){
			let pixelSize = RENDER_GRID_SIZES[pixelSizeIndex];
			let x = (Math.round(width*0.5/pixelSize)-1)*pixelSize;
			let y = Math.round(height*0.5/pixelSize)*pixelSize;
			for (let i=0,r=Math.ceil(Math.max(width,height)*0.5/pixelSize);i<r*2;i+=2){
				for (let i2=0;i2<i;i2++){
					writePixel(x,y,pixelSize);
					x -= pixelSize;
				}
				for (let i2=0;i2<i+1;i2++){
					writePixel(x,y,pixelSize);
					y -= pixelSize;
				}
				for (let i2=0;i2<i+1;i2++){
					writePixel(x,y,pixelSize);
					x += pixelSize;
				}
				for (let i2=0;i2<i+2;i2++){
					writePixel(x,y,pixelSize);
					y += pixelSize;
				}
			}
		}
		console.assert(index===w*h,`Something went wrong filling the index array; filled ${index}/${w*h} pixels`);
		return {indicesArray,pixelSizeArray};
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
	constructor(width,height,sharedArrayBuffer){
		super(0,0);
		this.reset(width,height,sharedArrayBuffer);
	}

	/**
	 * Prepares the memory to compute a new image. Resets the buffer, resizes them if necessary and resets the pixel counter.
	 * 
	 * If a buffer object is passed as an argument, it is then used as the new underlying buffer instead of being reset. This remains true even if the buffer passed is already the underlying buffer.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} buffer
	 */
	reset(width,height,buffer=null){
		if (this._imageWidth!==width||this._imageHeight!==height||(buffer!==null&&this.buffer!==buffer)){
			/** @type {number} */
			this._imageWidth = width;
			this._imageHeight = height;
			if (width>0&&height>0){
				this._sharedArrayBuffer = buffer||FractalRendererSharedMemory.createBuffer(width,height);
				this._iterationsArray = FractalRendererSharedMemory.getIterationsArray(width,height,this._sharedArrayBuffer);
				this._indicesArray = FractalRendererSharedMemory.getIndicesArray(width,height,this._sharedArrayBuffer);
				this._pixelSizeArray = FractalRendererSharedMemory.getPixelSizeArray(width,height,this._sharedArrayBuffer);
				this._finishedIndicesArray = FractalRendererSharedMemory.getFinishedIndicesArray(width,height,this._sharedArrayBuffer);
				this._variablesArray = FractalRendererSharedMemory.getVariablesArray(width,height,this._sharedArrayBuffer);
			}else{
				this._sharedArrayBuffer = null;
				this._iterationsArray = null;
				this._indicesArray = null;
				this._pixelSizeArray = null;
				this._finishedIndicesArray = null;
				this._variablesArray = null;
			}
		}else if(buffer===null){
			this._iterationsArray.fill(ITERATIONS_NOT_YET_KNOWN);
			this._variablesArray[0] = 0;
		}
		this._callResetCallbacks();
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
		return Atomics.add(this._variablesArray,0,1);
	}


	/**
	 * Returns an object that can be passed through the structured cloning algorithm used by `postMessage()` and then reconstructed without losing information or passing unneeded data.
	 */
	prepareStructuredClone(){
		return {_imageWidth:this._imageWidth,_imageHeight:this._imageHeight,_sharedArrayBuffer:this._sharedArrayBuffer};
	}

	/**
	 * Reconstructs a `FractalRendererSharedMemory` that has been serialized and deserialized using the structured cloning algorithm used by, for example, `postMessage()`.
	 * @param {{_imageWidth:number,_imageHeight:number,_sharedArrayBuffer:SharedArrayBuffer}} clone
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
		let buffer = new SharedArrayBuffer(Math.ceil(width*height*17/4)*4+4);
		let iterationsArray = FractalRendererSharedMemory.getIterationsArray(width,height,buffer);
		iterationsArray.fill(ITERATIONS_NOT_YET_KNOWN);
		console.log("Created new SharedArrayBuffer.");
		let indicesArray = FractalRendererSharedMemory.getIndicesArray(width,height,buffer);
		let pixelSizeArray = FractalRendererSharedMemory.getPixelSizeArray(width,height,buffer);
		FractalRendererMemory.createIndicesAndPixelSizeArray(width,height,indicesArray,pixelSizeArray);
		return buffer;
	}

	/**
	 * Returns the `iterationsArray` slice of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getIterationsArray(width,height,sharedArrayBuffer){
		return new Float64Array(sharedArrayBuffer,0,width*height);
	}

	/**
	 * Returns the `indicesArray` slice of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getIndicesArray(width,height,sharedArrayBuffer){
		return new Uint32Array(sharedArrayBuffer,width*height*8,width*height);
	}

	/**
	 * Returns the `pixelSizeArray` slice of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getPixelSizeArray(width,height,sharedArrayBuffer){
		return new Uint8Array(sharedArrayBuffer,width*height*12,width*height);
	}

	/**
	 * Returns the `finishedIndicesArray` slice of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getFinishedIndicesArray(width,height,sharedArrayBuffer){
		return new Uint32Array(sharedArrayBuffer,Math.ceil(width*height*13/4)*4,width*height);
	}

	/**
	 * Returns the `variablesArray` part of a `SharedArrayBuffer`.
	 * @param {number} width
	 * @param {number} height
	 * @param {SharedArrayBuffer} sharedArrayBuffer
	 */
	static getVariablesArray(width,height,sharedArrayBuffer){
		return new Uint32Array(sharedArrayBuffer,Math.ceil(width*height*17/4)*4,1);
	}
}