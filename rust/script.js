import Utils from "../util/Utils.js";
import * as wasm from "./idk/pkg/idk.js";

await wasm.default();
Utils.onPageLoad(async()=>{
	console.log("wasm:",wasm);
	const ITERATIONS = 1000000;
	await testFunction(()=>mandelbrotPolynomial(Math.random()*0.25,Math.random()*0.25,ITERATIONS),"js_basic");
	await testFunction(()=>wasm.test_basic(Math.random()*0.25,Math.random()*0.25,ITERATIONS),"wasm_basic");
	await testFunction(()=>wasm.test(Math.random()*0.25,Math.random()*0.25,ITERATIONS),"wasm_operator_overloading");
});
/**
 * @param {()=>void} f
 * @param {string} name
 */
async function testFunction(f,name){
	const N = 1000;
	console.group(`Running tests on \"${name}\":`);
	let t = Date.now();
	for (let i=0;i<N;i++){
		f();
	}
	console.log(`Finished warmup in ${Date.now()-t}ms`);
	t = Date.now();
	await new Promise(resolve=>setTimeout(resolve,500));
	console.log(`Waited ${Date.now()-t}ms`);
	t = Date.now();
	for (let i=0;i<N;i++){
		f();
	}
	t = Date.now()-t;
	console.log(`Ran \"${name}\" ${N} times in ${t}ms,\naverage execution speed: ${t/N}ms`);
	console.groupEnd();
}
/**
 * basic js function to compare the rust code against.
 * @param {number} cx
 * @param {number} cy
 * @param {number} n
 */
function mandelbrotPolynomial(cx,cy,n){
	let zx = 0;
	let zy = 0;
	for (let i=0;i<=n;i++){
		let temp = zx*zx-zy*zy+cx;
		zy = 2*zx*zy+cy;
		zx = temp;
	}
	return zx;
}