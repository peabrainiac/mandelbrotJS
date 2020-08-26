import {FractalFormula,CyclicPoint,Complex,ComplexWithDerivative} from "../MandelMaths.js";

export const TYPE_DISK = "disk";
export const TYPE_MINIBROT = "minibrot";

export default class MandelbrotFormula extends FractalFormula {
	/**
	 * Returns the iteration count for a specific point in the mandelbrot set.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {Object} options
	 * @param {number} options.maxIterations maximum number of iterations
	 * @param {boolean} options.doCardioidClipTest whether to test if points are in the main cardioid or main bulb using a simple implicit formula. Speeds up rendering around these areas immensely, but causes a very slight slowdown everywhere else.
	 */
	iterate(cx,cy,{maxIterations=100,doCardioidClipTest=true}){
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
	 * Approximates nearby cyclic points - see `./docs/idk.pdf` for a detailed explanation.
	 * 
	 * Only applies a single calculation step without further refining, so the results may be wieldly inaccurate.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 */
	approxNearbyCyclicPoints(cx,cy,maxIterations=100){
		let zx = cx;
		let zy = cy;
		let dx = 1;
		let dy = 0;
		let ddx = 0;
		let ddy = 0;
		let dddx = 0;
		let dddy = 0;
		let i;
		let points = [];
		let steps = [];
		for (i=0;i<maxIterations&&zx*zx+zy*zy<4;i++){
			let d = Math.sqrt(zx*zx+zy*zy);
			steps.push({zx,zy,d,dx,dy,i,ddx,ddy});
			if ((zx*zx+zy*zy)/(dx*dx+dy*dy)<Math.sqrt((zx*zx+zy*zy)/((ddx*ddx+ddy*ddy)/2))){
				//let pcx = cx-(zx*dx+zy*dy)/(dx*dx+dy*dy);
				//let pcy = cy-(zy*dx-zx*dy)/(dx*dx+dy*dy);
				let roots = Complex.getQuadraticRoots(new ComplexWithDerivative(ddx/2,ddy/2,dddx/2,dddy/2),new ComplexWithDerivative(dx,dy,ddx,ddy),new ComplexWithDerivative(zx,zy,dx,dy));
				let root = (roots[0].length<roots[1].length)?roots[0]:roots[1];
				let pcx = cx+root.x;
				let pcy = cy+root.y;
				let pdx = root.dx+1;
				let pdy = root.dy;
				if (pdx*pdx+pdy*pdy<0.5*0.5){
					let discard = false;
					for (let i2=0;i2<points.length;i2++){
						let p = points[i2];
						if (Complex.distance(new Complex(p.x,p.y),new Complex(pcx,pcy))<((i+1)%p.cycleLength==0?0.5:0.1)*Complex.distance(new Complex(pcx,pcy),new Complex(cx,cy))){
							discard = true;
							break;
						}
					}
					if (!discard){
						let point = this.getNearbyCyclicPoint(pcx,pcy,i+1);
						if (point!=null){
							point.firstEstimate = {x:pcx,y:pcy,dx,dy,ddx,ddy,dddx,dddy,pdx,pdy};
							points.push(point);
						}
					}
				}
			}
			let zx2 = zx*zx-zy*zy+cx;
			let zy2 = 2*zx*zy+cy;
			let dx2 = 2*(dx*zx-dy*zy)+1;
			let dy2 = 2*(dx*zy+dy*zx);
			let ddx2 = 2*(dx*dx-dy*dy+ddx*zx-ddy*zy);
			let ddy2 = 2*(2*dx*dy+ddx*zy+ddy*zx);
			let dddx2 = 6*(ddx*dx-ddy*dy)+2*(dddx*zx-dddy*zy);
			let dddy2 = 6*(ddx*dy+ddy*dx)+2*(dddx*zy+dddy*zx);
			zx = zx2;
			zy = zy2;
			dx = dx2;
			dy = dy2;
			ddx = ddx2;
			ddy = ddy2;
			dddx = dddx2;
			dddy = dddy2;
		}
		points.steps = steps;
		return points;
	}

	/**
	 * Finds the exact location of a nearby cyclic point and calculates its properties, such as its scale and type. See `./docs/idk.pdf`.
	 * 
	 * If the estimate diverges, `null` is returned instead.
	 * 
	 * @todo also return `null` if the estimate doesn't converge fast enough for this to be precise.
	 * 
	 * @todo scale breaks for cycle length 1025 and larger because `2^1024` overflows to Infinity; multiply twos seperately to fix
	 * 
	 * @param {number} startX
	 * @param {number} startY
	 * @param {number} cycleLength
	 */
	getNearbyCyclicPoint(startX,startY,cycleLength){
		let cx = startX;
		let cy = startY;
		let estimates = [];
		for (var steps=0;steps<20;steps++){
			let x = cx;
			let y = cy;
			let dx = 1;
			let dy = 0;
			for (let i=1;i<cycleLength;i++){
				let x2 = x*x-y*y+cx;
				let y2 = 2*x*y+cy;
				let dx2 = 2*(dx*x-dy*y)+1;
				let dy2 = 2*(dx*y+dy*x);
				x = x2;
				y = y2;
				dx = dx2;
				dy = dy2;
			}
			let temp = Complex.quotient(new Complex(x,y),new Complex(dx,dy));
			estimates.push(new Complex(cx,cy));
			cx -= temp.x;
			cy -= temp.y;
			if (temp.length<1e-10){
				steps++;
				break;
			}else if (!(cx*cx+cy*cy<4)){
				return null;
			}
		}
		let ax = cx;
		let ay = cy;
		let x = cx;
		let y = cy;
		let dx = 1;
		let dy = 0;
		let ddx = 0;
		let ddy = 0;
		for (let i=1;i<cycleLength;i++){
			let x2 = x*x-y*y+cx;
			let y2 = 2*x*y+cy;
			let dx2 = 2*(dx*x-dy*y)+1;
			let dy2 = 2*(dx*y+dy*x);
			let ddx2 = 2*(dx*dx-dy*dy+ddx*x-ddy*y);
			let ddy2 = 2*(2*dx*dy+ddx*y+ddy*x);
			x = x2;
			y = y2;
			dx = dx2;
			dy = dy2;
			ddx = ddx2;
			ddy = ddy2;
			if (i<cycleLength-1){
				let ax2 = ax*x-ay*y;
				let ay2 = ax*y+ay*x;
				ax = ax2;
				ay = ay2;
			}
		}
		let a = cycleLength>1?new Complex(ax,ay):new Complex(1,0);
		a.scale(2**(cycleLength-1));
		a.multiply(dx,dy);
		Complex.inverse(a);
		let point = MandelbrotCyclicPoint.create(cx,cy,cycleLength,a,dx,dy,ddx,ddy);
		point.steps = steps;
		point.estimates = estimates;
		return point;
	}
}
/**
 * A cyclic point in the mandelbrot set.
 */
export class MandelbrotCyclicPoint extends CyclicPoint {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} cycleLength
	 * @param {Complex} scale
	 */
	constructor(x,y,cycleLength,scale){
		super(x,y);
		this.cycleLength = cycleLength;
		this.scale = scale;
	}

	/**
	 * Creates a new Minibrot or Disk object from the given parameters.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} cycleLength
	 * @param {Complex} scale
	 * @param {number} dx
	 * @param {number} dy
	 * @param {number} ddx
	 * @param {number} ddy
	 */
	static create(x,y,cycleLength,scale,dx,dy,ddx,ddy){
		let radius = 0.5*Math.sqrt((dx*dx+dy*dy)/(ddx*ddx+ddy*ddy));
		let relativeRadius = radius/scale.length;
		let point = relativeRadius<=1?new Disk(x,y,cycleLength,scale):new Minibrot(x,y,cycleLength,scale);
		point.dz = new Complex(dx,dy);
		point.ddz = new Complex(ddx,ddy);
		point.approximationRadius = radius;
		point.relativeApproximationRadius = relativeRadius;
		return point;
	}

	/**
	 * @inheritdoc
	 * @param {FractalViewport} viewport
	 */
	toElement(viewport){
		let element = document.createElement("div");
		element.className = "point-container";
		let x = viewport.toRelativeX(this.x);
		let y = viewport.toRelativeY(this.y);
		let rx = viewport.toRelativeWidth(this.radius);
		let ry = viewport.toRelativeHeight(this.radius);
		let rx2 = viewport.toRelativeWidth(this.approximationRadius);
		let ry2 = viewport.toRelativeHeight(this.approximationRadius);
		if (rx<2&&ry<2){
			let circleDiv = document.createElement("div");
			circleDiv.className = "circle";
			circleDiv.style = `left:${100*x}%;top:${100*y}%;width:${200*rx}%;height:${200*ry}%`;
			element.appendChild(circleDiv);
		}
		if (rx2<2&&ry2<2){
			let circleDiv = document.createElement("div");
			circleDiv.className = "circle approximationRadius";
			circleDiv.style = `left:${100*x}%;top:${100*y}%;width:${200*rx2}%;height:${200*ry2}%`;
			element.appendChild(circleDiv);
		}
		element.appendChild(super.toElement(viewport));
		return element;
	}
}
/**
 * A cyclic point in the mandelbrot set that belongs to the main cardioid or the cardioid of a minibrot.
 */
export class Minibrot extends MandelbrotCyclicPoint {
	constructor(x,y,cycleLength,scale){
		super(x,y,cycleLength,scale)
	}

	get radius(){
		return this.scale.length*2;
	}

	get type(){
		return TYPE_MINIBROT;
	}
}
/**
 * A cyclic point in the mandelbrot set that belongs to a disk.
 */
export class Disk extends MandelbrotCyclicPoint {
	constructor(x,y,cycleLength,scale,radius){
		super(x,y,cycleLength,scale);
	}

	get radius(){
		return this.scale.length/2;
	}

	get type(){
		return TYPE_DISK;
	}
}