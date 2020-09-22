import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import FractalRenderer, {STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED} from "./FractalRenderer.js";
import {FractalRendererSharedMemory} from "./FractalRendererMemory.js";

/**
 * Whether the browser supports module workers or not; these are required for this class to work.
 */
export const moduleWorkersSupported = (()=>{
    let supportsModules = false;
    let url = URL.createObjectURL(new Blob([""]))
    let w = new Worker(url,{get type(){
        supportsModules = true;
        return "module";
    }});
    w.terminate();
	URL.revokeObjectURL(url);
	if (!supportsModules){
		console.warn("Module workers don't seem to be supported by this browser; multithreading probably won't work here.");
	}
    return supportsModules;
})();

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
		this._worker = new Worker("explorer/renderer/worker.js",{type:"module"});
		this._worker.postMessage({action:"init",data:{memory:this.memory,n,offset}});
	}

	/**
	 * @inheritdoc
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 */
	async render(formula,viewport,maxIterations){
		super.render(formula,viewport,maxIterations);
		this._worker.postMessage({action:"render",data:{formula:FractalFormula.prepareStructuredClone(formula),viewport,maxIterations,buffer:this._memory.buffer}});
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
		this._worker.postMessage({action:"stop"});
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