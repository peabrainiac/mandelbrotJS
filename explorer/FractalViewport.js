/**
 * A viewport object, used to convert between absolute, relative and pixel coordinates.
 */
export default class FractalViewport {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} zoom
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(x,y,zoom,width,height){
		this._x = x;
		this._y = y;
		this._zoom = zoom;
		this._width = width;
		this._height = height;
	}

	/**
	 * the width of the viewport in fractal coordinates.
	 * @readonly
	 */
	get width(){
		return this._width/this._zoom;
	}

	/**
	 * the height of the viewport in fractal coordinates.
	 * @readonly
	 */
	get height(){
		return this._height/this._zoom;
	}

	/**
	 * the width of the viewport in pixels.
	 * @readonly
	 */
	get pixelWidth(){
		return this._width;
	}

	/**
	 * the width of the viewport in pixels.
	 * @readonly
	 */
	get pixelHeight(){
		return this._height;
	}

	/**
	 * the x-coordinate of the center of the viewport in fractal coordinates.
	 * @readonly
	 */
	get x(){
		return this._x;
	}

	/**
	 * the y-coordinate of the center of the viewport in fractal coordinates.
	 * @readonly
	 */
	get y(){
		return this._y;
	}

	copy(){
		return new FractalViewport(this._x,this._y,this._zoom,this._width,this._height);
	}

	/** @param {number} pixelX */
	pixelXToFractalX(pixelX){
		return this._x+(pixelX/this.pixelWidth-0.5)*this.width;
	}

	/** @param {number} pixelY */
	pixelYToFractalY(pixelY){
		return this._y+(pixelY/this.pixelHeight-0.5)*this.height;
	}

	/** @param {number} fractalX */
	fractalXToPixelX(fractalX){
		return ((fractalX-this._x)/this.width+0.5)*this.pixelWidth;
	}

	/** @param {number} fractalY */
	fractalYToPixelY(fractalY){
		return ((fractalY-this._y)/this.height+0.5)*this.pixelHeight;
	}

	/** @param {number} relativeOffsetX */
	toFractalX(relativeOffsetX){
		return this._x+(relativeOffsetX-0.5)*this.width;
	}

	/** @param {number} relativeOffsetY */
	toFractalY(relativeOffsetY){
		return this._y+(relativeOffsetY-0.5)*this.height;
	}

	/** @param {number} fractalX */
	toRelativeX(fractalX){
		return (fractalX-this._x)/this.width+0.5;
	}

	/** @param {number} fractalY */
	toRelativeY(fractalY){
		return (fractalY-this._y)/this.height+0.5;
	}

	/** @param {number} relativeWidth */
	toFractalWidth(relativeWidth){
		return relativeWidth*this.width;
	}

	/** @param {number} relativeHeight */
	toFractalHeight(relativeHeight){
		return relativeHeight*this.height;
	}

	/** @param {number} fractalWidth */
	toRelativeWidth(fractalWidth){
		return fractalWidth/this.width;
	}

	/** @param {number} fractalHeight */
	toRelativeHeight(fractalHeight){
		return fractalHeight/this.height;
	}

	/**
	 * Reconstructs a `FractalViewport` that has been serialized and deserialized using the structured cloning algorithm, used by, for example, `postMessage`.
	 * @param {{_x:number,_y:number,_zoom:number,_width:number,_height:number}} clone
	 */
	static fromStructuredClone(clone){
		return new FractalViewport(clone._x,clone._y,clone._zoom,clone._width,clone._height);
	}
}