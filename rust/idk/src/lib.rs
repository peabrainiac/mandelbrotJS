use wasm_bindgen::prelude::*;

use complex::Complex;

pub mod complex;

pub struct PeriodicPoint {
	pub position:Complex,
	pub scale:Complex,
	pub period:i32
}

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

pub fn find_periodic_point(c: complex::Complex, n:i32) -> Option<PeriodicPoint> {
	let mut c2 = c;
	for _ in 1..20 {
		let mut z = c2;
		let mut dz = Complex::ONE;
		for _ in 1..n {
			dz = 2.0*z*dz+Complex::ONE;
			z = z*z+c2;
		}
		c2 = c2-z/dz;
		if (z/dz).abs()<1.0e-12 {
			break;
		}else if z.abs()>2.0 {
			return None;
		}
	}
	let mut a = Complex::ONE;
	let mut z = Complex::ZERO;
	let mut dz = Complex::ZERO;
	let mut ddz = Complex::ZERO;
	for i in 0..n {
		ddz = 2.0*(z*ddz+dz*dz);
		dz = 2.0*z*dz+Complex::ONE;
		z = z*z+c2;
		if i<n-1 {
			a = 2.0*a*z;
		}
	}
	let scale = Complex::ONE/(dz*a);
	return Some(PeriodicPoint{position:c2,period:n,scale});
}

impl PeriodicPoint {
	// returns the first few coefficients of the bivariate polynomial p(z,c) such that the minibrot can be iterated as z->p(z^2+c,c)
	pub fn get_formula_coefficients(&self, n:usize) -> Vec<Vec<Complex>> {
		let binom = get_all_binom_coefficients(n);
		let mut dz  = vec![vec![Complex::ZERO;n+1];n+1];
		dz[0][0] = self.position;
		dz[0][1] = Complex::ONE;
		for _ in 1..self.period {
			for i in (0..(n+1)).rev() {
				for j in (0..(n+1)).rev() {
					let mut temp = Complex::ZERO;
					for k in 0..(i+1) {
						for l in 0..(j+1) {
							temp = temp+dz[k][l]*dz[i-k][j-l];
						}
					}
					dz[i][j] = temp;
				}
			}
			dz[0][0] = dz[0][0]+self.position;
			dz[1][0] = dz[1][0]+Complex::ONE;
			//println!("{:?}",dz);
		}
		let a = dz[0][1];
		println!("a: {}",a);
		// p(z,c) -> a*p(z/a^2,c)
		let mut temp = a;
		for j in 0..(n+1) {
			for i in 0..(n+1) {
				dz[i][j] = dz[i][j]*temp;
			}
			temp = temp/(a*a);
		}
		// p(z,c) -> p(z-b*c,c)
		let b = dz[1][0];
		for j in 0..=n {
			for i in 0..=n {
				let mut temp = -b;
				for k in 1..=std::cmp::min(j,n-i) {
					dz[i+k][j-k] = dz[i+k][j-k]+(binom[j][k] as f64)*dz[i][j]*temp;
					temp = temp*-b;
				}
			}
		}
		// p(z,c) -> p(z,c/(a^2+b))
		let mut temp = Complex::ONE;
		for i in 0..(n+1) {
			for j in 0..(n+1) {
				dz[i][j] = dz[i][j]*temp;
			}
			temp = temp/(a*a+b);
		}
		let mut s = dz[0][0].to_string();
		for i in 1..(n+1) {
			for j in 0..(i+1) {
				if dz[j][i-j].abs()>0.0 {
					s += &format!("+({})",dz[j][i-j]);
					if j>0 {
						s+= "c";
						if j>1 {
							s += &format!("^{}",j);
						}
					}
					if i-j>0 {
						s+= "z";
						if i-j>1 {
							s += &format!("^{}",i-j);
						}
					}
				}
			}
		}
		println!("{}",s);
		/*let mut s = dz[0][0].to_string();
		for i in 1..(n+1) {
			for j in 0..(i+1) {
				if dz[j][i-j].abs()>0.0 {
					s += &format!("+cmul(vec2({},{}),cmul(c{},z{}))",dz[j][i-j].x as f32,dz[j][i-j].y as f32,j,i-j);
				}
			}
		}
		println!("{}",s);*/
		return dz;
	}
}

pub fn get_binom_coefficients(n:usize) -> Vec<i32> {
	let mut coeffs = vec![0;n+1];
	coeffs[0] = 1;
	for i in 0..n {
		for j in (1..(i+2)).rev() {
			coeffs[j] = coeffs[j]+coeffs[j-1];
		}
	}
	return coeffs;
}

pub fn get_all_binom_coefficients(n:usize) -> Vec<Vec<i32>> {
	let mut temp = vec![];
	for i in 0..(n+1) {
		temp.push(get_binom_coefficients(i));
	}
	return temp;
}

#[wasm_bindgen]
pub fn set_panic_hook() {
	#[cfg(feature = "console_error_panic_hook")]
	console_error_panic_hook::set_once();
}
