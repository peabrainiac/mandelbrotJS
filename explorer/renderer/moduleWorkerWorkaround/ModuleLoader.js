/**
 * Default export. Currently empty.
 */
export default class ModuleLoader {}

/**
 * All modules that have been loaded so far, or are currently being loaded.
 * @type {ModuleData[]}
 */
export const moduleCache = [];

/**
 * Information about a javascript module file.
 */
export class ModuleData {
	/**
	 * @typedef {{relativePath:string,absolutePath:string,imports:ImportMemberData[],statement:StatementData,module:ModuleData,export:boolean}} ImportData
	 * @typedef {{import:string,alias:string}} ImportMemberData
	 * @typedef {{comment:string,code:string}} StatementData
	 */
	/**
	 * Loads, analyzes and constructs a new `ModuleData` for the module at the given URL.
	 * @param {string} path 
	 */
	constructor(path){
		console.log(`Loading module "${path}".`);
		this._path = path;
		this._fullyLoaded = false;
		this._fullyLoadedImports = false;
		moduleCache.push(this);
		this._fullyLoadedPromise = (async()=>{
			const source = (await (await fetch(path)).text()).replace(/[\n\r]+/g,"\n");
			const topLevelStatementsRegex = /(?:^|\n)(?:(\/\*\*[^]*?\*\/)\n)?([^\n\t/].*(?:(?:\n\t.*)+\n[^\n\t].*)?)/g;
			const importStatementRegex = /^(?:import|export) ([a-zA-Z]\w*)?,? ?(?:{([^}]+)})? from "(.*)";?$/
			const topLevelStatements = Array.from(source.matchAll(topLevelStatementsRegex),matchGroups=>new StatementData(matchGroups[2],matchGroups[1]));
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
	 * Returns the code of the module transpiled into a non-module form.
	 * 
	 * This would kinda make more sense to have in ModuleWorkerWorkaround.js, but moving it there would make module caching more complicated, so for now it's here.
	 * @readonly
	 */
	get transpiledCode(){
		if (this._transpiledCode===undefined&&this.fullyLoaded){
			this._transpiledCode = `const EXPORTS = {};\nconst IMPORT = arguments[${this.imports.length}];\n\n`+this.topLevelStatements.map((statement)=>{
				const importData = this.imports.find(importData=>(importData.statement===statement));
				if (importData){
					let index = this.imports.indexOf(importData);
					return importData.imports.map(importMember=>`${importData.export?"EXPORTS.":"const "}${importMember.alias||importMember.import} = arguments[${index}].${importMember.import};`).join("\n");
				}else if (statement.code.startsWith("export ")){
					const code = statement.code;
					const comment = statement.comment?statement.comment+"\n":"";
					const exportAssignmentRegex = /^export (const|var|let) ([A-Za-z]\w*) = ([^]+)$/;
					const exportListRegex = /^export {([^}]+)};?$/;
					const exportClassRegex = /^export(?: (default))? class ([a-zA-Z]\w*) ([^]+)$/;
					if (exportAssignmentRegex.test(code)){
						let matchArray = code.match(exportAssignmentRegex);
						return comment+`${matchArray[1]} ${matchArray[2]} = EXPORTS.${matchArray[2]} = ${matchArray[3]}`;
					}else if(exportListRegex.test(code)){
						return comment+code.match(exportListRegex)[1].split(",").map(member=>{
							let matchArray = member.match(/^ ?([a-zA-Z]\w*)(?: as ([a-zA-Z]\w*))?$/);
							return `EXPORTS.${matchArray[2]||matchArray[1]} = ${matchArray[1]};`;
						}).join("\n");
					}else if(exportClassRegex.test(code)){
						let matchArray = code.match(exportClassRegex);
						return `let ${matchArray[2]} = EXPORTS.${matchArray[1]||matchArray[2]} = class ${matchArray[2]} ${matchArray[3]}`;
					}else{
						console.assert(!code.startsWith("export"),`Can't transpile export statement: "${code}".`);
						return statement;
					}
				}else{
					return statement;
				}
			}).join("\n\n").replace(/import\(/,"IMPORT(")+"\n\nreturn EXPORTS;";
		}
		return this._transpiledCode;
	}

	/**
	 * Given the path to a ressource and the path of a ressource relative to that, returns the path to that second ressource.
	 * @param {string} path1
	 * @param {string} path2
	 */
	static joinRelativePaths(path1,path2){
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
}
/**
 * A single javascript statement, possibly with an attached comment.
 */
class StatementData {
	/**
	 * @param {string} code
	 * @param {string} comment
	 */
	constructor(code,comment){
		this.code = code;
		this.comment = comment;
	}

	toString(){
		return (this.comment||"")+(this.comment&&this.code?"\n":"")+(this.code||"");
	}
}