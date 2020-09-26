/**
 * Whether the browser supports module workers or not.
 */
export const moduleWorkersSupported = (()=>{
    let supportsModules = false;
    let url = URL.createObjectURL(new Blob([""]))
    let w = new Worker(url,{get type(){
        //supportsModules = true;
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
 * A class that helps to run module scripts in workers even when module workers are not supported by the browser.
 */
export default class ModuleWorkerWorkaround {
	/**
	 * @typedef {{path:string,source:string,imports:ImportData[],topLevelStatements:StatementData[],indirectImports:string[]}} ModuleData
	 * @typedef {{relativePath:string,absolutePath:string,imports:ImportMemberData[],statement:StatementData,module:ModuleData,export:boolean}} ImportData
	 * @typedef {{import:string,alias:string}} ImportMemberData
	 * @typedef {{comment:string,code:string}} StatementData
	 */

	/**
	 * Creates a module worker running the script at the given path, even if the browser doesn't support those. 
	 * @param {string} path 
	 */
	static async createWorker(path){
		if (moduleWorkersSupported){
			return new Worker(path,{type:"module"});
		}else{
			let module = await ModuleWorkerWorkaround.fetchModuleWithImports(path);
			let code = ModuleWorkerWorkaround.transpileModule(module);
			let url = URL.createObjectURL(new Blob([code],{type:"text/javascript"}));
			return new Worker(url);
		}
	}

	/**
	 * Transpiles a module and all of its imports into a single script.
	 * @param {ModuleData} module
	 */
	static transpileModuleWithImports(module){
		return `
			console.log("Hi! I'm in a worker.");
		`;
	}

	/**
	 * Recursively fetches and analyzes a module and all of its imports.
	 * @param {string} path
	 */
	static async fetchModuleWithImports(path){
		/** @type {ModuleData[]} */
		const fetchedModules = [];
		/** @type {string[]} */
		const modulePaths = [];
		await new Promise((resolve,reject)=>{
			/** @param {string} path */
			let fetch = (path)=>{
				if (!modulePaths.includes(path)){
					modulePaths.push(path);
					ModuleWorkerWorkaround.fetchModule(path).then((module)=>{
						fetchedModules.push(module);
						module.imports.forEach(importData=>{
							fetch(importData.absolutePath);
						})
						if (modulePaths.length==fetchedModules.length){
							resolve();
						}
					},reject);
				}
			}
			fetch(path);
		});
		fetchedModules.forEach(module=>{
			module.imports.forEach(importData=>{
				importData.module = fetchedModules.find(module=>(module.path===importData.absolutePath));
			});
		});
		fetchedModules.forEach(module=>{
			const indirectImports = [];
			/** @param {ModuleData} module */
			let addImports = (module)=>{
				module.imports.forEach(importData=>{
					if (!indirectImports.includes(importData.absolutePath)){
						indirectImports.push(importData.absolutePath);
						addImports(importData.module);
					}
				})
			};
			addImports(module);
			module.indirectImports = indirectImports;
		});
		return fetchedModules[0];
	}

	/**
	 * Fetches and analyzes a single module, without any of its imports.
	 * @param {string} path
	 */
	static async fetchModule(path){
		const source = (await (await fetch(path)).text()).replace(/[\n\r]+/g,"\n");
		const topLevelStatementsRegex = /(?:^|\n)(?:(\/\*\*[^]*?\*\/)\n)?([^\n\t/].*(?:(?:\n\t.*)+\n[^\n\t].*)?)/g;
		const importStatementRegex = /^(?:import|export) ([a-zA-Z]\w*)?,? ?{([^}]+)} from "(.*)";?$/
		/** @type {{comment:string,code:string}[]} */
		const topLevelStatements = Array.from(source.matchAll(topLevelStatementsRegex),matchGroups=>({comment:matchGroups[1],code:matchGroups[2]}));
		const importStatements = topLevelStatements.filter(statement=>(importStatementRegex.test(statement.code)));
		const imports = importStatements.map(statement=>{
			const matchArray = statement.code.match(importStatementRegex);
			const relativePath = matchArray[3];
			const absolutePath = ModuleWorkerWorkaround.joinRelativePaths(path,relativePath);
			const imports = [...matchArray[1]?[{import:"default",alias:matchArray[1]}]:[],...matchArray[2]?matchArray[2].split(",").map(member=>{
				const matchArray = member.match(/^ ?([a-zA-Z]\w*)(?: as ([a-zA-Z]\w*))?$/);
				return {import:matchArray[1],alias:matchArray[2]};
			}):[]];
			return {relativePath,absolutePath,imports,statement,module:null,export:statement.code.startsWith("export")};
		});
		return {path,source,imports,topLevelStatements,indirectImports:null};
	}

	/**
	 * Given the path to a ressource and the path of a ressource relative to that, returns the path to that second ressource.
	 * @param {string} path1
	 * @param {string} path2
	 */
	static joinRelativePaths(path1,path2){
		let path = path1.replace(/\/[^/]*$/,"/")+path2;
		path = path.replace(/\/\.\//,"/");
		while(/\/[^/]*[^/.]\/\.\.\//.test(path)){
			path = path.replace(/\/[^/]*[^/.]\/\.\.\//,"/");
		}
		return path.replace(/^\.\/\.\.\//,"/");
	}

}
window.ModuleWorkerWorkaround = ModuleWorkerWorkaround;