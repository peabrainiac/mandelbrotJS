// Module with methods for working with external angles, kneading sequences, angled internal addresses and the like. based on https://arxiv.org/abs/math/9411238
/**
 * Returns wether a given rational angle is periodic under the angle doubling map. If it isn't, it must be pre-periodic, as all rational angles are.
 * @param {BigFrac} angle
 */
export function isPeriodic(angle){
	return (angle.b/gcd(angle.a,angle.b))%2n==1n;
}
// @ts-ignore
window.isPeriodic = isPeriodic;
/**
 * Returns the period of a given rational angle. Note that the angle doesn't have to be periodic, just pre-periodic, as all rational angles are.
 * @param {BigFrac} angle
 */
export function getPeriod(angle){
	let c = gcd(angle.a,angle.b);
	let n = angle.a/c;
	let m = angle.b/c;
	while (m%2n==0n){
		m = m/2n;
	}
	n = n<0n?n%m+m:n%m;
	let k = (n*2n)%m;
	for (var i=1n;i<m&&k!=n;i++){
		k = (k*2n)%m;
	}
	console.assert(k==n);
	return i;
}
// @ts-ignore
window.getPeriod = getPeriod;
/**
 * Returns the preperiod of a given rational angle. 0 if the angle is periodic, positive otherwise.
 * @param {BigFrac} angle
 */
export function getPreperiod(angle){
	let m = angle.b/gcd(angle.a,angle.b);
	let i = 0n;
	while (m%2n==0n){
		m = m/2n;
		i++;
	}
	return i;
}
// @ts-ignore
window.getPreperiod = getPreperiod;
/**
 * Returns the kneading sequence of the *-periodic external angle.
 * @param {BigFrac} angle
 */
export function getKneadingSequence(angle){
	let n = angle.a;
	let m = angle.b;
	let m2 = Math.round(Math.log2(Number(m+1n)));
	console.assert(m==(1n<<BigInt(m2))-1n,`m must be one less than a power of two, but it is ${m}`);
	n = n%m;
	let k = n;
	let s = "";
	for (let i=0;i<2*m2;i++){
		if (2n*k==n||2n*k==n+m){
			s += "*";
			break;
		}else if(2n*k>n&&2n*k<n+m){
			s += "1";
		}else{
			s += "0";
		}
		k = (2n*k)%m;
	}
	return s;
}
// @ts-ignore
window.getKneadingSequence = getKneadingSequence;
/**
 * Computes the internal address of a given *-periodic kneading sequence
 * @param {string} kneadingSequence sequence in the format `[01]*\*`
 */
export function getInternalAddress(kneadingSequence){
	let address = [1];
	let k = 1;
	for (let i=1;i<kneadingSequence.length;i++){
		if (kneadingSequence[i]!=kneadingSequence[i%k]){
			k = i+1;
			address.push(k);
		}
	}
	return address;
}
// @ts-ignore
window.getInternalAddress = getInternalAddress;
/**
 * Returns whether a given *-periodic external angle is the upper or lower one in its periodic ray pair
 * @param {BigFrac} angle
 */
export function externalAngleType(angle){
	const n = angle.a;
	const m = angle.b;
    if (m==1n){
        return n==0n?"lower":"upper";
    }else{
        let kneadingSequence = getKneadingSequence(angle);
        let address = getInternalAddress(kneadingSequence);
        //console.log(address,kneadingSequence,kneadingSequence[(kneadingSequence.length-1)%address[address.length-2]],(kneadingSequence.length-1)%address[address.length-2]);
        return ((2n*((n*(1n<<BigInt(kneadingSequence.length-1).valueOf()))%m)==n?"1":"0")==kneadingSequence[(kneadingSequence.length-1)%address[address.length-2]])?"upper":"lower";
    }
}
// @ts-ignore
window.externalAngleType = externalAngleType;
/**
 * Returns an angle in an angled internal address, based on the kneading sequence the address encodes, its two entries around the angle, and one of its external angles.
 * @param {string} kneadingSequence
 * @param {number} period
 * @param {number} nextPeriod
 * @param {BigFrac} angle
 */
export function getInternalAngle(kneadingSequence,period,nextPeriod,angle){
	const n = angle.a;
	const m = angle.b;
	let r = (nextPeriod-1)%period+1;
	let k = r;
	for (let i=k;i<period;i++){
		if (kneadingSequence[i]!=kneadingSequence[i-k]){
			k = i+1;
		}
	}
	let q = (nextPeriod-r)/period+(k==period?1:2);
	let p = 1;
	let k2 = n;
	for (let i=1;i<q-1;i++){
		k2 = ((1n<<BigInt(period))*k2)%m;
		if (k2<=n){
			p++;
		}
	}
	return new Fraction(p,q);
}
// @ts-ignore
window.getInternalAngle = getInternalAngle;
/**
 * Returns the angled internal address of a *-periodic external angle.
 * @param {BigFrac} angle
 * @return {{period:number,angle?:Fraction}[]}
 */
export function getAngledInternalAddress(angle){
	let kneadingSequence = getKneadingSequence(angle);
	let internalAddress = getInternalAddress(kneadingSequence);
	return internalAddress.map(/** @return {{period:number,angle?:Fraction}}*/(period,index)=>{
		if (index+1<internalAddress.length){
			return {period,angle:getInternalAngle(kneadingSequence,period,internalAddress[index+1],angle)};
		}else{
			return {period};
		}
	});
}
// @ts-ignore
window.getAngledInternalAddress = getAngledInternalAddress;
/**
 * Returns the upper external angle corresponding to the given lower one. Based on Lavaur's algorithm.
 * @param {BigFrac} angle
 * @returns {BigFrac}
 */
export function lowerToUpperAngle(angle){
	console.assert(externalAngleType(angle)=="lower");
	if (angle.equals(new BigFrac(0n,1n))){
		return new BigFrac(1n,1n);
	}
	let smallerDenominators = [];
	let k = angle.b;
	while (k>1){
		k = k/2n;
		smallerDenominators.push(k);
		if (angle.b%k==0n&&angle.a%(angle.b/k)==0n){
			return lowerToUpperAngle(new BigFrac(angle.a/(angle.b/k),k));
		}
	}
	let currentAngle = angle;
	let nextAngle = BigFrac.min(...smallerDenominators.map(n=>currentAngle.nextLarger(n)));
	while(nextAngle.compareTo(currentAngle.nextLarger(angle.b))<=0){
		console.assert(externalAngleType(nextAngle)=="lower");
		currentAngle = lowerToUpperAngle(nextAngle);
		nextAngle = BigFrac.min(...smallerDenominators.map(n=>currentAngle.nextLarger(n)));
	}
	return currentAngle.nextLarger(angle.b);
}
// @ts-ignore
window.lowerToUpperAngle = lowerToUpperAngle;
/**
 * Computes the lower external angle of the parameter ray pair corresponding to an angled internal address.
 * @param {{period:number,angle?:Fraction}[]} angledAddress
 */
export function angledInternalAddressToExternalAngle(angledAddress){
	let n = 0n;
	let m = 1n;
	for (let index=0;index<angledAddress.length;index++){
		let period = angledAddress[index].period;
		let nextM = (1n<<(BigInt(period).valueOf()))-1n;
		if (m!=nextM){
			/** @type {bigint[]} */
			let smallerDenominators = [];
			let k = 1n;
			while (k<nextM){
				smallerDenominators.push(k);
				k = 2n*k+1n;
			}
			console.assert(k==nextM);
			let currentAngle = new BigFrac(n,m);
			let nextAngle = BigFrac.min(...smallerDenominators.map(n=>currentAngle.nextLarger(n)));
			while(nextAngle.compareTo(currentAngle.nextLarger(nextM))<=0){
				console.assert(externalAngleType(nextAngle)=="lower");
				currentAngle = lowerToUpperAngle(nextAngle);
				nextAngle = BigFrac.min(...smallerDenominators.map(n=>currentAngle.nextLarger(n)));
			}
			n = currentAngle.nextLarger(nextM).a;
			m = nextM;
		}
		if (index<angledAddress.length-1){
			let internalAngle = angledAddress[index].angle;
			console.assert(internalAngle!==undefined&&internalAngle.a>0&&internalAngle.b>1);
			period *= internalAngle.b;
			let nextM = (1n<<(BigInt(period).valueOf()))-1n;
			/** @type {bigint[]} */
			let smallerDenominators = [];
			let k = 1n;
			while (k<nextM){
				smallerDenominators.push(k);
				k = 2n*k+1n;
			}
			console.assert(k==nextM);
			let bulbIndex = 0;
			for (let j=1;j<=internalAngle.a;j++){
				if (gcd(BigInt(j).valueOf(),BigInt(internalAngle.b).valueOf())==1n){
					bulbIndex++;
				}
			}
			let currentAngle = new BigFrac(n,m);
			for (let i=0;i<bulbIndex;i++){
				let nextAngle = BigFrac.min(...smallerDenominators.map(n=>currentAngle.nextLarger(n)));
				while(nextAngle.compareTo(currentAngle.nextLarger(nextM))<=0){
					console.assert(externalAngleType(nextAngle)=="lower",currentAngle,nextAngle);
					currentAngle = lowerToUpperAngle(nextAngle);
					nextAngle = BigFrac.min(...smallerDenominators.map(n=>currentAngle.nextLarger(n)));
				}
				if (i<bulbIndex-1){
					currentAngle = lowerToUpperAngle(currentAngle.nextLarger(nextM));
				}
			}
			n = currentAngle.nextLarger(nextM).a;
			m = nextM;
		}
	}
	return new BigFrac(n,m);
}
//console.log(angledInternalAddressToExternalAngle([{period:1,angle:new Fraction(1,2)},{period:2,angle:new Fraction(1,3)},{period:5}]));
// @ts-ignore
window.angledInternalAddressToExternalAngle = angledInternalAddressToExternalAngle;
/**
 * A pair of periodic parameter rays landing at a common point. Immutable.
 */
export class ParameterRayPair {
	/**
	 * @param {BigFrac} angle
	 */
	constructor(angle){
		if (!isPeriodic(angle)){
			throw new Error(`tried to construct parameter ray pair from non-periodic angle ${angle}`);
		}else if (externalAngleType(angle)=="lower"){
			this._lowerAngle = angle;
		}else{
			this._upperAngle = angle;
		}
	}

	/**
	 * The lower of the two angles.
	 * @readonly
	 */
	get lowerAngle(){
		if (!this._lowerAngle){
			let conjugate = lowerToUpperAngle(new BigFrac(this._upperAngle.b-this._upperAngle.a,this._upperAngle.b));
			this._lowerAngle = new BigFrac(conjugate.b-conjugate.a,conjugate.b);
		}
		return this._lowerAngle;
	}

	/**
	 * The upper of the two angles.
	 * @readonly
	 */
	get upperAngle(){
		if (!this._upperAngle){
			this._upperAngle = lowerToUpperAngle(this._lowerAngle);
		}
		return this._upperAngle;
	}

	toString(){
		return `(${this.lowerAngle},${this.upperAngle})`;
	}
}
// @ts-ignore
window.ParameterRayPair = ParameterRayPair;
/**
 * Returns the greatest common divisor of two integers.
 * @param {bigint} a
 * @param {bigint} b
 * @returns {bigint}
 */
function gcd(a,b){
	return b?gcd(b,a%b):a<0?-a:a;
}
// @ts-ignore
window.gcd = gcd;
/**
 * A fraction a/b.
 */
export class Fraction {
	/**
	 * @param {number} a
	 * @param {number} b
	 */
	constructor(a,b){
		this.a = a;
		this.b = b;
	}

	toString(){
		return `${this.a}/${this.b}`;
	}

	toFloat(){
		return this.a/this.b;
	}
}
// @ts-ignore
window.Fraction = Fraction;
/**
 * A fraction a/b, where a and b may be big. Immutable.
 */
export class BigFrac {
	/**
	 * @param {bigint|number} a
	 * @param {bigint|number} b
	 */
	 constructor(a,b){
		this._a = BigInt(a).valueOf();
		this._b = BigInt(b).valueOf();
		if (this._b==0n){
			throw new Error("Fraction must have a non-zero denominator!");
		}else if (this._b<0){
			this._a = -this._a;
			this._b = -this._b;
		}
	}

	/**
	 * Numerator of the fraction.
	 * @readonly 
	 */
	get a(){
		return this._a;
	}

	/**
	 * Denominator of the fraction. Guaranteed to be positive.
	 * @readonly
	 */
	get b(){
		return this._b;
	}

	toString(){
		return `${this.a}/${this.b}`;
	}

	toFloat(){
		return Number(this.a)/Number(this.b);
	}

	/**
	 * @param {BigFrac} frac
	 */
	equals(frac){
		return this.a*frac.b==frac.a*this.b;
	}

	/**
	 * Returns 1 if it is bigger than the given fraction, -1 if it is smaller, and 0 if they're equal.
	 * @param {BigFrac} frac
	 */
	compareTo(frac){
		let diff = this.a*frac.b-frac.a*this.b;
		return diff>0?1:diff<0?-1:0;
	}

	/**
	 * Returns the next larger fraction with the given denominator.
	 * @param {bigint} denominator
	 */
	nextLarger(denominator){
		let frac = new BigFrac((this.a*denominator)/this.b,denominator);
		if (frac.compareTo(this)!=1){
			frac = new BigFrac(frac.a+1n,frac.b);
		}
		return frac;
	}

	/**
	 * Returns the smallest of the given fractions.
	 * @param  {...BigFrac} fracs
	 */
	static min(...fracs){
		return fracs.reduce((f1,f2)=>f1.compareTo(f2)<=0?f1:f2);
	}
}
// @ts-ignore
window.BigFrac = BigFrac;