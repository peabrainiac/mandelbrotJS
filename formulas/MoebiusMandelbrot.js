import {FractalFormula} from "../MandelMaths.js";

export default class MoebiusMandelbrotFormula extends FractalFormula {
	constructor(a=1){
		super();
		this._a = 1;
	}

	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {Object} options
	 * @param {number} options.maxIterations maximum number of iterations
	 */
	iterate(cx,cy,{maxIterations=100}){
		const a = this._a;
		let x = 0;
		let y = 0;
		let i;
		for (i=-1;i<maxIterations&&x*x+y*y<64;i++){
			let temp = x*x-y*y+cx;
			y = 2*x*y+cy;
			x = temp;
			if (x<-a){
				x += 2*a;
				y *= -1;
			}else if(x>a){
				x -= 2*a;
				y *= -1;
			}
		}
		return i;
	}
}