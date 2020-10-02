((path,messageTypeString)=>{
	/** Whether or not to log things related to module loading. */
	const verbose = false;//self.name.endsWith("0");
	const consolePrefix = self.name?self.name+": ":"";
	/** @type {{path:string,module:any}[]} */
	const modules = [];
	/** @type {{path:string,callback:(module:any)=>{}}[]} */
	const moduleCallbacks = [];
	/** @param {string} path */
	const loadModuleDynamically = async(relativePath,origin="")=>{
		const path = joinRelativePaths(origin,relativePath);
		if (verbose){
			console.log(consolePrefix+"Called dynamic import:",{relativePath,origin,path});
		}
		/** @type {{path:string,module:any}} */
		let moduleData = modules.find(module=>module.path===path)||await (()=>{
			self.postMessage({type:messageTypeString,action:"loadModule",data:{path}});
			return new Promise((resolve)=>{
				moduleCallbacks.push({path,callback:module=>{
					resolve({path,module});
				}});
			});
		})();
		return moduleData.module;
	};
	self.addEventListener("message",(e)=>{
		if (verbose){
			console.log(consolePrefix+"Message to workaround worker.js:",e.data);
		}
		if (e.data.type===messageTypeString){
			/** @type {{action:"loadModule",data:{modules:{path:string,code:string,imports:string[]}[]}}} */
			const message = e.data;
			e.stopImmediatePropagation();
			message.data.modules.forEach(moduleData=>{
				let dynamicImport = (path)=>loadModuleDynamically(path,moduleData.path);
				let moduleCode = (verbose?`console.log("${consolePrefix}Loading module ${moduleData.path}! arguments:",[...arguments]);`:"")+moduleData.code;
				let module = (new Function(moduleCode))(...moduleData.imports.map(path=>modules.find(module=>(module.path===path)).module),dynamicImport);
				if (verbose){
					console.log(`${consolePrefix}Constructed module "${moduleData.path}" in worker:`,{module});
				}
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

	/**
	 * Given the path to a ressource and the path of a ressource relative to that, returns the path to that second ressource.
	 * 
	 * Copied from ModuleLoader.js - kind of redundand, but seems to be necessary for now.
	 * @param {string} path1
	 * @param {string} path2
	 */
	function joinRelativePaths(path1,path2){
		let path = path1.replace(/[^/]*$/,"")+path2;
		path = path.replace(/\/\.\//,"/");
		while(/\/[^/]*[^/.]\/\.\.\//.test(path)){
			path = path.replace(/\/[^/]*[^/.]\/\.\.\//,"/");
		}
		path = path.replace(/^\.\/\.\.\//,"/").replace(/^[^/]*[^/.]\/\.\.\//,"");
		if (path.startsWith(".")&&!path1.startsWith(".")){
			path = path.replace(/^\.\.?\//,"");
		}
		return path;
	}
	loadModuleDynamically(path);
})();