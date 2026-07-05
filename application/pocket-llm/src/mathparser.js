// 安全な数式評価器(再帰下降パーサー、eval 不使用)
// 対応: + - * / % ^(べき乗) 括弧 単項マイナス 数値(小数・カンマ区切り)
// 関数: sqrt, abs, round, floor, ceil, sin, cos, tan, log, log10, exp
// 定数: pi, e

const FUNCS = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
}

const CONSTS = { pi: Math.PI, e: Math.E }

class Parser {
  constructor(src) {
    // 全角記号・カンマ区切りを正規化
    this.src = src
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/[×✕✖]/g, '*')
      .replace(/[÷]/g, '/')
      .replace(/[−ー–—]/g, '-')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .replace(/(\d),(?=\d{3}\b)/g, '$1')
      .replace(/\s+/g, '')
    this.pos = 0
  }

  peek() {
    return this.src[this.pos]
  }

  eof() {
    return this.pos >= this.src.length
  }

  parse() {
    const v = this.expr()
    if (!this.eof()) throw new Error(`解釈できない文字があります: "${this.src.slice(this.pos)}"`)
    return v
  }

  // expr := term (('+'|'-') term)*
  expr() {
    let v = this.term()
    while (!this.eof()) {
      const c = this.peek()
      if (c === '+') {
        this.pos++
        v += this.term()
      } else if (c === '-') {
        this.pos++
        v -= this.term()
      } else break
    }
    return v
  }

  // term := power (('*'|'/'|'%') power)*
  term() {
    let v = this.power()
    while (!this.eof()) {
      const c = this.peek()
      if (c === '*') {
        this.pos++
        v *= this.power()
      } else if (c === '/') {
        this.pos++
        const d = this.power()
        if (d === 0) throw new Error('0 で割ることはできません')
        v /= d
      } else if (c === '%') {
        this.pos++
        v %= this.power()
      } else break
    }
    return v
  }

  // power := unary ('^' power)?  (右結合)
  power() {
    const base = this.unary()
    if (!this.eof() && this.peek() === '^') {
      this.pos++
      return base ** this.power()
    }
    return base
  }

  // unary := ('-'|'+')* atom
  unary() {
    if (this.peek() === '-') {
      this.pos++
      return -this.unary()
    }
    if (this.peek() === '+') {
      this.pos++
      return this.unary()
    }
    return this.atom()
  }

  // atom := number | ident '(' expr ')' | const | '(' expr ')'
  atom() {
    if (this.eof()) throw new Error('式が途中で終わっています')
    const c = this.peek()
    if (c === '(') {
      this.pos++
      const v = this.expr()
      if (this.peek() !== ')') throw new Error('閉じ括弧がありません')
      this.pos++
      return v
    }
    const numMatch = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(this.src.slice(this.pos))
    if (numMatch) {
      this.pos += numMatch[0].length
      return parseFloat(numMatch[0])
    }
    const identMatch = /^[a-zA-Z][a-zA-Z0-9]*/.exec(this.src.slice(this.pos))
    if (identMatch) {
      const name = identMatch[0].toLowerCase()
      this.pos += identMatch[0].length
      if (name in CONSTS) return CONSTS[name]
      if (name in FUNCS) {
        if (this.peek() !== '(') throw new Error(`${name} の後に ( が必要です`)
        this.pos++
        const arg = this.expr()
        if (this.peek() !== ')') throw new Error('閉じ括弧がありません')
        this.pos++
        return FUNCS[name](arg)
      }
      throw new Error(`未知の識別子です: ${name}`)
    }
    throw new Error(`解釈できない文字です: "${c}"`)
  }
}

/**
 * 入力が純粋な数式かどうかを判定する。
 * 数字・演算子・括弧・対応関数名のみで構成されていれば true。
 */
export function looksLikeMath(input) {
  const normalized = input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[×✕✖÷−ー（）]/g, ' ')
    .trim()
  if (!/\d/.test(normalized)) return false
  const stripped = normalized.replace(
    /\b(sqrt|abs|round|floor|ceil|sin|cos|tan|log10|log|exp|pi|e)\b/gi,
    ''
  )
  return /^[\d\s+\-*/%^().,eE]*$/.test(stripped)
}

/**
 * 数式を評価する。戻り値: { ok: true, value } | { ok: false, error }
 */
export function evaluate(input) {
  try {
    const value = new Parser(input).parse()
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return { ok: false, error: '計算結果が数値になりませんでした' }
    }
    return { ok: true, value }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/** 表示用に丸める(浮動小数点誤差の吸収) */
export function formatResult(value) {
  if (!Number.isFinite(value)) return String(value)
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return value.toLocaleString('ja-JP')
  const rounded = parseFloat(value.toPrecision(12))
  return rounded.toLocaleString('ja-JP', { maximumFractionDigits: 10 })
}
