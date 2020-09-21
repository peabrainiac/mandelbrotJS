import {FractalFormula,FractalViewport} from "../../MandelMaths.js";
import FractalRenderer, {FractalPartRenderer,STATE_RENDERING,STATE_PENDING_CANCEL,STATE_CANCELLED,STATE_FINISHED} from "./FractalRenderer.js";
import { FractalRendererSharedMemory } from "./FractalRendererMemory.js";

/** @type {FractalPartRenderer} */
let renderer = null;

self.addEventListener("message",async(e)=>{
	let message = e.data;
	if (message.action==="init"){
		renderer = new Promise(async (resolve)=>{
			let memory = FractalRendererSharedMemory.fromStructuredClone(message.data.memory);
			let formula = await FractalFormula.fromStructuredClone(message.data.formula);
			let viewport = FractalViewport.fromStructuredClone(message.data.viewport);
			renderer = new FractalPartRenderer(memory,formula,viewport,message.data.maxIterations,message.data.n,message.data.offset);
			console.log(renderer);
			resolve(renderer);
		});
	}else if(message.action==="render"){
		await (await renderer).render();
		self.postMessage({message:"finished"});
	}else if(message.action==="stop"){
		(await renderer).stop();
	}
});