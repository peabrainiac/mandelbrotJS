import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import {SimpleFractalRenderer, SimpleFractalRendererControlArray} from "./FractalRenderer.js";
import {FractalRendererSharedMemory} from "./FractalRendererMemory.js";

/** @type {SimpleFractalRenderer} */
let renderer = null;

self.addEventListener("message",async(e)=>{
	console.log("Retrieved message in worker.js!",e.data);
	let message = e.data;
	if (message.action==="init"){
		let memory = FractalRendererSharedMemory.fromStructuredClone(message.data.memory);
		let controlArray = SimpleFractalRendererControlArray.fromStructuredClone(message.data.controlArray);
		renderer = new SimpleFractalRenderer(memory,message.data.n,message.data.offset,{shouldDoScreenRefreshs:false,controlArray});
	}else if(message.action==="render"){
		let formula = await FractalFormula.fromStructuredClone(message.data.formula);
		let viewport = FractalViewport.fromStructuredClone(message.data.viewport);
		let maxIterations = message.data.maxIterations;
		let samplesPerPixel = message.data.samplesPerPixel;
		await renderer.render(formula,viewport,{maxIterations,samplesPerPixel},message.data.buffer);
		// shows an error because typescript doesn't know that self refers to a worker context here
		// @ts-ignore
		self.postMessage({message:"finished"});
	}
});