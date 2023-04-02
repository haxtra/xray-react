# xray-react

Interactive javascript object browser/inspector for React ([live demo](https://xray.haxtra.com))


## Install

	$ npm i @haxtra/xray-react


## Usage

Basic

	<XRay obj={myObj} />

Disable header

	<XRay obj={myObj} header={false} />

Set custom title

	<XRay obj={myObj} title="My title" />

Start minimized

	<XRay obj={myObj} minimize />
	// same
	<XRay obj={myObj} minimize={true} />

Collapse some keys

	<XRay obj={myObj} collapse={["key1", "key2"]} />
	// collapse nested keys
	<XRay obj={myObj} collapse={["key1.sub1", "key1.sub2"]} />

Collapse all top level keys

	<XRay obj={myObj} collapse="top" />

Collapse everything

	<XRay obj={myObj} collapse />
	// same
	<XRay obj={myObj} collapse={true} />

Collapse everything except

	<XRay obj={myObj} collapseExcept={["key1", "key2"]} />


## Interaction

Clickable areas:

- header title -- show/hide XRay panel
- property -- toggle display of value/subtree
- property : right click -- prompt with path to property
- unknown values -- log undetected object to console


## Caveats

- invisible characters in strings like newline are not displayed
- proxies are not detected, displayed as standard object
- promise status is not detected


## Other ports

- [xray-solid](https://github.com/haxtra/xray-solid)
- [xray-svelte](https://github.com/haxtra/xray-svelte)
- [xray-vue](https://github.com/haxtra/xray-vue)
- [xray-mithril](https://github.com/haxtra/xray-mithril)


## License

MIT
