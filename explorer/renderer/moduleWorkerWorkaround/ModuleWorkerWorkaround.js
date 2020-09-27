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
 * All modules that have been loaded so far, or are currently being loaded.
 * @type {ModuleData[]}
 */
const moduleCache = [];

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
			let module = ModuleData.get(path);
			await module.waitUntilImportsLoaded();
			let code = ModuleWorkerWorkaround.transpileModuleWithImports(module);
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

}

/**
 * Information about a javascript module file.
 */
class ModuleData {
	/**
	 * Loads, analyzes and constructs a new `ModuleData` for the module at the given URL.
	 * @param {string} path 
	 */
	constructor(path){
		this._path = path;
		this._fullyLoaded = false;
		this._fullyLoadedImports = false;
		moduleCache.push(this);
		this._fullyLoadedPromise = (async()=>{
			const source = (await (await fetch(path)).text()).replace(/[\n\r]+/g,"\n");
			const topLevelStatementsRegex = /(?:^|\n)(?:(\/\*\*[^]*?\*\/)\n)?([^\n\t/].*(?:(?:\n\t.*)+\n[^\n\t].*)?)/g;
			const importStatementRegex = /^(?:import|export) ([a-zA-Z]\w*)?,? ?{([^}]+)} from "(.*)";?$/
			/** @type {{comment:string,code:string}[]} */
			const topLevelStatements = Array.from(source.matchAll(topLevelStatementsRegex),matchGroups=>({comment:matchGroups[1],code:matchGroups[2]}));
			const importStatements = topLevelStatements.filter(statement=>(importStatementRegex.test(statement.code)));
			const imports = importStatements.map(statement=>{
				const matchArray = statement.code.match(importStatementRegex);
				const relativePath = matchArray[3];
				const absolutePath = ModuleData.joinRelativePaths(path,relativePath);
				const imports = [...matchArray[1]?[{import:"default",alias:matchArray[1]}]:[],...matchArray[2]?matchArray[2].split(",").map(member=>{
					const matchArray = member.match(/^ ?([a-zA-Z]\w*)(?: as ([a-zA-Z]\w*))?$/);
					return {import:matchArray[1],alias:matchArray[2]};
				}):[]];
				const module = ModuleData.get(absolutePath);
				return {relativePath,absolutePath,imports,statement,module,export:statement.code.startsWith("export")};
			});
			this._source = source;
			this._imports = imports;
			this._topLevelStatements = topLevelStatements;
			this._fullyLoaded = true;
			return this;
		})();
		this._fullyLoadedImportsPromise = (async()=>{
			const indirectImports = [];
			/** @param {ModuleData} module */
			let addImports = async(module)=>{
				console.log(`Adding imports of module "${module.path}".`);
				await module.waitUntilLoaded();
				await Promise.all(module.imports.map(importData=>{
					let module = importData.module;
					if (!indirectImports.includes(module)){
						indirectImports.push(module);
						return addImports(module);
					}else{
						return Promise.resolve();
					}
				}));
			};
			await addImports(this);
			this._indirectImports = indirectImports;
			this._fullyLoadedImports = true;
			return this;
		})();
	}

	/**
	 * Returns a module from the cache, or constructs a new one if it hasn't been loaded yet.
	 * @param {string} path
	 */
	static get(path){
		return moduleCache.find(module=>(module.path===path))||new ModuleData(path);
	}

	/** @readonly */
	get path(){
		return this._path;
	}

	/**
	 * Whether this module has been loaded and analyzed yet.
	 * 
	 * Does NOT imply whether or not the modules imported by this module have been loaded yet.
	 * @readonly
	 */
	get fullyLoaded(){
		return this._fullyLoaded
	}

	/**
	 * Returns a promise that resolves with the module once it itself has been loaded and analyzed.
	 */
	async waitUntilLoaded(){
		return this._fullyLoadedPromise;
	}

	/**
	 * Whether this module and all of its imports have been loaded yet.
	 * @readonly
	 */
	get fullyLoadedImports(){
		return this._fullyLoadedImports;
	}

	/**
	 * Returns a promise that resolves with the module once it and all of its imports have been loaded
	 */
	async waitUntilImportsLoaded(){
		return this._fullyLoadedImportsPromise;
	}

	/** @readonly */
	get source(){
		return this._source;
	}

	/**
	 * Information about the import statements in this module. For the actual imported modules, see `ModuleData.imports[].module`.
	 * @readonly
	 */
	get imports(){
		return this._imports;
	}

	/**
	 * The top-level statements in this module.
	 * @readonly
	 */
	get topLevelStatements(){
		return this._topLevelStatements;
	}

	/**
	 * A list of modules imported by this module, either directly or indirectly.
	 * 
	 * @type {ModuleData}
	 * @readonly
	 */
	get indirectImports(){
		return this._indirectImports;
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
window.moduleCache = moduleCache;
window.ModuleWorkerWorkaround = ModuleWorkerWorkaround;
window.ModuleData = ModuleData;