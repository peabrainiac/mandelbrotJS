# MandelbrotJS

An experimental renderer for fractals like the mandelbrot set, written in javascript.

This is currently less of a finished program and more a place for me to test new ideas, tools and rendering algorithms - but I hope some of these will allow me to turn this into an actual high-performance fractal explorer over time.

A working version of this program can be seen on [peabrainiac.github.io/mandelbrotJS](https://peabrainiac.github.io/mandelbrotJS/). If you want to run a copy of this locally instead, you can do so using any local http server (just opening `index.html` directly in the browser probably won't work); if you have python 3 installed, you can start one by running `server.py`, which will then serve all files from this folder at `localhost:8080` using the build-in `http.server` module.

# Features / implementation status
 - [x] adjustable resolution, iteration cap, and formula
 - [ ] adjustable colors
 - [x] multiple formulas:
   - [x] mandelbrot set
   - [x] mandelbar set
   - [x] möbius mandelbrot set
   - [x] burning ship and other double-abs-fractals
   - [x] perpendicular burning ship and other single-abs-fractals
   - [x] buffalo and other quadruple-abs-fractals
   - [ ] custom formulas
   - [x] formulas with parameters
 - [x] zoom depth of up to `2^50`
 - [ ] higher zoom depths
 - [x] multithreaded rendering (only works in firefox when loaded from `server.py`, but should always in chrome)
 - [x] multisampling
 - [x] periodic point overlay
   - [x] shows periodic points and their periods
   - [x] approximates the scale and orientation of minibrots and disks
   - [x] mandelbrot set support
   - [x] mandelbar set support
   - [ ] möbius mandelbrot set support
   - [ ] works on zoom depths deeper than `2^50`
 - [ ] adjustable viewport stretch
 - [ ] automatic viewport stretch adjustment
 - [ ] automatic iteration count adjustment
