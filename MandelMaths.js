export {default as FractalViewport} from "./explorer/FractalViewport.js";

/**
 * Default export, currently empty.
 */
export default class MandelMaths {}

/**
 * Base class for fractal formulas.
 */
export class FractalFormula {
	/**
	 * Returns the iteration count for a specific point.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {Object} options
	 * @param {number} options.maxIterations
	 */
	iterate(cx,cy,{maxIterations}){
		return 0;
	}

	/**
	 * Approximates nearby cyclic points - see `./docs/idk.pdf` for a detailed explanation.
	 * 
	 * Only applies a single calculation step without further refining, so the results may be wieldly inaccurate.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @return {CyclicPoint[]}
	 */
	approxNearbyCyclicPoints(cx,cy,maxIterations=100){
		return [];
	}

	/**
	 * Finds the exact location of a nearby cyclic point and calculates its properties, such as its scale and type. See `./docs/idk.pdf`.
	 * 
	 * If the estimate diverges, `null` is returned instead.
	 * 
	 * @param {number} startX
	 * @param {number} startY
	 * @param {number} cycleLength
	 * @return {CyclicPoint}
	 */
	getNearbyCyclicPoint(startX,startY,cycleLength){
		return null;
	}

	/**
	 * the url of the formula module.
	 * @readonly
	 */
	get moduleURL(){
		let className = this.constructor.name;
		return `./formulas/${className.endsWith("Formula")?className.slice(0,-7):className}.js`;
	}

	/**
	 * Converts the given formula into an object that can be passed through the structured cloning algorithm used by `postMessage()` without losing information.
	 * @param {FractalFormula} formula
	 */
	static prepareStructuredClone(formula){
		return {moduleURL:formula.moduleURL}
	}

	/**
	 * Reconstructs the formula from its structured clone.
	 * @param {object} clone
	 * @returns {FractalFormula}
	 */
	static async fromStructuredClone(clone){
		let module = await import(clone.moduleURL);
		return new (module.default)();
	}
}
/**
 * Base class for special points of interest, like cyclic points; extending this allows them to be displayed in the `OrbitPointOverlay`.
 */
export class SpecialPoint {
	constructor(x=0,y=0){
		this.x = x;
		this.y = y;
	}

	/**
	 * Creates an element representing this point in the `SpecialPointsOverlay`.
	 * 
	 * @param {FractalViewport} viewport
	 */
	toElement(viewport){
		let element = document.createElement("div");
		element.className = "point";
		element.style = `left:${100*viewport.toRelativeX(this.x)}%;top:${100*viewport.toRelativeY(this.y)}%`;
		return element;
	}
}
/**
 * A point with a cyclic orbit.
 */
export class CyclicPoint extends SpecialPoint {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} cycleLength
	 */
	constructor(x,y,cycleLength){
		super(x,y);
		this.cycleLength = cycleLength;
	}

	/**
	 * @inheritdoc
	 * @param {FractalViewport} viewport
	 */
	toElement(viewport){
		let element = super.toElement(viewport);
		let label = document.createElement("label");
		label.className = "point-label";
		label.textContent = this.cycleLength;
		element.appendChild(label);
		return element;
	}
}
/**
 * A complex number `x+iy`.
 */
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

	set theta(theta){
		let l = this.length;
		this.x = Math.cos(theta)*l;
		this.y = Math.sin(theta)*l;
	}

	get theta(){
		return Math.atan2(this.y,this.x);
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
/**
 * A complex number with another complex number representing its derivative.
 */
export class ComplexWithDerivative extends Complex {
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
/**
 * A 2x2 matrix.
 */
export class Matrix2f {
	constructor(xdx=1,ydx=0,xdy=-ydx,ydy=xdx){
		this.xdx = xdx;
		this.ydx = ydx;
		this.xdy = xdy;
		this.ydy = ydy;
	}
	/**
	 * Scales the matrix by a certain factor. If two factors are given, scales each row independently.
	 * @param {number} scale 
	 * @param {number} scaleY 
	 */
	scale(scale,scaleY=scale){
		this.xdx *= scale;
		this.ydx *= scaleY;
		this.xdy *= scale;
		this.ydy *= scaleY;
	}

	/**
	 * Returns a copy of this matrix.
	 */
	copy(){
		return new Matrix2f(this.xdx,this.ydx,this.xdy,this.ydy);
	}

	/**
	 * Returns this matrix in css `matrix()` notation.
	 * @param {number} offsetX 
	 * @param {number} offsetY 
	 */
	toCssString(offsetX=0,offsetY=0){
		return `matrix(${this.xdx},${this.ydx},${this.xdy},${this.ydy},${offsetX},${offsetY})`;
	}

	/**
	 * Returns true if all entries are finite and not `NaN`, and false otherwise.
	 */
	isFinite(){
		return isFinite(this.xdx)&&isFinite(this.ydx)&&isFinite(this.xdy)&&isFinite(this.ydy);
	}

	/**
	 * Sets the passed object to its multiplicative inverse `m^-1` and returns it.
	 * @param {Matrix2f} m
	 */
	static inverse(m){
		let t = m.xdx*m.ydy-m.xdy*m.ydx;
		let xdx = m.ydy/t;
		let ydx = -m.ydx/t;
		let xdy = -m.xdy/t;
		let ydy = m.xdx/t;
		m.xdx = xdx;
		m.ydx = ydx;
		m.xdy = xdy;
		m.ydy = ydy;
		return m;
	}
}
/**
 * A jacobian matrix representing the derivative of a complex function.
 */
export class ComplexJacobian extends Matrix2f {
	
	/**
	 * @inheritdoc
	 */
	copy(){
		return new ComplexJacobian(this.xdx,this.ydx,this.xdy,this.ydy);
	}
	
	/**
	 * Multiplies both partial derivatives by the given complex number.
	 * @param {Complex} z 
	 */
	multiply(z){
		let xdx2 = this.xdx*z.x-this.ydx*z.y;
		let ydx2 = this.xdx*z.y+this.ydx*z.x;
		let xdy2 = this.xdy*z.x-this.ydy*z.y;
		let ydy2 = this.xdy*z.y+this.ydy*z.x;
		this.xdx = xdx2;
		this.ydx = ydx2;
		this.xdy = xdy2
		this.ydy = ydy2;
	}

	/**
	 * Returns a new `ComplexJacobian` relative to the given matrix.
	 * @param {Matrix2f} m
	 */
	relativeTo(m){
		let xdmx = this.xdx*m.xdx+this.xdy*m.ydx;
		let ydmx = this.ydx*m.xdx+this.ydy*m.ydx;
		let xdmy = this.xdx*m.xdy+this.xdy*m.ydy;
		let ydmy = this.ydx*m.xdy+this.ydy*m.ydy;
		let mxdmx = (xdmx*m.xdx+ydmx*m.ydx)/Math.sqrt(m.xdx**2+m.ydx**2);
		let mydmx = (xdmx*m.xdy+ydmx*m.ydy)/Math.sqrt(m.xdy**2+m.ydy**2);
		let mxdmy = (xdmy*m.xdx+ydmy*m.ydx)/Math.sqrt(m.xdx**2+m.ydx**2);
		let mydmy = (xdmy*m.xdy+ydmy*m.ydy)/Math.sqrt(m.xdy**2+m.ydy**2);
		return new ComplexJacobian(mxdmx,mydmx,mxdmy,mydmy);
	}

	/**
	 * Sets the passed object to its multiplicative inverse `j^-1` and returns it.
	 * @param {ComplexJacobian} j
	 */
	static inverse(j){
		return Matrix2f.inverse(j);
	}
}
/**
 * The derivative of a `ComplexJacobian`, basically; that is, an object holding all second-order partial derivatives `xdxdx`, `ydxdx`, `xdydx` and so on.
 */
export class ComplexJacobianDerivative {
	constructor(xdxdx,ydxdx,xdydx,ydydx,xdxdy,ydxdy,xdydy,ydydy){
		this.xdxdx = xdxdx;
		this.ydxdx = ydxdx;
		this.xdydx = xdydx;
		this.ydydx = ydydx;
		this.xdxdy = xdxdy;
		this.ydxdy = ydxdy;
		this.xdydy = xdydy;
		this.ydydy = ydydy;
	}

	/**
	 * Returns a new `ComplexJacobianDerivative` relative to the given matrix.
	 * @param {Matrix2f} m
	 */
	relativeTo(m){
		let xdxdmx = this.xdxdx*m.xdx+this.xdxdy*m.ydx;
		let ydxdmx = this.ydxdx*m.xdx+this.ydxdy*m.ydx;
		let xdydmx = this.xdydx*m.xdx+this.xdydy*m.ydx;
		let ydydmx = this.ydydx*m.xdx+this.ydydy*m.ydx;
		let xdxdmy = this.xdxdx*m.xdy+this.xdxdy*m.ydy;
		let ydxdmy = this.ydxdx*m.xdy+this.ydxdy*m.ydy;
		let xdydmy = this.xdydx*m.xdy+this.xdydy*m.ydy;
		let ydydmy = this.ydydx*m.xdy+this.ydydy*m.ydy;
		let xdmxdmx = xdxdmx*m.xdx+xdydmx*m.ydx;
		let ydmxdmx = ydxdmx*m.xdx+ydydmx*m.ydx;
		let xdmydmx = xdxdmx*m.xdy+xdydmx*m.ydy;
		let ydmydmx = ydxdmx*m.xdy+ydydmx*m.ydy;
		let xdmxdmy = xdxdmy*m.xdx+xdydmy*m.ydx;
		let ydmxdmy = ydxdmy*m.xdx+ydydmy*m.ydx;
		let xdmydmy = xdxdmy*m.xdy+xdydmy*m.ydy;
		let ydmydmy = ydxdmy*m.xdy+ydydmy*m.ydy;
		let mxdmxdmx = (xdmxdmx*m.xdx+ydmxdmx*m.ydx)/Math.sqrt(m.xdx**2+m.ydx**2);
		let mydmxdmx = (xdmxdmx*m.xdy+ydmxdmx*m.ydy)/Math.sqrt(m.xdy**2+m.ydy**2);
		let mxdmydmx = (xdmydmx*m.xdx+ydmydmx*m.ydx)/Math.sqrt(m.xdx**2+m.ydx**2);
		let mydmydmx = (xdmydmx*m.xdy+ydmydmx*m.ydy)/Math.sqrt(m.xdy**2+m.ydy**2);
		let mxdmxdmy = (xdmxdmy*m.xdx+ydmxdmy*m.ydx)/Math.sqrt(m.xdx**2+m.ydx**2);
		let mydmxdmy = (xdmxdmy*m.xdy+ydmxdmy*m.ydy)/Math.sqrt(m.xdy**2+m.ydy**2);
		let mxdmydmy = (xdmydmy*m.xdx+ydmydmy*m.ydx)/Math.sqrt(m.xdx**2+m.ydx**2);
		let mydmydmy = (xdmydmy*m.xdy+ydmydmy*m.ydy)/Math.sqrt(m.xdy**2+m.ydy**2);
		return new ComplexJacobianDerivative(mxdmxdmx,mydmxdmx,mxdmydmx,mydmydmx,mxdmxdmy,mydmxdmy,mxdmydmy,mydmydmy);
	}
}