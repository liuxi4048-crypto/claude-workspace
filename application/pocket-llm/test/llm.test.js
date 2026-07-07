import test from 'node:test'
import assert from 'node:assert/strict'
import { looksCorrupted } from '../src/llm.js'

test('looksCorrupted: 特殊トークン混入を検知', () => {
  assert.equal(looksCorrupted('こんにちは<pad>元気ですか'), true)
  assert.equal(looksCorrupted('<unk>test'), true)
  assert.equal(looksCorrupted('<|endoftext|>abc'), true)
})

test('looksCorrupted: 記号の羅列を検知', () => {
  assert.equal(looksCorrupted('!!!!!!!!!!'), true)
  assert.equal(looksCorrupted('####################'), true)
})

test('looksCorrupted: 正常なテキストは検知しない', () => {
  assert.equal(looksCorrupted('こんにちは、元気ですか?'), false)
  assert.equal(looksCorrupted('Hello! How are you?'), false)
  assert.equal(looksCorrupted(''), false)
  assert.equal(looksCorrupted(null), false)
})
