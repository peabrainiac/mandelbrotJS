use std::ops::{Add, Sub, Neg, Mul, Div};
use std::str::FromStr;
use std::fmt;
use std::num::ParseFloatError;
use regex::Regex;
use lazy_static::lazy_static;

/// type for which addition and subtraction are defined
pub trait AdditiveGroup: Add<Self,Output=Self>+Neg<Output=Self>+Sub<Self,Output=Self>+Sized {}
/// type for which multiplication and division are defined
pub trait MultiplicativeGroup: Mul<Self,Output=Self>+Div<Self,Output=Self>+Sized {}
/// type for which addition, subtraction and multiplication are defined
pub trait Ring: AdditiveGroup+Mul<Self,Output=Self> {}
/// type for which addition, subtraction, multiplication and division are defined
pub trait Field: Ring+MultiplicativeGroup {}
/// type for which addition and subtraction as well as scalar multiplication by some other type are defined
pub trait VectorSpace<K:Field+Mul<Self,Output=Self>>: AdditiveGroup+Mul<K,Output=Self>+Div<K,Output=Self> {}
/// type for which addition, subtraction and multiplication as well as scalar multiplication are defined
pub trait Algebra<K:Field+Mul<Self,Output=Self>>: VectorSpace<K>+Mul<Self,Output=Self> {}

#[derive(Debug,Copy,Clone)]
pub struct Complex {
	pub x: f64,
	pub y: f64
}

impl AdditiveGroup for f64 {}
impl MultiplicativeGroup for f64 {}
impl Ring for f64 {}
impl Field for f64 {}

impl AdditiveGroup for Complex {}
impl MultiplicativeGroup for Complex {}
impl Ring for Complex {}
impl Field for Complex {}
impl VectorSpace<f64> for Complex {}
impl Algebra<f64> for Complex {}

impl Complex {
	pub const ZERO:Complex = Complex{x:0.0,y:0.0};
	pub const ONE:Complex = Complex{x:1.0,y:0.0};

	pub fn conj(&self) -> Complex {
		Complex {x: self.x, y:-self.y}
	}

	pub fn abs(&self) -> f64 {
		f64::sqrt(self.x*self.x+self.y*self.y)
	}
}

impl Add<Complex> for Complex {
	type Output = Complex;

	fn add(self, z: Complex) -> Complex {
		Complex {
			x: self.x+z.x,
			y: self.y+z.y
		}
	}
}

impl Neg for Complex {
	type Output = Complex;

	fn neg(self) -> Complex {
		Complex {
			x:-self.x,
			y:-self.y
		}
	}
}

impl Sub<Complex> for Complex {
	type Output = Complex;

	fn sub(self, z: Complex) -> Complex {
		Complex {
			x: self.x-z.x,
			y: self.y-z.y
		}
	}
}

impl Mul<Complex> for Complex {
	type Output = Complex;

	fn mul(self, z: Complex) -> Complex {
		Complex {
			x: self.x*z.x-self.y*z.y,
			y: self.x*z.y+self.y*z.x
		}
	}
}

impl Mul<Complex> for f64 {
	type Output = Complex;

	fn mul(self, z: Complex) -> Complex {
		Complex {
			x: self*z.x,
			y: self*z.y
		}
	}
}

impl Mul<f64> for Complex {
	type Output = Complex;

	fn mul(self, a: f64) -> Complex {
		Complex {
			x: self.x*a,
			y: self.y*a
		}
	}
}

impl Div<Complex> for Complex {
	type Output = Complex;

	fn div(self, z: Complex) -> Complex {
		self*z.conj()/(z.x*z.x+z.y*z.y)
	}
}

impl Div<f64> for Complex {
	type Output = Complex;

	fn div(self, a: f64) -> Complex {
		Complex {
			x: self.x/a,
			y: self.y/a
		}
	}
}

impl fmt::Display for Complex {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		if self.x==0.0&&self.y==0.0 {
			write!(f,"{}",0.0)
		}else if self.x==0.0 {
			if self.y==1.0 {
				write!(f,"i")
			}else if self.y==-1.0 {
				write!(f,"-i")
			}else{
				write!(f,"{}i",self.y)
			}
		}else if self.y==0.0 {
			write!(f,"{}",self.x)
		}else if self.y==1.0 {
			write!(f,"{}+i",self.x)
		}else if self.y==-1.0 {
			write!(f,"{}-i",self.x)
		}else if self.y<0.0 {
			write!(f,"{}{}i",self.x,self.y)
		}else{
			write!(f,"{}+{}i",self.x,self.y)
		}
	}
}

impl FromStr for Complex {
	type Err = ComplexParseError;

	fn from_str(s: &str) -> Result<Complex,ComplexParseError> {
		Ok(match s {
			"0" => Complex{x:0.0,y:0.0},
			"i" => Complex{x:0.0,y:1.0},
			"-i" => Complex{x:0.0,y:-1.0},
			s if !s.ends_with("i") => {
				Complex{x:s.parse()?,y:0.0}
			},
			s => {
				lazy_static! {
					static ref R: Regex = Regex::new("^([+-]?[0-9.]+(?:e[+-]?[0-9]+)?)?((?:^|[+-])[0-9.]*(?:e[+-]?[0-9]+)?)i$").unwrap();
				}
				let components = R.captures(s).ok_or(ComplexParseError)?;
				let mut c = Complex{x:0.0,y:0.0};
				if let Some(first_match)=components.get(1) {
					c.x = first_match.as_str().parse()?;
				}
				if let Some(second_match)=components.get(2) {
					c.y = match second_match.as_str() {
						"+" => 1.0,
						"-" => -1.0,
						floatstr => floatstr.parse()?
					}
				}
				c
			}
		})
	}
}

#[derive(Debug,Clone)]
pub struct ComplexParseError;

impl From<ParseFloatError> for ComplexParseError {
    fn from(_err: ParseFloatError) -> ComplexParseError {
		ComplexParseError
	}
}

impl fmt::Display for ComplexParseError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		write!(f,"TODO: implement error message")
	}
}

pub struct ComplexWithDerivative {
	z: Complex,
	dz: Complex
}

impl AdditiveGroup for ComplexWithDerivative {}
impl MultiplicativeGroup for ComplexWithDerivative {}
impl Ring for ComplexWithDerivative {}
impl Field for ComplexWithDerivative {}
impl VectorSpace<f64> for ComplexWithDerivative {}
impl VectorSpace<Complex> for ComplexWithDerivative {}
impl Algebra<f64> for ComplexWithDerivative {}
impl Algebra<Complex> for ComplexWithDerivative {}

impl Add<ComplexWithDerivative> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn add(self, b: ComplexWithDerivative) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z+b.z,
			dz: self.dz+b.dz
		}
	}
}

impl Neg for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn neg(self) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: -self.z,
			dz: -self.dz
		}
	}
}

impl Sub<ComplexWithDerivative> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn sub(self, b: ComplexWithDerivative) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z-b.z,
			dz: self.dz-b.dz
		}
	}
}

impl Mul<ComplexWithDerivative> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn mul(self, b: ComplexWithDerivative) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z*b.z,
			dz: self.dz*b.z+self.z*b.dz
		}
	}
}

impl Mul<ComplexWithDerivative> for f64 {
	type Output = ComplexWithDerivative;

	fn mul(self, b: ComplexWithDerivative) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self*b.z,
			dz: self*b.dz
		}
	}
}

impl Mul<ComplexWithDerivative> for Complex {
	type Output = ComplexWithDerivative;

	fn mul(self, b: ComplexWithDerivative) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self*b.z,
			dz: self*b.dz
		}
	}
}

impl Mul<f64> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn mul(self, b: f64) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z*b,
			dz: self.dz*b
		}
	}
}

impl Mul<Complex> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn mul(self, b: Complex) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z*b,
			dz: self.dz*b
		}
	}
}

impl Div<ComplexWithDerivative> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn div(self, b: ComplexWithDerivative) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z/b.z,
			dz: (self.dz*b.z-self.z*b.dz)/(b.z*b.z)
		}
	}
}

impl Div<f64> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn div(self, b: f64) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z/b,
			dz: self.dz/b
		}
	}
}

impl Div<Complex> for ComplexWithDerivative {
	type Output = ComplexWithDerivative;

	fn div(self, b: Complex) -> ComplexWithDerivative {
		ComplexWithDerivative {
			z: self.z/b,
			dz: self.dz/b
		}
	}
}