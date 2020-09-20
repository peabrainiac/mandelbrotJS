import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import FractalRenderer, {STATE_RENDERING,STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED} from "./FractalRenderer.js";
import FractalRendererMemory, {FractalRendererSharedMemory} from "./FractalRendererMemory.js";
import FractalRendererWorker, {moduleWorkersSupported} from "./FractalRendererWorker.js";

export {moduleWorkersSupported}

/**
 * A renderer that makes use of Web Workers and FractalPartRenderers to render the image more quickly.
 */
export default class MultithreadedFractalRenderer extends FractalRenderer {
	/**
	 * @param {FractalFormula} formula 
	 * @param {FractalViewport} viewport 
	 * @param {number} maxIterations 
	 */
	constructor(formula,viewport,maxIterations){
		super(new FractalRendererSharedMemory(viewport.pixelWidth,viewport.pixelHeight),formula,viewport,maxIterations);
		this._renderers = [];
		let n = navigator.hardwareConcurrency||4;
		for (let i=0;i<n;i++){
			this._renderers.push(new FractalRendererWorker(this.memory,formula,viewport,maxIterations,n,i));
		}
		console.log("Created shared memory:",this.memory);
	}

	/** @inheritdoc */
	async render(){
		let isStillRunning = true;
		this._finishRenderCallPromise = new Promise(async(resolve)=>{
			this._state = STATE_RENDERING;
			await Promise.all(this._renderers.map(renderer=>renderer.render()));
			this._state = this._renderers.find(renderer=>(renderer._state!=STATE_FINISHED))?STATE_CANCELLED:STATE_FINISHED;
			isStillRunning = false;
			resolve();
		});
		(async()=>{
			while(isStillRunning){
				await this._refreshScreen();
			}
		})();
		return this._finishRenderCallPromise;
	}

	async stop(){
		if (this._state = STATE_RENDERING){
			this._state = STATE_PENDING_CANCEL;
			this._renderers.forEach((renderer)=>{
				renderer.stop();
			});
			await this._finishRenderCallPromise;
		}
	}

	/** @inheritdoc */
	get pixelsCalculated(){
		return this.memory.pixelsCalculated;
	}
}