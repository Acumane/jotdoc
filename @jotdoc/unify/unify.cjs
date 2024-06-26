let Color = require("tinycolor2")

'use strict'

let userColor = []

const WIDTH = /^\d+(?:px|%)?$/i,
      DIM = /^\d+x\d+(?:px)?$/i

function classify(path) {
  try {
    Boolean(new URL(path))
    return 'link'
  }
  catch(e){
    const match = userColor.find((c) => c.name === path)
    if (match) return 'ucolor'
    if (Color(path).isValid()) return 'color'
    return 'image'
  }
}

module.exports = (md) => {
  md.inline.ruler.disable(['image', 'link']) // replace with:
  md.inline.ruler.push('unify', (state, silent) => {

    let attrs, attr,
        args, path = '',
        cEnd, found, content,
        type, token, nested,
        pos, uColor, color,
        start = state.pos,
        max = state.posMax

    if (state.src.charCodeAt(state.pos) !== 0x5B/* [ */) return false

    cEnd = state.md.helpers.parseLinkLabel(state, state.pos, false)
    content = state.src.slice(start + 1, cEnd)

    if (cEnd < 0) return false // invalid; parser failed to find ']'

    pos = cEnd + 1
    if (pos < max && state.src.charCodeAt(pos) === 0x28) {   // [...](

      while (pos < max) { // find closing ')'
        let cur = state.src.charCodeAt(pos)
        if (cur === 41) { found = true; break }

        pos++
      }

      if (!found) return false

      args = state.src.slice(cEnd + 2, pos)

      if (args) [path, attr] = args.split(' ')

      let parsed = state.md.helpers.parseLinkDestination(path, 0, path.length)
      if (parsed.ok) {
        path = state.md.normalizeLink(parsed.str)
        if (!state.md.validateLink(path)) path = ''
      }
      type = classify(path)
    }

    if (!silent) {
      switch(type) {
        case 'link':
          state.pos = start + 1;
          state.posMax = cEnd;

          token         = state.push('link_open', 'a', 1)
          token.attrs   = attrs = [ [ 'href', path ] ]

          state.linkLevel++
          state.md.inline.tokenize(state) // tokenize content + nested
          state.linkLevel--
          token         = state.push('link_close', 'a', -1)

          uColor = userColor.find((c) => c.name === attr)
          color  = uColor ? uColor.color : (Color(attr).isValid() ? attr : false)
          if (color)
            attrs.push([ 'style', `color:${color}` ])
          break

        case 'image':
          state.md.inline.parse(content, state.md, state.env, nested = [])

          token          = state.push('image', 'img', 0)
          token.attrs    = attrs = [ [ 'src', path ], [ 'alt', '' ], [] ]
          token.children = nested
          token.content  = content
          
          if (WIDTH.test(attr))
            attrs.push(['width', attr])
          if (DIM.test(attr))
            attrs.push(['width', attr.split('x')[0]], ['height', attr.split('x')[1]])
          break

        case 'ucolor':
        case 'color':
          state.pos = start + 1;
          state.posMax = cEnd;
          color = (type === 'ucolor') ? userColor.find((c) => c.name === path).color : path

          token          = state.push('span_open', 'span', 1)
          token.attrs    = [ [ 'style', `color:${color}` ] ]
          state.md.inline.tokenize(state) // tokenize content + nested
          token          = state.push('span_close', 'span', -1)
          break
      }
    }

    state.pos = pos + 1
    return true
  })
}

module.exports.userColor = userColor
