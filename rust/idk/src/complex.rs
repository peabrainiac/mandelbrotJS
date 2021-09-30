use std::ops::{Add, Sub, Mul};
use std::str::FromStr;
use std::fmt;
use std::num::ParseFloatError;
use regex::Regex;
use lazy_static::lazy_static;

#[derive(Debug,Copy,Clone)]
pub struct Complex {
	pub x: f64,
	pub y: f64
}

impl Add<Complex> for Complex {
	type Output = Complex;

	fn add(self, z: Complex)-> Complex {
		Complex {
			x: self.x+z.x,
			y: self.y+z.y
		}
	}
}

impl Sub<Complex> for Complex {
	type Output = Complex;

	fn sub(self, z: Complex)-> Complex {
		Complex {
			x: self.x-z.x,
			y: self.y-z.y
		}
	}
}

impl Mul<Complex> for Complex {
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
					static ref R: Regex = Regex::new("^([+-]?[0-9.]+(?:e[+-]?[0-9]+)?)?([+-][0-9.]*(?:e[+-]?[0-9]+)?)i$").unwrap();
				}
				let components = R.captures(s).unwrap();
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