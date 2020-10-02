import {moduleCache,ModuleData} from "./ModuleLoader.js";

/**
 * Whether the browser supports module workers or not.
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
		console.warn("Module workers don't seem to be supported by this browser. Multithreading can still be done using a build-in transpiler, but might not work correctly.");
	}
    return supportsModules;
})();

/** A string containing the contents of `./worker.js`, wrapped in a Promise. */
const workerSource = (async()=>(await (await fetch(ModuleData.joinRelativePaths(import.meta.url,"./worker.js"))).text()))();
/** The value all internal messages on module workers have as their type attribute, to distinguish them from other messages. */
const messageTypeString = "ModuleWorkerWorkaround_internal";


/**
 * A class that helps to run module scripts in workers even when module workers are not supported by the browser.
 */
export default class ModuleWorkerWorkaround {
	/**
	 * Constructs a worker running a module script.
	 * @param {string} path
	 * @param {WorkerOptions} options
	 */
	constructor(path,options={}){
		this._ready = false;
		this._readyPromise = (async()=>{
			if (moduleWorkersSupported){
				this._worker = new Worker(path,{type:"module",name:options.name});
			}else{
				await new Promise(async(resolve)=>{
					const source = (await workerSource).replace(/\(\);$/,`("${path}","${messageTypeString}");`);
					let url = URL.createObjectURL(new Blob([source]));
					this._worker = new Worker(url,{name:options.name});
					URL.revokeObjectURL(url);
					/** @type {ModuleData[]} */
					this._modulesLoaded = [];
					this._worker.addEventListener("message",async(e)=>{
						if (e.data.type===messageTypeString){
							/** @type {{action:"loadModule",data:{path:string}}} */
							const message = e.data;
							e.stopImmediatePropagation();
							if (message.action==="loadModule"){
								let path = message.data.path;
								let module = ModuleData.get(path);
								await module.waitUntilImportsLoaded();
								/** @type {ModuleData[]} */
								let modulesToLoad = [];
								/** @param {ModuleData} module */
								let load = (module)=>{
									if (module.indirectImports.includes(module)){
										throw new Error(`Cyclic dependency detected: ${module.path}`);
									}else{
										module.imports.map(module=>module.module).forEach(module=>{
											if (!(this._modulesLoaded.includes(module)||modulesToLoad.includes(module))){
												load(module);
											}
										});
										modulesToLoad.push(module);
									}
								};
								load(module);
								let data = {modules:modulesToLoad.map(module=>({path:module.path,code:module.transpiledCode,imports:module.imports.map(module=>module.module.path)}))}
								this._worker.postMessage({type:messageTypeString,action:"loadModule",data});
								this._modulesLoaded.push(...modulesToLoad);
								resolve();
							}
						}
					});
				});
			}
			this._ready = true;
		})();
	}

	/** @readonly */
	get isReady(){
		return this._ready;
	}

	async waitUntilReady(){
		return this._readyPromise;
	}

	async postMessage(message){
		await this._readyPromise;
		this._worker.postMessage(message);
	}

	async addEventListener(type,listener){
		await this._readyPromise;
		this._worker.addEventListener(type,listener);
	}

	async removeEventListener(type,listener){
		await this._readyPromise;
		this._worker.removeEventListener(type,listener);
	}
}
window.moduleCache = moduleCache;
window.ModuleWorkerWorkaround = ModuleWorkerWorkaround;
window.ModuleData = ModuleData;