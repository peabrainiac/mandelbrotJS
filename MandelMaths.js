import FractalViewport from "./explorer/FractalViewport.js";
export {FractalViewport};

/**
 * Default export, currently not used much.
 */
export default class MandelMaths {
	/**
	 * Returns the coefficients of the polynomial $(1+x)^n$.
	 * @param {number} n
	 */
	static binomialCoefficients(n){
		let coefficients = [1];
		for (let i=1;i<=n;i++){
			coefficients[i] = 1;
			for (let j=i-1;j>=1;j--){
				coefficients[j] = coefficients[j-1]+coefficients[j];
			}
		}
		return coefficients;
	}
}

/**
 * Base class for fractal formulas.
 */
export class FractalFormula {
	/**
	 * Returns the iteration count for a specific point.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @param {unknown} preparedData the object or value returned by {@link FractalFormula.prepare `prepare()`}
	 */
	iterate(cx,cy,maxIterations,preparedData){
		return 0;
	}

	/**
	 * Returns all steps in the orbit of a point, one by one.
	 * 
	 * This method is used by a number of fallback implementations of other methods, such as {@link FractalFormula.prepare `prepare()`},
	 * so implementing this is an easy way to get that functionality to work too.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @param {unknown} preparedData the object or value returned by `prepare()`
	 * @returns {Generator<{zx:number,zy:number,zdz:ComplexJacobian,zdc:ComplexJacobian},void,void>}
	 */
	*iterator(cx,cy,maxIterations,preparedData){}

	/**
	 * Gets called once per thread per image, before the actual rendering process starts. The value returned by this will then be passed to `iterate()` as the fourth argument.
	 * 
	 * Derived classes can override this to precalculate some global values to then use during the per-pixel computations.
	 * @todo call this only once per image and not once for each thread to avoid doing the same work multiple times.
	 * @param {number} cx image center x
	 * @param {number} cy image center y
	 * @param {number} iterations maximum iteration count
	 * @return {unknown}
	 */
	prepare(cx,cy,iterations){
		return null;
	}

	/**
	 * Approximates nearby periodic points - see `./docs/idk.pdf` for a detailed explanation.
	 * 
	 * Only applies a single calculation step without further refining, so the results may be wieldly inaccurate.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @return {PeriodicPoint[]}
	 */
	approxNearbyPeriodicPoints(cx,cy,maxIterations=100){
		return [];
	}

	/**
	 * Finds the exact location of a nearby periodic point and calculates its properties, such as its scale and type. See `./docs/idk.pdf`.
	 * 
	 * If the estimate diverges, `null` is returned instead.
	 * 
	 * @param {number} startX
	 * @param {number} startY
	 * @param {number} period
	 * @return {PeriodicPoint}
	 */
	getNearbyPeriodicPoint(startX,startY,period){
		return null;
	}

	/**
	 * Returns data to display on the orbit points overlay.
	 * 
	 * The data is structured as an array of zero or more (though usually one) arrays of points, each representing an orbit of the given point;
	 * this is to allow better debugging of algorithms that produce slightly different results than the actual formula, because then the approximated and actual orbits can be shown next to each other and compared.
	 * 
	 * If not overridden, the default implementation of this returns an array with a single array of points obtained from {@link FractalFormula.iterator}.
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @return {Complex[][]}
	 */
	getOrbitPoints(cx,cy,maxIterations){
		return [[...this.iterator(cx,cy,maxIterations)].map(({zx,zy})=>new Complex(zx,zy))];
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
	 * Returns an object representing the formula parameters that can then later be passed to the formula constructur to construct a new formula with the same parameters.
	 * Used to pass formula objects between threads.
	 * 
	 * Derived classes with parameters need to implement this and a constructor that takes in the returned object as the first parameter;
	 * otherwise, their parameters won't work properly when multithreading.
	 * @return {unknown}
	 */
	getParameters(){
		return {};
	}

	/**
	 * Converts the given formula into an object that can be passed through the structured cloning algorithm used by `postMessage()` without losing information.
	 * @param {FractalFormula} formula
	 */
	static prepareStructuredClone(formula){
		return {moduleURL:formula.moduleURL,parameters:formula.getParameters()};
	}

	/**
	 * Reconstructs the formula from its structured clone.
	 * @param {{moduleURL:string,parameters:unknown}} clone
	 * @returns {Promise<FractalFormula>}
	 */
	static async fromStructuredClone(clone){
		let module = await import(clone.moduleURL);
		return new (module.default)(clone.parameters);
	}

	/**
	 * Creates a new settings element for this formula and links it, so that any changes to those settings also change this formula.
	 * 
	 * This is an internal method, only intended to be called by the `settingsElement` getter method; external code should just call that instead.
	 * 
	 * By default, just returns `null`; however, derived classes can override this method to implement their own formula settings element.
	 * @return {FractalFormulaSettings<FractalFormula>}
	 */
	createSettingsElement(){
		return null;
	}

	/**
	 * Returns (or creates and then returns, if necessary) a `FractalFormulaSettings`-element bound to this formula,
	 * or `null` if this formula doesn't have any settings or if called from a worker.
	 * 
	 * Internally calls `createSettingsElement` to create the element the first time it is called;
	 * as such, derived classed should override that method to implement their own settings element.
	 * @type {FractalFormulaSettings<FractalFormula>}
	 * @readonly
	 */
	get settingsElement(){
		if (this._settingsElement===undefined){
			this._settingsElement = self instanceof Window?this.createSettingsElement():null;
		}
		return this._settingsElement;
	}

	/**
	 * Registers a callback to be called whenever this formula gets modified in some way, and once when it is registered.
	 * @param {()=>void} callback
	 */
	onChange(callback){
		if (this._onChangeCallbacks===undefined){
			/** @type {(()=>void)[]} */
			this._onChangeCallbacks = [];
		}
		this._onChangeCallbacks.push(callback);
		callback();
	}

	/**
	 * Calls all callbacks registered using `onChange()`. Derived classes should call this whenever a parameter of the formula changes.
	 */
	callChangeCallbacks(){
		(this._onChangeCallbacks||[]).forEach(callback=>{
			callback();
		});
	}

	/**
	 * Removes a callback registered using `onChange()`.
	 * @param {()=>void} callback
	 */
	removeChangeCallback(callback){
		let index = (this._onChangeCallbacks||[]).indexOf(callback);
		if (index>-1){
			this._onChangeCallbacks.splice(index,1);
		}
	}
}
/**
 * A wrapper that can switch between different fractal formulas.
 */
export class FractalFormulaSwitch extends FractalFormula {
	/**
	 * Constructs a new `FractalFormulaSwitch`.
	 * 
	 * Note that this doesn't take in the same arguments returned by `getParameters()`; as such,
	 * derived classes must override this constructor in order to be able to be send to workers.
	 * @param {{switchName:string,formulas:{name:string,formula:FractalFormula}[],selectedIndex?:number}} options
	 */
	constructor({switchName,formulas,selectedIndex=0}){
		super();
		this._switchName = switchName;
		this._formulas = formulas;
		this._formula = formulas[selectedIndex].formula;
		formulas.forEach(({formula})=>{
			formula.onChange(()=>{
				if (this._formula===formula){
					this.callChangeCallbacks();
				}
			});
		})
	}

	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @param {unknown} preparedData
	 * @inheritdoc
	 */
	iterate(cx,cy,maxIterations,preparedData){
		return this._formula.iterate(cx,cy,maxIterations,preparedData);
	}

	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @param {unknown} preparedData the object or value returned by `prepare()`
	 * @returns {Generator<{zx:number,zy:number,zdz:ComplexJacobian,zdc:ComplexJacobian},void,void>}
	 */
	iterator(cx,cy,maxIterations,preparedData){
		return this._formula.iterator(cx,cy,maxIterations,preparedData);
	}

	/**
	 * @param {number} cx image center x
	 * @param {number} cy image center y
	 * @param {number} iterations maximum iteration count
	 * @inheritdoc
	 */
	prepare(cx,cy,iterations){
		return this._formula.prepare(cx,cy,iterations);
	}

	/**
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @inheritdoc
	 */
	approxNearbyPeriodicPoints(cx,cy,maxIterations){
		return this._formula.approxNearbyPeriodicPoints(cx,cy,maxIterations);
	}

	/**
	 * @param {number} startX
	 * @param {number} startY
	 * @param {number} period
	 * @inheritdoc
	 */
	getNearbyPeriodicPoint(startX,startY,period){
		return this._formula.getNearbyPeriodicPoint(startX,startY,period);
	}

	/**
	 * @inheritdoc
	 * @param {number} cx
	 * @param {number} cy
	 * @param {number} maxIterations
	 * @return {Complex[][]}
	 */
	getOrbitPoints(cx,cy,maxIterations){
		return [].concat(...this._formulas.map(formula=>formula.formula.getOrbitPoints(cx,cy,maxIterations)));
	}

	/**
	 * @inheritdoc
	 */
	getParameters(){
		const selectedIndex = this.selectedIndex;
		const parameters = this._formulas.map(data=>data.formula.getParameters());
		return {selectedIndex,parameters};
	}

	/**
	 * @inheritdoc
	 */
	createSettingsElement(){
		return new FractalFormulaSwitchSettings(this,this._switchName,this._formulas);
	}

	set selectedIndex(selectedIndex){
		this._formula = this._formulas[selectedIndex].formula;
		this.callChangeCallbacks();
	}

	get selectedIndex(){
		return this._formulas.indexOf(this._formulas.find(data=>(data.formula==this._formula)));
	}

	get selectedFormula(){
		return this._formula;
	}
}
/**
 * Workaround so the following class declaration doesn't immediately throw in a worker; only attempting to instantiate it does.
 * @type {typeof HTMLElement}
 */
let element = (self.HTMLElement||function(){throw new Error("Can't use this constructor in a worker!")});
/**
 * Base class for fractal formula settings.
 * @template {FractalFormula} F
 */
export class FractalFormulaSettings extends element {
	/**
	 * @param {F} formula
	 */
	constructor(formula){
		super();
		this._formula = formula;
	}

	/** @readonly */
	get formula(){
		return this._formula;
	}
}
/**
 * Settings element for FractalFormulaSwitches.
 * @extends FractalFormulaSettings<FractalFormulaSwitch>
 */
export class FractalFormulaSwitchSettings extends FractalFormulaSettings {
	/**
	 * @param {FractalFormulaSwitch} formula
	 * @param {string} switchName
	 * @param {{name:string,formula:FractalFormula,selected?:boolean}[]} formulas
	 */
	constructor(formula,switchName,formulas){
		super(formula);
		this.innerHTML = `
			${switchName}: <select class="input-select">
				${formulas.map((data,index)=>`<option value="${index}">${data.name}</option>`).join("")}
			</select>
			<div></div>
		`;
		this._select = this.querySelectorAll("select")[0];
		this._settingsContainer = this.querySelector("div");
		this._select.addEventListener("change",()=>{
			formula.selectedIndex = parseInt(this._select.value);
			this._updateSettingsElement();
		});
		this._updateSettingsElement();
	}

	/**
	 * Internal method. Changes the visible settings element to the one of the currently selected formula.
	 */
	_updateSettingsElement(){
		const element = this.formula.selectedFormula.settingsElement;
		while(this._settingsContainer.firstChild){
			this._settingsContainer.firstChild.remove();
		}
		if (element){
			this._settingsContainer.appendChild(element);
		}
	}
}
if (self.constructor.name==="Window"){
	customElements.define("fractal-formula-switch-settings",FractalFormulaSwitchSettings);
}
/**
 * Base class for special points of interest, like periodic points; extending this allows them to be displayed in the `OrbitPointOverlay`.
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
		element.style.left = `${100*viewport.toRelativeX(this.x)}%`;
		element.style.top = `${100*viewport.toRelativeY(this.y)}%`;
		return element;
	}
}
/**
 * A point with a periodic orbit.
 */
export class PeriodicPoint extends SpecialPoint {
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} period
	 */
	constructor(x,y,period){
		super(x,y);
		this.period = period;
	}

	/**
	 * @inheritdoc
	 * @param {FractalViewport} viewport
	 */
	toElement(viewport){
		let element = super.toElement(viewport);
		let label = document.createElement("label");
		label.className = "point-label";
		label.textContent = this.period.toString();
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

	/** @param {number} scale */
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
	 * Adds another number to this one.
	 * Stores the result in this number and then returns it.
	 * @param {Complex|number} x
	 * @param {number} y
	 */
	add(x,y=0){
		let z = (x instanceof Complex)?x:new Complex(x,y);
		this.x += z.x;
		this.y += z.y;
		return this;
	}

	/**
	 * Multiplies this number with another.
	 * Stores the result in this number and then returns it.
	 * @param {Complex|number} x
	 * @param {number} y
	 */
	multiply(x,y=0){
		let z = (x instanceof Complex)?x:new Complex(x,y);
		let tx = this.x*z.x-this.y*z.y;
		let ty = this.x*z.y+this.y*z.x;
		this.x = tx;
		this.y = ty;
		return this;
	}

	toString(){
		if (this.x===0&&this.y===0){
			return "0";
		}else if (this.y===0){
			return this.x+"";
		}else if (this.x===0){
			return this.y+"i";
		}else{
			return this.x+(this.y<0?"":"+")+this.y+"i";
		}
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
	static sqrt(x,y=0){
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
				/** @type {ComplexWithDerivative} *///@ts-ignore
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
/**
 * @template T
 * @extends Array<T>
 */
export class InfiniteArray extends Array {
	/**
	 * @param {(index:number)=>T} f
	 */
	constructor(f){
		super();
		this._f = f;
		this._array = this;
		return new Proxy(this,{
			has(array,key){
				return key in array||(typeof key=="string"&&/^(0|[1-9][0-9]*)$/.test(key));
			},
			get(array,key){
				if (key==="length"){
					return Infinity;
				}else if(key in array){
					// @ts-ignore
					return array[key];
				}else if(typeof key==="string"&&/^(0|[1-9][0-9]*)$/.test(key)){
					let index = parseInt(key);
					array[index] = f(index);
					return array[index];
				}else{
					return undefined;
				}
			}
		});
	}

	/**
	 * @see https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.slice
	 * @return {Array<T>}
	 */
	slice(start=0,end=Infinity){
		if (start<0){
			throw new RangeError("can't use negative start indices with infinite arrays");
		}else if(start===Infinity){
			return [];
		}
		let k = Math.floor(start);
		let final = end<0?Infinity:Math.floor(end);
		if (final<Infinity){
			/** @type {Array<T>} */
			let temp = Object.create(this);
			temp.constructor = Array;
			return Array.prototype.slice.apply(temp,[start,end]);
		}else{
			let f = this._f;
			let array = new InfiniteArray(i=>f(i+k));
			for (let i=k,l=this._array.length;i<l;i++){
				if (i in this._array){
					array[i-k] = this._array[i];
				}
			}
			return array;
		}
	}

	toString(n=8){
		return this.slice(0,n).toString()+",...";
	}
}
if (self.HTMLElement){
	// @ts-ignore
	Object.assign(self,{MandelMaths,InfiniteArray});
}