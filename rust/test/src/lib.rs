use std::ops;
use std::fmt;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn test(x: f64, y: f64, n: i32) -> f64 {
    let c = Complex {
        x,
        y
    };
    //let s = "Hello, test!".to_owned()+&mandelbrot_polynomial(c,3).to_string();
    //alert(&s);
    return mandelbrot_polynomial(c,n).x;
}

#[wasm_bindgen]
pub fn test_basic(x: f64, y: f64, n: i32) -> f64 {
    return mandelbrot_polynomial_basic(x,y,n);
}

fn mandelbrot_polynomial_basic(cx: f64, cy: f64, n:i32) -> f64 {
    let mut zx = 0.0;
    let mut zy = 0.0;
    for _ in 1..(n+1) {
        let temp = zx*zx-zy*zy+cx;
        zy = 2.0*zx*zy+cy;
        zx = temp;
    }
    return zx;
}

fn mandelbrot_polynomial(c: Complex, n:i32) -> Complex {
    let mut z = Complex{x:0.0,y:0.0};
    for _ in 1..(n+1) {
        z = z*z+c;
    }
    return z;
}

#[derive(Debug,Copy,Clone)]
struct Complex {
    x: f64,
    y: f64
}

impl ops::Add<Complex> for Complex {
    type Output = Complex;

    fn add(self, z: Complex)-> Complex {
        Complex {
            x: self.x+z.x,
            y: self.y+z.y
        }
    }
}

impl ops::Mul<Complex> for Complex {
    type Output = Complex;

    fn mul(self, z: Complex)-> Complex {
        Complex {
            x: self.x*z.x-self.y*z.y,
            y: 2.0*self.x*z.y
        }
    }
}

impl fmt::Display for Complex {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f,"{}+{}i",self.x,self.y)
    }
}

#[wasm_bindgen]
pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
