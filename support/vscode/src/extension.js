const { enabledFeatures, confChange, replace } = require('./config.js')

function activate(context) {

	context.subscriptions.push(confChange)

	return {
		extendMarkdownIt(md) {
			for (const f of enabledFeatures) 
				if (f[0] === 'replace') {
					md.use(replace, f[1])
					console.log('Loaded', replace.res)
				}
				else md.use(require(`@jotdoc/${f[0]}`), f[1])
			return md
		}
	}
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}