import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import {SimpleFractalRenderer} from "./FractalRenderer.js";
import {FractalRendererSharedMemory} from "./FractalRendererMemory.js";

/** @type {SimpleFractalRenderer} */
let renderer = null;

self.addEventListener("message",async(e)=>{
	console.log("Retrieved message in worker.js!",e.data);
	let message = e.data;
	if (message.action==="init"){
		let memory = FractalRendererSharedMemory.fromStructuredClone(message.data.memory);
		renderer = new SimpleFractalRenderer(memory,message.data.n,message.data.offset);
		console.log(renderer);
	}else if(message.action==="render"){
		let formula = await FractalFormula.fromStructuredClone(message.data.formula);
		let viewport = FractalViewport.fromStructuredClone(message.data.viewport);
		await renderer.render(formula,viewport,message.data.maxIterations,message.data.buffer);
		self.postMessage({message:"finished"});
	}else if(message.action==="stop"){
		renderer.stop();
	}
});