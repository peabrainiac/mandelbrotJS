/**
 * A constant representing iteration counts that have not yet been computed.
 */
export const ITERATIONS_NOT_YET_KNOWN = -Infinity;
export const RENDER_GRID_SIZES = [64,16,4,1];

/**
 * A class representing the memory needed to render a fractal image.
 */
export default class FractalRendererMemory {
	constructor(width,height,colorsArray=new Uint32Array(width*height),iterationsArray=FractalRendererMemory.createIterationsArray(width,height)){
		this._imageWidth = width;
		this._imageHeight = height;
		this._colorsArray = colorsArray;
		this._iterationsArray = iterationsArray;
		this._imageData = new ImageData(new Uint8ClampedArray(colorsArray.buffer),width);
		this._pixelsCalculated = 0;
	}

	/**
	 * Returns the computed iteration count for a pixel, or, if that specific pixel hasn't been computed yet, the iteration count for the nearest already computed pixel in one of the larger grid sizes.
	 * @param {number} x
	 * @param {number} y
	 */
	getIterations(x,y){
		const w = this._imageWidth;
		const h = this._imageHeight;
		for (let i=RENDER_GRID_SIZES.length-1;i>=0;i--){
			let pixelSize = RENDER_GRID_SIZES[i];
			let cx = (Math.round(w*0.5/pixelSize)-1)*pixelSize;
			let cy = Math.round(h*0.5/pixelSize)*pixelSize;
			let px = cx+pixelSize*Math.floor((x-cx)/pixelSize);
			let py = cy+pixelSize*Math.floor((y-cy)/pixelSize);
			let px2 = Math.max(0,Math.min(w-1,Math.floor(px+pixelSize/2)));
			let py2 = Math.max(0,Math.min(h-1,Math.floor(py+pixelSize/2)));
			let iterations = this._iterationsArray[px2+py2*w];
			if (iterations!=ITERATIONS_NOT_YET_KNOWN){
				return iterations;
			}
		}
		return ITERATIONS_NOT_YET_KNOWN;
	}
	
	/**
	 * Renders a single pixel in the given grid size (unless already has been rendered as part of one of the larger grid sizes; in that case, rendering it isn't necessary anymore).
	 * @param {number} x
	 * @param {number} y
	 * @param {number} pixelSize
	 * @param {(x:number,y:number)=>number} iterationsCallback function to compute the iteration count given the coordinates of the pixel's center.
	 * @param {(iterations:number)=>number} colorCallback function to compute the color as a 32-bit abgr integer based on the iteration count.
	 */
	renderPixel(x,y,pixelSize,iterationsCallback,colorCallback){
		const w = this._imageWidth;
		const h = this._imageHeight;
		if (x+pixelSize>0&&y+pixelSize>0&&x<w&&y<h){
			let px = Math.max(0,Math.min(w-1,Math.floor(x+pixelSize/2)));
			let py = Math.max(0,Math.min(h-1,Math.floor(y+pixelSize/2)));
			let index = px+py*w;
			if (this._iterationsArray[index]==ITERATIONS_NOT_YET_KNOWN){
				let iterations = iterationsCallback(px,py);
				let color = colorCallback(iterations);
				this._iterationsArray[index] = iterations;
				this._colorsArray[index] = color;
				this._pixelsCalculated++;
				if (pixelSize>1){
					for (let x2=Math.max(0,x),x3=Math.min(w,x+pixelSize);x2<x3;x2++){
						for (let y2=Math.max(0,y),y3=Math.min(h,y+pixelSize);y2<y3;y2++){
							this._colorsArray[x2+y2*w] = color;
						}
					}
				}
			}
		}
	}

	/** @readonly */
	get colorsArray(){
		return this._colorsArray;
	}

	/** @readonly */
	get iterationsArray(){
		return this._iterationsArray;
	}

	/** @readonly */
	get imageData(){
		return this._imageData;
	}

	/**
	 * Creates and returns a new iterations array of a given size.
	 * @param {number} width 
	 * @param {number} height 
	 */
	static createIterationsArray(width,height){
		const array = new Float64Array(width*height);
		array.fill(ITERATIONS_NOT_YET_KNOWN);
		return array;
	}
}