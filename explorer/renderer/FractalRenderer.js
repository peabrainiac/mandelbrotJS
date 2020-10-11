import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import FractalColorizer from "./FractalColorizer.js";

import FractalRendererMemory, {ITERATIONS_NOT_YET_KNOWN,RENDER_GRID_SIZES} from "./FractalRendererMemory.js";

export {ITERATIONS_NOT_YET_KNOWN,RENDER_GRID_SIZES};
export const STATE_LOADING = 0;
export const STATE_PENDING_RENDER = 1;
export const STATE_RENDERING = 2;
export const STATE_PENDING_CANCEL = 3;
export const STATE_CANCELLED = 4;
export const STATE_FINISHED = 5;

/**
 * The base class for all types of renderers.
 */
export default class FractalRenderer {
	/**
	 * @param {FractalRendererMemory} memory
	 */
	constructor(memory){
		this._memory = memory||new FractalRendererMemory();
		this._state = STATE_LOADING;
		this._lastScreenRefresh = Date.now();
		/** @type {(()=>{})[]} */
		this._onBeforeScreenRefreshCallbacks = [];
	}

	/**
	 * the memory that the renderer operates on.
	 * @readonly
	 */
	get memory(){
		return this._memory;
	}

	/** An ImageData with the current image. Gets updated every time this getter is called. */
	get imageData(){
		if (!this._colorizer){
			this._colorizer = new FractalColorizer(this._memory);
			this._memory.onReset(()=>{
				this._colorizer.reset();
			});
		}
		return this._colorizer.imageData;
	}

	/**
	 * the current state of the renderer.
	 * @readonly
	 */
	get state(){
		return this._state;
	}
	
	/**
	 * Renders a new image. Returns a promise that resolves once it finishes rendering or is cancelled using `stop()` or another call to `render()`.
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {object} options
	 * @param {number} options.maxIterations
	 */
	async render(formula,viewport,{maxIterations}){
		this._formula = formula;
		this._viewport = viewport;
		this._maxIterations = maxIterations;
		if (this._colorizer){
			this._colorizer.maxIterations = maxIterations;
		}
		this._state = STATE_RENDERING;
	}

	/**
	 * Stops rendering. Returns a promise that resolves once rendering has been completely stopped.
	 */
	async stop(){
		this._state = STATE_CANCELLED;
	}

	/**
	 * Internal method. Calls all screen refresh callbacks, then waits for the next animation frame and resets the corresponding timer.
	 */
	async _refreshScreen(){
		this._onBeforeScreenRefreshCallbacks.forEach((callback)=>{
			callback();
		});
		await new Promise((resolve)=>{
			(self.requestAnimationFrame||setTimeout)(resolve);
		});
		this._lastScreenRefresh = Date.now();
	}

	/**
	 * Registers a callback function to be executed before every screen refresh while rendering,
	 * and before the first screen refresh after rendering is finished.
	 * @param {()=>{}} callback
	 */
	onBeforeScreenRefresh(callback){
		this._onBeforeScreenRefreshCallbacks.push(callback);
	}

	/**
	 * Renders the pixel at the given index in the grid. The index is calculated as `x+y*width`.
	 * @param {number} index
	 */
	renderPixel(index){
		this._memory.renderPixel(index,(x,y)=>{
			const maxIterations = this._maxIterations;
			const sampleOffsets = this._sampleOffsets;
			let iterations = 0;
			for (let i=0;i<sampleOffsets.length;i++){
				let cx = this._viewport.pixelXToFractalX(x+sampleOffsets[i].x);
				let cy = this._viewport.pixelYToFractalY(y+sampleOffsets[i].y);
				iterations += this._formula.iterate(cx,cy,{maxIterations});
			}
			return iterations/sampleOffsets.length;
		});
	}
}
/**
 * A simple, single-threaded fractal renderer.
 * 
 * Can be configured to render only part of the image to a `FractalRendererSharedMemory`, so that multiple of these can render one image together across multiple threads.
 */
export class SimpleFractalRenderer extends FractalRenderer {
	/**
	 * @param {FractalRendererMemory} memory
	 * @param {number} n the number of total renderers working together to render the image; defaults to 1.
	 * @param {number} offset the index of this renderer among those renderers; determines what part of the image it should render.
	 */
	constructor(memory,n=1,offset=0,{shouldDoScreenRefreshs=true,controlArray=new SimpleFractalRendererControlArray()}={}){
		super(memory);
		this._n = n;
		this._offset = offset;
		this._i = 0;
		this._shouldDoScreenRefreshs = shouldDoScreenRefreshs;
		this._controlArray = controlArray;
	}
	/**
	 * @inheritdoc
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {object} options
	 * @param {number} options.maxIterations
	 * @param {number} options.samplesPerPixel
	 * @param {SharedArrayBuffer} buffer
	 */
	async render(formula,viewport,{maxIterations,samplesPerPixel=8},buffer=null){
		super.render(formula,viewport,{maxIterations,samplesPerPixel});
		if (this._samplesPerPixel!==samplesPerPixel){
			this._samplesPerPixel = samplesPerPixel;
			this._sampleOffsets = SimpleFractalRenderer.getSampleOffsets(samplesPerPixel);
		}
		this._memory.reset(viewport.pixelWidth,viewport.pixelHeight,buffer);
		this._controlArray.pendingCancel = false;
		this._i = 0;
		this._finishRenderCallPromise = new Promise(async(resolve)=>{
			await this._render();
			await this._refreshScreen();
			resolve();
		});
		return this._finishRenderCallPromise;
	}

	/**
	 * @inheritdoc
	 */
	async stop(){
		if (this._state===STATE_RENDERING){
			this._controlArray.pendingCancel = true;
			await this._finishRenderCallPromise;
		}
	}

	/**
	 * Internal method. Does the actual rendering.
	 * 
	 * Note: this is written using `promise.then()` instead of async-await syntax because Firefox does not yet JIT-compile async functions.
	 */
	async _render(){
		return new Promise((resolve)=>{
			const indices = this.memory.indicesArray;
			const pixelSizes = this.memory.pixelSizeArray;
			const w = this._viewport.pixelWidth;
			const n = this._n;
			/** @param {number} startIndex */
			let renderPart = (startIndex)=>{
				let i = startIndex;
				while(true){
					for (let l=Math.min(indices.length,i+1000*n);i<l;i+=n){
						this.renderPixel(indices[i]);
					}
					if (i>=indices.length||this._controlArray.pendingCancel){
						this._state = (i>=indices.length?STATE_FINISHED:STATE_CANCELLED);
						resolve();
						break;
					}else if(this._shouldDoScreenRefreshs&&Date.now()-this._lastScreenRefresh>100){
						this._refreshScreen().then(()=>{
							renderPart(i);
						});
						break;
					}
				}
			}
			renderPart(this._offset);
		});
	}

	/**
	 * Given the number of samples per pixel, generates the offsets for those samples. Only works for powers of two at the moment.
	 * @param {number} sampleCount
	 */
	static getSampleOffsets(sampleCount){
		console.assert(Math.log2(sampleCount)%1===0,"Invalid sampleCount parameter: "+sampleCount);
		let n = 2**Math.ceil(Math.log2(sampleCount)/2);
		let sampleOffsets = [];
		for (let x=0;x<n;x++){
			for (let y=0;y<n;y++){
				if (n*n===sampleCount||(x+y)%2==0){
					sampleOffsets.push({x:(0.5+x)/n-0.5,y:(0.5+y)/n-0.5});
				}
			}
		}
		console.log("SampleOffsets:",sampleOffsets);
		return sampleOffsets;
	}
}
/**
 * Class used to communicate with a `SimpleFractalRenderer` in a different thread/worker using a shared array buffer,
 * or to do so with one in the same thread using a normal one.
 * 
 * Similar to the `variablesArray` part of a `SharedFractalRendererMemory`, but used once per thread instead of once per image.
 */
export class SimpleFractalRendererControlArray {
	/**
	 * Creates a new `SimpleFractalRendererControlArray` based on the given buffer, or, if no buffer is given, a new non-shared `ArrayBuffer`.
	 * @param {ArrayBuffer|SharedArrayBuffer} buffer
	 */
	constructor(buffer=new ArrayBuffer(4)){
		this._buffer = buffer;
		this._array = new Uint32Array(buffer);
	}

	/** @readonly */
	get array(){
		return this._array;
	}

	set pendingCancel(pendingCancel){
		this._array[0] = pendingCancel*1;
	}

	/**
	 * Whether the renderer should stop rendering.
	 */
	get pendingCancel(){
		return !!this._array[0];
	}

	/**
	 * Creates a new `SimpleFractalRendererControlArray` based on a new `SharedArrayBuffer`.
	 */
	static createShared(){
		return new SimpleFractalRendererControlArray(new SharedArrayBuffer(4));
	}

	/**
	 * Reconstructs a `SimpleFractalRendererControlArray` that has been serialized and deserialized using the structured cloning algorithm used by, for example, `postMessage()`.
	 * @param {{_buffer:SharedArrayBuffer}} clone
	 */
	static fromStructuredClone(clone){
		return new SimpleFractalRendererControlArray(clone._buffer);
	}
}