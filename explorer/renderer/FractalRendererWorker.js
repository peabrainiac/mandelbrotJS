import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import FractalRenderer, {STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED, SimpleFractalRendererControlArray} from "./FractalRenderer.js";
import {FractalRendererSharedMemory} from "./FractalRendererMemory.js";
import ModuleWorkerWorkaround, {moduleWorkersSupported} from "./moduleWorkerWorkaround/ModuleWorkerWorkaround.js";
export {moduleWorkersSupported};

/**
 * A Fractal Renderer that renders part of an image by executing a `FractalPartRenderer` in a WebWorker.
 */
export default class FractalRendererWorker extends FractalRenderer {
	/**
	 * @param {FractalRendererSharedMemory} memory
	 * @param {number} n
	 * @param {number} offset
	 */
	constructor(memory,n,offset){
		super(memory);
		this._controlArray = SimpleFractalRendererControlArray.createShared();
		this._worker = new ModuleWorkerWorkaround("explorer/renderer/worker.js",{name:"Worker_"+offset});
		this._worker.postMessage({action:"init",data:{memory:memory.prepareStructuredClone(),n,offset,controlArray:this._controlArray}});
	}

	/**
	 * @inheritdoc
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {object} options
	 * @param {number} options.maxIterations
	 * @param {number} options.samplesPerPixel
	 */
	async render(formula,viewport,{maxIterations,samplesPerPixel}){
		super.render(formula,viewport,{maxIterations,samplesPerPixel});
		this._worker.postMessage({action:"render",data:{formula:FractalFormula.prepareStructuredClone(formula),viewport,maxIterations,samplesPerPixel,buffer:this._memory.buffer}});
		return new Promise((resolve)=>{
			let listener = (e)=>{
				if (e.data.message==="finished"){
					this._state = this._state===STATE_PENDING_CANCEL?STATE_CANCELLED:STATE_FINISHED;
					resolve();
					this._worker.removeEventListener("message",listener);
				}
			}
			this._worker.addEventListener("message",listener);
		});
	}

	async stop(){
		this._state = STATE_PENDING_CANCEL;
		this._controlArray.pendingCancel = true;
		return new Promise((resolve)=>{
			let listener = (e)=>{
				if (e.data.message==="finished"){
					resolve();
					this._worker.removeEventListener("message",listener);
				}
			}
			this._worker.addEventListener("message",listener);
		});
	}
}