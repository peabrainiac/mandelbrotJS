import {FractalFormula,FractalViewport} from "../../MandelMaths.js";

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
		this._shouldDoScreenRefreshs = true;
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
	 * @param {number} maxIterations
	 */
	async render(formula,viewport,maxIterations){
		this._formula = formula;
		this._viewport = viewport;
		this._maxIterations = maxIterations;
		this._state = STATE_RENDERING;
	}

	/**
	 * Stops rendering. Returns a promise that resolves once rendering has been completely stopped.
	 */
	async stop(){
		this._state = STATE_CANCELLED;
	}

	/**
	 * Internal method. Calls all screen refresh callbacks, waits for the next animation frame, and resets the corresponding timer.
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
	 * Renders one pixel of a given size and position.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} pixelSize
	 */
	renderPixel(x,y,pixelSize){
		const maxIterations = this._maxIterations;
		this._memory.renderPixel(x,y,pixelSize,(x,y)=>{
			let cx = this._viewport.pixelXToFractalX(x);
			let cy = this._viewport.pixelYToFractalY(y);
			return this._formula.iterate(cx,cy,{maxIterations});
		},(iterations)=>{
			return (iterations==maxIterations?0:Math.floor(255.999*iterations/maxIterations)+(Math.floor(175.999*iterations/maxIterations)<<8))+0xff000000;
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
	constructor(memory,n=1,offset=0){
		super(memory);
		this._n = n;
		this._offset = offset;
		this._i = 0;
	}
	/**
	 * @inheritdoc
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 * @param {SharedArrayBuffer} buffer
	 */
	async render(formula,viewport,maxIterations,buffer=null){
		super.render(formula,viewport,maxIterations);
		this._memory.reset(viewport.pixelWidth,viewport.pixelHeight,buffer);
		this._i = 0;
		this._finishRenderCallPromise = new Promise(async(resolve)=>{
			await this._render();
			await this._refreshScreen();
			this._state = this._state===STATE_PENDING_CANCEL?STATE_CANCELLED:STATE_FINISHED;
			resolve();
		});
		return this._finishRenderCallPromise;
	}

	/**
	 * @inheritdoc
	 */
	async stop(){
		if (this._state===STATE_RENDERING){
			this._state = STATE_PENDING_CANCEL;
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
				for (var i=startIndex,l=Math.min(indices.length,i+1000*n);i<l;i+=n){
					let pixelIndex = indices[i];
					let x = pixelIndex%w;
					this.renderPixel(x,(pixelIndex-x)/w,pixelSizes[pixelIndex]);
				}
				if (i==startIndex||this._state!==STATE_RENDERING){
					resolve();
				}else{
					let promise = (this._shouldDoScreenRefreshs&&Date.now()-this._lastScreenRefresh>100)?this._refreshScreen():Promise.resolve();
					promise.then(()=>{
						renderPart(i);
					});
				}
			}
			renderPart(this._offset);
		});
	}
}