export const TYPE_DISK = "disk";
export const TYPE_MINIBROT = "minibrot";
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
	 * Approximates nearby orbit points - see `./docs/idk.pdf` for a detailed explanation.
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
						let point = MandelMaths.getNearbyCyclicPoint(pcx,pcy,i+1);
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
	static getNearbyCyclicPoint(startX,startY,cycleLength){
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
		let point = CyclicPoint.create(cx,cy,cycleLength,a,dx,dy,ddx,ddy);
		point.steps = steps;
		point.estimates = estimates;
		return point;
	}

}
export class CyclicPoint {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} cycleLength
	 * @param {Complex} scale
	 */
	constructor(x,y,cycleLength,scale){
		this.x = x;
		this.y = y;
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
}
export class Minibrot extends CyclicPoint {
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
export class Disk extends CyclicPoint {
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
export class Complex {
	
	constructor(x=0,y=0){
		/** @type {number} */
		this.x = x;
		/** @type {number} */
		this.y = y;
	}

	scale(scale){
		this.x *= scale;
		this.y *= scale;
	}

	set length(length){
		this.scale(length/this.length);
	}

	get length(){
		return Math.sqrt(this.x*this.x+this.y*this.y);
	}

	copy(){
		return new Complex(this.x,this.y)
	}

	/**
	 * Multiplies this number with another.
	 * @param {Complex|number} x
	 * @param {number} y
	 */
	multiply(x,y){
		let z = (x instanceof Complex)?x:new Complex(x,y);
		let tx = this.x*z.x-this.y*z.y;
		let ty = this.x*z.y+this.y*z.x;
		this.x = tx;
		this.y = ty;
	}

	/**
	 * Returns one of the roots of any given complex number.
	 * 
	 * Always returns the one with a positive real component, or, if both have a real component of 0, the one with the larger imaginary component.
	 * 
	 * If the input is an object, no new Object will be created; the object will simply be modified and returned.
	 * 
	 * If the input is an instance of `ComplexWithDerivative`, the derivative of the result will also be calculated and updated.
	 * @param {Complex|ComplexWithDerivative|number} x
	 * @param {number} y
	 * @returns {Complex|ComplexWithDerivative}
	 */
	static sqrt(x,y){
		let z = (x instanceof Complex)?x:new Complex(x,y);
		if (!(z instanceof ComplexWithDerivative)){
			if (z.x===0&&z.y===0){
				return z;
			}else if (z.x>0){
				let r = z.length;
				z.x += r;
				z.length = Math.sqrt(r);
				return z;
			}else{
				let r = z.length;
				z.x -= r;
				z.length = Math.sqrt(r);
				let temp = z.x;
				if (z.y<0){
					z.x = -z.y;
					z.y = temp;
				}else{
					z.x = z.y;
					z.y = -temp;
				}
				return z;
			}
		}else{
			if (z.x===0&&z.y===0){
				z.dx /= 0;
				z.dy /= 0;
				return z;
			}else if (z.x>0){
				let r = z.length;
				z.x += r;
				let d = z.derivative.copy();
				z.length = Math.sqrt(r);
				d.multiply(new Complex(0.5*z.x/r,-0.5*z.y/r));
				z.derivative = d;
				return z;
			}else{
				let r = z.length;
				z.x -= r;
				let d = z.derivative.copy();
				z.length = Math.sqrt(r);
				let temp = z.x;
				if (z.y<0){
					z.x = -z.y;
					z.y = temp;
				}else{
					z.x = z.y;
					z.y = -temp;
				}
				d.multiply(new Complex(0.5*z.x/r,-0.5*z.y/r));
				z.derivative = d;
				return z;
			}
		}
	}

	/**
	 * Returns both roots (or the same one twice if there is only one) of the quadratic equation `a*z^2+b*z+c = 0`.
	 * 
	 * Also computes the derivatives of the roots when given the derivatives of a, b and c.
	 * 
	 * Original inputs remain unchanged.
	 * @param {Complex|ComplexWithDerivative} a
	 * @param {Complex|ComplexWithDerivative} b
	 * @param {Complex|ComplexWithDerivative} c
	 * @returns {Complex[]|ComplexWithDerivative[]}
	 */
	static getQuadraticRoots(a,b,c){
		let ax = a.x;
		let ay = a.y;
		let bx = b.x;
		let by = b.y;
		let cx = c.x;
		let cy = c.y;
		if (ax===0&&ay===0){
			if (bx===0&&by===0){
				throw new Error("a and b can't both be both zero!");
			}else{
				let temp = Complex.quotient(c,b);
				temp.scale(-1);
				return [temp,temp.copy()];
			}
		}else{
			if ((a instanceof ComplexWithDerivative)&&(b instanceof ComplexWithDerivative)&&(c instanceof ComplexWithDerivative)){
				let dax = a.dx;
				let day = a.dy;
				let dbx = b.dx;
				let dby = b.dy;
				let dcx = c.dx;
				let dcy = c.dy;
				let radicantX = bx*bx-by*by-4*(ax*cx-ay*cy);
				let radicantY = 2*bx*by-4*(ax*cy+ay*cx);
				let radicantDx = 2*(dbx*bx-dby*by)-4*(dax*cx-day*cy+ax*dcx-ay*dcy);
				let radicantDy = 2*(dbx*by+dby*bx)-4*(dax*cy+day*cx+ax*dcy+ay*dcx);
				let radicantRoot = Complex.sqrt(new ComplexWithDerivative(radicantX,radicantY,radicantDx,radicantDy));
				let divInv = Complex.inverse(new ComplexWithDerivative(2*ax,2*ay,2*dax,2*day));
				let root1 = new ComplexWithDerivative(-bx+radicantRoot.x,-by+radicantRoot.y,-dbx+radicantRoot.dx,-dby+radicantRoot.dy);
				let root2 = new ComplexWithDerivative(-bx-radicantRoot.x,-by-radicantRoot.y,-dbx-radicantRoot.dx,-dby-radicantRoot.dy);
				root1.multiply(divInv);
				root2.multiply(divInv);
				return [root1,root2];
			}else{
				let radicantRoot = Complex.sqrt(bx*bx-by*by-4*(ax*cx-ay*cy),2*bx*by-4*(ax*cy+ay*cx));
				let temp = 2*(ax*ax+ay*ay);
				let divInv = new Complex(ax/temp,-ay/temp);
				let root1 = new Complex(-bx+radicantRoot.x,-by+radicantRoot.y);
				let root2 = new Complex(-bx-radicantRoot.x,-by-radicantRoot.y);
				root1.multiply(divInv);
				root2.multiply(divInv);
				return [root1,root2];
			}
		}
	}

	/**
	 * Returns the distance between two complex numbers.
	 * @param {Complex} a
	 * @param {Complex} b
	 */
	static distance(a,b){
		let dx = a.x-b.x;
		let dy = a.y-b.y;
		return Math.sqrt(dx*dx+dy*dy);
	}

	/**
	 * Returns the quotient `a/b`.
	 * 
	 * Original inputs remain unchanged.
	 * @param {Complex|ComplexWithDerivative} a
	 * @param {Complex|ComplexWithDerivative} b
	 * @returns {Complex|ComplexWithDerivative}
	 */
	static quotient(a,b){
		let ax = a.x;
		let ay = a.y;
		let bx = b.x;
		let by = b.y;
		let x = (ax*bx+ay*by)/(bx*bx+by*by);
		let y = (ay*bx-ax*by)/(bx*bx+by*by);
		if ((a instanceof ComplexWithDerivative)&&(b instanceof ComplexWithDerivative)){
			let dax = a.dx;
			let day = a.dy;
			let dbx = b.dx;
			let dby = b.dy;
			let tx = (dax*bx-day*by)-(ax*dbx-ay*dby);
			let ty = (dax*by+day*bx)-(ax*dby+ay*dbx);
			let d = bx*bx+by*by;
			let tx2 = (bx*bx-by*by)/(d*d);
			let ty2 = (-2*bx*by)/(d*d);
			let dx = tx*tx2-ty*ty2;
			let dy = tx*ty2+ty*tx2;
			return new ComplexWithDerivative(x,y,dx,dy);
		}else{
			return new Complex(x,y);
		}
	}

	/**
	 * Sets the passed object to its multiplicative inverse `1/z` and returns it.
	 * @param {Complex|ComplexWithDerivative} z
	 */
	static inverse(z){
		let zx = z.x;
		let zy = z.y;
		let d = zx*zx+zy*zy;
		let x = zx/d;
		let y = -zy/d;
		if (z instanceof ComplexWithDerivative){
			let dzx = z.dx;
			let dzy = z.dy;
			let tx = x*x-y*y;
			let ty = 2*x*y;
			z.dx = -(dzx*tx-dzy*ty);
			z.dy = -(dzx*ty+dzy*tx);
		}
		z.x = x;
		z.y = y;
		return z;
	}
}
class ComplexWithDerivative extends Complex {
	constructor(x=0,y=0,dx=0,dy=0){
		super(x,y);
		this.derivative = new Complex(dx,dy);
	}

	scale(scale){
		super.scale(scale);
		this.derivative.scale(scale);
	}

	set dx(dx){
		this.derivative.x = dx;
	}

	get dx(){
		return this.derivative.x;
	}

	set dy(dy){
		this.derivative.y = dy;
	}

	get dy(){
		return this.derivative.y;
	}

	copy(){
		return new ComplexWithDerivative(this.x,this.y,this.dx,this.dy);
	}

	/**
	 * Multiplies this number with another.
	 * @param {Complex|ComplexWithDerivative|number} x
	 * @param {number} y
	 */
	multiply(x,y=0){
		let z = (x instanceof Complex)?x:new Complex(x,y);
		let zx = z.x;
		let zy = z.y;
		let tx = this.x;
		let ty = this.y;
		let dx = this.dx;
		let dy = this.dy;
		this.x = tx*zx-ty*zy;
		this.y = tx*zy+ty*zx;
		if (z instanceof ComplexWithDerivative){
			let dzx = z.dx;
			let dzy = z.dy;
			this.dx = (tx*dzx-ty*dzy)+(dx*zx-dy*zy);
			this.dy = (tx*dzy+ty*dzx)+(dx*zy+dy*zx);
		}else{
			this.dx = dx*zx-dy*zy;
			this.dy = dx*zy+dy*zx;
		}
	}
}
// exports so these can be used in the console for debugging; gonna remove these later on
window.MandelMaths = MandelMaths;
window.Complex = Complex;
window.ComplexWithDerivative = ComplexWithDerivative;