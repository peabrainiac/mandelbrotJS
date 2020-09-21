import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import FractalRenderer, {FractalPartRenderer,STATE_RENDERING,STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED} from "./FractalRenderer.js";
import FractalRendererMemory, {FractalRendererSharedMemory,ITERATIONS_NOT_YET_KNOWN,RENDER_GRID_SIZES} from "./FractalRendererMemory.js";

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
	 * @param {FractalFormula} formula
	 * @param {FractalViewport} viewport
	 * @param {number} maxIterations
	 * @param {number} n
	 * @param {number} offset
	 */
	constructor(memory,formula,viewport,maxIterations,n,offset){
		super(memory,formula,viewport,maxIterations);
		this._worker = new Worker("explorer/renderer/worker.js",{type:"module"});
		this._worker.postMessage({action:"init",data:{memory:this.memory,formula:FractalFormula.prepareStructuredClone(formula),viewport,maxIterations,n,offset}});
	}

	/** @inheritdoc */
	async render(){
		this._worker.postMessage({action:"render"});
		return new Promise((resolve)=>{
			let listener = (e)=>{
				if (e.data.message==="finished"){
					resolve();
					this._worker.removeEventListener("message",listener);
					setTimeout(()=>{
						this._worker.terminate();
					});
				}
			}
			this._worker.addEventListener("message",listener);
		});
	}

	async stop(){
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

	/** @inheritdoc */
	get pixelsCalculated(){
		return -1;
	}
}