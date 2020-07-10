export default class MandelMaths {
	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {Object} options
	 * @param {number} options.maxIterations maximum number of iterations
	 * @param {boolean} options.doCardioidClipTest whether to test if points are in the main cardioid or main bulb using a simple implicit formula. Speeds up rendering around these areas immensely, but causes a very slight slowdown everywhere else.
	 */
	static iterate(cx,cy,{maxIterations=100,doCardioidClipTest=true}){
		if (doCardioidClipTest&&((cx*cx+2*cx+1+cy*cy<0.0625)||((cx*cx-0.5*cx+0.0625+cy*cy)*(cx-0.25+cx*cx-0.5*cx+0.0625+cy*cy)-0.25*cy*cy<0))){
			return maxIterations;
		}else{
			let zx = cx;
			let zy = cy;
			let i;
			for (i=0;i<maxIterations&&zx*zx+zy*zy<4;i++){
				let temp = zx*zx-zy*zy+cx;
				zy = 2*zx*zy+cy;
				zx = temp;
			}
			return i;
		}
	}

	/**
	 * Approximates nearby orbit points.
	 * 
	 * Only applies a single calculation step without further refining, so the results may be wieldly inaccurate.
	 * @param {number} cx 
	 * @param {number} cy 
	 * @param {number} maxIterations 
	 * @param {number} zoom 
	 */
	static approxNearbyOrbitPoints(cx,cy,maxIterations=100,zoom=1){
		let zx = cx;
		let zy = cy;
		let dx = 1;
		let dy = 0;
		let i;
		let points = [];
		let approximationRadius = Infinity;
		for (i=0;i<maxIterations&&zx*zx+zy*zy<4;i++){
			let d = Math.sqrt(zx*zx+zy*zy);
			if (d<approximationRadius){
				let pcx = cx-(zx*dx+zy*dy)/(dx*dx+dy*dy);
				let pcy = cy-(zy*dx-zx*dy)/(dx*dx+dy*dy);
				points.push(new OrbitPoint(pcx,pcy,dx,dy,i+1));
				approximationRadius = d/2;
			}
			let zx2 = zx*zx-zy*zy+cx;
			let zy2 = 2*zx*zy+cy;
			let dx2 = 2*(dx*zx-dy*zy)+1;
			let dy2 = 2*(dx*zy+dy*zx);
			zx = zx2;
			zy = zy2;
			dx = dx2;
			dy = dy2;
		}
		return points;
	}
}
export class OrbitPoint {
	/**
	 * @param {number} x 
	 * @param {number} y 
	 * @param {number} dx 
	 * @param {number} dy 
	 */
	constructor(x,y,dx,dy,orbitLength){
		this.x = x;
		this.y = y;
		this.dx = dx;
		this.dy = dy;
		this.orbitLength = orbitLength;
	}
}
window.MandelMaths = MandelMaths;