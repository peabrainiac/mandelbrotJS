/**
 * A timer helper class.
 */
export default class Timer {
	/**
	 * Constructs a new timer. The timer starts paused at 0.
	 */
	constructor(){
		this._time = 0;
		this._running = false;
		this._start = Date.now();
	}

	/**
	 * Starts or continues the timer if it isn't already running.
	 */
	start(){
		if (!this._running){
			this._running = true;
			this._start = Date.now();
		}
	}

	/**
	 * Stops / pauses the timer.
	 */
	stop(){
		if (this._running){
			this._running = false;
			this._time += (Date.now()-this._start)/1000;
		}
	}

	/** Resets the timer to 0. */
	reset(){
		this.time = 0;
	}

	set time(time){
		this._time = time;
		this._start = Date.now();
	}

	/**
	 * The current time in seconds.
	 * @type {number}
	 * */
	get time(){
		return this._time+(this._running?(Date.now()-this._start)/1000:0);
	}
	
	/**
	 * Returns this current time in seconds, casted to a string.
	 * 
	 * This is here to allow Timer objects to be used in calculations directly, as the string is automatically casted back to a number when used with arithmetic operators like `-`, `*`, `/` and `%`.
	 * The only place where this doesn't work is with addition, as that would result in string concatenation instead.
	 */
	toString(){
		return ""+this.time;
	}

	/**
	 * Calls the callbacks whenever the timer value changes.
	 * 
	 * This is internally based on `requestAnimationFrame`; as such, it will trigger about 60 times per second when the timer is running, and with up to 1/60th of a second delay when it is modified while paused.
	 * @param {(time:number)=>void} callback 
	 */
	onChange(callback){
		let _time = this._time;
		let update = ()=>{
			if (this._running){
				callback(this.time);
			}else if(_time!=this._time){
				_time = this._time;
				callback(this.time);
			}
			requestAnimationFrame(update);
		};
		requestAnimationFrame(update);
		callback(this.time);
	}
}