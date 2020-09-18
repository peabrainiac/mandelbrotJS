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
		this._x1 = x-(width/zoom)/2;
		this._y1 = y-(height/zoom)/2;
		this._x2 = x+(width/zoom)/2;
		this._y2 = y+(height/zoom)/2;
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

	copy(){
		return new FractalViewport(this._x,this._y,this._zoom,this._width,this._height);
	}

	pixelXToFractalX(pixelX){
		return this._x+(pixelX/this.pixelWidth-0.5)*this.width;
	}

	pixelYToFractalY(pixelY){
		return this._y+(pixelY/this.pixelHeight-0.5)*this.height;
	}

	toFractalX(relativeOffsetX){
		return this._x+(relativeOffsetX-0.5)*this.width;
	}

	toFractalY(relativeOffsetY){
		return this._y+(relativeOffsetY-0.5)*this.height;
	}

	toRelativeX(fractalX){
		return (fractalX-this._x)/this.width+0.5;
	}

	toRelativeY(fractalY){
		return (fractalY-this._y)/this.height+0.5;
	}

	toFractalWidth(relativeWidth){
		return relativeWidth*this.width;
	}

	toFractalHeight(relativeHeight){
		return relativeHeight*this.height;
	}

	toRelativeWidth(fractalWidth){
		return fractalWidth/this.width;
	}

	toRelativeHeight(fractalHeight){
		return fractalHeight/this.height;
	}
}