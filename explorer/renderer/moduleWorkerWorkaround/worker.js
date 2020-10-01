((path,messageTypeString)=>{
	/** @type {{path:string,module:any}[]} */
	const modules = [];
	/** @type {{path:string,callback:(module:any)=>{}}[]} */
	const moduleCallbacks = [];
	/** @param {string} path */
	const loadModuleDynamically = async(path,origin)=>{
		console.log("Called dynamic import:",path,origin);
		/** @type {{path:string,module:any}} */
		let moduleData = modules.find(module=>module.path===path)||await (()=>{
			self.postMessage({type:messageTypeString,action:"loadModule",data:{path,origin}});
			return new Promise((resolve)=>{
				moduleCallbacks.push({path,callback:module=>{resolve({path,module});console.log("Resolving dynamic import promise!",{path,module});}});
			});
		})();
		return moduleData.module;
	};
	self.addEventListener("message",(e)=>{
		console.log("Message to second worker.js:",e.data);
		if (e.data.type===messageTypeString){
			/** @type {{action:"loadModule",data:{modules:{path:string,code:string,imports:string[]}[]}}} */
			const message = e.data;
			e.stopImmediatePropagation();
			console.log("Received message!",message);
			message.data.modules.forEach(moduleData=>{
				let dynamicImport = (path)=>loadModuleDynamically(path,moduleData.path);
				let module = (new Function(moduleData.code))(...moduleData.imports.map(path=>modules.find(module=>(module.path===path)).module),dynamicImport);
				console.log(`Constructed module "${moduleData.path}" in worker:`,{module});
				modules.push({path:moduleData.path,module});
				for (let i=0;i<moduleCallbacks.length;i++){
					if (moduleCallbacks[i].path===moduleData.path){
						moduleCallbacks[i].callback(module);
						moduleCallbacks.splice(i--,1);
					}
				}
			});
		}
	});
	loadModuleDynamically(path);
})();