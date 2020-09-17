import {FractalFormula,FractalViewport} from "../../MandelMaths.js";

export const STATE_LOADING = 0;
export const STATE_PENDING_RENDER = 1;
export const STATE_RENDERING = 2;
export const STATE_PENDING_CANCEL = 3;
export const STATE_CANCELLED = 4;
export const STATE_FINISHED = 5;
export const ITERATIONS_NOT_YET_KNOWN = -Infinity;
export const RENDER_GRID_SIZES = [64,16,4,1];

/**
 * The base class for all types of renderers.
 */
export default class FractalRenderer {
	/**
	 * @param {Float64Array} iterationsArray
	 * @param {Uint32Array} colorsArray
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 */
	constructor(iterationsArray,colorsArray,formula,viewport,maxIterations){
		this._iterationsArray = iterationsArray;
		this._colorsArray = colorsArray;
		this._formula = formula;
		this._viewport = viewport;
		this._maxIterations = maxIterations;
		this._pixelsCalculated = 0;
		this._state = STATE_LOADING;
		this._lastScreenRefresh = Date.now();
		this._shouldDoScreenRefreshs = true;
		/** @type {(()=>{})[]} */
		this._onBeforeScreenRefreshCallbacks = [];
	}
	
	async render(){
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
		const w = this._viewport.pixelWidth;
		const h = this._viewport.pixelHeight;
		if (x+pixelSize>0&&y+pixelSize>0&&x<w&&y<h){
			let px = Math.max(0,Math.min(w-1,Math.floor(x+pixelSize/2)));
			let py = Math.max(0,Math.min(h-1,Math.floor(y+pixelSize/2)));
			let color = this.getPixelColor(px,py);
			if (pixelSize>1){
				for (let x2=Math.max(0,x),x3=Math.min(w,x+pixelSize);x2<x3;x2++){
					for (let y2=Math.max(0,y),y3=Math.min(h,y+pixelSize);y2<y3;y2++){
						this._colorsArray[x2+y2*w] = color;
					}
				}
			}
		}
	}

	/**
	 * Returns the color of a specific pixel as a 32-bit abgr integer. If the color hasn't been computed yet, it is computed, stored in the buffer, and then returned.
	 * @param {number} x
	 * @param {number} y
	 */
	getPixelColor(x,y){
		let index = x+y*this._viewport.pixelWidth;
		let cachedValue = this._iterationsArray[index];
		if (cachedValue!=ITERATIONS_NOT_YET_KNOWN){
			return this._colorsArray[index];
		}else{
			let cx = this._viewport._x+(x-this._viewport.pixelWidth/2)/this._viewport._zoom;
			let cy = this._viewport._y+(y-this._viewport.pixelHeight/2)/this._viewport._zoom;
			let maxIterations = this._maxIterations;
			let i = this._formula.iterate(cx,cy,{maxIterations});
			let color = (i==maxIterations?0:Math.floor(255.999*i/maxIterations)+(Math.floor(175.999*i/maxIterations)<<8))+0xff000000;
			this._iterationsArray[index] = i;
			this._colorsArray[index] = color;
			this._pixelsCalculated++;
			return color;
		}
	}

	/**
	 * Returns the computed iteration count for a pixel, or, if that specific pixel hasn't been computed yet, the iteration count for the nearest already computed pixel in one of the larger grid sizes.
	 * @param {number} x
	 * @param {number} y
	 */
	getPixelIterations(x,y){
		const w = this._viewport.pixelWidth;
		const h = this._viewport.pixelHeight;
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

	get pixelsCalculated(){
		return this._pixelsCalculated;
	}
}