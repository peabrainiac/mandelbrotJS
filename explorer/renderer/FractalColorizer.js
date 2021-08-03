import FractalRendererMemory, {ITERATIONS_NOT_YET_KNOWN} from "./FractalRendererMemory.js";

/**
 * Class responsible for constructing an image from a given `FractalRendererMemory`.
 */
export default class FractalColorizer {
	/**
	 * @param {FractalRendererMemory} memory
	 */
	constructor(memory){
		this._memory = memory;
		this._maxIterations = 200;
		this.reset();
	}

	/**
	 * Resets the colorizer. Should be called after resetting the corresponding memory.
	 */
	reset(){
		const width = this._memory.width;
		const height = this._memory.height;
		if (this._imageWidth!==width||this._imageHeight!==height){
			/** @type {number} */
			this._imageWidth = width;
			this._imageHeight = height;
			if (width>0&&height>0){
				this._imageData = new ImageData(width,height);
				this._colorsArray = new Uint32Array(this._imageData.data.buffer,0,width*height);
			}else{
				this._colorsArray = null;
				this._imageData = null;
			}
		}else{
			this._colorsArray.fill(0xff000000);
		}
		/** @type {number} */
		this._pixelsDrawn = 0;
	}

	get imageData(){
		//const t = performance.now();
		const w = this._imageWidth;
		const h = this._imageHeight;
		const maxIterations = this._maxIterations;
		const finishedIndicesArray = this._memory.finishedIndicesArray;
		const pixelSizeArray = this._memory.pixelSizeArray;
		const iterationsArray = this._memory.iterationsArray;
		/** @param {number} iterations */
		let getColor = (iterations)=>((iterations==maxIterations?0:Math.floor(255.999*iterations/maxIterations)+(Math.floor(175.999*iterations/maxIterations)<<8))+0xff000000);
		for (var i=this._pixelsDrawn,l=this._memory.pixelsCalculated;i<l;i++){
			let index = finishedIndicesArray[i];
			let pixelSize = pixelSizeArray[index];
			let color = getColor(iterationsArray[index]);
			this._colorsArray[index] = color;
			if (pixelSize>1){
				let px = index%w;
				let py = (index-px)/w;
				let offset = Math.floor(pixelSize/2);
				for (let x2=Math.max(0,px-offset),x3=Math.min(w,px-offset+pixelSize);x2<x3;x2++){
					for (let y2=Math.max(0,py-offset),y3=Math.min(h,py-offset+pixelSize);y2<y3;y2++){
						if (iterationsArray[x2+y2*w]===ITERATIONS_NOT_YET_KNOWN){
							this._colorsArray[x2+y2*w] = color;
						}
					}
				}
			}
		}
		//console.log(`Updated ${this._memory.pixelsCalculated-this._pixelsDrawn} pixels: `,(performance.now()-t)+"ms");
		this._pixelsDrawn = i;
		return this._imageData;
	}

	set maxIterations(maxIterations){
		this._maxIterations = maxIterations;
	}

	/** @type {number} */
	get maxIterations(){
		return this._maxIterations;
	}
}