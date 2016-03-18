/*
The MIT License (MIT)

Copyright (c) 2014 Junil Um

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

github: https://github.com/powerumc/Javascript-OOP-AOP-IoC
blog  : http://blog.powerumc.kr/
*/

var oop;


(function() {
var LOG,
	DEBUG,
	TRACE,
	ERROR;
	msie = document.documentMode,
    isLoadCompleted = false;

if (msie && msie <= 8) {
	LOG = DEBUG = TRACE = ERROR = function() {};
} else {
	LOG = function (log) { if (console && console.log) { console.log(log);} };
	DEBUG = function (log) { if (console && console.log) { console.log(log); } };
	TRACE = function (log) { if (console && console.log) { console.log(log); } };
	ERROR = function (log) { if (console && console.log) { console.log(log); } };
}

oop = (function () {
	(function () {
		var __id = 1;

		if (msie && msie > 0) {
			//            Object.prototype.__object_id = 0;
			//            Object.prototype.objectId = function() {
			//                if (this.__object.id == undefined) {
			//                    this.__object_id = __id;
			//                }
			//                return this.__object_id;
			//            }
		} else {
			Object.defineProperty(Object.prototype, "__object_id", {
				writable: true
			});
			Object.defineProperty(Object.prototype, "objectId", {
				get: function () {
					if (this.__object_id == undefined)
						this.__object_id = __id++;
					return this.__object_id;
				}
			});
		}

		if (msie && msie <= 8) {
			window.hasOwnProperty = function (name) {
				return Object.prototype.hasOwnProperty.call(window, name);
			}
		}

	}());

	function isObject(obj) {
		return typeof obj === "object" && obj.constructor.name !== "Array";
	}

	function isProperty(obj) {
		return isObject(obj) && (obj.get || obj.set);
	}

	function isFunction(obj) {
		return typeof obj === "function";
	}

	function isArray(obj) {
		return (typeof obj === "object" && obj.constructor.name === "Array") ||
			   (Array.isArray && Array.isArray(obj)) ||
			   obj instanceof Array ||
			   (obj.constructor.name || obj.constructor.toString()).indexOf("HTMLCollection") >= 0;
	}

	function isString(obj) {
		return typeof obj === "string";
	}

	function isNumber(obj) {
		return typeof obj === "number";
	}

	function isStatic(obj) {
		return typeof obj === "string" && obj === "static";
	}

	function isHTMLElement(obj) {
		return isObject(obj) && obj.constructor && /\HTML.+Element/.test(obj.constructor.name || obj.constructor.toString());
	}

	function getValue() {
		var ret = [];
		for (var i = 0; i < arguments.length; i++) {
			var obj = arguments[i];
			if (isFunction(obj)) ret.push(obj());
			else if (isHTMLElement(obj)) ret.push(obj);
			else ret.push(obj);
		}

		return ret.length === 1 ? ret[0] : ret;
	}

	var setStaticMethod = function (type, static_objects) {
		for (var p in static_objects) {
			if (!static_objects.hasOwnProperty(p)) continue;
			type[p] = static_objects[p];
		}
	};

	var setProperty = function (self, propName, funcGet, funcSet) {
		Object.defineProperty(self, propName, { get: funcGet, set: funcSet });
	};

	var getProperties = function (clazz) {
		var propList = [];
		var type = clazz;
		for (var p in type) {
			if (!type.hasOwnProperty(p)) continue;
			propList.push({ "name": p, "object": type[p] });
		}
		return propList;
	};

	var getClassFromLiterals = function (literals) {
		var props = getProperties(literals);
		function ____() { }

		for (var p in props) {
			setPropertySpecification(____, props[p]);
		}

		return ____;
	};

	var setPropertySpecification = function (type, p) {
		var target = p.object;

		if (isStatic(p.name)) {
			setStaticMethod(type, target);
			return;
		}

		if (isProperty(target)) {
			setProperty(type.prototype, p.name, target.get, target.set);
			return;
		}

		if (isFunction(target)) {
			target = injectMethod(target);
			target.name = p.name;
			type.prototype[p.name] = target;
			type.prototype[p.name].prototype.name = p.name;
			type.prototype[p.name].constructor = type;
			return;
		} else {
			type.prototype[p.name] = target;
			return;
		}
	};

	var getFunctionParameters = function (func) {
		if (!func) return [];
		var pattern = /function[\s\w]*\(([($\w\s, ^\/\*,) ]+)\)/g;
		var pattern_comment = /(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(\/\/.*)/gm;
		var match = pattern.exec(func.toString());
		if (!match) return [];
		var params = match[1].replace(/ |\n/g, "").replace(pattern_comment, "").split(',');
		return params || [];
	};

	var getFunctionBody = function (func) {
		var pattern = /[^{]{((?:[^}])|(?:[^{]))*}[^}]/gm;
		return func.toString().match(pattern)[0].trim().substring(2)
	};

	var surroundTryCatch = function (func, exceptionFunc) {
		if (!func && !exceptionFunc) return "";

		return "\ntry {" + func + "} catch(err) { " + (exceptionFunc || "throw err;") + "}";
	};

	var surroundTryCatchFinally = function (func, exceptionFunc, finallyFunc) {
		if (!func && !exceptionFunc && !finallyFunc) return "";

		return "\ntry {" + func + "} catch(err) { " + (exceptionFunc || "throw err;") + "} " + (finallyFunc ? "finally { " + (finallyFunc || "") + " }" : "");
	};

	var surroundBehavior = function (func, behavior) {
		behavior = behavior || {};
		var beforeFunc = surroundTryCatch(immediateFunc(behavior.before || ""));
		var proc_func = surroundTryCatch(func);
		var afterFunc = surroundTryCatch(immediateFunc(behavior.after || ""));
		return surroundTryCatchFinally(beforeFunc + proc_func + afterFunc, immediateFunc(behavior.exception), immediateFunc(behavior.final));
	};

	var InterceptionFunc = function (func, behavior) {
		var params = getFunctionParameters(func);
		var proxyFunc = getFunctionBody(func);
		proxyFunc = surroundBehavior(proxyFunc, behavior);

		DEBUG("params ", params);

		var interceptionFunc = new Function(params.join(","), proxyFunc);
		interceptionFunc.constructor = func.constructor;
		interceptionFunc.prototype = func.prototype;
		interceptionFunc.constructor.prototype[interceptionFunc.prototype.name] = interceptionFunc;
	};

	var Interception = function (func, behavior) {
		if (isFunction(func)) { InterceptionFunc(func, behavior); }
		else if (isObject(func) && func.constructor && func.constructor.name === "____") {
			for (var p in func) {
				if (isFunction(func[p])) { InterceptionFunc(func[p], behavior); }
			}
		}
	};

	function immediateFunc(func, args) {
		args = args || [];
		if (!func) return "";

		var func_body = "";
		var func_args = "";
		if (func) {
			func_body = "(" + func + ")";
			if (args) { func_args = "(" + args.join(",") + ")"; }
		}

		return func_body + func_args;
	}

	var injectMethod = function (m, b, o) {
		var p = getFunctionParameters(m);
		var func_param = [];
		var func_param_ahead = [];

		if (p && p.length > 0) {
			for (var i = 0; i < p.length; i++) {
				if (p[i] === "base") func_param.push("this.__base__");
				else if (p[i] === "self") func_param.push("this");
				else {
					var name;
					if (o) name = (o.prefix || "") + p[i] + (o.suffix || "");
					else name = p[i];
					func_param.push(name);
					func_param_ahead.push(p[i]);
				}
			}
		}

		var func_body = immediateFunc(m, func_param);
		func_body = surroundTryCatch(func_body);

		return new Function(func_param_ahead.join(","), func_body);
	};

	var Inject = function () {
		var m = Array.prototype.slice.apply(arguments, [])[0];
		var o = arguments.length > 1 ? arguments[1] : null;
		var ret = [];
		//for(var m in methods) {
		//m = methods[m];
		p = getFunctionParameters(m);
		ret.push(injectMethod(m, p, o));
		//}
		return ret;
	};

	var InterceptionBehavior = function (before, after, exception, finally_) {

		this.before = before;
		this.after = after;
		this.finally_ = finally_;
		this.exception = exception;

		return {
			"before": this.before,
			"after": this.after,
			"final": this.finally_,
			"exception": this.exception
		};
	};

	var Class = function (parents, classInfo) {
		classInfo = Array.prototype.slice.apply(arguments, [-1])[0];
		var arrParents = Array.prototype.slice.apply(arguments, [0, arguments.length - 1]);
		if (arrParents && arrParents.length <= 1) { parents = undefined }
		LOG("[classInfo] ", classInfo);

		if (classInfo === undefined) {
			classInfo = parents;
			parents = undefined;
		}

		var parent_object;
		var self_arguments = arguments;
		var self = this;
		var type = this.constructor;
		var ret = {};
		var clazz_def = getClassFromLiterals(classInfo);

		for (var parent in arrParents) {
			parent = arrParents[parent];
			parent = (self.constructor && self.constructor.name !== "Window") ? parent : undefined;
			if (parent) {
				oop.extend(parent, clazz_def);
			}
		}

		return clazz_def;
	};

	return {
		extend: function (parent, clazz) {
			var parent_object;
			(function () {
				if (parent) {
					parent_object = Object.create(parent.prototype);
				}
				if (clazz.init) {
					clazz.init.apply(self, arguments);
				}
			})();

			for (var p in parent_object) { if (!clazz.prototype[p]) { clazz.prototype[p] = parent_object[p]; } }
			clazz.prototype.constructor = clazz;
			clazz.prototype.__base__ = parent_object;

			return clazz;
		},
		Class: function (parents, classInfo) {
			return Class.apply(this, arguments);
		},
		inject: function (method) {
			return Inject.apply(this, arguments);
		},
		interceptionBehavior: function (before, after, exception, finally_) {
			return InterceptionBehavior(before, after, exception, finally_);
		},
		interception: function (func, behavior) {
			return Interception(func, behavior);
		},
		getset: function (get, set) {
			this.get = get;
			this.set = set;
		},
		get: function (funcGet) { setProperty(this, "prop2", funcGet, undefined); return "A"; },
		set: function (value) { },
		static: function (static_objects) {
		},
		isObject: isObject,
		isFunction: isFunction,
		isNumber: isNumber,
		isString: isString,
		isArray: isArray,
		isProperty: isProperty,
		isStatic: isStatic,
		isHTMLElement: isHTMLElement,
		objects: [],
		globals: {},
		getValue: getValue
	}

})();



(function (oop) {
	function createEvent(name, arg) {
		var event = null;
		if (msie && msie == 8 && document.createEventObject) {
			event = document.createEventObject(name);
			event["details"] = arg;
		}
		else if (msie && msie > 8 && document.createEvent) {
			//throw "should be implement to createEvent method"
			event = document.createEvent("CustomEvent", { obj: arg });
			event["details"] = arg;
			event.initEvent(name, true, true);
		} else if (window.CustomEvent) {
			event = new CustomEvent(name, { detail: arg });
		}

		return event;
	}

	/**
     * Subscribe the event.
     * Execute a callback function when firing event.
     * 
     * 이벤트를 구독합니다.
     * 이벤트가 발행될 때 callback 함수를 실행합니다.
     * 
     * detail or details in a callback function is arguments.
     * The detail property if web browser have support CustomEvent Class, Otherwise to details property pass the arguments. 
     *
     * callback 함수의 인자에 detail 또는 details 속성이 발행 매개변수 입니다.
     * CustomEvent 클래스를 지원하는 브라우저는 detail 속성에, 그렇지 않은 브라우저는 details 속성에 매개변수 값이 전달됩니다.
     *
     * @example
     * oop.subscribe("user.onlogon", function(e) {
     *      console.log( (e.detail || e.details).username);
     * });
     *
     * @param name {string} 이벤트 구독 이름입니다.
     * @param callback {function} 이벤트 발생 시 실행할 callback 함수입니다.
     */
	oop.subscribe = function (name, callback) {
		if (!window.addEventListener) {
			window.addEventListener = function (name_, callback_, bubbling) {
				if (msie && msie <= 8) {
					var docie8 = document.documentElement;
					if (!docie8[name_]) docie8[name_] = [];
					docie8[name_].push(callback_);

					window.attachEvent && window.attachEvent(name, callback);
				} else if (msie && msie > 8) {
					window.attachEvent(name_, callback_ || null);
				} else {
					window.attachEvent(name_, callback_ || null);
				}
			};
		}

		function tryScrollOnIe8() {
			if (msie <= 8 && document.documentElement.doScroll && !document.frameElement) {
				try {
					document.documentElement.doScroll("left");
					try {
						callback();
					} finally { }
				} catch (e) {
					setTimeout(tryScrollOnIe8, 100);
				}
			}
		}

		if (msie && msie <= 8 && name === "DOMContentLoaded") {
			tryScrollOnIe8();
			return;
		}

		window.addEventListener(name, callback, false);
	};

	/**
     * Publish the event.
     * emit the event to have all subscribed the event listeners.
     * 
     * 이벤트를 발행합니다.
     * 이 이벤트를 구독하는 모든 리스너에게 이벤트를 발생시킵니다.
     *
     * @example
     * oop.publish("user.onlogon", {username:"powerumc"});
     *
     * @param name
     * @param arg
     */
	oop.publish = function (name, arg) {
		//DEBUG("[publish] " + name);

		if (msie && msie === 8) {
			var docie8 = document.documentElement;
			if (docie8[name]) {
				if (docie8[name]) {
					for (var i = 0; i < docie8[name].length; i++) {
						docie8[name][i]({ detail: arg });
					}
				}
			}
		} else {
			window.dispatchEvent(createEvent(name, arg));
		}

	};

})(oop);



/**
 * Create web request object via XMLHttpRequest.
 * 
 * XMLHttpRequest 를 이용하여 웹요청을 하는 객체를 생성합니다.
 *
 * @example
 *  oop.xhr.get(define.url, function (result) { })
 * .success(function (result) { console.log("success:" + result); })
 * .error(function (result) { throw "error:" + result; });
 * .timeout(function(result) { throw "timeout:" + result; })
 * xhr.send();
 *
 *  */
oop.xhr = (function (oop) {
	var createHttpRequest = function () {
		if (window.ActiveXObject && msie && msie < 8) {
			return new window.ActiveXObject("Microsoft.XMLHTTP");
		} else if (window.XMLHttpRequest) {
			return new XMLHttpRequest();
		}
	};

	var commonXhr = function (self) {
		return {
			/**
			 * @class commonXhr
			 *
             * The factory method, create the XMLHttpRequest(IE. "Microsoft.XMLHTTP") object.
             *              
			 * XMLHttpRequest(IE. "Microsoft.XMLHTTP") 객체를 생성하는 팩토리 메서드 입니다.
			 *
			 * @example 
			 * var xhr = new commonXhr();
			 * xhr.open("get", "http://powerumc.kr", false)
			 *    .send();
			 * 
			 * @param {string} method HTTP Methods 중 GET,POST,UPDATE,DELETE 등의 문자를 사용합니다.
			 * @param {string} url 대상 URL 입니다.
			 * @param {boolean} isAsync 원격 호출 대상을 비동기 다운로드 할지 여부를 설정합니다. 기본값 false
			 * @returns {commonXhr}
			 */
			open: function (method, url, isAsync) {
				this.xhr = createHttpRequest();
				this.xhr.open(method, url, isAsync);
				return self;
			},
			/**
             * Call the send method after set xhr options up. 
             * 
			 * 모든 Xhr 설정을 마치면 send 메서드를 이용하여 원격 호출을 시작합니다.
			 * 
			 * @example 
			 * var xhr = new commonXhr();
			 * xhr.open("get", "http://powerumc.kr", false)
			 *    .send();
			 * 
			 * @param {any} data 원격지도 전송할 데이터입니다.
			 * @returns {commonXhr} 
			 */
			send: function (data) {
				this.xhr.send(data || null);
				return void (0);
			},
			/**
             * The callback function when it is perform success the remote function
             * 
			 * 원격 호출이 성공할 때 실행되는 callback 함수입니다.
			 *
			 * @example 
			 * var xhr = new commonXhr();
			 * xhr.open("get", "http://powerumc.kr", false)
			 *    .success(function(result) { 
		  	 *			console.log(result); 
		  	 *     })
			 *    .send();
			 * 
			 * @param {function} callback 성공 시 실행할 callback 함수입니다.
			 * @returns {commonXhr} 
			 */
			success: function (callback) {
				if (msie && msie <= 8) {
					this.xhr.onreadystatechange = function () {
						if (this.readyState === "loaded" || this.readyState === 4) {
							callback(this.responseText);
						}
					};
				} else {
					this.xhr.onload = function (e) { callback(e.target.response || e.target.responseText); /* ie9 */ };
				}
				return this;
			},
			/**
             * The callback function when it is perform failure the remote function.
             * 
			 * 원격 호출이 실패할 때 실행되는 callback 함수입니다.
			 * 
			 * @example 
			 * var xhr = new commonXhr();
			 * xhr.open("get", "http://powerumc.kr", false)
			 *    .success(function(result) {})
			 *    .error(function(result) {
			 *			throw result;
			 *     })
			 *    .send();
			 * 
			 * @param {function} callback 원격 호출이 실패할 때 실행되는 callback 함수입니다. 
			 * @returns {commonXhr} 
			 */
			error: function (callback) {
				this.xhr.onerror = function (e) { callback(e.target.response || e.target.responseText); };
				return this;
			},

			/**
             * The callback function when emit the timeout event.
             * 
			 * timeout 발생 시 실행되는 callback 함수입니다.
			 *
			 * @example
			 * var xhr = new commonXhr();
			 * xhr.open("get", "http://powerumc.kr", false)
			 *    .success(function(result) {})
			 *    .error(function() {})
			 *    .timeout(function(result) {
			 *			throw "timeout: " + result;
			 *     })
			 *    .send()
			 *
			 * @param {function} callback timeout 발생 시 실행되는 callback 함수입니다.
			 * @returns {commonXhr}
			 */
			timeout: function (callback) {
				this.ontimeout = function (e) { callback(e.target.response || e.target.responseText); };
				return this;
			}
		};
	};

	var mimeTypes = [];
	function getContentType(data) {
		if (oop.isObject(data)) return "application/json";
		else if (oop.isString(data) || oop.isNumber(data)) return "text/plain";

		return "text/xml";
	}

	return {
		/**
         * HTTP Methods 'GET' have call remote url, and return the commonXhr object.
         * 
		 * HTTP Methods 'GET'을 사용하여 원격 URL 을 호출하고, commonXhr 객체를 반환합니다.
		 *
		 * @param url {string} URL 을 설정합니다.
		 * @param data {any} 전송할 데이터 입니다.
		 * @param isAsync {boolean} 비동기 호출인 경우 true를 설정합니다. 기본값 false
		 * @returns {commonXhr}
         */
		"get": function (url, data, isAsync) {
			isAsync = isAsync || true;
			var xhr = commonXhr(this);
			xhr.open.apply(xhr, ["get", url, isAsync]);
			xhr.xhr.setRequestHeader("Content-Type", getContentType(data));
			xhr.xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			return xhr;
		},
		/**
         * HTTP Methods 'POST' have call remote url, and return the commonXhr object.
         * 
		 * HTTP Methods 'POST'를 사용하여 원격  URL 을 호출하고, commonXhr 객체를 반환합니다.
		 *
		 * @param url {string} URL 을 설정합니다.
		 * @param data {any} 전송할 데이터 입니다.
		 * @param isAsync {boolean} 비동기 호출인 경우 true 를 설정합니다. 기본값 false
		 * @returns {{open, send, success, error, timeout}}
         */
		"post": function (url, data, isAsync) {
			isAsync = isAsync || true;
			var xhr = commonXhr(this);
			xhr.open.apply(xhr, ["post", url, isAsync]);
			xhr.xhr.setRequestHeader("Content-Type", getContentType(data));
			xhr.xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			return xhr;
		},

		/**
         * Get the MimeType in the oop.xhr did set the each extensions.
         * 
		 * oop.xhr 에서 미리 설정해둔 파일 확장자별 MimeType 을 가져옵니다.
		 *
		 * @example
		 * var mimetype = oop.xhr.getMimeType("js");
		 *
		 * @param ext {string} 파일 확장자 입니다. 구두점(.)을 뺀 확장자입니다.
		 * @returns {oop.xhr}
         */
		"getMimeType": function (ext) {
			for (var i = mimeTypes.length - 1; i >= 0; i--) {
				if (mimeTypes[i].ext === ext)
					return mimeTypes[i].mimeType;
			}
			return this;
		},

		/**
         * Add or override the MimeType in the oop.xhr setdid set the each extensions
         * 
		 * oop.xhr 에서 미리 설정해둔 파일 확장자별 MimeType 에 사용자의 MimeType 을 추가하거나 재정의 합니다.
		 *
		 * @example
		 * oop.xhr.setMimeType("js", "application/javascript");
		 *
		 * @param ext {string} 파일 확장자 입니다. 구두점(.)을 뺀 확장자입니다.
		 * @param mimeType {string} MimeType 입니다.
         * @returns {oop.xhr}
         */
		"setMimeType": function (ext, mimeType) {
			mimeTypes.push({ "ext": ext, "mimeType": mimeType });
			return this;
		}
	};
})(oop);
    
function dequeueReady() {
    DEBUG("[readyQueue] start dequeue. " + oop.globals.readyQueue.length);
    while (oop.globals.readyQueue.length > 0) {
        var fn = oop.globals.readyQueue.splice(0, 1);
        var cb = fn.length > 0 ? dequeueReady : null;
        fn[0].call(this);
    }
}

function dequeueImported() {
    DEBUG("[importQueue] start dequeue. " + oop.globals.importQueue.length);
    while (oop.globals.importQueue.length > 0) {
        var iq = oop.globals.importQueue.splice(0, 1);
        var cb = iq.length > 0 ? dequeueImported : iq[0].callback;

        var _import = new oop._import(iq[0].list, cb);
    }
}    

(function () {
	oop.globals.imported = oop.globals.imported || {};
	oop.globals.backup = oop.globals.backup || {};
	oop.xhr.setMimeType("js", "text/javascript")
           .setMimeType("aspx", "text/javascript")
		   .setMimeType("", "text/javascript")
           .setMimeType("css", "text/css")
           .setMimeType("html", "text/html");

	oop.subscribe("js.oop.imported.appended", function (obj) {
		if (!obj) return;

		var body = document.getElementsByTagName("body")[0];

		obj = obj.details || obj.detail;
		var html = obj.outerHTML || obj.innerHTML;
		if (!html) return;

		if (obj.type === "x-nexon-templates") {
			document.getElementsByTagName("head")[0].removeChild(obj);
		}
	});
	oop.subscribe("js.oop.importingAllCompleted", loaded);

	function loaded(o) {
		dequeueImported();
		dequeueReady();
        isLoadCompleted = true;
	}




	function copyOwnProperty(src, dest) {
		for (var p in src) {
			if (src.hasOwnProperty(p)) { dest[p] = p; }
		}
	}

	oop.subscribe("js.oop.importingAllCompleted", function () {
		copyOwnProperty(window, oop.globals.backup);
		loaded();
	});

	oop.subscribe("DOMContentLoaded", function (e) {
		DEBUG("[published] DOMContentLoaded: " + e);

		if (msie <= 8) {
			loaded();
		}
	});

})();

oop.globals.importQueue = [];

/**
 * Download web resources parallely or sequencely.
 * 
 * 웹 리소스를 병열 또는 순차적으로 다운로드합니다.
 *
 * @example
 * 다음은 단순히 병렬로 리소스를 다운로드 하는 예입니다.
 * var list = ["jquery.js", "jquery.ui.css", "jquery.ui.js"];
 * oop.imports(list);
 *
 * @example
 * 만약 리소스 다운로드 시 라이브러리 간에 Dependency 에 종속되어 있다면 다음과 같이 리소스 목록을 설정하십시오.
 *
 * var list = [{url:"jquery.js", depends:["jquery.ui.css", "jquery.ui.js"]}];
 * oop.imports(list);
 *
 * @example
 * 매우 복잡한 Dependency 를 가지고 있다면 다음이 좋은 예가 될 수 있습니다.
 *	var resource = [
 *		"http://js.nx.com/s3/p3/login_layer.css",
 *		"http://js.nx.com/s3/p3/gnb.css",
 *		"http://js.nx.com/s1/global/ngb_head.js",
 *		{
 *			url: "http://js.nx.com/s1/p2/ps.min.js",
 *			appendTo: document.head || "head",
 *			attributes: {
 *				"charset": "utf-8",
 *				"data-name": "PS",
 *				"data-ngm" : true,
 *				"data-nxlogin": true
 *			}
 *		},
 *		{
 *			url: "http://js.nx.com/s1/p2/gnb.min.js",
 *			appendTo: document.body || "body",
 *			attributes: {
 *				"charset": "utf-8",
 *	    		"data-gamecode": oop.getValue(data_gamecode),
 *				"data-skiptocontentsid": "skipToContent"
 *			},
 *			depends: [
 *				{
 *					url: "http://js.nx.com/s1/p2/gameinfo.js",
 *					attributes: {
 *						"charset": "utf-8",
 *						"data-gnbid": "GNB"
 *					}
 *				}
 *			]
 *		}
 *	];
 *
 *	oop.imports(resource);
 *
 *
 * @param list {object} 다운로드 할 리소스 배열입니다.
 * @param callback {function} 리소스 다운로드 후 실행할 callback 함수입니다.
 */
oop.imports = function (list, callback) {
	if (oop.isString(list)) list = [list];

	oop.globals.importQueue.push({ list: list, callback: callback });
    
    if (isLoadCompleted) {
        dequeueImported();
    }
};

/**
 * It's internal function,
 * Don't be use it.
 * 
 * 내부적으로 사용합니다.
 * 사용자는 실행하지 마십시오.
 *
 * @private
 */
oop._import = (function (list, callback) {
	oop.globals.importedCount = (oop.globals.importedCount || 0) + 1;
	oop.globals.enabledImportingCount = true;
	var sourceList = [];
	var total = 0;
	var count = 0;
	var downloadedCount = 0;

	function attributes(obj, key, value) {
		if (msie && msie === 8) {
			if (key !== undefined && value !== undefined) {
				obj.setAttribute(key, value);
			} else {
				return obj.getAttribute(key);
			}
		} else {
			if (key !== undefined && value !== undefined) {
				obj.setAttribute(key, value);
			} else {
				return obj.attributes[key];
			}
		}

		return obj.getAttribute(key);
	}

	function onload(obj, handler) {
		if (msie && msie === 8) {
			obj.onreadystatechange = function () {
				if (obj.readyState === "loaded" || obj.readyState === "complete") {
					handler();
				}
			};
		} else {
			obj.onload = handler;
		}
	}

	function require(define, onLoad) {
		if (!define) return;

		var source;
		define.isLiteral = define.isLiteral === undefined ? false : true;

		if (!define.sourceKind) {
			var arr = define.url.split("?")[0].split("/").slice(-1)[0].split(".");
			if (arr.length >= 2) {
				define.sourceKind = arr.slice(-1)[0];
			} else {
				define.sourceKind = "";
			}

		}

		if (!define.isLiteral) {
			var fileType = define.mimeType || oop.xhr.getMimeType(define.sourceKind);

			if (fileType === "text/javascript") {
				source = document.createElement("script");
				source.type = define.mimeType || oop.xhr.getMimeType("js");
				source.src = define.url;
				if (!define.async) {
					onload(source, onLoad);
				}

				source.id = define.id || getFilenameWithoutExtension(define.url);
				attributes["data-id"] = source.id;
				attributes["data-order"] = define.order;
				if (define.preHandler) define.preHandler(source);

				copyOwnAttributes(define.attributes, source);
				copyOwnAttributes(define.data, source);
				append(define.appendTo || "head");

			} else if (fileType === "text/css") {
				source = document.createElement("link");
				source.id = define.id || getFilenameWithoutExtension(define.url);
				source.type = define.mimeType || oop.xhr.getMimeType("css");
				source.rel = "stylesheet";
				source.href = define.url;
				attributes["data-order"] = define.order;
				if (!define.async) { source.onload = onLoad; }
				if (define.preHandler) define.preHandler(source);

				copyOwnAttributes(define.attributes, source);
				copyOwnAttributes(define.data, source);
				append(define.appendTo || "head");

			} else {
				loadFrom(define);
			}
		} else {
			loadFrom(define);
		}

		function loadFrom(define) {
			if (define.id) {
				var e = document.getElementById(define.id);
				if (e) return;
			}

			var xhr = oop.xhr.get(define.url, function (result) {
			})
            .success(function (result) {
            	result = (result || "").replace("\n", "");
            	var uniqueId = getFilenameWithoutExtension(define.url);
            	var node = document.getElementById(uniqueId);
            	if (!node || (node.src && node.src != define.url)) {
            		source = document.createElement("script");
            		if (msie && msie <= 8) {
            			source.text = result;
            		} else {
            			source.innerHTML = result;
            		}
            		source.type = oop.xhr.getMimeType(define.url.split(".").pop());
            		source.id = uniqueId + "-template";
            		attributes["data-order"] = define.order;

            		if (define.preHandler) define.preHandler(source);
            		append("head");

            		if (onLoad) onLoad();
            	}

            })
            .error(function (result) {
            	if (define.callback) define.callback(result, define);
            });

			xhr.send();
		}

		function append(nodeName) {
			var dom;
			sourceList.push(source);

			if (oop.isHTMLElement(nodeName))
				dom = nodeName;
			else
				dom = document.getElementsByTagName(nodeName) || document.getElementsByTagName("head");

			dom = oop.isArray(dom) ? dom[0] : dom;

			if (dom) {
				dom.appendChild(source);
				if (define.callback) define.callback(source, define);

				oop.publish("js.oop.imported.appended", source);
			}
		}

		function getFilenameWithoutExtension(url) {
			return url.split("/").pop().split(".").slice(0, -1).join(".");
		}

		function copyOwnAttributes(src, dest, isData) {
			isData = isData !== undefined ? isData : false;
			for (var p in src) {
				if (src.hasOwnProperty(p)) {
					var pobj = src[p];
					if (oop.isFunction(pobj))
						attributes(dest, p, pobj());
					else
						attributes(dest, p, pobj);
				}
			}
		}
	}

	function incrementCount() { return ++downloadedCount; }

	function getTotal(arr) {
		if (!arr) return true;
		total++;
		if (!arr.depends) return true;

		for (var y = 0; y < arr.depends.length; y++) {
			getTotal(arr.depends[y]);
		}
	}

	var i;
	for (i = 0; i < list.length; i++) {
		var result = getTotal(list[i]);
	}

	for (i = 0; i < list.length; i++) {
		c(list[i]);
	}

	function c(obj, onLoad) {
		if (!obj) return;

		if (oop.isString(obj)) { obj = { "url": obj, order: count++ }; require(obj, function () { c_callback(obj, incrementCount()); }); }
		else {
			obj.order = count++;
			if (obj.depends) {
				if (!oop.isArray(obj.depends)) {
					throw "depends must be array.";
				}

				var cb = function (nestedObj) {
					for (var d = 0; d < nestedObj.depends.length; d++) {
						var depends = nestedObj.depends[d];
						if (oop.isString(depends)) {
							depends = { url: depends, order: count++ }
						}
						c(depends);
					}
					c_callback(obj, incrementCount());
				};

				require(obj, function () { cb(obj); });

			} else {
				require(obj, function () { c_callback(obj, incrementCount()); });
			}
		}
	}

	function c_callback(obj, cnt) {
		oop.publish("js.oop.imported", { obj: obj });
		DEBUG(total + "/" + cnt + " " + obj.url);

		for (var p in window) {
			if (window.hasOwnProperty(p)) {
				if (!oop.globals.imported[p]) {
					var suffix = "";
					while (oop.globals.imported[p + suffix]) {
						suffix += "_";
					}
					oop.globals.imported[p + suffix] = window[p];
				}
			}
		}

		if (total === cnt) {
			var sortedList = sourceList.sort(function (a, b) {
				var aa = a.attributes["data-order"];
				var bb = b.attributes["data-order"];
				return aa < bb ? -1 : aa > bb ? 1 : 0;
			});
			if (callback) callback(sortedList);

			oop.globals.enabledImportingCount = false;

			oop.publish("js.oop.importingAllCompleted");
		}
	}
});

oop.globals.readyQueue = [];
/**
 * 브라우저가 모든 리소스 다운로드 및 다운로드된 자바스크립트 실행이 종료되면 실행합니다.
 * 아래의 예제 코드에서 실행 결과에 주목하십시오.
 *
 * @example
 * $(function() { console.log("$.ready });
 * $(document).ready(function() { console.log("jquery.ready" });
 * oop.ready(function() { console.log("ready1"); };
 * oop.ready(function() { console.log("ready2"); };
 *
 * // 실행 결과
 * $.ready
 * jquery.ready
 * ready1
 * ready2
 *
 * @param resolveCallback {function} 실행할 callback 함수입니다.
 */
oop.ready = function (resolveCallback) {

	function Ready(resolveCallback) {
		this.callbacks = resolveCallback;
	}

	var readyObj = Object.call(Ready, arguments);
	var r = oop.inject(readyObj[0], { prefix: "oop.globals.imported." });

	oop.globals.readyQueue.push(r[0]);
    
    if (isLoadCompleted) {
        dequeueReady();
    }
};

(function (oop) {
	oop.behaviors = {
		LoggingBehavior: oop.interceptionBehavior(function () {
			this.date = new Date();
			if (!this.date) {
				LOG(this.date.toLocaleString() + " [js.oop] LoggingBehavior Begin ");
				var options = {
					year: "numeric", month: "numeric", day: "numeric",
					hour: "numeric", minute: "numeric", second: "numeric",
					hour12: false
				};
			}
			LOG("[" + this.date.toLocaleString("en-US", this.options) + "] ", arguments);
		},
															function () {
																LOG(this.date.toLocaleString() + " [js.oop] LoggingBehavior End ");
															}, undefined, undefined),
		ExceptionBehavior: oop.interceptionBehavior(undefined, undefined, undefined, undefined)
	};

})(oop);
})();







oop.xhr.setMimeType("html", "x-nexon-templates");

var css = [
    "ActiveBox/css/bootstrap.min.css",
    "ActiveBox/css/flexslider.css",
    "ActiveBox/css/jquery.fancybox.css",
    "ActiveBox/css/main.css",
    "ActiveBox/css/responsive.css",
    "ActiveBox/css/animate.min.css",
    "https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css"];

var js = [  {url:"ActiveBox/jquery.min.js", 
            depends: [{url:"ActiveBox/js/bootstrap.min.js", 
                depends:[{url:"ActiveBox/js/jquery.flexslider-min.js"},
                            {url:"ActiveBox/js/jquery.fancybox.pack.js"},
                            {url:"ActiveBox/js/jquery.waypoints.min.js"},
                            {url:"ActiveBox/js/retina.min.js"},
                            {url:"ActiveBox/js/modernizr.js", depends:[{url:"ActiveBox/js/main.js"}]}]
                }] }];

var templates = ["templates/banner.html",
                "templates/features.html",
                "templates/works.html",
                "templates/teams.html",
                "templates/testimonials.html",
                "templates/download.html",
                "templates/footer.html" ];

oop._import(css);
oop._import(js);
oop._import(templates, function(orderdTemplates) {
    var body = document.getElementsByTagName("body")[0];
    for(var i=0; i<orderdTemplates.length; i++) {
        if (body && body.innerHTML && orderdTemplates[i] && orderdTemplates[i].innerHTML)
            body.innerHTML += orderdTemplates[i].innerHTML;
    }
});


oop.ready(function($, Modernizr) {
    console.log("js.oop ready");
});