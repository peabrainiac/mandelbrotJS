import {MandelbrotPeriodicPoint} from "../formulas/Mandelbrot.js";

const commonShaderCode = /* glsl */`
	vec2 cmul(vec2 a, vec2 b){
		return vec2(dot(a,vec2(1.0,-1.0)*b),dot(a,b.yx));
	}

	vec2 cdiv(vec2 a, vec2 b){
		return vec2(dot(a,b),dot(a.yx,vec2(1.0,-1.0)*b))/dot(b,b);
	}
`;

const vertexShaderCode = /* glsl */`#version 300 es
	in vec4 position;
	in vec2 texcoord;

	out vec2 pos;

	void main() {
		gl_Position = position;
		pos = position.xy;
	}
`;

const fragmentShaderCode = /* glsl */`#version 300 es
	precision highp float;

	uniform vec2 C;
	uniform vec2 scale;
	uniform int period;
	uniform vec2 resolution;

	const int SAMPLESIZE = 2;

	in vec2 pos;

	out vec4 out_color;

	${commonShaderCode}

	void main() {
		int ITER = 100*period;
		float d;
		for (int sx=0;sx<SAMPLESIZE;sx++){
			for (int sy=0;sy<SAMPLESIZE;sy++){
				vec2 c = C+cmul(scale,(0.5*pos*resolution+vec2(-0.5,0.5)+(vec2(sx,sy)+vec2(0.5))/float(SAMPLESIZE)-vec2(0.5))/50.0+vec2(-0.5,1e-5));
				vec2 dc = scale/50.0;
				vec2 z = vec2(0.0);
				vec2 dz = vec2(0.0);
				int i;
				for (i=0;i<ITER&&dot(z,z)<16.0;i++){
					dz = 2.0*cmul(dz,z)+dc;
					z = cmul(z,z)+c;
				}
				d += min(1.0,i==ITER?1.0:2.0*sqrt(dot(z,z)/dot(dz,dz))*0.5*log(dot(z,z)));
			}
		}
		d /= float(SAMPLESIZE*SAMPLESIZE);
		out_color = vec4(vec3(0.95*d),1.0);
	}
`;

export default class WebGLMinibrotRenderer {
	constructor(){
		this._canvas = document.createElement("canvas");
		this._gl = this._canvas.getContext("webgl2");
		if (this._gl===null){
			throw new Error("failed to initialize rendering context; maybe WebGL isn't supported?")
		}
		this._vao = new Vao(this._gl);
		this._vao.addVbo(0,2,[-1,-1,-1,1,1,-1,1,-1,-1,1,1,1]);
		this._shader = new ShaderProgram(this._gl,vertexShaderCode,fragmentShaderCode);
		this._allRendersFinished = Promise.resolve();
	}

	/**
	 * @param {HTMLCanvasElement} canvas
	 * @param {MandelbrotPeriodicPoint} minibrot
	 */
	async render(canvas,minibrot){
		let prevPromise = this._allRendersFinished;
		return this._allRendersFinished = (async()=>{
			await prevPromise;
			const WIDTH = canvas.width;
			const HEIGHT = canvas.height;
			const gl = this._gl;
			if (this._canvas.width!==WIDTH||this._canvas.height!==HEIGHT){
				this._canvas.width = WIDTH;
				this._canvas.height = HEIGHT;
			}
			gl.viewport(0,0,WIDTH,HEIGHT);
			this._shader.uniforms.period = minibrot.period;
			this._shader.uniforms.C = {x:minibrot.x,y:minibrot.y};
			this._shader.uniforms.scale = minibrot.scale;
			this._shader.uniforms.resolution = {x:WIDTH,y:HEIGHT};
			gl.drawArrays(gl.TRIANGLES,0,6);
			canvas.getContext("2d").drawImage(this._canvas,0,0);
		})();
	}
}

/**
 * Wrapper for a WebGL2 shader, copied from one of my older projects.
 */
class Shader {
	/**
	 * @param {WebGL2RenderingContext} gl
	 * @param {number} type
	 * @param {string} [source]
	 */
	constructor(gl,type,source){
		this._gl = gl;
		this._id = gl.createShader(type);
		this._isReady = false;
		if (source){
			this.compile(source);
		}
	}

	/**
	 * @param {string} source
	 */
	compile(source){
		this._gl.shaderSource(this._id,source);
		this._gl.compileShader(this._id);
		if (!this._gl.getShaderParameter(this._id,this._gl.COMPILE_STATUS)){
			this._isReady = false;
			throw new Error("Could not compile shader!\n"+this._gl.getShaderInfoLog(this._id));
		}else{
			this._isReady = true;
		}
	}

	/** @readonly */
	get id(){
		return this._id;
	}

	get isReady(){
		return this._isReady;
	}
}

/**
 * Wrapper for a WebGL2 shader program, copied from one of my older projects.
 */
class ShaderProgram {
	/**
	 * @param {WebGL2RenderingContext} gl
	 * @param {string} [vertexSource]
	 * @param {string} [fragmentSource]
	 */
	constructor(gl,vertexSource,fragmentSource){
		this._gl = gl;
		this._vertexSource = vertexSource;
		this._fragmentSource = fragmentSource;
		this._vertexShader = new Shader(gl,gl.VERTEX_SHADER);
		this._fragmentShader = new Shader(gl,gl.FRAGMENT_SHADER);
		this._id = gl.createProgram();
		gl.attachShader(this._id,this._vertexShader.id);
		gl.attachShader(this._id,this._fragmentShader.id);
		this._uniformLocations = {};
		this._uniformTypes = {};
		/** @type {{[key:string]:any}} */
		let temp = {};
		this.uniforms = new Proxy(temp,{set:(target,property,value,receiver)=>{
			if (typeof property=="string"){
				target[property] = value;
				if (this._isReady){
					this.load(property,value);
				}
				return true;
			}else{
				return false;
			}
		}});
		temp = {};
		this.flags = new Proxy(temp,{set:(target,property,value,receiver)=>{
			if (typeof property=="string"){
				if (target[property]!=value){
					target[property] = value;
					if (this._isReady){
						this.compile(this._vertexSource,this._fragmentSource);
					}
				}
				return true;
			}else{
				return false;
			}
		}});
		this._isReady = false;
		if (vertexSource&&fragmentSource){
			this.compile(vertexSource,fragmentSource);
		}
	}

	/**
	 * @param {string} vertexSource
	 * @param {string} fragmentSource
	 */
	compile(vertexSource,fragmentSource){
		this._vertexSource = vertexSource;
		this._fragmentSource = fragmentSource;
		console.log("Compiling!");
		let flags = Object.getOwnPropertyNames(this.flags).filter((flag)=>(this.flags[flag]));
		console.log("Active flags:",flags);
		let flagString = (flags.length?"\n#define "+flags.join("\n#define "):"")+"\n";
		console.log("Flagstring:",flagString);
		this._vertexShader.compile(vertexSource.replace("\n",flagString));
		this._fragmentShader.compile(fragmentSource.replace("\n",flagString));
		this._gl.linkProgram(this._id);
		if (!this._gl.getProgramParameter(this._id,this._gl.LINK_STATUS)){
			this._isReady = false;
			throw new Error("Could not link shader program!\n"+this._gl.getProgramInfoLog(this._id));
		}else{
			this._isReady = true;
		}
		this._gl.useProgram(this._id);
		/** @type {{[key:string]:WebGLUniformLocation}} */
		this._uniformLocations = {};
		/** @type {{[key:string]:number}} */
		this._uniformTypes = {};
		/** @type {{[key:string]:string}} */
		this._uniformNames = {};
		let count = this._gl.getProgramParameter(this._id,this._gl.ACTIVE_UNIFORMS);
		let infos = [];
		for (let i=0;i<count;i++){
			let info = this._gl.getActiveUniform(this._id,i);
			let name = info.name.match(/^[^[]*/)[0];
			this._uniformTypes[name] = info.type;
			this._uniformNames[name] = info.name;
			this._uniformLocations[name] = this._gl.getUniformLocation(this._id,name);
			infos.push(info);
		}
		console.log("Active Uniforms:",infos);
		let uniforms = Object.getOwnPropertyNames(this.uniforms);
		for (let i=0;i<uniforms.length;i++){
			this.load(uniforms[i],this.uniforms[uniforms[i]]);
		}
	}

	get isReady(){
		return this._isReady;
	}

	/**
	 * @param {string} name
	 * @param {number|{x:number,y:number}} value
	 */
	load(name,value){
		let type = this._uniformTypes[name];
		if(!this._uniformLocations[name]){
			console.warn("Error loading uniform! Name:",name,", type:",type,", value:",value);
		}else if (type==this._gl.INT&&typeof value=="number"){
			this.loadInt(name,value);
		}else if(type==this._gl.FLOAT&&typeof value=="number"){
			this.loadFloat(name,value);
		}else if(type==this._gl.FLOAT_VEC2&&!this._uniformNames[name].endsWith("[0]")&&typeof value=="object"){
			this.loadVector2f(name,value);
		}else{
			throw new Error("unsupported uniform type");
		}
	}

	/**
	 * @param {string} name
	 * @param {number} value
	 */
	loadInt(name,value){
		this._gl.uniform1i(this._uniformLocations[name],value);
	}

	/**
	 * @param {string} name
	 * @param {number} value
	 */
	loadFloat(name,value){
		this._gl.uniform1f(this._uniformLocations[name],value);
	}
	/**
	 * @param {string} name
	 * @param {{x:number,y:number}} value
	 */
	loadVector2f(name,value){
		this._gl.uniform2f(this._uniformLocations[name],value.x,value.y);
	}
}

/**
 * Wrapper for a WebGL2 vao, copied from one of my older projects.
 */
class Vao {
	/**
	 * @param {WebGL2RenderingContext} gl
	 */
	constructor(gl){
		this._gl = gl;
		this._id = gl.createVertexArray();
		/** @type {WebGLBuffer[]} */
		this._vbos = [];
	}

	bind(){
		this._gl.bindVertexArray(this._id);
	}

	/**
	 * @param {number} location
	 * @param {number} dimensionality
	 * @param {Iterable<number>} data
	 */
	addVbo(location,dimensionality,data){
		let vbo = this._gl.createBuffer();
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER,vbo);
		this._gl.bindVertexArray(this._id);
		this._gl.vertexAttribPointer(location,dimensionality,this._gl.FLOAT,false,0,0);
		this._gl.enableVertexAttribArray(location);
		this._gl.bufferData(this._gl.ARRAY_BUFFER,new Float32Array(data),this._gl.STATIC_DRAW);
		this._vbos.push(vbo);
	}

	destroy(){
		for (let i=0;i<this._vbos.length;i++){
			this._gl.deleteBuffer(this._vbos[i]);
		}
		this._gl.deleteVertexArray(this._id);
	}

	/** @readonly */
	get id(){
		return this._id;
	}
}