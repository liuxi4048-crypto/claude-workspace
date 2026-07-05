import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, looksLikeMath, formatResult } from '../src/mathparser.js'

test('四則演算', () => {
  assert.equal(evaluate('1+2').value, 3)
  assert.equal(evaluate('10-4').value, 6)
  assert.equal(evaluate('6*7').value, 42)
  assert.equal(evaluate('15/4').value, 3.75)
  assert.equal(evaluate('10%3').value, 1)
})

test('演算子の優先順位', () => {
  assert.equal(evaluate('2+3*4').value, 14)
  assert.equal(evaluate('(2+3)*4').value, 20)
  assert.equal(evaluate('100-10*5+2').value, 52)
  assert.equal(evaluate('2^10').value, 1024)
  assert.equal(evaluate('2^3^2').value, 512) // 右結合
})

test('単項マイナス・小数・指数表記', () => {
  assert.equal(evaluate('-5+3').value, -2)
  assert.equal(evaluate('--5').value, 5)
  assert.equal(evaluate('0.1+0.2').value, 0.30000000000000004)
  assert.equal(evaluate('1e3+1').value, 1001)
})

test('関数と定数', () => {
  assert.equal(evaluate('sqrt(16)').value, 4)
  assert.equal(evaluate('abs(-7)').value, 7)
  assert.equal(evaluate('round(2.6)').value, 3)
  assert.ok(Math.abs(evaluate('pi').value - Math.PI) < 1e-12)
  assert.ok(Math.abs(evaluate('sin(0)').value) < 1e-12)
})

test('全角文字・カンマ区切りの正規化', () => {
  assert.equal(evaluate('1,200×3').value, 3600)
  assert.equal(evaluate('10÷4').value, 2.5)
  assert.equal(evaluate('(1+2)*3').value, 9)
  assert.equal(evaluate('12345 * 6789').value, 83810205)
})

test('エラー処理', () => {
  assert.equal(evaluate('1/0').ok, false)
  assert.equal(evaluate('1+').ok, false)
  assert.equal(evaluate('(1+2').ok, false)
  assert.equal(evaluate('hello').ok, false)
  assert.equal(evaluate('1@2').ok, false)
})

test('looksLikeMath 判定', () => {
  assert.equal(looksLikeMath('1200*3 + 480'), true)
  assert.equal(looksLikeMath('sqrt(2) / 2'), true)
  assert.equal(looksLikeMath('12,345×2'), true)
  assert.equal(looksLikeMath('時速60kmで2時間半走ると何km?'), false)
  assert.equal(looksLikeMath('1ドルは何円?'), false)
  assert.equal(looksLikeMath('こんにちは'), false)
})

test('formatResult 表示', () => {
  assert.equal(formatResult(3600), '3,600')
  assert.equal(formatResult(0.1 + 0.2), '0.3') // 浮動小数点誤差の吸収
  assert.equal(formatResult(3.75), '3.75')
})
