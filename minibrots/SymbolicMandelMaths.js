// Module with methods for working with kneading sequences, external angles, internal addresses and the like. based on https://arxiv.org/abs/math/9411238
/**
 * Returns the kneading number of the *-periodic external angle.
 * @param {Fraction} angle
 */
export function getKneadingSequence(angle){
	let n = angle.a;
	let m = angle.b;
	let m2 = Math.round(Math.log2(m+1));
	console.assert(m==2**m2-1,`m must be one less than a power of two, but it is ${m}`);
	n = n%m;
	let k = n;
	let s = "";
	for (let i=0;i<2*m2;i++){
		if (k==n/2||k==(n+m)/2){
			s += "*";
			break;
		}else if(k>n/2&&k<(n+m)/2){
			s += "1";
		}else{
			s += "0";
		}
		k = (k*2)%m;
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
 * @param {Fraction} angle
 */
export function externalAngleType(angle){
	const n = angle.a;
	const m = angle.b;
    if (m==1){
        return n==0?"lower":"upper";
    }else{
        let kneadingSequence = getKneadingSequence(angle);
        let address = getInternalAddress(kneadingSequence);
        //console.log(address,kneadingSequence,kneadingSequence[(kneadingSequence.length-1)%address[address.length-2]],(kneadingSequence.length-1)%address[address.length-2]);
        return (((n*2**(kneadingSequence.length-1))%m==n/2?"1":"0")==kneadingSequence[(kneadingSequence.length-1)%address[address.length-2]])?"upper":"lower";
    }
}
// @ts-ignore
window.externalAngleType = externalAngleType;
/**
 * Returns an angle in an angled internal address, based on the kneading sequence the address encodes, its two entries around the angle, and one of its external angles.
 * @param {string} kneadingSequence
 * @param {number} period
 * @param {number} nextPeriod
 * @param {Fraction} angle
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
	k = n;
	for (let i=1;i<q-1;i++){
		k = (2**period*k)%m;
		if (k<=n){
			p++;
		}
	}
	return {numerator:p,denominator:q};
}
// @ts-ignore
window.getInternalAngle = getInternalAngle;
/**
 * Returns the angled internal address of a *-periodic external angle.
 * @param {Fraction} angle
 */
export function getAngledInternalAddress(angle){
	let kneadingSequence = getKneadingSequence(angle);
	let internalAddress = getInternalAddress(kneadingSequence);
	return internalAddress.map((period,index)=>{
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