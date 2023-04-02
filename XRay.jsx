import React, {useState} from 'react'

import './xray.css'

class XRayCircularChecker {
	constructor() {
		this.seen = new WeakMap()
	}

	check(obj, path) {

		const paths = this.seen.get(obj)

		if(!paths){
			// first time seen, just add
			this.seen.set(obj, [path])
			return false
		}

		for(const seen of paths){

			if(seen === path)
				// same as before, this is rerender
				return false

			if(path.startsWith(seen) && path.startsWith(seen+'.'))
				// path is descendant, this is circular
				return true
		}

		// not same, not parent, different location
		paths.push(path)

		return false
	}
}

class XRay extends React.Component {
	constructor(props) {
		super()

		this.circular = new XRayCircularChecker()

		this.state = {
			header: props.header !== undefined ? props.header : true,
			title: props.title || 'XRay',
			collapsed: {},
			collapseReversed: false,
			minimize: props.minimize,
		}

		// collapse
		if(props.collapse){
			if(props.collapse === true){
				// collapse everything, click reveals node
				this.state.collapseReversed = true
			} else if(props.collapse === 'top'){
				// collapse all top level
				for(const key in props.obj)
					this.state.collapsed['.'+key] = true
			} else if(Array.isArray(props.collapse)){
				// collapse only specified
				for(const key of props.collapse)
					this.state.collapsed['.'+key] = true
			} else {
				console.error('XRay invalid param :collapse: must be array, "top" or true')
			}
		}

		// collapse except
		if(props.collapseExcept){
			for(const key in props.obj)
				if(!props.collapseExcept.includes(key))
					this.state.collapsed['.'+key] = true
		}

	}

	render(){

		return (<div className="XRay" onContextMenu={this.promptPath}>

			{this.state.header && <div className={this.state.minimize ? "xrHeader xrMinimized" : "xrHeader"} onClick={()=>this.setState({minimize:!this.state.minimize})}>
				<div className="xrTitle">{this.state.title}</div>
			</div>}
			{!this.state.minimize && <div className="xrContent">
				<Value app={this} obj={this.props.obj} path="$" />
			</div>}
		</div>)
	}

	functionSniffer(obj){
		/** Detect attached properties to function object **/

		const names = Object.getOwnPropertyNames(obj)

		// filter out native props
		for(const name of this._functionNativeProps){
			const idx = names.indexOf(name)
			if(idx > -1)
				names.splice(idx, 1)
		}

		return names
	}
	_functionNativeProps = ['length', 'name', 'arguments', 'caller', 'prototype']

	instanceSniffer(obj){
		/** Return all methods and properties of the object, except the base one **/

		// get props, these are all available in topmost object
		const properties = Object.getOwnPropertyNames(obj)

		// collect class methods recursively
		const methodSet = []
		let parent = Object.getPrototypeOf(obj)

		while(true) {

			// bail out if base class is reached
			if(parent.constructor.name == 'Object')
				break;

			// gather methods of current object
			methodSet.push(Object.getOwnPropertyNames(parent))

			// get parent class
			parent = Object.getPrototypeOf(parent.constructor.prototype)
		}

		// flatten, reverse (so methods are listed in class extension order), and remove dupes
		const methods = [...new Set([].concat(...(methodSet.reverse())))]

		// merge with props and serve hot
		return properties.concat(methods)
	}

	isCollapsed(path) {

		if(this.state.collapseReversed)
			return !this.state.collapsed[path]
		else
			return this.state.collapsed[path]
	}

	toggleCollapse(path, refresh){

		if(this.state.collapsed[path])
			delete this.state.collapsed[path]
		else
			this.state.collapsed[path] = true

		refresh(Date.now())
	}

	promptPath(e) {
		const title = e.target.title
		if(title){
			e.stopPropagation()
			e.preventDefault()
			prompt('Object path:', title)
		}
	}
}


const Value = props => {
	/** Detect object type and return appropriate renderer **/

	const {obj, path} = props

	// check for circular
	if((typeof obj == 'object' || typeof obj == 'function') && obj != null){
		if(props.app.circular.check(obj, path))
			return <span className="xrCircularReference"><span className="xrLabel">CircularReference</span></span>
	}

	// detect obj type
	switch(typeof(obj)){
		case 'object':
			const objType = Object.prototype.toString.call(obj)
			switch(objType){
				case '[object Object]':
					// plain object or instance of a function/class
					if(obj.constructor.name == 'Object')
						return <Obj app={props.app} obj={obj} path={path}/>
					else
						return <Instance app={props.app} obj={obj} path={path}/>
				case '[object Array]':
					return <Arr app={props.app} obj={obj} path={path}/>
				case '[object Null]':
					return <span className="xrNull">null</span>
				case '[object Date]':
					return <span className="xrDate"><span className="xrLabel">Date</span>{obj.toString()}</span>
				case '[object RegExp]':
					return <span className="xrRegExp"><span className="xrLabel">RegExp</span>{obj.toString()}</span>
				case '[object Promise]':
					return <span className="xrPromise"><span className="xrLabel">Promise</span></span>
				case '[object Error]':
					return <span className="xrError"><span className="xrLabel">Error</span>{obj.toString()}</span>
				case '[object Map]':
					return <MapX app={props.app} obj={obj} path={path}/>
				case '[object Set]':
					return <SetX app={props.app} obj={obj} path={path}/>
				case '[object WeakMap]':
					return <span className="xrWeakMap"><span className="xrLabel">WeakMap</span></span>
				case '[object WeakSet]':
					return <span className="xrWeakSet"><span className="xrLabel">WeakSet</span></span>
				case '[object Storage]':
					return <Instance app={props.app} obj={obj} path={path}/>
				case '[object Int8Array]':
				case '[object Uint8Array]':
				case '[object Uint8ClampedArray]':
				case '[object Int16Array]':
				case '[object Uint16Array]':
				case '[object Int32Array]':
				case '[object Uint32Array]':
				case '[object Float32Array]':
				case '[object Float64Array]':
				case '[object BigInt64Array]':
				case '[object BigUint64Array]':
				case '[object ArrayBuffer]':
					const arrType = (/\[object (\w+)\]/.exec(objType))[1]
					return <Dumper klass="xrSuperArray" label={arrType} obj={obj}/>
				case '[object Math]':
					return <Function app={props.app} obj={obj} path={path}/>
				default:
					return <Unknown obj={obj}/>
			}
		case 'string':
			if(obj === "")
				return <span className="xrString xrEmpty"></span>
			else
				return <span className="xrString">{obj}</span>
		case 'number':
			return <span className="xrNumeric">{obj.toString()}</span>
		case 'boolean':
			return <span className="xrBool">{obj.toString()}</span>
		case 'undefined':
			return <span className="xrNull">undefined</span>
		case 'function':
			return <Function app={props.app} obj={obj} path={path}/>
		// rares
		case 'bigint':
			return <span className="xrNumeric"><span className="xrLabel">BigInt</span>{obj.toString()}</span>
		case 'symbol':
			return <span className="xrSymbol"><span className="xrLabel">Symbol</span>{obj.description}</span>
		default:
			return <Unknown obj={obj}/>
	}
}

const Obj = props => {

	const keys = Object.keys(props.obj)

	if(!keys.length)
		return <span className="xrObject xrEmpty"></span>
	else
		return <table><tbody>
			{keys.map(key => <ObjRow key={key} xkey={key} app={props.app} obj={props.obj[key]} path={props.path+"."+key} />)}
		</tbody></table>
}

const ObjRow = props => {

	const [_, refresh] = useState(1)

	if(props.app.isCollapsed(props.path))
		return (<tr className="xrCollapsed">
					<td className="xrKey" title={props.path}  onClick={()=>props.app.toggleCollapse(props.path, refresh)}>{props.xkey}</td>
					<td className="xrValue xrEmpty"></td>
				</tr>)
	else
		return (<tr>
					<td className="xrKey" title={props.path}  onClick={()=>props.app.toggleCollapse(props.path, refresh)}>{props.xkey}</td>
					<td className="xrValue">
						<Value app={props.app} obj={props.obj} path={props.path} />
					</td>
				</tr>)
}

const Arr = props => {

	if(!props.obj.length)
		return <span className="xrArray xrEmpty"></span>
	else
		return <table><tbody>
			{props.obj.map( (elem, i) => <ArrRow key={i} i={i} app={props.app} obj={elem} path={`${props.path}[${i}]`} />)}
		</tbody></table>
}

const ArrRow = props => {

	const [_, refresh] = useState(1)

	if(props.app.isCollapsed(props.path))
		return (<tr className="xrCollapsed">
					<td className="xrKey xrArray" title={props.path}  onClick={()=>props.app.toggleCollapse(props.path, refresh)}>{props.i}</td>
					<td className="xrValue xrEmpty"></td>
				</tr>)
	else
		return (<tr>
					<td className="xrKey xrArray" title={props.path}  onClick={()=>props.app.toggleCollapse(props.path, refresh)}>{props.i}</td>
					<td className="xrValue">
						<Value app={props.app} obj={props.obj} path={props.path} />
					</td>
				</tr>)
}

const Function = props => {

	const keys = props.app.functionSniffer(props.obj)
	const objType = Object.prototype.toString.call(props.obj)
	const fnType = (/\[object (\w+)\]/.exec(objType))[1]
	const fnName = props.obj.name ? props.obj.name : '[Anonymous]'

	if(!keys.length)
		return <span className="xrFunction">{fnType} {fnName}</span>
	else
		return (
		<div>
			<span className="xrFunction">{fnType} {fnName}</span>
			<table><tbody>
				{keys.map( key => <ObjRow key={key} xkey={key} app={props.app} obj={props.obj[key]} path={props.path+"."+key} />)}
			</tbody></table>
		</div>)
}

const Instance = props => {

	const keys = props.app.instanceSniffer(props.obj)
	const title = (props.obj.constructor.name || 'anonymous') + ' instance'

	if(!keys.length)
		return <span className="xrLabel xrInstance">{title}</span>
	else
		return (
		<div>
			<span className="xrLabel xrInstance">{title}</span>
			<table><tbody>
				{keys.map( key => <ObjRow key={key} xkey={key} app={props.app} obj={props.obj[key]} path={props.path+"."+key} />)}
			</tbody></table>
		</div>)
}

const MapX = props => {

	if(!props.obj.size)
		return <span><span className="xrLabel">Map</span><span className="xrObject xrEmpty"></span></span>
	else
		return (
		<div>
			<span className="xrLabel">Map</span>
			<table><tbody>
				{[...props.obj].map( elem => <ObjRow key={elem[0].toString()} xkey={elem[0].toString()} app={props.app} obj={elem[1]} path={props.path+"."+elem[0].toString()} />)}
			</tbody></table>
		</div>)
}

const SetX = props => {

	if(!props.obj.size)
		return <span><span className="xrLabel">Set</span><span className="xrArray xrEmpty"></span></span>
	else
				//{[...props.obj].map( elem => <ObjRow key={elem[0].toString()} xkey={elem[0].toString()} app={props.app} obj={elem[1]} path={props.path+"."+elem[0].toString()} />)}
		return (
		<div>
			<span className="xrLabel">Set</span>
			<table><tbody>
				{[...props.obj].map( (elem, i) => <tr key={i}><td><Value app={props.app} obj={elem} path={props.path} /></td></tr> )}
			</tbody></table>
		</div>)
}

const Dumper = props => {
	return <span className={"xrLabel "+props.klass} onClick={()=>console.log(props.obj)}>{props.label}</span>
}

const Unknown = props => {

	let text;
	try {
		text = props.obj.toString()
	} catch {
		text = 'unknown'
	}

	return <span className="xrUnknown" onClick={()=>console.log(props.obj)}><span className="xrLabel">?</span>{text}</span>
}

export default XRay