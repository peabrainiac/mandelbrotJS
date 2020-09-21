import {FractalFormula,FractalViewport} from "../../MandelMaths.js";

import FractalRendererMemory, {FractalRendererSharedMemory,ITERATIONS_NOT_YET_KNOWN,RENDER_GRID_SIZES} from "./FractalRendererMemory.js";

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
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 */
	async render(formula,viewport,maxIterations){
		this._formula = formula;
		this._viewport = viewport;
		this._maxIterations = maxIterations;
		if (!(this._memory instanceof FractalRendererSharedMemory)){
			this._memory.reset(viewport.pixelWidth,viewport.pixelHeight);
		}
		this._finishRenderCallPromise = new Promise(async(resolve)=>{
			this._state = STATE_RENDERING;
			for (let i=0;i<RENDER_GRID_SIZES.length;i++){
				await this._renderPart(RENDER_GRID_SIZES[i]);
			}
			await this._refreshScreen();
			this._state = this._state===STATE_PENDING_CANCEL?STATE_CANCELLED:STATE_FINISHED;
			resolve();
		});
		return this._finishRenderCallPromise;
	}

	async stop(){
		if (this._state = STATE_RENDERING){
			this._state = STATE_PENDING_CANCEL;
			await this._finishRenderCallPromise;
		}
	}

	/**
	 * Internal method. Renders a single resolution level.
	 * @param {number} pixelSize 
	 */
	async _renderPart(pixelSize){
		const w = this._viewport.pixelWidth;
		const h = this._viewport.pixelHeight;
		let x = (Math.round(w*0.5/pixelSize)-1)*pixelSize;
		let y = Math.round(h*0.5/pixelSize)*pixelSize;
		for (let i=0,r=Math.ceil(Math.max(w,h)*0.5/pixelSize);i<r*2&this._state===STATE_RENDERING;i+=2){
			for (let i2=0;i2<i;i2++){
				this.renderPixel(x,y,pixelSize);
				x -= pixelSize;
			}
			// inlined if to avoid frequent rescheduling; for some reason, awaiting an async function pauses execution even if
			// the function immediately returns, so moving the if inside the function would be noticeably slower.
			if (this._shouldDoScreenRefreshs&&Date.now()-this._lastScreenRefresh>100){
				await this._refreshScreen();
			}
			for (let i2=0;i2<i+1;i2++){
				this.renderPixel(x,y,pixelSize);
				y -= pixelSize;
			}
			if (this._shouldDoScreenRefreshs&&Date.now()-this._lastScreenRefresh>100){
				await this._refreshScreen();
			}
			for (let i2=0;i2<i+1;i2++){
				this.renderPixel(x,y,pixelSize);
				x += pixelSize;
			}
			if (this._shouldDoScreenRefreshs&&Date.now()-this._lastScreenRefresh>100){
				await this._refreshScreen();
			}
			for (let i2=0;i2<i+2;i2++){
				this.renderPixel(x,y,pixelSize);
				y += pixelSize;
			}
			if (this._shouldDoScreenRefreshs&&Date.now()-this._lastScreenRefresh>100){
				await this._refreshScreen();
			}
		}
	}

	/**
	 * Internal method. Calls all screen refresh callbacks, waits for the next animation frame, and resets the corresponding timer.
	 */
	async _refreshScreen(){
		this._onBeforeScreenRefreshCallbacks.forEach((callback)=>{
			callback();
		});
		await new Promise((resolve)=>{
			requestAnimationFrame(resolve);
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
			this._pixelsCalculated++;
			return this._formula.iterate(cx,cy,{maxIterations});
		},(iterations)=>{
			return (iterations==maxIterations?0:Math.floor(255.999*iterations/maxIterations)+(Math.floor(175.999*iterations/maxIterations)<<8))+0xff000000;
		});
	}
}
/**
 * A renderer that renders only part of the image; that way, the work can be split up between multiple threads.
 * 
 * More specifically, this renders only every nth pixel a normal renderer would, starting at any given offset.
 */
export class FractalPartRenderer extends FractalRenderer {
	/**
	 * @param {FractalRendererMemory} memory
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 * @param {number} n
	 * @param {number} offset
	 */
	constructor(memory,n,offset){
		super(memory);
		this._n = n;
		this._offset = offset;
		this._i = 0;
	}

	/**
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 * @param {SharedArrayBuffer} buffer
	 */
	async render(formula,viewport,maxIterations,buffer){
		this._i = 0;
		this._memory.reset(viewport.pixelWidth,viewport.pixelHeight,buffer);
		await super.render(formula,viewport,maxIterations);
	}

	/**
	 * @inheritdoc
	 * @param {number} x
	 * @param {number} y
	 * @param {number} pixelSize
	 */
	renderPixel(x,y,pixelSize){
		if (this._i++%this._n==this._offset){
			super.renderPixel(x,y,pixelSize);
		}
	}
}