import Timer from "../util/Timer.js";

import {FractalFormula,FractalViewport} from "../MandelMaths.js";
import MandelbrotFormula from "../formulas/Mandelbrot.js";
import FractalRenderer, {SimpleFractalRenderer,STATE_LOADING,STATE_PENDING_RENDER,STATE_RENDERING,STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED,ITERATIONS_NOT_YET_KNOWN,RENDER_GRID_SIZES} from "./renderer/FractalRenderer.js";
import MultithreadedFractalRenderer, {multithreadingSupported} from "./renderer/MultithreadedFractalRenderer.js";

export {STATE_LOADING,STATE_PENDING_RENDER,STATE_RENDERING,STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED,ITERATIONS_NOT_YET_KNOWN,RENDER_GRID_SIZES};

/**
 * Custom element responsible for rendering and displaying an image based on a given formula and location.
 */
export default class FractalCanvas extends HTMLElement {
	constructor(){
		super();
		this._width = 960;
		this._height = 720;
		this._x = -0.75;
		this._y = 0;
		this._pixelsPerUnit = 200;
		this._zoom = 1*this._pixelsPerUnit;
		this._iterations = 15000;
		this._samplesPerPixel = 1;
		/** @type {((viewport:FractalViewport)=>void)[]} */
		this._onViewportChangeCallbacks = [];
		/** @type {((state:number)=>void)[]} */
		this._onStateChangeCallbacks = [];
		/** @type {((progress:number)=>void)[]} */
		this._onProgressChangeCallbacks = [];
		/** @type {((canvas:HTMLCanvasElement)=>void)[]} */
		this._onCanvasUpdateCallbacks = [];
		/** @type {((canvas:HTMLCanvasElement)=>void)[]} */
		this._onNextCanvasUpdateCallbacks = [];
		/** @type {((zoom:number)=>void)[]} */
		this._onZoomChangeCallbacks = [];
		this._formulaChangeCallback = ()=>{
			this.render();
		};
		this._state = STATE_LOADING;
		this._progress = 0;
		/** @type {FractalFormula} */
		this._formula = new MandelbrotFormula();
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
		// @ts-ignore
		this._canvas = this.shadowRoot.getElementById("canvas");
		this._ctx = this._canvas.getContext("2d");
		this._progressTimer = new Timer();
		/** @type {FractalRenderer} */
		this._renderer = new (multithreadingSupported?MultithreadedFractalRenderer:SimpleFractalRenderer)(null);
		this._renderer.onBeforeScreenRefresh(()=>{
			this._refreshCanvas();
		});
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
				await this._renderer.stop();
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
	 * The internal rendering method. Immediately starts rendering regardless of current state.
	 */
	async _render(){
		this._state = STATE_RENDERING;
		console.log("Started Rendering!");
		this._progressTimer.reset();
		this._progressTimer.start();
		this._canvas.width = this._width;
		this._canvas.height = this._height;
		await this._renderer.render(this._formula,this.viewport,{maxIterations:this._iterations,samplesPerPixel:this._samplesPerPixel});
		this._progressTimer.stop();
		if (this._state===STATE_PENDING_CANCEL){
			this._state = STATE_CANCELLED;
			console.log("Cancelled Rendering!");
		}else{
			this._state = STATE_FINISHED;
			console.log(`Finished Rendering in ${Math.floor(this._progressTimer.time*10000)/10}ms!`);
			console.assert(this.progress===1,`Somehow finished at ${this.progress*100}%, not 100.`);
		}
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	getPixelIterations(x,y){
		return this._renderer?this._renderer.memory.getIterations(x,y):ITERATIONS_NOT_YET_KNOWN;
	}

	_refreshCanvas(){
		this._ctx.putImageData(this._renderer.imageData,0,0);
		this._progress = this._pixelsCalculated/(this._width*this._height);
		this._onCanvasUpdateCallbacks.forEach(callback=>{
			callback(this._canvas);
		});
		this._onNextCanvasUpdateCallbacks.forEach(callback=>{
			callback(this._canvas);
		});
		this._onNextCanvasUpdateCallbacks = [];
	}

	/**
	 * Registers a callback to be executed after every time the canvas is updated, and also once when the callback is registered.
	 * @param {(canvas:HTMLCanvasElement)=>void} callback
	 */
	onCanvasUpdate(callback){
		this._onCanvasUpdateCallbacks.push(callback);
		callback(this._canvas);
	}

	/**
	 * Registers a callback to be executed after the next time the canvas is updated.
	 * @param {(canvas:HTMLCanvasElement)=>void} callback
	 */
	onNextCanvasUpdate(callback){
		this._onNextCanvasUpdateCallbacks.push(callback);
	}

	get _pixelsCalculated(){
		return this._renderer?this._renderer.memory.pixelsCalculated:0;
	}
	
	get canvas(){
		return this._canvas;
	}

	get state(){
		return this._state;
	}

	/**
	 * @param {(state:number)=>void} callback
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
	 * @param {(progress:number)=>void} callback
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

	get progressTimer(){
		return this._progressTimer;
	}

	set formula(formula){
		if (this._formula){
			this._formula.removeChangeCallback(this._formulaChangeCallback);
		}
		this._formula = formula;
		formula.onChange(this._formulaChangeCallback);
	}

	/** @type {FractalFormula} */
	get formula(){
		return this._formula;
	}

	set iterations(iterations){
		this._iterations = iterations;
		/** @todo preserve old pixels buffer, update only where necessary */
		this.render();
	}

	/** @type {number} */
	get iterations(){
		return this._iterations;
	}

	set samplesPerPixel(samplesPerPixel){
		this._samplesPerPixel = samplesPerPixel;
		this.render();
	}

	/**
	 * The number of samples to take per pixel. Limited to powers of two at the moment.
	 * @type {number}
	 */
	get samplesPerPixel(){
		return this._samplesPerPixel;
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
	 * @param {(zoom:number)=>void} callback
	 */
	onZoomChange(callback){
		this._onZoomChangeCallbacks.push(callback);
		callback(this.zoom);
	}

	get viewport(){
		return new FractalViewport(this._x,this._y,this._zoom,this._width,this._height);
	}

	/**
	 * @param {(viewport:FractalViewport)=>void} callback
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

	/** @param {number} x */
	mouseXToFractalX(x){
		return this._x+(x/this.offsetWidth-0.5)*this._width/this._zoom;
	}

	/** @param {number} y */
	mouseYToFractalY(y){
		return this._y+(y/this.offsetHeight-0.5)*this._height/this._zoom;
	}

	/** @param {number} x */
	mouseXToPixelX(x){
		return x*this._width/this.offsetWidth;
	}

	/** @param {number} y */
	mouseYToPixelY(y){
		return y*this._height/this.offsetHeight;
	}

	set width(width){
		this.setAttribute("width",width.toString());
	}

	get width(){
		return this._width;
	}

	set height(height){
		this.setAttribute("height",height.toString());
	}

	get height(){
		return this._height;
	}

	static get observedAttributes(){
		return ["width","height"];
	}

	/**
	 * @param {string} name
	 * @param {string} oldValue
	 * @param {string} newValue
	 */
	attributeChangedCallback(name,oldValue,newValue){
		if (name==="width"){
			this._width = parseFloat(newValue);
			this._callViewportChangeCallbacks();
			this.render();
		}else if (name=="height"){
			this._height = parseFloat(newValue);
			this._callViewportChangeCallbacks();
			this.render();
		}
	}
}
customElements.define("fractal-canvas",FractalCanvas);