import {FractalFormula} from "../MandelMaths.js";

export default class MandelbarFormula extends FractalFormula {
	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {Object} options
	 * @param {number} options.maxIterations maximum number of iterations
	 */
	iterate(cx,cy,{maxIterations=100}){
		let zx = cx;
		let zy = cy;
		let i;
		for (i=0;i<maxIterations&&zx*zx+zy*zy<4;i++){
			let temp = zx*zx-zy*zy+cx;
			zy = -2*zx*zy+cy;
			zx = temp;
		}
		return i;
	}
}