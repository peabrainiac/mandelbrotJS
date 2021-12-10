use wasm_bindgen::prelude::*;

pub mod complex;

#[wasm_bindgen]
pub fn test(x: f64, y: f64, n: i32) -> f64 {
	let c = complex::Complex {
		x,
		y
	};
	return mandelbrot_polynomial(c,n).x;
}

#[wasm_bindgen]
pub fn test_basic(x: f64, y: f64, n: i32) -> f64 {
	return mandelbrot_polynomial_basic(x,y,n);
}

fn mandelbrot_polynomial_basic(cx: f64, cy: f64, n:i32) -> f64 {
	let mut zx = cx;
	let mut zy = cy;
	for _ in 1..n {
		let temp = zx*zx-zy*zy+cx;
		zy = 2.0*zx*zy+cy;
		zx = temp;
	}
	return zx;
}

pub fn mandelbrot_polynomial<C: Copy+complex::Field>(c: C, n:i32) -> C {
	let mut z = c;
	for _ in 1..n {
		z = z*z+c;
	}
	return z;
}

#[wasm_bindgen]
pub fn set_panic_hook() {
	#[cfg(feature = "console_error_panic_hook")]
	console_error_panic_hook::set_once();
}
