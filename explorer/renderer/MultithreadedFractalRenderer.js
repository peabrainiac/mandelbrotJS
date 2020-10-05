import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import FractalRenderer, {STATE_RENDERING,STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED} from "./FractalRenderer.js";
import {FractalRendererSharedMemory,sharedArrayBuffersSupported} from "./FractalRendererMemory.js";
import FractalRendererWorker from "./FractalRendererWorker.js";

/** Whether multithreading as currently implemented works in this browser. */
export const multithreadingSupported = sharedArrayBuffersSupported;

/**
 * A renderer that makes use of Web Workers and FractalPartRenderers to render the image more quickly.
 */
export default class MultithreadedFractalRenderer extends FractalRenderer {
	/**
	 * @param {FractalFormula} formula 
	 * @param {FractalViewport} viewport 
	 * @param {number} maxIterations 
	 */
	constructor(memory){
		super(memory||new FractalRendererSharedMemory());
		this._renderers = [];
		let n = (navigator.hardwareConcurrency||4)-1;
		for (let i=0;i<n;i++){
			this._renderers.push(new FractalRendererWorker(this.memory,n,i));
		}
		console.log("Created renderers:",this._renderers);
		console.log("Created shared memory:",this.memory);
	}

	/**
	 * @inheritdoc
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 */
	async render(formula,viewport,maxIterations){
		super.render(formula,viewport,maxIterations);
		this._memory.reset(viewport.pixelWidth,viewport.pixelHeight);
		let isStillRunning = true;
		this._finishRenderCallPromise = new Promise(async(resolve)=>{
			await Promise.all(this._renderers.map(renderer=>renderer.render(formula,viewport,maxIterations)));
			this._state = this._renderers.find(renderer=>(renderer.state!=STATE_FINISHED))?STATE_CANCELLED:STATE_FINISHED;
			isStillRunning = false;
			console.log("Computed pixels:",this.memory.pixelsCalculated);
			await this._refreshScreen();
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
}