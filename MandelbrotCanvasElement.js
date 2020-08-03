import MandelMaths from "./MandelMaths.js";

export const STATE_LOADING = 0;
export const STATE_PENDING_RENDER = 1;
export const STATE_RENDERING = 2;
export const STATE_PENDING_CANCEL = 3;
export const STATE_CANCELLED = 4;
export const STATE_FINISHED = 5;
export const ITERATIONS_NOT_YET_KNOWN = -Infinity;
export const RENDER_GRID_SIZES = [64,16,4,1];
export default class MandelbrotCanvasElement extends HTMLElement {
	constructor(){
		super();
		this._width = 960;
		this._height = 720;
		this._x = -0.75;
		this._y = 0;
		this._pixelsPerUnit = 200;
		this._zoom = 1*this._pixelsPerUnit;
		this._iterations = 15000;
		this._onViewportChangeCallbacks = [];
		this._onStateChangeCallbacks = [];
		this._onProgressChangeCallbacks = [];
		this._onZoomChangeCallbacks = [];
		this._state = STATE_LOADING;
		this._progress = 0;
		this._pixelsCalculated = 0;
		this.attachShadow({mode:"open"});
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
					position: relative;
					cursor: crosshair;
				}
				canvas {
					position: absolute;
					width: 100%;
					height: 100%;
				}
				#canvas-2 {
					display: none;
				}
			</style>
			<canvas id="canvas"></canvas>
		`;
		/** @type {HTMLCanvasElement} */
		this._canvas = this.shadowRoot.getElementById("canvas");
		this._ctx = this._canvas.getContext("2d");
		this._lastScreenRefresh = Date.now();
		this.render();
	}

	/**
	 * Starts rendering the fractal after a short timeout and completes once the rendering process is finished or cancelled.
	 * 
	 * Will cancel the previous rendering process if it is still and already running, but just wait for it to complete if it has already been scheduled but not started yet.
	 */
	async render() {
		if (this._state===STATE_PENDING_RENDER){
			await this._finishRenderCallPromise;
		}else{
			if (this._state===STATE_RENDERING||this._state===STATE_PENDING_CANCEL){
				this._state = STATE_PENDING_CANCEL;
				await this._finishRenderCallPromise;
				await this.render();
			}else{
				this._state = STATE_PENDING_RENDER;
				let promise = this._finishRenderCallPromise = new Promise(async(resolve)=>{
					console.log("Queued Rendering!");
					let renderQueueTimeoutID = setTimeout(async()=>{
						await this._render();
						resolve();
					},0);
					this._cancelQueuedRendering = ()=>{
						clearTimeout(renderQueueTimeoutID);
						this._state = STATE_CANCELLED;
						resolve();
					};
				});
				await promise;
			}
		}
	}

	/**
	 * The actual rendering method. Immediately starts rendering regardless of current state.
	 */
	async _render(){
		this._state = STATE_RENDERING;
		console.log("Started Rendering!");
		let start = Date.now();
		this._canvas.width = this._width;
		this._canvas.height = this._height;
		this._pixelColors = new Uint32Array(this._width*this._height);
		this._pixelIterations = new Float64Array(this._width*this._height);
		this._pixelIterations.fill(ITERATIONS_NOT_YET_KNOWN);
		this._imageData = new ImageData(new Uint8ClampedArray(this._pixelColors.buffer),this._width);
		this._pixelsCalculated = 0;
		for (let i=0;i<RENDER_GRID_SIZES.length;i++){
			await this._renderPart(RENDER_GRID_SIZES[i]);
		}
		this._refreshCanvas();
		if (this._state===STATE_PENDING_CANCEL){
			this._state = STATE_CANCELLED;
			console.log("Cancelled Rendering!");
		}else{
			this._state = STATE_FINISHED;
			this._progress = 1;
			console.log(`Finished Rendering in ${Math.floor((Date.now()-start)*10)/10}ms!`);
		}
	}

	async _renderPart(pixelSize){
		let x = (Math.round(this._width*0.5/pixelSize)-1)*pixelSize;
		let y = Math.round(this._height*0.5/pixelSize)*pixelSize;
		for (let i=0,r=Math.ceil(Math.max(this._width,this._height)*0.5/pixelSize);i<r*2&this._state===STATE_RENDERING;i+=2){
			for (let i2=0;i2<i;i2++){
				this._renderPixel(x,y,pixelSize);
				x -= pixelSize;
			}
			await this._waitForScreenRefresh();
			for (let i2=0;i2<i+1;i2++){
				this._renderPixel(x,y,pixelSize);
				y -= pixelSize;
			}
			await this._waitForScreenRefresh();
			for (let i2=0;i2<i+1;i2++){
				this._renderPixel(x,y,pixelSize);
				x += pixelSize;
			}
			await this._waitForScreenRefresh();
			for (let i2=0;i2<i+2;i2++){
				this._renderPixel(x,y,pixelSize);
				y += pixelSize;
			}
			await this._waitForScreenRefresh();
		}
	}

	_renderPixel(x,y,pixelSize){
		const w = this._width;
		const h = this._height;
		if (x+pixelSize>0&&y+pixelSize>0&&x<w&&y<h){
			let px = Math.max(0,Math.min(w-1,Math.floor(x+pixelSize/2)));
			let py = Math.max(0,Math.min(h-1,Math.floor(y+pixelSize/2)));
			let color = this.getPixelColor(px,py);
			if (pixelSize>1){
				for (let x2=Math.max(0,x),x3=Math.min(w,x+pixelSize);x2<x3;x2++){
					for (let y2=Math.max(0,y),y3=Math.min(h,y+pixelSize);y2<y3;y2++){
						this._pixelColors[x2+y2*w] = color;
					}
				}
			}
		}
	}

	getPixelColor(x,y){
		let index = x+y*this._width;
		let cachedValue = this._pixelIterations[index];
		if (cachedValue!=ITERATIONS_NOT_YET_KNOWN){
			return this._pixelColors[index];
		}else{
			let cx = this._x+(x-this._width/2)/this._zoom;
			let cy = this._y+(y-this._height/2)/this._zoom;
			let maxIterations = this._iterations;
			let i = MandelMaths.iterate(cx,cy,{maxIterations});
			let color = (i==maxIterations?0:Math.floor(255.999*i/maxIterations)+(Math.floor(175.999*i/maxIterations)<<8))+0xff000000;
			this._pixelIterations[index] = i;
			this._pixelColors[index] = color;
			this._pixelsCalculated++;
			return color;
		}
	}

	getPixelIterations(x,y){
		const w = this._width;
		const h = this._height;
		for (let i=RENDER_GRID_SIZES.length-1;i>=0;i--){
			let pixelSize = RENDER_GRID_SIZES[i];
			let cx = (Math.round(w*0.5/pixelSize)-1)*pixelSize;
			let cy = Math.round(h*0.5/pixelSize)*pixelSize;
			let px = cx+pixelSize*Math.floor((x-cx)/pixelSize);
			let py = cy+pixelSize*Math.floor((y-cy)/pixelSize);
			let px2 = Math.max(0,Math.min(w-1,Math.floor(px+pixelSize/2)));
			let py2 = Math.max(0,Math.min(h-1,Math.floor(py+pixelSize/2)));
			let iterations = this._pixelIterations[px2+py2*w];
			if (iterations!=ITERATIONS_NOT_YET_KNOWN){
				return iterations;
			}
		}
		return ITERATIONS_NOT_YET_KNOWN;
	}

	async _waitForScreenRefresh(){
		if (Date.now()-this._lastScreenRefresh>100){
			this._refreshCanvas();
			await new Promise((resolve)=>{
				requestAnimationFrame(resolve);
			});
			this._lastScreenRefresh = Date.now();
		}
	}

	_refreshCanvas(){
		this._ctx.putImageData(this._imageData,0,0);
		this._progress = this._pixelsCalculated/(this._width*this._height);
	}
	
	get canvas(){
		return this._canvas;
	}

	get state(){
		return this._state;
	}

	/**
	 * @param {(state:number)=>{}} callback 
	 */
	onStateChange(callback){
		this._onStateChangeCallbacks.push(callback);
		callback(this.state);
	}

	set _state(state){
		this.__state = state;
		this._onStateChangeCallbacks.forEach((callback)=>{
			callback(state);
		});
	}

	/** @type {number} */
	get _state(){
		return this.__state;
	}

	get progress(){
		return this._progress;
	}

	/**
	 * @param {(progress:number)=>{}} callback 
	 */
	onProgress(callback){
		this._onProgressChangeCallbacks.push(callback);
		callback(this.progress);
	}

	set _progress(progress){
		this.__progress = progress;
		this._onProgressChangeCallbacks.forEach((callback)=>{
			callback(progress);
		})
	}

	/** @type {number} */
	get _progress(){
		return this.__progress;
	}

	set iterations(iterations){
		this._iterations = iterations;
		/** @todo preserve old pixels buffer, update only where necessary */
		this.render();
	}

	get iterations(){
		return this._iterations;
	}

	set x(x){
		this._x = x;
		this._callViewportChangeCallbacks();
		this.render();
	}

	/** @type {number} */
	get x(){
		return this._x;
	}

	set y(y){
		this._y = y;
		this._callViewportChangeCallbacks();
		this.render();
	}

	/** @type {number} */
	get y(){
		return this._y;
	}

	set pixelsPerUnit(pixelsPerUnit){
		this._zoom *= pixelsPerUnit/this._pixelsPerUnit;
		this._pixelsPerUnit = pixelsPerUnit;
		this.render();
	}

	/** @type {number} */
	get pixelsPerUnit(){
		return this._pixelsPerUnit;
	}

	set zoom(zoom){
		this._zoom = zoom*this._pixelsPerUnit;
		this._onZoomChangeCallbacks.forEach((callback)=>{
			callback(zoom);
		});
		this._callViewportChangeCallbacks();
		this.render();
	}

	/** @type {number} */
	get zoom(){
		return this._zoom/this._pixelsPerUnit;
	}

	/**
	 * @param {(zoom:number)=>{}} callback 
	 */
	onZoomChange(callback){
		this._onZoomChangeCallbacks.push(callback);
		callback(this.zoom);
	}

	get viewport(){
		return new FractalViewport(this._x-(this._width/this._zoom)/2,this._y-(this._height/this._zoom)/2,this._x+(this._width/this._zoom)/2,this._y+(this._height/this._zoom)/2);
	}

	/**
	 * @param {(viewport:FractalViewport)=>{}} callback 
	 */
	onViewportChange(callback){
		this._onViewportChangeCallbacks.push(callback);
		callback(this.viewport);
	}

	_callViewportChangeCallbacks(){
		this._onViewportChangeCallbacks.forEach((callback)=>{
			callback(this.viewport);
		});
	}

	mouseXToFractalX(x){
		return this._x+(x/this.offsetWidth-0.5)*this._width/this._zoom;
	}

	mouseYToFractalY(y){
		return this._y+(y/this.offsetHeight-0.5)*this._height/this._zoom;
	}

	mouseXToPixelX(x){
		return x*this._width/this.offsetWidth;
	}

	mouseYToPixelY(y){
		return y*this._height/this.offsetHeight;
	}

	set width(width){
		this.setAttribute("width",width);
	}

	get width(){
		return this._width;
	}

	set height(height){
		this.setAttribute("height",height);
	}

	get height(){
		return this._height;
	}

	static get observedAttributes(){
		return ["width","height"];
	}

	attributeChangedCallback(name,oldValue,newValue){
		if (name==="width"){
			this._width = newValue*1;
			this._callViewportChangeCallbacks();
			this.render();
		}else if (name=="height"){
			this._height = newValue*1;
			this._callViewportChangeCallbacks();
			this.render();
		}
	}
}
customElements.define("mandelbrot-canvas-element",MandelbrotCanvasElement);

export class FractalViewport {
	/**
	 * @param {number} x1 
	 * @param {number} y1 
	 * @param {number} x2 
	 * @param {number} y2 
	 */
	constructor(x1,y1,x2,y2){
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
	}

	set width(width){
		this.x2 = this.x1+width;
	}

	get width(){
		return this.x2-this.x1;
	}

	set height(height){
		this.y2 = this.y1+height;
	}

	get height(){
		return this.y2-this.y1;
	}

	toFractalX(relativeOffsetX){
		return this.x1+relativeOffsetX*this.width;
	}

	toFractalY(relativeOffsetY){
		return this.y1+relativeOffsetY*this.height;
	}

	toRelativeX(fractalX){
		return (fractalX-this.x1)/this.width;
	}

	toRelativeY(fractalY){
		return (fractalY-this.y1)/this.height;
	}

	toFractalWidth(relativeWidth){
		return relativeWidth*this.width;
	}

	toFractalHeight(relativeHeight){
		return relativeHeight*this.height;
	}

	toRelativeWidth(fractalWidth){
		return fractalWidth/this.width;
	}

	toRelativeHeight(fractalHeight){
		return fractalHeight/this.height;
	}

}