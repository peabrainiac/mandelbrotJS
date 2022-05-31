// Module with methods for working with kneading sequences, external angles, internal addresses and the like. based on https://arxiv.org/abs/math/9411238
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
/**
 * A fraction a/b, where a and b may be big.
 */
export class BigFrac {
	/**
	 * @param {bigint|number} a
	 * @param {bigint|number} b
	 */
	 constructor(a,b){
		this.a = BigInt(a).valueOf();
		this.b = BigInt(b).valueOf();
	}

	toString(){
		return `${this.a}/${this.b}`;
	}

	toFloat(){
		return Number(this.a)/Number(this.b);
	}
}
// @ts-ignore
window.BigFrac = BigFrac;