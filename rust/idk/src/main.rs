use idk::complex::Complex;

use idk::find_periodic_point;
use structopt::StructOpt;
use strum::EnumString;
use strum::ToString;
use strum::IntoEnumIterator;
use strum::EnumIter;
use lazy_static::lazy_static;

// cli for this project.
#[derive(StructOpt)]
enum Cli {
	// evaluate a mandelbrot-set-related function at a point
	#[structopt(settings = &[structopt::clap::AppSettings::AllowLeadingHyphen])]
	Eval {
		#[structopt(name = "function", possible_values = &FUNCTIONTYPE_POSSIBLE_VALUES)]
		function: FunctionType,
		// number of iterations
		n: i32,
		c: Complex
	},
	// find a periodic or critical point
	#[structopt(settings = &[structopt::clap::AppSettings::AllowLeadingHyphen])]
	Find {
		#[structopt(name = "type", possible_values = &POINTTYPE_POSSIBLE_VALUES)]
		target: PointType,
		x: f64,
		y: f64,
		period: Option<i32>
	},
}

#[derive(Debug, EnumString, ToString, EnumIter)]
enum FunctionType {
	#[strum(serialize="mandelbrot-polynomial")]
	MandelbrotPolynomial
}
lazy_static! {
    static ref FUNCTIONTYPE_POSSIBLE_VALUES_STRING: Vec<String> = FunctionType::iter().map(|e| e.to_string()).collect();
    static ref FUNCTIONTYPE_POSSIBLE_VALUES: Vec<&'static str> = FUNCTIONTYPE_POSSIBLE_VALUES_STRING.iter().map(AsRef::as_ref).collect();
}

#[derive(Debug, EnumString, ToString, EnumIter)]
enum PointType {
	#[strum(serialize="periodic-point")]
	PeriodicPoint,
	#[strum(serialize="critical-point")]
	CriticalPoint,
	#[strum(serialize="minibrot")]
	Minibrot
}
lazy_static! {
    static ref POINTTYPE_POSSIBLE_VALUES_STRING: Vec<String> = PointType::iter().map(|e| e.to_string()).collect();
    static ref POINTTYPE_POSSIBLE_VALUES: Vec<&'static str> = POINTTYPE_POSSIBLE_VALUES_STRING.iter().map(AsRef::as_ref).collect();
}

pub fn main() {
	let args = Cli::from_args();
	match args {
		Cli::Eval {function,n,c} => {
			let value = match function {
				FunctionType::MandelbrotPolynomial => idk::mandelbrot_polynomial(c,n)
			};
			println!("{}",value);
		},
		Cli::Find {target,x,y,period} => {
			match target {
				PointType::PeriodicPoint =>{
					let c = Complex{x,y};
					match find_periodic_point(c,period.unwrap()) {
						Some(point) => println!("{}\nscale: {}\n{:?}",point.position,point.scale,point.get_formula_coefficients(6)),
						_ => println!("No such point found.")
					}
				},
				_ => println!("This part isn't implemented yet.")
			}
		},
		_ => {
			println!("This part isn't implemented yet. But also, hello world from main.rs!\n");
		}
	}
}