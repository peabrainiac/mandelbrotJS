import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import MandelbrotFormula from "../../formulas/Mandelbrot.js";
import FractalRenderer, {FractalPartRenderer,STATE_RENDERING,STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED} from "./FractalRenderer.js";
import { FractalRendererSharedMemory } from "./FractalRendererMemory.js";

/** @type {FractalPartRenderer} */
let renderer = null;

self.addEventListener("message",async(e)=>{
	let message = e.data;
	if (message.action==="init"){
		let memory = FractalRendererSharedMemory.fromStructuredClone(message.data.memory);
		let viewport = FractalViewport.fromStructuredClone(message.data.viewport);
		renderer = new FractalPartRenderer(memory,new MandelbrotFormula(),viewport,message.data.maxIterations,message.data.n,message.data.offset);
		console.log(renderer);
	}else if(message.action==="render"){
		await renderer.render();
		self.postMessage({message:"finished"});
	}else if(message.action==="stop"){
		renderer.stop();
	}
});